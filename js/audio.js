// All sounds are synthesised with the Web Audio API – no audio files needed.
// Two buses: sound effects and music. Sound modes: all | fx | music | off.

export const SOUND_MODES = ['all', 'fx', 'music', 'off'];
// Music: several cheerful pieces (major / mixolydian / lydian keys) that take turns.
// Whale song and dolphin whistles stay part of every piece.
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
// progression = scale degrees (0-based) of chord roots; chords are built from the scale (triad + 7th/9th colour)
const TRACKS = [
  { name: 'Sunny Reef', root: 60, scale: 'major', prog: [0, 4, 5, 3], bpm: 96, beats: 4, arp: [0, 2, 1, 3, 2, 1, 3, 4], melody: 0.55, sparkle: 0.35 },
  { name: 'Bubble Waltz', root: 65, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], bpm: 132, beats: 3, arp: [0, 1, 2, 3, 2, 1], melody: 0.45, sparkle: 0.3 },
  { name: 'Dolphin Dance', root: 55, scale: 'mixo', prog: [0, 6, 3, 0], bpm: 112, beats: 4, arp: [0, 2, 3, 2, 4, 2, 3, 1], melody: 0.6, sparkle: 0.25, dolphins: 2 },
  { name: 'Floating Lights', root: 62, scale: 'lydian', prog: [0, 1, 0, 4], bpm: 84, beats: 4, arp: [0, 1, 2, 4, 3, 2, 1, 2], melody: 0.4, sparkle: 0.55 },
  { name: "Explorer's March", root: 57, scale: 'major', prog: [0, 3, 5, 4], bpm: 104, beats: 4, arp: [0, 2, 4, 2, 1, 2, 3, 2], melody: 0.6, sparkle: 0.3 },
  // more cheerful pieces – some with many whale songs, some with lots of dolphins
  { name: 'Humpback Lullaby', root: 58, scale: 'major', prog: [0, 5, 3, 4], bpm: 76, beats: 4, arp: [0, 1, 2, 3, 2, 1, 2, 1], melody: 0.4, sparkle: 0.5, whales: 2.4 },
  { name: 'Coral Carnival', root: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], bpm: 124, beats: 4, arp: [0, 2, 1, 2, 3, 2, 4, 2], melody: 0.65, sparkle: 0.3, dolphins: 2.6 },
  { name: 'Sea Turtle Stroll', root: 60, scale: 'mixo', prog: [0, 3, 0, 4], bpm: 92, beats: 4, arp: [0, 2, 3, 1, 2, 3, 4, 3], melody: 0.55, sparkle: 0.35, whales: 1.4 },
  { name: 'Moonlit Lagoon', root: 64, scale: 'lydian', prog: [0, 1, 5, 4], bpm: 80, beats: 3, arp: [0, 2, 3, 4, 3, 2], melody: 0.45, sparkle: 0.6, whales: 1.8, dolphins: 1.2 },
  { name: 'Happy Plankton', root: 67, scale: 'major', prog: [0, 3, 4, 0], bpm: 140, beats: 4, arp: [0, 1, 2, 1, 3, 1, 2, 1], melody: 0.5, sparkle: 0.4, dolphins: 2 },
  { name: 'Whale Song Sunrise', root: 55, scale: 'major', prog: [0, 4, 3, 4, 5, 3, 0, 4], bpm: 88, beats: 4, arp: [0, 2, 4, 3, 2, 4, 3, 1], melody: 0.5, sparkle: 0.45, whales: 2.8, dolphins: 1.3 },
  { name: 'Bubble Polka', root: 65, scale: 'major', prog: [0, 4, 0, 4, 3, 0, 4, 0], bpm: 120, beats: 2, arp: [0, 2, 1, 3], melody: 0.6, sparkle: 0.3, dolphins: 1.8 },
];
const BARS_PER_TRACK = 28; // about 1–1.5 minutes, then the next piece follows
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class AudioFX {
  constructor() {
    this.ctx = null;
    let mode = localStorage.getItem('hadal.sound');
    if (!SOUND_MODES.includes(mode)) mode = localStorage.getItem('hadal.muted') === '1' ? 'off' : 'all';
    this.mode = mode;
    this.engine = null;
    this.ambient = null;
    this.scene = null;
    this.timer = null;
  }

  get muted() {
    return this.mode === 'off';
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.fxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.fxBus.connect(this.master);
    this.musicBus.connect(this.master);
    // echo for the sonar
    this.delay = this.ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.42;
    this.fb = this.ctx.createGain();
    this.fb.gain.value = 0.38;
    this.delay.connect(this.fb);
    this.fb.connect(this.delay);
    this.delay.connect(this.fxBus);
    // big underwater reverb for the music
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.5);
    this.revGain = this.ctx.createGain();
    this.revGain.gain.value = 0.9;
    this.reverb.connect(this.revGain);
    this.revGain.connect(this.musicBus);
    this.mDelay = this.ctx.createDelay(2);
    this.mDelay.delayTime.value = 0.55;
    this.mFb = this.ctx.createGain();
    this.mFb.gain.value = 0.42;
    this.mDelay.connect(this.mFb);
    this.mFb.connect(this.mDelay);
    this.mDelay.connect(this.reverb);
    this.mDelay.connect(this.musicBus);
    this.applyMode();
    if (this.scene) this.startScheduler();
  }

  impulse(sec) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * sec);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  setMode(mode) {
    if (!SOUND_MODES.includes(mode)) mode = 'all';
    this.mode = mode;
    localStorage.setItem('hadal.sound', mode);
    this.applyMode();
  }

  cycleMode() {
    const i = SOUND_MODES.indexOf(this.mode);
    this.setMode(SOUND_MODES[(i + 1) % SOUND_MODES.length]);
    return this.mode;
  }

  // old API
  setMuted(m) {
    this.setMode(m ? 'off' : 'all');
  }

  applyMode() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const fxOn = this.mode === 'all' || this.mode === 'fx';
    const musicOn = this.mode === 'all' || this.mode === 'music';
    this.fxBus.gain.setTargetAtTime(fxOn ? 1 : 0, t, 0.05);
    this.musicBus.gain.setTargetAtTime(musicOn ? this.musicLevel() : 0, t, 0.3);
  }

  musicLevel() {
    return this.scene === 'dive' ? 0.55 : 0.85;
  }

  // ---------------- music ----------------
  music(scene) {
    if (scene === this.scene) return;
    this.scene = scene;
    if (!this.ctx) return;
    this.applyMode();
    if (scene && this.timer && this.track) {
      // new scene (title, menu, dive): a new piece starts
      this.setTrack((this.trackIdx + 1) % TRACKS.length, this.ctx.currentTime + 0.3);
      try { localStorage.setItem('hadal.track', String(this.trackIdx)); } catch (e) { /* ignore */ }
    }
    if (scene) this.startScheduler();
    else this.stopScheduler();
  }

  startScheduler() {
    if (this.timer) return;
    // every start begins with a different piece (remembered on this device)
    let idx = Number(localStorage.getItem('hadal.track'));
    idx = Number.isFinite(idx) ? (idx + 1) % TRACKS.length : Math.floor(Math.random() * TRACKS.length);
    try { localStorage.setItem('hadal.track', String(idx)); } catch (e) { /* storage may be blocked */ }
    this.setTrack(idx, this.ctx.currentTime + 0.15);
    const now = this.ctx.currentTime;
    this.next.whale = now + 3;
    this.next.dolphin = now + 7;
    this.next.ping = now + 2;
    this.timer = setInterval(() => this.schedule(), 150);
  }

  setTrack(idx, t0) {
    this.trackIdx = idx;
    const tr = TRACKS[idx];
    this.track = tr;
    this.spb = 60 / tr.bpm;
    this.next = { ...(this.next || {}), beat: t0, beatIdx: 0, motif: null };
  }

  stopScheduler() {
    clearInterval(this.timer);
    this.timer = null;
  }

  // chord tones (midi) for scale degree d of the current track
  chordOf(d, extra = true) {
    const tr = this.track, sc = SCALES[tr.scale];
    const note = (k) => tr.root + sc[(d + k) % 7] + 12 * Math.floor((d + k) / 7);
    const ch = [note(0), note(2), note(4)];
    if (extra) ch.push(note(6), note(8)); // 7th and 9th for a soft, open sound
    return ch;
  }

  scaleNote(step) {
    const tr = this.track, sc = SCALES[tr.scale];
    return tr.root + sc[((step % 7) + 7) % 7] + 12 * Math.floor(step / 7);
  }

  schedule() {
    if (!this.ctx || !this.scene) return;
    const N = this.next;
    const now = this.ctx.currentTime;
    if (this.mode === 'fx' || this.mode === 'off' || document.hidden) {
      // keep the clock moving without playing
      if (N.beat < now) N.beat = now + 0.2;
      for (const k of ['whale', 'dolphin', 'ping']) if (N[k] < now) N[k] = now + 1;
      return;
    }
    const ahead = now + 0.45;
    const intro = this.scene !== 'dive';
    const tr = this.track;
    const spb = this.spb;
    const dens = intro ? 1 : 0.6;
    while (N.beat < ahead) {
      const b = N.beatIdx;
      const t = N.beat;
      const bar = Math.floor(b / tr.beats);
      const beatInBar = b % tr.beats;
      const deg = tr.prog[bar % tr.prog.length];
      const chord = this.chordOf(deg);
      if (beatInBar === 0) {
        this.pad(chord, t, tr.beats * spb + 1.2, intro ? 0.032 : 0.022);
        this.bass(chord[0] - 24, t, tr.beats * spb * 0.9, intro ? 0.11 : 0.08);
        if (bar % 2 === 0) N.motif = this.makeMotif(deg);
      } else if (tr.beats === 4 && beatInBar === 2) {
        this.bass(chord[0] - 24 + 7, t, spb * 1.6, intro ? 0.06 : 0.045);
      }
      // arpeggio in eighth notes (kalimba / marimba)
      for (let half = 0; half < 2; half++) {
        const k = (beatInBar * 2 + half) % tr.arp.length;
        if (Math.random() < 0.9 * dens) this.pluck(chord[tr.arp[k] % chord.length] + (tr.arp[k] >= chord.length ? 12 : 0), t + half * spb * 0.5, intro ? 0.06 : 0.042);
      }
      // a little tune on top
      if (N.motif && Math.random() < tr.melody * dens) {
        const m = N.motif[(bar % 2) * tr.beats + beatInBar];
        if (m != null) this.lead(m, t + (Math.random() < 0.3 ? spb * 0.5 : 0), spb * 1.4, intro ? 0.05 : 0.035);
      }
      // sparkling bells now and then
      if (Math.random() < tr.sparkle * dens * 0.35) this.bell(this.scaleNote(14 + Math.floor(Math.random() * 7)), t + spb * 0.25, 0.03);
      // soft shaker on the off-beats
      if (intro) this.shaker(t + spb * 0.5, 0.012);
      N.beat += spb;
      N.beatIdx++;
      if (N.beatIdx >= BARS_PER_TRACK * tr.beats) {
        // next piece: a short bell flourish, then the new key
        [0, 2, 4, 7].forEach((st, i) => this.bell(this.scaleNote(14 + st), N.beat + i * 0.12, 0.03));
        this.setTrack((this.trackIdx + 1) % TRACKS.length, N.beat + 0.9);
        try { localStorage.setItem('hadal.track', String(this.trackIdx)); } catch (e) { /* ignore */ }
        break;
      }
    }
    if (N.whale < ahead) {
      this.whale(N.whale);
      N.whale += ((intro ? 7 : 11) + Math.random() * (intro ? 7 : 10)) / (tr.whales || 1);
    }
    if (N.dolphin < ahead) {
      this.dolphins(N.dolphin);
      N.dolphin += ((intro ? 6 : 11) + Math.random() * 8) / (tr.dolphins || 1);
    }
    if (N.ping < ahead) {
      this.sounder(N.ping);
      N.ping += intro ? 8 : 9;
    }
  }

  // 8-step tune from the scale, leaning on chord tones, with rests
  makeMotif(deg) {
    const steps = [];
    let cur = deg + 7 + [0, 2, 4][Math.floor(Math.random() * 3)];
    for (let i = 0; i < 8; i++) {
      if (Math.random() < 0.3) {
        steps.push(null);
        continue;
      }
      cur += [-2, -1, 1, 1, 2, 0][Math.floor(Math.random() * 6)];
      cur = Math.max(deg + 5, Math.min(deg + 14, cur));
      steps.push(this.scaleNote(cur));
    }
    return steps;
  }

  pad(notes, t0, dur, vol) {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t0);
    f.frequency.linearRampToValueAtTime(1700, t0 + dur * 0.5);
    f.frequency.linearRampToValueAtTime(1000, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(1.2, dur * 0.3));
    g.gain.setValueAtTime(vol, Math.max(t0 + 1.2, t0 + dur - 1.2));
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g);
    g.connect(this.musicBus);
    g.connect(this.reverb);
    for (const n of notes.slice(0, 4)) {
      for (const det of [-5, 5]) {
        const o = c.createOscillator();
        o.type = det < 0 ? 'sine' : 'triangle';
        o.frequency.value = mtof(n);
        o.detune.value = det;
        o.connect(f);
        o.start(t0);
        o.stop(t0 + dur + 0.1);
      }
    }
  }

  // kalimba / marimba-like pluck
  pluck(midi, t, vol) {
    const c = this.ctx;
    const f0 = mtof(midi);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    g.connect(this.musicBus);
    g.connect(this.reverb);
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f0;
    o.connect(g);
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f0 * 4.02;
    const g2 = c.createGain();
    g2.gain.setValueAtTime(vol * 0.35, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o2.connect(g2);
    g2.connect(this.musicBus);
    o.start(t);
    o2.start(t);
    o.stop(t + 1);
    o2.stop(t + 0.15);
  }

  lead(midi, t, dur, vol) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(midi);
    const vib = c.createOscillator();
    vib.frequency.value = 5.2;
    const vg = c.createGain();
    vg.gain.value = mtof(midi) * 0.006;
    vib.connect(vg);
    vg.connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
    g.gain.exponentialRampToValueAtTime(vol * 0.6, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.musicBus);
    g.connect(this.mDelay);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.05);
    vib.stop(t + dur + 0.05);
  }

  bass(midi, t, dur, vol) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = mtof(midi);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  bell(midi, t, vol) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(midi);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g);
    g.connect(this.reverb);
    g.connect(this.mDelay);
    o.start(t);
    o.stop(t + 2.3);
  }

  shaker(t, vol) {
    const c = this.ctx;
    if (!this.shakeBuf) {
      this.shakeBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate);
      const d = this.shakeBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    const s = c.createBufferSource();
    s.buffer = this.shakeBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    s.start(t);
  }

  // Long gliding moans like humpback song units, with vibrato and lots of reverb.
  whale(t0) {
    const c = this.ctx;
    const phrases = 1 + Math.floor(Math.random() * 3);
    let t = t0;
    for (let p = 0; p < phrases; p++) {
      const dur = 1.6 + Math.random() * 2.4;
      // glide between notes of the current key (friendly, singing range)
      const step = Math.floor(Math.random() * 7);
      const base = mtof((this.track ? this.scaleNote(step) : 60 + step) - (Math.random() < 0.3 ? 12 : 0));
      const o = c.createOscillator();
      o.type = Math.random() < 0.5 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(base, t);
      const up = [1.122, 1.26, 1.335, 1.498][Math.floor(Math.random() * 4)]; // a 2nd, 3rd, 4th or 5th up
      o.frequency.exponentialRampToValueAtTime(base * up, t + dur * 0.45);
      o.frequency.exponentialRampToValueAtTime(base * (Math.random() < 0.5 ? 1 : up * 0.94), t + dur);
      const lfo = c.createOscillator();
      lfo.frequency.value = 4 + Math.random() * 3;
      const lg = c.createGain();
      lg.gain.value = base * 0.02;
      lfo.connect(lg);
      lg.connect(o.frequency);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = base * 2;
      bp.Q.value = 0.7;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(bp);
      bp.connect(g);
      g.connect(this.reverb);
      g.connect(this.mDelay);
      const dry = c.createGain();
      dry.gain.value = 0.35;
      g.connect(dry);
      dry.connect(this.musicBus);
      o.start(t);
      lfo.start(t);
      o.stop(t + dur + 0.05);
      lfo.stop(t + dur + 0.05);
      t += dur + 0.3 + Math.random() * 0.8;
    }
  }

  // Quick high whistles and click trains.
  dolphins(t0) {
    const c = this.ctx;
    const n = 2 + Math.floor(Math.random() * 3);
    let t = t0;
    for (let i = 0; i < n; i++) {
      const dur = 0.25 + Math.random() * 0.5;
      const o = c.createOscillator();
      o.type = 'sine';
      const f0 = 5000 + Math.random() * 4000;
      const curve = new Float32Array(16);
      const shape = Math.floor(Math.random() * 3);
      for (let k = 0; k < 16; k++) {
        const x = k / 15;
        const s = shape === 0 ? Math.sin(x * Math.PI) : shape === 1 ? x : Math.sin(x * Math.PI * 2.5) * 0.5 + x * 0.5;
        curve[k] = f0 * (0.75 + s * 0.7);
      }
      o.frequency.setValueCurveAtTime(curve, t, dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.musicBus);
      g.connect(this.reverb);
      o.start(t);
      o.stop(t + dur + 0.05);
      t += dur + 0.05 + Math.random() * 0.25;
    }
    if (Math.random() < 0.7) {
      const clicks = 10 + Math.floor(Math.random() * 25);
      const rate = 25 + Math.random() * 60;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.003), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3500;
      const g = c.createGain();
      g.gain.value = 0.12;
      hp.connect(g);
      g.connect(this.musicBus);
      for (let i = 0; i < clicks; i++) {
        const s = c.createBufferSource();
        s.buffer = buf;
        s.connect(hp);
        s.start(t + i / rate + Math.random() * 0.004);
      }
    }
  }

  // Echo sounder "ping" with long echoes.
  sounder(t0) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(this.track ? mtof(this.track.root + 24 + 7) : 1480, t0);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    o.connect(g);
    g.connect(this.mDelay);
    g.connect(this.musicBus);
    o.start(t0);
    o.stop(t0 + 0.75);
  }


  tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.01, toFreq = null, echo = false, when = 0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.fxBus);
    if (echo) g.connect(this.delay);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise(dur, { vol = 0.2, freq = 1000, q = 1, type = 'bandpass', when = 0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.fxBus);
    src.start(t0);
  }

  ping() {
    this.tone(1250, 0.9, { vol: 0.25, echo: true });
  }
  shutter() {
    this.noise(0.08, { vol: 0.35, freq: 3000, q: 0.7 });
    this.noise(0.06, { vol: 0.25, freq: 1800, q: 0.7, when: 0.09 });
  }
  discovery() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, { vol: 0.18, when: i * 0.09, type: 'triangle' }));
  }
  mission() {
    [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, { vol: 0.2, when: i * 0.07, type: 'square' }));
  }
  grab() {
    this.tone(300, 0.15, { type: 'square', vol: 0.12, toFreq: 600 });
  }
  click() {
    this.tone(900, 0.05, { type: 'square', vol: 0.08 });
  }
  alarm() {
    this.tone(880, 0.18, { type: 'square', vol: 0.12 });
    this.tone(660, 0.18, { type: 'square', vol: 0.12, when: 0.2 });
  }
  creak() {
    this.tone(70 + Math.random() * 40, 0.8, { type: 'sawtooth', vol: 0.06, toFreq: 40 + Math.random() * 20 });
  }
  thud() {
    this.tone(90, 0.3, { type: 'sine', vol: 0.4, toFreq: 40 });
    this.noise(0.2, { vol: 0.2, freq: 300, q: 0.5 });
  }
  // two hulls bump into each other: dull boom + metallic clang that rings out + a few bubbles
  bump(strength = 0.6, metal = true) {
    const v = Math.max(0.25, Math.min(1, strength));
    this.tone(70, 0.45, { type: 'sine', vol: 0.45 * v, toFreq: 38 });
    this.noise(0.18, { vol: 0.22 * v, freq: 260, q: 0.6 });
    if (metal) {
      this.tone(523, 0.9, { type: 'triangle', vol: 0.09 * v, toFreq: 500, echo: true, when: 0.01 });
      this.tone(1307, 0.6, { type: 'sine', vol: 0.05 * v, toFreq: 1250, when: 0.015 });
      this.tone(2210, 0.35, { type: 'sine', vol: 0.03 * v, when: 0.02 });
    } else {
      this.tone(160, 0.25, { type: 'sine', vol: 0.18 * v, toFreq: 320 });
    }
    for (let i = 0; i < 4; i++) this.tone(700 + Math.random() * 900, 0.06, { type: 'sine', vol: 0.05, toFreq: 1600, when: 0.08 + i * 0.05 + Math.random() * 0.03 });
  }
  // a letter of the title lands
  pop(i = 0) {
    const f = 520 * Math.pow(2, ((i * 2) % 12) / 12);
    this.tone(f, 0.12, { type: 'sine', vol: 0.12, toFreq: f * 1.6 });
    this.tone(f * 2, 0.08, { type: 'triangle', vol: 0.04, when: 0.02 });
  }
  quake() {
    this.noise(2.5, { vol: 0.35, freq: 80, q: 0.3, type: 'lowpass' });
  }
  ring() {
    this.tone(1568, 0.25, { vol: 0.18, type: 'triangle' });
    this.tone(2093, 0.3, { vol: 0.14, type: 'triangle', when: 0.08 });
  }
  fantasy(kind) {
    switch (kind) {
      case 'trumpet':
        [0, 0.15, 0.3].forEach((w, i) => this.tone([392, 494, 587][i], 0.25, { type: 'sawtooth', vol: 0.14, when: w }));
        break;
      case 'boing':
        this.tone(200, 0.5, { type: 'sine', vol: 0.3, toFreq: 800 });
        break;
      case 'pop':
        this.tone(600, 0.08, { type: 'square', vol: 0.2 });
        this.tone(900, 0.1, { type: 'square', vol: 0.15, when: 0.12 });
        break;
      case 'grumble':
        this.tone(110, 0.6, { type: 'sawtooth', vol: 0.18, toFreq: 70 });
        break;
      case 'squeak':
        this.tone(1800, 0.12, { type: 'square', vol: 0.15, toFreq: 2600 });
        this.tone(1700, 0.12, { type: 'square', vol: 0.15, toFreq: 2500, when: 0.18 });
        break;
      case 'slurp':
        this.tone(900, 0.5, { type: 'sine', vol: 0.2, toFreq: 200 });
        break;
      case 'baa':
        this.tone(420, 0.6, { type: 'sawtooth', vol: 0.12, toFreq: 380 });
        break;
      case 'puff':
        this.noise(0.4, { vol: 0.25, freq: 600, q: 0.6 });
        this.tone(300, 0.4, { vol: 0.15, toFreq: 700 });
        break;
      default:
        this.discovery();
    }
  }

  // radio: short noise burst when a channel opens / closes (+ "roger" beep on close)
  squelch(close = false) {
    this.noise(0.14, { vol: 0.13, freq: 2600, q: 0.8 });
    if (close) this.tone(1320, 0.07, { vol: 0.07, type: 'square', when: 0.1 });
  }
  // lower game sounds while somebody talks on the radio
  duck(on) {
    this.ducked = on;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? 0.3 : 0.8, this.ctx.currentTime, 0.12);
  }
  ringPass(i) {
    const notes = [72, 74, 77, 79, 81, 84, 86, 89, 91, 93, 96, 98, 101, 103];
    const f = mtof(notes[Math.min(i, notes.length - 1)]);
    this.tone(f, 0.35, { vol: 0.2, type: 'triangle' });
    this.tone(f * 1.5, 0.45, { vol: 0.12, type: 'triangle', when: 0.06 });
    this.tone(f * 2, 0.5, { vol: 0.08, type: 'sine', when: 0.12 });
    this.noise(0.5, { vol: 0.12, freq: 6000, q: 0.8, type: 'highpass' });
  }
  // a treasure collected: a bright double chime
  coin() {
    this.tone(mtof(88), 0.25, { vol: 0.12, type: 'triangle' });
    this.tone(mtof(95), 0.45, { vol: 0.12, type: 'triangle', when: 0.08 });
    this.tone(mtof(100), 0.3, { vol: 0.05, type: 'sine', when: 0.16, echo: true });
  }
  // a crew member caught: a quick happy "yippee" giggle (rising chirps with vibrato)
  giggle() {
    const base = 74 + Math.floor(Math.random() * 5);
    [0, 4, 7, 12].forEach((s, i) => this.tone(mtof(base + s), 0.09, { vol: 0.07, type: 'square', when: i * 0.07, toFreq: mtof(base + s + 2) }));
    this.tone(mtof(base + 16), 0.3, { vol: 0.06, type: 'triangle', when: 0.3, toFreq: mtof(base + 19) });
  }
  // Christmas: the chorus of "Jingle Bells" (James Lord Pierpont, 1857 – public domain) with sleigh bells
  jingle() {
    const mel = [[64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2], [64, 1], [67, 1], [60, 1.5], [62, 0.5], [64, 4],
      [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [64, 1], [64, 1], [64, 0.5], [64, 0.5], [64, 1], [62, 1], [62, 1], [64, 1], [62, 2], [67, 2]];
    const beat = 0.2;
    let w = 0;
    for (const [m, d] of mel) {
      this.tone(mtof(m + 12), Math.min(0.5, d * beat + 0.08), { vol: 0.12, type: 'triangle', when: w });
      this.tone(mtof(m), Math.min(0.5, d * beat + 0.05), { vol: 0.05, type: 'square', when: w });
      w += d * beat;
    }
    for (let k = 0; w > 0 && k < w / (beat * 0.5); k++) this.tone(5200 + Math.random() * 1400, 0.05, { vol: 0.025, type: 'square', when: k * beat * 0.5 });
  }
  fanfare() {
    [60, 64, 67, 72, 67, 72, 76, 79].forEach((m, i) => this.tone(mtof(m), i === 7 ? 1.2 : 0.22, { vol: 0.16, type: i % 2 ? 'square' : 'triangle', when: i * 0.13 }));
  }
  splash() {
    this.noise(1.4, { vol: 0.5, freq: 900, q: 0.4, type: 'lowpass' });
    this.noise(0.5, { vol: 0.3, freq: 3000, q: 0.6 });
    for (let i = 0; i < 8; i++) this.tone(400 + Math.random() * 900, 0.08, { vol: 0.05, toFreq: 1400 + Math.random() * 800, when: 0.3 + i * 0.09 });
  }
  underwater() {
    this.noise(1.6, { vol: 0.25, freq: 220, q: 0.5, type: 'lowpass' });
    for (let i = 0; i < 14; i++) this.tone(300 + Math.random() * 700, 0.07, { vol: 0.06, toFreq: 900 + Math.random() * 900, when: 0.1 + i * 0.07 + Math.random() * 0.05 });
  }
  clunk() {
    this.tone(220, 0.18, { type: 'square', vol: 0.12, toFreq: 110 });
    this.tone(330, 0.12, { type: 'square', vol: 0.08, when: 0.05 });
    this.noise(0.15, { vol: 0.2, freq: 2500, q: 2 });
  }
  winch(on) {
    if (!this.ctx) return;
    if (on && !this.winchNode) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 68;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 14;
      const lg = this.ctx.createGain();
      lg.gain.value = 0.04;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      const g = this.ctx.createGain();
      g.gain.value = 0.07;
      lfo.connect(lg);
      lg.connect(g.gain);
      o.connect(f);
      f.connect(g);
      g.connect(this.fxBus);
      o.start();
      lfo.start();
      this.winchNode = { o, lfo, g };
    } else if (!on && this.winchNode) {
      const w = this.winchNode;
      w.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try {
          w.o.stop();
          w.lfo.stop();
        } catch (e) {
          /* stopped */
        }
      }, 500);
      this.winchNode = null;
    }
  }

  startLoops() {
    if (!this.ctx || this.engine) return;
    // engine hum
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.value = 0.0;
    o.connect(f);
    f.connect(g);
    g.connect(this.fxBus);
    o.start();
    // ambient drone
    const a1 = this.ctx.createOscillator();
    const a2 = this.ctx.createOscillator();
    a1.frequency.value = 41;
    a2.frequency.value = 41.7;
    const ag = this.ctx.createGain();
    ag.gain.value = 0.05;
    a1.connect(ag);
    a2.connect(ag);
    ag.connect(this.fxBus);
    a1.start();
    a2.start();
    // soft rushing water (the mermaid sub ISABELLA has no motor: you hear the water and her tail fin)
    const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.04; // brown-ish noise
      d[i] = last * 6;
    }
    const ws = this.ctx.createBufferSource();
    ws.buffer = buf;
    ws.loop = true;
    const wf = this.ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 500;
    const wg = this.ctx.createGain();
    wg.gain.value = 0;
    ws.connect(wf);
    wf.connect(wg);
    wg.connect(this.fxBus);
    ws.start();
    this.engine = { o, f, g, ws, wf, wg };
    this.ambient = { a1, a2, ag };
  }

  // ISABELLA swims with her tail: no engine hum, rushing water instead (finSwish on every tail stroke)
  setFinMode(on) {
    this.finMode = !!on;
  }

  finSwish(level = 0.5) {
    if (!this.ctx || !this.finMode) return;
    const c = this.ctx, t0 = c.currentTime, dur = 0.55;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(320, t0);
    f.frequency.exponentialRampToValueAtTime(900 + level * 500, t0 + 0.18);
    f.frequency.exponentialRampToValueAtTime(260, t0 + dur);
    const g = c.createGain(), v = 0.05 + level * 0.11;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.fxBus);
    if (this.reverb) g.connect(this.reverb);
    src.start(t0);
    // now and then a few small bubbles
    if (Math.random() < 0.35 + level * 0.3) for (let i = 0; i < 3; i++) this.tone(500 + Math.random() * 700, 0.05, { vol: 0.025, toFreq: 1300 + Math.random() * 600, when: 0.12 + i * 0.07 });
  }

  setEngine(level) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    this.engine.wg.gain.setTargetAtTime(this.finMode ? 0.02 + level * 0.06 : 0, t, 0.3);
    this.engine.wf.frequency.setTargetAtTime(350 + level * 600, t, 0.3);
    if (this.finMode) {
      this.engine.g.gain.setTargetAtTime(0, t, 0.2);
      return;
    }
    this.engine.g.gain.setTargetAtTime(0.03 + level * 0.07, t, 0.2);
    this.engine.o.frequency.setTargetAtTime(50 + level * 30, t, 0.2);
    this.engine.f.frequency.setTargetAtTime(150 + level * 250, t, 0.2);
  }

  stopLoops() {
    if (!this.engine) return;
    try {
      this.engine.o.stop();
      this.engine.ws.stop();
      this.ambient.a1.stop();
      this.ambient.a2.stop();
    } catch (e) {
      /* already stopped */
    }
    this.engine = null;
    this.ambient = null;
  }
}

export const audio = new AudioFX();
