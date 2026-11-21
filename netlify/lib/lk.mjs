// Shared helpers for the iamisi online functions (rooms over LiveKit).
// Keys come from the Netlify environment variables LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET
// of the iamisi site (iamisi.netlify.app, formerly iamsubpilot.netlify.app) – its own LiveKit project, separate from every other game. The secret never leaves the server.
import { createHmac, randomBytes, randomInt } from 'node:crypto';

export const ROOM_PREFIX = 'sub-';
export const MAX = 4; // divers per room
export const MODES = ['coop', 'race'];
export const LEVELS = ['java', 'southsandwich', 'puertorico', 'izu', 'kuril', 'tonga', 'mariana'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function cfg() {
  const url = process.env.LIVEKIT_URL, key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;
  return { url, key, secret, http: url.replace(/^ws/, 'http') };
}

// The game runs on GitHub Pages and on this Netlify site (new and old name): allow those origins (and local tests)
const ORIGINS = ['https://pilot-2026.github.io', 'http://127.0.0.1:8080', 'http://localhost:8080'];
export function cors(req) {
  const o = req.headers.get('origin');
  if (!o || !(ORIGINS.includes(o) || /^https:\/\/([a-z0-9-]+--)?(iamisi|iamsubpilot)\.netlify\.app$/.test(o))) return {};
  return { 'access-control-allow-origin': o, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' };
}
export const json = (req, body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(req) } });
export const preflight = (req) => new Response(null, { status: 204, headers: cors(req) });

export const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
export const newId = () => 'u' + randomBytes(8).toString('base64url');
// proof that a request comes from the diver who opened the room (only the creator gets it)
export const hostKey = (secret, code) => createHmac('sha256', secret).update('host:' + code).digest('base64url').slice(0, 24);
export const parseMeta = (s) => {
  try {
    const o = JSON.parse(s || '{}');
    return o && typeof o === 'object' ? o : {};
  } catch (e) {
    return {};
  }
};
// diver name: visible characters, spaces collapsed, 1–30 characters
export const cleanName = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
export const cleanCode = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : undefined);
// only the room fields the game uses, checked
export function cleanMeta(m = {}) {
  const out = {};
  if (MODES.includes(m.mode)) out.mode = m.mode;
  if (LEVELS.includes(m.level)) out.level = m.level;
  if (m.status === 'lobby' || m.status === 'running') out.status = m.status;
  for (const k of ['seed', 'autoStartAt', 'startAt', 'createdAt']) if (num(m[k]) !== undefined) out[k] = Math.round(m[k]);
  return out;
}
