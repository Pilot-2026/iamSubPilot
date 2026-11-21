// Online features: leaderboard (Firestore) and realtime rooms.
// Rooms: LiveKit (server in the middle – works on every network, also phone to phone on mobile data; rooms are
// opened by the small functions of the game's own Netlify site), else Firebase Realtime Database if configured,
// else peer-to-peer (WebRTC via PeerJS – the host's browser relays all messages).
// For testing, ?local=1 uses tabs on the same device instead.

import { FIREBASE_CONFIG } from './config.js';
import { hasApi, apiFetch } from './api.js';
import { randomCode } from './util.js';

const LB_PREFIX = 'hadal.lb.';
// All rooms are public: codes come from this fixed pool, so anybody can find
// open rooms without a server (just ask every code in the pool).
export const PUBLIC_CODES = ['AQUA', 'BOJE', 'DELF', 'ECHO', 'FLUT', 'GRAB', 'HAIE', 'KRAB', 'LUKE', 'MANT', 'PERL', 'QUAL', 'RIFF', 'SAND', 'TANG', 'WALE', 'WOGE', 'ZONE', 'KORA', 'MOLA', 'PULS', 'SONA', 'TIEF', 'BLAU'];
const shuffled = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const PEER_PREFIX = 'hadal-v1-';
// ICE servers for the peer-to-peer fallback: Google STUN only. (The public PeerJS TURN relay was shut down by
// its operators, so there is no relay here – that's why rooms normally run over LiveKit.)
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }], sdpSemantics: 'unified-plan' };
// tests: own local signalling server (read once – the lobby removes the query string from the address)
const PEER_SERVER = new URLSearchParams(location.search).get('peer');
// room functions (LiveKit): own address on Netlify, else the Netlify site (old or new name, see api.js)
const enc = new TextEncoder(), dec = new TextDecoder();
const codeFromErr = (e) => {
  const m = /hadal-v1-([A-Z0-9]+)/.exec((e && e.message) || '');
  return m ? m[1] : null;
};

function localTop(board, asc, n) {
  const list = JSON.parse(localStorage.getItem(LB_PREFIX + board) || '[]');
  const key = asc ? 'time' : 'score';
  list.sort((a, b) => (asc ? a[key] - b[key] : b[key] - a[key]));
  return list.slice(0, n);
}

function localSubmit(board, entry) {
  const list = JSON.parse(localStorage.getItem(LB_PREFIX + board) || '[]');
  list.push({ ...entry, at: Date.now() });
  const asc = entry.time !== undefined && entry.score === undefined;
  list.sort((a, b) => (asc ? a.time - b.time : b.score - a.score));
  localStorage.setItem(LB_PREFIX + board, JSON.stringify(list.slice(0, 50)));
}

export class Net {
  constructor() {
    this.mode = 'none'; // 'lk' | 'firebase' | 'local' | 'p2p' | 'none'
    this.lbOnline = false;
    this.mpAvailable = false;
    this.uid = 'u' + Math.random().toString(36).slice(2, 10);
    this.room = null;
    this.offset = 0;
    this.unsubs = [];
  }

  async init() {
    const params = new URLSearchParams(location.search);
    // ask the room server in the background (doesn't hold up the start)
    if (hasApi && params.get('local') !== '1' && params.get('p2p') !== '1') this.lkCheck = this.probeLk();
    if (FIREBASE_CONFIG) {
      try {
        const fb = await import('./vendor/firebase.min.js');
        this.fb = fb;
        this.app = fb.initializeApp(FIREBASE_CONFIG);
        this.db = fb.getFirestore(this.app);
        try {
          this.auth = fb.getAuth(this.app);
          const cred = await fb.signInAnonymously(this.auth);
          this.uid = cred.user.uid;
          this.authUid = cred.user.uid; // the room id may change later (LiveKit), the login stays
          this.lbOnline = true; // online leaderboard needs the (anonymous) login
        } catch (e) {
          console.warn('Anonymous login not available – leaderboard stays local.', e);
        }
        if (FIREBASE_CONFIG.databaseURL) {
          this.rtdb = fb.getDatabase(this.app);
          this.mpAvailable = true;
          fb.onValue(fb.ref(this.rtdb, '.info/serverTimeOffset'), (snap) => {
            this.offset = snap.val() || 0;
          });
          this.mode = 'firebase';
          return;
        }
        // Firestore only (leaderboard + statistics): rooms stay peer-to-peer
      } catch (e) {
        console.warn('Firebase not available, playing offline.', e);
        this.db = null;
      }
    }
    if (params.get('local') === '1') {
      this.mode = 'local';
      this.mpAvailable = true;
    } else if (window.RTCPeerConnection) {
      this.mode = 'p2p';
      this.mpAvailable = true;
    }
  }

  // Wait for the room server check (called before anything that depends on the room mode).
  async ready() {
    if (this.lkCheck) {
      const ok = await this.lkCheck;
      this.lkCheck = null;
      if (ok) {
        this.mode = 'lk';
        this.mpAvailable = true;
      }
    }
  }

  async probeLk() {
    try {
      const r = await apiFetch('/rooms', { cache: 'no-store' }, 7000);
      const j = await r.json();
      return r.ok && Array.isArray(j.rooms);
    } catch (e) {
      return false;
    }
  }

