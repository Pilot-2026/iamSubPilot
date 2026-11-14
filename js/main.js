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
import { pickQuestions, tierForAge } from './data/quiz.js';
import { makeMissions, missionText, updateMissions } from './missions.js';
import { ask, line, zoneKey } from './scientist.js';
import { t, L, setLang, getLang, detectLang, fmtNum, fmtDec } from './i18n.js';
import { mulberry32, clamp, escapeHtml } from './util.js';
import { GAME_VERSION } from './config.js';
import { shapeFor, capsuleEnds, closestSegSeg } from './collide.js';

const $ = (s) => document.querySelector(s);
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');
const params = new URLSearchParams(location.search);

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
  sub: 'hummel',
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
  const fantasy = def.kind === 'fantasy';
  const kid = tier() === 'kid';
  const badge = fantasy ? `<span class="badge fantasy">★ ${t('fantasy')}</span>` : `<span class="badge real">${t('real')}</span>`;
  const isNew = info.isNew ? `<span class="badge new">${t('newDiscovery')}</span>` : '';
  let body = `<p>${escapeHtml(L(def.fact))}</p>`;
  if (fantasy) {
    body += `<div class="note">${escapeHtml(t('fantasyNote'))}</div>`;
    body += `<p class="twist"><b>${t('realTwist')}:</b> ${escapeHtml(L(def.twist))}</p>`;
  } else if (!kid && def.more) {
    body += `<p>${escapeHtml(L(def.more))}</p>`;
  }
  const meta = info.depth !== undefined ? `<div class="meta">${t('foundAt', { depth: fmtNum(info.depth) })}${info.by ? ' · ' + escapeHtml(info.by) : ''}</div>` : '';
  el.className = fantasy ? 'fantasy' : '';
  el.innerHTML = `<button class="x" aria-label="${t('close')}">×</button>${badge}${isNew}
    <h3>${escapeHtml(L(def.name))}</h3>${def.sci ? `<div class="sci">${escapeHtml(def.sci)}</div>` : ''}
    ${meta}${body}${fantasy ? '' : sourceLink(def)}`;
  el.querySelector('.x').onclick = () => el.classList.remove('show');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(cardTimer);
  if (!info.stay) cardTimer = setTimeout(() => el.classList.remove('show'), 14000);
}
function hideCard() {
  $('#card').classList.remove('show');
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
  return `<div class="credit"><span class="credit-links"><a href="${AS}" ${ext}>www.Andreas-Schmoelzer.at</a><a href="${PF}" ${ext}>www.pilotFilm.at</a><span class="logos"><a class="logo-link as" href="${AS}" ${ext} aria-label="www.Andreas-Schmoelzer.at"><img src="assets/logo-schmoelzer.png" alt="Andreas Schmölzer Keynote-Speaker logo" width="176" height="26"></a><a class="logo-link pf" href="${PF}" ${ext} aria-label="www.pilotFilm.at"><img src="assets/logo-pilotfilm.png" alt="pilotFilm logo" width="127" height="30"></a><a class="logo-link me" href="${AS}" ${ext} aria-label="Andreas Schmölzer"><img src="assets/andreas-schmoelzer.png" alt="Portrait of Andreas Schmölzer" width="62" height="63" decoding="async" loading="lazy"></a></span></span>${socialHtml()}</div>
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
    <div class="field"><label for="wName">${t('nickname')}</label><input id="wName" type="text" maxlength="16" autocomplete="off" value="${escapeHtml(profile.name)}"><div class="hint" id="wNameHint"></div></div>
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
      if (!/^[\p{L}\p{N} _\-.]{2,16}$/u.test(name)) {
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
  ['sub', 'hummel', 220], ['sub', 'wolfshark', 240], ['sub', 'puffer', 170], ['sub', 'narwhal', 250], ['sub', 'octopus', 170], ['sub', 'rocket', 230], ['sub', 'ufo', 220],
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

function renderMenu() {
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
    <h2>${t('chooseTrench')}</h2>
    <div class="trenches">${cards}</div>
    <h2>${t('chooseSub')}</h2>
    <div class="subs">${SUB_MODELS.map((m) => `<button class="subcard ${m.id === subModelById(profile.sub).id ? 'sel' : ''}" data-sub="${m.id}">
      <img alt="" src="${subThumb(m.id)}"><b>${escapeHtml(L(m.name))}</b><span>${escapeHtml(L(m.desc))}</span></button>`).join('')}</div>
    <div class="modes">
      <button class="mode ${selMode === 'expedition' ? 'sel' : ''}" data-mode="expedition"><b>🔦 ${t('modeExpedition')}</b><span>${t('modeExpeditionDesc')}</span></button>
      <button class="mode ${selMode === 'race' ? 'sel' : ''}" data-mode="race"><b>🏁 ${t('modeRace')}</b><span>${t('modeRaceDesc')}</span></button>
    </div>
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
        showCard(def, { depth: profile.logbook[def.id].maxDepth, stay: true });
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
    </div>
    ${kind !== 'deepest' ? `<select id="lbLevel">${levelOpts}</select>` : ''}
    <div id="lbList" style="margin-top:10px">${t('loading')}</div>
    <div class="row-end"><button class="btn secondary" id="lbClose">${t('close')}</button></div>`, async (root) => {
    root.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => showLeaderboard(b.dataset.k, levelId)));
    const sel = root.querySelector('#lbLevel');
    if (sel) sel.onchange = () => showLeaderboard(kind, sel.value);
    root.querySelector('#lbClose').onclick = closeModal;
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
  if (radio || net.mode !== 'p2p' || !net.room || !net.room.peer) return;
  radio = new Radio(net, { onTalk: updateRadioUi, onError: () => toast(t('radioNoMic')) });
  if (!voiceAllowed()) radio.setEnabled(false); // under 14: quick calls only
  radio.sync(net.room.players);
  updateRadioUi();
}

