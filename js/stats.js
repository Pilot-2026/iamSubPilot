// Visit statistics. Only aggregated counters are stored (Firebase Firestore, if configured):
// day, hour, approximate country (from the time zone, no IP address), language, device type,
// new or returning (a first-visit date kept on this device only) and a few game events.
// The operator's own devices (where the statistics were opened) are counted separately.
// For the list of returning visitors each device keeps an anonymous random number (hadal.vid) – it says nothing
// about the person; it only lets the statistics count how often the same device came back.
// Without Firebase the page shows only this device's own numbers.

import { TZ_COUNTRY } from './data/tzcountry.js';
import { cloud } from './cloud.js';

const K_FIRST = 'hadal.firstVisit';
const K_OWNER = 'hadal.statsOwner';
const K_LOCAL = 'hadal.statsLocal';
const K_VID = 'hadal.vid';
function deviceId() {
  let v = localStorage.getItem(K_VID);
  if (!v || !/^[A-Za-z0-9_-]{6,24}$/.test(v)) {
    const a = new Uint8Array(9);
    crypto.getRandomValues(a);
    v = btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    try {
      localStorage.setItem(K_VID, v);
    } catch (e) { /* ignore */ }
  }
  return v;
}
export const myVisitorId = () => (localStorage.getItem(K_VID) || '').slice(0, 6);
const OWNER_TZ = 'Europe/Vienna'; // days and hours are counted in the operator's time zone

function partsIn(tz, d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) };
}

export function dayKey(d = new Date()) {
  return partsIn(OWNER_TZ, d).day;
}

function deviceType() {
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints > 0;
  if (/iPad|Tablet/i.test(ua) || (touch && /Macintosh/.test(ua)) || (touch && Math.min(screen.width, screen.height) >= 700)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua) || (touch && Math.min(screen.width, screen.height) < 700)) return 'phone';
  return 'desktop';
}

function countryCode() {
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch (e) { /* ignore */ }
  if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
  const lang = (navigator.language || '').split('-')[1];
  return lang && /^[A-Z]{2}$/.test(lang) ? lang : 'XX';
}

export const isOwner = () => localStorage.getItem(K_OWNER) === '1';
export function markOwner() {
  try {
    localStorage.setItem(K_OWNER, '1');
  } catch (e) { /* ignore */ }
}

export function visitInfo() {
  const p = partsIn(OWNER_TZ);
  let first = localStorage.getItem(K_FIRST);
  const returning = !!first && first !== p.day;
  if (!first) {
    first = p.day;
    try {
      localStorage.setItem(K_FIRST, first);
    } catch (e) { /* ignore */ }
  }
  return {
    day: p.day,
    hour: p.hour,
    wd: p.wd,
    cc: countryCode(),
    lang: (navigator.language || 'xx').slice(0, 2).toLowerCase(),
    dev: deviceType(),
    ret: returning,
    owner: isOwner(),
  };
}

// ---------- local copy (this device only) ----------
function localAdd(fn) {
  let s;
  try {
    s = JSON.parse(localStorage.getItem(K_LOCAL) || 'null');
  } catch (e) {
    s = null;
  }
  s = s || { all: {}, days: {}, recent: [] };
  fn(s);
  try {
    localStorage.setItem(K_LOCAL, JSON.stringify(s));
  } catch (e) { /* ignore */ }
}
const bump = (o, path, n = 1) => {
  const keys = path.split('.');
  let cur = o;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] = cur[keys[i]] || {};
  cur[keys[keys.length - 1]] = (cur[keys[keys.length - 1]] || 0) + n;
};

function visitFields(v) {
  const f = { visits: 1 };
  f[v.ret ? 'returning' : 'newVisitors'] = 1;
  f[`countries.${v.cc}`] = 1;
  f[`devices.${v.dev}`] = 1;
  f[`langs.${v.lang}`] = 1;
  f[`hours.h${String(v.hour).padStart(2, '0')}`] = 1;
  f[`weekdays.d${v.wd}`] = 1;
  return f;
}

// Firestore: setDoc(merge) with nested increments
function incDoc(net, id, fields) {
  const { doc, setDoc, increment } = net.fb;
  const data = {};
  for (const [path, n] of Object.entries(fields)) {
    const keys = path.split('.');
    let cur = data;
    for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] = cur[keys[i]] || {};
    cur[keys[keys.length - 1]] = increment(n);
  }
  return setDoc(doc(net.db, 'stats', id), data, { merge: true });
}

