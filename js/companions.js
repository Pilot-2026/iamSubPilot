// Company for the fable creatures in their hidden halls (Captain Bushybeard has his own crew and Perla in
// fables.js): in every other hall a swarm of little creatures that belong to the legend – swim through them to
// collect them, they jump for joy – and a second figure flying around, about as big as Princess Perla, with its
// own meaning for the legend. All original designs.

import * as THREE from './vendor/three.min.js';
import { buildMerFigure, animMer } from './merfolk.js';

const PI = Math.PI, TAU = Math.PI * 2;

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.1, ...o });
const shiny = (c, k = 0.3, o = {}) => std(c, { emissive: c, emissiveIntensity: k, ...o });
const glow = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
function add(parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  m.rotation.set(...r);
  if (Array.isArray(s)) m.scale.set(...s);
  else m.scale.setScalar(s);
  parent.add(m);
  return m;
}
function grp(parent, p = [0, 0, 0], r = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...p);
  g.rotation.set(...r);
  parent.add(g);
  return g;
}
let dotT = null;
function dot() {
  if (dotT) return dotT;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return (dotT = new THREE.CanvasTexture(c));
}
function halo(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}
const T4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
// several parts, each painted one colour (or by a function), merged into one geometry for instancing
function merge(parts) {
  let n = 0;
  const geos = parts.map(([geo, hex, m]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.set(typeof hex === 'function' ? hex(p.getX(i), p.getY(i), p.getZ(i)) : hex);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    n += p.count;
    return g;
  });
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(n * 3);
    let o = 0;
    for (const g of geos) {
      arr.set(g.attributes[name].array, o * 3);
      o += g.attributes.position.count;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
const S = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const eyes = (y, z, sep, r = 0.2) => [
  [S(r), 0xffffff, T4(-sep, y, z)],
  [S(r), 0xffffff, T4(sep, y, z)],
  [S(r * 0.5), 0x1a1210, T4(-sep, y, z + r * 0.75)],
  [S(r * 0.5), 0x1a1210, T4(sep, y, z + r * 0.75)],
  [S(r * 0.16, 6, 4), 0xffffff, T4(-sep + r * 0.2, y + r * 0.25, z + r * 1.05)],
  [S(r * 0.16, 6, 4), 0xffffff, T4(sep + r * 0.2, y + r * 0.25, z + r * 1.05)],
];
const smile = (y, z, r = 0.18, c = 0x7a1a2a) => [new THREE.TorusGeometry(r, r * 0.22, 6, 12, PI), c, T4(0, y, z, -0.2, 0, PI)];

// ---------------------------------------------------------------- the little creatures (one geometry each)
const SWARMS = {
  // Bakunawa: little moon dragons, each carrying a glowing moon pearl
  java: {
    name: { en: 'Dragonlets', de: 'Drachlinge' }, icon: '🐉', mode: 'float',
    geo: () => merge([
      [S(0.55, 16, 12), 0x3a7adf, T4(0, 0.9, 0, 0, 0, 0, 0.8, 0.75, 1.4)],
      [new THREE.ConeGeometry(0.3, 1.2, 10), 0x3a7adf, T4(0, 0.9, -1.1, -PI / 2, 0, 0)],
      [S(0.45, 16, 12), 0x5a9aff, T4(0, 1.25, 0.75)],
      [new THREE.ConeGeometry(0.07, 0.35, 6), 0xffe9a0, T4(-0.2, 1.65, 0.65, -0.4, 0, 0.3)],
      [new THREE.ConeGeometry(0.07, 0.35, 6), 0xffe9a0, T4(0.2, 1.65, 0.65, -0.4, 0, -0.3)],
      ...eyes(1.32, 1.05, 0.17, 0.13),
      [S(0.24, 14, 10), 0xfff6c8, T4(0, 0.95, 1.4)], // the moon pearl
      [new THREE.ConeGeometry(0.25, 0.5, 4), 0x9ad0ff, T4(-0.5, 1.15, -0.1, 0, 0, 1.2, 1, 1, 0.4)],
      [new THREE.ConeGeometry(0.25, 0.5, 4), 0x9ad0ff, T4(0.5, 1.15, -0.1, 0, 0, -1.2, 1, 1, 0.4)],
    ]),
  },
  // Kraken: little ice krakens with wiggly arms
  puertorico: {
    name: { en: 'Krakenlings', de: 'Kräkchen' }, icon: '🦑', mode: 'bob',
    geo: () => {
      const parts = [
        [new THREE.ConeGeometry(0.55, 1.3, 14), 0xbfe6ff, T4(0, 1.65, 0)],
        [S(0.6, 16, 12), 0xd8f0ff, T4(0, 0.95, 0, 0, 0, 0, 1, 0.9, 1)],
        ...eyes(1.0, 0.5, 0.22, 0.17),
        smile(0.72, 0.55, 0.12, 0x5a3a8a),
      ];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        parts.push([new THREE.ConeGeometry(0.12, 0.9, 6), k % 2 ? 0x9ad8ff : 0xc8a8ff, T4(Math.sin(a) * 0.35, 0.3, Math.cos(a) * 0.35, PI + Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4)]);
      }
      return merge(parts);
    },
  },
  // Captain Eight-Arms: little octopus pirates with bandanas
  izu: {
    name: { en: 'Octopirates', de: 'Oktopiraten' }, icon: '🐙', mode: 'hop',
    geo: () => {
      const parts = [
        [S(0.75, 18, 14), 0xff7a3a, T4(0, 1.25, 0, 0, 0, 0, 1, 1.1, 1)],
        [S(0.78, 18, 8), (x, y, z) => (Math.sin(Math.atan2(z, x) * 10) > 0.6 ? 0xffffff : 0x2a3ad8), T4(0, 1.45, -0.03, -0.25, 0, 0, 1, 0.6, 1)],
        ...eyes(1.25, 0.62, 0.25, 0.18),
        smile(0.95, 0.7, 0.14),
      ];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        parts.push([new THREE.CapsuleGeometry(0.11, 0.55, 4, 8), 0xff8a4a, T4(Math.sin(a) * 0.5, 0.35, Math.cos(a) * 0.5, Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7)]);
      }
      return merge(parts);
    },
  },
  // Umibōzu: little round "sea monks" with glowing eyes
  kuril: {
    name: { en: 'Little monks', de: 'Mönchlein' }, icon: '🫧', mode: 'float',
    geo: () => merge([
      [S(0.7, 18, 14), 0x2a2a4a, T4(0, 1.45, 0)],
      [new THREE.ConeGeometry(0.7, 1.1, 18, 1, true), 0x2a2a4a, T4(0, 0.55, 0, PI, 0, 0)],
      [S(0.18, 12, 10), 0xfff27a, T4(-0.25, 1.5, 0.58)],
      [S(0.18, 12, 10), 0xfff27a, T4(0.25, 1.5, 0.58)],
      [S(0.08, 8, 6), 0x1a1210, T4(-0.25, 1.5, 0.74)],
      [S(0.08, 8, 6), 0x1a1210, T4(0.25, 1.5, 0.74)],
      smile(1.2, 0.62, 0.14, 0xff9ab0),
    ]),
  },
  // Flying Dutchman: little ghost sailors with caps
  tonga: {
    name: { en: 'Ghostlings', de: 'Geisterlein' }, icon: '👻', mode: 'float',
    geo: () => merge([
      [S(0.65, 18, 14), 0xeef6ff, T4(0, 1.45, 0)],
      [new THREE.CylinderGeometry(0.65, 0.8, 1.1, 18, 1, true), 0xeef6ff, T4(0, 0.85, 0)],
      [S(0.18, 10, 8), 0xeef6ff, T4(-0.55, 0.3, 0.2)],
      [S(0.18, 10, 8), 0xeef6ff, T4(0.55, 0.3, 0.2)],
      [S(0.18, 10, 8), 0xeef6ff, T4(0, 0.3, 0.6)],
      [new THREE.CylinderGeometry(0.5, 0.55, 0.25, 16), (x, y) => (y > 0.05 ? 0xffffff : 0x2a4ad8), T4(0, 2.08, 0)],
      [new THREE.CylinderGeometry(0.58, 0.58, 0.06, 16), 0x1a2a6a, T4(0, 1.95, 0.08)],
      [S(0.16, 10, 8), 0x1a1a2a, T4(-0.22, 1.5, 0.56)],
      [S(0.16, 10, 8), 0x1a1a2a, T4(0.22, 1.5, 0.56)],
      [S(0.1, 8, 6), 0x1a1a2a, T4(0, 1.15, 0.6, 0, 0, 0, 1, 1.3, 0.6)],
    ]),
  },
  // Leviathan: baby leviathans – little whale-dragons with spikes
  mariana: {
    name: { en: 'Leviathanlings', de: 'Leviathänchen' }, icon: '🐋', mode: 'swim',
    geo: () => {
      const parts = [
        [S(0.6, 16, 12), 0x3a5adf, T4(0, 0.9, 0.2, 0, 0, 0, 0.9, 0.8, 1.6)],
        [S(0.5, 14, 10), (x, y) => (y < 0.85 ? 0xbfe0ff : 0x3a5adf), T4(0, 0.8, 0.25, 0, 0, 0, 0.8, 0.6, 1.5)],
        [new THREE.ConeGeometry(0.35, 1.2, 10), 0x3a5adf, T4(0, 0.95, -1.15, -PI / 2, 0, 0)],
        [new THREE.ConeGeometry(0.4, 0.5, 3), 0x2a3aaf, T4(0, 0.95, -1.8, 0, 0, PI / 2, 1, 1, 0.3)],
        ...eyes(1.1, 1.05, 0.25, 0.14),
        [new THREE.ConeGeometry(0.3, 0.6, 3), 0x9ad8ff, T4(-0.55, 0.75, 0.3, 0, 0, 1.4, 1, 1, 0.3)],
        [new THREE.ConeGeometry(0.3, 0.6, 3), 0x9ad8ff, T4(0.55, 0.75, 0.3, 0, 0, -1.4, 1, 1, 0.3)],
      ];
      for (let k = 0; k < 4; k++) parts.push([new THREE.ConeGeometry(0.1, 0.35, 5), 0xffd27a, T4(0, 1.4 - k * 0.05, 0.6 - k * 0.45)]);
      return merge(parts);
    },
  },
};

