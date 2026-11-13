// Creature models (built from simple shapes), spawning and behaviour.

import * as THREE from './vendor/three.min.js';
import { CREATURES } from './data/creatures.js';
import { mulberry32, clamp } from './util.js';
import { axisZ, WX, SHIP_X, SCALE } from './world.js';
import { t as tr, L } from './i18n.js';

const matCache = new Map();
function std(color, opts = {}) {
  const key = 'std' + color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0, ...opts }));
  return matCache.get(key);
}
function basic(color, opts = {}) {
  const key = 'bas' + color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return matCache.get(key);
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
function glowSprite(color, size, opacity = 0.8) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

function labelSprite(text, colors) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.font = 'bold 50px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const grd = g.createLinearGradient(40, 0, 472, 0);
  colors.forEach((col, i) => grd.addColorStop(i / (colors.length - 1), col));
  g.fillStyle = 'rgba(20,0,40,0.55)';
  g.beginPath();
  g.roundRect(20, 12, 472, 72, 36);
  g.fill();
  g.fillStyle = grd;
  g.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(6, 1.1, 1);
  return s;
}

function speechSprite(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath();
  g.roundRect(10, 10, 492, 86, 30);
  g.fill();
  g.beginPath();
  g.moveTo(230, 94); g.lineTo(256, 124); g.lineTo(282, 94);
  g.fill();
  g.fillStyle = '#c0392b';
  g.font = 'bold 40px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 54);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
  s.scale.set(6, 1.5, 1);
  return s;
}

function at(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}

function tube(points, radius, mat, seg = 20) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, 6, false), mat);
}

function scaled(mesh, x, y, z) {
  mesh.scale.set(x, y, z);
  return mesh;
}
const SPH = new THREE.SphereGeometry(1, 14, 10);

const RAINBOW = ['#ff5e7e', '#ffb347', '#fff275', '#7dff8a', '#5ee7ff', '#b98bff'];