  // ---------------- LiveKit transport ----------------
  async lkApi(path, body) {
    let r;
    try {
      r = await apiFetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' }, 15000);
    } catch (e) {
      throw new Error('timeout');
    }
    let j = {};
    try {
      j = await r.json();
    } catch (e) {
      /* no JSON */
    }
    if (!r.ok) throw new Error(j.error === 'notfound' || j.error === 'full' ? j.error : 'p2p');
    return j;
  }

  async lkConnect(res, room) {
    const LK = await import('./vendor/livekit-client.min.js');
    const lk = new LK.Room({ adaptiveStream: false, dynacast: false, disconnectOnPageLeave: true });
    room.LK = LK;
    room.lk = lk;
    room.res = res; // the token stays valid for hours: used again to reconnect
    room.away = room.away || new Map(); // uid -> timer: participants that dropped out (they may come back)
    room.conn = 'ok';
    lk.on(LK.RoomEvent.DataReceived, (payload, p) => {
      if (!p) return;
      let m;
      try {
        m = JSON.parse(dec.decode(payload));
      } catch (e) {
        return;
      }
      this.handleLk(room, m, p.identity);
    });
    // Mobile networks drop out now and then (tunnel, switching to another app, screen off). Somebody who drops out
    // is kept for a while – LiveKit brings them back with the same identity – instead of being thrown out at once.
    lk.on(LK.RoomEvent.ParticipantConnected, (p) => this.lkBack(room, p.identity));
    lk.on(LK.RoomEvent.ParticipantDisconnected, (p) => this.lkAway(room, p.identity));
    lk.on(LK.RoomEvent.Reconnecting, () => this.lkConn(room, 'reconnecting'));
    lk.on(LK.RoomEvent.Reconnected, () => {
      this.lkConn(room, 'ok');
      this.lkHello(room); // the others (and the host's room state) catch up with us again
    });
    lk.on(LK.RoomEvent.Disconnected, () => {
      if (this.room === room && !room.leaving) this.lkRejoin(room);
    });
    lk.on(LK.RoomEvent.ConnectionStateChanged, (st) => {
      if (st === 'connected' && room.conn !== 'ok' && !room.rejoining) {
        this.lkConn(room, 'ok');
        this.lkHello(room);
      }
    });
    // radio: the other divers' voices
    lk.on(LK.RoomEvent.TrackSubscribed, (track, pub, p) => {
      if (track.kind !== 'audio') return;
      room.audio.set(p.identity, track);
      room.onAudio && room.onAudio(p.identity, track);
    });
    lk.on(LK.RoomEvent.TrackUnsubscribed, (track, pub, p) => {
      if (track.kind !== 'audio') return;
      if (room.audio.get(p.identity) === track) room.audio.delete(p.identity);
      room.onAudioGone && room.onAudioGone(p.identity, track);
    });
    await lk.connect(res.url, res.token, { autoSubscribe: true });
  }

  lkSend(room, msg, to = null) {
    // not while (re)connecting from scratch – that would break the new connection; my whole record follows anyway
    if (!room || !room.lk || room.lk.state === 'disconnected' || room.lk.state === 'connecting') return;
    // position updates may get lost (the next one follows a moment later), everything else must arrive
    const reliable = !(msg.type === 'player' && msg.data && 's' in msg.data && Object.keys(msg.data).length === 1);
    room.lk.localParticipant.publishData(enc.encode(JSON.stringify(msg)), { reliable, ...(to ? { destinationIdentities: [to] } : {}) }).catch(() => {});
  }

  lkConn(room, state) {
    if (room.conn === state) return;
    room.conn = state;
    room.handlers.conn && room.handlers.conn(state);
  }

  // my whole player record (name, sub, missions, photos, …) – everybody who gets it is up to date again
  lkHello(room, hello = true) {
    if (room.players[this.uid]) this.lkSend(room, { type: 'player', uid: this.uid, data: room.players[this.uid], ...(hello ? { hello: true } : {}) });
  }

  lkPresent(room, id) {
    return !!id && (id === this.uid || !!(room.lk && room.lk.remoteParticipants.has(id)));
  }

  hostPresent() {
    const room = this.room;
    if (!room) return false;
    if (!room.isLk) return true;
    return this.lkPresent(room, room.meta && room.meta.host);
  }

  // Who answers newcomers (room state, clock): the host – or, while the host is away, whoever has been in the room
  // longest (the server's join time, the same for everybody), so the others can still be joined.
  lkResponder(room) {
    if (this.isHost()) return true;
    if (!room.lk || this.lkPresent(room, room.meta && room.meta.host)) return false;
    const me = room.lk.localParticipant;
    const t = (p) => (p.joinedAt ? p.joinedAt.getTime() : 9e15);
    let best = me;
    for (const p of room.lk.remoteParticipants.values()) if (t(p) < t(best) || (t(p) === t(best) && p.identity < best.identity)) best = p;
    return best === me;
  }

  lkAway(room, id) {
    if (this.room !== room || !room.players[id] || room.away.has(id)) return;
    const lobbyHost = id === (room.meta && room.meta.host) && (room.meta || {}).status !== 'running';
    room.away.set(id, setTimeout(() => {
      room.away.delete(id);
      if (this.room === room && !this.lkPresent(room, id)) this.lkDrop(room, id);
    }, lobbyHost ? 15000 : 45000));
  }