let visitDone = false;
export async function recordVisit(net) {
  if (visitDone) return;
  visitDone = true;
  const v = visitInfo();
  localAdd((s) => {
    for (const [k, n] of Object.entries(visitFields(v))) {
      bump(s.all, k, n);
      if (!k.includes('.') || k.startsWith('hours') || k.startsWith('countries')) bump((s.days[v.day] = s.days[v.day] || {}), k, n);
    }
    s.recent.unshift({ t: Date.now(), cc: v.cc, dev: v.dev, lang: v.lang, ret: v.ret });
    s.recent = s.recent.slice(0, 50);
  });
  // returning-visitor list (own Netlify site); tests and local runs are not counted
  if (!/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && !/[?&]autostart=/.test(location.search)) {
    try {
      cloud.visit({ vid: deviceId(), cc: v.cc, dev: v.dev, lang: v.lang, own: v.owner });
    } catch (e) { /* ignore */ }
  }
  if (!net || !net.db || !net.fb || !net.fb.increment) return;
  try {
    if (v.owner) {
      // the operator's own starts are only counted, not mixed into the statistics
      await incDoc(net, 'all', { ownerVisits: 1 });
      return;
    }
    const f = visitFields(v);
    const dayF = { visits: 1, [v.ret ? 'returning' : 'newVisitors']: 1, [`hours.h${String(v.hour).padStart(2, '0')}`]: 1, [`countries.${v.cc}`]: 1 };
    await Promise.all([
      incDoc(net, 'all', f),
      incDoc(net, 'd_' + v.day, dayF),
      net.fb.addDoc(net.fb.collection(net.db, 'visits'), { t: net.fb.serverTimestamp(), cc: v.cc, dev: v.dev, lang: v.lang, ret: v.ret, h: v.hour }),
    ]);
  } catch (e) {
    console.warn('statistics: visit not recorded', e);
  }
}

// game events: a dive was started (trench, sub, mode, multiplayer)
export async function recordDive(net, { level, sub, mode, multi }) {
  const v = { day: dayKey() };
  const f = { dives: 1, [`levels.${level}`]: 1, [`subs.${sub}`]: 1, [`modes.${mode}`]: 1 };
  if (multi) f.multiplayer = 1;
  localAdd((s) => {
    for (const [k, n] of Object.entries(f)) bump(s.all, k, n);
    bump((s.days[v.day] = s.days[v.day] || {}), 'dives', 1);
  });
  if (!net || !net.db || !net.fb || !net.fb.increment || isOwner()) return;
  try {
    await Promise.all([incDoc(net, 'all', f), incDoc(net, 'd_' + v.day, { dives: 1 })]);
  } catch (e) {
    console.warn('statistics: dive not recorded', e);
  }
}

// Everything the statistics pages need: totals, the last 30 days, the last 50 visits.
export async function loadStats(net, days = 30) {
  const keys = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) keys.push(dayKey(new Date(now - i * 86400000)));
  if (net && net.db && net.fb) {
    try {
      const { doc, getDoc, getDocs, collection, query, orderBy, limit } = net.fb;
      const [allSnap, daySnaps, recentSnap] = await Promise.all([
        getDoc(doc(net.db, 'stats', 'all')),
        Promise.all(keys.map((k) => getDoc(doc(net.db, 'stats', 'd_' + k)))),
        getDocs(query(collection(net.db, 'visits'), orderBy('t', 'desc'), limit(100))),
      ]);
      const recent = recentSnap.docs.map((d) => {
        const x = d.data();
        return { ...x, t: x.t && x.t.toMillis ? x.t.toMillis() : 0 };
      });
      const vis = await cloud.visitors();
      return { online: true, all: allSnap.exists() ? allSnap.data() : {}, days: keys.map((k, i) => ({ day: k, ...(daySnaps[i].exists() ? daySnaps[i].data() : {}) })), recent, visitors: vis && vis.visitors, visitorsTotal: vis && vis.total };
    } catch (e) {
      console.warn('statistics: could not load', e);
      return { online: false, error: true, ...localStats(keys) };
    }
  }
  const vis = await cloud.visitors();
  return { online: false, ...localStats(keys), visitors: vis && vis.visitors, visitorsTotal: vis && vis.total };
}

function localStats(keys) {
  let s;
  try {
    s = JSON.parse(localStorage.getItem(K_LOCAL) || 'null');
  } catch (e) {
    s = null;
  }
  s = s || { all: {}, days: {}, recent: [] };
  return { all: s.all, days: keys.map((k) => ({ day: k, ...(s.days[k] || {}) })), recent: s.recent };
}
