// Title screen + menu background: a small "aquarium" with many real and
// fantasy animals circling the wordmark "iamSubPilot" (it assembles itself
// letter by letter, water shader on the letters) and a fleet of subs
// cruising around it with their lights on.

import * as THREE from './vendor/three.min.js';
import { buildModel, animUpper } from './creatures.js';
import { buildSubModel, animateSubModel } from './sub.js';
import { fishGeometry, fishMaterial, fishTime } from './schools.js';
import { mulberry32, clamp, lerp } from './util.js';

const TEXT_W = 26, TEXT_H = 6.5, TEXT_Y = 2.2;
// ?ogshot=1: a crowded, posed aquarium for the link preview picture (assets/og-image.jpg)
const OG = new URLSearchParams(location.search).get('ogshot') === '1';
const WORD = 'iamSubPilot';
const N_IAM = 3; // "iam" yellow with black outline, "SubPilot" navy
const FONT = '"Source Sans 3", "Myriad Pro", "Segoe UI", system-ui, sans-serif';
const F = 300; // font size on the letter canvases (px)

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// One canvas per letter, drawn exactly like the HTML wordmark (and a soft light halo so it reads on dark water).
function letterCanvas(ch, iam, adv) {
  const pad = Math.round(F * 0.28);
  const c = document.createElement('canvas');
  c.width = Math.ceil(adv + pad * 2);
  c.height = Math.round(F * 1.5);
  const g = c.getContext('2d');
  g.font = `800 ${F}px ${FONT}`;
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  const x = pad, y = Math.round(F * 1.08);
  if (iam) {
    // "iam": 100 % yellow with a black outline (and a faint warm halo)
    g.save();
    g.shadowColor = 'rgba(255,240,120,0.7)';
    g.shadowBlur = F * 0.14;
    g.lineWidth = F * 0.11;
    g.strokeStyle = '#000';
    g.strokeText(ch, x, y);
    g.restore();
    g.lineWidth = F * 0.11;
    g.strokeStyle = '#000';
    g.strokeText(ch, x, y);
    g.fillStyle = '#ffff00';
    g.fillText(ch, x, y);
  } else {
    // "SubPilot": navy, no outline – lit warmly from behind so it stands out from the dark water
    g.save();
    g.fillStyle = '#ffd84a';
    g.shadowColor = 'rgba(255,214,60,1)';
    for (const [blur, a] of [[F * 0.34, 0.55], [F * 0.18, 0.75], [F * 0.08, 0.9]]) {
      g.shadowBlur = blur;
      g.globalAlpha = a;
      g.fillText(ch, x, y);
    }
    g.restore();
    g.fillStyle = '#000088';
    g.fillText(ch, x, y);
  }
  return c;
}

function roundelCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const r = 250;
  for (const [f, col] of [[1, '#000088'], [0.7227, '#ffff00'], [0.3555, '#a60000']]) {
    g.beginPath();
    g.arc(256, 256, r * f, 0, Math.PI * 2);
    g.fillStyle = col;
    g.fill();
  }
  return c;
}

// A glassy air bubble: clear inside, bright rim, a curved highlight and a tiny sparkle.
let bubTex = null;
function bubbleTexture() {
  if (bubTex) return bubTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const R = 60;
  const body = g.createRadialGradient(64, 64, R * 0.55, 64, 64, R);
  body.addColorStop(0, 'rgba(200,240,255,0.06)');
  body.addColorStop(0.75, 'rgba(210,245,255,0.28)');
  body.addColorStop(0.93, 'rgba(240,252,255,0.85)');
  body.addColorStop(1, 'rgba(240,252,255,0)');
  g.fillStyle = body;
  g.beginPath();
  g.arc(64, 64, R, 0, Math.PI * 2);
  g.fill();
  // curved highlight (top left) and a sparkle
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(64, 64, R * 0.72, Math.PI * 1.05, Math.PI * 1.45);
  g.stroke();
  const sp = g.createRadialGradient(44, 40, 0, 44, 40, 12);
  sp.addColorStop(0, 'rgba(255,255,255,1)');
  sp.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sp;
  g.fillRect(28, 24, 32, 32);
  // soft reflected light at the bottom right
  g.strokeStyle = 'rgba(190,240,255,0.5)';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(64, 64, R * 0.78, Math.PI * 0.15, Math.PI * 0.45);
  g.stroke();
  bubTex = new THREE.CanvasTexture(c);
  bubTex.colorSpace = THREE.SRGBColorSpace;
  return bubTex;
}