// ---------------- model builders ----------------
const BUILD = {
  // ---------- upper ocean ----------
  dolphin() {
    const g = new THREE.Group();
    const top = std(0x75879a, { roughness: 0.35 });
    const belly = std(0xdfe5ea, { roughness: 0.4 });
    g.add(scaled(new THREE.Mesh(SPH, top), 0.42, 0.46, 1.35));
    g.add(at(scaled(new THREE.Mesh(SPH, belly), 0.36, 0.34, 1.15), 0, -0.13, -0.05));
    const beak = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 8), belly);
    beak.rotation.x = Math.PI / 2;
    g.add(at(beak, 0, -0.1, -1.5));
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 4), top);
    fin.scale.z = 0.25;
    fin.rotation.x = -0.6;
    g.add(at(fin, 0, 0.5, 0.15));
    for (const s of [-1, 1]) {
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.22), top);
      fl.rotation.z = s * -0.5;
      g.add(at(fl, s * 0.48, -0.22, -0.45));
      g.add(at(scaled(new THREE.Mesh(SPH, basic(0x111111)), 0.05, 0.05, 0.05), s * 0.25, 0.02, -1.05));
    }
    const fluke = new THREE.Group();
    fluke.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.3), top));
    g.add(at(fluke, 0, 0, 1.4));
    g.userData.fluke = fluke;
    return g;
  },
  humpback() {
    const g = new THREE.Group();
    const dark = std(0x26303b, { roughness: 0.5 });
    const pale = std(0xcdd3d8, { roughness: 0.6 });
    g.add(scaled(new THREE.Mesh(SPH, dark), 1.15, 1.05, 4.6));
    g.add(at(scaled(new THREE.Mesh(SPH, pale), 0.95, 0.7, 3.6), 0, -0.45, -0.6));
    for (let i = 0; i < 6; i++) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 3), basic(0x6b747c)), (i - 2.5) * 0.24, -1.12, -1.2));
    for (let i = 0; i < 7; i++) g.add(at(scaled(new THREE.Mesh(SPH, dark), 0.09, 0.09, 0.09), (i % 2 ? 0.25 : -0.25), 0.95, -3.8 + i * 0.32));
    for (const s of [-1, 1]) {
      const fl = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.6), pale);
      fl.geometry.translate(1.7 * s, 0, 0);
      fl.rotation.set(0, s * 0.5, s * -0.45);
      g.add(at(fl, s * 0.95, -0.55, -1.6));
    }
    const hump = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 6), dark);
    g.add(at(hump, 0, 1.05, 1.9));
    const fluke = new THREE.Group();
    for (const s of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.7), dark);
      lobe.rotation.y = s * -0.35;
      fluke.add(at(lobe, s * 0.8, 0, 0.25));
    }
    g.add(at(fluke, 0, 0, 4.5));
    g.userData.fluke = fluke;
    return g;
  },
  spermwhale() {
    const g = new THREE.Group();
    const skin = std(0x4a4f58, { roughness: 0.75 });
    g.add(at(scaled(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2, 2, 2, 2), skin), 0.95, 1.05, 1.7), 0, 0.1, -2.2));
    g.add(at(scaled(new THREE.Mesh(SPH, skin), 1.05, 1.1, 3.6), 0, 0, 0.6));
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 2.6), std(0xd8d8d0)), 0, -1.05, -2.3));
    g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 5), skin), 0, 1.05, 1.6));
    for (let i = 0; i < 4; i++) g.add(at(scaled(new THREE.Mesh(SPH, skin), 0.2, 0.12, 0.18), 0, 0.85 - i * 0.02, 2.2 + i * 0.4));
    const fluke = new THREE.Group();
    for (const s of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.6), skin);
      lobe.rotation.y = s * -0.3;
      fluke.add(at(lobe, s * 0.7, 0, 0.2));
    }
    g.add(at(fluke, 0, 0, 4.1));
    g.userData.fluke = fluke;
    return g;
  },
  whaleshark() {
    const g = new THREE.Group();
    const skin = std(0x34506e, { roughness: 0.55 });
    g.add(scaled(new THREE.Mesh(SPH, skin), 1.25, 0.85, 4.0));
    g.add(at(scaled(new THREE.Mesh(SPH, std(0xd9dde0)), 1.05, 0.5, 3.4), 0, -0.35, -0.3));
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.25), basic(0x0b0f14)), 0, -0.15, -3.85));
    const spot = basic(0xf2f4f6);
    const rnd = mulberry32(7);
    for (let i = 0; i < 46; i++) {
      const a = (rnd() - 0.5) * 2.2, z = (rnd() - 0.5) * 6.4;
      const r = Math.sqrt(Math.max(0.05, 1 - (z / 4) ** 2));
      const sp = new THREE.Mesh(SPH, spot);
      sp.scale.setScalar(0.07 + rnd() * 0.05);
      g.add(at(sp, Math.sin(a) * 1.25 * r, Math.cos(a) * 0.85 * r, z));
    }
    const dors = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 4), skin);
    dors.scale.z = 0.25;
    dors.rotation.x = -0.5;
    g.add(at(dors, 0, 0.95, 0.8));
    for (const s of [-1, 1]) {
      const pf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.6), skin);
      pf.rotation.set(0, s * 0.5, s * -0.35);
      g.add(at(pf, s * 1.4, -0.4, -1.0));
    }
    const tail = new THREE.Group();
    const up = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.6), skin);
    up.rotation.x = -0.6;
    tail.add(at(up, 0, 0.75, 0.4));
    const lo = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.5), skin);
    lo.rotation.x = 0.6;
    tail.add(at(lo, 0, -0.45, 0.3));
    g.add(at(tail, 0, 0, 3.9));
    g.userData.tail = tail;
    return g;
  },
  turtle() {
    const g = new THREE.Group();
    const shell = std(0x5e6a35, { roughness: 0.6 });
    const skin = std(0x8f9a6b, { roughness: 0.7 });
    g.add(scaled(new THREE.Mesh(SPH, shell), 0.75, 0.28, 0.95));
    g.add(at(scaled(new THREE.Mesh(SPH, std(0xe0d29a)), 0.68, 0.16, 0.86), 0, -0.1, 0));
    const scute = std(0x3e4722);
    for (let i = 0; i < 9; i++) g.add(at(scaled(new THREE.Mesh(SPH, scute), 0.16, 0.06, 0.18), ((i % 3) - 1) * 0.32, 0.24 - Math.abs((i % 3) - 1) * 0.06, (Math.floor(i / 3) - 1) * 0.42));
    g.add(at(scaled(new THREE.Mesh(SPH, skin), 0.2, 0.18, 0.26), 0, 0.02, -1.08));
    const flips = [];
    for (const s of [-1, 1]) {
      for (const [z, len] of [[-0.45, 0.95], [0.6, 0.45]]) {
        const piv = new THREE.Group();
        const f = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.28), skin);
        f.position.x = (s * len) / 2;
        f.rotation.y = s * 0.4;
        piv.add(f);
        g.add(at(piv, s * 0.62, -0.05, z));
        flips.push(piv);
      }
    }
    g.userData.flips = flips;
    return g;
  },
  manta() {
    const g = new THREE.Group();
    const dark = std(0x1c222a, { roughness: 0.5, side: THREE.DoubleSide });
    g.add(scaled(new THREE.Mesh(SPH, dark), 0.8, 0.3, 1.25));
    g.add(at(scaled(new THREE.Mesh(SPH, std(0xe9edf0)), 0.7, 0.2, 1.05), 0, -0.1, 0));
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.95);
    shape.quadraticCurveTo(1.6, -0.6, 2.7, 0.35);
    shape.quadraticCurveTo(1.3, 0.55, 0, 0.9);
    shape.closePath();
    const wgeo = new THREE.ShapeGeometry(shape);
    wgeo.rotateX(Math.PI / 2);
    const wings = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const w = new THREE.Mesh(wgeo, dark);
      w.scale.x = s;
      piv.add(w);
      g.add(at(piv, s * 0.55, 0, 0));
      wings.push(piv);
      const lobe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.5), dark);
      lobe.rotation.y = s * 0.2;
      g.add(at(lobe, s * 0.38, 0, -1.25));
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 1.6, 5), dark);
    tail.rotation.x = Math.PI / 2;
    g.add(at(tail, 0, 0, 1.9));
    g.userData.wings = wings;
    return g;
  },
  tuna() {
    const g = new THREE.Group();
    const top = std(0x2a5292, { metalness: 0.2, roughness: 0.35 });
    const silver = std(0xd9e1e8, { metalness: 0.25, roughness: 0.35 });
    const yellow = std(0xffc928, { roughness: 0.4 });
    g.add(scaled(new THREE.Mesh(SPH, top), 0.3, 0.36, 0.95));
    g.add(at(scaled(new THREE.Mesh(SPH, silver), 0.27, 0.28, 0.86), 0, -0.08, 0));
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.9), yellow), 0.27, 0, 0));
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.9), yellow), -0.27, 0, 0));
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 3), yellow);
    fin.rotation.x = -0.9;
    g.add(at(fin, 0, 0.38, 0.1));
    const fin2 = fin.clone();
    fin2.rotation.x = Math.PI + 0.9;
    g.add(at(fin2, 0, -0.36, 0.15));
    const tail = new THREE.Group();
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.12), yellow);
      t.rotation.x = s * 0.7;
      tail.add(at(t, 0, s * 0.18, 0.1));
    }
    g.add(at(tail, 0, 0, 0.95));
    g.userData.tail = tail;
    return g;
  },
  moonjelly() {
    const g = new THREE.Group();
    const bellMat = std(0xdcecff, { transparent: true, opacity: 0.42, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
    bell.scale.y = 0.55;
    g.add(bell);
    const gon = std(0xc8a0f0, { transparent: true, opacity: 0.8, emissive: 0x402060 });
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 5, 12, Math.PI * 1.4), gon);
      r.rotation.set(Math.PI / 2, 0, (i * Math.PI) / 2);
      g.add(at(r, Math.cos((i * Math.PI) / 2) * 0.28, 0.1, Math.sin((i * Math.PI) / 2) * 0.28));
    }
    const arm = std(0xeef6ff, { transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.9, 5), arm);
      a.rotation.x = Math.PI;
      g.add(at(a, Math.cos(i * 1.57 + 0.78) * 0.12, -0.45, Math.sin(i * 1.57 + 0.78) * 0.12));
    }
    g.userData.bell = bell;
    return g;
  },
  sunfish() {
    const g = new THREE.Group();
    const skin = std(0x97a3ad, { roughness: 0.55, metalness: 0.15 });
    g.add(scaled(new THREE.Mesh(SPH, skin), 0.32, 1.2, 1.05));
    const fins = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 4), skin);
      f.scale.z = 0.3;
      f.position.y = s * 0.75;
      if (s < 0) f.rotation.x = Math.PI;
      piv.add(f);
      g.add(at(piv, 0, s * 0.95, 0.55));
      fins.push(piv);
    }
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.25), skin), 0, 0, 1.05));
    for (const s of [-1, 1]) g.add(at(scaled(new THREE.Mesh(SPH, basic(0x111111)), 0.08, 0.08, 0.08), s * 0.27, 0.3, -0.7));
    g.add(at(scaled(new THREE.Mesh(SPH, basic(0x3a2a2a)), 0.08, 0.06, 0.05), 0, 0, -1.05));
    g.userData.fins = fins;
    return g;
  },
  hatchetfish() {
    const g = new THREE.Group();
    const silver = std(0xd5dee6, { metalness: 0.5, roughness: 0.3 });
    const shape = new THREE.Shape();
    shape.moveTo(-0.35, 0.12);
    shape.lineTo(0.3, 0.1);
    shape.lineTo(0.42, 0.0);
    shape.lineTo(0.3, -0.05);
    shape.quadraticCurveTo(0.0, -0.48, -0.3, -0.32);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false });
    geo.translate(0, 0, -0.04);
    geo.rotateY(Math.PI / 2);
    g.add(new THREE.Mesh(geo, silver));
    const glow = basic(0x5fd0ff);
    for (let i = 0; i < 6; i++) g.add(at(scaled(new THREE.Mesh(SPH, glow), 0.025, 0.025, 0.025), 0, -0.28 + Math.abs(i - 2.5) * 0.03, -0.25 + i * 0.09));
    for (const s of [-1, 1]) g.add(at(scaled(new THREE.Mesh(SPH, basic(0x0a0a0a)), 0.05, 0.05, 0.05), s * 0.045, 0.06, 0.28));
    g.rotation.y = Math.PI;
    const wrap = new THREE.Group();
    wrap.add(g);
    return wrap;
  },
  barreleye() {
    const g = new THREE.Group();
    const body = std(0x3a2c27, { roughness: 0.5 });
    g.add(at(scaled(new THREE.Mesh(SPH, body), 0.22, 0.26, 0.62), 0, 0, 0.15));
    const dome = new THREE.Mesh(SPH, std(0xd8f6ff, { transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }));
    dome.scale.set(0.2, 0.2, 0.3);
    g.add(at(dome, 0, 0.16, -0.25));
    const eyes = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.14, 8), basic(0x6dff9a));
      e.position.y = 0.06;
      piv.add(e);
      g.add(at(piv, s * 0.06, 0.13, -0.24));
      eyes.push(piv);
      g.add(at(scaled(new THREE.Mesh(SPH, basic(0x0c0c0c)), 0.035, 0.035, 0.035), s * 0.07, 0.02, -0.5));
    }
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.22), std(0x5a4038, { transparent: true, opacity: 0.7 }));
      f.rotation.z = s * -0.3;
      g.add(at(f, s * 0.3, -0.05, 0.05));
    }
    g.userData.eyes = eyes;
    return g;
  },
  bristlemouth() {
    const g = new THREE.Group();
    g.add(scaled(new THREE.Mesh(SPH, std(0x15171c, { roughness: 0.4 })), 0.07, 0.09, 0.32));
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.12), basic(0x050505)), 0, -0.03, -0.3));
    const glow = basic(0x7dffb0);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) g.add(at(scaled(new THREE.Mesh(SPH, glow), 0.018, 0.018, 0.018), s * 0.05, -0.05, -0.18 + i * 0.11));
    return g;
  },
  seacucumber() {
    const g = new THREE.Group();
    const skin = std(0xe08aa6, { transparent: true, opacity: 0.82, roughness: 0.35, emissive: 0x401020, emissiveIntensity: 0.3 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 4, 10), skin);
    body.rotation.x = Math.PI / 2;
    body.scale.set(1, 1, 0.75);
    g.add(body);
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), skin);
      g.add(at(p, 0, 0.32, -0.35 + i * 0.22));
    }
    for (let i = 0; i < 5; i++) {
      const tnt = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), skin);
      tnt.rotation.x = -Math.PI / 2 - 0.4;
      g.add(at(tnt, (i - 2) * 0.07, 0.05, -0.75));
    }
    for (let i = 0; i < 8; i++) {
      const leg = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), skin);
      leg.rotation.x = Math.PI;
      g.add(at(leg, (i % 2 ? 0.16 : -0.16), -0.22, -0.4 + Math.floor(i / 2) * 0.27));
    }
    return g;
  },

  lanternfish() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), std(0x3a4a5a, { metalness: 0.4, roughness: 0.35 }));
    body.scale.set(0.35, 0.45, 1);
    g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 6), std(0x3a4a5a));
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = 0.6;
    g.add(tail);
    const dotMat = basic(0x6fd8ff);
    for (const s of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.7), dotMat);
      stripe.position.set(s * 0.165, -0.12, -0.05);
      g.add(stripe);
    }
    g.scale.setScalar(0.9);
    return g;
  },
  combjelly() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), std(0xbfe9ff, { transparent: true, opacity: 0.35, roughness: 0.2 }));
    body.scale.set(0.8, 1.2, 0.8);
    g.add(body);
    const rows = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 4, 18, Math.PI), m);
      r.rotation.y = (i / 8) * Math.PI * 2;
      r.rotation.z = Math.PI / 2;
      r.scale.set(1.2, 0.8, 0.8);
      g.add(r);
      rows.push(m);
    }
    g.userData.rows = rows;
    return g;
  },
  vampire() {
    const g = new THREE.Group();
    const red = std(0x5a0f1a, { roughness: 0.5 });
    const mantle = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), red);
    mantle.scale.set(0.8, 0.8, 1.4);
    mantle.position.z = -0.2;
    g.add(mantle);
    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 12, 1, true), std(0x3d0812, { side: THREE.DoubleSide }));
    cape.rotation.x = -Math.PI / 2;
    cape.position.z = 0.65;
    g.add(cape);
    for (const s of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), red);
      fin.scale.set(1, 0.2, 0.7);
      fin.position.set(s * 0.45, 0, -0.6);
      g.add(fin);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), basic(0x4fc3ff));
      eye.position.set(s * 0.25, 0.12, 0.05);
      g.add(eye);
    }
    g.userData.cape = cape;
    return g;
  },
  gulper() {
    const g = new THREE.Group();
    const black = std(0x101317, { roughness: 0.4 });
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.75), black);
    mouth.rotation.x = -Math.PI / 2;
    mouth.scale.set(1, 1.3, 0.8);
    g.add(mouth);
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.9) * 0.25, 0, 0.6 + i * 0.6));
    const tail = tube(pts, 0.09, black, 30);
    g.add(tail);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic(0xff5a8a));
    tip.position.copy(pts[pts.length - 1]);
    g.add(tip);
    const glow = glowSprite(0xff5a8a, 1.6, 0.9);
    glow.position.copy(tip.position);
    g.add(glow);
    g.userData.tail = tail;
    return g;
  },
  angler() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), std(0x1d1a1f, { roughness: 0.7 }));
    body.scale.set(0.9, 0.85, 1);
    g.add(body);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0x141114));
    jaw.position.set(0, -0.15, -0.35);
    g.add(jaw);
    const toothMat = std(0xf1efe6, { roughness: 0.3 });
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + (i / 8) * 2.4;
      const tth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 4), toothMat);
      tth.position.set(Math.sin(a) * 0.45, -0.05, -0.55 - Math.cos(a) * 0.15);
      tth.rotation.x = Math.PI;
      g.add(tth);
    }
    const stalk = tube([new THREE.Vector3(0, 0.55, -0.2), new THREE.Vector3(0, 1.05, -0.5), new THREE.Vector3(0, 0.95, -1.1)], 0.03, std(0x2b2629));
    g.add(stalk);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic(0x9fffe0));
    bulb.position.set(0, 0.9, -1.15);
    g.add(bulb);
    const glow = glowSprite(0x7dffd8, 2.2, 0.9);
    glow.position.copy(bulb.position);
    g.add(glow);
    g.userData.glow = glow;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 6), std(0x1d1a1f));
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = 0.8;
    g.add(tail);
    return g;
  },
  seapig() {
    const g = new THREE.Group();
    const pink = std(0xe9a3b6, { transparent: true, opacity: 0.85, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), pink);
    body.scale.set(0.75, 0.55, 1.2);
    body.position.y = 0.3;
    g.add(body);
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.25, 5), pink);
        leg.position.set(s * 0.25, 0.08, -0.3 + i * 0.3);
        g.add(leg);
      }
    }
    for (const s of [-1, 1]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35, 5), pink);
      ant.position.set(s * 0.12, 0.62, -0.25);
      ant.rotation.z = s * 0.4;
      g.add(ant);
    }
    return g;
  },
  grenadier() {
    const g = new THREE.Group();
    const mat = std(0x7b6a58, { roughness: 0.5, metalness: 0.15 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), mat);
    head.scale.set(0.8, 0.9, 1.1);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.4, 8), mat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = 1.4;
    g.add(tail);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), std(0x0a0a10, { metalness: 0.8, roughness: 0.1 }));
      eye.position.set(s * 0.28, 0.12, -0.25);
      g.add(eye);
    }
    g.userData.tail = tail;
    return g;
  },
  dumbo() {
    const g = new THREE.Group();
    const mat = std(0xf0a787, { roughness: 0.45, transparent: true, opacity: 0.92 });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), mat);
    bell.scale.set(1, 1.1, 1);
    g.add(bell);
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.6, 16, 1, true), std(0xe98f72, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    skirt.position.y = -0.55;
    skirt.rotation.x = Math.PI;
    g.add(skirt);
    const ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat);
      ear.scale.set(1, 0.15, 0.7);
      ear.position.set(s * 0.62, 0.3, 0);
      g.add(ear);
      ears.push(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), basic(0x111111));
      eye.position.set(s * 0.25, 0.05, -0.48);
      g.add(eye);
    }
    g.userData.ears = ears;
    return g;
  },
  supergiant() {
    const g = new THREE.Group();
    const mat = std(0xf3efe6, { roughness: 0.35 });
    for (let i = 0; i < 7; i++) {
      const a = -0.6 + i * 0.2;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.22 - Math.abs(i - 3) * 0.02, 8, 6), mat);
      seg.scale.set(1, 0.9, 0.8);
      seg.position.set(0, Math.cos(a) * 0.4 - 0.3, -Math.sin(a) * 1.0);
      g.add(seg);
      if (i > 0 && i < 6) {
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), mat);
          leg.position.set(s * 0.18, seg.position.y - 0.25, seg.position.z);
          leg.rotation.z = s * 0.5;
          g.add(leg);
        }
      }
    }
    g.scale.setScalar(1.1);
    return g;
  },
  amphipod() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 3, 6), std(0xf2b9a0, { roughness: 0.4 }));
    m.rotation.x = Math.PI / 2 + 0.3;
    g.add(m);
    return g;
  },
  snailfish() {
    const g = new THREE.Group();
    const mat = std(0xf5d6d0, { transparent: true, opacity: 0.85, roughness: 0.3 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), mat);
    head.scale.set(0.9, 0.85, 1);
    g.add(head);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.33, 1.5, 10), mat);
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.85;
    g.add(body);
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat);
    fin.scale.set(0.1, 0.5, 1.4);
    fin.position.set(0, 0.2, 0.8);
    g.add(fin);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), basic(0x222222));
      eye.position.set(s * 0.2, 0.12, -0.3);
      g.add(eye);
    }
    g.userData.tail = body;
    return g;
  },
  xeno() {
    const geo = new THREE.IcosahedronGeometry(0.6, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const n = 1 + 0.25 * Math.sin(v.x * 9) * Math.cos(v.y * 7) + 0.15 * Math.sin(v.z * 13);
      v.multiplyScalar(n);
      v.y *= 0.6;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, std(0xc9b48c, { roughness: 1 }));
    m.position.y = 0.25;
    const g = new THREE.Group();
    g.add(m);
    return g;
  },
  tubeworm() {
    const g = new THREE.Group();
    const tubeMat = std(0xe9e4d4, { roughness: 0.7 });
    const tipMat = std(0xb3474f, { roughness: 0.5 });
    const r = mulberry32(7);
    for (let i = 0; i < 34; i++) {
      const h = 0.8 + r() * 1.6;
      const x = (r() - 0.5) * 3.4, z = (r() - 0.5) * 3.4;
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, h, 5), tubeMat);
      tb.position.set(x, h / 2, z);
      tb.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
      g.add(tb);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), tipMat);
      tip.position.set(x, h, z);
      g.add(tip);
    }
    return g;
  },
  clam() {
    const g = new THREE.Group();
    const mat = std(0xece2c6, { roughness: 0.5 });
    const r = mulberry32(11);
    for (let i = 0; i < 24; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      c.scale.set(1.4, 0.6, 0.9);
      c.position.set((r() - 0.5) * 3, 0.02, (r() - 0.5) * 3);
      c.rotation.y = r() * 6;
      g.add(c);
    }
    return g;
  },
  nodule() {
    const geo = new THREE.IcosahedronGeometry(0.35, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      v.multiplyScalar(1 + 0.18 * Math.sin(v.x * 11 + v.z * 7));
      p.setXYZ(i, v.x, v.y * 0.8, v.z);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, std(0x2a2522, { roughness: 0.8, metalness: 0.4 }));
    m.position.y = 0.2;
    const g = new THREE.Group();
    g.add(m);
    return g;
  },
  litter() {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1.2, 1.4, 6, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5) * 0.12 + Math.cos(p.getY(i) * 6) * 0.1);
    geo.computeVertexNormals();
    const bag = new THREE.Mesh(geo, std(0xe8f2f6, { transparent: true, opacity: 0.75, side: THREE.DoubleSide, roughness: 0.3 }));
    bag.rotation.x = -Math.PI / 2 + 0.3;
    bag.position.y = 0.2;
    g.add(bag);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), std(0x6fb6d8, { transparent: true, opacity: 0.7 }));
    bottle.rotation.z = Math.PI / 2;
    bottle.position.set(0.6, 0.12, 0.3);
    g.add(bottle);
    return g;
  },
  whale() {
    const g = new THREE.Group();
    const bone = std(0xe6dfcc, { roughness: 0.8 });
    const mat = std(0xf2f2f2, { roughness: 1, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 22; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.55), bone);
      v.position.set(0, 0.35, -9 + i * 0.85);
      v.rotation.y = Math.sin(i * 0.3) * 0.1;
      g.add(v);
      if (i > 3 && i < 13) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 4, 14, Math.PI), bone);
        rib.position.copy(v.position);
        rib.rotation.y = Math.PI / 2;
        rib.rotation.x = Math.PI;
        rib.scale.set(1, 0.6, 1);
        rib.position.y = 0.3;
        g.add(rib);
      }
    }
    const skull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 3.2), bone);
    skull.position.set(0, 0.5, -11);
    g.add(skull);
    const mat2 = new THREE.Mesh(new THREE.CircleGeometry(6, 20), mat);
    mat2.rotation.x = -Math.PI / 2;
    mat2.position.y = 0.05;
    g.add(mat2);
    return g;
  },
  seep() {
    const g = new THREE.Group();
    const mat = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), std(0xf0e6c0, { roughness: 1 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.y = 0.04;
    g.add(mat);
    const mat2 = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), std(0xe0a24a, { roughness: 1 }));
    mat2.rotation.x = -Math.PI / 2;
    mat2.position.set(1.2, 0.06, -0.8);
    g.add(mat2);
    for (let i = 0; i < 6; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.5), std(0x3b3632, { roughness: 1 }));
      rock.position.set((Math.random() - 0.5) * 6, 0.2, (Math.random() - 0.5) * 6);
      g.add(rock);
    }
    return g;
  },
  lander() {
    const g = new THREE.Group();
    const frame = std(0x9aa3ab, { metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), frame);
      leg.position.set(Math.cos(a) * 0.8, 1.1, Math.sin(a) * 0.8);
      leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      g.add(leg);
    }
    const float = std(0xf5c518, { roughness: 0.4 });
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), float);
      f.position.set(i ? 0.5 : -0.5, 2.5, 0);
      g.add(f);
    }
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), std(0x222222));
    cam.position.set(0, 1.5, 0.3);
    g.add(cam);
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    strobe.position.set(0, 3.1, 0);
    g.add(strobe);
    const glow = glowSprite(0xff3030, 3, 0.9);
    glow.position.copy(strobe.position);
    g.add(glow);
    g.userData.strobe = glow;
    return g;
  },
  trieste() {
    const g = new THREE.Group();
    const holo = new THREE.MeshBasicMaterial({ color: 0x5fe3ff, transparent: true, opacity: 0.35, depthWrite: false, fog: false });
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.4, 6, 12), holo);
    tank.rotation.x = Math.PI / 2;
    tank.position.y = 3.6;
    g.add(tank);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), holo);
    sphere.position.y = 2.2;
    g.add(sphere);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.06, 6, 40), holo);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    g.add(ring);
    const lbl = labelSprite('TRIESTE · 1960', ['#9ff2ff', '#ffffff']);
    lbl.position.y = 5.6;
    g.add(lbl);
    g.userData.spin = tank;
    return g;
  },

  // ---------------- FANTASY ----------------
  jellyphant() {
    const g = new THREE.Group();
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xff66cc, emissive: 0xff33aa, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, roughness: 0.3 });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
    g.add(bell);
    const trunk = tube([new THREE.Vector3(0, 0.3, -1.0), new THREE.Vector3(0, -0.2, -1.6), new THREE.Vector3(0, -0.9, -1.7), new THREE.Vector3(0, -1.3, -1.3)], 0.18, bellMat);
    g.add(trunk);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), bellMat);
      ear.position.set(s * 1.1, 0.4, -0.3);
      ear.rotation.y = s * 1.2;
      g.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic(0x111111));
      eye.position.set(s * 0.45, 0.5, -1.0);
      g.add(eye);
    }
    const tentMat = new THREE.MeshBasicMaterial({ color: 0xffd1f0, transparent: true, opacity: 0.7 });
    const tents = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pts = [];
      for (let k = 0; k < 5; k++) pts.push(new THREE.Vector3(Math.cos(a) * 0.9, -k * 0.6, Math.sin(a) * 0.9));
      const tt = tube(pts, 0.04, tentMat, 10);
      g.add(tt);
      tents.push(tt);
    }
    const glow = glowSprite(0xff66cc, 7, 0.7);
    g.add(glow);
    g.userData.colorMats = [bellMat];
    g.userData.glow = glow;
    g.userData.disco = true;
    return g;
  },
  sockopus() {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8e5cff, emissive: 0x5a2fd0, emissiveIntensity: 0.5, roughness: 0.6 }));
    head.position.y = 1.4;
    head.scale.set(1, 1.15, 1);
    g.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), basic(0xffffff));
      eye.position.set(s * 0.35, 1.6, -0.75);
      g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), basic(0x111111));
      pupil.position.set(s * 0.35, 1.6, -0.95);
      g.add(pupil);
    }
    const colors = [0xff4d4d, 0xffb84d, 0xfff24d, 0x4dff88, 0x4dd2ff, 0x4d6bff, 0xff4dd2, 0xffffff];
    const arms = [];
    colors.forEach((c, i) => {
      const a = (i / 8) * Math.PI * 2;
      const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.8 });
      const arm = new THREE.Group();
      const leg = tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, -0.3, 0), new THREE.Vector3(1.1, -0.5, 0), new THREE.Vector3(1.6, -0.2, 0)], 0.16, mat, 12);
      arm.add(leg);
      const heel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), basic(0xffffff));
      heel.position.set(1.62, -0.2, 0);
      arm.add(heel);
      arm.position.y = 0.8;
      arm.rotation.y = a;
      g.add(arm);
      arms.push(arm);
    });
    g.add(glowSprite(0xb48cff, 7, 0.6));
    g.userData.arms = arms;
    return g;
  },
  toaster() {
    const g = new THREE.Group();
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd9e3ea, metalness: 0.9, roughness: 0.2, emissive: 0x334455, emissiveIntensity: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.0), chrome);
    g.add(body);
    for (const s of [-1, 1]) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), basic(0x111111));
      slot.position.set(s * 0.35, 0.56, 0);
      g.add(slot);
    }
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x5ad1ff, emissive: 0x2299cc, emissiveIntensity: 0.6, side: THREE.DoubleSide });
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(1.4, 3), wingMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(s * 1.3, 0, 0);
      w.scale.set(1, 0.8, 1);
      g.add(w);
      wings.push(w);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), basic(0x222222));
    tail.rotation.x = Math.PI / 2;
    tail.position.z = 1.5;
    g.add(tail);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic(0x111111));
      eye.position.set(s * 0.4, 0.15, -0.52);
      g.add(eye);
    }
    const toastMat = new THREE.MeshStandardMaterial({ color: 0xc98a3d, emissive: 0x8a5520, emissiveIntensity: 0.5 });
    const toasts = [];
    for (const s of [-1, 1]) {
      const toast = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.1), toastMat);
      toast.position.set(s * 0.35, 0.3, 0);
      toast.userData.base = toast.position.clone();
      g.add(toast);
      toasts.push(toast);
    }
    g.add(glowSprite(0x7fe0ff, 6, 0.55));
    g.userData.wings = wings;
    g.userData.toasts = toasts;
    return g;
  },
  grumpus() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 18, 14), new THREE.MeshStandardMaterial({ color: 0xff7a3d, emissive: 0xcc4a1a, emissiveIntensity: 0.5, roughness: 0.5 }));
    g.add(body);
    const black = basic(0x111111);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), basic(0xffffff));
      eye.position.set(s * 0.5, 0.35, -1.1);
      g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), black);
      pupil.position.set(s * 0.5, 0.3, -1.35);
      g.add(pupil);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.12), black);
      brow.position.set(s * 0.5, 0.75, -1.15);
      brow.rotation.z = s * -0.45;
      g.add(brow);
      const stache = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 6, 12, Math.PI), black);
      stache.position.set(s * 0.3, -0.25, -1.25);
      stache.rotation.z = Math.PI;
      g.add(stache);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.0, 4), new THREE.MeshStandardMaterial({ color: 0xff9a5d, emissive: 0xcc5a2a, emissiveIntensity: 0.4 }));
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = 1.6;
    g.add(tail);
    g.add(glowSprite(0xff8a4d, 7, 0.5));
    g.userData.tail = tail;
    return g;
  },
  duckangler() {
    const g = BUILD.angler();
    g.children.forEach((c) => {
      if (c.isSprite) c.visible = false;
    });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffdd33, emissive: 0xffaa00, emissiveIntensity: 0.7, roughness: 0.4 });
    const duck = new THREE.Group();
    const dbody = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), yellow);
    dbody.scale.set(1, 0.8, 1.2);
    duck.add(dbody);
    const dhead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), yellow);
    dhead.position.set(0, 0.25, -0.18);
    duck.add(dhead);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 6), basic(0xff7a00));
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.23, -0.38);
    duck.add(beak);
    duck.position.set(0, 0.75, -1.2);
    g.add(duck);
    g.add(glowSprite(0xffd23f, 5, 0.6));
    g.userData.duck = duck;
    g.scale.setScalar(1.4);
    return g;
  },
  spaghetti() {
    const g = new THREE.Group();
    const noodle = new THREE.MeshStandardMaterial({ color: 0xffe28a, emissive: 0xffc94a, emissiveIntensity: 0.8, roughness: 0.6 });
    const r = mulberry32(99);
    const strands = [];
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2;
      const pts = [new THREE.Vector3(0, 0.8, 0)];
      for (let k = 1; k < 6; k++) pts.push(new THREE.Vector3(Math.cos(a) * k * 0.55 + (r() - 0.5) * 0.6, 0.8 - k * 0.12 + (r() - 0.5) * 0.4, Math.sin(a) * k * 0.55 + (r() - 0.5) * 0.6));
      const s = tube(pts, 0.07, noodle, 18);
      g.add(s);
      strands.push(s);
    }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 12), new THREE.MeshStandardMaterial({ color: 0x7a3b1f, roughness: 0.9, emissive: 0x3a1a0a, emissiveIntensity: 0.4 }));
    ball.position.y = 1.0;
    g.add(ball);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), basic(0xffffff));
    eye.position.set(0, 1.15, -0.5);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), basic(0x111111));
    pupil.position.set(0, 1.15, -0.78);
    g.add(pupil);
    g.add(at(glowSprite(0xffd36a, 8, 0.55), 0, 0.8, 0));
    g.userData.strands = strands;
    return g;
  },
  sheep() {
    const g = new THREE.Group();
    const wool = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, emissive: 0x9fd8ff, emissiveIntensity: 0.7, roughness: 1 });
    const r = mulberry32(5);
    for (let i = 0; i < 18; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.35 + r() * 0.15, 8, 6), wool);
      b.position.set((r() - 0.5) * 1.2, 0.9 + (r() - 0.5) * 0.5, (r() - 0.5) * 1.6);
      g.add(b);
    }
    const black = new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: 0.8 });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), black);
    face.scale.set(0.8, 1, 1.1);
    face.position.set(0, 1.0, -1.05);
    g.add(face);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), basic(0xffffff));
      eye.position.set(s * 0.15, 1.1, -1.35);
      g.add(eye);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), black);
      ear.scale.set(1.6, 0.5, 0.6);
      ear.position.set(s * 0.32, 1.15, -0.95);
      g.add(ear);
    }
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 5), black);
      leg.position.set(i < 2 ? -0.35 : 0.35, 0.3, i % 2 ? 0.5 : -0.5);
      g.add(leg);
    }
    g.add(at(glowSprite(0xa8e2ff, 6, 0.6), 0, 1, 0));
    return g;
  },
  pancake() {
    const g = new THREE.Group();
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0xd99b4a, emissive: 0x8a5a1a, emissiveIntensity: 0.5, roughness: 0.7 }));
    cake.position.y = 0.2;
    g.add(cake);
    const syrup = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9b4a10, emissive: 0x5a2a05, emissiveIntensity: 0.4, roughness: 0.1, metalness: 0.2 }));
    syrup.scale.y = 0.2;
    syrup.position.y = 0.38;
    g.add(syrup);
    const butter = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: 0xfff1a0, emissive: 0xc9b040, emissiveIntensity: 0.5 }));
    butter.position.set(0.2, 0.55, 0.1);
    g.add(butter);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), basic(0xffffff));
      eye.position.set(s * 0.4, 0.5, -1.0);
      g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), basic(0x111111));
      pupil.position.set(s * 0.4, 0.5, -1.14);
      g.add(pupil);
    }
    g.add(at(glowSprite(0xffc86a, 6, 0.55), 0, 0.5, 0));
    return g;
  },
};