  lkBack(room, id) {
    const tm = room.away.get(id);
    if (tm) {
      clearTimeout(tm);
      room.away.delete(id);
    }
  }

  lkDrop(room, id) {
    const tm = room.away.get(id);
    if (tm) clearTimeout(tm);
    room.away.delete(id);
    const h = room.handlers;
    if (room.players[id]) {
      delete room.players[id];
      h.players && h.players(room.players);
    }
    if (id === (room.meta && room.meta.host)) h.closed && h.closed('host');
  }

  // our own connection is gone (LiveKit gave up): try again with the same token for about a minute and a half
  async lkRejoin(room) {
    if (room.rejoining) return;
    room.rejoining = true;
    this.lkConn(room, 'reconnecting');
    for (const wait of [800, 1500, 2500, 4000, 6000, 8000, 12000, 15000, 20000, 20000]) {
      await new Promise((r) => setTimeout(r, wait));
      if (this.room !== room || room.leaving) return;
      try {
        await room.lk.connect(room.res.url, room.res.token, { autoSubscribe: true });
        room.rejoining = false;
        this.lkConn(room, 'ok');
        this.lkHello(room);
        room.onRejoin && room.onRejoin();
        return;
      } catch (e) {
        /* next try */
      }
    }
    room.rejoining = false;
    this.lkConn(room, 'lost');
    if (this.room === room) room.handlers.closed && room.handlers.closed('lost');
  }

  // every few seconds: my whole record again (reliable). Whatever got lost on the way is put right this way.
  lkKeepFresh(room) {
    clearInterval(room.freshTimer);
    room.freshTimer = setInterval(() => {
      if (this.room !== room || room.leaving) return clearInterval(room.freshTimer);
      if (room.lk && room.lk.state === 'connected') this.lkHello(room, false);
    }, 4000);
  }

  // A room message over LiveKit. Everyone gets every message straight from the server; the host answers newcomers
  // with the room state and keeps the clock (like the host in peer-to-peer rooms).
  handleLk(room, m, from) {
    if (this.room !== room || !m) return;
    const h = room.handlers;
    const hostId = room.meta && room.meta.host;
    if (m.type === 'player') {
      if (m.uid !== from) return;
      room.players[from] = { ...(room.players[from] || {}), ...m.data };
      if (m.hello) {
        room.players[from].joined = room.players[from].joined || Date.now();
        if (this.lkResponder(room)) {
          if (Object.keys(room.players).length > 4) {
            delete room.players[from];
            this.lkSend(room, { type: 'full' }, from);
            return;
          }
          this.lkSend(room, { type: 'sync', meta: room.meta, players: room.players }, from);
        }
      }
      h.players && h.players(room.players);
    } else if (m.type === 'leave') {
      if (m.uid !== from || m.uid === this.uid) return;
      this.lkDrop(room, from);
    } else if (m.type === 'meta') {
      if (from !== hostId) return;
      room.meta = m.meta;
      h.meta && h.meta(room.meta);
    } else if (m.type === 'event') {
      h.event && h.event(m.ev);
    } else if (m.type === 'sync') {
      if (hostId && from !== hostId && this.lkPresent(room, hostId)) return;
      room.meta = m.meta;
      room.players = { ...m.players, [this.uid]: { ...(m.players || {})[this.uid], ...room.players[this.uid] } };
      room.synced && room.synced();
      h.meta && h.meta(room.meta);
      h.players && h.players(room.players);
    } else if (m.type === 'ping') {
      if (this.lkResponder(room)) this.lkSend(room, { type: 'pong', t0: m.t0, th: Date.now() }, from);
    } else if (m.type === 'pong') {
      const t1 = Date.now();
      if (!room.bestRtt || t1 - m.t0 < room.bestRtt) {
        room.bestRtt = t1 - m.t0;
        this.offset = m.th - (m.t0 + t1) / 2;
      }
    } else if (m.type === 'full') {
      room.fullErr && room.fullErr();
    } else if (m.type === 'closed') {
      if (from === hostId) this.lkDrop(room, from);
    }
  }

  // the room list shows mode, trench and state: the host keeps them up to date on the server
  lkPushMeta(room) {
    if (!room.key) return;
    clearTimeout(room.metaTimer);
    room.metaTimer = setTimeout(() => {
      const m = room.meta || {};
      this.lkApi('/meta', { code: room.code, key: room.key, meta: { mode: m.mode, level: m.level, status: m.status, autoStartAt: m.autoStartAt, seed: m.seed, startAt: m.startAt } }).catch(() => {});
    }, 300);
  }

  async createLkRoom(meta, info) {
    const res = await this.lkApi('/join', { action: 'create', name: info.name, meta: { mode: meta.mode, level: meta.level, seed: meta.seed, autoStartAt: meta.autoStartAt, createdAt: meta.createdAt, status: 'lobby' } });
    this.leaveRoom();
    this.uid = res.identity;
    const room = { code: res.code, meta: { ...meta, host: res.identity, hostName: info.name }, players: { [res.identity]: { ...info, joined: Date.now() } }, handlers: {}, joinedAt: Date.now(), isLk: true, key: res.key, audio: new Map() };
    this.room = room;
    this.offset = 0;
    try {
      await this.lkConnect(res, room);
    } catch (e) {
      this.leaveRoom();
      throw new Error('timeout');
    }
    this.lkKeepFresh(room);
    setTimeout(() => {
      room.handlers.meta && room.handlers.meta(room.meta);
      room.handlers.players && room.handlers.players(room.players);
    }, 30);
    return res.code;
  }

