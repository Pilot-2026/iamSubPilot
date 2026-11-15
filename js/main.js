// iamSubPilot – main game controller: menu, dives, results, multiplayer.

import * as THREE from './vendor/three.min.js';
import { World, SCALE, axisZ } from './world.js';
import { Sub, RemoteSub, SUB_MODELS, subModelById, buildSubModel, armBusy } from './sub.js';
import { CreatureManager, buildModel } from './creatures.js';
import { FishSchools } from './schools.js';
import { Launch } from './launch.js';
import { Aquarium } from './intro.js';
import { Radio, QUICK_CALLS } from './radio.js';
import { Input } from './input.js';
import { audio, SOUND_MODES } from './audio.js';
import { Net } from './net.js';
import { LEVELS, HULL_RATINGS, levelById } from './data/levels.js';
import { CREATURES } from './data/creatures.js';
import { pickQuestions, fableQuestion, tierForAge } from './data/quiz.js';
import { makeMissions, missionText, updateMissions } from './missions.js';
import { ask, line, zoneKey } from './scientist.js';
import { t, L, setLang, getLang, detectLang, fmtNum, fmtDec } from './i18n.js';
import { mulberry32, clamp, escapeHtml } from './util.js';
import { GAME_VERSION } from './config.js';
import { shapeFor, capsuleEnds, closestSegSeg } from './collide.js';
import { viewer, playTurntable } from './viewer.js';
import { recordVisit, recordDive, markOwner, isOwner } from './stats.js';
import { openStats } from './statsview.js';
import { Recovery } from './launch.js';
import { DeepBeacon, MapView, fmtDist } from './guide.js';
import { Atlantis, atlantisSpot } from './atlantis.js';
import { FABLE_SPEECH } from './fables.js';
import { FLYERS } from './companions.js';
import { cloud, nameKey, progressOf, mergeInto } from './cloud.js';
import { xmasSeason, buildSanta, decorateSub } from './santa.js';
import { Wrecks } from './wrecks.js';
import { TeamChallenges, CHALLENGES } from './challenges.js';

const $ = (s) => document.querySelector(s);
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');
const params = new URLSearchParams(location.search);
// tests and local runs stay out of the cloud (add ?cloud=1 to test it locally)
const CLOUD_OFF = params.has('autostart') || (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && !params.has('cloud'));

// ======================= profile =======================
const PROFILE_KEY = 'hadal.profile.v1';
const DEFAULT_PROFILE = () => ({
  name: '',
  age: 0,
  lang: detectLang(),
  rp: 0,
  spent: 0,
  upgrades: { hull: 0, battery: 0, lights: 0, sonar: 0 },
  logbook: {},
  seenQuestions: [],
  dives: 0,
  lastLevel: 'java',
  lastMode: 'expedition',
  sub: 'isabella',
  debrief: true,
});
let profile = loadProfile();
function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (p) return { ...DEFAULT_PROFILE(), ...p, upgrades: { ...DEFAULT_PROFILE().upgrades, ...(p.upgrades || {}) } };
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_PROFILE();
}
function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  // progress travels with the name (after this device has been synced once for that name)
  if (profile.name && profile.cloudKey === nameKey(profile.name) && !CLOUD_OFF) {
    clearTimeout(saveProfile.t);
    saveProfile.t = setTimeout(() => cloud.push(profile.name, progressOf(profile)), 2500);
  }
}

// Cloud profile: the same name on another device brings the same research points, hangar upgrades, sub and
// logbook. A name used for the first time takes this device's progress along; switching to a name that already
// has progress in the cloud loads that progress.
async function syncProfile({ quiet = false } = {}) {
  if (!profile.name || !cloud.available || CLOUD_OFF) return false;
  const key = nameKey(profile.name);
  const before = JSON.stringify(progressOf(profile));
  const res = await cloud.pull(profile.name);
  if (!res) return false;
  if (res.found && res.data) {
    if (profile.cloudKey && profile.cloudKey !== key) {
      // another name than before on this device: that name's progress replaces the old one
      Object.assign(profile, { rp: 0, spent: 0, dives: 0, logbook: {}, upgrades: { ...DEFAULT_PROFILE().upgrades } });
    }
    mergeInto(profile, res.data);
  }
  profile.cloudKey = key;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  const saved = await cloud.push(profile.name, progressOf(profile));
  if (saved && saved.data) {
    mergeInto(profile, saved.data);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
  const changed = JSON.stringify(progressOf(profile)) !== before;
  if (changed && !quiet) toast('☁️ ' + t('cloudLoaded', { name: profile.name }));
  return changed;
}
const tier = () => tierForAge(profile.age || 14);
const rpAvailable = () => profile.rp - profile.spent;
setLang(profile.lang);

// ======================= renderer =======================
let renderer, camera;
function initRenderer() {
  const canvas = $('#c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 900);
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (aquarium) aquarium.resize(window.innerWidth, window.innerHeight);
    fitIntroTitle();
  });
}
let aquarium = null;

// ======================= sound modes =======================
const SOUND_ICON = { all: '🔊', fx: '🔉', music: '🎵', off: '🔇' };
const soundLabel = (m = audio.mode) => `${SOUND_ICON[m]} ${t('snd_' + m)}`;
function cycleSound() {
  audio.init();
  audio.cycleMode();
  toast(soundLabel());
  updateSoundBtn();
}
function updateSoundBtn() {
  const b = document.querySelector('#btnSound');
  if (b) {
    b.textContent = SOUND_ICON[audio.mode];
    b.title = t('snd_' + audio.mode);
  }
}

// ======================= intro / title screen =======================
let introDone = null;
// keep the 3D title in the free space between the top buttons and the text block
function fitIntroTitle() {
  const el = $('#intro');
  if (!aquarium || !el || el.classList.contains('hidden')) return;
  const bottom = el.querySelector('.intro-bottom');
  const top = el.querySelector('.intro-top');
  if (!bottom) return;
  const t0 = top ? top.getBoundingClientRect().bottom + 6 : 10;
  aquarium.layout(t0, bottom.getBoundingClientRect().top - 8, window.innerWidth, window.innerHeight);
}
function showIntro(onDone) {
  introDone = onDone || introDone || (() => renderMenu());
  closeModal();
  $('#menu').classList.add('hidden');
  $('#passers').innerHTML = '';
  $('#menuBg').classList.add('hidden');
  $('#c').style.visibility = 'visible';
  if (aquarium) {
    aquarium.setMode('intro');
    aquarium.playTitle();
  }
  const el = $('#intro');
  el.innerHTML = `
    <div class="intro-top">
      <button class="chip" id="iSound">${soundLabel()}</button>
      <button class="chip" id="iLang">${getLang() === 'de' ? 'EN' : 'DE'}</button>
    </div>
    <div class="intro-bottom">
      <p class="intro-claim">${t('introClaim')}</p>
      <p class="intro-dedic">${t('introDedication')}</p>
      <p class="intro-by">${t('introBy', { author: '<a href="https://www.pilotFilm.at" target="_blank" rel="noopener">Andreas Schmölzer</a>' })}</p>
      <button class="btn big" id="iGo">${t('introGo')}</button>
      <div class="intro-hint" id="iHint">${audio.ctx && audio.ctx.state === 'running' ? '' : t('introSoundHint')}</div>
      <div class="intro-credit">${creditHtml()}</div>
    </div>`;
  el.classList.remove('hidden');
  fitIntroTitle();
  setTimeout(fitIntroTitle, 2600); // after the text has faded in
  const startMusic = () => {
    audio.init();
    audio.music('intro');
    const h = $('#iHint');
    if (h) h.textContent = '';
  };
  el.onclick = (e) => {
    if (e.target.closest('button, a')) return;
    startMusic();
  };
  $('#iSound').onclick = () => {
    startMusic();
    audio.cycleMode();
    $('#iSound').textContent = soundLabel();
  };
  $('#iLang').onclick = () => {
    profile.lang = getLang() === 'de' ? 'en' : 'de';
    setLang(profile.lang);
    saveProfile();
    showIntro();
  };
  $('#iGo').onclick = () => {
    startMusic();
    audio.click();
    el.classList.add('hidden');
    const f = introDone;
    introDone = null;
    f && f();
  };
}

const input = new Input();
const net = new Net();
let game = null;

// ======================= small UI helpers =======================
let echoTimer = null;
const echoQueue = [];
let echoBusy = false;
// a speech bubble next to a point in the world (tail pointing at it; no tail when it is off screen).
// side > 0: keep that much room (world units) around the point free – the bubble goes beside the face with its
// tail pointing sideways, or above the head when there is no room at the sides
function placeBubble(el, world, side = 0) {
  el.classList.remove('hidden');
  const W = window.innerWidth, H = window.innerHeight;
  let p = world.clone().project(camera);
  if (side) {
    const bw = el.offsetWidth, bh = el.offsetHeight;
    const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const q = world.clone().addScaledVector(right, side).project(camera);
    const off = Math.abs((q.x - p.x) * 0.5 * W) + 16;
    const roomR = W - (sx + off) - 10, roomL = sx - off - 10;
    const vis = p.z < 1 && sx > 0 && sx < W && sy > 0 && sy < H;
    if (vis && (roomR >= bw || roomL >= bw)) {
      const toRight = roomR >= bw && (sx < W * 0.5 || roomL < bw);
      const left = toRight ? sx + off : sx - off - bw;
      const top = clamp(sy - bh * 0.45, 10 + (isTouch ? 0 : 60), Math.max(70, H - bh - 160));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.setProperty('--tailY', `${clamp(sy - top, 18, bh - 18)}px`);
      el.classList.toggle('side-r', toRight);
      el.classList.toggle('side-l', !toRight);
      el.classList.remove('notail');
      return;
    }
    // no room beside the face: above the head instead
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    p = world.clone().addScaledVector(up, side * 1.6).project(camera);
  }
  el.classList.remove('side-l', 'side-r');
  const bw = el.offsetWidth, bh = el.offsetHeight;
  const sx = (p.x * 0.5 + 0.5) * W, sy = (-p.y * 0.5 + 0.5) * H;
  const vis = p.z < 1 && sx > -40 && sx < W + 40 && sy > -40 && sy < H + 40;
  const left = clamp((vis ? sx : W / 2) - bw * 0.3, 10, Math.max(10, W - bw - 10));
  const top = clamp((vis ? sy : H * 0.32) - bh - 30, 10 + (isTouch ? 0 : 60), Math.max(70, H - bh - 160));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.setProperty('--tail', `${clamp((vis ? sx : W / 2) - left, 24, bw - 24)}px`);
  el.classList.toggle('notail', !vis);
}
function echoSay(text, opts = {}) {
  if (!text) return;
  if (opts.now) {
    echoQueue.length = 0;
    echoBusy = false;
    clearTimeout(echoTimer);
  }
  echoQueue.push(text);
  while (echoQueue.length > 2) echoQueue.shift();
  if (!echoBusy) nextEcho();
}
function nextEcho() {
  const el = $('#echo');
  if (!echoQueue.length) {
    el.classList.remove('show');
    echoBusy = false;
    return;
  }
  echoBusy = true;
  const text = echoQueue.shift();
  $('#echoText').innerHTML = `<b>Dr. Echo:</b> ${escapeHtml(text)}`;
  el.classList.add('show');
  clearTimeout(echoTimer);
  const ms = clamp(2200 + text.length * 50, 3200, 10000) * (echoQueue.length ? 0.7 : 1);
  echoTimer = setTimeout(nextEcho, ms);
}

let toastTimer = null;
function toast(text, sub = '') {
  const el = $('#toast');
  el.innerHTML = `${escapeHtml(text)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function showModal(html, onMount, cls = '') {
  $('#sheet').innerHTML = html;
  $('#sheet').className = 'sheet' + (html.includes('data-wide') ? ' wide' : '') + (cls ? ' ' + cls : '');
  $('#modal').classList.toggle('glassbg', cls === 'glass');
  $('#modal').classList.remove('hidden');
  onMount && onMount($('#sheet'));
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#sheet').innerHTML = '';
}

function sourceLink(def) {
  if (!def.source) return '';
  const list = [def.source, ...(def.source2 ? [def.source2] : [])];
  return `<div class="src">${t('source')}: ${list.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a>`).join(' · ')}</div>`;
}

let cardTimer = null;
function showCard(def, info = {}) {
  const el = $('#card');
  if (cardOpen) closeCard(true);
  const fantasy = def.kind === 'fantasy';
  const kid = tier() === 'kid';
  const badge = fantasy ? `<span class="badge fantasy">★ ${t('fantasy')}</span>` : `<span class="badge real">${t('real')}</span>`;
  const isNew = info.isNew ? `<span class="badge new">${t('newDiscovery')}</span>` : '';
  let body = `<p>${escapeHtml(L(def.fact))}</p>`;
  if (fantasy && def.plain) {
    // Atlantis beings: just their story
  } else if (fantasy) {
    body += `<div class="note">${escapeHtml(t('fantasyNote'))}</div>`;
    body += `<p class="twist"><b>${t('realTwist')}:</b> ${escapeHtml(L(def.twist))}</p>`;
  } else if (!kid && def.more) {
    body += `<p>${escapeHtml(L(def.more))}</p>`;
  }
  const meta = info.depth !== undefined ? `<div class="meta">${t('foundAt', { depth: fmtNum(info.depth) })}${info.by ? ' · ' + escapeHtml(info.by) : ''}</div>` : '';
  const big = !!info.big, peek = big && !!info.peek;
  el.className = (fantasy ? 'fantasy' : '') + (big ? ' big' : '') + (peek ? ' peek' : '');
  el.innerHTML = `<button class="x" aria-label="${t('close')}">×</button>${big ? '<div class="card-3d"></div>' : ''}<div class="card-txt">${badge}${isNew}
    <h3>${escapeHtml(L(def.name))}</h3>${def.sci ? `<div class="sci">${escapeHtml(def.sci)}</div>` : ''}
    ${meta}${body}${fantasy ? '' : sourceLink(def)}${big && !peek ? `<div class="row-end"><button class="btn" id="cardGo">${t('cardContinue')}</button></div>` : ''}</div>
    ${peek ? '<div class="peek-bar"><i></i></div>' : ''}`;
  el.querySelector('.x').onclick = () => closeCard();
  clearTimeout(cardTimer);
  cardOpen = { big, paused: false, peek };
  if (peek) {
    // a new photo: the find turns in 3D for 5 seconds while you keep diving; press and hold the card to keep it
    try {
      viewer().show(el.querySelector('.card-3d'), def.model, { speed: 0.45 });
    } catch (e) {
      console.warn('3D view failed', e);
    }
    const PEEK = 5000, bar = el.querySelector('.peek-bar i'), mine = cardOpen;
    const start = () => {
      clearTimeout(cardTimer);
      bar.style.transition = 'none';
      bar.style.width = '100%';
      void bar.offsetWidth;
      bar.style.transition = `width ${PEEK}ms linear`;
      bar.style.width = '0%';
      cardTimer = setTimeout(() => cardOpen === mine && closeCard(), PEEK);
    };
    const hold = (e) => {
      if (e.target.closest('.x, a')) return;
      mine.held = true;
      clearTimeout(cardTimer);
      bar.style.transition = 'none';
      bar.style.width = '100%';
      el.classList.add('held');
    };
    const release = () => {
      if (!mine.held || cardOpen !== mine) return;
      mine.held = false;
      el.classList.remove('held');
      cardTimer = setTimeout(() => cardOpen === mine && closeCard(), 700);
    };
    el.addEventListener('pointerdown', hold);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    mine.off = () => {
      el.removeEventListener('pointerdown', hold);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    requestAnimationFrame(start);
  } else if (big) {
    // large 3D view: the camera circles the find until it is clicked away
    $('#cardBack').classList.remove('hidden');
    el.querySelector('#cardGo').onclick = () => closeCard();
    try {
      viewer().show(el.querySelector('.card-3d'), def.model, { speed: 0.45 });
    } catch (e) {
      console.warn('3D view failed', e);
    }
    if (info.pause && game && !game.ended && !game.multi) {
      game.paused = true;
      cardOpen.paused = true;
    }
  } else if (!info.stay) cardTimer = setTimeout(() => closeCard(), 14000);
  requestAnimationFrame(() => el.classList.add('show'));
}
let cardOpen = null;
function closeCard(quick = false) {
  const el = $('#card');
  el.classList.remove('show');
  if (el.classList.contains('big')) {
    clearTimeout(closeCard.t);
    closeCard.t = setTimeout(() => {
      if (!el.classList.contains('show')) el.classList.remove('big');
    }, 350);
  }
  $('#cardBack').classList.add('hidden');
  if (cardOpen && cardOpen.off) cardOpen.off();
  if (cardOpen && cardOpen.big) viewer().hide();
  if (cardOpen && cardOpen.paused && game && !game.ended) {
    game.paused = false;
    audio.click();
  }
  cardOpen = null;
  if (quick) el.className = '';
}
function hideCard() {
  closeCard();
}

function buildMenuBg() {
  const bg = $('#menuBg');
  if (bg.childElementCount) return;
  for (let i = 0; i < 5; i++) {
    const r = document.createElement('div');
    r.className = 'ray';
    r.style.left = `${10 + i * 18}%`;
    r.style.animationDelay = `${-i * 2}s`;
    bg.appendChild(r);
  }
  for (let i = 0; i < 24; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const s = 4 + Math.random() * 12;
    b.style.width = b.style.height = `${s}px`;
    b.style.left = `${Math.random() * 100}%`;
    b.style.animationDuration = `${8 + Math.random() * 12}s`;
    b.style.animationDelay = `${-Math.random() * 20}s`;
    bg.appendChild(b);
  }
}

function tierLabel() {
  return { kid: t('ageTierKid'), junior: t('ageTierJunior'), adult: t('ageTierAdult') }[tier()];
}

// ======================= branding: wordmark + footer bar (same as in iamPilot) =======================
function wordmarkHtml(tag = 'span', attrs = '') {
  return `<${tag} class="wm" aria-label="iamSubPilot" ${attrs}><span class="wm-iam">iam</span><span class="wm-sub">SubPilot</span><span class="wm-badge"></span></${tag}>`;
}
function socialHtml() {
  return `<div class="social" role="group" aria-label="Connect with Andreas Schmölzer on social media"><span class="social-t">${t('connect')} <span class="social-hug" aria-hidden="true">🤗</span></span><a class="so so-ig" href="https://www.instagram.com/schmoelzerandreas" target="_blank" rel="noopener" aria-label="Instagram: schmoelzerandreas" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="none" stroke="#fff" stroke-width="2.1"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="#fff" stroke-width="2.1"/><circle cx="17.3" cy="6.7" r="1.35" fill="#fff"/></svg></a><a class="so so-fb" href="https://www.facebook.com/andreas.schmoelzer" target="_blank" rel="noopener" aria-label="Facebook: andreas.schmoelzer" title="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M13.6 21.5v-7.7h2.6l.4-3.1h-3V8.8c0-.9.3-1.5 1.5-1.5h1.6V4.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H7.9v3.1h2.6v7.7z"/></svg></a><a class="so so-tt" href="https://www.tiktok.com/@andreasschmoelzer" target="_blank" rel="noopener" aria-label="TikTok: @andreasschmoelzer" title="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><g transform="translate(-0.7,-0.6)"><path fill="#25f4ee" d="M16.6 5.6a4.4 4.4 0 0 1-1.1-2.9h-3.2v12.6a2.7 2.7 0 1 1-1.9-2.6V9.4a5.9 5.9 0 1 0 5.1 5.9V9a7.5 7.5 0 0 0 4.4 1.4V7.2a4.4 4.4 0 0 1-3.3-1.6z"/></g><g transform="translate(0.7,0.6)"><path fill="#fe2c55" d="M16.6 5.6a4.4 4.4 0 0 1-1.1-2.9h-3.2v12.6a2.7 2.7 0 1 1-1.9-2.6V9.4a5.9 5.9 0 1 0 5.1 5.9V9a7.5 7.5 0 0 0 4.4 1.4V7.2a4.4 4.4 0 0 1-3.3-1.6z"/></g><path fill="#fff" d="M16.6 5.6a4.4 4.4 0 0 1-1.1-2.9h-3.2v12.6a2.7 2.7 0 1 1-1.9-2.6V9.4a5.9 5.9 0 1 0 5.1 5.9V9a7.5 7.5 0 0 0 4.4 1.4V7.2a4.4 4.4 0 0 1-3.3-1.6z"/></svg></a><a class="so so-yt" href="https://www.youtube.com/user/pilotFilmSchmoelzer" target="_blank" rel="noopener" aria-label="YouTube: pilotFilmSchmoelzer" title="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M9.6 7.9v8.2l6.9-4.1z"/></svg></a><a class="so so-li" href="https://www.linkedin.com/in/andreasschmoelzer" target="_blank" rel="noopener" aria-label="LinkedIn: andreasschmoelzer" title="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.9" cy="6.6" r="1.75" fill="#fff"/><rect x="5.4" y="9.4" width="3" height="9.4" fill="#fff"/><path fill="#fff" d="M10.6 9.4h2.9v1.3c.4-.8 1.5-1.6 3.1-1.6 3.2 0 3.7 2 3.7 4.7v5h-3v-4.4c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4v4.5h-3z"/></svg></a></div>`;
}
function creditHtml() {
  const AS = 'https://www.andreas-schmoelzer.at', PF = 'https://www.pilotfilm.at';
  const ext = 'target="_blank" rel="noopener"';
  return `<div class="credit"><span class="logos"><a class="logo-link as" href="${AS}" ${ext} aria-label="www.Andreas-Schmoelzer.at"><img src="assets/logo-schmoelzer.png" alt="Andreas Schmölzer Keynote-Speaker logo" width="176" height="26"></a><a class="logo-link pf" href="${PF}" ${ext} aria-label="www.pilotFilm.at"><img src="assets/logo-pilotfilm.png" alt="pilotFilm logo" width="127" height="30"></a><a class="logo-link me" href="${AS}" ${ext} aria-label="Andreas Schmölzer"><img src="assets/andreas-schmoelzer.png" alt="Portrait of Andreas Schmölzer" width="62" height="63" decoding="async" loading="lazy"></a></span>${socialHtml()}</div>
    <p class="legal"><span class="ver">v${GAME_VERSION}</span><a href="${PF}/impressum" ${ext}>${t('imprint')}</a><a href="privacy.html" ${ext}>${t('privacy')}</a></p>`;
}
function footerHtml() {
  return `<div class="menu-foot">
    <p class="flyreal">${t('footAi')}</p>
    ${creditHtml()}
  </div>`;
}

// ======================= welcome / profile =======================
function showWelcome(onDone) {
  if (aquarium) {
    aquarium.setMode('menu');
    $('#c').style.visibility = 'visible';
  }
  const html = `
    ${wordmarkHtml('div')}
    <h1>${t('welcomeTitle')}</h1>
    <p>${t('welcomeText')}</p>
    <div class="field"><label>${t('language')}</label>
      <div class="seg" id="wLang"><button data-l="en" class="${getLang() === 'en' ? 'on' : ''}">English</button><button data-l="de" class="${getLang() === 'de' ? 'on' : ''}">Deutsch</button></div></div>
    <div class="field"><label for="wName">${t('nickname')}</label><input id="wName" type="text" maxlength="30" autocomplete="off" value="${escapeHtml(profile.name)}"><div class="hint" id="wNameHint"></div><div class="hint cloud-hint">☁️ ${t('nicknameCloud')}</div></div>
    <div class="field"><label for="wAge">${t('age')}</label><input id="wAge" type="number" min="5" max="120" inputmode="numeric" value="${profile.age || ''}"><div class="hint" id="wAgeHint"></div></div>
    <div class="row-end"><button class="btn big" id="wGo">${t('letsGo')}</button></div>
    <p class="welcome-privacy">${t('welcomePrivacy')} <a href="privacy.html" target="_blank" rel="noopener">${t('privacy')}</a> · <a href="https://www.pilotfilm.at/impressum" target="_blank" rel="noopener">${t('imprint')}</a></p>`;
  showModal(html, (root) => {
    root.querySelectorAll('#wLang button').forEach((b) => {
      b.onclick = () => {
        profile.name = root.querySelector('#wName').value;
        profile.age = Number(root.querySelector('#wAge').value) || 0;
        profile.lang = b.dataset.l;
        setLang(profile.lang);
        showWelcome(onDone);
      };
    });
    root.querySelector('#wGo').onclick = () => {
      const name = root.querySelector('#wName').value.trim();
      const age = Number(root.querySelector('#wAge').value);
      let ok = true;
      if (!/^[\p{L}\p{N} _\-.]{2,30}$/u.test(name)) {
        root.querySelector('#wNameHint').textContent = t('nameHint');
        ok = false;
      } else root.querySelector('#wNameHint').textContent = '';
      if (!(age >= 5 && age <= 120)) {
        root.querySelector('#wAgeHint').textContent = t('ageHint');
        ok = false;
      } else root.querySelector('#wAgeHint').textContent = '';
      if (!ok) return;
      profile.name = name;
      profile.age = Math.round(age);
      saveProfile();
      audio.init();
      closeModal();
      onDone && onDone();
      syncProfile().then((changed) => changed && !game && $('#menu') && !$('#menu').classList.contains('hidden') && renderMenu());
    };
  });
}

// ======================= model images (rendered once with the game renderer) =======================
const imgCache = {};
// Render a 3D model into a transparent PNG data URL.
function renderModelImage(key, make, { w = 320, h = 200, yaw = -2.35, dist = 1.12, lift = 0.32 } = {}) {
  if (imgCache[key]) return imgCache[key];
  try {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xd8f6ff, 0x0a2030, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const m = make();
    m.rotation.y = yaw;
    scene.add(m);
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 200);
    cam.position.set(c.x + size * 0.1, c.y + size * lift, c.z + size * dist);
    cam.lookAt(c);
    const rt = new THREE.WebGLRenderTarget(w, h);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const prevColor = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, cam);
    const buf = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    renderer.setRenderTarget(null);
    renderer.setClearColor(prevColor, prevAlpha);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    imgCache[key] = cv.toDataURL('image/png');
    rt.dispose();
  } catch (e) {
    console.warn('model image failed', e);
    imgCache[key] = 'favicon.svg';
  }
  return imgCache[key];
}