// Which models glow by themselves (visible without our lights).
const SELF_GLOW = new Set(['lanternfish', 'angler', 'gulper', 'lander', 'trieste', 'seep', 'bristlemouth', 'hatchetfish', 'barreleye']);

const SPEED = { dolphin: 4.5, humpback: 1.3, spermwhale: 1.2, whaleshark: 1.1, turtle: 1.0, manta: 1.6, tuna: 4, moonjelly: 0.25, sunfish: 0.5, hatchetfish: 1.0, barreleye: 0.3, bristlemouth: 1.2, seacucumber: 0.08, lanternfish: 2.4, combjelly: 0.6, vampire: 0.9, gulper: 1.2, angler: 0.7, seapig: 0.25, grenadier: 1.4, dumbo: 0.8, supergiant: 0.6, amphipod: 1.5, snailfish: 1.0 };
const HOVER = { seacucumber: 0.25, seapig: 0, grenadier: 1.6, dumbo: 1.8, supergiant: 0.5, amphipod: 0.9, snailfish: 1.0, xeno: 0, sockopus: 0, spaghetti: 0, sheep: 0.6, pancake: 0 };
const RADIUS = { dolphin: 3, humpback: 7, spermwhale: 6, whaleshark: 6, turtle: 1.6, manta: 3.5, tuna: 2.5, moonjelly: 2, sunfish: 2, hatchetfish: 1.6, barreleye: 1.1, bristlemouth: 1.8, seacucumber: 1.6, lanternfish: 2.2, combjelly: 1, vampire: 1.3, gulper: 2.6, angler: 1.3, seapig: 2.2, grenadier: 2, dumbo: 1.4, supergiant: 1.6, amphipod: 2.2, snailfish: 1.6, xeno: 1, tubeworm: 3, clam: 2.5, nodule: 0.6, litter: 1, whale: 10, seep: 5, lander: 2, trieste: 3, jellyphant: 2.5, sockopus: 2.4, toaster: 2.2, grumpus: 2, duckangler: 2, spaghetti: 2.5, sheep: 1.8, pancake: 2 };
const STATIC = new Set(['xeno', 'tubeworm', 'clam', 'nodule', 'litter', 'whale', 'seep', 'lander', 'trieste']);


