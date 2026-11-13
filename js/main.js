// HADAL – main game controller: menu, dives, results, multiplayer.

import * as THREE from './vendor/three.min.js';
import { World, SCALE, axisZ } from './world.js';
import { Sub, RemoteSub } from './sub.js';
import { CreatureManager } from './creatures.js';
import { Input } from './input.js';
import { audio } from './audio.js';
import { Net } from './net.js';
import { LEVELS, HULL_RATINGS, levelById } from './data/levels.js';
import { CREATURES } from './data/creatures.js';
import { pickQuestions, tierForAge } from './data/quiz.js';
import { makeMissions, missionText, updateMissions } from './missions.js';
import { ask, line, zoneKey } from './scientist.js';
import { t, L, setLang, getLang, detectLang, fmtNum, fmtDec } from './i18n.js';
import { mulberry32, clamp, escapeHtml } from './util.js';
import { GAME_VERSION } from './config.js';

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
  });
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

function showModal(html, onMount) {
  $('#sheet').innerHTML = html;
  $('#sheet').className = 'sheet' + (html.includes('data-wide') ? ' wide' : '');
  $('#modal').classList.remove('hidden');
  onMount && onMount($('#sheet'));
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#sheet').innerHTML = '';
}

function sourceLink(def) {
  if (!def.source) return '';
  return `<div class="src">${t('source')}: <a href="${def.source.url}" target="_blank" rel="noopener">${escapeHtml(def.source.label)}</a></div>`;
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

// ======================= welcome / profile =======================
function showWelcome(onDone) {
  const html = `
    <div class="logo" style="font-size:40px;text-align:center">HADAL</div>
    <h1>${t('welcomeTitle')}</h1>
    <p>${t('welcomeText')}</p>
    <div class="field"><label>${t('language')}</label>
      <div class="seg" id="wLang"><button data-l="en" class="${getLang() === 'en' ? 'on' : ''}">English</button><button data-l="de" class="${getLang() === 'de' ? 'on' : ''}">Deutsch</button></div></div>
    <div class="field"><label for="wName">${t('nickname')}</label><input id="wName" type="text" maxlength="16" autocomplete="off" value="${escapeHtml(profile.name)}"><div class="hint" id="wNameHint"></div></div>
    <div class="field"><label for="wAge">${t('age')}</label><input id="wAge" type="number" min="5" max="120" inputmode="numeric" value="${profile.age || ''}"><div class="hint" id="wAgeHint"></div></div>
    <div class="row-end"><button class="btn big" id="wGo">${t('letsGo')}</button></div>`;
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

// ======================= menu =======================
let selLevel = profile.lastLevel;
let selMode = profile.lastMode;

function renderMenu() {
  buildMenuBg();
  $('#menuBg').classList.remove('hidden');
  $('#c').style.visibility = 'hidden';
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
      <div class="title"><div class="logo">HADAL</div><div class="tagline">${t('tagline')}</div></div>
      <div class="chips">
        <button class="chip" id="mProfile">👤 ${escapeHtml(profile.name)} · ${tierLabel()}</button>
        <span class="chip">🔬 ${fmtNum(rpAvailable())} ${getLang() === 'de' ? 'FP' : 'RP'}</span>
        <span class="chip">🛡 ${fmtNum(hullRating)} m</span>
        <button class="chip" id="mLang">${getLang() === 'de' ? 'EN' : 'DE'}</button>
        <button class="chip" id="mSound">${audio.muted ? '🔇' : '🔊'}</button>
      </div>
    </div>
    <h2>${t('chooseTrench')}</h2>
    <div class="trenches">${cards}</div>
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
    <div class="menu-foot">${t('credit').replace('www.pilotFilm.at', '<a href="https://www.pilotfilm.at" target="_blank" rel="noopener">www.pilotFilm.at</a>')} · v${GAME_VERSION}</div>`;
  $('#menu').classList.remove('hidden');
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
  $('#mLang').onclick = () => {
    profile.lang = getLang() === 'de' ? 'en' : 'de';
    setLang(profile.lang);
    saveProfile();
    renderMenu();
  };
  $('#mSound').onclick = () => {
    audio.init();
    audio.setMuted(!audio.muted);
    renderMenu();
  };
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
  showModal(`<div data-wide></div><h1>📖 ${t('logbookTitle')} <small style="color:#8fb3c7;font-size:15px">${count}/${list.length}</small></h1>
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
    el.innerHTML = `<div style="font-size:12px;color:#8fb3c7;margin-bottom:6px">${res.online ? t('lbOnline') : t('lbLocal')}</div>` +
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
const PLAYER_COLORS = [0xf2a03d, 0x4dd2ff, 0x7dff8a, 0xff7ad9];
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
    <h2>${t('mpCreate')}</h2>
    <div class="modes">
      <button class="mode sel" data-mm="coop"><b>🤝 ${t('mpCoop')}</b><span>${t('mpCoopDesc')}</span></button>
      <button class="mode" data-mm="race"><b>🏁 ${t('mpRace')}</b><span>${t('mpRaceDesc')}</span></button>
    </div>
    <div class="field"><select id="mpLevel">${levelOpts}</select></div>
    <button class="btn" id="mpCreate">${t('mpCreate')}</button>
    <h2 style="margin-top:18px">${t('mpJoin')}</h2>
    <div class="askrow"><input id="mpCode" type="text" maxlength="4" placeholder="${t('mpCode')}" style="text-transform:uppercase"><button class="btn" id="mpJoin">${t('mpJoin')}</button></div>
    <div class="hint" id="mpHint"></div>
    <div class="row-end"><button class="btn secondary" id="mpClose">${t('close')}</button></div>`, (root) => {
    let mm = 'coop';
    root.querySelectorAll('[data-mm]').forEach((b) => {
      b.onclick = () => {
        mm = b.dataset.mm;
        root.querySelectorAll('[data-mm]').forEach((x) => x.classList.toggle('sel', x === b));
      };
    });
    root.querySelector('#mpClose').onclick = closeModal;
    root.querySelector('#mpCreate').onclick = async () => {
      try {
        await net.createRoom({ mode: mm, level: root.querySelector('#mpLevel').value, name: profile.name });
        openLobby();
      } catch (e) {
        root.querySelector('#mpHint').textContent = String(e.message || e);
      }
    };
    root.querySelector('#mpJoin').onclick = () => joinByCode(root.querySelector('#mpCode').value, root.querySelector('#mpHint'));
  });
}

async function joinByCode(code, hintEl) {
  try {
    await net.joinRoom(code, { name: profile.name });
    openLobby();
  } catch (e) {
    const msg = e.message === 'notfound' ? t('mpNotFound') : e.message === 'full' ? t('mpFull') : String(e.message || e);
    if (hintEl) hintEl.textContent = msg;
    else toast(msg);
  }
}

function roomLink() {
  return `${location.origin}${location.pathname}?room=${net.room.code}`;
}

function openLobby() {
  lobbyOpen = true;
  net.on('meta', onRoomMeta);
  net.on('players', onRoomPlayers);
  net.on('event', (ev) => game && game.onNetEvent(ev));
  renderLobby();
}

function renderLobby() {
  if (!net.room || game) return;
  const meta = net.room.meta || {};
  const host = net.isHost();
  const players = Object.entries(net.room.players || {});
  const plist = players.map(([u, p]) => `<div><i style="background:${hexColor(colorFor(u, net.room.players))}"></i>${escapeHtml(p.name || '?')}${meta.host === u ? ` <small style="color:#8fb3c7">(${t('mpHost')})</small>` : ''}${u === net.uid ? ' ←' : ''}</div>`).join('');
  const levelOpts = LEVELS.map((l) => `<option value="${l.id}" ${l.id === meta.level ? 'selected' : ''}>${escapeHtml(L(l.name))} (${fmtNum(l.maxDepth)} m)</option>`).join('');
  const lv = levelById(meta.level);
  showModal(`<h1>${t('mpLobby', { code: '' })}<span class="code">${net.room.code}</span></h1>
    <p>${t('mpShare')}</p><div class="link" id="lbLink">${escapeHtml(roomLink())}</div>
    <div class="row-end" style="justify-content:flex-start"><button class="btn small secondary" id="lbCopy">${t('mpCopy')}</button></div>
    <h2>${meta.mode === 'race' ? '🏁 ' + t('mpRace') : '🤝 ' + t('mpCoop')} · ${escapeHtml(L(lv.name))}</h2>
    ${host ? `<div class="field"><div class="seg" id="lbMode"><button data-m="coop" class="${meta.mode !== 'race' ? 'on' : ''}">${t('mpCoop')}</button><button data-m="race" class="${meta.mode === 'race' ? 'on' : ''}">${t('mpRace')}</button></div></div><div class="field"><select id="lbLevelSel">${levelOpts}</select></div>` : ''}
    <h2>${t('mpPlayers')} (${players.length}/4)</h2><div class="players">${plist}</div>
    <div class="row-end">
      <button class="btn secondary" id="lbLeave">${t('mpLeave')}</button>
      ${host ? `<button class="btn big" id="lbStart">${t('mpStart')}</button>` : `<span style="color:#8fb3c7">${t('mpWaitHost')}</span>`}
    </div>`, (root) => {
    root.querySelector('#lbCopy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(roomLink());
        root.querySelector('#lbCopy').textContent = t('mpCopied');
      } catch (e) {
        /* clipboard not available */
      }
    };
    root.querySelector('#lbLeave').onclick = () => {
      lobbyOpen = false;
      net.leaveRoom();
      closeModal();
      history.replaceState(null, '', location.pathname);
    };
    if (host) {
      root.querySelectorAll('#lbMode button').forEach((b) => (b.onclick = () => net.updateMeta({ mode: b.dataset.m })));
      root.querySelector('#lbLevelSel').onchange = (e) => net.updateMeta({ level: e.target.value });
      root.querySelector('#lbStart').onclick = () => net.startRoom({ seed: Math.floor(Math.random() * 1e9) });
    }
  });
}

function onRoomMeta(meta) {
  if (!meta) return;
  if (meta.status === 'running' && !game) {
    lobbyOpen = false;
    closeModal();
    startDive({
      level: levelById(meta.level),
      mode: meta.mode === 'race' ? 'race' : 'expedition',
      seed: meta.seed,
      multi: { coop: meta.mode !== 'race', startAt: meta.startAt },
    });
  } else if (lobbyOpen && !game) renderLobby();
}

function onRoomPlayers(players) {
  if (game) game.syncPlayers(players);
  else if (lobbyOpen) renderLobby();
  if (resultsRace) renderRaceStandings();
}

// ======================= the dive =======================
const ZERO_INPUT = { throttle: 0, turn: 0, vertical: 0, boost: false };

class Dive {
  constructor({ level, mode, seed, multi }) {
    this.level = level;
    this.mode = mode;
    this.multi = multi || null;
    this.seed = seed;
    this.scene = new THREE.Scene();
    this.world = new World(this.scene, level);
    this.sub = new Sub(this.scene, this.world, profile.upgrades);
    if (this.multi && net.room) {
      const myColor = colorFor(net.uid, net.room.players);
      this.sub.group.traverse((o) => {
        if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xf2a03d) {
          o.material = o.material.clone();
          o.material.color.set(myColor);
        }
      });
    }
    const sp = this.world.shipPos;
    let slot = 0;
    if (this.multi && net.room) {
      const order = Object.entries(net.room.players || {}).sort((a, b) => (a[1].joined || 0) - (b[1].joined || 0)).map(([u]) => u);
      slot = Math.max(0, order.indexOf(net.uid));
    }
    this.sub.pos.set(sp.x + 6 - (slot % 2) * 7, -2, sp.z + (slot - 1.5) * 9 * (this.multi ? 1 : 0));
    this.sub.yaw = -Math.PI / 2;
    this.cm = new CreatureManager(this.scene, this.world, level, seed);
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
    echoSay(line(this.race ? 'raceStart' : isTouch ? 'diveStartTouch' : 'diveStart'), { now: true });
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
    this.raceStartLocal = this.multi && this.multi.startAt ? this.multi.startAt - net.offset : Date.now() + 3500;
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

  actGrab() {
    if (!this.canAct()) return;
    const it = this.grabTarget;
    if (!it) return;
    this.cm.remove(it);
    audio.grab();
    this.countCollect(it.def.id);
    if (!this.photographed.has(it.def.id)) this.discover(it.def, {});
    else toast(`+1 ${L(it.def.name)}`);
    if (this.multi && this.multi.coop) net.sendEvent({ type: 'collect', item: it.id, kind: it.def.id, name: profile.name });
  }

  countCollect(kind) {
    if (kind === 'nodule') this.nodules++;
    else if (kind === 'litter') this.litter++;
    else if (kind === 'lander') this.landerFound = true;
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
        r = new RemoteSub(this.scene, colorFor(uid, players), p.name || '?');
        this.remote.set(uid, r);
      }
      r.data = p;
      if (p.s) r.setState(p.s);
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
      return `<div><i style="background:${hexColor(colorFor(uid, players))}"></i>${escapeHtml(p.name || '?')}${uid === net.uid ? '' : ' · ' + d}${extra}</div>`;
    });
    $('#team').innerHTML = rows.join('');
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

  // ---------- per frame ----------
  update(dt) {
    if (this.paused) return;
    this.time += dt;
    const racePre = this.race && Date.now() < this.raceStartLocal;
    let inp = racePre || this.ended ? ZERO_INPUT : input.state();
    this.sub.update(dt, inp);
    const depth = this.depth();
    this.maxDepth = Math.max(this.maxDepth, depth);

    // resources
    if (!this.race && !this.ended) {
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
    this.world.update(dt);
    this.updateCamera(dt);

    // remote subs + network
    for (const r of this.remote.values()) r.update(dt);
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
      audio.ring();
      this.ringIndex++;
      if (this.ringIndex >= this.rings.length) {
        this.raceFinished = (now - this.raceStartLocal) / 1000;
        toast(t('raceFinished'), fmtTime(this.raceFinished));
        audio.mission();
        if (this.multi) net.setPlayer({ finish: this.raceFinished });
        this.ending = { emergency: false, race: true };
        setTimeout(() => this.finish(), 1800);
      } else this.highlightRing();
    }
  }

  updateCamera(dt) {
    const s = this.sub;
    const fwd = s.forward();
    const fall = clamp(-s.vel.y * 0.08, 0, 5);
    const desired = s.pos.clone().addScaledVector(fwd, -12 - fall * 0.6).add(new THREE.Vector3(0, 6.2 + fall, 0));
    this.camPos.lerp(desired, 1 - Math.exp(-dt * 4));
    const ty = this.world.heightAt(this.camPos.x, this.camPos.z) + 1.5;
    if (this.camPos.y < ty) this.camPos.y = ty;
    if (this.camPos.y > -0.5) this.camPos.y = -0.5;
    camera.position.copy(this.camPos);
    if (this.shake > 0) {
      const a = Math.min(1, this.shake) * 0.35;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
    const look = s.pos.clone().addScaledVector(fwd, 18).add(new THREE.Vector3(0, -1 - fall * 1.2, 0));
    camera.lookAt(look);
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
  $('#c').style.visibility = 'visible';
  game = new Dive(opts);
  window.HADAL.game = game;
  input.enabled = true;
}

function endGame() {
  if (!game) return;
  game.dispose();
  game = null;
  window.HADAL.game = null;
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
  const samples = g.nodules * 40 + g.litter * 60 + (g.landerFound ? 250 : 0);
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
    <div class="row-end"><button class="btn big" id="rQuiz">💬 ${t('debriefTitle')}</button></div>`, (root) => {
    root.querySelector('#rQuiz').onclick = () => runQuiz(g, sc);
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
      if (inRoom) net.leaveRoom();
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
      if (inRoom) net.leaveRoom();
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
      <button class="btn secondary" id="pSound">${audio.muted ? '🔊 ' + t('soundOn') : '🔇 ' + t('soundOff')}</button>
      <button class="btn secondary" id="pAbort">⚠ ${t('abort')}</button>
    </div>
    <p style="font-size:12px;color:#8fb3c7;margin-top:14px">${t('keysHint')}</p>`, (root) => {
    root.querySelector('#pResume').onclick = resume;
    root.querySelector('#pAsk').onclick = () => {
      closeModal();
      openAsk();
    };
    root.querySelector('#pLog').onclick = () => showLogbook('real');
    root.querySelector('#pSound').onclick = () => {
      audio.setMuted(!audio.muted);
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
input.on('mute', () => audio.setMuted(!audio.muted));
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
  }
}

// ======================= boot =======================
async function boot() {
  window.HADAL = { game: null, profile, net, startDive, levels: LEVELS, input };
  try {
    initRenderer();
  } catch (e) {
    $('#loadingText').textContent = 'Your browser does not support WebGL / Dein Browser unterstützt kein WebGL.';
    return;
  }
  input.bindTouch($('#hud'));
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
  if (!profile.name || !profile.age) {
    buildMenuBg();
    showWelcome(afterProfile);
  } else afterProfile();
}

boot();