const BUBBLE_VS = `attribute float aSize; attribute float aPh;
  uniform float uTime; uniform float uPx;
  varying float vA;
  void main(){
    vec3 p = position;
    p.x += sin(uTime * 1.7 + aPh) * 0.18 * (0.5 + aSize);
    p.z += cos(uTime * 1.3 + aPh * 1.7) * 0.12;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPx / max(0.1, -mv.z);
    vA = smoothstep(80.0, 20.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const BUBBLE_FS = `uniform sampler2D map; uniform float uOpacity; varying float vA;
  void main(){
    vec2 uv = gl_PointCoord; uv.y = 1.0 - uv.y;
    vec4 t = texture2D(map, uv);
    gl_FragColor = vec4(t.rgb, t.a * uOpacity * vA);
  }`;

const TITLE_VS = `varying vec2 vUv; varying vec2 vP;
  uniform float uTime; uniform float uTextY; uniform float uWave;
  void main(){ vUv = uv; vec3 p = position;
    vec4 wp0 = modelMatrix * vec4(p, 1.0);
    p.z += (sin(wp0.x*0.5 + uTime*1.4)*0.18 + sin(wp0.y*0.9 + uTime*1.1)*0.08) * uWave;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vP = vec2(wp.x, wp.y - uTextY);
    gl_Position = projectionMatrix * viewMatrix * wp; }`;
const TITLE_FS = `uniform sampler2D map; uniform float uTime; uniform vec2 uSpot[3]; uniform float uSpotI[3]; uniform float uFade; uniform float uFlash; uniform float uKeep;
  varying vec2 vUv; varying vec2 vP;
  float caust(vec2 p){
    float a = sin(p.x*2.1 + uTime*1.1 + sin(p.y*1.7 + uTime*0.6)*1.6);
    float b = sin(p.y*2.6 - uTime*0.9 + sin(p.x*1.3 - uTime*0.5)*1.4);
    float c = sin((p.x + p.y)*1.8 + uTime*0.7);
    return pow(clamp(1.0 - abs(a + b + c) / 1.6, 0.0, 1.0), 3.0);
  }
  void main(){
    vec4 tex = texture2D(map, vUv);
    if (tex.a < 0.01) discard;
    float cs = caust(vP*0.8);
    float keep = 1.0 - 0.85 * uKeep;
    vec3 col = tex.rgb * mix(1.0, 0.92 + 0.22*cs, keep);
    float spot = 0.0;
    for (int k = 0; k < 3; k++) { vec2 d = vP - uSpot[k]; spot += uSpotI[k] * exp(-dot(d, d) / 7.0); }
    col += vec3(1.0, 0.95, 0.8) * spot * 0.55 * tex.a * keep;
    float band = smoothstep(0.6, 0.0, abs(fract(vP.x*0.035 - vP.y*0.012 - uTime*0.09) - 0.5) * 20.0);
    col += vec3(1.0) * band * 0.28 * tex.a * keep;
    col += vec3(1.0) * uFlash * 0.6 * tex.a * keep;
    gl_FragColor = vec4(col, tex.a * uFade);
  }`;

// [model, scale, rx, rz, height, speed, count]
const CAST = [
  ['whaleshark', 0.5, 20, 12, -5.5, 0.07, 1],
  ['hammerhead', 0.9, 18, 13, 3.0, -0.12, 2],
  ['whiteshark', 0.75, 23, 11, -3.4, 0.09, 1],
  ['blueshark', 0.85, 15, 14, 8.4, 0.14, 1],
  ['humpback', 0.42, 25, 15, 9, -0.05, 1],
  ['manta', 0.95, 15, 10, -2.8, 0.13, 1],
  ['turtle', 1.25, 12.5, 9, 6.2, -0.17, 1],
  ['dolphin', 0.85, 17, 12, 1.2, 0.24, 2],
  ['sunfish', 0.9, 21, 9, -7.5, 0.05, 1],
  ['jellyphant', 0.75, 13, 8, -4.5, -0.11, 1],
  ['toaster', 0.85, 11, 13, 7.5, 0.15, 1],
  ['duckangler', 1.0, 18, 10, 4.5, -0.12, 1],
  ['sheep', 1.0, 9, 11, -6.5, 0.16, 1],
  ['angler', 1.5, 10, 7, -2.2, 0.21, 1],
  ['dumbo', 1.6, 14, 6, 5.2, 0.09, 1],
  ['barreleye', 2.6, 8, 9, 0.2, -0.2, 1],
  ['combjelly', 1.3, 19, 7, 7.2, 0.06, 1],
  ['moonjelly', 1.0, 16, 14, 3.5, 0.03, 2],
];

export class Aquarium {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05243c);
    this.scene.fog = new THREE.FogExp2(0x05243c, 0.018);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.mode = 'intro';
    this.t = 0;
    this.textFade = 1;
    const rng = mulberry32(2026);

    this.scene.add(new THREE.HemisphereLight(0x9fe8ff, 0x041018, 1.25));
    const sun = new THREE.DirectionalLight(0xd8fbff, 1.4);
    sun.position.set(0.3, 1, 0.4);
    this.scene.add(sun);

    // the wordmark "iamSubPilot" + roundel, built from one plane per letter (assembles itself)
    this.textU = {
      uTime: { value: 0 },
      uTextY: { value: TEXT_Y },
      uWave: { value: 1 },
      uSpot: { value: [new THREE.Vector2(99, 99), new THREE.Vector2(99, 99), new THREE.Vector2(99, 99)] },
      uSpotI: { value: [0, 0, 0] },
      uFade: { value: 1 },
    };
    this.text = new THREE.Group();
    this.scene.add(this.text);
    this.letters = [];
    this.titleT0 = -1;
    const fontReady = document.fonts && document.fonts.load ? document.fonts.load(`800 100px ${FONT}`).catch(() => null) : Promise.resolve();
    Promise.race([fontReady, new Promise((r) => setTimeout(r, 1800))]).then(() => {
      this.buildTitle();
      if (this.titleT0 < 0) this.titleT0 = this.t;
    });

    // light rays from above
    const rayTex = (() => {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 128;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 128);
      grd.addColorStop(0, 'rgba(190,245,255,0.55)');
      grd.addColorStop(1, 'rgba(190,245,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 16, 128);
      return new THREE.CanvasTexture(c);
    })();
    this.rays = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(4 + rng() * 5, 60),
        new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.18 + rng() * 0.12, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
      );
      m.position.set(-30 + i * 10 + rng() * 4, 12, -18 - rng() * 10);
      m.rotation.z = (rng() - 0.5) * 0.4;
      m.userData.base = m.rotation.z;
      m.userData.ph = rng() * 10;
      this.rays.push(m);
      this.scene.add(m);
    }

    // marine snow / bubbles
    const N = 500;
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[i * 3] = (rng() - 0.5) * 80;
      p[i * 3 + 1] = (rng() - 0.5) * 50;
      p[i * 3 + 2] = (rng() - 0.5) * 60;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfefff, size: 0.12, transparent: true, opacity: 0.6, depthWrite: false }));
    this.scene.add(this.snow);
    // lots of transparent, glassy bubbles of different sizes rising through the scene
    const BN = 170;
    const bpos = new Float32Array(BN * 3), bsize = new Float32Array(BN), bph = new Float32Array(BN);
    this.bubSpeed = new Float32Array(BN);
    for (let i = 0; i < BN; i++) {
      const near = i < 70; // more of them around the title
      bpos[i * 3] = (rng() - 0.5) * (near ? TEXT_W * 1.3 : 70);
      bpos[i * 3 + 1] = -14 + rng() * 30;
      bpos[i * 3 + 2] = near ? -3 + rng() * 9 : (rng() - 0.5) * 50;
      const big = rng() < 0.12;
      bsize[i] = big ? 0.55 + rng() * 0.45 : 0.12 + rng() * 0.32;
      bph[i] = rng() * 20;
      this.bubSpeed[i] = 0.9 + bsize[i] * 2.2 + rng() * 0.4;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
    bg.setAttribute('aSize', new THREE.BufferAttribute(bsize, 1));
    bg.setAttribute('aPh', new THREE.BufferAttribute(bph, 1));
    this.bubU = { uTime: { value: 0 }, uPx: { value: 400 }, map: { value: bubbleTexture() }, uOpacity: { value: 0.95 } };
    this.bubbles = new THREE.Points(bg, new THREE.ShaderMaterial({ uniforms: this.bubU, vertexShader: BUBBLE_VS, fragmentShader: BUBBLE_FS, transparent: true, depthWrite: false }));
    this.bubbles.frustumCulled = false;
    this.bubbles.renderOrder = 7;
    this.scene.add(this.bubbles);

    // animals
    this.actors = [];
    for (const [model, scale, rx, rz, h, speed, count] of CAST) {
      if (OG && (model === 'dumbo' || model === 'angler')) continue; // would cover the title in the picture
      for (let k = 0; k < count; k++) {
        const o = buildModel(model);
        o.scale.multiplyScalar(scale);
        this.scene.add(o);
        this.actors.push({ o, model, rx, rz, h: h + k * 1.3, speed, ph: rng() * Math.PI * 2 + k * 0.35, bob: rng() * 10, k });
      }
    }
    // fish schools orbiting the letters
    this.schools = [];
    const tints = OG ? [0x9fd2ff, 0xffd76a, 0xe8f4ff, 0xa8f0c8, 0xffa8d8] : [0x9fd2ff, 0xffd76a, 0xe8f4ff];
    tints.forEach((tint, i) => {
      const n = OG ? 40 : 22;
      const mesh = new THREE.InstancedMesh(fishGeometry(), fishMaterial(i === 2), n);
      mesh.frustumCulled = false;
      const offs = [];
      const col = new THREE.Color(tint);
      for (let j = 0; j < n; j++) {
        mesh.setColorAt(j, col.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.15));
        offs.push({ x: (rng() - 0.5) * 6, y: (rng() - 0.5) * 2.4, z: (rng() - 0.5) * 6, ph: rng() * 10, s: 0.5 + rng() * 0.25 });
      }
      this.scene.add(mesh);
      this.schools.push({ mesh, offs, rx: 14 + i * 4.5, rz: 9 + i * 3, h: -6 + i * 5.5, speed: (i % 2 ? -1 : 1) * (0.16 + i * 0.03), ph: i * 1.3 });
    });

    // a whole fleet of subs with strong lights
    const PI = Math.PI;
    const FLEET = OG
      ? [
          // fixed poses around the title (model, R, Rz, h, direction, angle, light, yaw)
          ['hummel', 10, 5, -5.2, 1, 0.32 * PI, true],
          ['isabella', 13, 6, -5.0, -1, 0.7 * PI, true],
          ['ufo', 11, 4, 4.4, 1, 0.64 * PI, false],
          ['wolfshark', 10.5, 10, -7.6, -1, 0.1 * PI, false, -2.0],
          ['octopus', 12, 4, -2.4, 1, 0.9 * PI, false],
          ['narwhal', 12.5, 4, -1.6, -1, 0.07 * PI, false],
          ['puffer', 6, 4, -6.8, 1, 0.5 * PI, false],
          ['rocket', 7.0, 6.8, 2.4, 1, 0.12 * PI, false, 1.9],
        ]
      : [
          ['hummel', 15.5, 10, 0, 0.19, 0, true],
          ['isabella', 20, 13, 5.5, -0.14, 2.1, true],
          ['ufo', 12, 8, -5.2, 0.11, 4.2, false],
          ['wolfshark', 17, 11, -3.6, 0.13, 2.7, false],
        ];
    this.subs = FLEET.map(([model, R, Rz, h, speed, ph, light, yaw]) => {
      const g = buildSubModel(model, null, light);
      g.userData.beam.material.uniforms.opacity.value = 0.2;
      g.userData.beam.scale.set(1.25, 1.25, 1.7);
      g.userData.glowMat.opacity = 1;
      if (g.userData.spot) {
        g.userData.spot.intensity = 140;
        g.userData.spot.distance = 70;
      }
      g.scale.setScalar((model === 'hummel' ? 1.15 : 1) * (OG ? (model === 'isabella' ? 0.82 : 0.62) : 1));
      this.scene.add(g);
      return { g, R, Rz, h, speed, ph, yaw };
    });
    this.sub = this.subs[0].g;
    this.subLightDir = new THREE.Vector3(0, -7, -20).normalize();
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  buildTitle() {
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = `800 ${F}px ${FONT}`;
    const total = meas.measureText(WORD).width + F * (0.14 + 0.86);
    const k = TEXT_W / total; // world units per canvas pixel
    this.titleK = k;
    const rng = mulberry32(77);
    const mk = (tex, w, h, geo, keep = 0) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...this.textU, map: { value: tex }, uFlash: { value: 0 }, uKeep: { value: keep } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: TITLE_VS,
        fragmentShader: TITLE_FS,
      });
      return new THREE.Mesh(geo || new THREE.PlaneGeometry(w, h, 6, 3), mat);
    };
    const x0 = -TEXT_W / 2;
    [...WORD].forEach((ch, i) => {
      const left = meas.measureText(WORD.slice(0, i)).width;
      const adv = meas.measureText(WORD.slice(0, i + 1)).width - left;
      const cv = letterCanvas(ch, i < N_IAM, adv);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const pad = Math.round(F * 0.28);
      const m = mk(tex, cv.width * k, cv.height * k, null, i < N_IAM ? 0 : 1);
      // canvas centre = letter box centre (+ the vertical offset of the baseline)
      const cx = x0 + (left - pad + cv.width / 2) * k;
      m.userData.home = new THREE.Vector3(cx, TEXT_Y, 0);
      m.renderOrder = 5;
      this.text.add(m);
      this.letters.push(this.letterAnim(m, rng, i));
    });
    // roundel as a little coin that spins into place
    const rtex = new THREE.CanvasTexture(roundelCanvas());
    rtex.colorSpace = THREE.SRGBColorSpace;
    const R = (F * 0.86 * k) / 2;
    const face = mk(rtex, 0, 0, new THREE.CircleGeometry(R, 48), 1);
    const coin = new THREE.Group();
    coin.add(face);
    // baseline sits 0.33 F below the canvas centre; the roundel centre ~0.36 F above the baseline (like the CSS wordmark)
    coin.userData.home = new THREE.Vector3(x0 + TEXT_W - R, TEXT_Y + (0.41 - 0.33) * F * k, 0.05);
    coin.renderOrder = 6;
    this.text.add(coin);
    this.coin = coin;
    this.coinAnim = { o: coin, delay: 0.12 * WORD.length + 0.35, dur: 1.5 };
    // bubbles that trail the flying letters
    const BN = 260;
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BN * 3).fill(999), 3));
    this.trail = new THREE.Points(bg, new THREE.PointsMaterial({ map: bubbleTexture(), size: 0.32, transparent: true, opacity: 0.9, depthWrite: false }));
    this.trail.frustumCulled = false;
    this.trailLife = new Float32Array(BN);
    this.trailNext = 0;
    this.scene.add(this.trail);
    this.flashes = [];
  }

  letterAnim(m, rng, i) {
    const home = m.userData.home;
    const ang = rng() * Math.PI * 2;
    const from = new THREE.Vector3(home.x + Math.cos(ang) * (10 + rng() * 10), home.y + Math.sin(ang) * (6 + rng() * 6) - 3, -18 + rng() * 26);
    return {
      o: m,
      from,
      rot: new THREE.Euler((rng() - 0.5) * 5, (rng() - 0.5) * 7, (rng() - 0.5) * 4),
      arc: (rng() - 0.5) * 8,
      delay: 0.12 * i + rng() * 0.12,
      dur: 1.15 + rng() * 0.25,
      ph: rng() * 6,
      landed: false,
    };
  }

  // start the assembly again (every time the title screen opens)
  playTitle() {
    if (!this.letters.length) return;
    this.titleT0 = this.t;
    for (const l of this.letters) l.landed = false;
    if (this.coinAnim) this.coinAnim.landed = false;
  }

  emitBubble(p) {
    if (!this.trail) return;
    const i = this.trailNext;
    this.trailNext = (i + 1) % this.trailLife.length;
    const a = this.trail.geometry.attributes.position.array;
    a[i * 3] = p.x + (Math.random() - 0.5) * 0.6;
    a[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.6;
    a[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.6;
    this.trailLife[i] = 1.2 + Math.random();
  }

  updateTitle(dt) {
    if (!this.letters.length) return;
    const T = this.t - this.titleT0;
    for (let i = 0; i < this.letters.length; i++) {
      const l = this.letters[i];
      const o = l.o;
      const home = o.userData.home;
      const x = clamp((T - l.delay) / l.dur, 0, 1);
      if (x <= 0) {
        o.visible = false;
        continue;
      }
      o.visible = true;
      const e = easeOutBack(x), ec = easeOutCubic(x);
      o.position.lerpVectors(l.from, home, e);
      o.position.y += Math.sin(x * Math.PI) * l.arc * (1 - x);
      o.rotation.set(l.rot.x * (1 - ec), l.rot.y * (1 - ec), l.rot.z * (1 - ec));
      o.scale.setScalar(0.25 + 0.75 * Math.min(1.08, e));
      if (x < 1 && Math.random() < 0.7) this.emitBubble(o.position);
      if (x >= 1) {
        if (!l.landed) {
          l.landed = true;
          l.flash = 1;
          if (this.onLand) this.onLand(i);
        }
        // alive in the water: every letter bobs a little on its own
        o.position.y = home.y + Math.sin(this.t * 1.6 + l.ph) * 0.1;
        o.rotation.z = Math.sin(this.t * 1.1 + l.ph) * 0.025;
      }
      if (l.flash > 0) l.flash = Math.max(0, l.flash - dt * 2.5);
      o.material.uniforms.uFlash.value = l.flash || 0;
    }
    // the roundel coin
    const c = this.coinAnim;
    const x = clamp((T - c.delay) / c.dur, 0, 1);
    const home = c.o.userData.home;
    c.o.visible = x > 0;
    if (x > 0) {
      const e = easeOutBack(x), ec = easeOutCubic(x);
      const from = new THREE.Vector3(home.x + 16, home.y + 9, -14);
      c.o.position.lerpVectors(from, home, e);
      c.o.rotation.set(0, (1 - ec) * Math.PI * 6, (1 - ec) * 1.2);
      c.o.scale.setScalar(0.3 + 0.7 * Math.min(1.1, e));
      if (x < 1) this.emitBubble(c.o.position);
      if (x >= 1) {
        if (!c.landed) {
          c.landed = true;
          c.flash = 1;
          for (let k = 0; k < 40; k++) this.emitBubble(c.o.position);
          if (this.onLand) this.onLand(WORD.length);
        }
        c.o.rotation.y = Math.sin(this.t * 0.9) * 0.35;
        c.o.position.y = home.y + Math.sin(this.t * 1.6 + 2) * 0.1;
      }
      if (c.flash > 0) c.flash = Math.max(0, c.flash - dt * 2);
      c.o.children.forEach((ch) => ch.material.uniforms && (ch.material.uniforms.uFlash.value = c.flash || 0));
    }
    // bubbles rise and fade
    const a = this.trail.geometry.attributes.position.array;
    for (let i = 0; i < this.trailLife.length; i++) {
      if (this.trailLife[i] <= 0) continue;
      this.trailLife[i] -= dt;
      a[i * 3 + 1] += dt * 2.2;
      a[i * 3] += Math.sin(this.t * 3 + i) * dt * 0.3;
      if (this.trailLife[i] <= 0) a[i * 3 + 1] = 999;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.material.opacity = 0.85 * this.textU.uFade.value;
  }

  setMode(mode) {
    this.mode = mode;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.bubU) this.bubU.uPx.value = (h * (this.pixelRatio || 1)) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const needW = (TEXT_W * 1.12) / 2 / Math.tan(hfov / 2);
    const needH = (TEXT_H * 2.4) / 2 / Math.tan(vfov / 2);
    this.fitDist = Math.max(needW, needH, 22);
    // keep the letters clear of the text block at the bottom
    this.lookY = h < 520 ? TEXT_Y - 3.4 : w / h < 0.8 ? TEXT_Y - 1.6 : TEXT_Y - 0.6;
  }

  // Fit the title into the free band of the screen between topPx and bottomPx (above the text block).
  layout(topPx, bottomPx, w, h) {
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360);
    const hfov = 2 * Math.atan(tanV * (w / h));
    const band = Math.max(60, bottomPx - topPx);
    const needW = (TEXT_W * (w < h ? 1.22 : 1.1)) / 2 / Math.tan(hfov / 2);
    const needH = (4.8 * h) / (band * 2 * tanV);
    this.fitDist = Math.max(needW, needH, 20);
    const ndc = 1 - (2 * (topPx + bottomPx)) / 2 / h;
    this.lookY = TEXT_Y - ndc * this.fitDist * tanV;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    fishTime.value += dt;
    this.textU.uTime.value = t;
    const wantText = this.mode === 'intro' ? 1 : 0;
    this.textFade += (wantText - this.textFade) * (1 - Math.exp(-dt * 3));
    this.textU.uFade.value = this.textFade;
    this.text.visible = this.textFade > 0.02;
    if (this.trail) this.trail.visible = this.text.visible;
    this.updateTitle(dt);

    // camera: front view in the intro, slow drift in the menu
    const dist = this.fitDist || 32;
    const menu = this.mode === 'menu';
    const cx = menu ? Math.sin(t * 0.05) * 10 : Math.sin(t * 0.13) * 1.2;
    const cy = menu ? 4 + Math.sin(t * 0.07) * 2 : 1.6 + Math.sin(t * 0.17) * 0.6;
    const cz = menu ? dist * 0.85 : dist;
    const cam = this.camera.position;
    if (!this.camInit) {
      cam.set(cx, cy, cz);
      this.camInit = true;
    }
    cam.x += (cx - cam.x) * (1 - Math.exp(-dt * 1.2));
    cam.y += (cy - cam.y) * (1 - Math.exp(-dt * 1.2));
    cam.z += (cz - cam.z) * (1 - Math.exp(-dt * 1.2));
    this.camera.lookAt(0, menu ? 0 : this.lookY ?? TEXT_Y - 0.6, 0);

    for (const r of this.rays) r.rotation.z = r.userData.base + Math.sin(t * 0.3 + r.userData.ph) * 0.08;
    this.snow.position.y = -((t * 0.4) % 10);
    const bp = this.bubbles.geometry.attributes.position.array;
    this.bubU.uTime.value = t;
    for (let i = 0, n = bp.length / 3; i < n; i++) {
      bp[i * 3 + 1] += dt * this.bubSpeed[i];
      if (bp[i * 3 + 1] > 17) bp[i * 3 + 1] = -14 - Math.random() * 4;
    }
    this.bubbles.geometry.attributes.position.needsUpdate = true;

    // animals on elliptic orbits (some pass in front of, some behind the letters)
    for (const a of this.actors) {
      const th = a.ph + t * a.speed;
      const s = Math.sign(a.speed) || 1;
      const x = Math.cos(th) * a.rx, z = Math.sin(th) * a.rz;
      const y = a.h + Math.sin(th * 2 + a.bob) * 0.8 + Math.sin(t * 0.8 + a.bob) * 0.3;
      a.o.position.set(x, y, z);
      const vx = -Math.sin(th) * a.rx * s, vz = Math.cos(th) * a.rz * s;
      if (a.model === 'moonjelly' || a.model === 'combjelly') a.o.rotation.y += dt * 0.2;
      else a.o.rotation.y = Math.atan2(-vx, -vz);
      animUpper(a.o, a.model, t * 1.2 + a.bob);
      const u = a.o.userData;
      if (u.arms) u.arms.forEach((arm, i) => (arm.rotation.z = Math.sin(t * 2 + i) * 0.35));
      if (u.ears) u.ears.forEach((e, i) => (e.rotation.z = Math.sin(t * 3 + a.bob) * 0.5 * (i ? 1 : -1)));
      if (u.duck) u.duck.rotation.z = Math.sin(t * 2) * 0.3;
      if (u.colorMats) {
        const hue = (Math.floor(t * 2) * 0.17) % 1;
        u.colorMats.forEach((m) => {
          m.color.setHSL(hue, 0.9, 0.6);
          if (m.emissive) m.emissive.setHSL(hue, 0.9, 0.45);
        });
      }
      if (u.rows) u.rows.forEach((m, i) => m.color.setHSL((t * 0.6 + i / 8) % 1, 1, 0.6));
    }
    // fish schools
    for (const sc of this.schools) {
      const th = sc.ph + t * sc.speed;
      const s = Math.sign(sc.speed);
      const cxs = Math.cos(th) * sc.rx, czs = Math.sin(th) * sc.rz, cys = sc.h + Math.sin(th * 1.5) * 1.5;
      const yaw = Math.atan2(Math.sin(th) * sc.rx * s, -Math.cos(th) * sc.rz * s);
      sc.offs.forEach((o, j) => {
        const ph = o.ph + t;
        this._p.set(cxs + o.x + Math.sin(ph * 0.9) * 0.5, cys + o.y + Math.sin(ph * 1.3) * 0.3, czs + o.z + Math.cos(ph * 0.8) * 0.5);
        this._e.set(0, yaw + Math.sin(ph * 0.5) * 0.2, 0);
        this._q.setFromEuler(this._e);
        this._s.setScalar(o.s);
        this._m.compose(this._p, this._q, this._s);
        sc.mesh.setMatrixAt(j, this._m);
      });
      sc.mesh.instanceMatrix.needsUpdate = true;
    }

    // the fleet circles the letters and sweeps them with their lamps
    const hits = [null, null, null];
    this.subs.forEach((s, idx) => {
      const th = s.ph + (OG ? 0 : t * s.speed);
      const sg = Math.sign(s.speed) || 1;
      const sp = s.g.position;
      sp.set(Math.cos(th) * s.R, TEXT_Y - 0.4 + s.h + Math.sin(th * 2) * 1.4, Math.sin(th) * s.Rz);
      const tx = -Math.sin(th) * s.R * sg, tz = Math.cos(th) * s.Rz * sg;
      const tangentYaw = Math.atan2(-tx, -tz);
      const toCenter = Math.atan2(sp.x, sp.z);
      let d = toCenter - tangentYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      s.g.rotation.order = 'YXZ';
      s.g.rotation.y = s.yaw ?? tangentYaw + d * 0.45;
      s.g.rotation.z = Math.sin(t * 0.7 + s.ph) * 0.08;
      animateSubModel(s.g, dt, t + s.ph, 4, true);
      // where the light beam hits the text plane (z = 0)
      const dir = this.subLightDir.clone().applyQuaternion(s.g.quaternion);
      if (Math.abs(dir.z) > 0.05) {
        const k = -sp.z / dir.z;
        if (k > 0 && k < 45) {
          const hx = sp.x + dir.x * k, hy = sp.y + dir.y * k - TEXT_Y;
          if (idx < 3 && Math.abs(hx) < TEXT_W * 0.6 && Math.abs(hy) < TEXT_H) hits[idx] = { x: hx, y: hy, i: clamp(1.3 - k / 32, 0, 1) * (sp.z > 0 ? 1 : 0.55) };
        }
      }
    });
    for (let k = 0; k < 3; k++) {
      const h = hits[k];
      if (h) this.textU.uSpot.value[k].set(h.x, h.y);
      this.textU.uSpotI.value[k] = lerp(this.textU.uSpotI.value[k], h ? h.i : 0, 1 - Math.exp(-dt * 6));
    }
  }
}
