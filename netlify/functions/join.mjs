// POST /api/join – open a room ({action: 'create', name, meta}) or enter one ({action: 'join', name, code}).
// Answer: LiveKit address, access token (6 hours), room code, own identity and the room's settings.
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { cfg, json, preflight, ROOM_PREFIX, MAX, newCode, newId, hostKey, parseMeta, cleanName, cleanCode, cleanMeta } from '../lib/lk.mjs';

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
  const name = cleanName(body && body.name);
  if (name.length < 1) return json(req, { error: 'name' }, 400);
  const svc = new RoomServiceClient(c.http, c.key, c.secret);
  const identity = newId();
  let code, meta, key;
  try {
    if (body.action === 'create') {
      for (let i = 0; i < 8 && !code; i++) {
        const k = newCode();
        if (!(await svc.listRooms([ROOM_PREFIX + k])).length) code = k;
      }
      if (!code) return json(req, { error: 'busy' }, 503);
      meta = { mode: 'coop', level: 'java', status: 'lobby', ...cleanMeta(body.meta), host: identity, hostName: name, createdAt: Date.now() };
      // an empty room stays 60 s (time for the host to connect), after the last diver 20 s
      await svc.createRoom({ name: ROOM_PREFIX + code, emptyTimeout: 60, departureTimeout: 20, maxParticipants: MAX, metadata: JSON.stringify(meta) });
      key = hostKey(c.secret, code);
    } else if (body.action === 'join') {
      code = cleanCode(body.code);
      const [room] = code ? await svc.listRooms([ROOM_PREFIX + code]) : [];
      if (!room) return json(req, { error: 'notfound' }, 404);
      if (room.numParticipants >= MAX) return json(req, { error: 'full' }, 409);
      meta = parseMeta(room.metadata);
    } else return json(req, { error: 'bad-request' }, 400);
    const at = new AccessToken(c.key, c.secret, { identity, name, ttl: '6h' });
    at.addGrant({ roomJoin: true, room: ROOM_PREFIX + code, canPublish: true, canSubscribe: true, canPublishData: true, canPublishSources: [TrackSource.MICROPHONE] });
    return json(req, { url: c.url, token: await at.toJwt(), code, identity, meta, ...(key ? { key } : {}), now: Date.now() });
  } catch (e) {
    console.error('join', e && e.message);
    return json(req, { error: 'livekit' }, 502);
  }
};
export const config = { path: '/api/join' };