  async joinLkRoom(code, info) {
    const res = await this.lkApi('/join', { action: 'join', name: info.name, code });
    this.leaveRoom();
    this.uid = res.identity;
    const room = { code: res.code, meta: res.meta || {}, players: { [res.identity]: { ...info, joined: Date.now() } }, handlers: {}, joinedAt: Date.now(), isLk: true, audio: new Map() };
    this.room = room;
    this.offset = 0;
    try {
      await this.lkConnect(res, room);
      const hostId = room.meta.host;
      if (!room.lk.remoteParticipants.size) throw new Error('notfound'); // everybody has just left
      await new Promise((resolve, reject) => {
        // the first data message waits until the connection to the server is fully set up – say hello again
        // every 2 s until the host has answered with the room state
        const hello = () => this.lkSend(room, { type: 'player', uid: this.uid, data: info, hello: true });
        const again = setInterval(hello, 2000);
        const stop = () => {
          clearTimeout(to);
          clearInterval(again);
        };
        const to = setTimeout(() => {
          stop();
          reject(new Error('noconn'));
        }, 20000);
        room.synced = () => {
          if (room.isSynced) return;
          room.isSynced = true;
          stop();
          const clock = this.lkPresent(room, hostId) ? hostId : null; // without the host: everybody's clock answers, the fastest wins
          for (let i = 0; i < 5; i++) setTimeout(() => this.room === room && this.lkSend(room, { type: 'ping', t0: Date.now() }, clock), 100 + i * 400);
          resolve();
        };
        room.fullErr = () => {
          stop();
          reject(new Error('full'));
        };
        hello();
      });
    } catch (e) {
      this.leaveRoom();
      throw e.message === 'notfound' || e.message === 'full' || e.message === 'noconn' ? e : new Error('timeout');
    }
    this.lkKeepFresh(room);
    return room;
  }

  // ---------------- peer-to-peer transport ----------------
  async peerLib() {
    // window.__FAKE_PEER__ lets automated tests run rooms without a network
    if (!this.PeerCls) this.PeerCls = window.__FAKE_PEER__ || (await import('./vendor/peerjs.min.js')).Peer;
    return this.PeerCls;
  }

  openPeer(id) {
    return new Promise(async (resolve, reject) => {
      const Peer = await this.peerLib();
      const opts = { debug: 0, config: ICE };
      const ps = PEER_SERVER;
      if (ps) Object.assign(opts, { host: ps.split(':')[0], port: Number(ps.split(':')[1]) || 9000, path: '/hadal', secure: false, config: { iceServers: [] } });
      const peer = id ? new Peer(id, opts) : new Peer(opts);
      const to = setTimeout(() => reject(new Error('timeout')), 12000);
      const onErr = (e) => {
        clearTimeout(to);
        try {
          peer.destroy();
        } catch (x) {
          /* ignore */
        }
        reject(new Error(e.type === 'unavailable-id' ? 'taken' : e.type === 'peer-unavailable' ? 'notfound' : 'p2p'));
      };
      peer.once('error', onErr);
      peer.once('open', () => {
        clearTimeout(to);
        peer.off('error', onErr); // later errors are handled by the caller
        resolve(peer);
      });
    });
  }

  p2pSend(msg, except = null) {
    const room = this.room;
    if (!room || !room.peer) return;
    if (room.p2pHost) {
      for (const c of room.conns.values()) if (c !== except && c.open) c.send(msg);
    } else if (room.hostConn && room.hostConn.open) room.hostConn.send(msg);
  }

  // Apply a room message (shared by local and p2p mode).
  handleMsg(room, m, fromConn = null) {
    if (m.type === 'player') {
      if (room.p2pHost && fromConn) {
        if (m.hello) {
          if (Object.keys(room.players).length >= 4 && !room.players[m.uid]) {
            fromConn.send({ type: 'full' });
            setTimeout(() => fromConn.close(), 300);
            return;
          }
          fromConn.uid = m.uid;
          m.data = { ...m.data, joined: Date.now() };
        }
        room.players[m.uid] = { ...(room.players[m.uid] || {}), ...m.data };
        if (m.hello) fromConn.send({ type: 'sync', meta: room.meta, players: room.players });
        this.p2pSend({ type: 'player', uid: m.uid, data: room.players[m.uid] }, fromConn);
      } else room.players[m.uid] = { ...(room.players[m.uid] || {}), ...m.data };
      room.handlers.players && room.handlers.players(room.players);
      if (m.hello && room.channel) room.channel.postMessage({ type: 'player', uid: this.uid, data: room.players[this.uid] });
    } else if (m.type === 'leave') {
      delete room.players[m.uid];
      if (room.p2pHost) this.p2pSend(m, fromConn);
      room.handlers.players && room.handlers.players(room.players);
    } else if (m.type === 'meta') {
      room.meta = m.meta;
      room.handlers.meta && room.handlers.meta(room.meta);
    } else if (m.type === 'event') {
      if (room.p2pHost && fromConn) this.p2pSend(m, fromConn);
      room.handlers.event && room.handlers.event(m.ev);
    } else if (m.type === 'sync') {
      room.meta = m.meta;
      room.players = m.players;
      room.synced && room.synced();
      room.handlers.meta && room.handlers.meta(room.meta);
      room.handlers.players && room.handlers.players(room.players);
    } else if (m.type === 'info' && room.p2pHost && fromConn) {
      fromConn.send({ type: 'roominfo', room: this.roomSummary(room) });
    } else if (m.type === 'ping' && room.p2pHost && fromConn) {
      fromConn.send({ type: 'pong', t0: m.t0, th: Date.now() });
    } else if (m.type === 'pong') {
      const t1 = Date.now();
      const est = m.th - (m.t0 + t1) / 2;
      // keep the estimate from the fastest round trip
      if (!room.bestRtt || t1 - m.t0 < room.bestRtt) {
        room.bestRtt = t1 - m.t0;
        this.offset = est;
      }
    } else if (m.type === 'full') {
      room.fullErr && room.fullErr();
    } else if (m.type === 'closed') {
      room.handlers.closed && room.handlers.closed();
    }
  }

