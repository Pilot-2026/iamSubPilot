// Online features: leaderboard (Firestore) and realtime rooms (Realtime Database).
// Without a Firebase config the game uses a local leaderboard, and multiplayer is off.
// For testing, ?local=1 enables "rooms" between browser tabs on the same device.

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
    this.mode = 'none'; // 'firebase' | 'local' | 'none'
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
    }
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
    } else throw new Error('offline');
    await this.joinRoom(code, { name });
    return code;
  }

  async joinRoom(code, { name }) {
    code = code.toUpperCase().trim();
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
      room.channel.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'player') {
          room.players[m.uid] = { ...(room.players[m.uid] || {}), ...m.data };
          room.handlers.players && room.handlers.players(room.players);
          if (m.hello) room.channel.postMessage({ type: 'player', uid: this.uid, data: room.players[this.uid] });
        } else if (m.type === 'leave') {
          delete room.players[m.uid];
          room.handlers.players && room.handlers.players(room.players);
        } else if (m.type === 'meta') {
          room.meta = m.meta;
          room.handlers.meta && room.handlers.meta(room.meta);
        } else if (m.type === 'event') {
          room.handlers.event && room.handlers.event(m.ev);
        }
      };
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
    const upd = { status: 'running', startAt: this.now() + 4000, ...extra };
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      await update(ref(this.rtdb, `rooms/${this.room.code}/meta`), upd);
    } else {
      this.room.meta = { ...this.room.meta, ...upd };
      localStorage.setItem(`hadal.room.${this.room.code}`, JSON.stringify(this.room.meta));
      this.room.channel.postMessage({ type: 'meta', meta: this.room.meta });
      this.room.handlers.meta && this.room.handlers.meta(this.room.meta);
    }
  }

  async resetRoom() {
    if (!this.room || !this.isHost()) return;
    const upd = { status: 'lobby', seed: Math.floor(Math.random() * 1e9) };
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      await update(ref(this.rtdb, `rooms/${this.room.code}/meta`), upd);
    } else {
      this.room.meta = { ...this.room.meta, ...upd };
      this.room.channel.postMessage({ type: 'meta', meta: this.room.meta });
      this.room.handlers.meta && this.room.handlers.meta(this.room.meta);
    }
  }

  async updateMeta(upd) {
    if (!this.room) return;
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      await update(ref(this.rtdb, `rooms/${this.room.code}/meta`), upd);
    } else {
      this.room.meta = { ...this.room.meta, ...upd };
      localStorage.setItem(`hadal.room.${this.room.code}`, JSON.stringify(this.room.meta));
      this.room.channel.postMessage({ type: 'meta', meta: this.room.meta });
      this.room.handlers.meta && this.room.handlers.meta(this.room.meta);
    }
  }

  sendState(s) {
    if (!this.room) return;
    if (this.mode === 'firebase') {
      const { ref, set } = this.fb;
      set(ref(this.rtdb, `rooms/${this.room.code}/players/${this.uid}/s`), s).catch(() => {});
    } else if (this.room.channel) {
      this.room.players[this.uid] = { ...this.room.players[this.uid], s };
      this.room.channel.postMessage({ type: 'player', uid: this.uid, data: { s } });
    }
  }

  setPlayer(fields) {
    if (!this.room) return;
    if (this.mode === 'firebase') {
      const { ref, update } = this.fb;
      update(ref(this.rtdb, `rooms/${this.room.code}/players/${this.uid}`), fields).catch(() => {});
    } else if (this.room.channel) {
      this.room.players[this.uid] = { ...this.room.players[this.uid], ...fields };
      this.room.channel.postMessage({ type: 'player', uid: this.uid, data: fields });
      this.room.handlers.players && this.room.handlers.players(this.room.players);
    }
  }

  sendEvent(ev) {
    if (!this.room) return;
    const full = { ...ev, by: this.uid, ts: this.now() };
    if (this.mode === 'firebase') {
      const { ref, push } = this.fb;
      push(ref(this.rtdb, `rooms/${this.room.code}/events`), full).catch(() => {});
    } else if (this.room.channel) {
      this.room.channel.postMessage({ type: 'event', ev: full });
    }
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
    }
    this.room = null;
  }
}