// Swimming animation for the upper-ocean animals.
function animUpper(o, m, ph) {
  const u = o.userData;
  if (u.fluke) u.fluke.rotation.x = Math.sin(ph * (m === 'dolphin' ? 5 : 1.6)) * 0.35;
  if (u.tail) u.tail.rotation.y = Math.sin(ph * (m === 'tuna' ? 9 : 2)) * 0.3;
  if (u.flips) u.flips.forEach((f, i) => (f.rotation.z = Math.sin(ph * 1.6 + (i % 2) * 0.8) * 0.45 * (i < 2 ? -1 : 1)));
  if (u.wings) u.wings.forEach((w, i) => (w.rotation.z = Math.sin(ph * 1.3) * 0.38 * (i ? 1 : -1)));
  if (u.bell) {
    const s = Math.sin(ph * 2.4);
    u.bell.scale.set(1 + s * 0.1, 0.55 * (1 - s * 0.15), 1 + s * 0.1);
  }
  if (u.fins) u.fins.forEach((f) => (f.rotation.z = Math.sin(ph * 2) * 0.45));
  if (u.eyes) {
    const look = Math.sin(ph * 0.35) > 0 ? 0 : -1.2;
    u.eyes.forEach((e) => (e.rotation.x += (look - e.rotation.x) * 0.05));
  }
}