function subModelNoBeam(id) {
  const m = buildSubModel(id, null, false);
  m.remove(m.userData.beam);
  m.userData.glowMat.opacity = 0.5;
  return m;
}

function subThumb(id) {
  return renderModelImage('thumb-' + id, () => subModelNoBeam(id));
}

// ======================= passers-by in front of the main menu =======================
// Now and then a single fish or sub glides across the menu (in front of the text).
const PASSERS = [
  ['sub', 'isabella', 260], ['sub', 'hummel', 220], ['sub', 'wolfshark', 240], ['sub', 'puffer', 170], ['sub', 'narwhal', 250], ['sub', 'octopus', 170], ['sub', 'rocket', 230], ['sub', 'ufo', 220],
  ['ani', 'turtle', 150], ['ani', 'manta', 230], ['ani', 'dolphin', 190], ['ani', 'tuna', 120], ['ani', 'sunfish', 150],
  ['ani', 'hammerhead', 230], ['ani', 'whiteshark', 260], ['ani', 'blueshark', 230], ['ani', 'goblin', 220],
  ['ani', 'whaleshark', 300], ['ani', 'angler', 120], ['ani', 'jellyphant', 150], ['ani', 'duckangler', 130], ['ani', 'toaster', 140],
];
let passerTimer = null;
function schedulePasser(first = false) {
  clearTimeout(passerTimer);
  passerTimer = setTimeout(spawnPasser, first ? 2500 + Math.random() * 3000 : 6000 + Math.random() * 9000);
}
function spawnPasser() {
  const box = $('#passers');
  const menuOn = !$('#menu').classList.contains('hidden') && !game;
  if (!menuOn) return; // renderMenu starts it again
  if (box.childElementCount < 2 && !document.hidden) {
    const [kind, id, width] = PASSERS[Math.floor(Math.random() * PASSERS.length)];
    const src = renderModelImage(`side-${kind}-${id}`, () => (kind === 'sub' ? subModelNoBeam(id) : buildModel(id)), { w: 360, h: 220, yaw: Math.PI / 2 - 0.35, dist: 1.0, lift: 0.18 });
    const right = Math.random() < 0.5;
    const scale = 0.75 + Math.random() * 0.5;
    const el = document.createElement('div');
    el.className = 'passer';
    el.style.top = `${10 + Math.random() * 70}%`;
    el.style.width = `${Math.round(width * 1.3 * scale * (window.innerWidth < 600 ? 0.7 : 1))}px`;
    el.style.animationName = right ? 'passR' : 'passL';
    el.style.animationDuration = `${(10 + Math.random() * 6) * (kind === 'sub' ? 0.85 : 1)}s`;
    el.innerHTML = `<img alt="" src="${src}" style="${right ? 'transform:scaleX(-1)' : ''}">`;
    el.addEventListener('animationend', (e) => e.target === el && el.remove());
    box.appendChild(el);
  }
  schedulePasser();
}

// ======================= info window after the title screen =======================
function showInfo(onDone) {
  const src = [
    ['Science Advances 2025 (Ocean Discovery League)', 'https://www.science.org/doi/10.1126/sciadv.adp8602'],
    ['Seabed 2030 (2025)', 'https://seabed2030.org/?p=2903'],
    ['NOAA Ocean Exploration', 'https://oceanexplorer.noaa.gov/okeanos/explorations/ex2102/features/hadalzone/hadalzone.html'],
    ['WHOI', 'https://www.whoi.edu/know-your-ocean/ocean-topics/seafloor-below/ocean-trenches/'],
    ['University of New Hampshire', 'https://www.eurekalert.org/news-releases/1082877'],
  ];
  showModal(`<div class="info-kicker">${t('infoKicker')}</div>
    <h1>${t('infoTitle')}</h1>
    <p>${t('infoP1')}</p>
    <p>${t('infoP2')}</p>
    <p class="info-go">${t('infoP4')}</p>
    <div class="row-end"><button class="btn big" id="infoGo">${t('infoButton')}</button></div>
    <p class="info-src">${t('infoSources')}: ${src.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`).join(' · ')}</p>`, (root) => {
    root.querySelector('#infoGo').onclick = () => {
      audio.click();
      closeModal();
      onDone && onDone();
    };
  }, 'glass');
}

// ======================= menu =======================
let selLevel = profile.lastLevel;
let selMode = profile.lastMode;

// The sub under the mouse (or the tapped one on touch screens) appears big in its own layer above the
// cards – it may overlap the text and is never cut off by the scrolling row – and turns slowly around.
let spinning = null;
function spinSub(card) {
  if (spinning === card) return;
  unspinSub();
  spinning = card;
  card.classList.add('spin');
  const box = $('#subSpin');
  const r = card.querySelector('.subimg').getBoundingClientRect();
  const size = Math.max(Math.min(420, window.innerWidth * 0.9), Math.min(window.innerWidth * 0.7, r.width * 3.6));
  const h = size * 0.7;
  box.style.width = size + 'px';
  box.style.height = h + 'px';
  box.style.left = clamp(r.left + r.width / 2 - size / 2, 4, window.innerWidth - size - 4) + 'px';
  box.style.top = clamp(r.top + r.height / 2 - h / 2, 4, window.innerHeight - h - 4) + 'px';
  box.classList.remove('hidden');
  requestAnimationFrame(() => box.classList.add('show'));
  try {
    viewer().show(box, 'sub:' + card.dataset.sub, { speed: (Math.PI * 2) / 9, zoom: 0.72, start: 0.6, drag: false });
  } catch (e) {
    console.warn(e);
  }
}
function unspinSub(card) {
  if (card && spinning !== card) return;
  if (spinning) spinning.classList.remove('spin');
  spinning = null;
  const box = $('#subSpin');
  box.classList.remove('show');
  box.classList.add('hidden');
  viewer().hide();
}
window.addEventListener('scroll', () => spinning && unspinSub(), true);
window.addEventListener('resize', () => spinning && unspinSub());

function renderMenu() {
  viewer().hide();
  $('#intro').classList.add('hidden');
  if (aquarium) {
    aquarium.setMode('menu');
    $('#c').style.visibility = 'visible';
    $('#menuBg').classList.add('hidden');
  } else {
    buildMenuBg();
    $('#menuBg').classList.remove('hidden');
    $('#c').style.visibility = 'hidden';
  }
  audio.music('intro');
  const hullRating = HULL_RATINGS[profile.upgrades.hull];
  const cards = LEVELS.map((lv, i) => {
    const warn = lv.maxDepth > hullRating ? `<div class="twarn">⚠ ${t('locked', { rating: fmtNum(hullRating) })}</div>` : '';
    return `<button class="trench ${lv.id === selLevel ? 'sel' : ''}" data-id="${lv.id}">
      <span class="tlvl">${i + 1}</span>
      <div class="tname">${escapeHtml(L(lv.name))}</div>
      <div class="tocean">${escapeHtml(L(lv.ocean))}</div>
      <div class="tdepth">${fmtNum(lv.maxDepth)} m</div>
      <div class="tintro">${escapeHtml(L(lv.intro))}</div>${warn}</button>`;
  }).join('');
  $('#menu').innerHTML = `
    <div class="menu-head">
      <div class="title">${wordmarkHtml('button', 'id="mLogo" title="Intro"').replace('class="wm"', 'class="wm logo-btn"')}<div class="tagline">${t('tagline')}</div></div>
      <div class="chips">
        <button class="chip" id="mProfile">👤 ${escapeHtml(profile.name)} · ${tierLabel()}</button>
        <span class="chip">🔬 ${fmtNum(rpAvailable())} ${getLang() === 'de' ? 'FP' : 'RP'}</span>
        <span class="chip">🛡 ${fmtNum(hullRating)} m</span>
        <button class="chip" id="mLang">${getLang() === 'de' ? 'EN' : 'DE'}</button>
        <button class="chip" id="mSound">${soundLabel()}</button>
      </div>
    </div>
    <hr class="sep">
    <h2>${t('chooseTrench')}</h2>
    <div class="trenches">${cards}</div>
    <hr class="sep">
    <h2>${t('chooseSub')}</h2>
    <div class="subs">${SUB_MODELS.map((m) => `<button class="subcard ${m.id === subModelById(profile.sub).id ? 'sel' : ''}" data-sub="${m.id}">
      <span class="subimg"><img alt="" src="${subThumb(m.id)}"></span><b>${escapeHtml(L(m.name))}</b><span>${escapeHtml(L(m.desc))}</span></button>`).join('')}</div>
    <hr class="sep">
    <h2>${t('chooseMode')}</h2>
    <div class="modes">
      <button class="mode ${selMode === 'expedition' ? 'sel' : ''}" data-mode="expedition"><b>🔦 ${t('modeExpedition')}</b><span>${t('modeExpeditionDesc')}</span></button>
      <button class="mode ${selMode === 'race' ? 'sel' : ''}" data-mode="race"><b>🏁 ${t('modeRace')}</b><span>${t('modeRaceDesc')}</span></button>
    </div>
    <hr class="sep">
    <div class="menu-actions">
      <button class="btn big" id="mStart">${t('start')}</button>
      <button class="btn secondary" id="mMulti">👥 ${t('multiplayer')}</button>
      <button class="btn secondary" id="mHangar">🔧 ${t('hangar')}</button>
      <button class="btn secondary" id="mLog">📖 ${t('logbook')}</button>
      <button class="btn secondary" id="mLb">🏆 ${t('leaderboard')}</button>
    </div>
    ${footerHtml()}`;
  $('#menu').classList.remove('hidden');
  schedulePasser(true);
  const selCard = $('#menu .trench.sel');
  if (selCard) selCard.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('#menu').querySelectorAll('.trench').forEach((b) => {
    b.onclick = () => {
      selLevel = b.dataset.id;
      profile.lastLevel = selLevel;
      saveProfile();
      $('#menu').querySelectorAll('.trench').forEach((x) => x.classList.toggle('sel', x === b));
      audio.init();
      audio.click();
    };
  });
  $('#menu').querySelectorAll('.mode').forEach((b) => {
    b.onclick = () => {
      selMode = b.dataset.mode;
      profile.lastMode = selMode;
      saveProfile();
      $('#menu').querySelectorAll('.mode').forEach((x) => x.classList.toggle('sel', x === b));
      audio.init();
      audio.click();
    };
  });
  $('#mStart').onclick = () => {
    audio.init();
    startDive({ level: levelById(selLevel), mode: selMode, seed: Math.floor(Math.random() * 1e9) });
  };
  $('#mProfile').onclick = () => showWelcome(renderMenu);
  $('#menu').querySelectorAll('.subcard').forEach((b) => {
    b.onclick = () => {
      profile.sub = b.dataset.sub;
      saveProfile();
      $('#menu').querySelectorAll('.subcard').forEach((x) => x.classList.toggle('sel', x === b));
      audio.init();
      audio.click();
      if (isTouch) spinSub(b); // no hover on touch screens: the tapped sub turns
    };
    // hovering a sub: it grows and turns slowly once around
    b.onpointerenter = (e) => {
      if (e.pointerType === 'mouse') spinSub(b);
    };
    b.onpointerleave = (e) => {
      if (e.pointerType === 'mouse') unspinSub(b);
    };
  });

  $('#mLang').onclick = () => {
    profile.lang = getLang() === 'de' ? 'en' : 'de';
    setLang(profile.lang);
    saveProfile();
    renderMenu();
  };
  $('#mSound').onclick = () => {
    audio.init();
    audio.cycleMode();
    $('#mSound').textContent = soundLabel();
  };
  $('#mLogo').onclick = () =>
    showIntro(() => {
      renderMenu();
      showInfo();
    });
  $('#mHangar').onclick = showHangar;
  $('#mLog').onclick = () => showLogbook('real');
  $('#mLb').onclick = () => showLeaderboard('exp', selLevel);
  $('#mMulti').onclick = showMultiplayer;
  // how many divers are online right now – on the multiplayer button (rooms over LiveKit: one quick request)
  net.ready().then(() => {
    if (net.mode !== 'lk' || !net.mpAvailable) return;
    net.listRooms().then((rooms) => {
      const n = (rooms || []).reduce((k, r) => k + (Number(r.players) || 0), 0);
      const b = $('#mMulti');
      if (b && b.isConnected) b.innerHTML = `👥 ${t('multiplayer')} <span class="mp-online">🟢 ${t('mpOnlineN', { n })}</span>`;
    }).catch(() => {});
  });
}

// ======================= hangar =======================
const UPGRADES = {
  hull: { costs: [0, 1200, 3000], label: 'up_hull', val: (l) => `${fmtNum(HULL_RATINGS[l])} m` },
  battery: { costs: [0, 600, 1500], label: 'up_battery', val: (l) => `${[100, 125, 150][l]} %` },
  lights: { costs: [0, 500, 1200], label: 'up_lights', val: (l) => `${[45, 60, 75][l] * 10} m` },
  sonar: { costs: [0, 500, 1200], label: 'up_sonar', val: (l) => `${[110, 160, 220][l] * 10} m` },
};
function showHangar() {
  const rows = Object.entries(UPGRADES).map(([key, u]) => {
    const lvl = profile.upgrades[key];
    const next = lvl + 1;
    const max = next >= u.costs.length;
    const cost = max ? 0 : u.costs[next];
    const bars = u.costs.map((_, i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('');
    return `<div class="up"><div><b>${t(u.label)}</b> <small>${u.val(lvl)}</small><div class="lv">${bars}</div></div>
      <div>${max ? `<small>${t('owned')}</small>` : `<button class="btn small" data-up="${key}" ${rpAvailable() < cost ? 'disabled' : ''}>${t('upgrade')} → ${u.val(next)}<br><small>${t('cost', { rp: fmtNum(cost) })}</small></button>`}</div></div>`;
  }).join('');
  showModal(`<h1>🔧 ${t('hangarTitle')}</h1><p>🔬 ${t('research')}: <b>${fmtNum(rpAvailable())}</b></p><div class="ups">${rows}</div>
    <div class="row-end"><button class="btn secondary" id="hClose">${t('close')}</button></div>`, (root) => {
    root.querySelectorAll('[data-up]').forEach((b) => {
      b.onclick = () => {
        const key = b.dataset.up;
        const next = profile.upgrades[key] + 1;
        const cost = UPGRADES[key].costs[next];
        if (rpAvailable() < cost) return toast(t('notEnough'));
        profile.spent += cost;
        profile.upgrades[key] = next;
        saveProfile();
        audio.mission();
        showHangar();
      };
    });
    root.querySelector('#hClose').onclick = () => {
      closeModal();
      renderMenu();
    };
  });
}

// ======================= logbook =======================
function showLogbook(tab) {
  const list = CREATURES.filter((c) => (tab === 'fantasy' ? c.kind === 'fantasy' : c.kind !== 'fantasy' && c.id !== 'lander'));
  const items = list.map((c) => {
    const e = profile.logbook[c.id];
    if (!e) return `<div class="logitem unk ${c.kind === 'fantasy' ? 'fan' : ''}"><b>???</b><small>${t('notFound')}</small></div>`;
    return `<button class="logitem ${c.kind === 'fantasy' ? 'fan' : ''}" data-id="${c.id}"><b>${escapeHtml(L(c.name))}</b><small>${c.kind === 'fantasy' ? '★ ' + t('fantasy') : t('real')} · ${fmtNum(e.maxDepth)} m · ×${e.n}</small></button>`;
  }).join('');
  const count = list.filter((c) => profile.logbook[c.id]).length;
  showModal(`<div data-wide></div><h1>📖 ${t('logbookTitle')} <small style="color:var(--ink-soft);font-size:15px">${count}/${list.length}</small></h1>
    <div class="tabs"><button class="tab ${tab === 'real' ? 'on' : ''}" data-tab="real">${t('logReal')}</button><button class="tab ${tab === 'fantasy' ? 'on' : ''}" data-tab="fantasy">★ ${t('logFantasy')}</button></div>
    <div class="loggrid">${items}</div>
    <div class="row-end"><button class="btn secondary" id="lClose">${t('close')}</button></div>`, (root) => {
    root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => showLogbook(b.dataset.tab)));
    root.querySelectorAll('[data-id]').forEach((b) => {
      b.onclick = () => {
        const def = CREATURES.find((c) => c.id === b.dataset.id);
        showCard(def, { depth: profile.logbook[def.id].maxDepth, stay: true, big: true });
      };
    });
    root.querySelector('#lClose').onclick = () => {
      closeModal();
      hideCard();
    };
  });
}

// ======================= leaderboard =======================
async function showLeaderboard(kind, levelId) {
  const levelOpts = LEVELS.map((l) => `<option value="${l.id}" ${l.id === levelId ? 'selected' : ''}>${escapeHtml(L(l.name))}</option>`).join('');
  showModal(`<h1>🏆 ${t('lbTitle')}</h1>
    <div class="tabs">
      <button class="tab ${kind === 'exp' ? 'on' : ''}" data-k="exp">${t('lbExpedition')}</button>
      <button class="tab ${kind === 'race' ? 'on' : ''}" data-k="race">${t('lbRace')}</button>
      <button class="tab ${kind === 'deepest' ? 'on' : ''}" data-k="deepest">${t('lbDeepest')}</button>
      <button class="tab ${kind === 'divers' ? 'on' : ''}" data-k="divers">☁️ ${t('lbDivers')}</button>
    </div>
    ${kind !== 'deepest' && kind !== 'divers' ? `<select id="lbLevel">${levelOpts}</select>` : ''}
    <div id="lbList" style="margin-top:10px">${t('loading')}</div>
    <div class="row-end"><button class="btn secondary" id="lbClose">${t('close')}</button></div>`, async (root) => {
    root.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => showLeaderboard(b.dataset.k, levelId)));
    const sel = root.querySelector('#lbLevel');
    if (sel) sel.onchange = () => showLeaderboard(kind, sel.value);
    root.querySelector('#lbClose').onclick = closeModal;
    if (kind === 'divers') {
      // every diver with progress in the cloud, most research points first
      const list = await cloud.list();
      const el = root.querySelector('#lbList');
      if (!el) return;
      const me = nameKey(profile.name);
      const rows = (list || []).map((d, i) => `<tr class="${nameKey(d.name) === me ? 'me' : ''}"><td>${i + 1}.</td><td>${escapeHtml(d.name || '?')}</td><td>🔬 ${fmtNum(d.rp)}</td><td>🤿 ${fmtNum(d.dives)}</td><td>📖 ${fmtNum(d.species)}</td></tr>`).join('');
      el.innerHTML = `<div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px">${list ? t('lbDiversNote') : t('lbDiversOffline')}</div>` + (rows ? `<table class="lb">${rows}</table>` : list ? `<p>${t('lbEmpty')}</p>` : '');
      return;
    }
    const board = kind === 'deepest' ? 'deepest' : `${kind}_${levelId}`;
    const asc = kind === 'race';
    const res = await net.top(board, asc, 10);
    const el = root.querySelector('#lbList');
    if (!el) return;
    const fmt = (e) => (asc ? fmtTime(e.time) : kind === 'deepest' ? `${fmtNum(e.score)} m` : fmtNum(e.score));
    const rows = res.list.map((e, i) => `<tr><td>${i + 1}.</td><td>${escapeHtml(e.name || '?')}</td><td>${fmt(e)}</td></tr>`).join('');
    el.innerHTML = `<div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px">${res.online ? t('lbOnline') : t('lbLocal')}</div>` +
      (rows ? `<table class="lb">${rows}</table>` : `<p>${t('lbEmpty')}</p>`);
  });
}