// ---------------------------------------------------------------- the flying figures
function moonFlyer() {
  const G = new THREE.Group();
  const moonM = shiny(0xfff0a0, 0.75, { roughness: 0.4 });
  const moon = add(G, new THREE.TorusGeometry(1.1, 0.48, 18, 40, PI * 1.25), moonM, [0, 2, 0], [0, 0, -PI * 0.12]);
  const face = grp(G, [0.55, 1.95, 0.25]);
  for (const sy of [0.3, -0.1]) add(face, S(0.09), glow(0x3a2a10), [sy === 0.3 ? -0.05 : 0.05, sy, 0.22]);
  add(face, new THREE.TorusGeometry(0.12, 0.03, 6, 12, PI), glow(0xd05a6a), [0.1, -0.3, 0.2], [0, 0, PI * 0.8]);
  add(face, S(0.1), glow(0xff9ab8, { transparent: true, opacity: 0.6 }), [0.15, -0.05, 0.25]);
  // a nightcap with a pompom and little stars around it
  const cap = grp(G, [-0.65, 3.1, 0], [0, 0, 0.5]);
  add(cap, new THREE.ConeGeometry(0.4, 1.0, 14), std(0x5a6aff), [0, 0.5, 0], [0, 0, -0.4]);
  add(cap, S(0.15), std(0xffffff), [0.38, 0.9, 0]);
  const stars = [];
  for (let k = 0; k < 5; k++) {
    const st = add(G, new THREE.OctahedronGeometry(0.16, 0), glow(0xfff6c8), [0, 2, 0]);
    stars.push(st);
  }
  const h = halo(0xfff2a0, 4.5);
  h.position.set(0, 2, 0);
  G.add(h);
  return {
    group: G,
    update(t) {
      moon.rotation.z = -PI * 0.12 + Math.sin(t * 0.9) * 0.15;
      face.position.y = 1.95 + Math.sin(t * 0.9) * 0.1;
      stars.forEach((s, k) => {
        const a = t * 0.8 + (k / 5) * TAU;
        s.position.set(Math.cos(a) * 2, 2 + Math.sin(a * 1.3) * 0.6, Math.sin(a) * 2);
        s.rotation.y = t * 3;
      });
    },
  };
}
function havfrueFlyer() {
  const P = { skin: 0xf6dcc8, hair: [0xfff2c0, 0xffe39a, 0xd8f0ff], top: 0x8ad8ff, pearl: 0xffffff, tail: [0x9af0ff, 0x6ad0ff, 0x4a9aff, 0x8a7aff], fin: 0xd8f6ff, iris: 0x3a8adf, gold: 0xe8f4ff, gem: 0x9ff3ff };
  const m = buildMerFigure(P, { happy: true });
  const G = new THREE.Group();
  m.group.rotation.set(PI / 2, PI, 0); // upright, facing forward
  G.add(m.group);
  let tt = 0;
  return {
    group: G,
    update(t, dt = 0.016) {
      tt += dt;
      animMer(m.rig, t, dt, 4, { wave: Math.sin(t * 0.4) > 0.6 });
    },
  };
}
function parrotFlyer() {
  const G = new THREE.Group();
  const red = shiny(0xe8302a, 0.25), green = shiny(0x2ab84a, 0.25), blue = shiny(0x2a6ae8, 0.25), yel = shiny(0xffd23a, 0.3);
  const body = grp(G, [0, 1.6, 0]);
  add(body, S(0.6, 18, 14), red, [0, 0, 0], [0, 0, 0], [0.85, 1.15, 0.9]);
  add(body, S(0.42, 16, 12), yel, [0, -0.15, 0.32], [0, 0, 0], [0.7, 0.9, 0.5]);
  const head = grp(body, [0, 0.85, 0.1]);
  add(head, S(0.42, 16, 12), red);
  add(head, new THREE.ConeGeometry(0.16, 0.4, 10), std(0xf0e0b0), [0, -0.05, 0.42], [PI / 2 + 0.6, 0, 0]);
  for (const sx of [-1, 1]) {
    add(head, S(0.12), std(0xffffff), [sx * 0.22, 0.1, 0.32]);
    add(head, S(0.06), glow(0x101010), [sx * 0.24, 0.1, 0.42]);
  }
  // a tiny pirate hat
  add(head, new THREE.CylinderGeometry(0.5, 0.5, 0.06, 3), std(0x1a1414), [0, 0.38, 0], [0, PI / 6, 0]);
  add(head, new THREE.CylinderGeometry(0.22, 0.28, 0.25, 14), std(0x1a1414), [0, 0.5, 0]);
  add(head, S(0.06), std(0xffffff), [0, 0.5, 0.27]);
  const wings = [-1, 1].map((sx) => {
    const w = grp(body, [sx * 0.45, 0.2, -0.05]);
    for (const [k, mat] of [[0, red], [1, blue], [2, green]]) add(w, S(0.5, 12, 8), mat, [sx * (0.45 + k * 0.3), -k * 0.12, -k * 0.05], [0, 0, 0], [0.9, 0.18, 0.5]);
    w.userData.sx = sx;
    return w;
  });
  for (const [k, mat] of [[-0.15, blue], [0, red], [0.15, green]]) add(body, new THREE.BoxGeometry(0.16, 1.3, 0.05), mat, [k, -1.05, -0.35], [0.5, 0, k * 1.5]);
  return {
    group: G,
    update(t) {
      wings.forEach((w) => (w.rotation.z = w.userData.sx * Math.sin(t * 12) * 0.7));
      head.rotation.y = Math.sin(t * 1.3) * 0.5;
      body.rotation.x = Math.sin(t * 2) * 0.08;
    },
  };
}
function lanternFlyer() {
  const G = new THREE.Group();
  const paper = std(0xfff0d8, { emissive: 0xffa040, emissiveIntensity: 0.55, roughness: 0.7, side: THREE.DoubleSide });
  const redP = std(0xe8402a, { emissive: 0xff5a2a, emissiveIntensity: 0.4 });
  const body = grp(G, [0, 1.8, 0]);
  add(body, new THREE.SphereGeometry(1, 24, 18), paper, [0, 0, 0], [0, 0, 0], [0.85, 1.15, 0.85]);
  for (let k = -3; k <= 3; k++) add(body, new THREE.TorusGeometry(0.85 * Math.sqrt(1 - (k / 3.6) ** 2), 0.025, 4, 30), std(0x8a5a2a), [0, (k / 3.6) * 1.15, 0], [PI / 2, 0, 0]);
  add(body, new THREE.CylinderGeometry(0.42, 0.5, 0.25, 18), std(0x1a1414), [0, 1.2, 0]);
  add(body, new THREE.CylinderGeometry(0.5, 0.42, 0.25, 18), std(0x1a1414), [0, -1.2, 0]);
  add(body, new THREE.TorusGeometry(0.2, 0.04, 6, 14), std(0x1a1414), [0, 1.45, 0]);
  // one big eye, a wide mouth with a tongue (a friendly lantern spirit)
  const eyeG = grp(body, [0, 0.3, 0.8]);
  add(eyeG, S(0.3), std(0xffffff), [0, 0, 0], [0, 0, 0], [1, 1, 0.5]);
  add(eyeG, S(0.15), glow(0x1a1210), [0, 0, 0.12]);
  add(eyeG, S(0.05), glow(0xffffff), [0.05, 0.05, 0.2]);
  add(body, new THREE.TorusGeometry(0.32, 0.07, 6, 16, PI), redP, [0, -0.3, 0.78], [0.2, 0, PI]);
  const tongue = add(body, S(0.18), shiny(0xff6a8a, 0.4), [0, -0.62, 0.8], [0, 0, 0], [1, 1.6, 0.5]);
  const h = halo(0xffb860, 4.5);
  body.add(h);
  return {
    group: G,
    update(t) {
      body.rotation.z = Math.sin(t * 1.4) * 0.15;
      tongue.position.y = -0.62 - Math.abs(Math.sin(t * 3)) * 0.15;
      eyeG.scale.y = Math.abs(Math.sin(t * 0.5)) < 0.06 ? 0.15 : 1;
    },
  };
}
function ghostCaptainFlyer() {
  const G = new THREE.Group();
  const ghost = new THREE.MeshStandardMaterial({ color: 0xbff0ff, emissive: 0x6ad8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.75, roughness: 0.4, depthWrite: false });
  const body = grp(G, [0, 0, 0]);
  add(body, new THREE.LatheGeometry([[0, 0], [0.2, 0.1], [0.75, 0.6], [0.9, 1.4], [0.75, 2.2], [0.45, 2.6], [0, 2.65]].map(([a, b]) => new THREE.Vector2(a, b)), 24), ghost);
  const head = grp(body, [0, 3.05, 0]);
  add(head, S(0.48, 18, 14), ghost);
  for (const sx of [-1, 1]) add(head, S(0.1), glow(0x0a2a4a), [sx * 0.17, 0.05, 0.42]);
  add(head, S(0.3, 12, 10), ghost, [0, -0.35, 0.25], [0, 0, 0], [1, 1.3, 0.7]);
  add(head, new THREE.CylinderGeometry(1.0, 1.0, 0.08, 3), std(0x2a3a4a, { transparent: true, opacity: 0.85 }), [0, 0.42, 0], [0, PI / 6, 0]);
  add(head, new THREE.CylinderGeometry(0.4, 0.48, 0.42, 16), std(0x2a3a4a, { transparent: true, opacity: 0.85 }), [0, 0.62, 0]);
  const arm = grp(body, [0.7, 2.2, 0.1]);
  add(arm, new THREE.CapsuleGeometry(0.13, 0.8, 4, 8), ghost, [0, -0.45, 0]);
  const lantern = grp(arm, [0, -1.05, 0]);
  add(lantern, new THREE.BoxGeometry(0.4, 0.5, 0.4), std(0x3a3020), [0, -0.25, 0]);
  add(lantern, S(0.17), glow(0x9affd8), [0, -0.25, 0]);
  const h = halo(0x7affd8, 2.6);
  h.position.set(0, -0.25, 0);
  lantern.add(h);
  return {
    group: G,
    update(t) {
      body.rotation.z = Math.sin(t * 1.1) * 0.1;
      arm.rotation.z = 0.5 + Math.sin(t * 1.7) * 0.2;
      lantern.rotation.z = -0.5 - Math.sin(t * 1.7) * 0.2;
      ghost.opacity = 0.62 + 0.15 * Math.sin(t * 2.3);
    },
  };
}
function zizFlyer() {
  const G = new THREE.Group();
  const gold = shiny(0xffc23a, 0.35, { metalness: 0.4, roughness: 0.35 }), purple = shiny(0x8a4aff, 0.35), white = std(0xfff6e8);
  const body = grp(G, [0, 1.8, 0]);
  add(body, S(0.7, 18, 14), purple, [0, 0, 0], [0, 0, 0], [0.8, 0.8, 1.4]);
  const head = grp(body, [0, 0.5, 0.95]);
  add(head, S(0.42, 16, 12), purple);
  add(head, new THREE.ConeGeometry(0.15, 0.5, 8), gold, [0, -0.05, 0.45], [PI / 2, 0, 0]);
  for (const sx of [-1, 1]) {
    add(head, S(0.11), white, [sx * 0.2, 0.12, 0.3]);
    add(head, S(0.06), glow(0x101010), [sx * 0.21, 0.12, 0.39]);
  }
  for (let k = 0; k < 4; k++) add(head, new THREE.ConeGeometry(0.06, 0.5, 6), gold, [0, 0.4, -0.1 - k * 0.12], [-0.6 - k * 0.2, 0, 0]);
  const wings = [-1, 1].map((sx) => {
    const w = grp(body, [sx * 0.5, 0.25, 0]);
    for (let k = 0; k < 6; k++) add(w, new THREE.BoxGeometry(1.6, 0.06, 0.38), k % 2 ? gold : purple, [sx * (0.8 + k * 0.05), 0, 0.45 - k * 0.2], [0, sx * (0.15 - k * 0.12), 0], [1 + k * 0.08, 1, 1]);
    w.userData.sx = sx;
    return w;
  });
  for (let k = 0; k < 5; k++) add(body, new THREE.BoxGeometry(0.16, 0.05, 1.8), k % 2 ? gold : purple, [(k - 2) * 0.14, -0.1, -1.6], [0.15, (k - 2) * 0.15, 0]);
  return {
    group: G,
    update(t) {
      wings.forEach((w) => (w.rotation.z = w.userData.sx * Math.sin(t * 6) * 0.6));
      head.rotation.y = Math.sin(t * 0.9) * 0.4;
    },
  };
}

