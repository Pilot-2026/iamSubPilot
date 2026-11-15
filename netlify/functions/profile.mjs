// /api/profile – a diver's progress in the cloud: the same name on any device loads the same research points,
// hangar upgrades, sub and logbook. GET ?name=… reads it, POST {name, data} saves it (merged with what is already
// stored, so progress never gets smaller), GET ?list=1 lists the divers with the most research points.
import { getStore } from '@netlify/blobs';
import { json, preflight, cleanName } from '../lib/lk.mjs';
import { nameKey, cleanData, mergeData } from '../lib/profile.mjs';

const store = () => getStore({ name: 'profiles', consistency: 'strong' });

export default async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);
  try {
    const s = store();
    if (req.method === 'GET') {
      const url = new URL(req.url);
      if (url.searchParams.get('list')) {
        const idx = (await s.get('_index', { type: 'json' })) || {};
        const rows = Object.values(idx).sort((a, b) => b.rp - a.rp).slice(0, 50);
        return json(req, { divers: rows });
      }
      const key = nameKey(url.searchParams.get('name'));
      if (!key) return json(req, { error: 'name' }, 400);
      const rec = await s.get('p/' + encodeURIComponent(key), { type: 'json' });
      if (!rec) return json(req, { found: false }, 404);
      return json(req, { found: true, name: rec.name, data: rec.data, updated: rec.updated });
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const key = body && nameKey(body.name);
      if (!key || !body.data) return json(req, { error: 'bad-request' }, 400);
      if (JSON.stringify(body.data).length > 60000) return json(req, { error: 'too-big' }, 413);
      const id = 'p/' + encodeURIComponent(key);
      const old = await s.get(id, { type: 'json' });
      const data = mergeData(old && cleanData(old.data), cleanData(body.data));
      const rec = { name: cleanName(body.name), data, updated: Date.now() };
      await s.setJSON(id, rec);
      // a small public list: name, research points, dives, number of species in the logbook
      const idx = (await s.get('_index', { type: 'json' })) || {};
      idx[key] = { name: rec.name, rp: data.rp, dives: data.dives, species: Object.keys(data.logbook).length, updated: rec.updated };
      const keys = Object.keys(idx);
      if (keys.length > 2000) for (const k of keys.sort((a, b) => idx[a].updated - idx[b].updated).slice(0, keys.length - 2000)) delete idx[k];
      await s.setJSON('_index', idx);
      return json(req, { ok: true, data, updated: rec.updated });
    }
    return json(req, { error: 'method' }, 405);
  } catch (e) {
    console.error('profile', e && e.message);
    return json(req, { error: 'store' }, 500);
  }
};
export const config = { path: '/api/profile' };