function fmtTime(sec) {
  if (sec == null || !isFinite(sec)) return '–';
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

// ======================= multiplayer =======================
const PLAYER_COLORS = [0xffc21a, 0x4dd2ff, 0x7dff8a, 0xff7ad9];
let lobbyOpen = false;

// Colours follow the join order, so everybody sees the same colours.
function colorFor(uid, players) {
  const order = Object.entries(players || {})
    .sort((a, b) => (a[1].joined || 0) - (b[1].joined || 0) || (a[0] < b[0] ? -1 : 1))
    .map(([u]) => u);
  const i = Math.max(0, order.indexOf(uid));
  return PLAYER_COLORS[i % PLAYER_COLORS.length];
}
const hexColor = (c) => '#' + new THREE.Color(c).getHexString();

// ======================= radio (push-to-talk + quick calls) =======================
let radio = null;
const voiceAllowed = () => (profile.age || 0) >= 14;
let lastTalkers = '';

function createRadio() {
  if (radio || !net.room || !(net.room.peer || net.room.isLk)) return;
  radio = new Radio(net, { onTalk: updateRadioUi, onError: () => toast(t('radioNoMic')) });
  if (!voiceAllowed()) radio.setEnabled(false); // under 14: quick calls only
  radio.sync(net.room.players);
  updateRadioUi();
}

function leaveRoomAll() {
  keepAwake(false);
  if (radio) radio.destroy();
  radio = null;
  $('#radio').classList.add('hidden');
  net.leaveRoom();
}

function radioPress() {
  if (!radio || !voiceAllowed()) return;
  if (!sessionStorage.getItem('hadal.radioOk')) {
    const n = $('#radioNotice');
    n.innerHTML = `<b>🎙 ${t('radioNoticeTitle')}</b><p>${t('radioNoticeText')}</p><div class="row-end"><button class="btn small secondary" id="rnNo">${t('close')}</button><button class="btn small" id="rnOk">${t('radioNoticeOk')}</button></div>`;
    n.classList.remove('hidden');
    n.querySelector('#rnOk').onclick = () => {
      sessionStorage.setItem('hadal.radioOk', '1');
      n.classList.add('hidden');
    };
    n.querySelector('#rnNo').onclick = () => n.classList.add('hidden');
    return;
  }
  radio.press();
}
function radioRelease() {
  if (radio) radio.release();
}

// who is talking right now (shown next to the radio button), squelch + ducking for incoming voice
function updateRadioUi() {
  const players = (net.room && net.room.players) || {};
  const talkers = Object.entries(players).filter(([u, p]) => p.talk && u !== net.uid && !(radio && radio.mutedUids.has(u))).map(([, p]) => p.name || '?');
  const key = talkers.join(',');
  if (radio && radio.enabled && key !== lastTalkers) {
    if (talkers.length > lastTalkers.split(',').filter(Boolean).length) audio.squelch();
    else if (lastTalkers) audio.squelch(true);
    if (!radio.talking) audio.duck(talkers.length > 0);
  }
  lastTalkers = key;
  const me = radio && radio.talking;
  const who = me ? `🎙 ${t('radioYou')}${radio.locked ? ' 🔒' : ''}` : talkers.length ? `🎙 ${talkers.map(escapeHtml).join(', ')}` : '';
  document.querySelectorAll('.radio-who').forEach((el) => (el.innerHTML = who));
  document.querySelectorAll('.radio-ptt').forEach((b) => {
    b.classList.toggle('on', !!me);
    b.classList.toggle('locked', !!(radio && radio.locked));
    const lbl = b.querySelector('small');
    if (lbl) lbl.textContent = radio && radio.locked ? t('radioLocked') : me ? t('radioTalk') : t('radioHold');
  });
}

function bindPtt(btn) {
  if (!btn) return;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      btn.setPointerCapture(e.pointerId);
    } catch (x) {
      /* ignore */
    }
    radioPress();
  });
  const up = (e) => {
    e.preventDefault();
    radioRelease();
  };
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
}

function quickCallsHtml() {
  return QUICK_CALLS.map((q, i) => `<button class="qc" data-qc="${q.k}">${i + 1}. ${escapeHtml(L(q))}</button>`).join('');
}
function bindQuickCalls(root, after) {
  root.querySelectorAll('[data-qc]').forEach((b) => (b.onclick = () => {
    sendQuickCall(b.dataset.qc);
    after && after();
  }));
}
function sendQuickCall(k) {
  const q = QUICK_CALLS.find((x) => x.k === k);
  if (!q || !net.room) return;
  net.sendEvent({ type: 'radio', k, name: profile.name });
  audio.squelch(true);
  showRadioLine(t('radioYou'), L(q));
}
function onQuickCall(ev) {
  const q = QUICK_CALLS.find((x) => x.k === ev.k);
  if (!q || (radio && radio.mutedUids.has(ev.by))) return;
  audio.squelch(true);
  showRadioLine(ev.name || '?', L(q));
  if (game && ['look', 'found', 'help', 'follow'].includes(ev.k)) {
    const r = game.remote.get(ev.by);
    if (r) r.flash(7);
  }
}
let radioLineTimer = null;
function showRadioLine(name, text) {
  const el = $('#radioLine');
  el.innerHTML = `📻 <b>${escapeHtml(name)}:</b> ${escapeHtml(text)}`;
  el.classList.remove('hidden');
  clearTimeout(radioLineTimer);
  radioLineTimer = setTimeout(() => el.classList.add('hidden'), 4500);
}
function toggleQuickMenu(force) {
  const menu = $('#radioMenu');
  const open = force ?? menu.classList.contains('hidden');
  if (open) {
    menu.innerHTML = quickCallsHtml();
    bindQuickCalls(menu, () => menu.classList.add('hidden'));
  }
  menu.classList.toggle('hidden', !open);
}

// All rooms are public and have no visible code: you either jump into an open
// room ("play now") or open your own. A room waits a short while for others
// (countdown, the host can start earlier) – latecomers simply join the running dive.
const LOBBY_WAIT = 40000;
let lobbyTimer = null;
let lobbyStarting = false;
let mpRefreshTimer = null;
let mpMode = 'coop';

function fmtCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function roomJoinable(r) {
  return !r.unreachable && r.players < 4;
}

function roomStatusText(r) {
  if (r.status === 'running') return t('mpRunningJoin');
  if (r.autoStartAt) return t('mpLobbyWait', { t: fmtCountdown(r.autoStartAt - Date.now()) });
  return t('mpWaiting');
}

// best room for "play now": waiting rooms with the most players first, then running ones
function pickRoom(rooms) {
  const open = rooms.filter(roomJoinable);
  const waiting = open.filter((r) => r.status !== 'running').sort((a, b) => b.players - a.players);
  const running = open.filter((r) => r.status === 'running').sort((a, b) => (a.mode === 'race') - (b.mode === 'race') || b.players - a.players);
  return waiting[0] || running[0] || null;
}

function stopMpRefresh() {
  clearInterval(mpRefreshTimer);
  mpRefreshTimer = null;
}

async function showMultiplayer() {
  audio.init();
  await net.ready();
  if (!net.mpAvailable) {
    showModal(`<h1>👥 ${t('mpTitle')}</h1><p>${t('mpOffline')}</p><div class="row-end"><button class="btn secondary" id="mpClose">${t('close')}</button></div>`, (r) => {
      r.querySelector('#mpClose').onclick = closeModal;
    });
    return;
  }
  const levelOpts = LEVELS.map((l) => `<option value="${l.id}" ${l.id === selLevel ? 'selected' : ''}>${escapeHtml(L(l.name))} (${fmtNum(l.maxDepth)} m)</option>`).join('');
  showModal(`<h1>👥 ${t('mpTitle')} <span class="mp-online" id="mpOnline">🟢 …</span></h1>
    <p style="margin-top:0;color:#1d1d1d">${t('mpPublicNote')}</p>
    <button class="btn big mp-quick" id="mpQuick">⚡ ${t('mpQuickPlay')}</button>
    <div class="hint" id="mpHint" style="text-align:center">${t('mpQuickPlayDesc')}</div>
    <h2 style="margin-top:16px">${t('mpOpenRooms')} <button class="btn small secondary" id="mpRefresh" style="margin-left:8px">🔄</button></h2>
    <div class="rooms" id="mpRooms"><div class="hint">${t('mpSearching')}</div></div>
    ${net.mode === 'p2p' ? `<div class="mpdiag" id="mpDiag"><b>${t('mpDiag')}:</b> <span>${t('mpDiagRunning')}</span></div>` : ''}
    <h2 style="margin-top:16px">${t('mpOpenOwn')}</h2>
    <div class="modes">
      <button class="mode ${mpMode === 'coop' ? 'sel' : ''}" data-mm="coop"><b>🤝 ${t('mpCoop')}</b><span>${t('mpCoopDesc')}</span></button>
      <button class="mode ${mpMode === 'race' ? 'sel' : ''}" data-mm="race"><b>🏁 ${t('mpRace')}</b><span>${t('mpRaceDesc')}</span></button>
    </div>
    <div class="askrow" style="margin-top:8px"><select id="mpLevel">${levelOpts}</select><button class="btn" id="mpCreate">${t('mpOpenBtn')}</button></div>
    ${net.mode === 'p2p' ? `<p style="font-size:12px;color:var(--ink-soft);margin-top:10px">${t('mpP2PNote')}</p>` : ''}
    <div class="row-end"><button class="btn secondary" id="mpClose">${t('close')}</button></div>`, (root) => {
    const hint = root.querySelector('#mpHint');
    root.querySelectorAll('[data-mm]').forEach((b) => {
      b.onclick = () => {
        mpMode = b.dataset.mm;
        root.querySelectorAll('[data-mm]').forEach((x) => x.classList.toggle('sel', x === b));
      };
    });
    root.querySelector('#mpClose').onclick = () => {
      stopMpRefresh();
      closeModal();
    };
    const create = async (mode, level) => {
      hint.textContent = t('mpConnecting');
      try {
        stopMpRefresh();
        await net.createRoom({ mode, level, name: profile.name, sub: profile.sub, autoStartAt: LOBBY_WAIT });
        openLobby();
      } catch (e) {
        hint.textContent = e.message === 'p2p' || e.message === 'timeout' ? t('mpNoConn') : String(e.message || e);
      }
    };
    root.querySelector('#mpCreate').onclick = () => create(mpMode, root.querySelector('#mpLevel').value);
    let rooms = [];
    const box = root.querySelector('#mpRooms');
    const draw = () => {
      if (!box.isConnected) return stopMpRefresh();
      // how many divers are online right now (in all open rooms)
      const online = rooms.reduce((n, r) => n + (r.unreachable ? 0 : Number(r.players) || 0), 0);
      const on = root.querySelector('#mpOnline');
      if (on) on.textContent = `🟢 ${t('mpOnlineN', { n: online })}`;
      box.innerHTML = rooms.length
        ? rooms
            .map((r) => {
              if (r.unreachable) {
                return `<div class="room unreach"><div><b>📡 ${t('mpUnreachTitle')} · ${escapeHtml(r.code)}</b>
                <small>⚠ ${t('mpUnreachable')}</small></div><button class="btn small secondary" data-code="${escapeHtml(r.code)}">${t('mpTry')}</button></div>`;
              }
              const lv = levelById(r.level);
              return `<div class="room"><div><b>${r.mode === 'race' ? '🏁' : '🤝'} ${escapeHtml(lv ? L(lv.name) : r.level || '')}</b>
                <small>${escapeHtml(r.host || '?')} · 👥 ${r.players || 1}/4 · <span class="rstatus ${r.status === 'running' ? 'run' : ''}">${roomStatusText(r)}</span></small></div>
                <button class="btn small" data-code="${escapeHtml(r.code)}" ${roomJoinable(r) ? '' : 'disabled'}>${t('mpJoin')}</button></div>`;
            })
            .join('')
        : `<div class="hint">${t('mpNoRooms')}</div>`;
      box.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => joinRoomCode(b.dataset.code, hint)));
    };
    let inflight = null;
    const refresh = () => {
      if (!box.isConnected) return Promise.resolve();
      if (inflight) return inflight; // a scan is already running: wait for it
      inflight = (async () => {
        let first = true;
        try {
          // rooms show up as soon as they answer
          rooms = await net.listRooms((r, all) => {
            if (first) rooms = [];
            first = false;
            rooms = [...all];
            draw();
            if (wantQuick) {
              const pick = pickRoom(rooms);
              if (pick) {
                wantQuick = false;
                joinRoomCode(pick.code, hint);
              }
            }
          });
        } catch (e) {
          rooms = [];
        }
        rooms.sort((a, b) => !!a.unreachable - !!b.unreachable || (a.status === 'running') - (b.status === 'running') || b.players - a.players);
        draw();
      })().finally(() => (inflight = null));
      return inflight;
    };
    root.querySelector('#mpRefresh').onclick = refresh;
    let wantQuick = false;
    root.querySelector('#mpQuick').onclick = async () => {
      const now = pickRoom(rooms);
      if (now) return joinRoomCode(now.code, hint);
      hint.textContent = t('mpSearching');
      wantQuick = true;
      await refresh();
      if (!wantQuick) return; // already joined a room that answered during the scan
      wantQuick = false;
      const r = pickRoom(rooms);
      if (r) joinRoomCode(r.code, hint);
      else create('coop', selLevel);
    };
    refresh();
    runConnCheck(root);
    stopMpRefresh();
    // keep the list fresh while the window is open (countdowns tick every second)
    let n = 0;
    mpRefreshTimer = setInterval(() => {
      if (!box.isConnected) return stopMpRefresh();
      if (++n % 8 === 0) refresh();
      else draw();
    }, 1000);
  });
}

async function joinRoomCode(code, hintEl) {
  if (hintEl) hintEl.textContent = t('mpConnecting');
  else toast(t('mpConnecting'));
  try {
    stopMpRefresh();
    await net.joinRoom(code, { name: profile.name, sub: profile.sub });
    openLobby(true);
  } catch (e) {
    const msg = e.message === 'notfound' ? t('mpNotFound') : e.message === 'full' ? t('mpFull') : e.message === 'noconn' ? t('mpNoReach') : e.message === 'p2p' || e.message === 'timeout' ? t('mpNoConn') : String(e.message || e);
    if (hintEl) hintEl.textContent = msg;
    else toast(msg);
  }
}
const joinByCode = joinRoomCode; // ?room= links still work

// ---- connection check (multiplayer window) ----
async function runConnCheck(root) {
  const el = root.querySelector('#mpDiag');
  if (!el) return;
  const r = await net.checkConnection();
  if (!el.isConnected) return;
  const mark = (v) => (v === true ? '<i class="ok">✓</i>' : v === false ? '<i class="bad">✗</i>' : '<i>–</i>');
  let note = '';
  if (!r.webrtc) note = t('mpDiagNoWebrtc');
  else if (r.server === false) note = t('mpDiagNoServer');
  else if (r.direct === false) note = t('mpDiagNoDirect');
  else if (r.server) note = t('mpDiagFallback');
  el.innerHTML = `<b>${t('mpDiag')}:</b> ${t('mpDiagServer')} ${mark(r.server)} · ${t('mpDiagDirect')} ${mark(r.direct)}${note ? `<div class="mpdiag-note">${note}</div>` : ''}`;
}

// ---- keep the screen on while in a room (a sleeping phone drops its connection and the host's room vanishes) ----
let wakeLock = null, wakeWanted = false;
async function keepAwake(on) {
  wakeWanted = on;
  try {
    if (on && !wakeLock && navigator.wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) {
      const w = wakeLock;
      wakeLock = null;
      await w.release();
    }
  } catch (e) {
    /* not supported or not allowed */
  }
}
document.addEventListener('visibilitychange', () => {
  if (wakeWanted && document.visibilityState === 'visible') keepAwake(true);
});

// ---- two divers who both pressed "Play now" at the same moment end up in two empty rooms:
// a host who is still alone looks for another waiting room now and then and moves over (the room with
// the alphabetically smaller code wins, so only one of the two moves) ----
let lobbyOpenedAt = 0, mergeBusy = false, mergeNext = 0;
async function maybeMergeLobby() {
  if (mergeBusy || !['p2p', 'lk'].includes(net.mode) || !lobbyOpen || game || !net.room || !net.isHost()) return;
  const meta = net.room.meta || {};
  if (meta.status !== 'lobby' || Object.keys(net.room.players || {}).length > 1) return;
  const now = Date.now();
  if (now < mergeNext || now - lobbyOpenedAt < 2500) return;
  mergeBusy = true;
  mergeNext = now + 9000;
  try {
    const own = net.room.code;
    const rooms = await net.listRooms();
    if (!lobbyOpen || game || !net.room || net.room.code !== own || Object.keys(net.room.players || {}).length > 1) return;
    const other = rooms
      .filter((r) => !r.unreachable && r.status === 'lobby' && roomJoinable(r) && r.code < own && (r.mode === 'race') === (meta.mode === 'race'))
      .sort((a, b) => b.players - a.players)[0];
    if (other) {
      closeLobby();
      leaveRoomAll();
      toast(t('mpMerged'));
      await joinRoomCode(other.code, null);
    }
  } catch (e) {
    /* ignore */
  } finally {
    mergeBusy = false;
  }
}

function closeLobby() {
  lobbyOpen = false;
  clearInterval(lobbyTimer);
  lobbyTimer = null;
}

function openLobby(autoJoin = false) {
  lobbyOpen = true;
  keepAwake(true);
  lobbyOpenedAt = Date.now();
  net.on('meta', onRoomMeta);
  net.on('players', onRoomPlayers);
  net.on('event', (ev) => (ev.type === 'radio' ? onQuickCall(ev) : game && game.onNetEvent(ev)));
  createRadio();
  net.on('closed', (reason) => {
    // the host has surfaced and left during a team dive: the others keep diving together
    if (reason === 'host' && game && game.multi && !game.ended && net.room) {
      toast(t('mpHostLeftDive'));
      return;
    }
    closeLobby();
    leaveRoomAll();
    toast(t(reason === 'lost' ? 'mpLost' : 'mpHostLeft'));
    if (!game) closeModal();
  });
  net.on('conn', onRoomConn);
  history.replaceState(null, '', location.pathname);
  // back in the room after a dive, but the host has gone in the meantime
  const st = net.room && net.room.meta && net.room.meta.status;
  if (net.room && net.room.isLk && !net.isHost() && !net.hostPresent() && !(autoJoin && st === 'running')) {
    closeLobby();
    leaveRoomAll();
    toast(t('mpHostLeft'));
    closeModal();
    return;
  }
  // joining a room whose dive is already running: jump straight in
  if (autoJoin && net.room && net.room.meta && net.room.meta.status === 'running') return joinRunningDive();
  renderLobby();
  clearInterval(lobbyTimer);
  // countdown display + automatic start by the host
  lobbyTimer = setInterval(() => {
    if (!lobbyOpen || !net.room || game) return;
    const meta = net.room.meta || {};
    const el = $('#lbCountdown');
    if (meta.status === 'running') return;
    const left = (meta.autoStartAt || 0) - net.now();
    if (el) el.textContent = fmtCountdown(left);
    const bar = $('#lbBar');
    if (bar) bar.style.width = `${clamp(1 - left / LOBBY_WAIT, 0, 1) * 100}%`;
    if (net.isHost() && meta.autoStartAt && left <= 0 && !lobbyStarting) {
      lobbyStarting = true;
      net.startRoom({ seed: Math.floor(Math.random() * 1e9) });
    }
    maybeMergeLobby();
  }, 500);
}

function joinRunningDive() {
  const meta = net.room && net.room.meta;
  if (!meta || meta.status !== 'running' || game) return;
  closeLobby();
  closeModal();
  startDive({
    level: levelById(meta.level),
    mode: meta.mode === 'race' ? 'race' : 'expedition',
    seed: meta.seed,
    multi: { coop: meta.mode !== 'race', startAt: meta.startAt },
  });
}

function renderLobby() {
  if (!net.room || game) return;
  const meta = net.room.meta || {};
  const host = net.isHost();
  const players = Object.entries(net.room.players || {});
  const plist = players.map(([u, p]) => `<div><i style="background:${hexColor(colorFor(u, net.room.players))}"></i>${escapeHtml(p.name || '?')} <small style="color:var(--ink-soft)">${escapeHtml(L(subModelById(p.sub).name))}</small>${meta.host === u ? ` <small style="color:var(--ink-soft)">(${t('mpHost')})</small>` : ''}${u === net.uid ? ' ←' : radio && radio.enabled ? ` <button class="mute" data-mute="${escapeHtml(u)}">${radio.mutedUids.has(u) ? '🔇' : '🔊'}</button>` : ''}</div>`).join('');
  const radioBox = radio
    ? `<div class="radio-box"><div class="radio-row">${voiceAllowed() ? `<button class="radio-ptt" id="lbPtt"><span>🎙</span><small>${t('radioHold')}</small></button><button class="btn small secondary" id="lbRadioToggle">${radio.enabled ? '📻 ' + t('radioOn') : '🔇 ' + t('radioOff')}</button>` : `<span class="hint" style="color:var(--ink-soft)">${t('radioKids')}</span>`}<span class="radio-who"></span></div>
       <div class="qcs">${quickCallsHtml()}</div></div>`
    : '';
  const levelOpts = LEVELS.map((l) => `<option value="${l.id}" ${l.id === meta.level ? 'selected' : ''}>${escapeHtml(L(l.name))} (${fmtNum(l.maxDepth)} m)</option>`).join('');
  const lv = levelById(meta.level);
  const running = meta.status === 'running';
  const left = (meta.autoStartAt || 0) - net.now();
  showModal(`<h1>${meta.mode === 'race' ? '🏁 ' + t('mpRace') : '🤝 ' + t('mpCoop')} · ${escapeHtml(L(lv.name))}</h1>
    ${running
      ? `<div class="lobby-wait"><b>${t('mpRunningInfo')}</b></div>`
      : `<div class="lobby-wait"><div><span class="dots">${t('mpWaiting')}</span><span class="lb-count">${t('mpStartsIn', { t: `<b id="lbCountdown">${fmtCountdown(left)}</b>` })}</span></div>
         <div class="lb-bar"><div id="lbBar" style="width:${clamp(1 - left / LOBBY_WAIT, 0, 1) * 100}%"></div></div></div>`}
    <p style="font-size:13px;color:#1d1d1d">${t('mpLobbyNote')}</p>
    ${host && ['p2p', 'lk'].includes(net.mode) ? `<p class="mp-keep">📱 ${t('mpHostKeep')}</p>` : ''}
    ${host && !running ? `<div class="field"><div class="seg" id="lbMode"><button data-m="coop" class="${meta.mode !== 'race' ? 'on' : ''}">${t('mpCoop')}</button><button data-m="race" class="${meta.mode === 'race' ? 'on' : ''}">${t('mpRace')}</button></div></div><div class="field"><select id="lbLevelSel">${levelOpts}</select></div>` : ''}
    <h2>${t('mpPlayers')} (${players.length}/4)</h2><div class="players">${plist}</div>
    ${radioBox}
    <div class="row-end">
      <button class="btn secondary" id="lbLeave">${t('mpLeave')}</button>
      ${running ? `<button class="btn big" id="lbJoinRun">⚡ ${t('mpJoinRunning')}</button>` : host ? `<button class="btn secondary" id="lbMore">${t('mpWaitMore')}</button><button class="btn big" id="lbStart">${t('mpStartNow')}</button>` : `<span style="color:var(--ink-soft)">${t('mpAutoStart')}</span>`}
    </div>`, (root) => {
    root.querySelector('#lbLeave').onclick = () => {
      closeLobby();
      leaveRoomAll();
      closeModal();
    };
    if (radio) {
      bindPtt(root.querySelector('#lbPtt'));
      bindQuickCalls(root);
      const rt = root.querySelector('#lbRadioToggle');
      if (rt) rt.onclick = () => {
        radio.setEnabled(!radio.enabled);
        renderLobby();
      };
      root.querySelectorAll('[data-mute]').forEach((b) => (b.onclick = () => {
        radio.toggleMute(b.dataset.mute);
        renderLobby();
      }));
      updateRadioUi();
    }
    if (running) root.querySelector('#lbJoinRun').onclick = joinRunningDive;
    else if (host) {
      root.querySelectorAll('#lbMode button').forEach((b) => (b.onclick = () => net.updateMeta({ mode: b.dataset.m })));
      root.querySelector('#lbLevelSel').onchange = (e) => net.updateMeta({ level: e.target.value });
      root.querySelector('#lbStart').onclick = () => net.startRoom({ seed: Math.floor(Math.random() * 1e9) });
      root.querySelector('#lbMore').onclick = () => net.updateMeta({ autoStartAt: Math.max(meta.autoStartAt || 0, net.now()) + 30000 });
    }
  });
}

function onRoomMeta(meta) {
  if (!meta) return;
  if (meta.status === 'running' && !game && lobbyOpen) joinRunningDive();
  else if (lobbyOpen && !game) {
    lobbyStarting = false;
    renderLobby();
  }
}

