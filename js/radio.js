// iamSubPilot radio ("Funk"): push-to-talk voice between the divers of a room.
// Its own channel, nothing shared with any other game. In LiveKit rooms the voice goes through the game's own
// LiveKit project (one audio track per diver, silent unless the radio button is held); in peer-to-peer rooms
// it travels directly between the browsers (WebRTC media calls over PeerJS). Voice is never stored.
//
// - hold the radio button (or R) to talk, tap three times to keep it open (tap again to close)
// - max 45 s per transmission unless locked; a lock closes itself after 15 min
// - mute single divers or the whole radio
// - quick radio calls (fixed phrases) for everyone; voice from 14 years (set in the game)

import { audio } from './audio.js';

const MAX_TALK = 45000;
const MAX_LOCK = 15 * 60000;

export class Radio {
  constructor(net, { onTalk, onError } = {}) {
    this.net = net;
    this.peer = net.room && net.room.peer;
    this.calls = new Map(); // remote peer id -> { call, el, uid }
    this.mutedUids = new Set();
    this.enabled = true;
    this.talking = false;
    this.locked = false;
    this.onTalk = onTalk || (() => {});
    this.onError = onError || (() => {});
    this.taps = [];
    audio.init();
    const ctx = audio.ctx;
    this.dest = ctx.createMediaStreamDestination();
    this.gate = ctx.createGain();
    this.gate.gain.value = 0;
    this.gate.connect(this.dest);
    // keep a silent carrier running so the outgoing track always exists
    const carrier = ctx.createConstantSource ? ctx.createConstantSource() : null;
    if (carrier) {
      const zero = ctx.createGain();
      zero.gain.value = 0;
      carrier.connect(zero);
      zero.connect(this.dest);
      carrier.start();
      this.carrier = carrier;
    }
    this.stream = this.dest.stream;
    // LiveKit room: publish the (gated) radio track once, play the others' tracks
    this.lkRoom = net.room && net.room.isLk ? net.room : null;
    this.lkEls = new Map(); // uid -> audio element
    if (this.lkRoom) {
      const r = this.lkRoom;
      const tr = this.stream.getAudioTracks()[0];
      const publish = () => {
        if (this.destroyed || !tr || !r.lk || !r.LK) return;
        r.lk.localParticipant.publishTrack(tr, { source: r.LK.Track.Source.Microphone, name: 'radio', dtx: true }).then((pub) => (this.lkPub = pub)).catch(() => this.onError('mic'));
      };
      publish();
      r.onRejoin = publish; // after a lost connection the track has to be published again
      r.onAudio = (uid, track) => this.attachLk(uid, track);
      r.onAudioGone = (uid) => this.detachLk(uid);
      for (const [uid, track] of r.audio) this.attachLk(uid, track);
    }
    this.onCall = (call) => {
      if (this.destroyed) return;
      call.answer(this.stream);
      this.attach(call, call.peer, call.metadata && call.metadata.uid);
    };
    if (this.peer) this.peer.on('call', this.onCall);
  }

  get available() {
    return !!(this.peer || this.lkRoom);
  }

  attachLk(uid, track) {
    if (this.destroyed) return;
    this.detachLk(uid);
    const el = track.attach();
    el.style.display = 'none';
    el.playsInline = true;
    document.body.append(el);
    this.lkEls.set(uid, el);
    this.applyMutes();
    el.play && el.play().catch(() => {});
  }

  detachLk(uid) {
    const el = this.lkEls.get(uid);
    if (!el) return;
    this.lkEls.delete(uid);
    try {
      el.pause();
      el.srcObject = null;
      el.remove();
    } catch (e) {
      /* gone */
    }
  }

  // keep one call to every other diver (the one with the "smaller" peer id calls)
  sync(players) {
    if (this.lkRoom) return this.applyMutes(); // LiveKit connects everybody by itself
    if (!this.peer || this.destroyed) return;
    const me = this.peer.id;
    const live = new Set();
    for (const [uid, p] of Object.entries(players || {})) {
      if (uid === this.net.uid || !p.pid) continue;
      live.add(p.pid);
      const c = this.calls.get(p.pid);
      if (c) c.uid = uid;
      else if (me < p.pid) {
        try {
          const call = this.peer.call(p.pid, this.stream, { metadata: { uid: this.net.uid } });
          if (call) this.attach(call, p.pid, uid);
        } catch (e) {
          /* try again on the next update */
        }
      }
    }
    for (const pid of [...this.calls.keys()]) if (!live.has(pid)) this.closeCall(pid);
    this.applyMutes();
  }

  attach(call, pid, uid) {
    const entry = { call, el: null, uid };
    this.calls.set(pid, entry);
    call.on('stream', (remote) => {
      if (entry.el) return;
      const el = new Audio();
      el.autoplay = true;
      el.playsInline = true;
      el.srcObject = remote;
      entry.el = el;
      this.applyMutes();
      el.play().catch(() => {});
    });
    const gone = () => {
      if (this.calls.get(pid) === entry) this.closeCall(pid);
    };
    call.on('close', gone);
    call.on('error', gone);
  }