  async createP2PRoom(meta, info) {
    let peer = null;
    let code;
    const codes = [...shuffled(PUBLIC_CODES), randomCode(4), randomCode(4)];
    for (let i = 0; i < codes.length && !peer; i++) {
      code = codes[i];
      try {
        peer = await this.openPeer(PEER_PREFIX + code);
      } catch (e) {
        if (e.message !== 'taken') throw e;
      }
    }
    if (!peer) throw new Error('p2p');
    this.leaveRoom();
    const room = { code, meta, players: { [this.uid]: { ...info, pid: peer.id, joined: Date.now() } }, handlers: {}, joinedAt: Date.now(), peer, p2pHost: true, conns: new Map() };
    this.room = room;
    this.offset = 0;
    // room list probes arrive through the signalling server: answer with the room summary the same way
    if (peer.socket && peer.socket.on) {
      peer.socket.on('message', (m) => {
        if (!m || m.type !== 'CANDIDATE' || !m.payload || !m.payload.probe || !m.src || this.room !== room) return;
        try {
          peer.socket.send({ type: 'CANDIDATE', payload: { room: this.roomSummary(room) }, dst: m.src });
        } catch (e) {
          /* ignore */
        }
      });
    }
    peer.on('connection', (conn) => {
      conn.on('open', () => room.conns.set(conn.peer, conn));
      conn.on('data', (m) => this.handleMsg(room, m, conn));
      conn.on('close', () => {
        room.conns.delete(conn.peer);
        if (conn.uid && room.players[conn.uid]) this.handleMsg(room, { type: 'leave', uid: conn.uid }, conn);
      });
    });
    peer.on('disconnected', () => {
      try {
        peer.reconnect();
      } catch (e) {
        /* ignore */
      }
    });
    setTimeout(() => {
      room.handlers.meta && room.handlers.meta(room.meta);
      room.handlers.players && room.handlers.players(room.players);
    }, 30);
    return code;
  }

  async joinP2PRoom(code, info) {
    const peer = await this.openPeer(null);
    this.leaveRoom();
    const room = { code, meta: null, players: {}, handlers: {}, joinedAt: Date.now(), peer, p2pHost: false };
    this.room = room;
    await new Promise((resolve, reject) => {
      // no answer at all: the room exists (otherwise the server reports it gone) but the networks can't reach each other
      const to = setTimeout(() => reject(new Error('noconn')), 20000);
      peer.on('error', (e) => {
        if (e.type === 'peer-unavailable' && codeFromErr(e) && codeFromErr(e) !== code) return;
        clearTimeout(to);
        reject(new Error(e.type === 'peer-unavailable' ? 'notfound' : 'p2p'));
      });
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
      room.hostConn = conn;
      room.synced = () => {
        clearTimeout(to);
        resolve();
      };
      room.fullErr = () => {
        clearTimeout(to);
        reject(new Error('full'));
      };
      conn.on('open', () => {
        conn.send({ type: 'player', uid: this.uid, data: { ...info, pid: peer.id }, hello: true });
        // clock sync with the host (several pings, best one wins)
        for (let i = 0; i < 5; i++) setTimeout(() => conn.open && conn.send({ type: 'ping', t0: Date.now() }), 200 + i * 400);
      });
      conn.on('data', (m) => this.handleMsg(room, m, null));
      conn.on('close', () => {
        if (this.room === room) room.handlers.closed && room.handlers.closed();
      });
    }).catch((e) => {
      this.room = null;
      try {
        peer.destroy();
      } catch (x) {
        /* ignore */
      }
      throw e;
    });
    return room;
  }

  now() {
    return Date.now() + this.offset;
  }

  // ---------------- leaderboard ----------------
  async submitScore(board, entry) {
    localSubmit(board, entry);
    if (this.lbOnline) {
      try {
        const { collection, addDoc, serverTimestamp } = this.fb;
        await addDoc(collection(this.db, 'boards', board, 'scores'), { ...entry, uid: this.authUid || this.uid, createdAt: serverTimestamp() });
      } catch (e) {
        console.warn('Could not save online score', e);
      }
    }
  }