// connection wobbles (mobile network): say so only if it lasts a moment, and when it is back
let connTimer = null;
let connWarned = false;
function onRoomConn(state) {
  clearTimeout(connTimer);
  if (state === 'reconnecting') {
    connTimer = setTimeout(() => {
      connWarned = true;
      toast('📡 ' + t('mpReconnecting'));
    }, 2500);
  } else if (state === 'ok' && connWarned) {
    connWarned = false;
    toast('📡 ' + t('mpReconnected'));
  }
  if (game && net.room) game.renderTeam(net.room.players);
}

let crewSig = '';
function onRoomPlayers(players) {
  if (radio) radio.sync(players);
  updateRadioUi();
  const sig = Object.entries(players || {}).map(([u, p]) => `${u}:${p.name}:${p.sub}`).sort().join('|');
  const crewChanged = sig !== crewSig;
  crewSig = sig;
  if (game) game.syncPlayers(players);
  else if (lobbyOpen && crewChanged) {
    // somebody new arrived shortly before the start: give them a few seconds
    const meta = net.room && net.room.meta;
    if (net.isHost() && meta && meta.status === 'lobby' && meta.autoStartAt && meta.autoStartAt - net.now() < 10000 && Object.keys(players || {}).length > 1) {
      net.updateMeta({ autoStartAt: net.now() + 10000 });
    }
    renderLobby();
  }
  if (resultsRace) renderRaceStandings();
}

// a mission's identity (the same on every device of a team dive)
const missionKey = (m) => [m.type, m.arg || '', m.n || '', m.d || '', m.p || ''].join(':');

// ======================= the dive =======================
const ZERO_INPUT = { throttle: 0, turn: 0, vertical: 0, boost: false };

// ---------- collision helpers ----------
const NO_COLLIDE = new Set(['trieste', 'seep']); // hologram marker, flat bacteria mat
const METAL = new Set(['lander', 'sediment', 'litter', 'toaster']);
const CA1 = new THREE.Vector3(), CB1 = new THREE.Vector3(), CA2 = new THREE.Vector3(), CB2 = new THREE.Vector3();
const CC1 = new THREE.Vector3(), CC2 = new THREE.Vector3(), CN = new THREE.Vector3(), CP = new THREE.Vector3();
const _hp = new THREE.Vector3();
// How far (and where) a point with radius r has to move to get out of the ship's hull (ship-local coordinates).
function hullPush(H, x, y, z, r) {
  if (z < H.zb - r || z > H.zs + r) return null;
  const zc = clamp(z, H.zb, H.zs);
  const beam = H.beam(zc), keel = H.keel(zc);
  if (Math.abs(x) > beam + r || y < keel - r) return null;
  const down = y - (keel - r);
  const side = beam + r - Math.abs(x);
  const aft = H.zs + r - z, fore = z - (H.zb - r);
  const m = Math.min(down, side, aft, fore);
  if (m <= 0) return null;
  if (m === down) return _hp.set(0, -down, 0);
  if (m === side) return _hp.set(Math.sign(x || 1) * side, 0, 0);
  if (m === aft) return _hp.set(0, 0, aft);
  return _hp.set(0, 0, -fore);
}