export const FLYERS = {
  java: {
    build: moonFlyer,
    name: { en: 'The Moon', de: 'Der Mond' },
    info: {
      en: 'The Moon from the legend: the Bakunawa swallowed it, and people banged pots and pans until the serpent spat it out again. Here it shines safely in the hall.',
      de: 'Der Mond aus der Sage: Die Bakunawa hatte ihn verschluckt, und die Menschen trommelten auf Töpfe und Pfannen, bis die Seeschlange ihn wieder ausspuckte. Hier leuchtet er sicher in der Halle.',
    },
  },
  puertorico: {
    build: havfrueFlyer,
    name: { en: 'Havfrue the sea maiden', de: 'Havfrue, die Meerjungfrau' },
    info: {
      en: 'Our Havfrue is a mermaid like those of the old Nordic sailors’ tales – the same tales the Kraken comes from. She keeps the Ice Kraken company.',
      de: 'Unsere Havfrue ist eine Meerjungfrau wie aus den alten nordischen Seemannsgeschichten – denselben, aus denen der Kraken stammt. Sie leistet dem Eis-Kraken Gesellschaft.',
    },
  },
  izu: {
    build: parrotFlyer,
    name: { en: 'Polly the pirate parrot', de: 'Papagei Polly' },
    info: {
      en: 'Every pirate captain needs a parrot! Polly keeps watch for Captain Eight-Arms and squawks when a ship comes near.',
      de: 'Jeder Piratenkapitän braucht einen Papagei! Polly hält für Kapitän Achtarm Ausschau und krächzt, wenn ein Schiff kommt.',
    },
  },
  kuril: {
    build: lanternFlyer,
    name: { en: 'The lantern spirit', de: 'Der Laternengeist' },
    info: {
      en: 'A friendly lantern spirit, like the paper-lantern yōkai of Japanese folklore. In our story it lights the way home for sailors who meet Umibōzu.',
      de: 'Ein freundlicher Laternengeist, wie die Papierlaternen-Yōkai aus japanischen Sagen. In unserer Geschichte leuchtet er Seeleuten, die Umibōzu begegnen, den Heimweg.',
    },
  },
  tonga: {
    build: ghostCaptainFlyer,
    name: { en: 'Captain Van der Decken', de: 'Kapitän Van der Decken' },
    info: {
      en: 'The ghostly captain: in some versions of the legend the captain of the Flying Dutchman is called Van der Decken – cursed to sail forever.',
      de: 'Der Geisterkapitän: In manchen Fassungen der Sage heißt der Kapitän des Fliegenden Holländers Van der Decken – verflucht, ewig zu segeln.',
    },
    source: ['Britannica: Flying Dutchman', 'https://www.britannica.com/topic/Flying-Dutchman'],
  },
  mariana: {
    build: zizFlyer,
    name: { en: 'Ziz, the giant bird', de: 'Ziz, der Riesenvogel' },
    info: {
      en: 'In Jewish legend the Ziz is the giant bird of the sky – just as Leviathan is the great monster of the sea.',
      de: 'In jüdischen Legenden ist der Ziz der Riesenvogel des Himmels – so wie der Leviathan das große Ungeheuer des Meeres ist.',
    },
    source: ['Wikipedia: Ziz', 'https://en.wikipedia.org/wiki/Ziz'],
  },
};
export const swarmInfo = (id) => SWARMS[id];

