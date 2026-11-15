// Cloud profiles (same diver name = same progress on every device) and the returning-visitor list for the
// statistics. Pure helpers here (checked and tested without Netlify); the functions keep the data in Netlify Blobs.
import { cleanName } from './lk.mjs';

const UPG = ['hull', 'battery', 'lights', 'sonar'];
const int = (v, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : lo);

// the key of a name: case and extra spaces do not matter ("Isabella", " isabella ") → same profile
export const nameKey = (name) => {
  const n = cleanName(name).toLowerCase();
  return n.length >= 2 ? n : null;
};

// only the progress fields the game uses, checked (no age, no language – nothing personal)
export function cleanData(d = {}) {
  const out = { rp: int(d.rp, 0, 1e8), spent: int(d.spent, 0, 1e8), dives: int(d.dives, 0, 1e7), upgrades: {}, logbook: {} };
  for (const k of UPG) out.upgrades[k] = int(d.upgrades && d.upgrades[k], 0, 20);
  if (typeof d.sub === 'string' && /^[a-z]{2,16}$/.test(d.sub)) out.sub = d.sub;
  const lb = d.logbook && typeof d.logbook === 'object' ? d.logbook : {};
  for (const [id, e] of Object.entries(lb).slice(0, 400)) {
    if (!/^[a-z0-9_]{1,24}$/.test(id) || !e || typeof e !== 'object') continue;
    out.logbook[id] = { n: int(e.n, 1, 1e6), maxDepth: int(e.maxDepth, 0, 12000), first: int(e.first, 0, 4e12) };
  }
  if (out.spent > out.rp) out.spent = out.rp;
  return out;
}

// two copies of the same diver (e.g. phone and computer): keep the best of both – nothing ever gets lost
export function mergeData(a, b) {
  if (!a) return b;
  if (!b) return a;
  const out = { rp: Math.max(a.rp, b.rp), spent: Math.max(a.spent, b.spent), dives: Math.max(a.dives, b.dives), upgrades: {}, logbook: { ...a.logbook } };
  for (const k of UPG) out.upgrades[k] = Math.max(a.upgrades[k] || 0, b.upgrades[k] || 0);
  for (const [id, e] of Object.entries(b.logbook || {})) {
    const o = out.logbook[id];
    out.logbook[id] = o ? { n: Math.max(o.n, e.n), maxDepth: Math.max(o.maxDepth, e.maxDepth), first: Math.min(o.first || e.first, e.first || o.first) } : e;
  }
  out.sub = b.sub || a.sub;
  if (out.spent > out.rp) out.spent = out.rp;
  return out;
}

// ---------- visitors (statistics) ----------
export const cleanVid = (v) => (typeof v === 'string' && /^[A-Za-z0-9_-]{6,24}$/.test(v) ? v : null);
export function addVisit(list, v, now = Date.now()) {
  const vid = cleanVid(v.vid);
  if (!vid) return list;
  const cc = typeof v.cc === 'string' && /^[A-Z]{2}$/.test(v.cc) ? v.cc : 'XX';
  const dev = ['phone', 'tablet', 'desktop'].includes(v.dev) ? v.dev : 'desktop';
  const lang = typeof v.lang === 'string' && /^[a-z]{2,3}$/.test(v.lang) ? v.lang : 'xx';
  const o = list[vid] || { n: 0, first: now };
  list[vid] = { n: o.n + 1, first: o.first, last: now, cc, dev, lang, own: !!(o.own || v.own) };
  // keep it small: the 3,000 most recent devices
  const ids = Object.keys(list);
  if (ids.length > 3000) for (const id of ids.sort((x, y) => list[x].last - list[y].last).slice(0, ids.length - 3000)) delete list[id];
  return list;
}
