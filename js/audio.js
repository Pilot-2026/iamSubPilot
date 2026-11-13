// All sounds are synthesised with the Web Audio API – no audio files needed.

class AudioFX {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('hadal.muted') === '1';
    this.engine = null;
    this.ambient = null;
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
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(this.ctx.destination);
    // echo for the sonar
    this.delay = this.ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.42;
    this.fb = this.ctx.createGain();
    this.fb.gain.value = 0.38;
    this.delay.connect(this.fb);
    this.fb.connect(this.delay);
    this.delay.connect(this.master);
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('hadal.muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
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
    g.connect(this.master);
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
    g.connect(this.master);
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
    g.connect(this.master);
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
    ag.connect(this.master);
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