  async top(board, asc = false, n = 10) {
    if (this.lbOnline) {
      try {
        const { collection, query, orderBy, limit, getDocs } = this.fb;
        const field = asc ? 'time' : 'score';
        const snap = await getDocs(query(collection(this.db, 'boards', board, 'scores'), orderBy(field, asc ? 'asc' : 'desc'), limit(n)));
        return { online: true, list: snap.docs.map((d) => d.data()) };
      } catch (e) {
        console.warn('Online leaderboard failed', e);
      }
    }
    return { online: false, list: localTop(board, asc, n) };
  }

  // ---------------- rooms ----------------
  roomSummary(room) {
    const m = room.meta || {};
    const host = (room.players || {})[m.host];
    return { code: room.code, mode: m.mode, level: m.level, status: m.status, autoStartAt: m.autoStartAt, host: host ? host.name : '?', players: Object.keys(room.players || {}).length };
  }

  // List open rooms (all rooms are public).
  async listRooms(onFound = null) {
    await this.ready();
    if (this.mode === 'lk') {
      const j = await this.lkApi('/rooms');
      const own = this.room && this.room.code;
      const found = [];
      for (const r of j.rooms || []) {
        if (r.code === own) continue;
        found.push(r);
        if (onFound) onFound(r, found);
      }
      return found;
    }
    if (this.mode === 'firebase') {
      const { ref, get } = this.fb;
      const snap = await get(ref(this.rtdb, 'rooms'));
      const all = snap.val() || {};
      return Object.entries(all)
        .filter(([, r]) => r && r.meta && r.players)
        .map(([code, r]) => this.roomSummary({ code, meta: r.meta, players: r.players }));
    }
    if (this.mode === 'local') {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith('hadal.room.')) continue;
        try {
          const meta = JSON.parse(localStorage.getItem(k));
          if (meta && Date.now() - (meta.createdAt || 0) < 3 * 3600e3) out.push({ code: k.slice(11), mode: meta.mode, level: meta.level, status: meta.status, autoStartAt: meta.autoStartAt, host: meta.hostName || '?', players: 0 });
        } catch (e) {
          /* ignore */
        }
      }
      return out;
    }
    if (this.mode !== 'p2p') return [];
    // 1) Probe: one small message per public code through the signalling server. A host answers right away
    //    with its room summary (also through the server), so rooms show up within a moment and even when the
    //    two networks can't open a direct connection. The server reports every code nobody holds (~5 s).
    // 2) Codes that are taken but gave no answer (older game versions): ask over a data connection.
    const peer = await this.openPeer(null);
    const own = this.room && this.room.code;
    const codes = PUBLIC_CODES.filter((c) => c !== own);
    const found = [];
    const gone = new Set();
    const answered = new Set();
    const tried = new Set();
    await new Promise((resolve) => {
      let over = false;
      let phase2 = null;
      let limit = null;
      let fallback = null;
      const finish = () => {
        if (over) return;
        over = true;
        clearTimeout(phase2);
        clearTimeout(limit);
        clearTimeout(fallback);
        resolve();
      };
      const settled = () => codes.every((c) => gone.has(c) || answered.has(c));
      const add = (code, room) => {
        if (answered.has(code) || over) return;
        answered.add(code);
        found.push({ ...room, code });
        if (onFound) onFound(found[found.length - 1], found);
        if (settled()) finish();
      };
      const connectTo = (code) => {
        if (tried.has(code) || gone.has(code) || answered.has(code)) return;
        tried.add(code);
        const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
        conn.on('open', () => conn.send({ type: 'info' }));
        conn.on('data', (m) => {
          if (m.type !== 'roominfo') return;
          add(code, m.room);
          try {
            conn.close();
          } catch (x) {
            /* ignore */
          }
        });
      };
      const startPhase2 = () => {
        if (over || limit) return;
        const probeOk = gone.size + answered.size >= codes.length - 8;
        for (const c of codes) if (!probeOk || !gone.has(c)) connectTo(c);
        if (settled()) return finish();
        limit = setTimeout(finish, 9000); // relayed connections over mobile networks can take a while
      };
      peer.socket.on('message', (m) => {
        if (!m || m.type !== 'CANDIDATE' || !m.payload || !m.payload.room || typeof m.src !== 'string' || !m.src.startsWith(PEER_PREFIX)) return;
        const code = m.src.slice(PEER_PREFIX.length);
        if (codes.includes(code)) add(code, m.payload.room);
      });
      peer.on('error', (e) => {
        if (e.type !== 'peer-unavailable') return;
        const c = codeFromErr(e);
        if (c) gone.add(c);
        // all probe answers arrive within about a second of each other
        if (!phase2) phase2 = setTimeout(startPhase2, 1300);
        if (settled()) finish();
      });
      for (const c of codes) {
        try {
          peer.socket.send({ type: 'CANDIDATE', payload: { probe: 1 }, dst: PEER_PREFIX + c });
        } catch (e) {
          /* ignore */
        }
      }
      fallback = setTimeout(startPhase2, 7500); // the server never reported the empty codes
    });
    // taken codes that never answered: a room is there, but this network can't reach it
    if (gone.size + answered.size >= codes.length - 8) {
      for (const c of codes) if (!gone.has(c) && !answered.has(c)) found.push({ code: c, unreachable: true, players: 0 });
    }
    this.lastScan = { gone: gone.size, answered: answered.size, at: Date.now() };
    setTimeout(() => {
      try {
        peer.destroy();
      } catch (e) {
        /* ignore */
      }
    }, 300);
    return found;
  }

  // Connection check for the multiplayer window: signalling server, public address (STUN), relay (TURN).
  async checkConnection() {
    await this.ready();
    const res = { webrtc: !!window.RTCPeerConnection, server: null, direct: null, relay: null };
    if (this.mode !== 'p2p' || !res.webrtc) return res;
    try {
      const p = await this.openPeer(null);
      res.server = true;
      setTimeout(() => p.destroy(), 200);
    } catch (e) {
      res.server = false;
    }
    if (PEER_SERVER) return res; // local test server: no STUN/TURN
    res.direct = false;
    res.relay = false;
    let pc;
    try {
      pc = new RTCPeerConnection(ICE);
      pc.createDataChannel('check');
      await new Promise((resolve) => {
        const to = setTimeout(resolve, 7000);
        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            clearTimeout(to);
            return resolve();
          }
          const c = e.candidate.candidate || '';
          if (/ typ srflx/.test(c)) res.direct = true;
          if (/ typ relay/.test(c)) res.relay = true;
          if (res.direct && res.relay) {
            clearTimeout(to);
            resolve();
          }
        };
        pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(resolve);
      });
    } catch (e) {
      /* ignore */
    }
    try {
      pc && pc.close();
    } catch (e) {
      /* ignore */
    }
    return res;
  }

  async createRoom({ mode, level, name, sub, autoStartAt = 40000 }) {
    await this.ready();
    const info = { name, sub: sub || 'hummel' };
    const wait = autoStartAt;
    let code = PUBLIC_CODES[Math.floor(Math.random() * PUBLIC_CODES.length)];
    const meta = { mode, level, host: this.uid, status: 'lobby', seed: Math.floor(Math.random() * 1e9), createdAt: Date.now(), autoStartAt: this.now() + wait };
    if (this.mode === 'firebase') {
      const { ref, get, set } = this.fb;
      const codes = [...shuffled(PUBLIC_CODES), randomCode(4), randomCode(4)];
      for (const c of codes) {
        code = c;
        const snap = await get(ref(this.rtdb, `rooms/${code}/meta`));
        if (!snap.exists()) break;
      }
      await set(ref(this.rtdb, `rooms/${code}/meta`), meta);
    } else if (this.mode === 'local') {
      code = shuffled(PUBLIC_CODES).find((c) => !localStorage.getItem(`hadal.room.${c}`)) || randomCode(4);
      localStorage.setItem(`hadal.room.${code}`, JSON.stringify({ ...meta, hostName: name }));
    } else if (this.mode === 'lk') {
      return this.createLkRoom(meta, info);
    } else if (this.mode === 'p2p') {
      return this.createP2PRoom(meta, info);
    } else throw new Error('offline');
    await this.joinRoom(code, info);
    return code;
  }

  async joinRoom(code, { name, sub }) {
    const info = { name, sub: sub || 'hummel' };
    code = code.toUpperCase().trim();
    await this.ready();
    if (this.mode === 'lk') return this.joinLkRoom(code, info);
    if (this.mode === 'p2p') return this.joinP2PRoom(code, info);
    this.leaveRoom();
    const room = { code, meta: null, players: {}, handlers: {}, joinedAt: Date.now() };
    this.room = room;
    if (this.mode === 'firebase') {
      const { ref, get, set, onValue, onChildAdded, onDisconnect } = this.fb;
      const metaSnap = await get(ref(this.rtdb, `rooms/${code}/meta`));
      if (!metaSnap.exists()) {
        this.room = null;
        throw new Error('notfound');
      }
      const playersSnap = await get(ref(this.rtdb, `rooms/${code}/players`));
      const count = playersSnap.exists() ? Object.keys(playersSnap.val()).length : 0;
      const already = playersSnap.exists() && playersSnap.val()[this.uid];
      if (count >= 4 && !already) {
        this.room = null;
        throw new Error('full');
      }
      const pRef = ref(this.rtdb, `rooms/${code}/players/${this.uid}`);
      await set(pRef, { ...info, joined: Date.now() });
      onDisconnect(pRef).remove();
      this.unsubs.push(
        onValue(ref(this.rtdb, `rooms/${code}/meta`), (s) => {
          room.meta = s.val();
          room.handlers.meta && room.handlers.meta(room.meta);
        })
      );
      this.unsubs.push(
        onValue(ref(this.rtdb, `rooms/${code}/players`), (s) => {
          room.players = s.val() || {};
          room.handlers.players && room.handlers.players(room.players);
        })
      );
      this.unsubs.push(
        onChildAdded(ref(this.rtdb, `rooms/${code}/events`), (s) => {
          const ev = s.val();
          if (!ev || ev.by === this.uid || ev.ts < room.joinedAt - 3000) return;
          room.handlers.event && room.handlers.event(ev);
        })
      );
    } else if (this.mode === 'local') {
      const meta = JSON.parse(localStorage.getItem(`hadal.room.${code}`) || 'null');
      if (!meta) {
        this.room = null;
        throw new Error('notfound');
      }
      room.meta = meta;
      room.channel = new BroadcastChannel(`hadal-${code}`);
      room.players[this.uid] = { ...info, joined: Date.now() };
      room.channel.onmessage = (e) => this.handleMsg(room, e.data);
      room.channel.postMessage({ type: 'player', uid: this.uid, data: room.players[this.uid], hello: true });
      setTimeout(() => {
        room.handlers.meta && room.handlers.meta(room.meta);
        room.handlers.players && room.handlers.players(room.players);
      }, 50);
      window.addEventListener('beforeunload', () => this.leaveRoom());
    } else throw new Error('offline');
    return room;
  }

  on(kind, fn) {
    if (this.room) this.room.handlers[kind] = fn;
  }

  isHost() {
    return this.room && this.room.meta && this.room.meta.host === this.uid;
  }

  async startRoom(extra = {}) {
    if (!this.room) return;
    const upd = { status: 'running', startAt: this.now() + 8500, ...extra };
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      await update(ref(this.rtdb, `rooms/${this.room.code}/meta`), upd);
    } else this.localMeta(upd);
  }

  async resetRoom() {
    if (!this.room || !this.isHost()) return;
    const upd = { status: 'lobby', seed: Math.floor(Math.random() * 1e9), autoStartAt: this.now() + 40000 };
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      await update(ref(this.rtdb, `rooms/${this.room.code}/meta`), upd);
    } else this.localMeta(upd);
  }

  async updateMeta(upd) {
    if (!this.room) return;
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      await update(ref(this.rtdb, `rooms/${this.room.code}/meta`), upd);
    } else this.localMeta(upd);
  }

  localMeta(upd) {
    const room = this.room;
    room.meta = { ...room.meta, ...upd };
    if (room.channel) {
      localStorage.setItem(`hadal.room.${room.code}`, JSON.stringify(room.meta));
      room.channel.postMessage({ type: 'meta', meta: room.meta });
    } else if (room.isLk) {
      this.lkSend(room, { type: 'meta', meta: room.meta });
      if (this.isHost()) this.lkPushMeta(room);
    } else this.p2pSend({ type: 'meta', meta: room.meta });
    room.handlers.meta && room.handlers.meta(room.meta);
  }

  // send to the others (local tabs or peers)
  post(msg) {
    if (!this.room) return;
    if (this.room.channel) this.room.channel.postMessage(msg);
    else if (this.room.isLk) this.lkSend(this.room, msg);
    else this.p2pSend(msg);
  }

  sendState(s) {
    if (!this.room) return;
    if (this.mode === 'firebase') {
      const { ref, set } = this.fb;
      set(ref(this.rtdb, `rooms/${this.room.code}/players/${this.uid}/s`), s).catch(() => {});
    } else {
      this.room.players[this.uid] = { ...this.room.players[this.uid], s };
      this.post({ type: 'player', uid: this.uid, data: { s } });
    }
  }

  setPlayer(fields) {
    if (!this.room) return;
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      update(ref(this.rtdb, `rooms/${this.room.code}/players/${this.uid}`), fields).catch(() => {});
    } else {
      this.room.players[this.uid] = { ...this.room.players[this.uid], ...fields };
      this.post({ type: 'player', uid: this.uid, data: fields });
      this.room.handlers.players && this.room.handlers.players(this.room.players);
    }
  }

  sendEvent(ev) {
    if (!this.room) return;
    const full = { ...ev, by: this.uid, ts: this.now() };
    if (this.mode === 'firebase') {
      const { ref, push } = this.fb;
      push(ref(this.rtdb, `rooms/${this.room.code}/events`), full).catch(() => {});
    } else this.post({ type: 'event', ev: full });
  }

  leaveRoom() {
    if (!this.room) return;
    const room = this.room;
    this.unsubs.forEach((u) => {
      try {
        u();
      } catch (e) {
        /* ignore */
      }
    });
    this.unsubs = [];
    if (this.mode === 'firebase') {
      const { ref, remove } = this.fb;
      remove(ref(this.rtdb, `rooms/${room.code}/players/${this.uid}`)).catch(() => {});
      const others = Object.keys(room.players || {}).filter((u) => u !== this.uid);
      if (others.length === 0) remove(ref(this.rtdb, `rooms/${room.code}`)).catch(() => {});
    } else if (room.channel) {
      room.channel.postMessage({ type: 'leave', uid: this.uid });
      room.channel.close();
      if (room.meta && room.meta.host === this.uid) localStorage.removeItem(`hadal.room.${room.code}`);
    } else if (room.isLk) {
      room.leaving = true;
      clearTimeout(room.metaTimer);
      clearInterval(room.freshTimer);
      for (const tm of (room.away || new Map()).values()) clearTimeout(tm);
      const host = room.meta && room.meta.host === this.uid;
      this.lkSend(room, host ? { type: 'closed' } : { type: 'leave', uid: this.uid });
      const lk = room.lk;
      setTimeout(() => {
        try {
          lk && lk.disconnect();
        } catch (e) {
          /* ignore */
        }
      }, 250);
      if (!host) this.offset = 0;
    } else if (room.peer) {
      this.room = null;
      try {
        if (room.p2pHost) for (const c of room.conns.values()) c.open && c.send({ type: 'closed' });
        else if (room.hostConn && room.hostConn.open) room.hostConn.send({ type: 'leave', uid: this.uid });
      } catch (e) {
        /* ignore */
      }
      setTimeout(() => {
        try {
          room.peer.destroy();
        } catch (e) {
          /* ignore */
        }
      }, 300);
      if (!room.p2pHost) this.offset = 0;
    }
    this.room = null;
  }
}
