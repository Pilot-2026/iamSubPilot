// Cloud profiles: the same diver name on any device (phone, tablet, computer, Tesla) brings back the same
// research points, hangar upgrades, sub and logbook. Saved through the game's own Netlify site (/api/profile).
// Only progress is sent – never the age or anything personal. Without a connection the game simply keeps
// everything on this device, as before.

import { hasApi, apiFetch } from './api.js';

const UPG = ['hull', 'battery', 'lights', 'sonar'];
export const nameKey = (n) => String(n || '').replace(/\s+/g, ' ').trim().toLowerCase();

// the part of the profile that travels with the name
export function progressOf(p) {
  return { rp: p.rp || 0, spent: p.spent || 0, dives: p.dives || 0, upgrades: { ...p.upgrades }, logbook: p.logbook || {}, sub: p.sub };
}

// keep the best of both copies (research points, upgrades, logbook entries never get smaller)
export function mergeInto(p, d) {
  if (!d) return p;
  p.rp = Math.max(p.rp || 0, d.rp || 0);
  p.spent = Math.max(p.spent || 0, d.spent || 0);
  if (p.spent > p.rp) p.spent = p.rp;
  p.dives = Math.max(p.dives || 0, d.dives || 0);
  for (const k of UPG) p.upgrades[k] = Math.max(p.upgrades[k] || 0, (d.upgrades && d.upgrades[k]) || 0);
  for (const [id, e] of Object.entries(d.logbook || {})) {
    const o = p.logbook[id];
    p.logbook[id] = o ? { n: Math.max(o.n || 0, e.n || 0), maxDepth: Math.max(o.maxDepth || 0, e.maxDepth || 0), first: Math.min(o.first || e.first, e.first || o.first) } : e;
  }
  if (d.sub) p.sub = d.sub;
  return p;
}

function call(path, opts = {}, ms = 7000) {
  return apiFetch(path, { ...opts, headers: { 'content-type': 'application/json' } }, ms);
}

export const cloud = {
  available: hasApi,
  status: 'idle', // idle | ok | offline
  // load the cloud copy of a name: { found, data, updated } (null when offline)
  async pull(name) {
    try {
      const r = await call('/profile?name=' + encodeURIComponent(name));
      if (r.status === 404) {
        this.status = 'ok';
        return { found: false };
      }
      if (!r.ok) throw new Error('http ' + r.status);
      this.status = 'ok';
      return await r.json();
    } catch (e) {
      this.status = 'offline';
      return null;
    }
  },
  async push(name, data) {
    try {
      const r = await call('/profile', { method: 'POST', body: JSON.stringify({ name, data }) });
      if (!r.ok) throw new Error('http ' + r.status);
      this.status = 'ok';
      return await r.json();
    } catch (e) {
      this.status = 'offline';
      return null;
    }
  },
  // public list of divers (most research points first)
  async list() {
    try {
      const r = await call('/profile?list=1');
      if (!r.ok) throw new Error('http ' + r.status);
      return (await r.json()).divers || [];
    } catch (e) {
      return null;
    }
  },
  // statistics: count this device's visit in the returning-visitor list
  async visit(v) {
    try {
      await call('/visitor', { method: 'POST', body: JSON.stringify(v) }, 5000);
    } catch (e) {
      /* statistics are best effort */
    }
  },
  async visitors() {
    try {
      const r = await call('/visitor');
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } catch (e) {
      return null;
    }
  },
};