function leaveRoomAll() {
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
  return r.players < 4;
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

function showMultiplayer() {
  audio.init();
  if (!net.mpAvailable) {
    showModal(`<h1>👥 ${t('mpTitle')}</h1><p>${t('mpOffline')}</p><div class="row-end"><button class="btn secondary" id="mpClose">${t('close')}</button></div>`, (r) => {
      r.querySelector('#mpClose').onclick = closeModal;
    });
    return;
  }
  const levelOpts = LEVELS.map((l) => `<option value="${l.id}" ${l.id === selLevel ? 'selected' : ''}>${escapeHtml(L(l.name))} (${fmtNum(l.maxDepth)} m)</option>`).join('');
  showModal(`<h1>👥 ${t('mpTitle')}</h1>
    <p style="margin-top:0;color:#1d1d1d">${t('mpPublicNote')}</p>
    <button class="btn big mp-quick" id="mpQuick">⚡ ${t('mpQuickPlay')}</button>
    <div class="hint" id="mpHint" style="text-align:center">${t('mpQuickPlayDesc')}</div>
    <h2 style="margin-top:16px">${t('mpOpenRooms')} <button class="btn small secondary" id="mpRefresh" style="margin-left:8px">🔄</button></h2>
    <div class="rooms" id="mpRooms"><div class="hint">${t('mpSearching')}</div></div>
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
      box.innerHTML = rooms.length
        ? rooms
            .map((r) => {
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
        rooms.sort((a, b) => (a.status === 'running') - (b.status === 'running') || b.players - a.players);
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
    const msg = e.message === 'notfound' ? t('mpNotFound') : e.message === 'full' ? t('mpFull') : e.message === 'p2p' || e.message === 'timeout' ? t('mpNoConn') : String(e.message || e);
    if (hintEl) hintEl.textContent = msg;
    else toast(msg);
  }
}
const joinByCode = joinRoomCode; // ?room= links still work

function closeLobby() {
  lobbyOpen = false;
  clearInterval(lobbyTimer);
  lobbyTimer = null;
}

function openLobby(autoJoin = false) {
  lobbyOpen = true;
  net.on('meta', onRoomMeta);
  net.on('players', onRoomPlayers);
  net.on('event', (ev) => (ev.type === 'radio' ? onQuickCall(ev) : game && game.onNetEvent(ev)));
  createRadio();
  net.on('closed', () => {
    closeLobby();
    leaveRoomAll();
    toast(t('mpHostLeft'));
    if (!game) closeModal();
  });
  history.replaceState(null, '', location.pathname);
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
    this.missions = this.race ? [] : makeMissions(level, this.cm, this.rng);
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
    if (this.multi && net.room) this.syncPlayers(net.room.players);
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
    $('#radar').classList.toggle('hidden', !this.multi);
    $('#lEnergy').textContent = t('energy');
    $('#lHull').textContent = t('hull');
    $('#lLife').textContent = t('life');
    $('#tLight').textContent = t('btnLight');
    $('#tSonar').textContent = t('btnSonar');
    $('#tPhoto').textContent = t('btnPhoto');
    $('#tGrab').textContent = t('btnGrab');
    $('#tAsk').textContent = t('btnAsk');
    $('#tSurface').textContent = t('btnSurface');
    $('#tUp').textContent = t('btnUp');
    $('#tDown').textContent = t('btnDown');
    $('#keysHint').textContent = t('keysHint');
    updateSoundBtn();
    $('#bLight').classList.add('on');
    const gmax = this.level.maxDepth;
    $('#gaugeHull').style.display = !this.race && this.hullRating < gmax ? 'block' : 'none';
    $('#gaugeHull').style.top = `${(this.hullRating / gmax) * 100}%`;
    this.renderMissions();
  }

  renderMissions() {
    if (this.race) return;
    $('#missions').innerHTML = `<div class="mtitle">${t('missions')}</div>` +
      this.missions.map((m) => `<div class="m ${m.done ? 'done' : ''}"><span class="box"></span><span>${escapeHtml(missionText(m))}</span></div>`).join('');
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
    if (this.multi && this.multi.coop) net.sendEvent({ type: 'collect', item: it.id, kind: it.def.id, name: profile.name });
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

  emergency(reason) {
    if (this.ending) return;
    this.ending = { emergency: true, reason };
    this.sub.autoAscent = true;
    audio.alarm();
    toast(t('emergency'), t('emergencyWhy_' + reason));
    echoSay(`${t('emergency')} ${t('emergencyWhy_' + reason)}`, { now: true });
  }

  discover(def, { team = false, by = null } = {}) {
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
    this.found.push({ def, isNew, team, depth });
    if (def.kind === 'real') this.realCount++;
    if (def.kind === 'fantasy') this.fantasyCount++;
    if (def.kind === 'fantasy') audio.fantasy(def.sound);
    else audio.discovery();
    if (team) toast(t('teamFound', { name: by || '?', what: L(def.name) }));
    else toast(isNew ? t('newDiscovery') : L(def.name), isNew ? L(def.name) : '');
    showCard(def, { depth, isNew, by: team ? by : null });
    if (!team) {
      if (def.kind === 'fantasy') {
        echoSay(L({ en: 'Ha! That one is pure fantasy – but its card hides a real fact.', de: 'Ha! Das ist reine Fantasie – aber seine Karte verrät einen echten Fakt.' }));
      } else {
        const first = (L(def.fact).match(/[^.!?]+[.!?]/) || [L(def.fact)])[0];
        echoSay(`${L(def.name)}! ${first}`);
      }
      if (this.multi && this.multi.coop) net.sendEvent({ type: 'discover', id: def.id, name: profile.name });
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
    this.renderMissions();
  }

  // ---------- network ----------
  syncPlayers(players) {
    if (!players) return;
    const ids = new Set();
    for (const [uid, p] of Object.entries(players)) {
      if (uid === net.uid) continue;
      ids.add(uid);
      let r = this.remote.get(uid);
      if (!r) {
        r = new RemoteSub(this.scene, colorFor(uid, players), p.name || '?', subModelById(p.sub).id);
        this.remote.set(uid, r);
      }
      r.data = p;
      if (p.s) r.setState(p.s);
      r.setTalking(!!p.talk);
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
      const d = p.s ? fmtNum(Math.max(0, -p.s.y * SCALE)) + ' m' : '';
      const extra = this.race && p.finish ? ` ✓ ${fmtTime(p.finish)}` : '';
      const mute = radio && radio.enabled && uid !== net.uid ? ` <button class="mute" data-mute="${escapeHtml(uid)}">${radio.mutedUids.has(uid) ? '🔇' : '🔊'}</button>` : '';
      return `<div><i style="background:${hexColor(colorFor(uid, players))}"></i>${p.talk ? '🎙 ' : ''}${escapeHtml(p.name || '?')}${uid === net.uid ? '' : ' · ' + d}${extra}${mute}</div>`;
    });
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
      const it = this.cm.byId(ev.item);
      if (it && !it.collected) this.cm.remove(it);
      this.countCollect(ev.kind);
    } else if (ev.type === 'map' && this.multi.coop) {
      this.world.applyCells(ev.cells || [], ev.circle);
      this.checkMissions();
    }
  }

  // ---------- solid bodies: subs bounce off each other, animals and objects can't be passed through ----------
  collide(dt) {
    if (this.launch && !this.launch.done) return;
    const sub = this.sub;
    const S = (this.subShape ||= shapeFor('sub-' + sub.group.userData.type, sub.group));
    if (!S) return;
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
    if (!n) {
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
    const racePre = this.race && Date.now() < this.raceStartLocal;
    let inp = racePre || this.ended || launching ? ZERO_INPUT : input.state();
    this.sub.update(dt, inp);
    const depth = this.depth();
    this.maxDepth = Math.max(this.maxDepth, depth);

    // resources
    if (!this.race && !this.ended && !launching) {
      const drain = (0.07 + this.sub.thrust * 0.11 + (this.sub.lightOn ? 0.05 : 0)) / this.batteryCap;
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
      if (!this.race) this.hull -= this.sub.impact * 10;
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
    if (!this.race) {
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

    // deepest point
    const dp = this.cm.deepest;
    if (!this.atDeepest && Math.hypot(this.sub.pos.x - dp.x, this.sub.pos.z - dp.z) < 22 && this.sub.pos.y - dp.y < 14) {
      this.atDeepest = true;
      echoSay(line('deepest'), { now: true });
      toast(t('deepestFound'), `${fmtNum(-dp.y * SCALE)} m`);
      audio.mission();
      this.checkMissions();
    }

    // creatures, targets
    const light = this.sub.lightInfo();
    this.cm.update(dt, this.sub, light);
    this.collide(dt);
    this.target = this.race ? null : this.cm.findPhotoTarget(this.sub, light);
    this.grabTarget = this.race ? null : this.cm.findGrabTarget(this.sub);
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
    this.sub.group.userData.beam.material.uniforms.opacity.value = 0.06 * clamp((depth - 150) / 600, 0, 1);
    this.sub.group.userData.glowMat.opacity = 0.75 * clamp((depth - 100) / 500, 0, 1);
    this.world.update(dt);
    this.schools.update(dt, this.sub, camera.position);
    const launchCam = this.launch ? this.launch.update(dt, camera) : false;
    if (!launchCam) this.updateCamera(dt);
    this.updateFx(dt);

    // remote subs + network
    for (const r of this.remote.values()) r.update(dt);
    if (this.multi) this.drawRadar(dt);
    if (this.multi) {
      this.netTimer -= dt;
      if (this.netTimer <= 0) {
        this.netTimer = 0.12;
        const p = this.sub.pos;
        net.sendState({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 10) / 10, yaw: Math.round(this.sub.yaw * 100) / 100, l: this.sub.lightOn ? 1 : 0 });
      }
    }

    // surfaced?
    if (this.ending && !this.ended && this.sub.pos.y > -3) this.finish();

    audio.setEngine(clamp(this.sub.thrust + Math.abs(this.sub.vel.y) / 30, 0, 1));
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
    const dist = 12 + fall * 0.6 + o.zoom - low * 2;
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
    camera.position.copy(this.camPos);
    if (this.shake > 0) {
      const a = Math.min(1, this.shake) * 0.35;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
    const ahead = s.pos.clone().addScaledVector(fwd, 18).add(new THREE.Vector3(0, -1 - fall * 1.2, 0));
    const atSub = s.pos.clone().add(new THREE.Vector3(0, 0.5, 0));
    const free = clamp(Math.abs(o.yaw) / 0.7 + Math.abs(o.pitch) / 0.5, 0, 1);
    camera.lookAt(ahead.lerp(atSub, free));
  }

  updateHud(depth) {
    $('#hDepth').textContent = fmtNum(depth);
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

  finish() {
    if (this.ended) return;
    this.ended = true;
    input.enabled = false;
    audio.stopLoops();
    if (this.multi) net.setPlayer({ done: true });
    showResults(this);
  }

  dispose() {
    audio.winch(false);
    $('#skipHint').classList.add('hidden');
    this.contactEls.forEach((e) => e.remove());
    for (const r of this.remote.values()) r.dispose(this.scene);
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
  $('#menu').classList.add('hidden');
  $('#menuBg').classList.add('hidden');
  $('#intro').classList.add('hidden');
  $('#passers').innerHTML = '';
  $('#c').style.visibility = 'visible';
  audio.music('dive');
  game = new Dive(opts);
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
  const sub = disc + samples + missions + mapped + depthB;
  const total = g.ending && g.ending.emergency ? Math.round(sub * 0.5) : sub;
  return { disc, samples, missions, mapped, depthB, total, missionsDone: g.missions.filter((m) => m.done).length };
}

function showResults(g) {
  setTimeout(hideCard, 60);
  $('#hud').classList.add('hidden');
  if (g.race) return showRaceResults(g);
  const sc = computeScore(g);
  const emergency = g.ending && g.ending.emergency;
  const foundHtml = g.found.map((f) => `<span class="${f.def.kind === 'fantasy' ? 'f' : ''}">${f.def.kind === 'fantasy' ? '★ ' : ''}${escapeHtml(L(f.def.name))}${f.isNew ? ' ✨' : ''}</span>`).join('');
  showModal(`<h1>${emergency ? '⚠ ' + t('diveEmergency') : '✅ ' + t('diveComplete')}</h1>
    <p>${escapeHtml(L(g.level.name))} · ${t('maxDepth')}: <b>${fmtNum(g.maxDepth)} m</b></p>
    <div class="found">${foundHtml}</div>
    <div class="score-list">
      <span>${t('discoveries')} (${g.found.length})</span><span>${fmtNum(sc.disc)}</span>
      <span>${t('samples')}</span><span>${fmtNum(sc.samples)}</span>
      <span>${t('missionsDone')} (${sc.missionsDone}/${g.missions.length})</span><span>${fmtNum(sc.missions)}</span>
      <span>${t('mapped')} (${fmtDec(g.world.mappedPercent(), 1)} %)</span><span>${fmtNum(sc.mapped)}</span>
      <span>${t('depthBonus')}</span><span>${fmtNum(sc.depthB)}</span>
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
  });
}