// a flyer scaled to a given height
export function buildFlyer(id, height) {
  const F = FLYERS[id];
  if (!F) return null;
  const f = F.build();
  f.update(0.5, 0.016);
  f.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(f.group), h = box.getSize(new THREE.Vector3()).y || 1;
  const wrap = new THREE.Group();
  f.group.position.y -= box.min.y;
  wrap.add(f.group);
  wrap.scale.setScalar(height / h);
  return { group: wrap, update: f.update };
}

// for the turntables on the results screen (about 6 units big)
export function buildCompanionModel(key) {
  const [kind, id] = key.split(':');
  if (kind === 'flyer') return buildFlyer(id, 6).group;
  const sw = SWARMS[id];
  const geo = sw.geo();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, emissive: 0x202020, emissiveIntensity: 0.3 }));
  m.scale.setScalar(6 / 2.2);
  return m;
}

// in the hall: the swarm (collect them by swimming through) and the flyer
export function companionExtras(id, { R, dais, subLen }) {
  const sw = SWARMS[id], fl = FLYERS[id];
  if (!sw) return null;
  const g = new THREE.Group();
  const N = 60, geo = sw.geo();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05, emissive: 0x303030, emissiveIntensity: 0.45 });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  g.add(mesh);
  const rnd = Math.random, crew = [];
  const s0 = (subLen * 0.36) / 2.1;
  for (let i = 0; i < N; i++) {
    const a = rnd() * TAU, d = dais + 2.5 + rnd() * Math.max(2, R - dais - 8);
    crew.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, a, d, y0: sw.mode === 'hop' ? 0 : 1.5 + rnd() * 9, ph: rnd() * TAU, sp: (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.1), s: s0 * (0.85 + rnd() * 0.35), yaw: rnd() * TAU });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), p3 = new THREE.Vector3(), s3 = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let caught = 0;
  // the flyer: about as big as Princess Perla, flying a wide figure of eight
  let fly = null;
  if (fl) {
    fly = buildFlyer(id, subLen * 1.7);
    g.add(fly.group);
  }
  const prev = new THREE.Vector3();
  const ex = {
    group: g,
    total: N,
    icon: sw.icon,
    name: sw.name,
    onCatch: null,
    update(t, dt, sub, catchR = 0) {
      crew.forEach((c, i) => {
        if (c.gone) return;
        let y = c.y0, rx = 0, rz = 0, sc = 1;
        if (sw.mode === 'swim') {
          c.a += c.sp * dt * 2;
          c.x = Math.cos(c.a) * c.d;
          c.z = Math.sin(c.a) * c.d;
          c.yaw = Math.atan2(-Math.sin(c.a) * Math.sign(c.sp), Math.cos(c.a) * Math.sign(c.sp));
          y += Math.sin(t * 1.2 + c.ph) * 0.8;
          rz = Math.sin(t * 2 + c.ph) * 0.2;
        } else if (sw.mode === 'hop') {
          const ph = (t * 1.6 + c.ph) % 1;
          y = 4 * ph * (1 - ph) * c.s * 2;
          c.yaw += Math.sin(t * 0.5 + c.ph) * dt;
        } else {
          y += Math.sin(t * (sw.mode === 'bob' ? 2.2 : 1.3) + c.ph) * (sw.mode === 'bob' ? 0.9 : 0.6);
          c.yaw += dt * 0.3 * Math.sign(c.sp);
          if (sw.mode === 'bob') sc = 1 + Math.sin(t * 4.4 + c.ph) * 0.08;
        }
        if (!c.caught && catchR > 0 && Math.hypot(sub.x - c.x, sub.z - c.z) < catchR + c.s * 1.2 && Math.abs(sub.y - (y + c.s)) < catchR + c.s * 2.4) {
          c.caught = true;
          c.k = 0;
          caught++;
          if (ex.onCatch) ex.onCatch(caught, N, new THREE.Vector3(c.x, y + c.s, c.z));
        }
        if (c.caught) {
          // a happy jump with a double spin, then it pops away into the sub
          c.k += dt / 1.4;
          const k = c.k;
          y += 4 * k * (1 - k) * c.s * 7;
          c.yaw += dt * 14;
          rx = -Math.min(1, k * 1.2) * TAU;
          sc = k > 0.82 ? Math.max(0.01, (1 - k) / 0.18) : 1 + Math.sin(k * PI) * 0.3;
          if (k >= 1) {
            c.gone = true;
            mesh.setMatrixAt(i, ZERO);
            return;
          }
        }
        p3.set(c.x, y + 0.2, c.z);
        e.set(rx, c.yaw, rz);
        q.setFromEuler(e);
        mesh.setMatrixAt(i, m4.compose(p3, q, s3.setScalar(c.s * sc)));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (fly) {
        const u = t * 0.14 + 2.1, rr = R * 0.5;
        prev.copy(fly.group.position);
        fly.group.position.set(Math.sin(u) * rr, R * 0.28 + Math.sin(u * 1.5) * R * 0.1, Math.sin(2 * u) * rr * 0.6);
        const v = fly.group.position.clone().sub(prev);
        if (v.lengthSq() > 1e-6) fly.group.rotation.y = Math.atan2(v.x, v.z);
        fly.update(t, dt);
      }
    },
  };
  return ex;
}