class Dive {
  constructor({ level, mode, seed, multi }) {
    this.level = level;
    this.mode = mode;
    this.multi = multi || null;
    this.seed = seed;
    this.scene = new THREE.Scene();
    this.world = new World(this.scene, level);
    const model = subModelById(profile.sub).id;
    const myColor = model !== 'hummel' ? null : this.multi && net.room ? colorFor(net.uid, net.room.players) : PLAYER_COLORS[0];
    this.sub = new Sub(this.scene, this.world, profile.upgrades, myColor, model);
    const sp = this.world.shipPos;
    let slot = 0;
    if (this.multi && net.room) {
      const order = Object.entries(net.room.players || {}).sort((a, b) => (a[1].joined || 0) - (b[1].joined || 0)).map(([u]) => u);
      slot = Math.max(0, order.indexOf(net.uid));
    }
    this.sub.pos.set(sp.x + 6 - (slot % 2) * 7, -2, sp.z + (slot - 1.5) * 9 * (this.multi ? 1 : 0));
    this.sub.yaw = -Math.PI / 2;
    this.cm = new CreatureManager(this.scene, this.world, level, seed);
    this.schools = new FishSchools(this.scene, this.world, seed);
    this.fx = [];
    this.orbit = { yaw: 0, pitch: 0, zoom: 0, last: -10 };
    this.rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    this.race = mode === 'race';
    this.hullRating = this.race ? 99999 : HULL_RATINGS[profile.upgrades.hull];
    this.batteryCap = [1, 1.25, 1.5][profile.upgrades.battery];
    this.sonarRadius = [110, 160, 220][profile.upgrades.sonar];
    this.energy = 100;
    this.hull = 100;
    this.life = 100;
    this.time = 0;
    this.sonarCooldown = 0;
    this.photographed = new Set();
    this.myPh = []; // my own photos (shared with the team as player field ph)
    this.myCol = []; // my own finds [item id, kind] (player field col)
    this.teamCol = new Set(); // finds of teammates already counted
    this.found = [];
    this.realCount = 0;
    this.fantasyCount = 0;
    this.nodules = 0;
    this.litter = 0;
    this.sediments = 0;
    this.landerFound = false;
    this.atDeepest = false;
    this.maxDepth = 0;
    this.zones = new Set(['zone_sun']);
    this.flags = {};
    this.ending = null;
    this.ended = false;
    this.paused = false;
    // Christmas special: Santa swims by in every dive of the season (and whenever the secret code calls him)
    this.santaNext = xmasSeason() || /[?&]xmas=1/.test(location.search) ? 18 : Infinity;
    this.missions = this.race ? [] : makeMissions(level, this.cm, this.rng);
    this.beacon = this.race ? null : new DeepBeacon(this.scene, this.cm.deepest);
    // a sunken warship and a crashed plane near the deep end, with treasures inside
    if (!this.race) {
      try {
        this.wrecks = new Wrecks(this.scene, this.world, this.seed, 5);
      } catch (e) {
        console.warn('wrecks failed', e);
      }
    }
    // team challenges: only in co-op dives (they need two divers)
    if (this.multi && this.multi.coop && !this.race) {
      try {
        this.team = new TeamChallenges(this.scene, this.world, this.seed);
      } catch (e) {
        console.warn('team challenges failed', e);
      }
    }
    this.mapView = new MapView(this);
    this.camPos = this.sub.pos.clone().add(new THREE.Vector3(10, 3.5, 0));
    this.shake = 0;
    this.nextQuake = 60 + this.rng() * 60;
    this.remote = new Map();
    this.netTimer = 0;
    this.hudTimer = 0;
    this.contacts = [];
    this.lastHit = -10;
    this.lastCreak = 0;
    this.target = null;
    this.grabTarget = null;
    this.contactEls = [];
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('div');
      d.className = 'contact';
      d.style.display = 'none';
      $('#hud').appendChild(d);
      this.contactEls.push(d);
    }
    if (this.race) this.setupRace();
    this.setupHud();
    audio.startLoops();
    audio.setFinMode(this.sub.group.userData.type === 'isabella');
    // launch from the ship: winch, chains, splash
    this.hooks = {
      winch: (on) => audio.winch(on),
      splash: () => audio.splash(),
      release: () => audio.clunk(),
      underwater: () => {
        diveFx();
        audio.underwater();
        this.world.bubbleBurst(this.sub.pos.clone().add(new THREE.Vector3(0, 1, 0)), 120, 3.5);
      },
      done: () => {
        this.camPos.copy(camera.position);
        $('#skipHint').classList.add('hidden');
        echoSay(line(this.race ? 'raceStart' : isTouch ? 'diveStartTouch' : 'diveStart'), { now: true });
      },
    };
    this.launch = new Launch(this, { short: this.race });
    $('#skipHint').textContent = t(isTouch ? 'skipTouch' : 'skipKey');
    $('#skipHint').classList.remove('hidden');
    echoSay(L({ en: 'Hold on tight – the winch is lowering us into the sea!', de: 'Gut festhalten – die Winde lässt uns ins Meer hinunter!' }), { now: true });
    if (isTouch && window.innerHeight > window.innerWidth) {
      const h = document.createElement('div');
      h.id = 'rotateHint';
      h.textContent = L({ en: '📱↻ Turn your phone sideways for the best view', de: '📱↻ Dreh dein Handy quer für die beste Sicht' });
      $('#hud').appendChild(h);
      setTimeout(() => h.remove(), 5200);
    }
    toast(L(level.name), L(level.ocean));
    if (this.multi && net.room) {
      // team data belongs to this dive (dv = its seed): nothing from an earlier dive in the same room counts
      net.setPlayer({ dv: seed, md: [], ph: [], col: [], atl: null, finish: null, done: false, ins: 0, xm: 0, chd: [] });
      this.syncPlayers(net.room.players);
    }
  }

  // ---------- race ----------
  setupRace() {
    const W = this.world;
    const deep = this.cm.deepest;
    const N = 14;
    this.rings = [];
    const start = this.world.shipPos;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const x = start.x + 25 + (deep.x - start.x - 25) * (0.5 - 0.5 * Math.cos(f * Math.PI));
      const z = axisZ(x) + Math.sin(f * Math.PI * 3) * 22;
      let y = -25 + (deep.y + 7 + 25) * Math.pow(f, 0.9);
      const fy = W.heightAt(x, z) + 9;
      if (y < fy) y = fy;
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(7, 0.35, 8, 40), new THREE.MeshBasicMaterial({ color: 0x38e8ff, transparent: true, opacity: 0.35, fog: false }));
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.rings.push(mesh);
    }
    for (let i = 0; i < N; i++) {
      const a = this.rings[i].position;
      const b = i + 1 < N ? this.rings[i + 1].position : a.clone().add(new THREE.Vector3(1, 0, 0));
      const prev = i > 0 ? this.rings[i - 1].position : start;
      const dir = b.clone().sub(prev).normalize();
      this.rings[i].lookAt(a.clone().add(dir));
    }
    this.ringIndex = 0;
    this.raceStartLocal = this.multi && this.multi.startAt ? this.multi.startAt - net.offset : Date.now() + 8200;
    if (this.raceStartLocal < Date.now() + 1500) {
      // joined a race that is already under way: your own clock starts after your launch
      this.raceStartLocal = Date.now() + 8200;
      setTimeout(() => echoSay(t('raceLateStart'), { now: true }), 1200);
    }
    this.raceFinished = null;
    $('#race').classList.remove('hidden');
    this.highlightRing();
  }

  highlightRing() {
    this.rings.forEach((r, i) => {
      r.material.opacity = i === this.ringIndex ? 0.95 : i < this.ringIndex ? 0.08 : 0.3;
      r.material.color.set(i === this.ringIndex ? 0x7dffe9 : 0x38e8ff);
    });
  }

  setupHud() {
    $('#hud').classList.remove('hidden');
    $('#missions').classList.toggle('hidden', this.race);
    $('#hudTR').classList.toggle('hidden', this.race);
    $('#race').classList.toggle('hidden', !this.race);
    $('#team').classList.toggle('hidden', !this.multi);
    $('#radar').classList.remove('hidden');
    $('#lEnergy').textContent = t('energy');
    $('#lHull').textContent = t('hull');
    $('#lLife').textContent = t('life');
    $('#tLight').textContent = t('btnLight');
    $('#tSonar').textContent = t('btnSonar');
    $('#tPhoto').textContent = t('btnPhoto');
    $('#tGrab').textContent = t('btnGrab');
    $('#tAsk').textContent = t('btnAsk');
    $('#tSurface').textContent = t('btnSurface');
    $('#tBoost').textContent = t('btnBoost');
    $('#bBoost').classList.remove('on');
    $('#tUp').textContent = t('btnUp');
    $('#tDown').textContent = t('btnDown');
    $('#keysHint').textContent = t('keysHint');
    $('#map .map-title').textContent = t('mapTitle');
    $('#map .map-lg').textContent = t('mapLegend', { d: fmtNum(this.level.maxDepth) });
    updateSoundBtn();
    $('#bLight').classList.add('on');
    const gmax = this.level.maxDepth;
    $('#gaugeHull').style.display = !this.race && this.hullRating < gmax ? 'block' : 'none';
    $('#gaugeHull').style.top = `${(this.hullRating / gmax) * 100}%`;
    this.renderMissions();
  }

  renderMissions() {
    if (this.race) return;
    $('#missionsList').innerHTML = `<div class="mtitle">${t('missions')}</div>` +
      this.missions.map((m) => `<div class="m ${m.done ? 'done' : ''}"><span class="box"></span><span>${escapeHtml(missionText(m))}${m.byTeam ? ` <small class="by">· ${escapeHtml(m.byTeam)}</small>` : ''}</span></div>`).join('') +
      (this.team ? `<div class="m team-ch ${this.team.doneCount === CHALLENGES.length ? 'done' : ''}"><span class="box"></span><span>🤝 ${t('teamLine', { n: this.team.doneCount, total: CHALLENGES.length })}</span></div>` : '');
  }

  depth() {
    return Math.max(0, -this.sub.pos.y * SCALE);
  }

  temperature(depth) {
    const L0 = this.level;
    const k = 1 - Math.exp(-depth / 450);
    return L0.surfaceTemp + (L0.bottomTemp + 1.2 * Math.exp(-depth / 2500) - L0.surfaceTemp) * k;
  }

  canAct() {
    return !this.paused && !this.ended;
  }

  // ---------- actions ----------
  actSonar() {
    if (!this.canAct() || this.sonarCooldown > 0) return;
    this.sonarCooldown = 2.5;
    this.energy -= 2.5 / this.batteryCap;
    audio.ping();
    sonarRipple();
    const cells = this.world.startPing(this.sub.pos, this.sonarRadius);
    if (this.atlantis && this.atlantis.sonarPing()) {
      echoSay(t('hallSonarFound', { name: L(this.atlantis.secret.userData.info.name) }), { now: true });
      toast('📡 ' + t('hallSonarToast'));
      audio.discovery();
    }
    // sonar contacts
    this.contacts = [];
    for (const it of this.cm.items) {
      if (it.collected) continue;
      const d = it.group.position.distanceTo(this.sub.pos);
      if (d < this.sonarRadius && d > 6) this.contacts.push({ it, until: this.time + 9, d });
    }
    this.contacts.sort((a, b) => a.d - b.d);
    this.contacts = this.contacts.slice(0, this.contactEls.length);
    if (this.multi && this.multi.coop && cells.length) {
      const last = this.world.mappedList[this.world.mappedList.length - 1];
      net.sendEvent({ type: 'map', cells: cells.slice(0, 500), circle: last ? { x: Math.round(last.x), z: Math.round(last.z), r: Math.round(last.r) } : null });
    }
    if (!this.flags.sonarHelp && this.depth() > 300) {
      this.flags.sonarHelp = true;
    }
  }

  actBoost() {
    if (!this.canAct() || this.recovery || (this.launch && !this.launch.done)) return;
    this.boost = !this.boost;
    $('#bBoost').classList.toggle('on', this.boost);
    toast(this.boost ? `🚀 ${t('boostOn')}` : t('boostOff'));
    audio.tone(this.boost ? 220 : 520, 0.35, { type: 'sawtooth', vol: 0.08, toFreq: this.boost ? 880 : 180 });
  }

  actLight() {
    if (!this.canAct()) return;
    this.sub.setLight(!this.sub.lightOn);
    $('#bLight').classList.toggle('on', this.sub.lightOn);
    audio.click();
    if (!this.sub.lightOn && !this.flags.lightOff) {
      this.flags.lightOff = true;
      echoSay(line('lightOff'));
    }
  }

  actPhoto() {
    if (!this.canAct()) return;
    this.energy -= 0.4 / this.batteryCap;
    audio.shutter();
    flash();
    const it = this.target;
    if (!it) return;
    this.discover(it.def, {});
  }

  // Grab: the big telescopic arm reaches out, closes the claw and pulls the find into the sample basket.
  actGrab() {
    if (!this.canAct() || armBusy(this.sub.group)) return;
    const it = this.grabTarget;
    if (!it) {
      if (this.time - (this.lastGrabHint ?? -10) > 4) {
        this.lastGrabHint = this.time;
        toast(`✋ ${t('grabNothing')}`, t('grabNothingSub'));
      }
      return;
    }
    it.reserved = true;
    audio.grab();
    this.sub.grab(it.group, (claw) => {
      if (it.collected) return null;
      it.collected = true;
      claw.attach(it.group); // the find rides along while the arm retracts
      this.collectItem(it);
      return it.group;
    });
  }

  collectItem(it) {
    audio.discovery();
    this.countCollect(it.def.id);
    if (!this.photographed.has(it.def.id)) this.discover(it.def, {});
    else toast(`✋ +1 ${L(it.def.name)}`);
    if (this.multi && this.multi.coop && net.room) {
      this.myCol.push([it.id, it.def.id]);
      net.setPlayer({ col: this.myCol });
      net.sendEvent({ type: 'collect', item: it.id, kind: it.def.id, name: profile.name });
    }
  }

  // a teammate's find (from the event or from their player data – whichever comes first)
  teamCollect(id, kind) {
    if (this.teamCol.has(id) || this.myCol.some((c) => c[0] === id)) return;
    this.teamCol.add(id);
    const it = this.cm.byId(id);
    if (it && !it.collected) this.cm.remove(it);
    this.countCollect(kind);
  }

  countCollect(kind) {
    if (kind === 'nodule') this.nodules++;
    else if (kind === 'litter') this.litter++;
    else if (kind === 'lander') this.landerFound = true;
    else if (kind === 'sediment') this.sediments++;
    this.checkMissions();
  }

  actSurface() {
    if (!this.canAct() || this.ending) return;
    if (this.race && !this.raceFinished) {
      this.ending = { emergency: true, reason: 'abort', dnf: true };
      this.finish();
      return;
    }
    this.ending = { emergency: false };
    this.sub.autoAscent = true;
    echoSay(line('surfacing'), { now: true });
    audio.mission();
  }

  // from the pause menu: surface (normally or as an emergency) – works also when already on the way up
  surfaceNow(emergency) {
    if (this.ended) return;
    if (this.recovery) return this.recovery.skip();
    if (!this.ending) return emergency ? this.emergency('abort') : this.actSurface();
    if (emergency) this.ending = { emergency: true, reason: 'abort' };
    this.sub.autoAscent = true;
    if (this.atlantis && this.atlantis.inside && !this.portalBusy) this.portal('exit');
  }

  emergency(reason) {
    if (this.ending) return;
    this.ending = { emergency: true, reason };
    this.sub.autoAscent = true;
    audio.alarm();
    toast(t('emergency'), t('emergencyWhy_' + reason));
    echoSay(`${t('emergency')} ${t('emergencyWhy_' + reason)}`, { now: true });
  }

  discover(def, { team = false, by = null, quiet = false } = {}) {
    if (this.photographed.has(def.id)) {
      if (!team) toast(L(def.name), t('alreadyFound'));
      return;
    }
    this.photographed.add(def.id);
    const depth = Math.round(this.depth());
    const prev = profile.logbook[def.id];
    const isNew = !prev;
    profile.logbook[def.id] = { n: (prev?.n || 0) + 1, maxDepth: Math.max(prev?.maxDepth || 0, depth), first: prev?.first || Date.now() };
    saveProfile();
    this.found.push({ def, isNew, team, depth, pos: this.sub.pos.clone() });
    if (def.kind === 'real') this.realCount++;
    if (def.kind === 'fantasy') this.fantasyCount++;
    if (!quiet) {
      if (def.kind === 'fantasy') audio.fantasy(def.sound);
      else audio.discovery();
      if (team) toast(t('teamFound', { name: by || '?', what: L(def.name) }));
      else toast(isNew ? t('newDiscovery') : L(def.name), isNew ? L(def.name) : '');
      showCard(def, { depth, isNew, by: team ? by : null, big: !team, peek: true });
    }
    if (!team) {
      if (def.kind === 'fantasy') {
        echoSay(L({ en: 'Ha! That one is pure fantasy – but its card hides a real fact.', de: 'Ha! Das ist reine Fantasie – aber seine Karte verrät einen echten Fakt.' }));
      } else {
        const first = (L(def.fact).match(/[^.!?]+[.!?]/) || [L(def.fact)])[0];
        echoSay(`${L(def.name)}! ${first}`);
      }
      if (this.multi && this.multi.coop && net.room) {
        this.myPh.push(def.id);
        net.setPlayer({ ph: this.myPh });
        net.sendEvent({ type: 'discover', id: def.id, name: profile.name });
      }
    }
    this.checkMissions();
  }

  checkMissions() {
    if (this.race) return;
    const done = updateMissions(this.missions, {
      photographed: this.photographed,
      realCount: this.realCount,
      fantasyCount: this.fantasyCount,
      maxDepth: this.maxDepth,
      mapped: this.world.mappedPercent(),
      nodules: this.nodules,
      sediments: this.sediments,
      litter: this.litter,
      lander: this.landerFound,
      atDeepest: this.atDeepest,
    });
    for (const m of done) {
      audio.mission();
      setTimeout(() => toast(t('missionDone'), missionText(m)), 900);
    }
    if (done.length) this.publishMissions();
    this.renderMissions();
    this.afterMissions();
  }

  // Team dives: everybody has the same missions (same seed). Each diver keeps the list of finished missions in
  // the player data – the others tick them off too, also somebody who joins later.
  publishMissions() {
    if (!this.multi || !this.multi.coop || !net.room) return;
    const md = this.missions.filter((m) => m.done).map(missionKey);
    const sig = md.join(',');
    if (sig === this.mdSig) return;
    this.mdSig = sig;
    net.setPlayer({ md });
  }

  applyTeamMissions(uid, p) {
    if (this.race || !this.multi || !this.multi.coop || !Array.isArray(p.md) || !p.md.length) return;
    let any = false;
    for (const m of this.missions) {
      if (m.done || !p.md.includes(missionKey(m))) continue;
      m.done = true;
      m.byTeam = p.name || '?';
      if (m.n) m.progress = m.n;
      if (m.p) m.progress = m.p;
      any = true;
      audio.mission();
      toast(`✓ ${t('missionDone')}`, `${missionText(m)} · ${t('missionByTeam', { name: p.name || '?' })}`);
    }
    if (any) {
      this.publishMissions();
      this.renderMissions();
      this.afterMissions();
    }
  }

  // every mission done: Atlantis appears
  afterMissions() {
    if (this.race || this.atlantis || this.atlantisPending || this.ended || this.ending || !this.missions.length) return;
    if (!this.missions.every((m) => m.done)) return;
    this.atlantisPending = true;
    setTimeout(() => this.startAtlantis(), 2200);
  }

  // secret: press 1 five times – all missions done, Atlantis appears
  cheatComplete() {
    if (this.race || this.ended || this.ending) return;
    for (const m of this.missions) {
      if (m.done) continue;
      m.done = true;
      if (m.n) m.progress = m.n;
      if (m.p) m.progress = Math.max(m.progress || 0, m.p);
    }
    audio.fanfare();
    toast('✨ ' + t('cheatDone'));
    this.publishMissions();
    this.renderMissions();
    this.afterMissions();
  }

  // a short text about Atlantis first, then the city rises from the floor
  startAtlantis() {
    if (this.atlantis || this.ended || this.ending) return;
    const solo = !this.multi;
    if (solo) this.paused = true;
    showModal(`<div class="atl-intro">
      <div class="atl-badge">★ ${t('fantasy')} · ${t('atlLegend')}</div>
      <h1>🏛️ ${t('atlTitle')}</h1>
      <p>${t('atlText1')}</p>
      <p>${t('atlText2')}</p>
      <p class="atl-game">${t('atlText3')}</p>
      <div class="src">${t('source')}: <a href="https://www.gutenberg.org/ebooks/1571" target="_blank" rel="noopener">Plato, Critias (Project Gutenberg)</a> · <a href="https://www.horniman.ac.uk/story/the-legend-of-atlantis/" target="_blank" rel="noopener">Horniman Museum: The Legend of Atlantis</a> · <a href="https://www.worldatlas.com/ancient-world/did-atlantis-really-exist.html" target="_blank" rel="noopener">WorldAtlas: Did Atlantis really exist?</a></div>
      <div class="row-end"><button class="btn big" id="atlGo">🏛️ ${t('atlGo')}</button></div>
    </div>`, (root) => {
      root.querySelector('#atlGo').onclick = () => {
        closeModal();
        if (solo && !this.ended) this.paused = false;
        input.enabled = !this.ended;
        this.raiseAtlantis();
      };
    }, 'glass atl');
    input.enabled = false;
  }

  raiseAtlantis() {
    if (this.atlantis || this.ended) return;
    const spot = this.teamAtl || atlantisSpot(this.world, this.sub);
    const box = new THREE.Box3(), beam = this.sub.group.userData.beam;
    this.sub.group.updateMatrixWorld(true);
    const toLocal = this.sub.group.matrixWorld.clone().invert(); // length along the sub's own axis
    this.sub.group.traverse((o) => {
      let skip = !o.isMesh || o.isSprite;
      for (let q = o; q && !skip; q = q.parent) if (q === beam) skip = true;
      if (skip) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(toLocal)); // this mesh only (the beam hangs below a lamp)
    });
    const sz = box.isEmpty() ? new THREE.Vector3(3, 1, 3) : box.getSize(new THREE.Vector3());
    this.atlantis = new Atlantis(this.scene, this.world, spot, (this.seed ^ 0xa71a) >>> 0, this.level.id, { subLen: clamp(sz.z, 2, 7) });
    this.atlantisAt = this.time;
    if (this.multi && this.multi.coop && net.room) net.setPlayer({ atl: [Math.round(spot.x), Math.round(spot.z)] });
    this.energy = this.hull = this.life = 100;
    this.flags.lowEnergy = false;
    audio.fanfare();
    diveFx();
    echoSay(t('atlWelcome'), { now: true });
    toast(`🏛️ Atlantis · ${L(this.atlantis.theme.name)}`, t('atlToast'));
  }

  // swim through the secret door (or back out): a short flash, then the other side
  portal(kind, near = false) {
    if (this.portalBusy || !this.atlantis) return;
    this.portalBusy = true;
    const fx = $('#portalFx');
    fx.classList.add('on');
    audio.discovery();
    setTimeout(() => {
      const A = this.atlantis;
      if (!A || this.ended) {
        fx.classList.remove('on');
        this.portalBusy = false;
        return;
      }
      if (kind === 'enter') A.enter(this.sub, near);
      else A.exit(this.sub);
      // the camera jumps straight behind the sub (no sweep through the walls)
      const back = new THREE.Vector3(Math.sin(this.sub.yaw), 0, Math.cos(this.sub.yaw));
      this.camPos.copy(this.sub.pos).addScaledVector(back, 10).add(new THREE.Vector3(0, 3.5, 0));
      this.orbit.yaw = this.orbit.pitch = 0;
      A.clampCam(this.camPos);
      if (this.multi && net.room) net.setPlayer({ ins: kind === 'enter' ? 1 : 0 });
      if (kind === 'enter') {
        this.fableTalk = { i: 0, t: 0, pause: 1.2, shown: -1, legend: !A.legendRead, legendT: 0 };
        toast(`✨ ${L(A.fable.info.name)}`, t('fableHere'));
        audio.fanfare();
      } else {
        this.fableTalk = null;
        A.talking = false;
      }
      setTimeout(() => {
        fx.classList.remove('on');
        this.portalBusy = false;
      }, 450);
    }, 380);
  }

  // secret: in Atlantis the code again backwards – straight to the creature
  goFable() {
    if (!this.atlantis || this.ended || this.ending) return;
    if (!this.atlantis.inside) this.portal('enter', true);
  }

  // the hidden hall: treasures, the crew and the sonar secret
  updateHall(dt) {
    const A = this.atlantis, el = $('#hallCount');
    if (!A || !A.inside || this.ended || !A.loot) {
      el.classList.add('hidden');
      return;
    }
    for (const ev of A.takeEvents()) {
      if (ev.type === 'loot') {
        audio.coin();
        if (ev.n === ev.total) {
          toast('💰 ' + t('hallAllLoot'));
          audio.fanfare();
        }
      } else if (ev.type === 'crew') {
        audio.giggle();
        if (ev.n === 1) echoSay(A.levelId === 'southsandwich' ? t('hallCrewFirst') : t('hallSwarmFirst', { name: L(A.extras.name), n: ev.total }), { now: true });
        if (ev.n === ev.total) {
          toast(`${A.extras.icon} ` + (A.levelId === 'southsandwich' ? t('hallAllCrew') : t('hallAllSwarm', { name: L(A.extras.name), n: ev.total })));
          audio.fanfare();
        }
      } else if (ev.type === 'secret') {
        audio.fanfare();
        toast('✨ ' + L(ev.name), t('hallSecretGot'));
        echoSay(t('hallSecretSay', { name: L(ev.name) }), { now: true });
      }
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
    this.hallTime = (this.hallTime || 0) + dt;
    if (!this.hallHint1 && this.hallTime > 9) {
      this.hallHint1 = true;
      echoSay(A.extras ? t('hallLootHintSwarm', { name: L(A.extras.name) }) : t('hallLootHint'), { now: true });
    }
    if (!this.hallHint2 && this.hallTime > 30 && !A.secret.visible && !A.secretFound) {
      this.hallHint2 = true;
      echoSay(t('hallSonarHint'), { now: true });
    }
    const html = `💰 <b>${A.lootTaken}</b>/${A.loot.length}${A.extras ? ` · ${A.extras.icon} <b>${A.crewCaught}</b>/${A.extras.total}` : ''} · 📡 ${A.secretFound ? '✨' : '?'}`;
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.remove('hidden');
  }

  // the creature speaks in yellow bubbles, sentence by sentence (tap a bubble for the next one)
  updateFable(dt) {
    const el = $('#fableBubble'), A = this.atlantis, ft = this.fableTalk;
    if (!ft || !A || !A.inside || this.ended) {
      el.classList.add('hidden');
      return;
    }
    if (this.paused) return;
    // first the legend of the creature, beside it – until it is tapped away; then it starts to speak
    if (ft.legend) {
      A.talking = false;
      ft.legendT += dt;
      if (ft.shown !== 'legend') {
        el.querySelector('.fb-who').textContent = `📜 ${t('fableLegend')} · ${L(A.fable.info.name)}`;
        el.querySelector('.fb-text').innerHTML = `${escapeHtml(L(A.fable.info.legend))}<span class="fb-hint">▶ ${t('fableLegendGo')}</span>`;
        el.classList.add('legend');
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
        ft.shown = 'legend';
        el.onclick = () => {
          ft.legend = false;
          A.legendRead = true;
          if (FLYERS[A.levelId]) setTimeout(() => echoSay(L(FLYERS[A.levelId].info), { now: true }), 1500);
          ft.pause = 0.7;
          ft.shown = -1;
          el.classList.remove('legend');
          audio.click();
        };
      }
      if (ft.legendT > 75) return el.onclick();
      // beside the creature: big screens on the left half (below the missions), small screens at the top
      const W = window.innerWidth, H = window.innerHeight, bw = el.offsetWidth, bh = el.offsetHeight;
      el.classList.remove('side-l', 'side-r', 'hidden');
      el.classList.add('notail');
      const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge')) || 0;
      if (W >= 900 && H >= 560) {
        el.style.left = `${edge + 14}px`;
        el.style.top = `${clamp(H * 0.5 - bh * 0.35, 262, Math.max(262, H - bh - 120))}px`;
      } else {
        el.style.left = `${Math.max(8, (W - bw) / 2)}px`;
        el.style.top = `${isTouch ? 8 : 70}px`;
      }
      return;
    }
    const lines = FABLE_SPEECH[getLang()] || FABLE_SPEECH.en;
    if (ft.pause > 0) {
      ft.pause -= dt;
      A.talking = false;
      el.classList.add('hidden');
      return;
    }
    if (ft.shown !== ft.i) {
      const name = (profile.name || '').trim();
      el.querySelector('.fb-text').textContent = lines[ft.i].replace('{name}', name ? ' ' + name : '');
      el.querySelector('.fb-who').textContent = L(A.fable.info.name);
      ft.dur = 2.4 + el.querySelector('.fb-text').textContent.length * 0.055;
      ft.shown = ft.i;
      ft.t = 0;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
      el.onclick = () => (ft.t = Math.max(ft.t, ft.dur));
    }
    ft.t += dt;
    A.talking = ft.t < ft.dur - 0.6;
    if (ft.t >= ft.dur) {
      ft.i++;
      if (ft.i >= lines.length) {
        ft.i = 0;
        ft.pause = 10; // then the secret once more
      }
      return;
    }
    // next to the creature's mouth
    placeBubble(el, A.fable.mouth.getWorldPosition(new THREE.Vector3()), A.fable.extent * 0.14);
  }

  // ---------- team challenges (co-op) ----------
  updateTeam(dt) {
    const subs = [{ pos: this.sub.pos }];
    for (const r of this.remote.values()) if (r.initialized && r.group.visible && this.sameDive(r.data || {})) subs.push({ pos: r.group.position });
    this.team.update(dt, this.time, subs);
    for (const ev of this.team.takeEvents()) {
      const C = CHALLENGES.find((c) => c.id === ev.id);
      if (!C) continue;
      if (ev.type === 'near') echoSay(t('teamNear', { name: L(C.name) }), { now: true });
      else if (ev.type === 'alone') toast('✋ ' + t('teamAlone'));
      else if (ev.type === 'holding') toast('🤝 ' + t('teamHolding'));
      else if (ev.type === 'done') {
        audio.fanfare();
        toast(`🤝 ${L(C.done)}`, t('teamDoneSub', { n: this.team.doneCount, total: CHALLENGES.length }));
        echoSay(L(C.done), { now: true });
        if (!ev.team && this.multi && net.room) net.sendEvent({ type: 'chdone', id: ev.id });
        if (this.multi && net.room) net.setPlayer({ chd: this.team.list.filter((c) => c.done).map((c) => c.C.id) });
        this.renderMissions();
      }
    }
  }

  // ---------- Christmas special ----------
  // Santa comes (code = true: called with the secret code, which also dresses up your own sub)
  summonSanta(code = false) {
    if (this.ended || this.race) return;
    if (code && !this.xmasDeco) {
      this.xmasDeco = decorateSub(this.sub.group);
      if (this.multi) net.setPlayer({ xm: 1 });
      toast('🎄 ' + t('santaSub'));
    }
    if (this.santaVisit) {
      this.santaVisit.t = Math.min(this.santaVisit.t, 6); // he is here already: stays a little longer
      this.santaVisit.say = 0;
      return;
    }
    this.santaVisit = { t: 0, dur: 52, a: Math.atan2(-Math.cos(this.sub.yaw), -Math.sin(this.sub.yaw)) + 0.6, say: 1.5, said: 0, code };
    this.santaWait = code;
  }

  updateSanta(dt) {
    if (this.xmasDeco) this.xmasDeco.update(this.time);
    for (const r of this.remote.values()) {
      if (r.data && r.data.xm && !r.xmas) r.xmas = decorateSub(r.group);
      if (r.xmas) r.xmas.update(this.time);
    }
    const el = $('#santaBubble');
    const away = this.ended || (this.launch && !this.launch.done) || this.recovery || (this.atlantis && this.atlantis.inside) || this.sub.pos.y > -4;
    if (!this.santaVisit && this.time > this.santaNext && !away) {
      this.santaNext = this.time + 150;
      this.summonSanta(false);
    }
    const v = this.santaVisit;
    if (!v || away) {
      if (this.santa) this.santa.group.visible = false;
      el.classList.add('hidden');
      return;
    }
    if (!this.santa) {
      this.santa = buildSanta();
      this.santa.group.scale.setScalar(0.75);
      // a magical glow, so he can be seen in the dark depths too
      this.santa.group.traverse((o) => {
        const m = o.material;
        if (m && m.isMeshStandardMaterial && m.emissiveIntensity < 0.5) {
          if (!m.vertexColors) m.emissive.copy(m.color);
          m.emissiveIntensity = 0.5;
        }
      });
      this.scene.add(this.santa.group);
    }
    const S = this.santa, g = S.group;
    if (v.t === 0) {
      echoSay(t('santaHere'), { now: true });
      audio.jingle();
    }
    v.t += dt;
    // swims in from far away, circles around you, then swims off again
    const k = v.t / v.dur, R = 24 + Math.max(0, 1 - v.t / 7) * 60 + Math.max(0, (v.t - (v.dur - 8)) / 8) * 70;
    v.a += dt * (9.5 / R);
    const c = this.sub.pos, x = c.x + Math.cos(v.a) * R, z = c.z + Math.sin(v.a) * R;
    const floor = this.world.heightAt(x, z) + 7;
    const y = Math.max(floor, Math.min(c.y + 1 + Math.sin(v.t * 0.4) * 1.5, -3));
    g.position.set(x, g.position.y && v.t > dt ? g.position.y + (y - g.position.y) * Math.min(1, dt * 2) : y, z);
    g.rotation.y = Math.atan2(-Math.sin(v.a), Math.cos(v.a)); // along the circle, counter-clockwise
    g.visible = true;
    const talking = el && !el.classList.contains('hidden');
    S.anim(this.time, dt, talking && v.sayT < 3.6);
    // "Ho ho ho, merry Christmas, <name>!" whenever he is near
    const near = g.position.distanceTo(c) < 52 && k < 0.92;
    v.say -= dt;
    if (near && v.say <= 0 && !this.paused) {
      const name = (profile.name || '').trim();
      el.querySelector('.fb-who').textContent = '🎅 ' + t('santaName');
      el.querySelector('.fb-text').textContent = t('santaSay', { name: name ? ', ' + name : '' });
      el.classList.remove('pop', 'hidden');
      void el.offsetWidth;
      el.classList.add('pop');
      el.onclick = () => (v.say = 0.01, v.sayT = 99);
      v.sayT = 0;
      v.say = 11;
      if (!v.said++) audio.discovery();
    }
    v.sayT = (v.sayT ?? 99) + dt;
    if (!near || v.sayT > 5.5) el.classList.add('hidden');
    else placeBubble(el, S.mouth.getWorldPosition(new THREE.Vector3()));
    if (v.t >= v.dur) {
      this.santaVisit = null;
      g.visible = false;
      el.classList.add('hidden');
    }
  }

  // ---------- network ----------
  // is this teammate in my dive? (dv = seed of their dive; older versions don't send it)
  sameDive(p) {
    return p.dv === undefined || p.dv === this.seed;
  }

  syncPlayers(players) {
    if (!players || this.ended) return;
    const ids = new Set();
    for (const [uid, p] of Object.entries(players)) {
      if (uid === net.uid || !this.sameDive(p)) continue;
      ids.add(uid);
      let r = this.remote.get(uid);
      const model = subModelById(p.sub).id;
      // name or sub only known now (or changed): build the teammate's sub again
      if (r && (r.model !== model || r.name !== (p.name || '?'))) {
        r.dispose(this.scene);
        this.remote.delete(uid);
        r = null;
      }
      if (!r) {
        r = new RemoteSub(this.scene, colorFor(uid, players), p.name || '?', model);
        r.model = model;
        this.remote.set(uid, r);
      }
      r.data = p;
      if (p.s) r.setState(p.s);
      r.setTalking(!!p.talk);
      if (Array.isArray(p.atl) && !this.teamAtl) this.teamAtl = { x: p.atl[0], z: p.atl[1] };
      // team challenges somebody already finished (also for divers who join later)
      if (this.team && Array.isArray(p.chd)) for (const id of p.chd) if (typeof id === 'string') this.team.markDone(id, true);
      if (this.multi && this.multi.coop && !this.race) {
        if (Array.isArray(p.ph)) {
          const fresh = p.ph.map((id) => CREATURES.find((c) => c.id === id)).filter((d) => d && !this.photographed.has(d.id));
          // somebody joins later or a message got lost: take over everything at once, without a card for each
          const quiet = fresh.length > 2;
          for (const d of fresh) this.discover(d, { team: true, by: p.name || '?', quiet });
          if (quiet) toast(t('teamFoundMany', { name: p.name || '?', n: fresh.length }));
        }
        if (Array.isArray(p.col)) for (const c of p.col) if (Array.isArray(c)) this.teamCollect(c[0], c[1]);
      }
      if (p.md && p.md.join(',') !== r.mdSig) {
        r.mdSig = p.md.join(',');
        this.applyTeamMissions(uid, p);
      }
    }
    for (const [uid, r] of this.remote) {
      if (!ids.has(uid)) {
        r.dispose(this.scene);
        this.remote.delete(uid);
      }
    }
    this.renderTeam(players);
  }

  renderTeam(players) {
    if (!this.multi) return;
    const rows = Object.entries(players || {}).map(([uid, p]) => {
      const d = !this.sameDive(p) ? '⚓' : p.s ? fmtNum(Math.max(0, -p.s.y * SCALE)) + ' m' : '';
      const extra = this.race && p.finish ? ` ✓ ${fmtTime(p.finish)}` : '';
      const mute = radio && radio.enabled && uid !== net.uid ? ` <button class="mute" data-mute="${escapeHtml(uid)}">${radio.mutedUids.has(uid) ? '🔇' : '🔊'}</button>` : '';
      return `<div><i style="background:${hexColor(colorFor(uid, players))}"></i>${p.talk ? '🎙 ' : ''}${escapeHtml(p.name || '?')}${uid === net.uid ? '' : ' · ' + d}${extra}${mute}</div>`;
    });
    const conn = net.room && net.room.conn;
    if (conn === 'reconnecting' || conn === 'lost') rows.push(`<div class="team-conn">📡 ${t(conn === 'lost' ? 'mpLostShort' : 'mpReconnectingShort')}</div>`);
    const html = rows.join('');
    if (html !== this.teamHtml) {
      this.teamHtml = html;
      $('#team').innerHTML = html;
      $('#team').querySelectorAll('[data-mute]').forEach((b) => (b.onclick = () => radio && radio.toggleMute(b.dataset.mute)));
    }
  }

  onNetEvent(ev) {
    if (!this.multi || this.ended) return;
    if (ev.type === 'discover' && this.multi.coop) {
      const def = CREATURES.find((c) => c.id === ev.id);
      if (def) this.discover(def, { team: true, by: ev.name });
    } else if (ev.type === 'collect' && this.multi.coop) {
      this.teamCollect(ev.item, ev.kind);
    } else if (ev.type === 'chdone' && this.team) {
      this.team.markDone(ev.id);
    } else if (ev.type === 'map' && this.multi.coop) {
      this.world.applyCells(ev.cells || [], ev.circle);
      this.checkMissions();
    }
  }

  // ---------- solid bodies: subs bounce off each other, animals and objects can't be passed through ----------
  collide(dt) {
    if ((this.launch && !this.launch.done) || this.recovery) return;
    const sub = this.sub;
    const S = (this.subShape ||= shapeFor('sub-' + sub.group.userData.type, sub.group));
    if (!S) return;
    // rocks and ledges on the trench walls are solid
    if (this.world.pushOut(sub.pos, S.r + 0.4)) sub.vel.multiplyScalar(0.92);
    capsuleEnds(S, sub.pos, sub.yaw, 1, CA1, CB1);
    // teammates' subs
    for (const [uid, r] of this.remote) {
      if (!r.initialized || !r.group.visible) continue;
      const rs = shapeFor('sub-' + r.group.userData.type, r.group);
      if (!rs || r.group.position.distanceTo(sub.pos) > S.reach + rs.reach + 2) continue;
      capsuleEnds(rs, r.group.position, r.group.rotation.y, 1, CA2, CB2);
      const R = S.r + rs.r;
      const d2 = closestSegSeg(CA1, CB1, CA2, CB2, CC1, CC2);
      if (d2 < R * R) this.bounce(Math.sqrt(d2), R, r.vel, 'sub:' + uid, { sub: true, name: r.name, center: r.group.position });
    }
    // animals and objects
    for (const it of this.cm.items) {
      if (it.collected || !it.group.visible || NO_COLLIDE.has(it.def.model)) continue;
      const list = it.members || [it.group];
      for (const o of list) {
        const shape = shapeFor('cr-' + it.def.model, o);
        if (!shape || shape.flat) continue;
        const pos = it.members ? o.getWorldPosition(CP) : o.position;
        const sc = it.members ? it.group.scale.x * o.scale.x : o.scale.x;
        if (pos.distanceTo(sub.pos) > S.reach + (shape.reach + shape.c.length()) * sc + 2) continue;
        capsuleEnds(shape, pos, it.group.rotation.y + (it.members ? o.rotation.y : 0), sc, CA2, CB2);
        const R = S.r + shape.r * sc;
        const d2 = closestSegSeg(CA1, CB1, CA2, CB2, CC1, CC2);
        if (d2 < R * R) this.bounce(Math.sqrt(d2), R, it.static ? null : it.vel, 'it:' + it.id, { item: it, center: pos });
      }
    }
    // the ship's hull at the surface
    const H = this.world.hull;
    if (H && sub.pos.y > -8) {
      const sp = this.world.ship.position;
      let best = null;
      for (const p of [CA1, CB1, sub.pos]) {
        const push = hullPush(H, p.x - sp.x, p.y - sp.y, p.z - sp.z, S.r + 0.2);
        if (push && (!best || push.lengthSq() > best.lengthSq())) best = push.clone();
      }
      if (best) {
        const pen = best.length();
        CC1.copy(sub.pos);
        CC2.copy(sub.pos).addScaledVector(best, -1 / pen);
        this.bounce(1 - pen, 1, null, 'ship', { ship: true, center: CC2, normal: best.divideScalar(pen) });
      }
    }
  }

  bounce(d, R, otherVel, key, o) {
    const sub = this.sub;
    const n = CN;
    if (o.normal) n.copy(o.normal);
    else if (d > 1e-4) n.subVectors(CC1, CC2).divideScalar(d);
    else n.subVectors(sub.pos, o.center).setY(0.0001).normalize();
    const pen = R - d;
    sub.pos.addScaledVector(n, pen + 0.01);
    const vrel = sub.vel.dot(n) - (otherVel ? otherVel.dot(n) : 0);
    if (vrel >= -0.3) return; // just resting against it
    const e = o.sub ? 0.85 : 0.4;
    const share = o.sub ? 0.5 : 1; // two equal subs: each side takes half (the other player's game does its half)
    sub.vel.addScaledVector(n, -(1 + e) * share * vrel + (o.sub ? 1.2 : 0.3));
    if (o.item && !o.item.static) {
      o.item.vel.addScaledVector(n, -Math.min(3, -vrel * 0.6));
      o.item.retarget = 0;
    }
    const strength = clamp(-vrel / 7, 0.25, 1);
    this.bumpT ||= {};
    if (this.time - (this.bumpT[key] ?? -9) > 0.6 && this.time - (this.lastBump ?? -9) > 0.22) {
      this.bumpT[key] = this.time;
      this.lastBump = this.time;
      const model = o.item ? o.item.def.model : '';
      const metal = o.sub || o.ship || METAL.has(model);
      audio.bump(strength, metal);
      this.shake = Math.max(this.shake, 0.15 + strength * 0.35);
      if (isTouch && navigator.vibrate) navigator.vibrate(o.sub ? 40 : 20);
      this.world.bubbleBurst(CC1.clone().lerp(CC2, 0.5), 18, 0.8);
      if (o.sub && !this.flags.bumpSub) {
        this.flags.bumpSub = true;
        echoSay(t('bumpSub', { name: o.name || '?' }));
      } else if (!o.sub && !this.flags.bumpThing && strength > 0.4) {
        this.flags.bumpThing = true;
        echoSay(t('bumpThing'));
      }
    }
  }

  // ---------- radar: where are the other subs? (multiplayer) ----------
  drawRadar(dt) {
    const cv = $('#radar');
    if (!cv || cv.classList.contains('hidden')) return;
    const g = cv.getContext('2d');
    const W = cv.width, C = W / 2, R = C - 6;
    const RANGE = 120; // world units = 1,200 m
    this.radarSweep = ((this.radarSweep || 0) + dt * 1.6) % (Math.PI * 2);
    const sw = this.radarSweep;
    g.clearRect(0, 0, W, W);
    // dish
    const bg = g.createRadialGradient(C, C, 0, C, C, R);
    bg.addColorStop(0, 'rgba(0,30,80,0.82)');
    bg.addColorStop(1, 'rgba(0,0,60,0.9)');
    g.fillStyle = bg;
    g.beginPath();
    g.arc(C, C, R, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#ffed00';
    g.stroke();
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(255,237,0,0.35)';
    for (const f of [1 / 3, 2 / 3]) {
      g.beginPath();
      g.arc(C, C, R * f, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(C - R, C); g.lineTo(C + R, C); g.moveTo(C, C - R); g.lineTo(C, C + R);
    g.stroke();
    // sweep with a fading trail
    for (let k = 0; k < 24; k++) {
      const a0 = sw - (k + 1) * 0.045, a1 = sw - k * 0.045;
      g.fillStyle = `rgba(125,255,200,${0.28 * (1 - k / 24)})`;
      g.beginPath();
      g.moveTo(C, C);
      g.arc(C, C, R - 3, a0 - Math.PI / 2, a1 - Math.PI / 2);
      g.closePath();
      g.fill();
    }
    // range label
    g.fillStyle = 'rgba(255,237,0,0.8)';
    g.font = 'bold 15px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(`${fmtDec((RANGE * SCALE) / 1000, 1)} km`, C, C - R + 26);
    // other subs: heading-up view
    const me = this.sub.pos, yaw = this.sub.yaw;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    // the deepest point and Atlantis
    const mark = (x, z, col, kind) => {
      const dx = x - me.x, dz = z - me.z;
      let px = (dx * cs - dz * sn) / RANGE, py = (dx * sn + dz * cs) / RANGE;
      const len = Math.hypot(px, py);
      if (len > 0.9) {
        px *= 0.9 / len;
        py *= 0.9 / len;
      }
      const X = C + px * R, Y = C + py * R;
      g.fillStyle = col;
      g.strokeStyle = 'rgba(0,0,40,0.8)';
      g.lineWidth = 2;
      g.beginPath();
      if (kind === 'star')
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 4 : 9;
          g.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr);
        }
      else g.arc(X, Y, 8, 0, Math.PI * 2);
      g.closePath();
      g.fill();
      g.stroke();
      if (kind === 'atl' || kind === 'team') {
        g.fillStyle = '#000044';
        g.font = 'bold 11px system-ui, sans-serif';
        g.fillText(kind === 'atl' ? 'A' : '2', X, Y + 4);
      }
    };
    if (!this.race && this.cm.deepest) mark(this.cm.deepest.x, this.cm.deepest.z, '#ffed00', 'star');
    if (this.atlantis) mark(this.atlantis.center.x, this.atlantis.center.z, '#ffd6ff', 'atl');
    if (this.team) for (const c of this.team.list) {
      const p = c.b.group.position;
      if (!c.done && Math.hypot(p.x - me.x, p.z - me.z) < RANGE) mark(p.x, p.z, '#7affff', 'team');
    }

    let n = 0;
    for (const [uid, r] of this.remote) {
      if (!r.initialized) continue;
      n++;
      const dx = r.group.position.x - me.x, dz = r.group.position.z - me.z;
      // into the sub's frame: forward (-z local) points up on the dish
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      let px = lx / RANGE, py = lz / RANGE;
      const len = Math.hypot(px, py);
      const edge = len > 0.92;
      if (edge) {
        px *= 0.92 / len;
        py *= 0.92 / len;
      }
      const x = C + px * R, y = C + py * R;
      const col = hexColor(r.color);
      // brighter right after the sweep passed over it
      const ang = (Math.atan2(px, -py) + Math.PI * 2) % (Math.PI * 2);
      const since = (sw - ang + Math.PI * 4) % (Math.PI * 2);
      const glow = 1 - Math.min(1, since / 2.5);
      g.save();
      g.shadowColor = col;
      g.shadowBlur = 8 + glow * 14;
      g.fillStyle = col;
      g.beginPath();
      if (edge) {
        const a = Math.atan2(py, px);
        g.translate(x, y);
        g.rotate(a);
        g.moveTo(10, 0); g.lineTo(-6, -8); g.lineTo(-6, 8);
        g.closePath();
      } else g.arc(x, y, 9 + glow * 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
      // initial + up/down hint
      const dyM = (r.group.position.y - me.y) * SCALE;
      g.fillStyle = '#fff';
      g.font = 'bold 15px system-ui, sans-serif';
      g.fillText(((r.name || '?')[0] || '?').toUpperCase() + (dyM > 60 ? '▲' : dyM < -60 ? '▼' : ''), x, y - 14);
    }
    // me in the centre
    g.fillStyle = '#ffed00';
    g.strokeStyle = '#000';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(C, C - 11); g.lineTo(C + 8, C + 9); g.lineTo(C, C + 5); g.lineTo(C - 8, C + 9);
    g.closePath();
    g.fill();
    g.stroke();
    if (!n && this.multi) {
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.font = '14px system-ui, sans-serif';
      g.fillText(t('radarNone'), C, C + R * 0.62);
    }
  }

  // ---------- per frame ----------
  update(dt) {
    if (this.paused) return;
    this.time += dt;
    const launching = this.launch && !this.launch.done;
    const recovering = !!this.recovery;
    const racePre = this.race && Date.now() < this.raceStartLocal;
    let inp = racePre || this.ended || launching || recovering ? ZERO_INPUT : input.state();
    if (this.boost && inp !== ZERO_INPUT) inp = { ...inp, boost: true };
    this.sub.boostDive = !!this.boost && !recovering;
    this.sub.update(dt, inp);
    const depth = this.depth();
    this.maxDepth = Math.max(this.maxDepth, depth);

    // resources (in Atlantis nothing runs out)
    if (this.atlantis) {
      this.energy = this.hull = this.life = 100;
    }
    if (!this.race && !this.ended && !launching && !recovering && !this.atlantis) {
      const drain = (0.07 + this.sub.thrust * 0.11 + (this.sub.lightOn ? 0.05 : 0) + (this.boost ? 0.12 : 0)) / this.batteryCap;
      this.energy -= drain * dt;
      this.life -= (100 / 720) * dt;
      if (depth > this.hullRating - 300 && !this.flags.hullNear && this.hullRating < this.level.maxDepth) {
        this.flags.hullNear = true;
        echoSay(L({ en: `Careful: our hull is only rated to ${fmtNum(this.hullRating)} m. Deeper than that it gets damaged.`, de: `Vorsicht: Unser Rumpf ist nur bis ${fmtNum(this.hullRating)} m freigegeben. Tiefer wird er beschädigt.` }));
      }
      if (depth > this.hullRating) {
        this.hull -= (1 + (depth - this.hullRating) / 400) * dt;
        if (this.time - this.lastCreak > 2.2) {
          this.lastCreak = this.time;
          audio.creak();
        }
        if (!this.flags.hullStress) {
          this.flags.hullStress = true;
          echoSay(line('hullStress'), { now: true });
          audio.alarm();
        }
      }
    }
    if (this.sub.impact > 0) {
      if (!this.race && !this.atlantis) this.hull -= this.sub.impact * 10;
      audio.thud();
      this.shake = Math.max(this.shake, 0.4);
      if (this.time - this.lastHit > 8) {
        this.lastHit = this.time;
        echoSay(line('collision'));
      }
    }
    this.energy = clamp(this.energy, 0, 100);
    this.hull = clamp(this.hull, 0, 100);
    this.life = clamp(this.life, 0, 100);
    if (!this.race && !recovering && !this.atlantis) {
      if (this.energy <= 0) this.emergency('energy');
      else if (this.hull <= 0) this.emergency('hull');
      else if (this.life <= 0) this.emergency('life');
      if (this.energy < 20 && !this.flags.lowEnergy) {
        this.flags.lowEnergy = true;
        echoSay(line('lowEnergy'));
        audio.alarm();
      }
      if (this.life < 20 && !this.flags.lowLife) {
        this.flags.lowLife = true;
        echoSay(line('lowLife'));
        audio.alarm();
      }
    }
    if (this.sonarCooldown > 0) this.sonarCooldown -= dt;

    // zone messages
    const zk = zoneKey(depth);
    if (!this.zones.has(zk)) {
      this.zones.add(zk);
      echoSay(line(zk));
    }
    if (!this.flags.landed && !launching && depth > 1500 && this.sub.pos.y - this.world.heightAt(this.sub.pos.x, this.sub.pos.z) < 16) {
      this.flags.landed = true;
      if (!this.race) {
        echoSay(L({ en: 'We are on the seafloor! Look around – it is full of life down here. Take photos!', de: 'Wir sind am Meeresboden! Schau dich um – hier unten wimmelt es von Leben. Mach Fotos!' }), { now: true });
        audio.discovery();
      }
    }
    if (depth > 8849 && !this.flags.everest) {
      this.flags.everest = true;
      echoSay(line('everest'));
    }
    if (depth > 10000 && !this.flags.deep10k) {
      this.flags.deep10k = true;
      echoSay(line('deep10k'));
    }

    // deepest point: close to the marker, or anywhere down in the deepest basin of the trench (its floor is
    // flat over a long stretch – being there counts, not only the exact spot)
    const dp = this.cm.deepest;
    if (!this.atDeepest && !recovering) {
      const floorY = this.world.heightAt(this.sub.pos.x, this.sub.pos.z);
      const nearMark = Math.hypot(this.sub.pos.x - dp.x, this.sub.pos.z - dp.z) < 24 && this.sub.pos.y - dp.y < 16;
      const inBasin = floorY <= dp.floorY + 4 && this.sub.pos.y - floorY < 16; // floor within 40 m of the deepest depth
      if (nearMark || inBasin) {
        this.atDeepest = true;
        this.world.deepestFound && this.world.deepestFound();
        if (this.beacon) this.beacon.found();
        echoSay(line('deepest'), { now: true });
        toast(`🎯 ${t('deepestFound')}`, `${fmtNum(-dp.y * SCALE)} m`);
        audio.mission();
        this.checkMissions();
      }
    }

    // creatures, targets
    const light = this.sub.lightInfo();
    this.cm.update(dt, this.sub, light);
    this.collide(dt);
    this.target = this.race || recovering ? null : this.cm.findPhotoTarget(this.sub, light);
    this.grabTarget = this.race || recovering ? null : this.cm.findGrabTarget(this.sub);
    if (!this.flags.fantasyNear) {
      for (const it of this.cm.items) {
        if (it.def.kind === 'fantasy' && !it.collected && it.group.position.distanceTo(this.sub.pos) < 38) {
          this.flags.fantasyNear = true;
          echoSay(line('fantasyNear'));
          audio.fantasy(it.def.sound);
          break;
        }
      }
    }

    // earthquakes
    if (this.level.quakes && depth > 3000 && this.time > this.nextQuake) {
      this.nextQuake = this.time + 80 + this.rng() * 60;
      this.shake = 3;
      audio.quake();
      echoSay(line('quake'), { now: true });
    }
    this.shake = Math.max(0, this.shake - dt);

    // missions polling (depth, mapping)
    this.missionTimer = (this.missionTimer || 0) - dt;
    if (this.missionTimer <= 0) {
      this.missionTimer = 0.5;
      this.checkMissions();
    }

    // race
    if (this.race) this.updateRace();

    // environment
    this.world.updateEnvironment(depth, camera.position, light);
    this.sub.group.userData.beam.material.uniforms.opacity.value = 0.11 * clamp((depth - 150) / 600, 0, 1);
    this.sub.group.userData.glowMat.opacity = 0.75 * clamp((depth - 100) / 500, 0, 1);
    this.world.update(dt);
    this.schools.update(dt, this.sub, camera.position);
    // inside the hidden hall only the hall is there: wild animals and fish schools outside stay hidden
    if (this.atlantis && this.atlantis.inside) {
      const c = this.atlantis.center, r2 = (this.atlantis.hallR + 8) ** 2;
      for (const it of this.cm.items) if (it.group.position.distanceToSquared(c) < r2) it.group.visible = false;
      for (const sc of this.schools.schools) sc.mesh.visible = false;
    }
    const recCam = this.recovery ? this.recovery.update(dt, camera) : false;
    const launchCam = !recCam && this.launch ? this.launch.update(dt, camera) : false;
    if (!launchCam && !recCam) this.updateCamera(dt);
    this.updateFx(dt);

    // Atlantis
    if (this.atlantis) {
      const da = Math.hypot(this.sub.pos.x - this.atlantis.center.x, this.sub.pos.z - this.atlantis.center.z);
      this.world.magic = Math.min(1, Math.max(0, 1 - (da - 150) / 220)) * this.atlantis.rise;
      const hello = this.atlantis.update(dt, this.time, this.sub);
      // surfacing: out of the hidden hall first, and straight up through the glass domes
      if (this.sub.autoAscent && this.atlantis.inside && !this.portalBusy) this.portal('exit');
      if (!this.sub.autoAscent) this.atlantis.clampSub(this.sub);
      if (!this.portalBusy && !this.ending) {
        const ev = this.atlantis.portalCheck(this.sub);
        if (ev) this.portal(ev);
      }
      this.updateFable(dt);
      this.updateHall(dt);
      // a hint at the secret door, and a picture of the city for the results
      if (this.atlantis.rise >= 1 && !this.atlantis.inside) {
        if (!this.atlSnap && !this.wantSnap && this.time - this.atlantisAt > 4.5) this.wantSnap = true;
        if (!this.doorHinted && !this.atlantis.metFable && this.time - this.atlantisAt > 32) {
          this.doorHinted = true;
          echoSay(t('atlDoorHint'), { now: true });
        }
      }
      if (hello === 'neptune') {
        echoSay(t('atlNeptune'), { now: true });
        toast('🔱 ' + t('atlNeptuneName'), t('atlNeptuneHi'));
        audio.fanfare();
      } else if (hello === 'mermaid') {
        echoSay(t('atlMermaid'), { now: true });
        toast('🧜‍♀️ ' + t('atlMermaidName'), t('atlMermaidHi'));
        audio.discovery();
      }
    }

    this.updateSanta(dt);
    if (this.team) this.updateTeam(dt);
    if (this.wrecks) {
      this.wrecks.update(dt, this.time, this.sub);
      for (const ev of this.wrecks.takeEvents()) {
        if (ev.type === 'found') echoSay(t(ev.kind === 'ship' ? 'wreckShip' : 'wreckPlane'), { now: true });
        else if (ev.type === 'loot') {
          audio.coin();
          toast(`💰 ${t('wreckLoot')} ${ev.n}/${ev.total}`);
          if (ev.n === ev.total) audio.fanfare();
        }
      }
    }

    // guide: beacon over the deepest point, map
    if (this.beacon) this.beacon.update(this.time, this.sub.pos);
    this.mapView.mark(this.sub.pos, dt);
    this.mapView.update(dt);

    // remote subs + network
    for (const r of this.remote.values()) r.update(dt);
    const inHall = !!(this.atlantis && this.atlantis.inside);
    for (const r of this.remote.values()) if (!!(r.data && r.data.ins) !== inHall) r.group.visible = false;
    this.drawRadar(dt);
    if (this.multi) {
      this.netTimer -= dt;
      if (this.netTimer <= 0) {
        this.netTimer = 0.12;
        const p = this.sub.pos;
        net.sendState({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 10) / 10, yaw: Math.round(this.sub.yaw * 100) / 100, l: this.sub.lightOn ? 1 : 0 });
      }
    }

    // surfaced?
    // close to the surface (or stuck under the ship's hull): the crane takes over
    if (this.ending && !this.ended && !this.recovery && this.sub.pos.y > -6) this.startRecovery();
    if (this.sub.autoAscent && !this.recovery && !this.paused) {
      const st = (this.ascStuck ||= { y: this.sub.pos.y, t: 0 });
      st.t += dt;
      if (this.sub.pos.y > st.y + 1.5) {
        st.y = this.sub.pos.y;
        st.t = 0;
      } else if (st.t > 2.5) {
        this.sub.pos.y += dt * 25; // something holds the sub down: float up anyway
        this.sub.vel.y = Math.max(this.sub.vel.y, 0);
      }
    } else this.ascStuck = null;

    audio.setEngine(clamp(this.sub.thrust + Math.abs(this.sub.vel.y) / 30, 0, 1));
    // ISABELLA: a swish with every stroke of her tail fin – exactly when the fluke sweeps through the middle
    // (the fluke angle is sin(ph - 4.2), so it moves fastest whenever ph - 4.2 passes a multiple of π)
    const mer = this.sub.group.userData.mer;
    if (mer && mer.ph !== undefined) {
      const k = Math.floor((mer.ph - 4.2) / Math.PI);
      const spd = this.sub.vel.length();
      if (this.finK !== undefined && k !== this.finK && spd > 1.2 && !this.paused) audio.finSwish(clamp(spd / 14, 0, 1), clamp(0.9 / (mer.fr || 1), 0.25, 0.55));
      this.finK = k;
    }
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.updateHud(depth);
    }
    this.updateOverlay();
  }

  updateRace() {
    const now = Date.now();
    const cd = $('#countdown');
    if (this.launch && !this.launch.done) {
      $('#raceTime').textContent = '0:00.0';
      return;
    }
    if (now < this.raceStartLocal) {
      const s = Math.ceil((this.raceStartLocal - now) / 1000);
      cd.style.display = 'block';
      if (cd.textContent !== String(s)) {
        cd.textContent = String(s);
        audio.click();
      }
      $('#raceTime').textContent = '0:00.0';
      return;
    }
    if (!this.flags.go) {
      this.flags.go = true;
      cd.textContent = t('raceGo');
      audio.ring();
      setTimeout(() => (cd.style.display = 'none'), 900);
    }
    const tsec = this.raceFinished ?? (now - this.raceStartLocal) / 1000;
    $('#raceTime').textContent = fmtTime(tsec);
    $('#raceRing').textContent = t('raceRing', { n: Math.min(this.ringIndex + 1, this.rings.length), total: this.rings.length });
    if (this.raceFinished) return;
    const ring = this.rings[this.ringIndex];
    ring.rotation.z += 0.02;
    if (ring.position.distanceTo(this.sub.pos) < 8) {
      audio.ringPass(this.ringIndex);
      this.ringBurst(ring);
      this.ringIndex++;
      if (this.ringIndex >= this.rings.length) {
        this.raceFinished = (now - this.raceStartLocal) / 1000;
        toast(t('raceFinished'), fmtTime(this.raceFinished));
        audio.fanfare();
        ringFlash(true);
        if (this.multi) net.setPlayer({ finish: this.raceFinished });
        this.ending = { emergency: false, race: true };
        setTimeout(() => this.finish(), 1800);
      } else this.highlightRing();
    }
  }

  // Ring passed: expanding glowing ring, sparkles, screen flash.
  ringBurst(ring) {
    const m = new THREE.Mesh(ring.geometry, new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 1, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(ring.position);
    m.quaternion.copy(ring.quaternion);
    this.scene.add(m);
    this.fx.push({ kind: 'burst', obj: m, t: 0, life: 0.8 });
    const N = 90;
    const pos = new Float32Array(N * 3);
    const vel = [];
    const q = ring.quaternion;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * 7, Math.sin(a) * 7, 0).applyQuaternion(q);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      vel.push(v.clone().normalize().multiplyScalar(4 + Math.random() * 8).add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3)));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const colors = [0x7dffe9, 0xfff27a, 0xff9ee8];
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: colors[this.ringIndex % 3], size: 1.1, map: sparkTexture(), transparent: true, opacity: 1, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.position.copy(ring.position);
    this.scene.add(pts);
    this.fx.push({ kind: 'spark', obj: pts, vel, t: 0, life: 1.1 });
    ring.visible = false;
    ringFlash(false);
    const n = this.rings.length - this.ringIndex - 1;
    if (n > 0) toast(`✦ ${this.ringIndex + 1}/${this.rings.length}`, n === 1 ? t('raceLastRing') : '');
  }

  updateFx(dt) {
    for (const f of this.fx) {
      f.t += dt;
      const k = f.t / f.life;
      if (f.kind === 'burst') {
        f.obj.scale.setScalar(1 + k * 1.8);
        f.obj.material.opacity = Math.max(0, 1 - k);
      } else if (f.kind === 'spark') {
        const arr = f.obj.geometry.attributes.position.array;
        f.vel.forEach((v, i) => {
          arr[i * 3] += v.x * dt;
          arr[i * 3 + 1] += v.y * dt;
          arr[i * 3 + 2] += v.z * dt;
          v.multiplyScalar(Math.exp(-dt * 2));
        });
        f.obj.geometry.attributes.position.needsUpdate = true;
        f.obj.material.opacity = Math.max(0, 1 - k);
      }
      if (f.t >= f.life) {
        this.scene.remove(f.obj);
        if (f.kind === 'spark') f.obj.geometry.dispose();
        f.obj.material.dispose();
        f.dead = true;
      }
    }
    this.fx = this.fx.filter((f) => !f.dead);
  }

  updateCamera(dt) {
    const s = this.sub;
    const fwd = s.forward();
    const fall = clamp(-s.vel.y * 0.08, 0, 5);
    // orbit offsets from mouse / touch drag (spring back after a moment)
    const o = this.orbit;
    // the chosen perspective stays until you double-tap the sub (or press V)
    if (o.reset) {
      const k = Math.exp(-dt * 4);
      o.yaw *= k;
      o.pitch *= k;
      o.zoom *= k;
      if (Math.abs(o.yaw) + Math.abs(o.pitch) + Math.abs(o.zoom) < 0.01) o.reset = false;
    }
    // fly lower behind the sub close to the seafloor, so you see what is on it
    const clear = s.pos.y - this.world.heightAt(s.pos.x, s.pos.z);
    const low = clamp((28 - clear) / 18, 0, 1);
    const dist = 12 + fall * 0.6 + o.zoom - low * 2 - (this.atlantis && this.atlantis.inside ? 3 : 0);
    const height = 6.2 + fall - low * 2.6;
    const R = Math.hypot(dist, height);
    const elev = clamp(Math.atan2(height, dist) + o.pitch, -0.45, 1.35);
    const yaw = s.yaw + o.yaw;
    const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const desired = s.pos.clone().addScaledVector(back, R * Math.cos(elev)).add(new THREE.Vector3(0, R * Math.sin(elev), 0));
    this.camPos.lerp(desired, 1 - Math.exp(-dt * (camDrag.active ? 10 : 4)));
    const ty = this.world.heightAt(this.camPos.x, this.camPos.z) + 1.5;
    if (this.camPos.y < ty) this.camPos.y = ty;
    if (this.camPos.y > -0.5) this.camPos.y = -0.5;
    if (this.atlantis && this.atlantis.inside) this.atlantis.clampCam(this.camPos);
    camera.position.copy(this.camPos);
    if (this.shake > 0) {
      const a = Math.min(1, this.shake) * 0.35;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
    const ahead = s.pos.clone().addScaledVector(fwd, 18).add(new THREE.Vector3(0, -1 - fall * 1.2, 0));
    // in the hidden hall the camera looks up a little towards the big creature when the sub faces it
    if (this.atlantis && this.atlantis.inside) {
      const fc = this.atlantis.hall.position.clone().add(this.atlantis.fableC);
      const to = fc.clone().sub(s.pos);
      const facing = clamp(to.clone().setY(0).normalize().dot(fwd.clone().setY(0).normalize()), 0, 1);
      ahead.lerp(fc, 0.45 * facing);
    }
    const atSub = s.pos.clone().add(new THREE.Vector3(0, 0.5, 0));
    const free = clamp(Math.abs(o.yaw) / 0.7 + Math.abs(o.pitch) / 0.5, 0, 1);
    camera.lookAt(ahead.lerp(atSub, free));
  }

  // little guide to the deepest point: direction (relative to the view), distance, how much deeper
  updateDeepNav() {
    const el = $('#deepNav');
    const show = !this.race && !this.atDeepest && !this.atlantis && !this.recovery && !this.ended && !(this.launch && !this.launch.done);
    el.classList.toggle('hidden', !show);
    if (!show) return;
    const dp = this.cm.deepest, p = this.sub.pos;
    const dx = dp.x - p.x, dz = dp.z - p.z;
    const dist = Math.hypot(dx, dz) * SCALE;
    const v = camera.getWorldDirection(new THREE.Vector3());
    const ang = Math.atan2(dx * v.z - dz * v.x, dx * v.x + dz * v.z); // >0: target to the right
    el.querySelector('.dn-arrow').style.transform = `rotate(${(-ang * 180) / Math.PI}deg)`;
    const deeper = Math.max(0, (p.y - dp.floorY) * SCALE);
    el.querySelector('.dn-txt').textContent = `${t('deepestShort')} · ${fmtDist(dist)}${deeper > 60 ? ' · ' + t('deeperBy', { d: fmtNum(Math.round(deeper / 10) * 10) }) : ''}`;
  }

  updateHud(depth) {
    $('#hDepth').textContent = fmtNum(depth);
    this.updateDeepNav();
    $('#hZone').textContent = t(zoneKey(depth));
    $('#hPressure').textContent = `${fmtNum(depth / 10 + 1)} bar`;
    $('#hTemp').textContent = `${fmtDec(this.temperature(depth), 1)} °C`;
    const bar = (id, v) => {
      const el = $('#b' + id);
      el.style.width = `${v}%`;
      el.style.background = v > 50 ? 'var(--good)' : v > 20 ? 'var(--warn)' : 'var(--bad)';
      $('#v' + id).textContent = Math.round(v);
    };
    bar('Energy', this.energy);
    bar('Hull', this.hull);
    bar('Life', this.life);
    $('#gaugeSub').style.top = `${clamp(depth / this.level.maxDepth, 0, 1) * 100}%`;
    const w = $('#warn');
    let warn = '';
    if (this.sub.outOfBounds) warn = t('leaving');
    else if (this.sub.proximity) warn = t('proximity');
    else if (this.ending && this.ending.emergency) warn = t('emergency');
    else if (this.ending) warn = t('surfacing');
    w.style.display = warn ? 'block' : 'none';
    w.textContent = warn;
    $('#bSonar').classList.toggle('cool', this.sonarCooldown > 0);
    $('#bGrab').classList.toggle('ready', !!this.grabTarget);
    $('#bPhoto').classList.toggle('ready', !!this.target);
    const gh = $('#grabHint');
    if (this.grabTarget) {
      gh.style.display = 'block';
      gh.textContent = `✋ ${L(this.grabTarget.def.name)} – ${t('grabHint')}`;
    } else gh.style.display = 'none';
    if (this.multi) this.renderTeam(net.room ? net.room.players : {});
  }

  updateOverlay() {
    const w = window.innerWidth, h = window.innerHeight;
    const project = (p) => {
      const v = p.clone().project(camera);
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
    };
    const ret = $('#reticle');
    if (this.target) {
      const it = this.target;
      const pp = project(it.group.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
      if (!pp.behind) {
        ret.style.display = 'block';
        ret.style.left = `${pp.x}px`;
        ret.style.top = `${pp.y}px`;
        const size = clamp(900 / Math.max(4, camera.position.distanceTo(it.group.position)) * (it.radius / 1.5), 60, 220);
        ret.style.width = ret.style.height = `${size}px`;
        const known = this.photographed.has(it.def.id) || profile.logbook[it.def.id];
        ret.classList.toggle('fantasy', it.def.kind === 'fantasy' && !!known);
        $('#reticleLabel').textContent = known ? `📷 ${L(it.def.name)}` : `📷 ${t('unknownCreature')}`;
      } else ret.style.display = 'none';
    } else ret.style.display = 'none';

    // sonar contacts
    this.contacts = this.contacts.filter((c) => c.until > this.time && !c.it.collected);
    this.contactEls.forEach((el, i) => {
      const c = this.contacts[i];
      if (!c) {
        el.style.display = 'none';
        return;
      }
      const pp = project(c.it.group.position);
      if (pp.behind || pp.x < 0 || pp.x > w || pp.y < 0 || pp.y > h) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';
      el.style.left = `${pp.x}px`;
      el.style.top = `${pp.y}px`;
      el.style.opacity = String(clamp((c.until - this.time) / 3, 0, 1));
      const big = ['whale', 'seep', 'lander', 'trieste'].includes(c.it.def.id);
      el.classList.toggle('big', big);
      el.classList.toggle('fan', c.it.def.kind === 'fantasy');
      el.textContent = `${fmtNum(c.it.group.position.distanceTo(this.sub.pos) * SCALE)} m`;
    });

    // race arrow
    const arrow = $('#ringArrow');
    if (this.race && !this.raceFinished && this.rings[this.ringIndex]) {
      const rp = this.rings[this.ringIndex].position;
      const pp = project(rp);
      const onScreen = !pp.behind && pp.x > 40 && pp.x < w - 40 && pp.y > 40 && pp.y < h - 40;
      if (onScreen) arrow.style.display = 'none';
      else {
        arrow.style.display = 'block';
        let dx = pp.x - w / 2, dy = pp.y - h / 2;
        if (pp.behind) {
          dx = -dx;
          dy = -dy;
        }
        const ang = Math.atan2(dy, dx);
        const rad = Math.min(w, h) * 0.32;
        arrow.style.left = `${w / 2 + Math.cos(ang) * rad}px`;
        arrow.style.top = `${h / 2 + Math.sin(ang) * rad}px`;
        arrow.style.transform = `translate(-50%,-50%) rotate(${ang}rad)`;
      }
    } else arrow.style.display = 'none';
  }

  // surfaced: back to the ship – the crane lifts the sub aboard, then the results
  startRecovery() {
    if (this.recovery || this.ended) return;
    if (this.race) return this.finish();
    this.sub.autoAscent = false;
    this.boost = false;
    $('#bBoost').classList.remove('on');
    hideCard();
    toggleHelp(false);
    diveFx();
    audio.splash();
    echoSay(t('recoveryMsg'), { now: true });
    this.recovery = new Recovery(this, () => this.finish());
    $('#skipHint').textContent = t(isTouch ? 'skipTouch' : 'skipKey');
    $('#skipHint').classList.remove('hidden');
  }

  finish() {
    if (this.ended) return;
    if (this.mapView) this.mapView.toggle(false);
    hideCard();
    toggleHelp(false);
    $('#skipHint').classList.add('hidden');
    this.ended = true;
    input.enabled = false;
    $('#fableBubble').classList.add('hidden');
    $('#santaBubble').classList.add('hidden');
    $('#hallCount').classList.add('hidden');
    audio.stopLoops();
    if (this.multi) net.setPlayer({ done: true });
    showResults(this);
  }

  dispose() {
    if (this.mapView) this.mapView.toggle(false);
    $('#santaBubble').classList.add('hidden');
    if (this.santa) this.scene.remove(this.santa.group);
    audio.winch(false);
    $('#skipHint').classList.add('hidden');
    this.contactEls.forEach((e) => e.remove());
    for (const r of this.remote.values()) r.dispose(this.scene);
    if (this.atlantis) this.atlantis.dispose();
    if (this.wrecks) this.wrecks.dispose();
    if (this.team) this.team.dispose();
    this.world.dispose();
    $('#countdown').style.display = 'none';
    $('#ringArrow').style.display = 'none';
    $('#reticle').style.display = 'none';
    $('#warn').style.display = 'none';
    $('#grabHint').style.display = 'none';
  }
}

function sonarRipple() {
  const r = document.createElement('div');
  r.className = 'ripple';
  $('#hud').appendChild(r);
  setTimeout(() => r.remove(), 1400);
}

let sparkTex = null;
function sparkTexture() {
  if (sparkTex) return sparkTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  g.fillRect(15, 0, 2, 32);
  g.fillRect(0, 15, 32, 2);
  sparkTex = new THREE.CanvasTexture(c);
  return sparkTex;
}

// Underwater transition: bubbles rushing up + blue flash.
function diveFx() {
  const el = $('#diveFx');
  el.innerHTML = '<div class="dfx-flash"></div><div class="dfx-line"></div>';
  for (let i = 0; i < 46; i++) {
    const b = document.createElement('span');
    const s = 8 + Math.random() * 38;
    b.style.width = b.style.height = `${s}px`;
    b.style.left = `${Math.random() * 100}%`;
    b.style.animationDelay = `${Math.random() * 0.5}s`;
    b.style.animationDuration = `${0.9 + Math.random() * 0.9}s`;
    el.appendChild(b);
  }
  el.classList.remove('hidden');
  clearTimeout(diveFx.timer);
  diveFx.timer = setTimeout(() => el.classList.add('hidden'), 2300);
}

function ringFlash(big) {
  const el = $('#ringFlash');
  el.classList.remove('go', 'big');
  void el.offsetWidth;
  el.classList.add('go');
  if (big) el.classList.add('big');
}

function flash() {
  let f = $('#flash');
  if (!f) {
    f = document.createElement('div');
    f.id = 'flash';
    f.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:15;transition:opacity .25s';
    document.body.appendChild(f);
  }
  f.style.transition = 'none';
  f.style.opacity = '0.55';
  requestAnimationFrame(() => {
    f.style.transition = 'opacity .35s';
    f.style.opacity = '0';
  });
}

// ======================= starting & ending =======================
function startDive(opts) {
  if (game) endGame();
  closeModal();
  hideCard();
  unspinSub();
  $('#menu').classList.add('hidden');
  $('#menuBg').classList.add('hidden');
  $('#intro').classList.add('hidden');
  $('#passers').innerHTML = '';
  $('#c').style.visibility = 'visible';
  audio.music('dive');
  game = new Dive(opts);
  recordDive(net, { level: opts.level.id, sub: subModelById(profile.sub).id, mode: opts.mode, multi: !!opts.multi });
  const showRadio = !!(radio && opts.multi);
  $('#radio').classList.toggle('hidden', !showRadio);
  $('#radioPtt').style.display = showRadio && voiceAllowed() ? '' : 'none';
  $('#radioMenu').classList.add('hidden');
  window.SUBPILOT.game = game;
  input.enabled = true;
}

function endGame() {
  $('#radio').classList.add('hidden');
  $('#radioMenu').classList.add('hidden');
  if (!game) return;
  game.dispose();
  game = null;
  window.SUBPILOT.game = null;
  $('#hud').classList.add('hidden');
  input.enabled = false;
}

let resultsRace = null;

function computeScore(g) {
  const disc = g.found.reduce((s, f) => {
    const k = f.def.kind;
    const pts = f.isNew ? (k === 'fantasy' ? 200 : k === 'real' ? 150 : 100) : k === 'fantasy' ? 60 : k === 'real' ? 40 : 30;
    return s + pts;
  }, 0);
  const samples = g.nodules * 40 + g.litter * 60 + g.sediments * 50 + (g.landerFound ? 250 : 0);
  const missions = g.missions.filter((m) => m.done).length * 250;
  const mapped = Math.round(g.world.mappedPercent() * 10);
  const depthB = Math.floor(g.maxDepth / 100);
  const A = g.atlantis;
  const atl = A && A.loot ? A.lootTaken * 30 + A.crewCaught * 5 + (A.secretFound ? 200 : 0) : 0;
  const wreck = g.wrecks ? g.wrecks.taken * 40 : 0;
  const team = g.team ? g.team.doneCount * 300 : 0;
  const sub = disc + samples + missions + mapped + depthB + atl + wreck + team;
  const total = g.ending && g.ending.emergency ? Math.round(sub * 0.5) : sub;
  return { disc, samples, missions, mapped, depthB, atl, wreck, team, total, missionsDone: g.missions.filter((m) => m.done).length };
}

function showResults(g) {
  setTimeout(hideCard, 60);
  $('#hud').classList.add('hidden');
  if (g.race) return showRaceResults(g);
  const sc = computeScore(g);
  const emergency = g.ending && g.ending.emergency;
  const foundHtml = g.found.length
    ? `<h3 class="ptitle">📷 ${t('yourPhotos')} (${g.found.length})</h3><div class="ptiles">${g.found.map((f, i) => `<button class="ptile ${f.def.kind === 'fantasy' ? 'f' : ''}" data-i="${i}"><canvas></canvas><span>${f.def.kind === 'fantasy' ? '★ ' : ''}${escapeHtml(L(f.def.name))}${f.isNew ? ' ✨' : ''}</span></button>`).join('')}</div><p class="phint">${t('yourPhotosHint')}</p>`
    : '';
  // how deep you got – and how deep the trench goes
  const target = Math.round(-g.cm.deepest.y * SCALE);
  const pct = clamp(g.maxDepth / target, 0, 1);
  const depthHtml = `<div class="depth-res ${g.atDeepest ? 'ok' : ''}">
      <div class="dr-row"><span>${t('resDepth')}</span><b>${fmtNum(g.maxDepth)} m</b><span class="dr-of">${t('resOf', { d: fmtNum(target) })}</span></div>
      <div class="dr-bar"><div style="width:${(pct * 100).toFixed(1)}%"></div><i style="left:100%"></i></div>
      <div class="dr-note">${g.atDeepest ? '🎯 ' + t('resDeepestYes') : t('resDeepestNo', { d: fmtNum(Math.max(0, target - g.maxDepth)) })}</div>
    </div>`;
  const A = g.atlantis;
  if (A && !g.atlSnap) snapAtlantis(g);
  const beings = A
    ? [
        A.metNeptune && { key: 'fig:neptune', name: t('atlNeptuneName'), text: t('atlNeptune') },
        A.metMermaid && { key: 'fig:mermaid', name: t('atlMermaidName'), text: t('atlMermaid') },
        A.metFable && { key: `fable:${A.levelId}`, name: L(A.fable.info.name), text: L(A.fable.info.legend) },
        A.metFable && A.extras && A.levelId === 'southsandwich' && { key: 'crew:crew', name: t('crewName'), text: t('crewInfo') },
        A.metFable && A.extras && A.levelId === 'southsandwich' && { key: 'crew:perla', name: t('perlaName'), text: t('perlaInfo') },
        A.metFable && A.extras && A.levelId !== 'southsandwich' && { key: `comp:swarm:${A.levelId}`, name: L(A.extras.name), text: t('swarmInfo', { name: L(A.extras.name) }) },
        A.metFable && FLYERS[A.levelId] && { key: `comp:flyer:${A.levelId}`, name: L(FLYERS[A.levelId].name), text: L(FLYERS[A.levelId].info) },
      ].filter(Boolean)
    : [];
  const atlHtml = A
    ? `<h3 class="ptitle">🏛️ Atlantis · ${escapeHtml(L(A.theme.name))}</h3>
      <div class="atl-res">${g.atlSnap && g.atlSnap !== 'none' ? `<img class="atl-snap" src="${g.atlSnap}" alt="Atlantis">` : ''}
      ${beings.length ? `<div class="ptiles atl-tiles">${beings.map((b, i) => `<button class="ptile f" data-b="${i}"><canvas data-key="${b.key}"></canvas><span>★ ${escapeHtml(b.name)}</span></button>`).join('')}</div>` : ''}</div>
      ${A.metFable
        ? `<p class="atl-legend">✨ <b>${escapeHtml(L(A.fable.info.name))}</b> – ${escapeHtml(L(A.fable.info.legend))} ${A.fable.info.source.length ? `<span class="src">${t('source')}: ${A.fable.info.source.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${escapeHtml(n)}</a>`).join(' · ')}</span>` : ''}</p>`
        : `<p class="phint">${t('atlResMissed')}</p>`}
      ${A.metFable && A.loot ? `<p class="atl-loot">💰 ${t('hallLoot')}: ${A.lootTaken}/${A.loot.length}${A.extras ? ` · ${A.extras.icon} ${escapeHtml(L(A.extras.name))}: ${A.crewCaught}/${A.extras.total}` : ''} · ✨ ${A.secretFound ? escapeHtml(L(A.secret.userData.info.name)) : t('hallSecretMissed')}</p>` : ''}`
    : '';
  showModal(`<h1>${emergency ? '⚠ ' + t('diveEmergency') : '✅ ' + t('diveComplete')}</h1>
    <p>${escapeHtml(L(g.level.name))}${g.atlantis ? ' · 🏛️ Atlantis' : ''}</p>
    ${depthHtml}
    ${foundHtml}
    ${atlHtml}
    <div class="score-list">
      <span>${t('discoveries')} (${g.found.length})</span><span>${fmtNum(sc.disc)}</span>
      <span>${t('samples')}</span><span>${fmtNum(sc.samples)}</span>
      <span>${t('missionsDone')} (${sc.missionsDone}/${g.missions.length})</span><span>${fmtNum(sc.missions)}</span>
      <span>${t('mapped')} (${fmtDec(g.world.mappedPercent(), 1)} %)</span><span>${fmtNum(sc.mapped)}</span>
      <span>${t('depthBonus')}</span><span>${fmtNum(sc.depthB)}</span>
      ${g.atlantis && g.atlantis.metFable ? `<span>${t('atlScore')}</span><span>${fmtNum(sc.atl)}</span>` : ''}
      ${sc.wreck ? `<span>${t('wreckScore')} (${g.wrecks.taken}/${g.wrecks.loot.length})</span><span>${fmtNum(sc.wreck)}</span>` : ''}
      ${g.team ? `<span>🤝 ${t('teamScore')} (${g.team.doneCount}/${CHALLENGES.length})</span><span>${fmtNum(sc.team)}</span>` : ''}
      ${emergency ? `<span>× 0.5</span><span></span>` : ''}
      <span class="tot">${t('total')}</span><span class="tot">${fmtNum(sc.total)}</span>
    </div>
    <div class="debrief-ask"><b>💬 ${t('debriefTitle')}?</b><span>${t('debriefAsk')}</span></div>
    <div class="row-end">
      <button class="btn secondary" id="rNext">⏭ ${t('debriefSkip')}</button>
      <button class="btn big" id="rQuiz">💬 ${t('debriefDo')}</button>
    </div>`, (root) => {
    root.querySelector('#rQuiz').onclick = () => runQuiz(g, sc);
    root.querySelector('#rNext').onclick = () => finishQuiz(g, sc, 0);
    mountPhotoTiles(root, g.found);
    // the Atlantis beings as rotating 3D tiles – tap one to see it big, turning in 3D
    root.querySelectorAll('.atl-tiles .ptile').forEach((tile) => {
      tile.onclick = () => {
        const b = beings[Number(tile.dataset.b)];
        showCard({ id: b.key, kind: 'fantasy', plain: true, model: b.key, name: { en: b.name, de: b.name }, fact: { en: b.text, de: b.text } }, { stay: true, big: true });
      };
    });
    const cvs = [...root.querySelectorAll('.atl-tiles canvas')];
    cvs.forEach((cv, i) =>
      setTimeout(() => {
        if (!cv.isConnected) return;
        try {
          playTurntable(cv, viewer().turntable(cv.dataset.key, 24, 150, 112));
        } catch (e) {
          console.warn('turntable failed', e);
        }
      }, 400 + i * 60),
    );
  }, 'wide');
}

// rotating 3D thumbnails (pre-rendered turntables), one after another so the screen stays smooth
function mountPhotoTiles(root, found) {
  const tiles = [...root.querySelectorAll('.ptile[data-i]')];
  tiles.forEach((tile) => {
    tile.onclick = () => {
      const f = found[Number(tile.dataset.i)];
      showCard(f.def, { depth: f.depth, stay: true, big: true });
    };
  });
  let i = 0;
  const next = () => {
    if (i >= tiles.length || !tiles[i].isConnected) return;
    const tile = tiles[i];
    const f = found[Number(tile.dataset.i)];
    try {
      const tt = viewer().turntable(f.def.model, 24, 150, 112);
      playTurntable(tile.querySelector('canvas'), tt);
    } catch (e) {
      console.warn('turntable failed', e);
    }
    i++;
    setTimeout(next, 40);
  };
  setTimeout(next, 150);
}

function runQuiz(g, sc) {
  const topics = ['general', ...g.found.map((f) => f.def.id)];
  if (g.fantasyCount) topics.push('fantasy');
  const qs = pickQuestions(tier(), topics, 4, getLang(), profile.seenQuestions);
  // met the fable creature in Atlantis? Then one bonus question about its legend
  const A = g.atlantis;
  if (A && A.metFable) {
    const fq = fableQuestion(A.levelId, getLang(), profile.seenQuestions);
    if (fq) qs.push(fq);
  }
  let i = 0;
  let correct = 0;
  const show = () => {
    const q = qs[i];
    showModal(`<h1>💬 ${t('debriefTitle')}</h1><div class="qprog">${i === 0 ? t('debriefIntro') + ' · ' : ''}${i + 1}/${qs.length}</div>
      ${q.fable ? `<div class="qfable">✨ ${escapeHtml(L(g.atlantis.fable.info.name))}</div>` : ''}
      <p style="font-size:18px;font-weight:700">${escapeHtml(q.q)}</p>
      <div class="qopts">${q.a.map((a, k) => `<button class="qopt" data-k="${k}">${escapeHtml(a)}</button>`).join('')}</div>
      <div class="qfb" id="qfb"></div>
      <div class="row-end"><button class="btn hidden" id="qNext">${i + 1 < qs.length ? t('next') : t('finish')}</button></div>`, (root) => {
      let answered = false;
      root.querySelectorAll('.qopt').forEach((b) => {
        b.onclick = () => {
          if (answered) return;
          answered = true;
          const k = Number(b.dataset.k);
          root.querySelectorAll('.qopt')[q.c].classList.add('correct');
          if (k === q.c) {
            correct++;
            audio.discovery();
            root.querySelector('#qfb').textContent = `✅ ${t('correct')} +50`;
          } else {
            b.classList.add('wrong');
            audio.click();
            root.querySelector('#qfb').textContent = t('wrong', { a: q.a[q.c] });
          }
          if (q.src) {
            const s = document.createElement('div');
            s.className = 'qsrc';
            s.innerHTML = `${t('source')}: <a href="${q.src[1]}" target="_blank" rel="noopener">${escapeHtml(q.src[0])}</a>`;
            root.querySelector('#qfb').after(s);
          }
          profile.seenQuestions = [...profile.seenQuestions, q.key].slice(-80);
          root.querySelector('#qNext').classList.remove('hidden');
        };
      });
      root.querySelector('#qNext').onclick = () => {
        i++;
        if (i < qs.length) show();
        else finishQuiz(g, sc, correct, qs.length);
      };
    });
  };
  if (qs.length) show();
  else finishQuiz(g, sc, 0);
}

async function finishQuiz(g, sc, correct, asked = 0) {
  const quiz = correct * 50;
  const total = sc.total + quiz;
  profile.rp += total;
  profile.dives++;
  saveProfile();
  const entry = { name: profile.name, score: total, depth: Math.round(g.maxDepth), level: g.level.id };
  net.submitScore(`exp_${g.level.id}`, entry);
  if (g.maxDepth > 500) net.submitScore('deepest', { name: profile.name, score: Math.round(g.maxDepth), level: g.level.id });
  const inRoom = !!(g.multi && net.room);
  showModal(`<h1>🏁 ${t('diveComplete')}</h1>
    <div class="score-list">
      <span>${t('score')}</span><span>${fmtNum(sc.total)}</span>
      ${asked ? `<span>${t('quizBonus')} (${correct}/${asked})</span><span>${fmtNum(quiz)}</span>` : ''}
      <span class="tot">${t('total')}</span><span class="tot">${fmtNum(total)}</span>
    </div>
    <p>🔬 ${t('research')}: <b>${fmtNum(rpAvailable())}</b> · ${t('saveScore')} ✓</p>
    <div class="row-end">
      <button class="btn secondary" id="fLb">🏆 ${t('leaderboard')}</button>
      ${inRoom ? `<button class="btn" id="fRoom">👥 ${t('mpTitle')}</button>` : ''}
      <button class="btn" id="fMenu">${t('toMenu')}</button>
    </div>`, (root) => {
    root.querySelector('#fLb').onclick = () => {
      endGame();
      renderMenu();
      showLeaderboard('exp', g.level.id);
    };
    root.querySelector('#fMenu').onclick = () => {
      if (inRoom) leaveRoomAll();
      endGame();
      closeModal();
      renderMenu();
    };
    if (inRoom) root.querySelector('#fRoom').onclick = backToRoom;
  });
}

function backToRoom() {
  endGame();
  resultsRace = null;
  renderMenu();
  if (net.isHost()) net.resetRoom();
  openLobby();
}

function showRaceResults(g) {
  const time = g.raceFinished;
  const dnf = !time;
  if (!dnf) {
    profile.rp += 150;
    profile.dives++;
    saveProfile();
    net.submitScore(`race_${g.level.id}`, { name: profile.name, time: Math.round(time * 10) / 10, level: g.level.id });
  }
  resultsRace = { g, time, dnf };
  renderRaceStandings();
}

function renderRaceStandings() {
  if (!resultsRace) return;
  const { g, time, dnf } = resultsRace;
  const inRoom = !!(g.multi && net.room);
  let standings = '';
  if (inRoom) {
    const list = Object.entries(net.room.players || {})
      .filter(([u, p]) => u === net.uid || p.dv === undefined || p.dv === g.seed) // only who raced this race
      .map(([u, p]) => ({ name: p.name, finish: p.finish, me: u === net.uid }));
    list.sort((a, b) => (a.finish ?? 1e9) - (b.finish ?? 1e9));
    standings = `<table class="lb">${list.map((p, i) => `<tr><td>${i + 1}.</td><td>${escapeHtml(p.name || '?')}${p.me ? ' ←' : ''}</td><td>${p.finish ? fmtTime(p.finish) : '…'}</td></tr>`).join('')}</table>`;
  }
  // the standings change with every position update of the others: only swap the table, never the whole
  // window (rebuilding the buttons all the time made mouse clicks get lost)
  const box = document.querySelector('#sheet .race-standings');
  if (box && resultsRace.shown) {
    if (box.innerHTML !== standings) box.innerHTML = standings;
    return;
  }
  resultsRace.shown = true;
  showModal(`<h1>🏁 ${t('raceResults')}</h1>
    <p>${escapeHtml(L(g.level.name))}</p>
    <div class="score-list"><span>${t('raceYourTime')}</span><span class="tot">${dnf ? '–' : fmtTime(time)}</span>
    ${dnf ? '' : `<span>${t('research')}</span><span>+150</span>`}</div>
    <div class="race-standings">${standings}</div>
    <div class="row-end">
      <button class="btn secondary" id="fLb">🏆 ${t('leaderboard')}</button>
      ${inRoom ? `<button class="btn" id="fRoom">👥 ${t('mpTitle')}</button>` : ''}
      <button class="btn" id="fMenu">${t('toMenu')}</button>
    </div>`, (root) => {
    root.querySelector('#fLb').onclick = () => {
      resultsRace = null;
      endGame();
      renderMenu();
      showLeaderboard('race', g.level.id);
    };
    root.querySelector('#fMenu').onclick = () => {
      resultsRace = null;
      if (inRoom) leaveRoomAll();
      endGame();
      closeModal();
      renderMenu();
    };
    if (inRoom) root.querySelector('#fRoom').onclick = backToRoom;
  });
}

// ======================= pause & ask =======================
function showPause() {
  if (!game || game.ended) return;
  if (!game.multi) game.paused = true;
  input.enabled = false;
  showModal(`<h1>❚❚ ${t('pause')}</h1>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <button class="btn" id="pResume">▶ ${t('resume')}</button>
      <button class="btn secondary" id="pAsk">💬 ${t('askTitle')}</button>
      <button class="btn secondary" id="pLog">📖 ${t('logbook')}</button>
      <div class="seg" id="pSound">${SOUND_MODES.map((m) => `<button data-s="${m}" class="${audio.mode === m ? 'on' : ''}">${soundLabel(m)}</button>`).join('')}</div>
      ${radio && voiceAllowed() ? `<button class="btn secondary" id="pRadio">${radio.enabled ? '📻 ' + t('radioOn') : '🔇 ' + t('radioOff')}</button>` : ''}
      ${game.race ? '' : `<button class="btn secondary" id="pSurface">⤒ ${t('btnSurface')}</button>`}
      <button class="btn secondary" id="pAbort">⚠ ${t('abort')}</button>
    </div>
    <p style="font-size:13px;color:var(--ink-soft);margin-top:14px">${t('keysHint')}</p>`, (root) => {
    root.querySelector('#pResume').onclick = resume;
    root.querySelector('#pAsk').onclick = () => {
      closeModal();
      openAsk();
    };
    root.querySelector('#pLog').onclick = () => showLogbook('real');
    root.querySelectorAll('#pSound button').forEach((b) => {
      b.onclick = () => {
        audio.setMode(b.dataset.s);
        updateSoundBtn();
        root.querySelectorAll('#pSound button').forEach((x) => x.classList.toggle('on', x === b));
      };
    });
    if (root.querySelector('#pRadio')) root.querySelector('#pRadio').onclick = () => {
      radio.setEnabled(!radio.enabled);
      showPause();
    };
    if (root.querySelector('#pSurface')) root.querySelector('#pSurface').onclick = () => {
      resume();
      game.surfaceNow(false);
    };
    root.querySelector('#pAbort').onclick = () => {
      resume();
      if (game.race) game.actSurface();
      else game.surfaceNow(true);
    };
  });
}

// ======================= statistics (5 × 9 or 5 taps on the version) =======================
const secret = { n: 0, last: 0 };
function secretPress() {
  const now = performance.now();
  secret.n = now - secret.last < 1400 ? secret.n + 1 : 1;
  secret.last = now;
  if (secret.n >= 5) {
    secret.n = 0;
    showStats();
  }
}
function showStats() {
  const wasOwner = isOwner();
  markOwner();
  if (game && !game.ended && !game.multi) game.paused = true;
  input.enabled = false;
  openStats({
    net,
    showModal,
    closeModal: () => {
      closeModal();
      if (game && !game.ended) resume();
    },
    ownerNote: !wasOwner,
    levelName: (id) => {
      const lv = LEVELS.find((l) => l.id === id);
      return lv ? L(lv.name) : id;
    },
    subName: (id) => {
      const m = SUB_MODELS.find((x) => x.id === id);
      return m ? L(m.name) : id;
    },
  });
}
window.addEventListener('keydown', (e) => {
  if ((e.code === 'Digit9' || e.code === 'Numpad9' || e.key === '9') && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) secretPress();
  if ((e.code === 'Digit1' || e.code === 'Numpad1') && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) && $('#radioMenu').classList.contains('hidden')) cheatPress();
  if ((e.code === 'Digit2' || e.code === 'Numpad2') && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) && $('#radioMenu').classList.contains('hidden')) santaPress();
});
// 5 × "2" (or 10 taps on your own sub): Santa Claus comes – and your sub gets dressed up for Christmas
const santaKeys = { n: 0, last: 0 };
function santaPress() {
  if (!game || game.ended || game.race) return;
  const now = performance.now();
  santaKeys.n = now - santaKeys.last < 2000 ? santaKeys.n + 1 : 1;
  santaKeys.last = now;
  if (santaKeys.n >= 5) {
    santaKeys.n = 0;
    game.summonSanta(true);
  }
}
// 5 × "1": every mission done → Atlantis (in Atlantis: straight to the fable creature)
const cheat = { n: 0, last: 0 };
function cheatPress() {
  if (!game || game.ended || game.race) return;
  const now = performance.now();
  cheat.n = now - cheat.last < 2000 ? cheat.n + 1 : 1;
  cheat.last = now;
  if (cheat.n >= 5) {
    cheat.n = 0;
    if (game.atlantis) game.goFable();
    else game.cheatComplete();
  }
}
// on screen: exactly 5 taps on the mission list, then exactly 5 on the radar → Atlantis;
// in Atlantis the other way round (5 × radar, then 5 × missions) → straight to the fable creature
const seq = { s: '', last: 0 };
function seqPress(k) {
  if (!game || game.ended || game.race) return;
  const now = performance.now();
  if (now - seq.last > 2500) seq.s = '';
  seq.last = now;
  const target = game.atlantis ? 'rrrrrmmmmm' : 'mmmmmrrrrr';
  seq.s += k;
  if (!target.startsWith(seq.s)) seq.s = '';
  else if (seq.s === target) {
    seq.s = '';
    if (game.atlantis) game.goFable();
    else game.cheatComplete();
  }
}
document.getElementById('missions').addEventListener('pointerdown', () => seqPress('m'));
document.getElementById('radar').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  seqPress('r');
});
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest && e.target.closest('.legal .ver')) secretPress();
});

// ======================= key list (H) =======================
let helpPaused = false;
function toggleHelp(force) {
  const el = $('#help');
  const open = force ?? el.classList.contains('hidden');
  if (open) {
    el.innerHTML = `<div class="help-box"><h2>⌨ ${t('helpTitle')}</h2><div class="help-grid">${t('helpKeys').map(([k, v]) => `<kbd>${escapeHtml(k)}</kbd><span>${escapeHtml(v)}</span>`).join('')}</div><p class="help-close">${t('helpClose')}</p></div>`;
    el.classList.remove('hidden');
    el.onclick = () => toggleHelp(false);
    if (game && !game.ended && !game.multi && !game.paused) {
      game.paused = true;
      helpPaused = true;
    }
  } else {
    el.classList.add('hidden');
    if (helpPaused && game && !game.ended) game.paused = false;
    helpPaused = false;
  }
}

function resume() {
  closeModal();
  hideCard();
  if (game) {
    game.paused = false;
    input.enabled = !game.ended;
  }
}

const askHistory = [];
function openAsk() {
  if (!game) return;
  if (!game.multi) game.paused = true;
  input.enabled = false;
  const sugKeys = ['sug_pressure', 'sug_dark', 'sug_trench', 'sug_explored', 'sug_glow', 'sug_food', 'sug_people', 'sug_fantasy'];
  const renderLog = () =>
    askHistory.map((m) => `<div class="msg ${m.who}">${escapeHtml(m.text)}</div>`).join('') ||
    `<div class="msg echo">${escapeHtml(L({ en: 'Hi! I am Dr. Echo, the AI scientist on board. What would you like to know?', de: 'Hallo! Ich bin Dr. Echo, die KI-Wissenschaftlerin an Bord. Was möchtest du wissen?' }))}</div>`;
  $('#askSheet').innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div class="avatar"><span></span><span></span><span></span></div><h1 style="margin:0">${t('askTitle')}</h1><button class="btn small secondary" id="aClose" style="margin-left:auto">${t('close')}</button></div>
    <div id="askLog">${renderLog()}</div>
    <div class="sugs">${sugKeys.map((k) => `<button class="sug" data-q="${escapeHtml(t(k))}">${escapeHtml(t(k))}</button>`).join('')}</div>
    <form class="askrow" id="aForm"><input id="aInput" type="text" placeholder="${t('askPlaceholder')}" autocomplete="off" maxlength="200"><button class="btn" type="submit">${t('askSend')}</button></form>`;
  $('#ask').classList.remove('hidden');
  const log = $('#askLog');
  log.scrollTop = log.scrollHeight;
  const send = async (q) => {
    q = q.trim();
    if (!q) return;
    askHistory.push({ who: 'me', text: q });
    log.innerHTML = renderLog() + `<div class="msg echo" id="aThink">${t('askThinking')}</div>`;
    log.scrollTop = log.scrollHeight;
    const depth = game ? game.depth() : 0;
    const answer = await ask(q, {
      tier: tier(),
      depth,
      temp: game ? game.temperature(depth) : 4,
      maxDepth: game ? game.level.maxDepth : 10924,
      levelName: game ? L(game.level.name) : '',
      discoveries: game ? game.found.map((f) => L(f.def.name)) : [],
    });
    askHistory.push({ who: 'echo', text: answer });
    if (askHistory.length > 30) askHistory.splice(0, askHistory.length - 30);
    log.innerHTML = renderLog();
    log.scrollTop = log.scrollHeight;
  };
  $('#askSheet').querySelectorAll('.sug').forEach((b) => (b.onclick = () => send(b.dataset.q)));
  $('#aForm').onsubmit = (e) => {
    e.preventDefault();
    const v = $('#aInput').value;
    $('#aInput').value = '';
    send(v);
  };
  $('#aClose').onclick = closeAsk;
}
function closeAsk() {
  $('#ask').classList.add('hidden');
  if (game) {
    game.paused = false;
    input.enabled = !game.ended;
  }
}