function runQuiz(g, sc) {
  const topics = ['general', ...g.found.map((f) => f.def.id)];
  if (g.fantasyCount) topics.push('fantasy');
  const qs = pickQuestions(tier(), topics, 3, getLang(), profile.seenQuestions);
  let i = 0;
  let correct = 0;
  const show = () => {
    const q = qs[i];
    showModal(`<h1>💬 ${t('debriefTitle')}</h1><div class="qprog">${i === 0 ? t('debriefIntro') + ' · ' : ''}${i + 1}/${qs.length}</div>
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
          profile.seenQuestions = [...profile.seenQuestions, q.key].slice(-24);
          root.querySelector('#qNext').classList.remove('hidden');
        };
      });
      root.querySelector('#qNext').onclick = () => {
        i++;
        if (i < qs.length) show();
        else finishQuiz(g, sc, correct);
      };
    });
  };
  if (qs.length) show();
  else finishQuiz(g, sc, 0);
}

async function finishQuiz(g, sc, correct) {
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
      <span>${t('quizBonus')} (${correct}/3)</span><span>${fmtNum(quiz)}</span>
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
    const list = Object.entries(net.room.players || {}).map(([u, p]) => ({ name: p.name, finish: p.finish, me: u === net.uid }));
    list.sort((a, b) => (a.finish ?? 1e9) - (b.finish ?? 1e9));
    standings = `<table class="lb">${list.map((p, i) => `<tr><td>${i + 1}.</td><td>${escapeHtml(p.name || '?')}${p.me ? ' ←' : ''}</td><td>${p.finish ? fmtTime(p.finish) : '…'}</td></tr>`).join('')}</table>`;
  }
  showModal(`<h1>🏁 ${t('raceResults')}</h1>
    <p>${escapeHtml(L(g.level.name))}</p>
    <div class="score-list"><span>${t('raceYourTime')}</span><span class="tot">${dnf ? '–' : fmtTime(time)}</span>
    ${dnf ? '' : `<span>${t('research')}</span><span>+150</span>`}</div>
    ${standings}
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
      <button class="btn secondary" id="pAbort">⚠ ${t('abort')}</button>
    </div>
    <p style="font-size:12px;color:var(--ink-soft);margin-top:14px">${t('keysHint')}</p>`, (root) => {
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
    root.querySelector('#pAbort').onclick = () => {
      resume();
      if (game.race) game.actSurface();
      else game.emergency('abort');
    };
  });
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
input.on('escape', () => {
  if (!$('#ask').classList.contains('hidden')) return closeAsk();
  if (game && !game.ended) {
    if (!$('#modal').classList.contains('hidden')) resume();
    else showPause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && !game.multi && !game.ended && !game.paused) showPause();
});

// ======================= main loop =======================
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game) {
    game.update(dt);
    renderer.render(game.scene, camera);
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
    // double tap on the sub: back to the view from behind
    const now = performance.now();
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
  });
}

// ======================= boot =======================
async function boot() {
  window.SUBPILOT = { game: null, profile, net, startDive, levels: LEVELS, input };
  window.HADAL = window.SUBPILOT; // old name, kept for the test scripts
  Object.defineProperty(window.SUBPILOT, 'radio', { get: () => radio });
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
