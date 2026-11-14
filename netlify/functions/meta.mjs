// POST /api/meta – the host updates the room settings shown in the room list ({code, key, meta}).
import { RoomServiceClient } from 'livekit-server-sdk';
import { cfg, json, preflight, ROOM_PREFIX, hostKey, parseMeta, cleanCode, cleanMeta } from '../lib/lk.mjs';

export default async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);
  if (req.method !== 'POST') return json(req, { error: 'method' }, 405);
  const c = cfg();
  if (!c) return json(req, { error: 'not-configured' }, 503);
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json(req, { error: 'bad-request' }, 400);
  }
  const code = cleanCode(body && body.code);
  if (!code || body.key !== hostKey(c.secret, code)) return json(req, { error: 'forbidden' }, 403);
  try {
    const svc = new RoomServiceClient(c.http, c.key, c.secret);
    const [room] = await svc.listRooms([ROOM_PREFIX + code]);
    if (!room) return json(req, { error: 'notfound' }, 404);
    const meta = { ...parseMeta(room.metadata), ...cleanMeta(body.meta) };
    await svc.updateRoomMetadata(ROOM_PREFIX + code, JSON.stringify(meta));
    return json(req, { ok: true });
  } catch (e) {
    console.error('meta', e && e.message);
    return json(req, { error: 'livekit' }, 502);
  }
};
export const config = { path: '/api/meta' };
