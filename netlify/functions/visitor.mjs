// /api/visitor – the returning-visitor list for the statistics. Each device has an anonymous random number
// (made in the browser, no name, no IP address is stored). POST {vid, cc, dev, lang, own} counts a visit,
// GET returns the devices seen most recently (how often, first and last visit, country, device, language,
// and whether it is the operator's own device).
import { getStore } from '@netlify/blobs';
import { json, preflight } from '../lib/lk.mjs';
import { addVisit } from '../lib/profile.mjs';

const store = () => getStore({ name: 'visitors', consistency: 'strong' });

export default async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);
  try {
    const s = store();
    const list = (await s.get('list', { type: 'json' })) || {};
    if (req.method === 'GET') {
      const rows = Object.entries(list).map(([vid, v]) => ({ id: vid.slice(0, 6), ...v })).sort((a, b) => b.last - a.last).slice(0, 600);
      return json(req, { visitors: rows, total: Object.keys(list).length });
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body) return json(req, { error: 'bad-request' }, 400);
      addVisit(list, body);
      await s.setJSON('list', list);
      return json(req, { ok: true });
    }
    return json(req, { error: 'method' }, 405);
  } catch (e) {
    console.error('visitor', e && e.message);
    return json(req, { error: 'store' }, 500);
  }
};
export const config = { path: '/api/visitor' };