export class CreatureManager {
  constructor(scene, world, level, seed) {
    this.scene = scene;
    this.world = world;
    this.level = level;
    this.rng = mulberry32(seed);
    this.items = [];
    this.counter = 0;
    this.time = 0;
    this.spawnAll();
  }

  add(def, pos, extra = {}) {
    const model = def.model;
    let group;
    let members = null;
    if (def.group > 1) {
      group = new THREE.Group();
      members = [];
      for (let i = 0; i < def.group; i++) {
        const m = BUILD[model]();
        const off = new THREE.Vector3((this.rng() - 0.5) * 3.5, (this.rng() - 0.5) * (def.habitat === 'mid' ? 2.5 : 0), (this.rng() - 0.5) * 3.5);
        m.position.copy(off);
        m.userData.off = off;
        m.userData.phase = this.rng() * 10;
        group.add(m);
        members.push(m);
      }
    } else {
      group = BUILD[model]();
    }
    group.position.copy(pos);
    group.rotation.y = this.rng() * Math.PI * 2;
    this.scene.add(group);
    let label = null;
    if (def.kind === 'fantasy') {
      label = labelSprite(`★ ${tr('fantasy')} ★`, RAINBOW);
      label.position.y = 3.2;
      label.visible = false;
      group.add(label);
    }
    let speech = null;
    if (model === 'grumpus') {
      speech = speechSprite(L({ en: 'Turn off that light!', de: 'Mach das Licht aus!' }));
      speech.position.y = 3.4;
      speech.visible = false;
      group.add(speech);
    }
    const item = {
      id: `${def.id}-${this.counter++}`,
      def,
      group,
      members,
      label,
      speech,
      home: pos.clone(),
      target: pos.clone(),
      vel: new THREE.Vector3(),
      phase: this.rng() * 100,
      radius: RADIUS[model] || 1.5,
      glow: SELF_GLOW.has(model) || def.kind === 'fantasy',
      static: STATIC.has(model),
      collected: false,
      retarget: 0,
      ...extra,
    };
    this.items.push(item);
    return item;
  }