// ======================= input wiring =======================
input.on('sonar', () => game && game.actSonar());
input.on('light', () => game && game.actLight());
input.on('photo', () => game && game.actPhoto());
input.on('grab', () => game && game.actGrab());
input.on('surface', () => game && game.actSurface());
input.on('ask', () => game && !game.ended && openAsk());
input.on('mute', cycleSound);
input.on('boost', () => game && game.actBoost());
input.on('help', () => toggleHelp());
input.on('map', () => game && !game.ended && game.mapView && game.mapView.toggle());
document.querySelector('#map .map-x').addEventListener('click', () => game && game.mapView && game.mapView.toggle(false));
input.on('escape', () => {
  if (cardOpen && cardOpen.big) return closeCard();
  if (!$('#help').classList.contains('hidden')) return toggleHelp(false);
  if (!$('#ask').classList.contains('hidden')) return closeAsk();
  if (game && !game.ended) {
    if (!$('#modal').classList.contains('hidden')) resume();
    else showPause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && !game.multi && !game.ended && !game.paused) showPause();
});

// a picture of Atlantis for the results (rendered once from a nice spot above the plaza)
function snapAtlantis(g) {
  const a = g.atlantis;
  if (!a) return;
  const was = { city: a.group.visible, life: a.life.visible, hall: a.hall.visible, scale: a.group.scale.y };
  a.group.visible = a.life.visible = true;
  a.hall.visible = false;
  a.group.scale.y = 1;
  try {
    const w = 640, h = 360;
    const cam = new THREE.PerspectiveCamera(52, w / h, 0.5, 2000);
    const ang = a.plaza.a + 0.55;
    cam.position.set(a.center.x + Math.cos(ang) * 96, a.center.y + 38, a.center.z + Math.sin(ang) * 96);
    cam.lookAt(a.center.x, a.center.y + 14, a.center.z);
    const rt = new THREE.WebGLRenderTarget(w, h);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    renderer.setRenderTarget(rt);
    renderer.render(g.scene, cam);
    const buf = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    renderer.setRenderTarget(null);
    rt.dispose();
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    g.atlSnap = cv.toDataURL('image/jpeg', 0.86);
  } catch (e) {
    renderer.setRenderTarget(null);
    g.atlSnap = 'none';
    console.warn('Atlantis picture failed', e);
  }
  a.group.visible = was.city;
  a.life.visible = was.life;
  a.hall.visible = was.hall;
  a.group.scale.y = was.scale;
}

