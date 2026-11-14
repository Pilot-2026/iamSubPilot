// GET /api/rooms – all open rooms (every room is public), fullest first.
import { RoomServiceClient } from 'livekit-server-sdk';
import { cfg, json, preflight, ROOM_PREFIX, MAX, parseMeta } from '../lib/lk.mjs';

export default async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);
  const c = cfg();
  if (!c) return json(req, { rooms: [], error: 'not-configured' }, 503);
  try {
    const svc = new RoomServiceClient(c.http, c.key, c.secret);
    const rooms = (await svc.listRooms())
      .filter((r) => r.name.startsWith(ROOM_PREFIX) && r.numParticipants > 0)
      .map((r) => {
        const m = parseMeta(r.metadata);
        return { code: r.name.slice(ROOM_PREFIX.length), mode: m.mode, level: m.level, status: m.status || 'lobby', autoStartAt: m.autoStartAt || 0, host: String(m.hostName || '').slice(0, 30), players: Math.min(MAX, r.numParticipants) };
      })
      .sort((a, b) => b.players - a.players)
      .slice(0, 40);
    return json(req, { rooms, now: Date.now() });
  } catch (e) {
    console.error('rooms', e && e.message);
    return json(req, { rooms: [], error: 'livekit' }, 502);
  }
};
export const config = { path: '/api/rooms' };