  closeCall(pid) {
    const c = this.calls.get(pid);
    if (!c) return;
    this.calls.delete(pid);
    try {
      c.call.close();
    } catch (e) {
      /* closed */
    }
    if (c.el) {
      c.el.pause();
      c.el.srcObject = null;
    }
  }

  applyMutes() {
    for (const c of this.calls.values()) if (c.el) c.el.muted = !this.enabled || this.mutedUids.has(c.uid) || audio.mode === 'off';
    for (const [uid, el] of this.lkEls) el.muted = !this.enabled || this.mutedUids.has(uid) || audio.mode === 'off';
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on && this.talking) this.stop(true);
    this.applyMutes();
  }

  toggleMute(uid) {
    if (this.mutedUids.has(uid)) this.mutedUids.delete(uid);
    else this.mutedUids.add(uid);
    this.applyMutes();
  }

  async ensureMic() {
    if (this.mic) return true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const ctx = audio.ctx;
      const src = ctx.createMediaStreamSource(s);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 220;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 4200;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(this.gate);
      this.mic = s;
      return true;
    } catch (e) {
      this.onError('mic');
      return false;
    }
  }

  // button / key pressed
  async press() {
    if (!this.enabled || this.destroyed) return;
    const now = performance.now();
    this.taps = this.taps.filter((x) => now - x < 900);
    this.taps.push(now);
    if (this.locked) {
      // a tap while locked closes the channel
      this.locked = false;
      this.stop();
      this.taps = [];
      return;
    }
    if (this.taps.length >= 3) {
      this.taps = [];
      this.locked = true;
      clearTimeout(this.lockTimer);
      this.lockTimer = setTimeout(() => {
        this.locked = false;
        this.stop();
      }, MAX_LOCK);
    }
    this.pressed = true;
    if (!(await this.ensureMic())) return;
    // the button may already be released while the microphone was starting
    if ((this.pressed || this.locked) && !this.talking) this.start();
  }

  release() {
    this.pressed = false;
    if (!this.locked && this.talking) this.stop();
  }

  start() {
    this.talking = true;
    audio.init();
    const t = audio.ctx.currentTime;
    this.gate.gain.setTargetAtTime(1, t, 0.02);
    audio.squelch();
    audio.duck(true);
    this.net.setPlayer({ talk: 1 });
    clearTimeout(this.talkTimer);
    this.talkTimer = setTimeout(() => {
      if (!this.locked) this.stop();
    }, MAX_TALK);
    this.onTalk(true);
  }

  stop(silent = false) {
    if (!this.talking) return;
    this.talking = false;
    clearTimeout(this.talkTimer);
    const t = audio.ctx.currentTime;
    this.gate.gain.setTargetAtTime(0, t, 0.03);
    if (!silent) audio.squelch(true);
    audio.duck(false);
    this.net.setPlayer({ talk: 0 });
    this.onTalk(false);
  }

  destroy() {
    this.destroyed = true;
    if (this.talking) this.stop(true);
    clearTimeout(this.lockTimer);
    for (const pid of [...this.calls.keys()]) this.closeCall(pid);
    if (this.peer) this.peer.off('call', this.onCall);
    for (const uid of [...this.lkEls.keys()]) this.detachLk(uid);
    if (this.lkRoom) {
      this.lkRoom.onAudio = this.lkRoom.onAudioGone = this.lkRoom.onRejoin = null;
      if (this.lkPub && this.lkRoom.lk && this.lkRoom.lk.state !== 'disconnected') this.lkRoom.lk.localParticipant.unpublishTrack(this.lkPub.track, false).catch(() => {});
    }
    if (this.mic) this.mic.getTracks().forEach((tr) => tr.stop());
    if (this.carrier) {
      try {
        this.carrier.stop();
      } catch (e) {
        /* stopped */
      }
    }
    audio.duck(false);
  }
}

// quick radio calls: fixed phrases, safe for every age
export const QUICK_CALLS = [
  { k: 'look', en: '👀 Look over here!', de: '👀 Schaut mal hier!' },
  { k: 'found', en: '🐙 I found something!', de: '🐙 Ich hab was entdeckt!' },
  { k: 'follow', en: '➡️ Follow me!', de: '➡️ Folgt mir!' },
  { k: 'wait', en: '✋ Wait for me!', de: '✋ Wartet auf mich!' },
  { k: 'deep', en: '⬇️ Down we go!', de: '⬇️ Ab in die Tiefe!' },
  { k: 'up', en: '⬆️ I am surfacing.', de: '⬆️ Ich tauche auf.' },
  { k: 'help', en: '🆘 Help – low energy!', de: '🆘 Hilfe – Energie knapp!' },
  { k: 'great', en: '👍 Great job!', de: '👍 Super gemacht!' },
];