// ======================= main loop =======================
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game) {
    game.update(dt);
    renderer.render(game.scene, camera);
    if (game.wantSnap) {
      game.wantSnap = false;
      snapAtlantis(game);
    }
  } else if (aquarium && $('#c').style.visibility !== 'hidden') {
    aquarium.update(dt);
    renderer.render(aquarium.scene, aquarium.camera);
  }
}

// ======================= camera orbit (mouse / touch drag) =======================
const camDrag = { active: false, id: null, x: 0, y: 0, lastTap: 0, tapX: 0, tapY: 0, hinted: false };
function resetView() {
  if (!game) return;
  game.orbit.reset = true;
  audio.click();
}
function bindCameraDrag() {
  const c = $('#c');
  c.addEventListener('pointerdown', (e) => {
    if (!game || game.ended) return;
    if (game.launch && !game.launch.done) {
      game.launch.skip();
      return;
    }
    if (game.recovery && !game.recovery.done) {
      game.recovery.skip();
      return;
    }
    // double tap on the sub: back to the view from behind; 10 taps on it: Santa Claus
    const now = performance.now();
    {
      const p = game.sub.pos.clone().project(camera);
      const sx = (p.x * 0.5 + 0.5) * window.innerWidth, sy = (-p.y * 0.5 + 0.5) * window.innerHeight;
      const onSub = p.z < 1 && Math.hypot(e.clientX - sx, e.clientY - sy) < Math.max(90, Math.min(window.innerWidth, window.innerHeight) * 0.16);
      camDrag.subTaps = onSub && now - (camDrag.subLast || 0) < 2000 ? (camDrag.subTaps || 0) + 1 : onSub ? 1 : 0;
      camDrag.subLast = now;
      if (camDrag.subTaps >= 10) {
        camDrag.subTaps = 0;
        game.summonSanta(true);
      }
    }
    if (now - camDrag.lastTap < 340 && Math.hypot(e.clientX - camDrag.tapX, e.clientY - camDrag.tapY) < 40) {
      const p = game.sub.pos.clone().project(camera);
      const sx = (p.x * 0.5 + 0.5) * window.innerWidth, sy = (-p.y * 0.5 + 0.5) * window.innerHeight;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < Math.max(110, Math.min(window.innerWidth, window.innerHeight) * 0.2)) resetView();
      camDrag.lastTap = 0;
    } else {
      camDrag.lastTap = now;
      camDrag.tapX = e.clientX;
      camDrag.tapY = e.clientY;
    }
    camDrag.active = true;
    camDrag.id = e.pointerId;
    camDrag.x = e.clientX;
    camDrag.y = e.clientY;
    try {
      c.setPointerCapture(e.pointerId);
    } catch (x) {
      /* ignore */
    }
  });
  c.addEventListener('pointermove', (e) => {
    if (!camDrag.active || e.pointerId !== camDrag.id || !game) return;
    const dx = e.clientX - camDrag.x, dy = e.clientY - camDrag.y;
    camDrag.x = e.clientX;
    camDrag.y = e.clientY;
    const o = game.orbit;
    o.reset = false;
    o.yaw = clamp(o.yaw - dx * 0.0075, -Math.PI, Math.PI);
    o.pitch = clamp(o.pitch + dy * 0.005, -0.8, 0.95);
    o.last = performance.now() / 1000;
    if (Math.abs(o.yaw) > 0.5 && !camDrag.hinted) {
      camDrag.hinted = true;
      toast(t('viewHint'));
    }
  });
  const end = (e) => {
    if (e.pointerId !== camDrag.id) return;
    camDrag.active = false;
    if (game) game.orbit.last = performance.now() / 1000;
  };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
  c.addEventListener('wheel', (e) => {
    if (!game) return;
    game.orbit.zoom = clamp(game.orbit.zoom + Math.sign(e.deltaY) * 1.5, -5, 16);
    e.preventDefault();
  }, { passive: false });
  bindPtt($('#radioPtt'));
  $('#radioQuick').onclick = (e) => {
    e.stopPropagation();
    toggleQuickMenu();
  };
  const typing = (e) => /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '');
  window.addEventListener('keydown', (e) => {
    if (!radio || typing(e) || e.repeat) return;
    if (e.code === 'KeyR') radioPress();
    else if (e.code === 'KeyT') toggleQuickMenu();
    else if (/^Digit[1-8]$/.test(e.code) && !$('#radioMenu').classList.contains('hidden')) {
      sendQuickCall(QUICK_CALLS[Number(e.code.slice(5)) - 1].k);
      toggleQuickMenu(false);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyR' && radio) radioRelease();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && game && !game.ended) resetView();
    if (game && game.launch && !game.launch.done && ['Space', 'Enter', 'Escape', 'KeyW', 'ArrowUp', 'ArrowDown', 'KeyS'].includes(e.code)) game.launch.skip();
    if (game && game.recovery && !game.recovery.done && ['Space', 'Enter', 'Escape'].includes(e.code)) game.recovery.skip();
  });
}