  midPos(minD, maxD) {
    const L = this.level;
    for (let i = 0; i < 50; i++) {
      const nearShip = this.rng() < 0.65;
      const x = nearShip ? SHIP_X + (this.rng() - 0.5) * 220 : -WX + 80 + this.rng() * (2 * WX - 160);
      const z = axisZ(x) + (this.rng() - 0.5) * (nearShip ? 160 : 500);
      const floorD = this.world.depthAt(x, z);
      const hi = Math.min(maxD, floorD - 80, L.maxDepth);
      if (hi <= minD) continue;
      const d = minD + this.rng() * (hi - minD);
      return new THREE.Vector3(x, -d / SCALE, z);
    }
    return null;
  }

  spawnAll() {
    const L = this.level;
    const W = this.world;
    // real animals
    for (const def of CREATURES) {
      if (def.kind !== 'real' || def.count <= 0) continue;
      if (def.depth[0] > L.maxDepth - 50) continue;
      for (let i = 0; i < def.count; i++) {
        let p = null;
        if (def.spawn === 'drop') p = this.dropPos(def.depth[0], def.depth[1], i);
        else if (def.habitat === 'mid') p = this.midPos(def.depth[0], def.depth[1]);
        else {
          const hadal = def.depth[0] >= 6000;
          p = W.randomFloorPoint(this.rng, def.depth[0], def.depth[1], hadal ? { nearAxis: W.halfW * 0.7 } : {});
          if (p) p.y += HOVER[def.model] ?? 0;
        }
        if (p) this.add(def, p);
      }
    }
    const byId = (id) => CREATURES.find((c) => c.id === id);
    const F = L.features;
    const gardenFantasy = this.spawnGarden();
    // nodule fields
    for (let f = 0; f < 3 && F.nodules; f++) {
      const c = W.randomFloorPoint(this.rng, 4000, 6500);
      if (!c) continue;
      for (let i = 0; i < Math.ceil(F.nodules / 3); i++) {
        const x = c.x + (this.rng() - 0.5) * 18, z = c.z + (this.rng() - 0.5) * 18;
        this.add(byId('nodule'), new THREE.Vector3(x, W.heightAt(x, z), z));
      }
    }
    // litter
    for (let i = 0; i < F.litter; i++) {
      const p = W.randomFloorPoint(this.rng, Math.min(5000, L.maxDepth - 1500), L.maxDepth, { nearAxis: W.halfW * 0.8 });
      if (p) this.add(byId('litter'), p);
    }
    // whale fall
    if (F.whale) {
      const p = W.randomFloorPoint(this.rng, 3000, Math.min(7000, L.maxDepth));
      if (p) this.whale = this.add(byId('whale'), p);
    }
    // methane seeps with communities
    this.seeps = [];
    for (let i = 0; i < F.seeps; i++) {
      const p = W.randomFloorPoint(this.rng, Math.max(5800, L.plainDepth + 300), Math.min(9533, L.maxDepth), { nearAxis: W.halfW * 0.85 });
      if (!p) continue;
      const seep = this.add(byId('seep'), p);
      this.seeps.push(seep);
      W.addBubbles(p);
      const tw = p.clone().add(new THREE.Vector3(2.5, 0, 1));
      tw.y = W.heightAt(tw.x, tw.z);
      this.add(byId('tubeworm'), tw);
      const cl = p.clone().add(new THREE.Vector3(-3, 0, -2));
      cl.y = W.heightAt(cl.x, cl.z);
      this.add(byId('clam'), cl);
    }
    // lost lander (mission)
    if (F.lander) {
      const p = W.randomFloorPoint(this.rng, L.plainDepth, L.maxDepth, { nearAxis: W.halfW * 0.8 });
      if (p) this.lander = this.add(byId('lander'), p);
    }
    // Trieste marker at the deepest point
    this.deepest = W.deepestPoint();
    if (L.trieste) {
      const p = new THREE.Vector3(this.deepest.x + 6, 0, this.deepest.z + 3);
      p.y = W.heightAt(p.x, p.z);
      this.trieste = this.add(byId('trieste'), p);
    }
    // fantasy creatures: three per dive
    const fantasy = CREATURES.filter((c) => c.kind === 'fantasy' && c.depth[0] < L.maxDepth - 200 && c !== gardenFantasy);
    const chosen = [];
    while (chosen.length < Math.min(3, fantasy.length)) {
      const f = fantasy[Math.floor(this.rng() * fantasy.length)];
      if (!chosen.includes(f)) chosen.push(f);
    }
    for (const def of chosen) {
      let p;
      if (def.habitat === 'mid') p = this.midPos(def.depth[0], def.depth[1]);
      else {
        p = W.randomFloorPoint(this.rng, def.depth[0], Math.min(def.depth[1], L.maxDepth), { nearAxis: W.halfW });
        if (p) p.y += HOVER[def.model] ?? 0;
      }
      if (p) this.add(def, p);
    }
  }

