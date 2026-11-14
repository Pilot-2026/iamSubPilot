// All sounds are synthesised with the Web Audio API – no audio files needed.
// Two buses: sound effects and music. Sound modes: all | fx | music | off.

export const SOUND_MODES = ['all', 'fx', 'music', 'off'];
const PENTA = [0, 2, 5, 7, 9]; // D minor-ish pentatonic steps
const CHORDS = [
  [50, 57, 62, 65, 69], // Dm9-ish
  [46, 53, 58, 62, 69], // Bbmaj7
  [53, 57, 60, 64, 67], // F add9
  [48, 55, 60, 62, 67], // C sus
];
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
    if (scene) this.startScheduler();
    else this.stopScheduler();
  }

  startScheduler() {
    if (this.timer) return;
    const now = this.ctx.currentTime;
    this.next = { chord: now + 0.1, whale: now + 2.5, dolphin: now + 6, ping: now + 1.2, bell: now + 4, chordIdx: 0 };
    this.timer = setInterval(() => this.schedule(), 200);
  }

  stopScheduler() {
    clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    if (!this.ctx || !this.scene) return;
    if (this.mode === 'fx' || this.mode === 'off' || document.hidden) {
      // keep the clock moving without playing
      const now = this.ctx.currentTime;
      for (const k of ['chord', 'whale', 'dolphin', 'ping', 'bell']) if (this.next[k] < now) this.next[k] = now + 1;
      return;
    }
    const ahead = this.ctx.currentTime + 0.4;
    const intro = this.scene !== 'dive';
    const N = this.next;
    if (N.chord < ahead) {
      this.padChord(CHORDS[N.chordIdx % CHORDS.length], N.chord, 9.5, intro ? 0.05 : 0.035);
      N.chordIdx++;
      N.chord += 8;
    }
    if (N.whale < ahead) {
      this.whale(N.whale);
      N.whale += (intro ? 5 : 9) + Math.random() * (intro ? 6 : 10);
    }
    if (N.dolphin < ahead) {
      this.dolphins(N.dolphin);
      N.dolphin += (intro ? 6 : 12) + Math.random() * 9;
    }
    if (N.ping < ahead) {
      this.sounder(N.ping);
      N.ping += intro ? 4 : 6.5;
    }
    if (N.bell < ahead) {
      if (intro || Math.random() < 0.5) this.bells(N.bell, CHORDS[(N.chordIdx + 3) % CHORDS.length]);
      N.bell += 2 + Math.random() * 3;
    }
  }

  padChord(notes, t0, dur, vol) {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(500, t0);
    f.frequency.linearRampToValueAtTime(900, t0 + dur * 0.5);
    f.frequency.linearRampToValueAtTime(450, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 3);
    g.gain.setValueAtTime(vol, t0 + dur - 3);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g);
    g.connect(this.musicBus);
    g.connect(this.reverb);
    for (const n of notes) {
      for (const det of [-6, 6]) {
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(n - 12);
        o.detune.value = det;
        o.connect(f);
        o.start(t0);
        o.stop(t0 + dur + 0.1);
      }
    }
  }

  // Long gliding moans like humpback song units, with vibrato and lots of reverb.
  whale(t0) {
    const c = this.ctx;
    const phrases = 1 + Math.floor(Math.random() * 3);
    let t = t0;
    for (let p = 0; p < phrases; p++) {
      const dur = 1.6 + Math.random() * 2.4;
      const base = Math.random() < 0.35 ? 70 + Math.random() * 60 : 160 + Math.random() * 220;
      const o = c.createOscillator();
      o.type = Math.random() < 0.5 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 1.2), t + dur * 0.45);
      o.frequency.exponentialRampToValueAtTime(base * (0.7 + Math.random() * 0.5), t + dur);
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
      g.gain.exponentialRampToValueAtTime(0.16, t + dur * 0.3);
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
    o.frequency.setValueAtTime(1480, t0);
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

  bells(t0, chord) {
    const c = this.ctx;
    const root = chord[0] + 24;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const note = root + PENTA[Math.floor(Math.random() * PENTA.length)] + (Math.random() < 0.3 ? 12 : 0);
      const t = t0 + i * (0.35 + Math.random() * 0.3);
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = mtof(note);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g);
      g.connect(this.reverb);
      g.connect(this.mDelay);
      o.start(t);
      o.stop(t + 2.5);
    }
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
    this.engine = { o, f, g };
    this.ambient = { a1, a2, ag };
  }

  setEngine(level) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    this.engine.g.gain.setTargetAtTime(0.03 + level * 0.07, t, 0.2);
    this.engine.o.frequency.setTargetAtTime(50 + level * 30, t, 0.2);
    this.engine.f.frequency.setTargetAtTime(150 + level * 250, t, 0.2);
  }

  stopLoops() {
    if (!this.engine) return;
    try {
      this.engine.o.stop();
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