// ======================= boot =======================
async function boot() {
  window.SUBPILOT = { game: null, profile, net, startDive, levels: LEVELS, input };
  window.HADAL = window.SUBPILOT; // old name, kept for the test scripts
  Object.defineProperty(window.SUBPILOT, 'radio', { get: () => radio });
  Object.defineProperty(window.SUBPILOT, 'camera', { get: () => camera });
  try {
    initRenderer();
  } catch (e) {
    $('#loadingText').textContent = 'Your browser does not support WebGL / Dein Browser unterstützt kein WebGL.';
    return;
  }
  input.bindTouch($('#hud'));
  bindCameraDrag();
  try {
    aquarium = new Aquarium();
    aquarium.pixelRatio = renderer.getPixelRatio();
    aquarium.resize(window.innerWidth, window.innerHeight);
    aquarium.onLand = (i) => {
      if (audio.ctx && audio.ctx.state === 'running' && !$('#intro').classList.contains('hidden')) audio.pop(i);
    };
    window.SUBPILOT.aquarium = aquarium;
  } catch (e) {
    console.warn('Intro scene failed', e);
    aquarium = null;
  }
  await net.init();
  recordVisit(net);
  // progress from the cloud (same name on another device)
  syncProfile().then((changed) => changed && !game && $('#menu') && !$('#menu').classList.contains('hidden') && renderMenu());
  $('#loading').classList.add('hidden');
  requestAnimationFrame(loop);

  const auto = params.get('autostart');
  if (auto) {
    if (!profile.name) {
      profile.name = 'Tester';
      profile.age = Number(params.get('age')) || 12;
      saveProfile();
    }
    if (params.get('lang')) setLang(params.get('lang'));
    startDive({ level: levelById(auto), mode: params.get('mode') === 'race' ? 'race' : 'expedition', seed: Number(params.get('seed')) || 12345 });
    return;
  }

  const afterProfile = () => {
    renderMenu();
    const room = params.get('room');
    if (room) {
      if (net.mpAvailable) joinByCode(room, null);
      else showMultiplayer();
    }
  };
  const afterIntro = () => {
    if (!profile.name || !profile.age) {
      if (aquarium) aquarium.setMode('menu');
      showInfo(() => showWelcome(afterProfile));
    } else {
      renderMenu();
      showInfo(afterProfile);
    }
  };
  if (params.get('nointro') === '1') afterIntro();
  else showIntro(afterIntro);
}

boot();