  // Close to where the sub dives in, so the first minutes are full of animals.
  dropPos(minD, maxD, i = 0) {
    const sp = this.world.shipPos;
    for (let k = 0; k < 30; k++) {
      const a = this.rng() * Math.PI * 2;
      const near = i === 0 && minD < 8;
      const r = near ? 9 + this.rng() * 14 : 12 + this.rng() * (maxD < 250 ? 38 : 30);
      const x = sp.x + 12 + Math.cos(a) * r;
      const z = sp.z + Math.sin(a) * r;
      const floorD = this.world.depthAt(x, z);
      const hi = Math.min(maxD, floorD - 80);
      if (hi <= minD) continue;
      const top = near ? Math.min(hi, minD + 35) : hi;
      const d = minD + this.rng() * (top - minD);
      return new THREE.Vector3(x, -d / SCALE, z);
    }
    return null;
  }

  // "Arrival garden": a lively patch of seafloor right below the drop point.
  spawnGarden() {
    const W = this.world;
    const cx = W.shipPos.x + 14;
    const cz = axisZ(cx);
    const landD = W.depthAt(cx, cz);
    this.landing = new THREE.Vector3(cx, W.heightAt(cx, cz), cz);
    const ok = (c) => landD >= c.depth[0] - 150 && landD <= c.depth[1] + 150;
    const pool = CREATURES.filter((c) => c.kind === 'real' && c.habitat === 'floor' && c.count > 0 && ok(c));
    const ring = (rMin, rMax) => {
      const a = this.rng() * Math.PI * 2;
      const r = rMin + this.rng() * (rMax - rMin);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      return new THREE.Vector3(x, W.heightAt(x, z), z);
    };
    for (const def of pool) {
      for (let i = 0; i < 2; i++) {
        const p = ring(5, 19);
        p.y += HOVER[def.model] ?? 0;
        this.add(def, p);
      }
    }
    const nod = CREATURES.find((c) => c.id === 'nodule');
    if (this.level.features.nodules && ok(nod)) {
      const c = ring(10, 18);
      for (let i = 0; i < 4; i++) {
        const x = c.x + (this.rng() - 0.5) * 8, z = c.z + (this.rng() - 0.5) * 8;
        this.add(nod, new THREE.Vector3(x, W.heightAt(x, z), z));
      }
    }
    const fans = CREATURES.filter((c) => c.kind === 'fantasy' && c.habitat === 'floor' && landD >= c.depth[0] && landD <= c.depth[1]);
    if (!fans.length) return null;
    const f = fans[Math.floor(this.rng() * fans.length)];
    const p = ring(9, 16);
    p.y += HOVER[f.model] ?? 0;
    this.add(f, p);
    return f;
  }

  remove(item) {
    item.collected = true;
    this.scene.remove(item.group);
  }

  // Is the item lit by the sub's lamp (or glowing by itself)?
  visibility(item, light, subPos) {
    const p = item.group.position;
    const d = p.distanceTo(subPos);
    if (item.glow && d < 70) return { visible: true, d };
    const amb = p.y > -25 ? 50 : p.y > -60 ? 26 : 0; // sunlight near the surface
    if (d < amb) return { visible: true, d };
    if (!light.on) return { visible: d < 6, d };
    if (d > light.range + item.radius) return { visible: false, d };
    const dir = p.clone().sub(light.pos).normalize();
    const cos = dir.dot(light.dir);
    return { visible: cos > 0.72 || d < 7, d };
  }

