// Online features: leaderboard (Firestore) and realtime rooms.
// Rooms: Firebase Realtime Database if configured, otherwise peer-to-peer
// (WebRTC via PeerJS – works without any setup). The host's browser relays
// all messages. For testing, ?local=1 uses tabs on the same device instead.

import { FIREBASE_CONFIG } from './config.js';
import { randomCode } from './util.js';

const LB_PREFIX = 'hadal.lb.';

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
    this.mode = 'none'; // 'firebase' | 'local' | 'p2p' | 'none'
    this.lbOnline = false;
    this.mpAvailable = false;
    this.uid = 'u' + Math.random().toString(36).slice(2, 10);
    this.room = null;
    this.offset = 0;
    this.unsubs = [];
  }

  async init() {
    const params = new URLSearchParams(location.search);
    if (FIREBASE_CONFIG) {
      try {
        const fb = await import('./vendor/firebase.min.js');
        this.fb = fb;
        this.app = fb.initializeApp(FIREBASE_CONFIG);
        this.auth = fb.getAuth(this.app);
        const cred = await fb.signInAnonymously(this.auth);
        this.uid = cred.user.uid;
        this.db = fb.getFirestore(this.app);
        this.lbOnline = true;
        if (FIREBASE_CONFIG.databaseURL) {
          this.rtdb = fb.getDatabase(this.app);
          this.mpAvailable = true;
          fb.onValue(fb.ref(this.rtdb, '.info/serverTimeOffset'), (snap) => {
            this.offset = snap.val() || 0;
          });
        }
        this.mode = 'firebase';
        return;
      } catch (e) {
        console.warn('Firebase not available, playing offline.', e);
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

  // ---------------- peer-to-peer transport ----------------
  async peerLib() {
    // window.__FAKE_PEER__ lets automated tests run rooms without a network
    if (!this.PeerCls) this.PeerCls = window.__FAKE_PEER__ || (await import('./vendor/peerjs.min.js')).Peer;
    return this.PeerCls;
  }

  openPeer(id) {
    return new Promise(async (resolve, reject) => {
      const Peer = await this.peerLib();
      const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
      const to = setTimeout(() => reject(new Error('timeout')), 12000);
      peer.once('open', () => {
        clearTimeout(to);
        resolve(peer);
      });
      peer.once('error', (e) => {
        clearTimeout(to);
        try {
          peer.destroy();
        } catch (x) {
          /* ignore */
        }
        reject(new Error(e.type === 'unavailable-id' ? 'taken' : e.type === 'peer-unavailable' ? 'notfound' : 'p2p'));
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

  async createP2PRoom(meta, name) {
    let peer = null;
    let code;
    for (let i = 0; i < 4 && !peer; i++) {
      code = randomCode(4);
      try {
        peer = await this.openPeer('hadal-v1-' + code);
      } catch (e) {
        if (e.message !== 'taken') throw e;
      }
    }
    if (!peer) throw new Error('p2p');
    this.leaveRoom();
    const room = { code, meta, players: { [this.uid]: { name, joined: Date.now() } }, handlers: {}, joinedAt: Date.now(), peer, p2pHost: true, conns: new Map() };
    this.room = room;
    this.offset = 0;
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

  async joinP2PRoom(code, name) {
    const peer = await this.openPeer(null);
    this.leaveRoom();
    const room = { code, meta: null, players: {}, handlers: {}, joinedAt: Date.now(), peer, p2pHost: false };
    this.room = room;
    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('notfound')), 12000);
      peer.on('error', (e) => {
        clearTimeout(to);
        reject(new Error(e.type === 'peer-unavailable' ? 'notfound' : 'p2p'));
      });
      const conn = peer.connect('hadal-v1-' + code, { reliable: true });
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
        conn.send({ type: 'player', uid: this.uid, data: { name }, hello: true });
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
        await addDoc(collection(this.db, 'boards', board, 'scores'), { ...entry, uid: this.uid, createdAt: serverTimestamp() });
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
  async createRoom({ mode, level, name }) {
    let code = randomCode(4);
    const meta = { mode, level, host: this.uid, status: 'lobby', seed: Math.floor(Math.random() * 1e9), createdAt: Date.now() };
    if (this.mode === 'firebase') {
      const { ref, get, set } = this.fb;
      for (let i = 0; i < 5; i++) {
        const snap = await get(ref(this.rtdb, `rooms/${code}/meta`));
        if (!snap.exists()) break;
        code = randomCode(4);
      }
      await set(ref(this.rtdb, `rooms/${code}/meta`), meta);
    } else if (this.mode === 'local') {
      localStorage.setItem(`hadal.room.${code}`, JSON.stringify(meta));
    } else if (this.mode === 'p2p') {
      return this.createP2PRoom(meta, name);
    } else throw new Error('offline');
    await this.joinRoom(code, { name });
    return code;
  }

  async joinRoom(code, { name }) {
    code = code.toUpperCase().trim();
    if (this.mode === 'p2p') return this.joinP2PRoom(code, name);
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
      await set(pRef, { name, joined: Date.now() });
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
      room.players[this.uid] = { name, joined: Date.now() };
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
    const upd = { status: 'lobby', seed: Math.floor(Math.random() * 1e9) };
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
    } else this.p2pSend({ type: 'meta', meta: room.meta });
    room.handlers.meta && room.handlers.meta(room.meta);
  }

  // send to the others (local tabs or peers)
  post(msg) {
    if (!this.room) return;
    if (this.room.channel) this.room.channel.postMessage(msg);
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