  update(dt, sub, light) {
    this.time += dt;
    const T = this.time;
    const subPos = sub.pos;
    for (const it of this.items) {
      if (it.collected) continue;
      const g = it.group;
      const m = it.def.model;
      const dist = g.position.distanceTo(subPos);
      const visRange = it.glow ? 170 : 125;
      g.visible = dist < visRange;
      if (!g.visible) continue; // freeze and hide far away items

      if (!it.static) {
        it.retarget -= dt;
        if (it.retarget <= 0) {
          it.retarget = 4 + this.rng() * 6;
          const mid = it.def.habitat === 'mid';
          const R = mid ? 22 : 12;
          it.target.set(it.home.x + (this.rng() - 0.5) * 2 * R, it.home.y + (mid ? (this.rng() - 0.5) * 10 : 0), it.home.z + (this.rng() - 0.5) * 2 * R);
        }
        const speed = SPEED[m] ?? 0.8;
        const to = it.target.clone().sub(g.position);
        if (it.def.habitat !== 'mid') to.y = 0;
        const len = to.length();
        if (len > 0.5) {
          to.multiplyScalar(1 / len);
          it.vel.lerp(to.multiplyScalar(speed), 1 - Math.exp(-dt * 1.2));
        } else it.vel.multiplyScalar(Math.exp(-dt));
        g.position.addScaledVector(it.vel, dt);
        if (it.def.habitat !== 'mid') {
          g.position.y = this.world.heightAt(g.position.x, g.position.z) + (HOVER[m] ?? 0);
        } else {
          const fy = this.world.heightAt(g.position.x, g.position.z) + 4;
          if (g.position.y < fy) g.position.y = fy;
          if (g.position.y > -1.8) g.position.y = -1.8;
        }
        if (it.vel.lengthSq() > 0.01) {
          const yaw = Math.atan2(-it.vel.x, -it.vel.z);
          let dy = yaw - g.rotation.y;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          g.rotation.y += dy * (1 - Math.exp(-dt * 2));
        }
      }

      // per-model animation
      const ph = it.phase + T;
      if (it.members) {
        for (const mm of it.members) {
          const o = mm.userData.off;
          const p2 = mm.userData.phase + T;
          mm.position.set(o.x + Math.sin(p2 * 0.9) * 0.4, o.y + Math.sin(p2 * 1.3) * 0.25, o.z + Math.cos(p2 * 0.7) * 0.4);
          mm.rotation.y = Math.sin(p2 * 2) * 0.15;
        }
      }
      if (it.members) it.members.forEach((mm) => animUpper(mm, m, mm.userData.phase + T));
      else animUpper(g, m, ph);
      if (m === 'combjelly') {
        g.position.y += Math.sin(ph) * dt * 0.3;
        const lit = light.on && dist < light.range;
        it.def && g.userData.rows.forEach((mat, i) => {
          mat.color.setHSL((T * 0.6 + i / 8) % 1, 1, lit ? 0.6 : 0.15);
          mat.opacity = lit ? 0.9 : 0.25;
        });
      } else if (m === 'dumbo') {
        g.userData.ears.forEach((e, i) => (e.rotation.z = Math.sin(ph * 3) * 0.5 * (i ? 1 : -1)));
        g.position.y += Math.sin(ph * 1.5) * dt * 0.4;
      } else if (m === 'vampire') {
        g.userData.cape.scale.setScalar(1 + Math.sin(ph * 2) * 0.12);
      } else if (m === 'angler' && g.userData.glow) {
        g.userData.glow.material.opacity = 0.6 + Math.sin(ph * 2) * 0.3;
      } else if (m === 'gulper' || m === 'grenadier' || m === 'snailfish') {
        const tl = g.userData.tail;
        if (tl) tl.rotation.y = Math.sin(ph * 2.5) * 0.15;
      } else if (m === 'lander') {
        g.userData.strobe.material.opacity = (T * 1.2) % 1 < 0.15 ? 1 : 0.1;
      } else if (m === 'trieste') {
        g.userData.spin.rotation.z += dt * 0.0;
        g.rotation.y += dt * 0.3;
      } else if (m === 'jellyphant') {
        const hue = (Math.floor(T * 2) * 0.17) % 1;
        g.userData.colorMats.forEach((mat) => {
          mat.color.setHSL(hue, 0.9, 0.6);
          mat.emissive.setHSL(hue, 0.9, 0.45);
        });
        g.userData.glow.material.color.setHSL(hue, 0.9, 0.6);
        g.position.y += Math.sin(ph * 1.6) * dt * 0.6;
        g.scale.y = 1 + Math.sin(ph * 3) * 0.08;
      } else if (m === 'sockopus') {
        g.userData.arms.forEach((a, i) => (a.rotation.z = Math.sin(ph * 2 + i) * 0.35));
      } else if (m === 'toaster') {
        g.userData.wings.forEach((w, i) => (w.rotation.z = Math.sin(ph * 3) * 0.5 * (i ? 1 : -1)));
        const cyc = (ph * 0.4) % 3;
        g.userData.toasts.forEach((tt) => {
          const b = tt.userData.base;
          if (cyc < 1.2) tt.position.y = b.y + Math.min(1, cyc * 3) * 0.9 + Math.max(0, cyc - 0.4) * 2.5;
          else tt.position.y = b.y;
          tt.visible = cyc < 1.2;
        });
      } else if (m === 'grumpus') {
        g.userData.tail.rotation.y = Math.sin(ph * 3) * 0.3;
      } else if (m === 'duckangler') {
        g.userData.duck.rotation.z = Math.sin(ph * 2) * 0.3;
      } else if (m === 'spaghetti') {
        g.userData.strands.forEach((s, i) => (s.rotation.y = Math.sin(ph * 0.8 + i) * 0.25));
      } else if (m === 'sheep') {
        g.position.y = this.world.heightAt(g.position.x, g.position.z) + 0.6 + Math.sin(ph * 1.2) * 0.4;
      } else if (m === 'pancake') {
        const puff = clamp(1 - (dist - 6) / 10, 0, 1);
        g.scale.y = 1 + puff * 2.2;
        g.scale.x = g.scale.z = 1 + puff * 0.2;
      }

      if (it.label) it.label.visible = dist < 55;
      if (it.speech) it.speech.visible = light.on && dist < light.range && dist < 30;
    }
  }

  // Nearest photographable item in front of the sub.
  findPhotoTarget(sub, light) {
    const fwd = sub.forward();
    let best = null;
    let bestScore = Infinity;
    for (const it of this.items) {
      if (it.collected || it.def.collect) continue;
      const p = it.group.position;
      const to = p.clone().sub(sub.pos);
      const d = to.length();
      const maxD = ['whale', 'humpback', 'whaleshark', 'spermwhale'].includes(it.def.model) ? 45 : 30;
      if (d > maxD) continue;
      const flat = new THREE.Vector3(to.x, to.y * 0.6, to.z).normalize();
      const ang = Math.acos(clamp(flat.dot(fwd), -1, 1));
      if (ang > 0.75 && d > it.radius + 3) continue;
      const vis = this.visibility(it, light, sub.pos);
      if (!vis.visible) continue;
      const score = d + ang * 20;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  // Nearest collectible in reach.
  findGrabTarget(sub) {
    let best = null;
    let bestD = 9;
    for (const it of this.items) {
      if (it.collected || !it.def.collect) continue;
      const d = it.group.position.distanceTo(sub.pos);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  byId(id) {
    return this.items.find((i) => i.id === id);
  }
}

// For the intro aquarium: build any model by name and animate it.
export function buildModel(name) {
  return BUILD[name]();
}
export { animUpper };
