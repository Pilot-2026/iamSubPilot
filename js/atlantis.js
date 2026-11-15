// Atlantis – a secret fantasy city that rises from the seafloor once every mission of a dive is done.
// The look: an underwater metropolis of pale stone and gold – glass domes with golden ribs, Gothic towers with warm
// arched windows and turquoise ornament bands, a spiral tower, a glowing crystal tower, transparent tube walkways
// with gold rings and travelling pods, arcaded aqueducts with lamps, a mosaic plaza with columns and statues,
// glowing coral gardens and kelp, light shafts from the surface, whales, mantas, dolphins and fish schools
// overhead and sleek vehicles with headlights. Every trench has its own version (THEMES: colours, centrepiece,
// buildings), and the seed shuffles the layout of every dive.
// The legend itself comes from Plato (Timaeus, Critias) – the intro text in the game tells it, with sources.
// Neptune (Poseidon's Roman name) and a mermaid live here. They never appear anywhere else (kept secret).

import * as THREE from './vendor/three.min.js';
import { axisZ } from './world.js';
import { buildMerFigure, animMer, MER_PALETTES, buildNeptune, animNeptune, softDot } from './merfolk.js';
import { buildModel, animUpper } from './creatures.js';
import { fishGeometry, fishMaterial } from './schools.js';
import { buildFable } from './fables.js';

// the hidden hall inside the big building grows with its creature (bigger inside than outside – it's magic)

const R = 72; // radius of the city (units, 1 unit = 10 m)
const PI = Math.PI, TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- one Atlantis per trench
// stone/stone2/window/trim are canvas colours, the rest three.js colours. inner/outer = building mix.
export const THEMES = {
  java: {
    name: { en: 'Coral Palace', de: 'Korallenpalast' },
    centre: 'grandDome', towerTop: ['spire', 'spire', 'dome'],
    stone: '#ebe3d1', stone2: '#a9a291', window: '#ffc35e', trim: '#21aaa6', metal: 0xe9b546, glass: 0x8fe8ff, glow: 0x5ff3ff,
    water: 0x1478a6, kelp: [0x0d3a2a, 0x3fae6a], corals: [0xff4fa8, 0x38f0d0, 0xb06aff, 0xffa040, 0x46ff8a, 0xffe14a],
    inner: ['dome', 'tower', 'dome', 'spiral', 'tower'], outer: ['tower', 'dome', 'tower', 'terrace', 'tower', 'dome', 'tower', 'spiral'],
    aqueducts: 1, tubes: 6,
  },
  mariana: {
    name: { en: 'Crystal Citadel', de: 'Kristallzitadelle' },
    centre: 'crystalTower', towerTop: ['dome', 'dome', 'spire'],
    stone: '#c7d0d4', stone2: '#76838b', window: '#ffd47e', trim: '#1b9fb4', metal: 0xc9a456, glass: 0x7fdcff, glow: 0x4ff0ff,
    water: 0x0d5a94, kelp: [0x0a2e2a, 0x2f8f6a], corals: [0x38f0ff, 0x7a6aff, 0xff5ab4, 0x46ffb0, 0xffb040],
    inner: ['dome', 'terrace', 'dome', 'tower', 'dome'], outer: ['tower', 'dome', 'terrace', 'tower', 'dome', 'tower', 'terrace', 'tower'],
    aqueducts: 2, tubes: 5,
  },
  puertorico: {
    name: { en: 'Golden Spiral', de: 'Goldene Spirale' },
    centre: 'spiral', towerTop: ['dome', 'spire'],
    stone: '#f1ddb6', stone2: '#b89c6c', window: '#ffb04a', trim: '#22bfbb', metal: 0xf2b230, glass: 0xa8f0ff, glow: 0xffd860,
    water: 0x168aa2, kelp: [0x1a3a1a, 0x7ac04a], corals: [0xff7040, 0xffd040, 0x40f0e0, 0xff50a0, 0x9a70ff],
    inner: ['tower', 'dome', 'tower', 'dome', 'terrace'], outer: ['dome', 'tower', 'terrace', 'tower', 'spiral', 'dome', 'tower', 'dome'],
    aqueducts: 2, tubes: 5,
  },
  southsandwich: {
    name: { en: 'Ice Crystal City', de: 'Eiskristallstadt' },
    centre: 'crystals', towerTop: ['spire', 'crown'],
    stone: '#eef3f8', stone2: '#a9b9c9', window: '#bfe6ff', trim: '#5aa8f0', metal: 0xdbe6f2, glass: 0xd0f4ff, glow: 0x9ff0ff,
    water: 0x2a7ca4, kelp: [0x10303a, 0x5aa8b0], corals: [0x9ff0ff, 0xc8a0ff, 0x70c0ff, 0xffffff, 0x60ffd8],
    inner: ['crystal', 'tower', 'dome', 'crystal', 'tower'], outer: ['tower', 'crystal', 'dome', 'tower', 'crystal', 'tower', 'dome', 'crystal'],
    aqueducts: 1, tubes: 4,
  },
  izu: {
    name: { en: 'Jade Gardens', de: 'Jadegärten' },
    centre: 'ringCitadel', towerTop: ['dome', 'crown'],
    stone: '#e7e3d3', stone2: '#9a9a84', window: '#ffd48a', trim: '#26b878', metal: 0xe2b252, glass: 0xa0ffd8, glow: 0x6affb0,
    water: 0x13727c, kelp: [0x0c3020, 0x50c070], corals: [0x6affb0, 0xff6a9a, 0xffd050, 0x40e0ff, 0xc080ff],
    inner: ['tier', 'terrace', 'dome', 'tier', 'terrace'], outer: ['tier', 'dome', 'terrace', 'tier', 'tower', 'dome', 'tier', 'terrace'],
    aqueducts: 1, tubes: 4, lanterns: true,
  },
  kuril: {
    name: { en: 'Amber Forge', de: 'Bernsteinschmiede' },
    centre: 'twinTowers', towerTop: ['crown', 'spire'],
    stone: '#7c706b', stone2: '#4a4240', window: '#ff9a3a', trim: '#e0602a', metal: 0xd88a4a, glass: 0xffc890, glow: 0xff8a3a,
    water: 0x2c4c7a, kelp: [0x4a3418, 0xd0a050], corals: [0xff8a3a, 0xffd050, 0xff4a4a, 0x40e0ff, 0xffb0e0],
    inner: ['tower', 'dome', 'tower', 'terrace', 'tower'], outer: ['tower', 'terrace', 'dome', 'tower', 'tower', 'dome', 'terrace', 'tower'],
    aqueducts: 2, tubes: 4, vents: true,
  },
  tonga: {
    name: { en: 'Pearl Lagoon', de: 'Perlenlagune' },
    centre: 'domeCluster', towerTop: ['dome', 'dome', 'spire'],
    stone: '#f7ebf1', stone2: '#c6aabb', window: '#ffc6e0', trim: '#a868f8', metal: 0xf2c2a2, glass: 0xe0c8ff, glow: 0xff8ae0,
    water: 0x35619e, kelp: [0x3a3870, 0xb8a0f0], corals: [0xff8ae0, 0xc080ff, 0x70e0ff, 0xffe0f0, 0xffb060],
    inner: ['dome', 'dome', 'spiral', 'dome', 'tower'], outer: ['dome', 'tower', 'dome', 'terrace', 'tower', 'dome', 'tower', 'dome'],
    aqueducts: 1, tubes: 6, pearls: true,
  },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- geometry helpers
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function M4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e).clone(), new THREE.Vector3(sx, sy, sz));
}
const ring = (r, t, seg = 48) => new THREE.TorusGeometry(r, t, 6, seg).rotateX(PI / 2);
function uvs(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}
// vertex colours with a little fake light from above (for unlit, glowing materials)
function paint(geo, hex, bright = 1) {
  const c = new THREE.Color(hex), n = geo.attributes.normal, p = geo.attributes.position;
  geo.computeBoundingBox();
  const y0 = geo.boundingBox.min.y, hy = Math.max(1e-3, geo.boundingBox.max.y - y0);
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = bright * (0.38 + 0.28 * (n.getY(i) * 0.5 + 0.5) + 0.4 * ((p.getY(i) - y0) / hy));
    col[i * 3] = c.r * k;
    col[i * 3 + 1] = c.g * k;
    col[i * 3 + 2] = c.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function attr1(geo, name, fn) {
  const p = geo.attributes.position, a = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) a[i] = fn(p.getX(i), p.getY(i), p.getZ(i));
  geo.setAttribute(name, new THREE.BufferAttribute(a, 1));
  return geo;
}

// Merges every static part into one mesh per material (few draw calls on phones)
class Merger {
  constructor() {
    this.map = new Map();
  }
  add(mat, geo, m) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
  }
  build(parent) {
    const meshes = [];
    for (const [mat, list] of this.map) {
      const names = new Map();
      for (const g of list) for (const n in g.attributes) if (!names.has(n)) names.set(n, g.attributes[n].itemSize);
      if (!mat.vertexColors) names.delete('color');
      let total = 0;
      for (const g of list) total += g.attributes.position.count;
      const out = new THREE.BufferGeometry();
      for (const [n, size] of names) {
        const arr = new Float32Array(total * size);
        if (n === 'color') arr.fill(1);
        let o = 0;
        for (const g of list) {
          const a = g.attributes[n];
          if (a && a.itemSize === size) arr.set(a.array, o * size);
          o += g.attributes.position.count;
        }
        out.setAttribute(n, new THREE.BufferAttribute(arr, size));
      }
      out.computeBoundingSphere();
      list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(out, mat);
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.map.clear();
    return meshes;
  }
}

// ---------------------------------------------------------------- textures (drawn once per dive)
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function shade(hex, k) {
  const c = new THREE.Color(hex);
  if (k > 0) c.lerp(new THREE.Color(1, 1, 1), k);
  else c.multiplyScalar(1 + k);
  return '#' + c.getHexString();
}
const css = (n) => '#' + new THREE.Color(n).getHexString();
function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function archPath(g, cx, top, bottom, hw) {
  const spring = top + hw * 1.9;
  g.beginPath();
  g.moveTo(cx - hw, bottom);
  g.lineTo(cx - hw, spring);
  g.quadraticCurveTo(cx - hw, top + hw * 0.55, cx, top);
  g.quadraticCurveTo(cx + hw, top + hw * 0.55, cx + hw, spring);
  g.lineTo(cx + hw, bottom);
  g.closePath();
}

// facade: 4 bays × 2 floors of pointed-arch windows (warm light, some dark), pilasters, turquoise/gold bands
function facadeTex(T, r) {
  const W = 512, a = canvas(W, W), e = canvas(W, W);
  const g = a.getContext('2d'), h = e.getContext('2d');
  const light = shade(T.stone, 0.18), dark = shade(T.stone2, -0.25), gold = css(T.metal);
  g.fillStyle = T.stone;
  g.fillRect(0, 0, W, W);
  h.fillStyle = '#000';
  h.fillRect(0, 0, W, W);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    g.fillRect(r() * W, r() * W, 2 + r() * 7, 2 + r() * 4);
  }
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < W; y += 22) {
    g.fillRect(0, y, W, 1.5);
    for (let x = ((y / 22) % 2) * 32; x < W; x += 64) g.fillRect(x, y, 1.5, 22);
  }
  for (let fl = 0; fl < 2; fl++) {
    for (let b = 0; b < 4; b++) {
      const x0 = b * 128, y0 = fl * 256, cx = x0 + 64;
      // pilasters with golden capitals between the bays
      g.fillStyle = light;
      g.fillRect(x0, y0, 9, 226);
      g.fillRect(x0 + 119, y0, 9, 226);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(x0 + 9, y0, 2, 226);
      g.fillRect(x0 + 117, y0, 2, 226);
      g.fillStyle = gold;
      g.fillRect(x0, y0 + 8, 9, 7);
      g.fillRect(x0 + 119, y0 + 8, 9, 7);
      // ornament band at the foot of every floor
      g.fillStyle = T.trim;
      g.fillRect(x0, y0 + 228, 128, 26);
      g.fillStyle = gold;
      g.fillRect(x0, y0 + 225, 128, 3);
      g.fillRect(x0, y0 + 253, 128, 3);
      g.strokeStyle = gold;
      g.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.arc(x0 + 16 + k * 32, y0 + 252, 10, PI, 0);
        g.stroke();
      }
      h.fillStyle = shade(T.trim, -0.55);
      h.fillRect(x0, y0 + 228, 128, 26);
      // window
      archPath(g, cx, y0 + 18, y0 + 210, 30);
      g.fillStyle = light;
      g.fill();
      // little gable over the window
      g.fillStyle = shade(T.stone, 0.28);
      g.beginPath();
      g.moveTo(cx - 34, y0 + 52);
      g.lineTo(cx, y0 + 4);
      g.lineTo(cx + 34, y0 + 52);
      g.closePath();
      g.globalAlpha = 0.35;
      g.fill();
      g.globalAlpha = 1;
      const lit = r() > 0.2;
      const grd = g.createLinearGradient(0, y0 + 26, 0, y0 + 204);
      if (lit) {
        grd.addColorStop(0, shade(T.window, 0.45));
        grd.addColorStop(0.55, T.window);
        grd.addColorStop(1, shade(T.window, -0.3));
      } else {
        grd.addColorStop(0, '#2a5260');
        grd.addColorStop(1, '#0b1d26');
      }
      archPath(g, cx, y0 + 26, y0 + 204, 23);
      g.fillStyle = grd;
      g.fill();
      archPath(h, cx, y0 + 26, y0 + 204, 23);
      const hg = h.createLinearGradient(0, y0 + 26, 0, y0 + 204);
      hg.addColorStop(0, lit ? shade(T.window, 0.3) : '#0a1a20');
      hg.addColorStop(1, lit ? shade(T.window, -0.25) : '#03080a');
      h.fillStyle = hg;
      h.fill();
      for (const c of [g, h]) {
        c.strokeStyle = c === g ? dark : '#000';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(cx, y0 + 84);
        c.lineTo(cx, y0 + 204);
        c.moveTo(cx - 23, y0 + 150);
        c.lineTo(cx + 23, y0 + 150);
        c.stroke();
        // tracery: two small pointed arches and a circle
        c.beginPath();
        c.moveTo(cx - 23, y0 + 104);
        c.quadraticCurveTo(cx - 23, y0 + 84, cx - 11.5, y0 + 76);
        c.quadraticCurveTo(cx, y0 + 84, cx, y0 + 104);
        c.quadraticCurveTo(cx, y0 + 84, cx + 11.5, y0 + 76);
        c.quadraticCurveTo(cx + 23, y0 + 84, cx + 23, y0 + 104);
        c.stroke();
        c.beginPath();
        c.arc(cx, y0 + 58, 8, 0, TAU);
        c.stroke();
      }
      archPath(g, cx, y0 + 22, y0 + 207, 26.5);
      g.strokeStyle = gold;
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = light;
      g.fillRect(cx - 33, y0 + 204, 66, 8);
      g.fillStyle = gold;
      g.fillRect(cx - 33, y0 + 211, 66, 2);
    }
  }
  return { map: tex(a), emi: tex(e) };
}

// stone blocks (arches, gables): 4 × 8 blocks per texture, the texture repeats every 4 units
function ashlarTex(T, r) {
  const c = canvas(256, 256), g = c.getContext('2d');
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < 5; i++) {
      const x = i * 64 - (j % 2) * 32;
      g.fillStyle = shade(T.stone, (r() - 0.5) * 0.14);
      g.fillRect(x, j * 32, 64, 32);
    }
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let j = 0; j <= 8; j++) {
    g.fillRect(0, j * 32 - 1, 256, 2);
    for (let i = 0; i <= 5; i++) g.fillRect(i * 64 - (j % 2) * 32 - 1, j * 32, 2, 32);
  }
  const t = tex(c);
  t.repeat.set(0.25, 0.25);
  return t;
}

function trimTex(T) {
  const c = canvas(128, 32), g = c.getContext('2d');
  g.fillStyle = T.trim;
  g.fillRect(0, 0, 128, 32);
  g.strokeStyle = css(T.metal);
  g.lineWidth = 3;
  g.beginPath();
  for (let x = 0; x <= 128; x += 16) g.lineTo(x, x % 32 ? 8 : 24);
  g.stroke();
  g.fillStyle = css(T.metal);
  g.fillRect(0, 0, 128, 3);
  g.fillRect(0, 29, 128, 3);
  for (let x = 8; x < 128; x += 32) {
    g.beginPath();
    g.arc(x + 8, 16, 3, 0, TAU);
    g.fill();
  }
  return tex(c);
}

function pavingTex(T, r) {
  const c = canvas(256, 256), g = c.getContext('2d');
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      g.fillStyle = shade(T.stone2, (r() - 0.5) * 0.25 + 0.1);
      g.fillRect(i * 64, j * 64, 64, 64);
      if ((i + j) % 3 === 0) {
        g.fillStyle = T.trim;
        g.beginPath();
        g.moveTo(i * 64 + 32, j * 64 + 14);
        g.lineTo(i * 64 + 50, j * 64 + 32);
        g.lineTo(i * 64 + 32, j * 64 + 50);
        g.lineTo(i * 64 + 14, j * 64 + 32);
        g.fill();
      }
    }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let k = 0; k <= 256; k += 64) {
    g.fillRect(k - 1, 0, 2, 256);
    g.fillRect(0, k - 1, 256, 2);
  }
  return tex(c);
}

// the plaza: a round mosaic with a 16-pointed star
function mosaicTex(T) {
  const S = 512, a = canvas(S, S), e = canvas(S, S), g = a.getContext('2d'), h = e.getContext('2d');
  const gold = css(T.metal), C = S / 2;
  h.fillStyle = '#000';
  h.fillRect(0, 0, S, S);
  const disc = (c, rr, col) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(C, C, rr, 0, TAU);
    c.fill();
  };
  disc(g, 256, shade(T.stone, 0.1));
  disc(g, 250, T.trim);
  disc(g, 236, gold);
  disc(g, 232, shade(T.stone, 0.05));
  disc(h, 250, shade(T.trim, -0.6));
  disc(h, 236, '#000');
  for (const [c, col] of [[g, gold], [h, shade(css(T.metal), -0.55)]]) {
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i <= 32; i++) {
      const rr = i % 2 ? 92 : 214, ang = (i / 32) * TAU;
      c.lineTo(C + Math.cos(ang) * rr, C + Math.sin(ang) * rr);
    }
    c.fill();
  }
  g.strokeStyle = T.trim;
  g.lineWidth = 6;
  g.beginPath();
  for (let i = 0; i <= 32; i++) {
    const rr = i % 2 ? 92 : 214, ang = (i / 32) * TAU;
    g.lineTo(C + Math.cos(ang) * rr, C + Math.sin(ang) * rr);
  }
  g.stroke();
  disc(g, 84, T.trim);
  disc(g, 70, shade(T.stone, 0.15));
  disc(h, 84, shade(T.trim, -0.5));
  disc(h, 70, '#000');
  g.fillStyle = gold;
  for (let i = 0; i < 48; i++) {
    const ang = (i / 48) * TAU;
    g.beginPath();
    g.arc(C + Math.cos(ang) * 224, C + Math.sin(ang) * 224, 3, 0, TAU);
    g.fill();
  }
  return { map: tex(a, false), emi: tex(e, false) };
}

// ---------------------------------------------------------------- shaders
const VS = `
#include <fog_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
// glass with golden ribs (domes) or plain (tubes), brighter at the rim, a soft shimmer
const GLASS_FS = `
#include <fog_pars_fragment>
uniform vec3 uTint; uniform vec3 uRib; uniform vec3 uGlow; uniform float uT; uniform vec2 uRibs;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float fres = f * f;
  vec3 col = uTint * (0.3 + 1.2 * fres) + uGlow * 0.12;
  float a = 0.26 + 0.55 * fres;
  if (uRibs.x > 0.0) {
    vec2 g = abs(fract(vUv * uRibs) - 0.5);
    vec2 w = fwidth(vUv * uRibs);
    float lx = 1.0 - smoothstep(w.x * 0.6, w.x * 1.6, 0.5 - g.x);
    float ly = 1.0 - smoothstep(w.y * 0.6, w.y * 1.6, 0.5 - g.y);
    // ribs fade out when they get too dense on screen (no golden cage from afar)
    float far = 1.0 - smoothstep(0.06, 0.2, max(w.x, w.y));
    float line = max(lx, ly * 0.8) * (0.25 + 0.75 * far);
    col = mix(col, uRib * (0.75 + 0.5 * fres), line * 0.85);
    a = mix(a, 0.9, line);
  } else {
    float s = smoothstep(0.92, 1.0, sin(vUv.x * 40.0 - uT * 3.0) * 0.5 + 0.5);
    col += uTint * s * 0.5;
  }
  col += uTint * 0.12 * (0.5 + 0.5 * sin(uT * 1.3 + vUv.y * 18.0 - vUv.x * 18.85)) * fres;
  gl_FragColor = vec4(col, a);
  #include <fog_fragment>
}`;
// glowing crystal / energy core: bands of light flow upwards
const ENERGY_FS = `
#include <fog_pars_fragment>
uniform vec3 uC; uniform float uT;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float flow = fract(vUv.y * 5.0 - uT * 0.45);
  float band = smoothstep(0.0, 0.15, flow) * smoothstep(0.6, 0.2, flow);
  float n = 0.5 + 0.5 * sin(vUv.x * 18.85 + vUv.y * 30.0 - uT * 2.0);
  vec3 col = uC * (0.7 + 0.55 * band + 0.2 * n + 0.5 * f) + vec3(0.35) * band * (1.0 - f);
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;
// light shafts from the surface (additive cones, bright where you look straight through them)
const RAYS_VS = `
attribute float aPh;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vPh;
void main(){
  vUv = uv; vPh = aPh;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const RAYS_FS = `
uniform vec3 uC; uniform float uT;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vPh;
void main(){
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float a = pow(facing, 1.2) * (0.25 + 0.75 * pow(vUv.y, 1.2)) * (0.6 + 0.4 * sin(uT * 0.5 + vPh)) * 0.42;
  gl_FragColor = vec4(uC, a);
}`;
// kelp ribbons sway in the current (height 0..1 in aH)
const KELP_VS = `
#include <fog_pars_vertex>
attribute float aH; attribute float aPh;
uniform float uT;
varying float vH;
void main(){
  vec3 p = position;
  float s = aH * aH;
  p.x += sin(uT * 0.9 + aPh + aH * 3.0) * 1.4 * s;
  p.z += cos(uT * 0.7 + aPh * 1.3 + aH * 2.0) * 1.0 * s;
  vH = aH;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const KELP_FS = `
#include <fog_pars_fragment>
uniform vec3 uA; uniform vec3 uB;
varying float vH;
void main(){
  gl_FragColor = vec4(mix(uA, uB, 0.25 + 0.75 * vH) * 1.15, 1.0);
  #include <fog_fragment>
}`;
const WATER_FS = `
#include <fog_pars_fragment>
uniform float uT; uniform vec3 uC;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec2 p = vUv - 0.5; float r = length(p);
  float w = 0.55 + 0.25 * sin(r * 40.0 - uT * 2.5) + 0.2 * sin(atan(p.y, p.x) * 9.0 + uT);
  gl_FragColor = vec4(uC * (0.6 + 0.6 * w), 0.85);
  #include <fog_fragment>
}`;

// the shimmering surface of the secret door: a slow whirl of light
const PORTAL_VS = `
#include <fog_pars_vertex>
varying vec3 vP;
void main(){
  vP = position;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const PORTAL_FS = `
#include <fog_pars_fragment>
uniform float uT; uniform vec3 uC; uniform vec3 uC2; uniform vec2 uS;
varying vec3 vP;
void main(){
  vec2 q = (vP.xy - vec2(0.0, uS.y * 0.55)) / vec2(uS.x * 0.5, uS.y * 0.55);
  float r = length(q), a = atan(q.y, q.x);
  float sw = 0.5 + 0.5 * sin(a * 5.0 + r * 9.0 - uT * 2.6);
  vec3 col = mix(uC2, uC, sw) * (1.15 - r * 0.45) + vec3(1.0) * pow(max(0.0, 1.0 - r), 3.0) * 0.9;
  gl_FragColor = vec4(col, 0.93);
  #include <fog_fragment>
}`;

function shaderMat(vs, fs, uni, o = {}) {
  return new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, uni]), vertexShader: vs, fragmentShader: fs, fog: true, ...o });
}

// ---------------------------------------------------------------- the city
export class Atlantis {
  constructor(scene, world, center, seed = 1, levelId = 'java', opts = {}) {
    this.scene = scene;
    this.world = world;
    this.levelId = levelId;
    this.theme = THEMES[levelId] || THEMES.java;
    this.subLen = opts.subLen || 3;
    // the platform lies on the highest ground under it (nothing pokes through), the skirt covers the slope below
    let top = world.heightAt(center.x, center.z);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU;
      for (const f of [0.45, 0.8, 1.0]) top = Math.max(top, world.heightAt(center.x + Math.cos(a) * R * f, center.z + Math.sin(a) * R * f));
    }
    this.center = new THREE.Vector3(center.x, top + 1.5, center.z);
    this.group = new THREE.Group(); // the city (rises from the floor)
    this.group.position.copy(this.center);
    this.life = new THREE.Group(); // animals, vehicles, light shafts (appear when the city is up)
    this.life.position.copy(this.center);
    this.life.visible = false;
    scene.add(this.group, this.life);
    this.uT = { value: 0 };
    this.r = rng(seed);
    this.cols = []; // solid parts for the sub: {x, z, r, y1} cylinders, {x, y, z, r, sphere: 1}
    this.sites = []; // buildings (for tubes and free space)
    this.spin = []; // [object, speed, axis]
    this.pods = [];
    this.vehicles = [];
    this.animals = [];
    this.schools = [];
    this.floaters = []; // lanterns, pearls: [object, baseY, amp, speed, phase]
    this.vents = [];
    this.makeMaterials();
    this.B = new Merger();
    this.build();
    this.B.build(this.group);
    this.buildLife();
    this.buildPeople();
    this.buildHall();
    world.magicCol = new THREE.Color(this.theme.water);
    this.rise = 0;
    this.group.scale.set(1, 0.02, 1);
  }

  makeMaterials() {
    const T = this.theme, r = this.r;
    const fac = facadeTex(T, r), mos = mosaicTex(T), trim = trimTex(T), pav = pavingTex(T, r), ash = ashlarTex(T, r);
    this.textures = [fac.map, fac.emi, mos.map, mos.emi, trim, pav, ash];
    const glassU = (ribs) => ({ uTint: { value: new THREE.Color(T.glass) }, uRib: { value: new THREE.Color(T.metal) }, uGlow: { value: new THREE.Color(T.glow) }, uT: this.uT, uRibs: { value: new THREE.Vector2(...ribs) } });
    const glassO = { transparent: true, depthWrite: false, side: THREE.DoubleSide };
    const M = {
      facade: new THREE.MeshStandardMaterial({ map: fac.map, emissiveMap: fac.emi, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.75, metalness: 0.05 }),
      stone: new THREE.MeshStandardMaterial({ color: T.stone, roughness: 0.8, emissive: T.stone, emissiveIntensity: 0.14 }),
      stone2: new THREE.MeshStandardMaterial({ color: T.stone2, roughness: 0.85, emissive: T.stone2, emissiveIntensity: 0.12 }),
      ashlar: new THREE.MeshStandardMaterial({ map: ash, roughness: 0.8, emissive: T.stone, emissiveIntensity: 0.12 }),
      paving: new THREE.MeshStandardMaterial({ map: pav, roughness: 0.9, emissive: T.stone2, emissiveIntensity: 0.1 }),
      mosaic: new THREE.MeshStandardMaterial({ map: mos.map, emissiveMap: mos.emi, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.6 }),
      gold: new THREE.MeshStandardMaterial({ color: T.metal, metalness: 0.85, roughness: 0.3, emissive: T.metal, emissiveIntensity: 0.3 }),
      trim: new THREE.MeshStandardMaterial({ map: trim, emissiveMap: trim, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.5 }),
      glow: new THREE.MeshBasicMaterial({ color: T.glow }),
      warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(T.window) }),
      coral: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
      domeGlass: shaderMat(VS, GLASS_FS, glassU([32, 9]), glassO),
      tubeGlass: shaderMat(VS, GLASS_FS, glassU([0, 0]), glassO),
      energy: shaderMat(VS, ENERGY_FS, { uC: { value: new THREE.Color(T.glow) }, uT: this.uT }),
      water: shaderMat(VS, WATER_FS, { uC: { value: new THREE.Color(T.glow) }, uT: this.uT }, { transparent: true, depthWrite: false }),
      portal: shaderMat(PORTAL_VS, PORTAL_FS, { uC: { value: new THREE.Color(T.glow).lerp(new THREE.Color(1, 1, 1), 0.25) }, uC2: { value: new THREE.Color(T.trim).multiplyScalar(0.6) }, uT: this.uT, uS: { value: new THREE.Vector2(4.4, 5.4) } }, { transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      kelp: shaderMat(KELP_VS, KELP_FS, { uA: { value: new THREE.Color(T.kelp[0]) }, uB: { value: new THREE.Color(T.kelp[1]) }, uT: this.uT }, { side: THREE.DoubleSide }),
      rays: new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(0xd8f6ff).lerp(new THREE.Color(T.glass), 0.3) }, uT: this.uT }, vertexShader: RAYS_VS, fragmentShader: RAYS_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    };
    // the shared uniform object must stay the same (merge() copies it)
    for (const k of ['domeGlass', 'tubeGlass', 'energy', 'water', 'kelp', 'portal']) M[k].uniforms.uT = this.uT;
    this.M = M;
  }

  // ------------------------------------------------ building blocks (local coordinates, y = 0 on the platform)
  add(mat, geo, m) {
    this.B.add(mat, geo, m);
  }

  // round building with rows of arched windows, ornament band and golden cornice on top
  drum(x, y, z, r, h, { rt = r, floors = Math.max(1, Math.round(h / 2.8)), seg = 40, cap = true, band = true, plinth = true } = {}) {
    const M = this.M;
    const bays = Math.max(4, Math.round((TAU * r) / 2.4 / 4) * 4);
    this.add(M.facade, uvs(new THREE.CylinderGeometry(rt, r, h, seg, 1, true), bays / 4, floors / 2), M4(x, y + h / 2, z));
    if (cap) this.add(M.stone, new THREE.CircleGeometry(rt, seg), M4(x, y + h, z, -PI / 2));
    if (band) {
      this.add(M.trim, uvs(new THREE.CylinderGeometry(rt + 0.28, rt + 0.28, 0.8, seg, 1, true), Math.round((TAU * rt) / 1.6), 1), M4(x, y + h - 0.4, z));
      this.add(M.gold, ring(rt + 0.32, 0.1, seg), M4(x, y + h, z));
      this.add(M.gold, ring(rt + 0.32, 0.07, seg), M4(x, y + h - 0.82, z));
    }
    if (plinth) {
      this.add(M.stone2, new THREE.CylinderGeometry(r + 0.6, r + 0.9, 1.2, seg), M4(x, y + 0.6, z));
      this.add(M.gold, ring(r + 0.62, 0.1, seg), M4(x, y + 1.2, z));
    }
  }

  // glass dome with golden ribs, a garden glowing inside and a lantern on top
  dome(x, y, z, r, { lantern = true, garden = true } = {}) {
    const M = this.M;
    this.add(M.domeGlass, new THREE.SphereGeometry(r, 44, 16, 0, TAU, 0, PI / 2), M4(x, y, z));
    this.add(M.gold, ring(r + 0.1, Math.max(0.2, r * 0.025), 56), M4(x, y + 0.1, z));
    if (garden) this.glowGarden(x, y, z, r * 0.8);
    if (lantern) {
      const lr = Math.max(0.7, r * 0.15), ly = y + r * 0.985;
      this.drum(x, ly, z, lr, lr * 1.3, { floors: 1, plinth: false, seg: 16 });
      this.add(M.gold, new THREE.SphereGeometry(lr * 1.08, 16, 8, 0, TAU, 0, PI / 2), M4(x, ly + lr * 1.3, z));
      this.spire(x, ly + lr * 2.3, z, lr * 0.25, lr * 2.2);
    }
    this.cols.push({ x, y, z, r: r + 0.3, sphere: 1 });
  }

  spire(x, y, z, r, h, mat = this.M.gold, seg = 12) {
    this.add(mat, new THREE.ConeGeometry(r, h, seg), M4(x, y + h / 2, z));
    this.add(this.M.glow, new THREE.SphereGeometry(Math.max(0.18, r * 0.5), 10, 8), M4(x, y + h + 0.15, z));
  }

  pinnacles(x, y, z, rr, n, h, r = 0.32, ph = 0) {
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * TAU, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      this.add(this.M.stone, new THREE.CylinderGeometry(r * 0.9, r, h * 0.35, 6), M4(px, y + h * 0.175, pz));
      this.add(this.M.gold, new THREE.ConeGeometry(r, h * 0.65, 6), M4(px, y + h * 0.35 + h * 0.325, pz));
    }
  }

  // ring balcony with a golden rail and little lamps
  balcony(x, y, z, r, seg = 40) {
    const M = this.M;
    this.add(M.stone, new THREE.CylinderGeometry(r + 1.1, r + 0.5, 0.55, seg), M4(x, y + 0.27, z));
    this.add(M.gold, ring(r + 1.0, 0.09, seg), M4(x, y + 1.15, z));
    const n = Math.max(6, Math.round((TAU * r) / 3));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, px = x + Math.cos(a) * (r + 1.0), pz = z + Math.sin(a) * (r + 1.0);
      this.add(M.gold, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 4), M4(px, y + 0.85, pz));
      if (i % 2 === 0) this.add(M.warm, new THREE.SphereGeometry(0.16, 6, 5), M4(px, y + 1.3, pz));
    }
  }

  // inside a dome: a softly glowing floor and a few slender light plants
  glowGarden(x, y, z, rr) {
    const T = this.theme, r = this.r;
    this.add(this.M.warm, new THREE.CircleGeometry(rr * 0.55, 24), M4(x, y + 0.08, z, -PI / 2, 0, 0));
    const n = Math.max(3, Math.round(rr * 0.6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r(), d = rr * (0.25 + r() * 0.5), h = rr * (0.35 + r() * 0.35);
      this.add(this.M.coral, paint(new THREE.ConeGeometry(0.35 + rr * 0.04, h, 6), T.corals[i % T.corals.length], 0.75), M4(x + Math.cos(a) * d, y + h / 2, z + Math.sin(a) * d));
    }
  }

  // small glowing garden (coral & sea plants) – on terraces
  garden(x, y, z, rr) {
    const r = this.r, T = this.theme, n = Math.max(4, Math.round(rr * 1.2));
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rr;
      this.coral(x + Math.cos(a) * d, y + 0.05, z + Math.sin(a) * d, T.corals[(r() * T.corals.length) | 0], 0.6 + r() * 0.8);
    }
  }

  tower(x, z, r, h, top = 'spire') {
    const M = this.M;
    const secs = h > 30 ? 3 : 2;
    let y = 0, rr = r;
    for (let k = 0; k < secs; k++) {
      const hs = k === 0 ? h * 0.46 : (h * 0.54) / (secs - 1);
      const rt = rr * 0.92;
      this.drum(x, y, z, rr, hs, { rt, plinth: k === 0, seg: rr > 3 ? 36 : 24 });
      y += hs;
      if (k < secs - 1) this.balcony(x, y, z, rt, rr > 3 ? 36 : 24);
      rr = rt * 0.84;
    }
    let tip = y;
    if (top === 'dome') {
      this.dome(x, y, z, rr * 1.04, { garden: false });
      tip = y + rr * 2.6;
    } else if (top === 'crown') {
      this.pinnacles(x, y, z, rr * 0.9, 8, rr * 1.6, 0.3);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(rr * 0.8, 0), M.energy);
      c.scale.set(1, 1.6, 1);
      c.position.set(x, y + rr * 2.2, z);
      this.group.add(c);
      this.spin.push([c, 0.6, 'y']);
      tip = y + rr * 3.5;
    } else {
      this.add(M.stone2, new THREE.ConeGeometry(rr * 1.02, rr * 4.6, 16), M4(x, y + rr * 2.3, z));
      this.add(M.trim, uvs(new THREE.ConeGeometry(rr * 0.66, rr * 1.2, 16, 1, true), 6, 1), M4(x, y + rr * 2.9, z));
      this.pinnacles(x, y, z, rr * 1.05, 8, rr * 1.4, 0.28);
      this.spire(x, y + rr * 4.6, z, 0.18, rr * 1.4);
      tip = y + rr * 6;
    }
    this.cols.push({ x, z, r: r + 0.9, y1: y });
    return { y: h * 0.28, pr: r * 0.95, tip };
  }

  // spiral tower: a tapering tower with a ramp winding around it, lamps along the parapet
  spiral(x, z, r, h, turns = 3.5, a0 = 0) {
    const M = this.M, r1 = r * 0.55;
    this.drum(x, 0, z, r, h, { rt: r1 });
    const N = Math.round(turns * 46), w = Math.max(1.3, r * 0.32), rise = h - 3;
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), Zax = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, a = a0 + t * turns * TAU, y = 1.4 + t * rise;
      const rr = lerp(r, r1, t) + w / 2 + 0.05;
      const len = ((TAU * rr * turns) / N) * 1.12;
      qa.setFromAxisAngle(Y, -a - PI / 2);
      qb.setFromAxisAngle(Zax, Math.atan2(rise / N, len));
      const q = qa.clone().multiply(qb);
      const place = (d, yy) => new THREE.Matrix4().compose(new THREE.Vector3(x + Math.cos(a) * d, yy, z + Math.sin(a) * d), q, new THREE.Vector3(1, 1, 1));
      this.add(M.stone, new THREE.BoxGeometry(len, 0.45, w), place(rr, y));
      this.add(M.stone2, new THREE.BoxGeometry(len, 0.9, 0.2), place(rr + w / 2 - 0.1, y + 0.6));
      if (i % 4 === 0) this.add(M.warm, new THREE.SphereGeometry(0.17, 6, 5), place(rr + w / 2 - 0.1, y + 1.2));
      if (i % 12 === 0) this.add(M.trim, new THREE.BoxGeometry(len, 0.25, 0.22), place(rr + w / 2 - 0.08, y + 1.0));
    }
    this.balcony(x, h, z, r1);
    this.dome(x, h, z, r1 * 1.02, { garden: false });
    this.cols.push({ x, z, r: r + w + 0.4, y1: h });
    return { y: h * 0.3, pr: lerp(r, r1, 0.3), tip: h + r1 * 2.6 };
  }

  // a terraced round building (stacked rings with arches, planted edges), a dome on top
  terrace(x, z, r, levels = 3) {
    const M = this.M, T = this.theme, rnd = this.r;
    let y = 0, rk = r;
    for (let k = 0; k < levels; k++) {
      const hk = 4.4;
      this.drum(x, y, z, rk, hk, { floors: 1, plinth: k === 0, seg: 44 });
      y += hk;
      // hanging plants over the edge, small corals on the terrace
      const n = Math.round(rk * 1.6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rnd() * 0.2, len = 1.2 + rnd() * 2.4;
        const g = paint(new THREE.PlaneGeometry(0.7, len), T.kelp[1], 1.1);
        this.add(M.coral, g, M4(x + Math.cos(a) * (rk + 0.45), y - len / 2 - 0.2, z + Math.sin(a) * (rk + 0.45), 0, -a + PI / 2, 0));
      }
      if (k < levels - 1) for (let i = 0; i < 5; i++) {
        const a = rnd() * TAU, d = rk - 1.2 - rnd() * 1.2;
        this.coral(x + Math.cos(a) * d, y, z + Math.sin(a) * d, T.corals[(rnd() * T.corals.length) | 0], 0.6 + rnd() * 0.5);
      }
      rk *= 0.76;
    }
    this.dome(x, y, z, rk * 0.95, { garden: true });
    this.cols.push({ x, z, r: r + 1, y1: y });
    return { y: 6.6, pr: r * 0.76, tip: y + rk * 2.4 };
  }

  // tiered tower: stacked storeys, each under a wide flared roof with lamps at the corners
  tier(x, z, r, h) {
    const M = this.M;
    const n = Math.max(3, Math.round(h / 6));
    let y = 0, rr = r;
    for (let k = 0; k < n; k++) {
      const hs = h / n;
      this.drum(x, y, z, rr, hs * 0.72, { floors: 1, plinth: k === 0, band: false, seg: 8 });
      y += hs * 0.72;
      this.add(M.trim, uvs(new THREE.ConeGeometry(rr * 1.75, hs * 0.38, 8, 1, true), 8, 1), M4(x, y + hs * 0.19, z));
      this.add(M.gold, ring(rr * 1.72, 0.12, 8), M4(x, y + 0.02, z, 0, PI / 8, 0));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + PI / 8;
        this.add(M.warm, new THREE.SphereGeometry(0.28, 8, 6), M4(x + Math.cos(a) * rr * 1.72, y - 0.5, z + Math.sin(a) * rr * 1.72));
      }
      y += hs * 0.28;
      rr *= 0.82;
    }
    this.spire(x, y, z, rr * 0.5, rr * 3);
    this.cols.push({ x, z, r: r * 1.6, y1: y });
    return { y: (h / n) * 0.36, pr: r, tip: y + rr * 3 };
  }

  // giant glowing crystals around a round hall
  crystals(x, z, r) {
    const rnd = this.r;
    this.drum(x, 0, z, r * 0.6, 4, { floors: 1 });
    const n = 3 + ((rnd() * 3) | 0);
    let tip = 0;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(), h = 9 + rnd() * 16, cr = 0.9 + rnd() * 1.1;
      this.crystal(x + Math.cos(a) * r * 0.55, 3, z + Math.sin(a) * r * 0.55, cr, h, Math.cos(a) * 0.25, Math.sin(a) * 0.25);
      tip = Math.max(tip, h + 3);
    }
    this.crystal(x, 4, z, 1.6, 14 + rnd() * 10, 0, 0);
    this.cols.push({ x, z, r: r * 0.75, y1: 14 });
    return { y: 2.2, pr: r * 0.6, tip: tip + 4 };
  }

  crystal(x, y, z, r, h, tx, tz) {
    const base = M4(x, y, z, tx, 0, -tz);
    this.add(this.M.energy, new THREE.CylinderGeometry(r, r * 1.15, h, 6), base.clone().multiply(M4(0, h / 2, 0)));
    this.add(this.M.energy, new THREE.ConeGeometry(r, r * 2.4, 6), base.clone().multiply(M4(0, h + r * 1.2, 0)));
  }

  // simple statue on a pedestal (robed figure, one arm raised with a trident or a glowing orb)
  statue(x, z, ang, kind) {
    const M = this.M, P = M4(x, 0, z, 0, ang, 0);
    const L = (mat, geo, m) => this.add(mat, geo, P.clone().multiply(m));
    L(M.stone2, new THREE.BoxGeometry(2.2, 2.4, 2.2), M4(0, 1.2, 0));
    L(M.gold, new THREE.BoxGeometry(2.45, 0.25, 2.45), M4(0, 2.45, 0));
    const robe = new THREE.LatheGeometry([[0, 0], [0.95, 0], [0.8, 1.4], [0.58, 2.9], [0.5, 3.5], [0.3, 3.85], [0, 3.95]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
    L(M.stone, robe, M4(0, 2.6, 0));
    L(M.stone, new THREE.SphereGeometry(0.42, 12, 10), M4(0, 6.95, 0));
    L(M.stone, new THREE.CylinderGeometry(0.15, 0.13, 1.8, 6), M4(-0.55, 5.4, 0, 0, 0, 0.25));
    L(M.stone, new THREE.CylinderGeometry(0.15, 0.13, 1.8, 6), M4(0.62, 6.6, 0, 0, 0, -0.35));
    if (kind % 2) {
      L(M.gold, new THREE.CylinderGeometry(0.07, 0.07, 4.6, 5), M4(0.95, 6.6, 0));
      for (const dx of [-0.3, 0, 0.3]) L(M.gold, new THREE.ConeGeometry(0.09, 0.6, 4), M4(0.95 + dx, 9.1, 0));
      L(M.gold, new THREE.BoxGeometry(0.7, 0.08, 0.08), M4(0.95, 8.8, 0));
    } else {
      L(M.glow, new THREE.SphereGeometry(0.42, 12, 10), M4(0.95, 7.75, 0));
    }
  }

  column(x, z, h, broken) {
    const M = this.M;
    this.add(M.stone2, new THREE.BoxGeometry(1.5, 0.6, 1.5), M4(x, 0.3, z));
    const hh = broken ? h * (0.35 + this.r() * 0.3) : h;
    this.add(M.stone, new THREE.CylinderGeometry(0.5, 0.58, hh, 12), M4(x, 0.6 + hh / 2, z));
    if (!broken) {
      this.add(M.gold, ring(0.62, 0.12, 12), M4(x, 0.6 + hh - 0.3, z));
      this.add(M.stone2, new THREE.BoxGeometry(1.4, 0.5, 1.4), M4(x, 0.6 + hh + 0.25, z));
    } else {
      this.add(M.stone, new THREE.CylinderGeometry(0.5, 0.5, h * 0.3, 12), M4(x + 1.2, 0.5, z + 0.4, PI / 2, 0, 0.4));
    }
  }

  lamp(x, z, h = 3.4, y = 0) {
    this.add(this.M.gold, new THREE.CylinderGeometry(0.08, 0.12, h, 6), M4(x, y + h / 2, z));
    this.add(this.M.warm, new THREE.SphereGeometry(0.34, 10, 8), M4(x, y + h + 0.2, z));
  }

  // one coral of a random kind (glowing, unlit material with painted colours)
  coral(x, y, z, hex, s = 1) {
    const r = this.r, M = this.M, rot = r() * TAU;
    let kind = (r() * 6) | 0;
    if (kind === 5) kind = 0; // branching corals twice as often, round ones rarely
    if (kind === 0) {
      // branching coral
      const br = (px, py, pz, len, rad, ax, az, depth) => {
        const m = M4(px, py, pz, ax, 0, az);
        this.add(M.coral, paint(new THREE.CylinderGeometry(rad * 0.7, rad, len, 5), hex), m.clone().multiply(M4(0, len / 2, 0)));
        if (depth > 0) {
          const tip = new THREE.Vector3(0, len, 0).applyMatrix4(m);
          for (let k = 0; k < 3; k++) br(tip.x, tip.y, tip.z, len * 0.7, rad * 0.65, ax + (r() - 0.5) * 1.1, az + (r() - 0.5) * 1.1, depth - 1);
        } else this.add(M.coral, paint(new THREE.SphereGeometry(rad * 1.3, 5, 4), hex, 1.5), M4(...new THREE.Vector3(0, len, 0).applyMatrix4(m).toArray()));
      };
      br(x, y, z, 1.4 * s, 0.22 * s, 0, 0, 2);
    } else if (kind === 1) {
      // fan coral
      const g = paint(new THREE.CircleGeometry(2.2 * s, 18, 0, PI), hex, 1.1);
      this.add(M.coral, g, M4(x, y, z, 0, rot, 0));
    } else if (kind === 2) {
      // tube sponges
      for (let k = 0; k < 4; k++) {
        const h = (1 + r() * 1.8) * s, a = r() * TAU, d = r() * 0.8 * s;
        this.add(M.coral, paint(new THREE.CylinderGeometry(0.32 * s, 0.24 * s, h, 8, 1, true), hex), M4(x + Math.cos(a) * d, y + h / 2, z + Math.sin(a) * d, (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3));
      }
    } else if (kind === 3) {
      // round brain coral with a glowing crown
      this.add(M.coral, paint(new THREE.SphereGeometry(0.7 * s, 12, 8, 0, TAU, 0, PI * 0.55), hex), M4(x, y - 0.1, z, 0, rot, 0, 1, 0.8, 1));
    } else {
      // anemone: many thin tentacles
      this.add(M.coral, paint(new THREE.CylinderGeometry(0.5 * s, 0.6 * s, 0.6 * s, 10), hex, 0.8), M4(x, y + 0.3 * s, z));
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU;
        this.add(M.coral, paint(new THREE.ConeGeometry(0.1 * s, 1.3 * s, 4), hex, 1.3), M4(x + Math.cos(a) * 0.35 * s, y + 1.1 * s, z + Math.sin(a) * 0.35 * s, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5));
      }
    }
  }

  kelp(x, z, h) {
    const g = new THREE.PlaneGeometry(0.9, h, 1, 10).translate(0, h / 2, 0);
    const ph = this.r() * 10;
    attr1(g, 'aH', (px, py) => py / h);
    attr1(g, 'aPh', () => ph);
    this.add(this.M.kelp, g, M4(x, 0, z, 0, this.r() * PI, 0));
  }

  // glass tube walkway between two points (gold rings, light strip, Y-shaped supports, travelling pods)
  tube(p0, p1, sag = 0) {
    const M = this.M;
    const d = new THREE.Vector3(p1.x - p0.x, 0, p1.z - p0.z).normalize();
    const mid = p0.clone().lerp(p1, 0.5);
    mid.y += sag;
    const lead = Math.min(3, p0.distanceTo(p1) * 0.22);
    const curve = new THREE.CatmullRomCurve3([p0, p0.clone().addScaledVector(d, lead), mid, p1.clone().addScaledVector(d, -lead), p1]);
    const L = curve.getLength();
    this.add(M.tubeGlass, new THREE.TubeGeometry(curve, Math.max(8, Math.ceil(L / 1.2)), 1.35, 14, false), null);
    const low = new THREE.CatmullRomCurve3(curve.points.map((p) => p.clone().add(new THREE.Vector3(0, -1.05, 0))));
    this.add(M.warm, new THREE.TubeGeometry(low, Math.max(8, Math.ceil(L / 2)), 0.1, 4, false), null);
    const Zax = new THREE.Vector3(0, 0, 1), q = new THREE.Quaternion();
    for (let s = 1.5; s < L - 1; s += 4.2) {
      const u = s / L, p = curve.getPointAt(u);
      q.setFromUnitVectors(Zax, curve.getTangentAt(u));
      this.add(M.gold, new THREE.TorusGeometry(1.42, 0.09, 6, 22), new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
    }
    // supports where the tube runs high above the ground
    const side = new THREE.Vector3(-d.z, 0, d.x);
    for (let s = 10; s < L - 8; s += 20) {
      const p = curve.getPointAt(s / L);
      if (p.y < 8 || this.blocked(p.x, p.z, 1)) continue;
      const fy = p.y - 4.2;
      this.add(M.stone2, new THREE.CylinderGeometry(0.55, 0.85, fy, 10), M4(p.x, fy / 2, p.z));
      this.add(M.gold, ring(0.7, 0.14, 12), M4(p.x, fy, p.z));
      for (const sd of [-1, 1]) {
        const a = new THREE.Vector3(p.x, fy, p.z), b = new THREE.Vector3(p.x + side.x * sd * 1.25, p.y - 1.25, p.z + side.z * sd * 1.25);
        const len = a.distanceTo(b), qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        this.add(M.gold, new THREE.CylinderGeometry(0.16, 0.2, len, 6), new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), qq, new THREE.Vector3(1, 1, 1)));
      }
    }
    const nPods = L > 40 ? 2 : 1;
    for (let i = 0; i < nPods; i++) this.pods.push({ curve, L, u: this.r(), dir: this.r() > 0.5 ? 1 : -1, speed: 5 + this.r() * 4 });
  }

  // arcaded aqueduct along an arc, a road with lamps on top
  aqueduct(ra, a0, a1, ha) {
    const M = this.M, span = 5.4, n = Math.max(3, Math.round((ra * Math.abs(a1 - a0)) / span));
    const sh = new THREE.Shape(), w = span, ar = w * 0.3, hs = ha - ar - 1.4;
    sh.moveTo(-w / 2, 0);
    sh.lineTo(-w / 2, ha);
    sh.lineTo(w / 2, ha);
    sh.lineTo(w / 2, 0);
    sh.lineTo(ar, 0);
    sh.lineTo(ar, hs);
    sh.absarc(0, hs, ar, 0, PI, false);
    sh.lineTo(-ar, 0);
    sh.closePath();
    const bay = new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }).translate(0, 0, -0.75);
    const sh2 = new THREE.Shape(), h2 = 3.2, ar2 = w * 0.18;
    sh2.moveTo(-w / 2, 0);
    sh2.lineTo(-w / 2, h2);
    sh2.lineTo(w / 2, h2);
    sh2.lineTo(w / 2, 0);
    for (const cx of [w / 4, -w / 4]) {
      sh2.lineTo(cx + ar2, 0);
      sh2.lineTo(cx + ar2, h2 - ar2 - 0.5);
      sh2.absarc(cx, h2 - ar2 - 0.5, ar2, 0, PI, false);
      sh2.lineTo(cx - ar2, 0);
    }
    sh2.closePath();
    const bay2 = new THREE.ExtrudeGeometry(sh2, { depth: 1.1, bevelEnabled: false }).translate(0, 0, -0.55);
    for (let i = 0; i < n; i++) {
      const a = a0 + ((i + 0.5) / n) * (a1 - a0), x = Math.cos(a) * ra, z = Math.sin(a) * ra;
      if (this.blocked(x, z, 2.5)) continue;
      const sx = ((ra * Math.abs(a1 - a0)) / n / span) * 1.02;
      this.add(M.ashlar, bay, M4(x, 0, z, 0, -a - PI / 2, 0, sx, 1, 1));
      const top = M4(x, 0, z, 0, -a - PI / 2, 0);
      const bl = ((ra * Math.abs(a1 - a0)) / n) * 1.03;
      this.add(M.trim, uvs(new THREE.BoxGeometry(bl, 0.5, 1.7), 3, 1), top.clone().multiply(M4(0, ha + 0.25, 0)));
      this.add(M.ashlar, bay2, top.clone().multiply(M4(0, ha + 0.5, 0, 0, 0, 0, sx, 1, 1)));
      this.add(M.stone2, new THREE.BoxGeometry(bl, 0.5, 2.6), top.clone().multiply(M4(0, ha + 0.5 + h2 + 0.25, 0)));
      this.add(M.gold, new THREE.BoxGeometry(bl, 0.12, 2.7), top.clone().multiply(M4(0, ha + 0.5 + h2 + 0.55, 0)));
      for (const sd of [-1.1, 1.1]) this.add(M.warm, new THREE.SphereGeometry(0.2, 6, 5), top.clone().multiply(M4(0, ha + h2 + 1.4, sd)));
    }
  }

  blocked(x, z, pad) {
    for (const s of this.sites) if (Math.hypot(x - s.x, z - s.z) < s.r + pad) return true;
    return false;
  }

  // ------------------------------------------------ centrepieces (one per theme)
  centre(kind, pa) {
    const M = this.M, rnd = this.r;
    const plinth = (r, steps = 3, h = 0.9) => {
      for (let k = 0; k < steps; k++) this.add(M.stone2, new THREE.CylinderGeometry(r - k * 1.4, r - k * 1.4 + 0.3, h, 64), M4(0, h / 2 + k * h, 0));
      this.add(M.gold, ring(r - (steps - 1) * 1.4, 0.15, 64), M4(0, steps * h, 0));
      return steps * h;
    };
    if (kind === 'grandDome') {
      const y = plinth(24);
      this.drum(0, y, 0, 16, 11, { floors: 3, seg: 64 });
      // ring of slender columns around the drum
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        const off = (((a - pa) % (PI / 2)) + PI / 2) % (PI / 2);
        if (off < 0.32 || off > PI / 2 - 0.32) continue; // room for the gables
        this.add(M.stone, new THREE.CylinderGeometry(0.32, 0.38, 10, 8), M4(Math.cos(a) * 17.6, y + 5.6, Math.sin(a) * 17.6));
        this.add(M.gold, new THREE.BoxGeometry(0.9, 0.4, 0.9), M4(Math.cos(a) * 17.6, y + 10.7, Math.sin(a) * 17.6, 0, -a, 0));
      }
      this.add(M.stone, new THREE.CylinderGeometry(18.2, 18.2, 0.8, 64, 1, true), M4(0, y + 11.2, 0));
      this.add(M.gold, ring(18.25, 0.2, 64), M4(0, y + 11.6, 0));
      // four Gothic gables with rose windows
      for (let q = 0; q < 4; q++) this.gable(pa + q * (PI / 2), 16.2, y, 9, 15, q === 0);
      this.makeDoor(this.B, pa, 18.25, y, { porchFrom: 0 });
      this.dome(0, y + 11, 0, 15.6, { garden: true });
      // corner turrets
      for (let q = 0; q < 4; q++) {
        const a = pa + PI / 4 + (q / 4) * TAU;
        this.tower(Math.cos(a) * 21, Math.sin(a) * 21, 1.7, 20, 'spire');
      }
      this.cols.push({ x: 0, z: 0, r: 18.8, y1: y + 11 });
      return { r: 24, tip: y + 50, ports: [{ x: 0, z: 0, pr: 14.6, y: y + 15 }] };
    }
    if (kind === 'crystalTower') {
      const y = plinth(20);
      this.drum(0, y, 0, 11, 13, { seg: 8, floors: 3 });
      // leaning Gothic buttresses
      for (let i = 0; i < 8; i++) {
        const a = pa + (i / 8) * TAU + PI / 8, bx = Math.cos(a) * 12.8, bz = Math.sin(a) * 12.8;
        this.add(M.stone, new THREE.BoxGeometry(1.4, 22, 2.2), M4(bx, y + 11, bz, 0, -a, 0).multiply(M4(0, 0, 0, 0, 0, 0)));
        this.add(M.gold, new THREE.ConeGeometry(0.9, 4, 4), M4(bx, y + 24, bz));
        this.add(M.stone, new THREE.BoxGeometry(3.4, 1, 1.2), M4(Math.cos(a) * 11.6, y + 18, Math.sin(a) * 11.6, 0, -a, 0));
      }
      // the shaft: glowing core in a stone frame
      const H = 64, cy = y + 13;
      this.add(M.energy, new THREE.CylinderGeometry(2.4, 3, H, 24), M4(0, cy + H / 2, 0));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        this.add(M.stone, new THREE.BoxGeometry(0.9, H, 1.2), M4(Math.cos(a) * 4.1, cy + H / 2, Math.sin(a) * 4.1, 0, -a, 0));
      }
      for (let k = 0; k <= 8; k++) {
        this.add(M.gold, ring(4.4, 0.25, 8), M4(0, cy + k * (H / 8), 0, 0, PI / 8, 0));
        if (k % 2 === 0) this.add(M.trim, uvs(new THREE.CylinderGeometry(4.5, 4.5, 1, 8, 1, true), 8, 1), M4(0, cy + k * (H / 8) + 0.8, 0, 0, PI / 8, 0));
      }
      this.pinnacles(0, cy + H, 0, 4.4, 8, 6, 0.45, PI / 8);
      this.add(M.stone, new THREE.ConeGeometry(4.2, 10, 8), M4(0, cy + H + 5, 0, 0, PI / 8, 0));
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), M.energy);
      c.scale.set(1, 1.7, 1);
      c.position.set(0, cy + H + 15, 0);
      this.group.add(c);
      this.spin.push([c, 0.5, 'y']);
      // a beam of light up to the surface
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.4, 220, 16, 1, true), this.M.rays);
      attr1(beam.geometry, 'aPh', () => 1);
      beam.position.set(0, cy + H + 125, 0);
      beam.rotation.x = PI; // brightest at the crystal
      this.life.add(beam);
      this.makeDoor(this.B, pa, 14.3, y, { porchFrom: 9.6 });
      this.cols.push({ x: 0, z: 0, r: 12.5, y1: y + 13 }, { x: 0, z: 0, r: 4.8, y1: cy + H + 8 });
      return { r: 20, tip: cy + H + 20, ports: [{ x: 0, z: 0, pr: 10.8, y: y + 9 }] };
    }
    if (kind === 'spiral') {
      const y = plinth(18);
      for (let q = 0; q < 4; q++) {
        const a = pa + (q / 4) * TAU + PI / 4;
        this.tower(Math.cos(a) * 14, Math.sin(a) * 14, 2, 16, 'dome');
      }
      const s = this.spiral(0, 0, 10, 54, 4.5, pa - 4.9);
      this.makeDoor(this.B, pa, 16, y, { porchFrom: 9.2 });
      this.cols.push({ x: 0, z: 0, r: 13, y1: 54 });
      return { r: 18, tip: s.tip, ports: [{ x: 0, z: 0, pr: 12.4, y: 16 }] };
    }
    if (kind === 'crystals') {
      const y = plinth(20);
      this.drum(0, y, 0, 12, 9, { floors: 2, seg: 56 });
      this.dome(0, y + 9, 0, 11.6, { lantern: false, garden: true });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + rnd() * 0.3, d = 15 + rnd() * 3, h = 16 + rnd() * 26;
        if (Math.abs(Math.atan2(Math.sin(a - pa), Math.cos(a - pa))) < 0.5) continue; // the way to the door stays free
        this.crystal(Math.cos(a) * d, y - 1, Math.sin(a) * d, 1.6 + rnd() * 1.4, h, Math.cos(a) * 0.22, Math.sin(a) * 0.22);
      }
      this.crystal(0, y + 9, 0, 3, 46, 0, 0);
      this.makeDoor(this.B, pa, 14.8, y, { porchFrom: 11.4 });
      this.cols.push({ x: 0, z: 0, r: 13, y1: y + 9 }, { x: 0, z: 0, r: 3.4, y1: y + 60 });
      return { r: 20, tip: y + 64, ports: [{ x: 0, z: 0, pr: 11.8, y: y + 6 }] };
    }
    if (kind === 'ringCitadel') {
      let y = 0, rr = 23;
      for (let k = 0; k < 4; k++) {
        this.drum(0, y, 0, rr, 4.6, { floors: 1, seg: 72, plinth: k === 0 });
        y += 4.6;
        for (let i = 0; i < Math.round(rr * 0.8); i++) {
          const a = rnd() * TAU, d = rr - 1.5 - rnd() * 2;
          this.coral(Math.cos(a) * d, y, Math.sin(a) * d, this.theme.corals[(rnd() * this.theme.corals.length) | 0], 0.7 + rnd() * 0.6);
        }
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          this.lamp(Math.cos(a) * (rr - 0.6), Math.sin(a) * (rr - 0.6), 2.2, y);
        }
        rr -= 4.4;
      }
      const t = this.tier(0, 0, rr * 0.9, 26);
      this.makeDoor(this.B, pa, 23.25, 0, { porchFrom: 0, w: 4.2, h: 4.2 });
      this.cols.push({ x: 0, z: 0, r: 23.5, y1: 4.6 }, { x: 0, z: 0, r: 18.6, y1: 9.2 }, { x: 0, z: 0, r: 14.2, y1: 13.8 }, { x: 0, z: 0, r: 9.8, y1: 18.4 });
      return { r: 23, tip: t.tip + 18, ports: [{ x: 0, z: 0, pr: 14, y: 11.6 }] };
    }
    if (kind === 'twinTowers') {
      const y = plinth(20);
      const px = -Math.sin(pa), pz = Math.cos(pa); // across the way to the plaza
      const ta = this.tower(px * 10, pz * 10, 5.6, 50, 'crown'), tb = this.tower(-px * 10, -pz * 10, 5.6, 50, 'crown');
      for (const h of [16, 28, 40]) this.tube(new THREE.Vector3(px * 4.6, h, pz * 4.6), new THREE.Vector3(-px * 4.6, h, -pz * 4.6), 0);
      this.drum(0, y, 0, 4, 7, { floors: 2, seg: 32 });
      this.dome(0, y + 7, 0, 3.9, { garden: false });
      this.cols.push({ x: 0, z: 0, r: 4.6, y1: y + 7 });
      this.makeDoor(this.B, pa, 7.6, y, { porchFrom: 3.6 });
      // the forge: a glowing orb held by spinning golden rings
      const orb = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 20), M.energy);
      orb.position.set(0, 22, 0);
      this.group.add(orb);
      for (let i = 0; i < 3; i++) {
        const rg = new THREE.Mesh(new THREE.TorusGeometry(3 + i * 0.6, 0.16, 8, 64), M.gold);
        rg.position.set(0, 22, 0);
        rg.rotation.x = i * 0.9;
        this.group.add(rg);
        this.spin.push([rg, 0.3 + i * 0.15, 'xy']);
      }
      this.cols.push({ x: 0, y: 22, z: 0, r: 4.4, sphere: 1 });
      return { r: 20, tip: Math.max(ta.tip, tb.tip), ports: [{ x: px * 10, z: pz * 10, pr: 5.4, y: 12 }, { x: -px * 10, z: -pz * 10, pr: 5.4, y: 14 }] };
    }
    // domeCluster
    const y = plinth(22);
    this.drum(0, y, 0, 13, 9, { floors: 2, seg: 56 });
    this.dome(0, y + 9, 0, 12.6, { garden: true });
    for (let i = 0; i < 5; i++) {
      const a = pa + PI / 5 + (i / 5) * TAU, x = Math.cos(a) * 19.5, z = Math.sin(a) * 19.5;
      this.drum(x, y, z, 4.6, 6, { floors: 2 });
      this.dome(x, y + 6, z, 4.4, { garden: true });
      this.tube(new THREE.Vector3(Math.cos(a) * 13.4, y + 4, Math.sin(a) * 13.4), new THREE.Vector3(Math.cos(a) * 15.2, y + 4, Math.sin(a) * 15.2), 0);
      this.cols.push({ x, z, r: 5.2, y1: y + 6 });
    }
    this.cols.push({ x: 0, z: 0, r: 13.6, y1: y + 9 });
    this.makeDoor(this.B, pa, 15.6, y, { porchFrom: 12.4 });
    return { r: 25, tip: y + 36, ports: [{ x: 0, z: 0, pr: 12.8, y: y + 5 }] };
  }

  // a Gothic gable on the drum: pointed roof front with a glowing rose window
  gable(a, rr, y, w, h, door = false) {
    const M = this.M, P = M4(Math.cos(a) * rr, y, Math.sin(a) * rr, 0, -a + PI / 2, 0);
    const L = (mat, geo, m) => this.add(mat, geo, P.clone().multiply(m));
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0);
    sh.lineTo(w / 2, 0);
    sh.lineTo(w / 2, h * 0.55);
    sh.lineTo(0, h);
    sh.lineTo(-w / 2, h * 0.55);
    sh.closePath();
    L(M.ashlar, new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false }), M4(0, 0, -1));
    L(M.gold, new THREE.TorusGeometry(2.6, 0.22, 6, 32), M4(0, h * 0.5, 2.05));
    L(M.energy, new THREE.CircleGeometry(2.5, 32), M4(0, h * 0.5, 2.02));
    for (let i = 0; i < 8; i++) L(M.gold, new THREE.BoxGeometry(0.12, 5, 0.1), M4(0, h * 0.5, 2.1, 0, 0, (i / 8) * PI));
    if (!door) {
      L(M.warm, new THREE.PlaneGeometry(2.6, 4.4), M4(0, 2.4, 2.03));
      L(M.gold, new THREE.BoxGeometry(3.2, 0.25, 0.3), M4(0, 4.7, 2.1));
    }
    this.pinnacles(Math.cos(a) * (rr + 2), y + h * 0.55, Math.sin(a) * (rr + 2), w / 2, 2, 3.5, 0.3, a + PI / 2);
  }

  // The secret door: a small glowing archway (the sub just fits through). inward = the exit inside the hall.
  makeDoor(B, a, r, y0, { porchFrom = 0, w = 4.4, h = 5.4, inward = false, parent = this.group } = {}) {
    const M = this.M;
    const P = M4(Math.cos(a) * r, y0, Math.sin(a) * r, 0, inward ? -a - PI / 2 : -a + PI / 2, 0); // local +z: the way out
    const L = (mat, geo, m) => B.add(mat, geo, P.clone().multiply(m));
    const sh = new THREE.Shape(), sp = h - w / 2;
    sh.moveTo(-w / 2, 0);
    sh.lineTo(w / 2, 0);
    sh.lineTo(w / 2, sp);
    sh.absarc(0, sp, w / 2, 0, PI, false);
    sh.closePath();
    const surf = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), M.portal);
    surf.applyMatrix4(P.clone().multiply(M4(0, 0, 0.12)));
    surf.renderOrder = 2;
    parent.add(surf);
    // pillars, a golden arch with a gem, lamps on both sides, a step
    for (const sx of [-1, 1]) {
      L(M.ashlar, new THREE.BoxGeometry(0.9, sp, 0.9), M4(sx * (w / 2 + 0.45), sp / 2, 0));
      L(M.gold, new THREE.BoxGeometry(1.1, 0.3, 1.1), M4(sx * (w / 2 + 0.45), sp, 0));
      L(M.gold, new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6), M4(sx * (w / 2 + 1.3), 0.6, 0.4));
      L(M.warm, new THREE.SphereGeometry(0.3, 10, 8), M4(sx * (w / 2 + 1.3), 1.4, 0.4));
    }
    L(M.ashlar, new THREE.TorusGeometry(w / 2 + 0.45, 0.45, 8, 24, PI), M4(0, sp, 0));
    L(M.gold, new THREE.TorusGeometry(w / 2 + 0.92, 0.1, 6, 24, PI), M4(0, sp, 0.2));
    L(M.energy, new THREE.OctahedronGeometry(0.42, 0), M4(0, h + 0.55, 0.3, 0, 0, 0, 1, 1.4, 1));
    L(M.stone2, new THREE.BoxGeometry(w + 2.4, 0.3, 2.2), M4(0, -0.15, 0.6));
    // a short porch through thick walls
    const depth = porchFrom > 0 ? r - porchFrom : 0;
    if (depth > 0.5) {
      for (const sx of [-1, 1]) L(M.ashlar, new THREE.BoxGeometry(0.9, h + 0.6, depth), M4(sx * (w / 2 + 0.45), (h + 0.6) / 2, -depth / 2));
      L(M.ashlar, new THREE.BoxGeometry(w + 1.8, 0.9, depth), M4(0, h + 1.05, -depth / 2));
      L(M.trim, uvs(new THREE.BoxGeometry(w + 1.9, 0.4, depth + 0.05), 3, 1), M4(0, h + 0.4, -depth / 2));
      L(M.gold, new THREE.BoxGeometry(w + 1.9, 0.12, depth + 0.1), M4(0, h + 1.55, -depth / 2));
    }
    if (!inward) this.door = { a, r, y0, w, h };
    return surf;
  }

  // The hidden hall: a round treasure hall under a starry dome, mystic spotlights, and the fable creature of
  // this trench. It is only shown while the sub is inside (the city is hidden then) – so nobody sees the
  // creature from outside, and the hall can be much bigger than the building around it.
  buildHall() {
    const M = this.M, T = this.theme, rnd = this.r, D = this.door;
    const hall = (this.hall = new THREE.Group());
    hall.position.copy(this.center);
    hall.visible = false;
    this.scene.add(hall);
    const B = new Merger();
    const f = buildFable(this.levelId, this.subLen * 4); // 4 × as big as the sub
    const RR = (this.hallR = Math.max(26, f.extent * 1.45)), H = (this.hallH = Math.max(13, f.extent * 0.6));
    const dais = Math.max(7.5, f.extent * 0.42);
    // floor, walls with windows (seen from inside), golden bands, a starry dome
    B.add(M.mosaic, new THREE.CircleGeometry(RR * 0.62, 64), M4(0, 0.06, 0, -PI / 2, 0, 0));
    B.add(M.paving, uvs(new THREE.RingGeometry(RR * 0.62, RR + 0.5, 64, 1), RR / 9, RR / 9), M4(0, 0.03, 0, -PI / 2, 0, 0));
    this.wallMat = M.facade.clone();
    this.wallMat.side = THREE.BackSide;
    B.add(this.wallMat, uvs(new THREE.CylinderGeometry(RR, RR, H, 80, 1, true), Math.round((TAU * RR) / 2.4 / 4), 2), M4(0, H / 2, 0));
    for (const y of [0.25, H]) B.add(M.gold, ring(RR - 0.1, 0.22, 80), M4(0, y, 0));
    const sky = document.createElement('canvas');
    sky.width = 1024;
    sky.height = 512;
    const g = sky.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#0a1440');
    grd.addColorStop(1, css(new THREE.Color(T.water).multiplyScalar(0.55)));
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 520; i++) {
      const x = rnd() * 1024, y = rnd() * 460, s = rnd() < 0.08 ? 2.6 : 1 + rnd();
      g.fillStyle = rnd() < 0.3 ? css(T.metal) : '#eaf6ff';
      g.globalAlpha = 0.5 + rnd() * 0.5;
      g.beginPath();
      g.arc(x, y, s, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 0.55;
    g.strokeStyle = css(T.metal);
    g.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      g.beginPath();
      g.moveTo((i / 16) * 1024, 0);
      g.lineTo((i / 16) * 1024, 512);
      g.stroke();
    }
    for (const y of [120, 260, 400]) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(1024, y);
      g.stroke();
    }
    g.globalAlpha = 1;
    const skyTex = tex(sky, false);
    this.textures.push(skyTex);
    this.hallSky = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    B.add(this.hallSky, new THREE.SphereGeometry(RR, 56, 20, 0, TAU, 0, PI / 2), M4(0, H, 0, 0, 0, 0, 1, 0.62, 1));
    // columns along the wall
    const nCol = Math.round(RR * 0.55);
    for (let i = 0; i < nCol; i++) {
      const a = D.a + PI / nCol + (i / nCol) * TAU, x = Math.cos(a) * (RR - 2.4), z = Math.sin(a) * (RR - 2.4);
      B.add(M.stone2, new THREE.BoxGeometry(1.6, 0.8, 1.6), M4(x, 0.4, z, 0, -a, 0));
      B.add(M.stone, new THREE.CylinderGeometry(0.55, 0.65, H - 1.6, 14), M4(x, 0.8 + (H - 1.6) / 2, z));
      B.add(M.gold, new THREE.BoxGeometry(1.5, 0.6, 1.5), M4(x, H - 0.5, z, 0, -a, 0));
      B.add(M.gold, ring(0.7, 0.1, 14), M4(x, H - 1.0, z));
    }
    // treasure between the columns: heaps of gold, chests, glowing gems
    const gems = [T.glow, 0xff4fa8, 0x46ff8a, 0xffd84a, 0x8a6aff];
    this.gemMeshes = [];
    for (let i = 0; i < nCol; i++) {
      const a = D.a + (i / nCol) * TAU, d = RR - 6 - rnd() * 2, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(Math.atan2(Math.sin(a - D.a), Math.cos(a - D.a))) < 0.5) continue; // free way from the door
      B.add(M.gold, new THREE.ConeGeometry(1.4 + rnd() * 0.8, 1 + rnd() * 0.8, 14), M4(x, 0.5, z));
      for (let k = 0; k < 6; k++) B.add(M.gold, new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), M4(x + (rnd() - 0.5) * 4, 0.05, z + (rnd() - 0.5) * 4, (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4));
      if (i % 2 === 0) {
        const cm = M4(x - Math.cos(a) * 2.2, 0, z - Math.sin(a) * 2.2, 0, -a + PI / 2, 0);
        B.add(M.stone2, new THREE.BoxGeometry(1.8, 1.0, 1.1), cm.clone().multiply(M4(0, 0.5, 0)));
        B.add(M.gold, new THREE.BoxGeometry(1.85, 0.12, 1.15), cm.clone().multiply(M4(0, 1.02, 0)));
        B.add(M.stone2, new THREE.BoxGeometry(1.8, 0.45, 1.1), cm.clone().multiply(M4(0, 1.45, -0.5, -1.0, 0, 0)));
        B.add(M.warm, new THREE.SphereGeometry(0.7, 14, 8, 0, TAU, 0, PI / 2), cm.clone().multiply(M4(0, 1.0, 0, 0, 0, 0, 1.15, 0.45, 0.7)));
      }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: gems[i % gems.length] }));
      gem.position.set(x + Math.cos(a + 1) * 1.2, 1.6, z + Math.sin(a + 1) * 1.2);
      gem.scale.set(1, 1.5, 1);
      hall.add(gem);
      this.gemMeshes.push(gem);
    }
    // a round dais in the middle with a glowing ring
    B.add(M.stone2, new THREE.CylinderGeometry(dais, dais + 0.7, 0.9, 72), M4(0, 0.45, 0));
    B.add(M.glow, ring(dais + 0.1, 0.18, 72), M4(0, 0.92, 0));
    B.add(M.gold, ring(dais + 0.75, 0.14, 72), M4(0, 0.1, 0));
    // the way out
    this.makeDoor(B, D.a, RR - 0.15, 0, { inward: true, parent: hall });
    B.build(hall);
    // the creature, facing the door
    const ry = Math.atan2(Math.cos(D.a), Math.sin(D.a)) + (this.levelId === 'kuril' ? 0.5 : 0);
    f.group.rotation.y = ry;
    const c = f.center.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const lift = 1.6 + Math.max(0.8, f.extent * 0.05) - f.bottom;
    f.group.position.set(-c.x, lift, -c.z);
    hall.add(f.group);
    this.fable = f;
    this.fableC = new THREE.Vector3(0, lift + f.center.y, 0);
    this.fableR = f.extent * 0.34;
    // mystic spotlights: coloured beams from the dome onto the creature, three coloured lamps
    const cols = [T.glow, 0xff6ad8, 0xffd27a, 0x8a7aff, 0x6affc0, 0xffffff];
    this.spots = [];
    for (let i = 0; i < 6; i++) {
      const a = D.a + 0.5 + (i / 6) * TAU, src = new THREE.Vector3(Math.cos(a) * (RR - 5), H + RR * 0.3, Math.sin(a) * (RR - 5));
      const dir = this.fableC.clone().sub(src), len = dir.length() + 4;
      const geo = new THREE.CylinderGeometry(0.5, Math.max(4.8, f.extent * 0.32), len, 24, 1, true).translate(0, -len / 2, 0);
      attr1(geo, 'aPh', () => i * 1.7);
      const mat = M.rays.clone();
      mat.uniforms = { uC: { value: new THREE.Color(cols[i]) }, uT: this.uT };
      const cone = new THREE.Mesh(geo, mat);
      cone.position.copy(src);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
      cone.userData.base = cone.quaternion.clone();
      hall.add(cone);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: cols[i] }));
      lamp.position.copy(src);
      hall.add(lamp);
      this.spots.push(cone);
    }
    this.hallLights = [T.glow, 0xff6ad8, 0xffd27a].map((cl) => {
      const L = new THREE.PointLight(cl, 70, Math.max(60, RR * 2.2), 1);
      hall.add(L);
      return L;
    });
    // sparkles floating in the hall
    const n = 360, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * (RR - 2);
      pos.set([Math.cos(a) * d, 0.5 + rnd() * (H + 10), Math.sin(a) * d], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.hallSparks = new THREE.Points(pg, new THREE.PointsMaterial({ map: softDot(), color: T.glow, size: 0.5, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    hall.add(this.hallSparks);
  }

  // ------------------------------------------------ inside / outside
  // 'enter' when the sub swims into the door, 'exit' when it swims into the way out (inside the hall)
  portalCheck(sub) {
    const D = this.door;
    if (!D || this.rise < 1) return null;
    const lx = sub.pos.x - this.center.x, ly = sub.pos.y - this.center.y, lz = sub.pos.z - this.center.z;
    const ca = Math.cos(D.a), sa = Math.sin(D.a);
    const radial = lx * ca + lz * sa, lateral = -lx * sa + lz * ca;
    const out = -Math.sin(sub.yaw) * ca - Math.cos(sub.yaw) * sa; // >0: the sub looks outwards
    if (!this.inside) {
      if (Math.abs(lateral) < D.w / 2 + 0.5 && ly > D.y0 - 0.8 && ly < D.y0 + D.h + 0.6 && radial < D.r + 2.7 && radial > D.r - 7 && out < -0.2) return 'enter';
    } else if (Math.abs(lateral) < D.w / 2 + 0.8 && ly < D.h + 1 && radial > this.hallR - 3.6 && out > 0.2) return 'exit';
    return null;
  }

  enter(sub, near = false) {
    const D = this.door;
    this.rise = 1;
    this.group.scale.set(1, 1, 1);
    this.inside = true;
    this.group.visible = this.life.visible = false;
    this.hall.visible = true;
    const rr = near ? Math.min(this.hallR - 5, this.fableR + 7) : this.hallR - 6;
    sub.pos.set(this.center.x + Math.cos(D.a) * rr, this.center.y + Math.max(3.2, this.fableC.y * (near ? 0.8 : 0.55)), this.center.z + Math.sin(D.a) * rr);
    sub.vel.set(0, 0, 0);
    sub.yaw = Math.atan2(Math.cos(D.a), Math.sin(D.a));
    this.metFable = true;
  }

  exit(sub) {
    const D = this.door;
    this.inside = false;
    this.group.visible = true;
    this.life.visible = this.rise > 0.55;
    this.hall.visible = false;
    sub.pos.set(this.center.x + Math.cos(D.a) * (D.r + 6), this.center.y + D.y0 + 2.6, this.center.z + Math.sin(D.a) * (D.r + 6));
    sub.vel.set(0, 0, 0);
    sub.yaw = Math.atan2(-Math.cos(D.a), -Math.sin(D.a));
  }

  // the hall's walls, floor and dome keep the sub (and the camera) inside; the creature is solid
  hallLimit(p, margin, floor) {
    const lx = p.x - this.center.x, lz = p.z - this.center.z;
    const d = Math.hypot(lx, lz), maxR = this.hallR - margin;
    if (d > maxR) {
      p.x = this.center.x + (lx / d) * maxR;
      p.z = this.center.z + (lz / d) * maxR;
    }
    const dd = Math.min(Math.hypot(p.x - this.center.x, p.z - this.center.z), this.hallR - 0.01);
    const top = this.center.y + this.hallH + 0.62 * Math.sqrt(this.hallR * this.hallR - dd * dd) - margin;
    p.y = Math.max(this.center.y + floor, Math.min(top, p.y));
  }

  clampCam(cam) {
    if (this.inside) this.hallLimit(cam, 0.9, 0.7);
  }

  // the camera direction for a nice first look at the creature
  get hallCamDir() {
    return new THREE.Vector3(Math.cos(this.door.a), 0, Math.sin(this.door.a));
  }

  // ------------------------------------------------ the whole city
  build() {
    const M = this.M, T = this.theme, rnd = this.r;
    // platform (paving) and a skirt down the slope
    this.add(M.paving, uvs(new THREE.CylinderGeometry(R, R + 4, 3, 72), R / 9, 1), M4(0, -1.5, 0));
    this.add(M.stone2, new THREE.CylinderGeometry(R + 4, R + 22, 160, 72, 1, true), M4(0, -83, 0));
    this.add(M.gold, ring(R + 0.1, 0.3, 96), M4(0, 0.05, 0));
    // the centrepiece
    const pa = rnd() * TAU;
    const C = this.centre(T.centre, pa);
    this.sites.push({ x: 0, z: 0, r: C.r, top: C.tip, centre: true });
    // the plaza in front of it
    const pd = C.r + 13.5, prad = 12;
    const px = Math.cos(pa) * pd, pz = Math.sin(pa) * pd;
    this.plaza = { x: px, z: pz, r: prad, a: pa };
    this.buildPlaza(px, pz, prad, pa, C.r);
    this.sites.push({ x: px, z: pz, r: prad + 1, plaza: true });
    // inner and outer ring of buildings
    const ring1 = this.placeRing(T.inner, 35, 3, pa, 0.62, 8.5);
    const ring2 = this.placeRing(T.outer, 56, 4, pa + 0.3, 0.28, 8);
    // glass tubes: centre → inner buildings, inner → outer neighbours, inner neighbours
    const centreSite = this.sites[0];
    const cports = (C.ports || []).map((p) => ({ ...p, site: centreSite }));
    let made = 0;
    const tryTube = (a, b, sag) => {
      if (made >= T.tubes) return;
      const d = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
      const p0 = new THREE.Vector3(a.x + d.x * a.pr, a.y, a.z + d.z * a.pr);
      const p1 = new THREE.Vector3(b.x - d.x * b.pr, b.y, b.z - d.z * b.pr);
      if (p0.distanceTo(p1) < 3) return;
      // keep clear of other buildings
      for (let k = 1; k < 10; k++) {
        const q = p0.clone().lerp(p1, k / 10);
        for (const st of this.sites) if (st !== (a.site || a) && st !== (b.site || b) && Math.hypot(q.x - st.x, q.z - st.z) < st.r + 1.6) return;
      }
      this.tube(p0, p1, sag);
      made++;
    };
    ring1.forEach((st, i) => {
      if (i % 2 || !cports.length) return;
      const cp = cports.map((p) => [Math.hypot(p.x - st.x, p.z - st.z), p]).sort((x, y) => x[0] - y[0])[0][1];
      tryTube(cp, st, 3 + rnd() * 6);
    });
    ring1.forEach((st) => {
      const near = ring2.map((o) => [Math.hypot(o.x - st.x, o.z - st.z), o]).sort((x, y) => x[0] - y[0])[0];
      if (near && near[0] < 36) tryTube(st, near[1], -2 + rnd() * 7);
    });
    for (let i = 0; i < ring1.length && made < T.tubes; i++) tryTube(ring1[i], ring1[(i + 1) % ring1.length], 4);
    // aqueducts on free arcs between the rings
    for (let k = 0; k < T.aqueducts; k++) {
      const a0 = pa + PI * 0.35 + k * PI * 0.95 + rnd() * 0.3;
      this.aqueduct(k % 2 ? 66 : 46, a0, a0 + 1.4 + rnd() * 0.8, 9 + rnd() * 4);
    }
    // coral gardens & kelp
    for (let i = 0; i < 70; i++) {
      const a = rnd() * TAU, d = 20 + Math.sqrt(rnd()) * (R - 22);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.blocked(x, z, 1.5)) continue;
      const hex = T.corals[(rnd() * T.corals.length) | 0];
      for (let k = 0; k < 3; k++) this.coral(x + (rnd() - 0.5) * 5, 0, z + (rnd() - 0.5) * 5, hex, 0.7 + rnd() * 0.9);
    }
    for (let i = 0; i < 110; i++) {
      const a = rnd() * TAU, d = R - 10 + rnd() * 12;
      this.kelp(Math.cos(a) * d, Math.sin(a) * d, 8 + rnd() * 16);
    }
    for (let i = 0; i < 12; i++) {
      const a = rnd() * TAU, d = 28 + rnd() * 34, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!this.blocked(x, z, 1)) for (let k = 0; k < 3; k++) this.kelp(x + (rnd() - 0.5) * 4, z + (rnd() - 0.5) * 4, 5 + rnd() * 7);
    }
    // lamps along the paths
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU, x = Math.cos(a) * 45.5, z = Math.sin(a) * 45.5;
      if (!this.blocked(x, z, 1)) this.lamp(x, z, 3.2);
    }
    if (T.vents) this.buildVents();
    if (T.pearls) this.buildPearls();
    // light from above: shafts and three lamps for the stone
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU, d = rnd() * 55, h = 170;
      const g = new THREE.CylinderGeometry(2 + rnd() * 2.5, 7 + rnd() * 7, h, 20, 1, true);
      const ph = rnd() * 10;
      attr1(g, 'aPh', () => ph);
      const m = new THREE.Mesh(g, M.rays);
      m.position.set(Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d);
      m.rotation.set((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25);
      this.life.add(m);
    }
    const L1 = new THREE.PointLight(new THREE.Color(T.window).lerp(new THREE.Color(1, 1, 1), 0.5), 80, 210, 1);
    L1.position.set(0, 34, 0);
    const L2 = new THREE.PointLight(new THREE.Color(T.window), 45, 80, 1);
    L2.position.set(px, 9, pz);
    const L3 = new THREE.PointLight(T.glow, 40, 120, 1);
    L3.position.set(-Math.cos(pa) * 45, 18, -Math.sin(pa) * 45);
    this.group.add(L1, L2, L3);
    this.lights = [L2, L3];
    // glitter in the water
    const n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 85;
      pos.set([Math.cos(a) * d, 2 + rnd() * 70, Math.sin(a) * d], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.glitter = new THREE.Points(pg, new THREE.PointsMaterial({ map: softDot(), color: T.glow, size: 0.7, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.life.add(this.glitter);
  }

  // buildings on a ring, avoiding the plaza and each other
  placeRing(types, rad, jitter, pa, gap, maxR) {
    const rnd = this.r, T = this.theme, out = [];
    const n = types.length, span = TAU - gap * 2;
    for (let i = 0; i < n; i++) {
      const kind = types[i];
      // size first (the footprint decides where it fits)
      let r, foot, terraced = false, h = 0;
      if (kind === 'dome') {
        r = 5.5 + rnd() * (maxR - 5.5);
        terraced = rnd() > 0.5;
        foot = r + (terraced ? 3.2 : 1);
      } else if (kind === 'tower') {
        r = 2.4 + rnd() * 2.2;
        h = 22 + rnd() * 24;
        foot = r + 1.6;
      } else if (kind === 'spiral') {
        r = 4.5 + rnd() * 1.5;
        h = 26 + rnd() * 12;
        foot = r + 2.4;
      } else if (kind === 'terrace') {
        r = 7 + rnd() * 1.5;
        foot = r + 1.2;
      } else if (kind === 'tier') {
        r = 3 + rnd() * 1.4;
        h = 18 + rnd() * 14;
        foot = r * 1.8;
      } else {
        r = 6.5;
        foot = r + 1;
      }
      const a0 = pa + gap + ((i + 0.5) / n) * span + (rnd() - 0.5) * 0.12;
      const d0 = rad + (rnd() - 0.5) * jitter * 2;
      let spot = null;
      for (const [da, dd] of [[0, 0], [0.12, 0], [-0.12, 0], [0, 4], [0.2, 3], [-0.2, 3], [0, 8], [0.3, 6], [-0.3, 6]]) {
        const x = Math.cos(a0 + da) * (d0 + dd), z = Math.sin(a0 + da) * (d0 + dd);
        if (Math.hypot(x, z) + foot > R - 3) continue;
        if (!this.blocked(x, z, foot + 1.5)) {
          spot = [x, z];
          break;
        }
      }
      if (!spot) continue;
      const [x, z] = spot;
      let res;
      if (kind === 'dome') {
        let y = 0;
        const rd = terraced ? r - 0.2 : r;
        if (terraced) {
          for (let k = 0; k < 3; k++) this.drum(x, y + k * 3.2, z, rd + 2.8 - k * 1.1, 3.2, { floors: 1, plinth: k === 0 });
          y = 9.6;
        }
        const hd = 5 + rnd() * 3;
        this.drum(x, y, z, rd, hd, { floors: 2, plinth: !terraced });
        this.dome(x, y + hd, z, rd * 0.98);
        this.cols.push({ x, z, r: rd + (terraced ? 2.9 : 0.9), y1: y + hd });
        res = { y: y + hd * 0.5, pr: rd * 0.97, tip: y + hd + rd * 1.4 };
      } else if (kind === 'tower') res = this.tower(x, z, r, h, T.towerTop[(rnd() * T.towerTop.length) | 0]);
      else if (kind === 'spiral') res = this.spiral(x, z, r, h, 3);
      else if (kind === 'terrace') res = this.terrace(x, z, r, 3);
      else if (kind === 'tier') res = this.tier(x, z, r, h);
      else res = this.crystals(x, z, r);
      const st = { x, z, r: foot, pr: res.pr, y: res.y, top: res.tip };
      this.sites.push(st);
      out.push(st);
    }
    return out;
  }

  buildPlaza(px, pz, rad, pa, cr) {
    const M = this.M, rnd = this.r;
    this.add(M.mosaic, new THREE.CircleGeometry(rad, 64), M4(px, 0.06, pz, -PI / 2, 0, 0));
    this.add(M.stone2, new THREE.CylinderGeometry(rad + 0.8, rad + 1, 0.5, 64, 1, true), M4(px, 0.25, pz));
    this.add(M.gold, ring(rad + 0.6, 0.15, 64), M4(px, 0.5, pz));
    // a broad paved way with steps up to the centrepiece
    const inner = cr - 2, len = Math.max(2, Math.hypot(px, pz) - rad - inner + 2);
    const wd = (inner + Math.hypot(px, pz) - rad) / 2;
    this.add(M.stone, new THREE.BoxGeometry(len, 0.4, 7), M4(Math.cos(pa) * wd, 0.2, Math.sin(pa) * wd, 0, -pa, 0));
    for (const sd of [-4, 4]) {
      for (let k = 0; k < 3; k++) {
        const t = (k + 0.5) / 3, d = inner + (Math.hypot(px, pz) - rad - inner) * t;
        this.lamp(Math.cos(pa) * d - Math.sin(pa) * sd, Math.sin(pa) * d + Math.cos(pa) * sd, 3.6);
      }
    }
    // columns (some broken), statues facing the middle, a fountain in the centre
    const nC = 14;
    for (let i = 0; i < nC; i++) {
      const off = (i / nC) * TAU, a = pa + PI + off;
      if (off < 0.5 || off > TAU - 0.5) continue; // open towards the centrepiece
      this.column(px + Math.cos(a) * (rad - 1.2), pz + Math.sin(a) * (rad - 1.2), 7 + rnd() * 2, rnd() < 0.22);
    }
    for (let i = 0; i < 6; i++) {
      const a = pa + ((i + 0.5) / 6 - 0.5) * PI * 1.4;
      const sx = px + Math.cos(a) * (rad - 4), sz = pz + Math.sin(a) * (rad - 4);
      this.statue(sx, sz, -a - PI / 2, i);
    }
    this.add(M.stone2, new THREE.CylinderGeometry(3.6, 3.9, 1.1, 32, 1, true), M4(px, 0.55, pz));
    this.add(M.gold, ring(3.62, 0.14, 32), M4(px, 1.1, pz));
    this.add(M.water, new THREE.CircleGeometry(3.5, 32), M4(px, 0.9, pz, -PI / 2, 0, 0));
    this.add(M.stone, new THREE.CylinderGeometry(1.1, 1.5, 2.4, 16), M4(px, 1.2, pz));
    this.cols.push({ x: px, z: pz, r: 4.2, y1: 2.4 });
  }

  buildVents() {
    const rnd = this.r, T = this.theme;
    for (let k = 0; k < 6; k++) {
      const a = rnd() * TAU, d = 30 + rnd() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.blocked(x, z, 2)) continue;
      this.add(this.M.stone2, new THREE.CylinderGeometry(1.2, 2.4, 3, 8), M4(x, 1.5, z));
      this.add(this.M.glow, new THREE.CircleGeometry(1.1, 12), M4(x, 3.02, z, -PI / 2, 0, 0));
      const n = 60, pos = new Float32Array(n * 3), sp = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set([x + (rnd() - 0.5), 3 + rnd() * 20, z + (rnd() - 0.5)], i * 3);
        sp[i] = 2 + rnd() * 3;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: softDot(), color: T.glow, size: 0.8, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.group.add(pts);
      this.vents.push({ pts, sp, x, z });
    }
  }

  buildPearls() {
    const rnd = this.r;
    for (let k = 0; k < 7; k++) {
      const a = rnd() * TAU, d = 26 + rnd() * 36, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.blocked(x, z, 2)) continue;
      // open giant shell with a glowing pearl
      this.add(this.M.stone, new THREE.SphereGeometry(2.4, 16, 8, 0, TAU, PI / 2, PI / 2), M4(x, 1.2, z, 0, 0, 0, 1, 0.5, 1));
      this.add(this.M.stone, new THREE.SphereGeometry(2.4, 16, 8, 0, TAU, PI / 2, PI / 2), M4(x, 1.6, z - 0.6, -2.3, 0, 0, 1, 0.5, 1));
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff0fa }));
      p.position.set(x, 1.9, z);
      this.group.add(p);
    }
  }

  // ------------------------------------------------ moving life: vehicles, pods, animals, fish, lanterns
  buildLife() {
    const T = this.theme, rnd = this.r;
    // pods in the tubes
    const podGeo = new THREE.CapsuleGeometry(0.72, 2.2, 6, 12).rotateX(PI / 2);
    const podMat = new THREE.MeshStandardMaterial({ color: 0xf2f6ff, metalness: 0.6, roughness: 0.25, emissive: new THREE.Color(T.window), emissiveIntensity: 0.55 });
    for (const p of this.pods) {
      p.mesh = new THREE.Mesh(podGeo, podMat);
      const lightBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), this.M.glow);
      lightBall.position.z = -1.9;
      p.mesh.add(lightBall);
      this.group.add(p.mesh);
    }
    // sleek vehicles with headlights on loops around the city
    const nV = 5;
    for (let i = 0; i < nV; i++) {
      const v = this.vehicle(i);
      const pts = [], rr = 40 + rnd() * 26, hy = 12 + rnd() * 26, k = 6;
      for (let j = 0; j < k; j++) {
        const a = (j / k) * TAU + i;
        pts.push(new THREE.Vector3(Math.cos(a) * (rr + (rnd() - 0.5) * 14), hy + (rnd() - 0.5) * 10, Math.sin(a) * (rr + (rnd() - 0.5) * 14)));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      if (i % 2) curve.points.reverse();
      this.life.add(v);
      this.vehicles.push({ v, curve, L: curve.getLength(), u: rnd(), speed: 6 + rnd() * 5 });
    }
    // whales, mantas, dolphins overhead
    const animal = (model, len, rr, hy, speed, n = 1, spread = 0) => {
      for (let i = 0; i < n; i++) {
        const o = buildModel(model);
        const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
        o.scale.multiplyScalar(len / Math.max(size.x, size.z, 0.01));
        this.life.add(o);
        this.animals.push({ o, model, rr: rr + (rnd() - 0.5) * spread, hy: hy + (rnd() - 0.5) * spread * 0.4, speed, ph: i * 0.18 + (n === 1 ? rnd() * TAU : 0), bob: rnd() * 10 });
      }
    };
    animal('humpback', 12, 70, 56, 0.045, 1);
    if (rnd() > 0.4) animal('humpback', 9, 80, 64, -0.036, 1);
    animal('manta', 6, 52, 40, -0.07, 2, 20);
    const podR = 48 + rnd() * 8, podPh = rnd() * TAU;
    for (let i = 0; i < 3; i++) {
      animal('dolphin', 2.8, podR + (rnd() - 0.5) * 4, 24 + (rnd() - 0.5) * 4, 0.16, 1);
      this.animals[this.animals.length - 1].ph = podPh + i * 0.05;
    }
    // fish schools
    for (let s = 0; s < 3; s++) {
      const n = 46, mesh = new THREE.InstancedMesh(fishGeometry(), fishMaterial(s === 1), n);
      mesh.frustumCulled = false;
      const col = new THREE.Color([0x9fd2ff, 0xffd76a, 0xe8f4ff][s]);
      const offs = [];
      for (let j = 0; j < n; j++) {
        mesh.setColorAt(j, col.clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.15));
        offs.push({ x: (rnd() - 0.5) * 10, y: (rnd() - 0.5) * 4, z: (rnd() - 0.5) * 10, ph: rnd() * 10, s: 2.2 + rnd() * 1.2 });
      }
      this.life.add(mesh);
      this.schools.push({ mesh, offs, rr: 30 + s * 14, hy: 16 + s * 9, speed: (s % 2 ? -1 : 1) * (0.07 + s * 0.02), ph: rnd() * TAU });
    }
    // floating lanterns (Jade Gardens) or glowing jellyfish lights – one instanced mesh
    const nL = T.lanterns ? 40 : 14;
    let fg;
    if (T.lanterns) fg = new THREE.CylinderGeometry(0.5, 0.6, 1.2, 8);
    else {
      const Mg = new Merger(), tmpM = new THREE.MeshBasicMaterial();
      Mg.add(tmpM, new THREE.SphereGeometry(0.9, 14, 8, 0, TAU, 0, PI / 2), null);
      for (let k = 0; k < 6; k++) Mg.add(tmpM, new THREE.CylinderGeometry(0.03, 0.03, 2.2, 3), M4(Math.cos(k) * 0.5, -1.1, Math.sin(k) * 0.5));
      const tmp = new THREE.Group();
      Mg.build(tmp);
      fg = tmp.children[0].geometry;
    }
    const fm = new THREE.MeshBasicMaterial({ color: T.lanterns ? new THREE.Color(T.window) : new THREE.Color(T.glow).lerp(new THREE.Color(1, 1, 1), 0.35), transparent: true, opacity: 0.85 });
    this.floatMesh = new THREE.InstancedMesh(fg, fm, nL);
    this.floatMesh.frustumCulled = false;
    for (let i = 0; i < nL; i++) {
      const a = rnd() * TAU, d = 15 + rnd() * 55;
      this.floaters.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, y: 8 + rnd() * 30, amp: 1.5 + rnd() * 2, sp: 0.3 + rnd() * 0.4, ph: rnd() * 10 });
    }
    this.life.add(this.floatMesh);
    // the water around the city: lighter towards the surface (fades in near Atlantis)
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(118, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: { uTop: { value: new THREE.Color(T.water).lerp(new THREE.Color(0xbff4ff), 0.55) }, uMid: { value: new THREE.Color(T.water) }, uLow: { value: new THREE.Color(T.water).multiplyScalar(0.45) }, uK: { value: 0 } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform float uK; varying vec3 vP; void main(){ float y = vP.y; vec3 c = mix(uMid, uTop, pow(max(y, 0.0), 0.8)); gl_FragColor = vec4(c, uK * smoothstep(-0.4, -0.05, y)); }',
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    );
    sky.renderOrder = -10;
    this.sky = sky;
    this.life.add(sky);
  }

  // a sleek underwater vehicle (original design): long body, swept fins, glowing canopy, two headlights and a beam
  vehicle(i) {
    const T = this.theme, g = new THREE.Group();
    if (!this.vehGeo) {
      const Bd = new Merger(), Gl = new Merger();
      const bodyM = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.35, emissive: 0x16283a, emissiveIntensity: 0.6 });
      const glowM = new THREE.MeshBasicMaterial({ vertexColors: true });
      const prof = [[0, -3.1], [0.45, -2.9], [0.9, -2.0], [1.05, -0.4], [0.95, 1.3], [0.62, 2.4], [0.25, 3.0], [0, 3.1]].map(([a, b]) => new THREE.Vector2(a, b));
      const hull = new THREE.LatheGeometry(prof, 20).rotateX(-PI / 2).scale(1, 0.62, 1);
      const body = 0xe6edf5, accent = 0x5a7a96;
      Bd.add(bodyM, paint(hull, body, 1.6), null);
      for (const sd of [-1, 1]) Bd.add(bodyM, paint(new THREE.BoxGeometry(3.2, 0.1, 1.3), accent, 1.6), M4(sd * 1.7, -0.1, 0.9, 0, sd * 0.45, 0));
      Bd.add(bodyM, paint(new THREE.BoxGeometry(0.1, 1.1, 1.5), accent, 1.6), M4(0, 0.8, 2.0, -0.5, 0, 0));
      Gl.add(glowM, paint(new THREE.SphereGeometry(0.55, 14, 10), T.glow, 1.8), M4(0, 0.45, -1.4, 0, 0, 0, 1, 0.6, 1.8));
      for (const sd of [-0.45, 0.45]) Gl.add(glowM, paint(new THREE.SphereGeometry(0.18, 8, 6), 0xfff6d8, 2.2), M4(sd, -0.1, -2.95));
      Gl.add(glowM, paint(new THREE.SphereGeometry(0.3, 8, 6), new THREE.Color(T.window).getHex(), 2), M4(0, 0, 3.05));
      for (const sd of [-1, 1]) Gl.add(glowM, paint(new THREE.BoxGeometry(0.06, 0.06, 3.6), T.glow, 2), M4(sd * 0.98, 0.05, 0.2));
      const tmp = new THREE.Group();
      Bd.build(tmp);
      Gl.build(tmp);
      this.vehGeo = tmp.children.map((m) => [m.geometry, m.material]);
      this.vehBeam = new THREE.CylinderGeometry(0.4, 4.5, 22, 16, 1, true).rotateX(PI / 2).translate(0, 0, -14);
      attr1(this.vehBeam, 'aPh', () => 0);
    }
    for (const [geo, mat] of this.vehGeo) g.add(new THREE.Mesh(geo, mat));
    g.add(new THREE.Mesh(this.vehBeam, this.M.rays));
    return g;
  }

  buildPeople() {
    // Neptune on the fountain in the middle of the plaza
    const nep = buildNeptune();
    nep.group.scale.setScalar(3.2);
    this.nepBase = new THREE.Vector3(this.plaza.x, 2.4 + 6.2, this.plaza.z);
    nep.group.position.copy(this.nepBase);
    this.group.add(nep.group);
    this.neptune = nep;
    // the mermaid of Atlantis swims her rounds between the rings of buildings
    const mer = buildMerFigure(MER_PALETTES.atlantis);
    mer.group.scale.setScalar(1.8);
    this.life.add(mer.group);
    this.mermaid = mer;
    this.merA = 0;
  }

  // keep the sub above the platform and out of the buildings
  clampSub(sub) {
    if (this.inside) {
      this.hallLimit(sub.pos, 1.8, 1.4);
      const c = this.hall.position.clone().add(this.fableC), d = sub.pos.distanceTo(c), rr = this.fableR + 1.4;
      if (d < rr && d > 1e-3) {
        const n = sub.pos.clone().sub(c).divideScalar(d);
        sub.pos.addScaledVector(n, rr - d);
        const vn = sub.vel.dot(n);
        if (vn < 0) sub.vel.addScaledVector(n, -vn);
      }
      return;
    }
    const k = this.group.scale.y;
    const lx = sub.pos.x - this.center.x, lz = sub.pos.z - this.center.z, ly = (sub.pos.y - this.center.y) / Math.max(0.05, k);
    const d = Math.hypot(lx, lz);
    if (d > R + 4) return;
    const floor = this.center.y + 1.2 * k + 1.2;
    if (sub.pos.y < floor) {
      sub.pos.y = floor;
      if (sub.vel.y < 0) sub.vel.y = 0;
    }
    const pad = 1.3;
    for (const c of this.cols) {
      if (c.sphere) {
        const dx = lx - c.x, dy = ly - c.y, dz = lz - c.z, dd = Math.hypot(dx, dy, dz), rr = c.r + pad;
        if (dd < rr && dy > -1 && dd > 1e-3) {
          const push = rr - dd;
          sub.pos.x += (dx / dd) * push;
          sub.pos.y += (dy / dd) * push * k;
          sub.pos.z += (dz / dd) * push;
          const vn = (sub.vel.x * dx + sub.vel.y * dy + sub.vel.z * dz) / dd;
          if (vn < 0) sub.vel.addScaledVector(new THREE.Vector3(dx / dd, dy / dd, dz / dd), -vn);
        }
        continue;
      }
      let dx = lx - c.x, dz = lz - c.z, dd = Math.hypot(dx, dz);
      const rr = c.r + pad;
      if (dd < 1e-3) {
        dx = 1;
        dd = 1e-3;
      }
      if (dd < rr && ly < c.y1 + pad) {
        // above the roof edge: lift; otherwise push sideways
        if (ly > c.y1 - 1.5) {
          sub.pos.y = this.center.y + (c.y1 + pad) * k;
          if (sub.vel.y < 0) sub.vel.y = 0;
        } else {
          const ux = dd > 1e-3 ? dx / dd : 1, uz = dd > 1e-3 ? dz / dd : 0;
          sub.pos.x += ux * (rr - dd);
          sub.pos.z += uz * (rr - dd);
          const vn = sub.vel.x * ux + sub.vel.z * uz;
          if (vn < 0) {
            sub.vel.x -= ux * vn;
            sub.vel.z -= uz * vn;
          }
        }
      }
    }
  }

  // returns 'neptune' / 'mermaid' when the sub comes close to one of them for the first time
  update(dt, t, sub) {
    this.uT.value = t;
    if (this.inside) {
      this.fable.anim(t, dt, !!this.talking);
      this.spots.forEach((c, i) => {
        c.quaternion.copy(c.userData.base);
        c.rotateX(Math.sin(t * 0.5 + i) * 0.08);
        c.rotateZ(Math.cos(t * 0.4 + i * 1.3) * 0.08);
      });
      this.hallLights.forEach((L, i) => {
        const a = t * 0.35 + (i / 3) * TAU;
        const rr = this.fable.extent * 0.75;
        L.position.set(this.fableC.x + Math.cos(a) * rr, this.fableC.y + 3 + Math.sin(t * 0.7 + i) * 3, this.fableC.z + Math.sin(a) * rr);
        L.intensity = 60 + 15 * Math.sin(t * 1.7 + i * 2);
      });
      this.gemMeshes.forEach((g, i) => (g.rotation.y = t * 0.8 + i));
      this.hallSparks.rotation.y = t * 0.03;
      return null;
    }
    if (this.rise < 1) {
      this.rise = Math.min(1, this.rise + dt / 3.5);
      const k = this.rise * this.rise * (3 - 2 * this.rise);
      this.group.scale.set(1, 0.02 + 0.98 * k, 1);
      this.life.visible = this.rise > 0.55;
    }
    for (const [o, sp, ax] of this.spin) {
      if (ax === 'xy') {
        o.rotation.x += dt * sp * 0.5;
        o.rotation.y += dt * sp;
      } else o.rotation.y += dt * sp;
    }
    const tmp = new THREE.Vector3(), Zax = new THREE.Vector3(0, 0, -1), q = new THREE.Quaternion();
    for (const p of this.pods) {
      p.u += (p.dir * p.speed * dt) / p.L;
      if (p.u > 1 || p.u < 0) {
        p.dir *= -1;
        p.u = Math.min(1, Math.max(0, p.u));
      }
      p.curve.getPointAt(p.u, p.mesh.position);
      p.curve.getTangentAt(p.u, tmp).multiplyScalar(p.dir);
      p.mesh.quaternion.copy(q.setFromUnitVectors(Zax, tmp));
    }
    for (const V of this.vehicles) {
      V.u = (V.u + (V.speed * dt) / V.L) % 1;
      V.curve.getPointAt(V.u, V.v.position);
      V.curve.getTangentAt(V.u, tmp);
      V.v.quaternion.copy(q.setFromUnitVectors(Zax, tmp));
      V.v.rotateZ(Math.sin(t * 0.7 + V.L) * 0.15);
    }
    for (const A of this.animals) {
      const th = A.ph + t * A.speed;
      const s = Math.sign(A.speed) || 1;
      A.o.position.set(Math.cos(th) * A.rr, A.hy + Math.sin(t * 0.4 + A.bob) * 2, Math.sin(th) * A.rr);
      A.o.rotation.y = Math.atan2(Math.sin(th) * s, -Math.cos(th) * s);
      animUpper(A.o, A.model, t * (A.model === 'dolphin' ? 1.6 : 0.9) + A.bob);
    }
    const m4 = new THREE.Matrix4(), e = new THREE.Euler(), p3 = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const S of this.schools) {
      const th = S.ph + t * S.speed, sg = Math.sign(S.speed);
      const cx = Math.cos(th) * S.rr, cz = Math.sin(th) * S.rr, cy = S.hy + Math.sin(th * 1.5) * 3;
      const yaw = Math.atan2(Math.sin(th) * sg, -Math.cos(th) * sg);
      S.offs.forEach((o, j) => {
        const ph = o.ph + t;
        p3.set(cx + o.x + Math.sin(ph * 0.9) * 0.8, cy + o.y + Math.sin(ph * 1.3) * 0.4, cz + o.z + Math.cos(ph * 0.8) * 0.8);
        e.set(0, yaw + Math.sin(ph * 0.5) * 0.2, 0);
        m4.compose(p3, q.setFromEuler(e), sc.setScalar(o.s));
        S.mesh.setMatrixAt(j, m4);
      });
      S.mesh.instanceMatrix.needsUpdate = true;
    }
    this.floaters.forEach((f, i) => {
      p3.set(f.x, f.y + Math.sin(t * f.sp + f.ph) * f.amp, f.z);
      m4.compose(p3, q.identity(), sc.set(1 + Math.sin(t * 1.6 + f.ph) * 0.08, 1 - Math.sin(t * 1.6 + f.ph) * 0.12, 1 + Math.sin(t * 1.6 + f.ph) * 0.08));
      this.floatMesh.setMatrixAt(i, m4);
    });
    this.floatMesh.instanceMatrix.needsUpdate = true;
    // the bright water around the city follows the magic of the place (and stays centred on the camera height)
    this.sky.material.uniforms.uK.value = Math.min(1, (this.world.magic || 0) * 1.15);
    for (const V of this.vents) {
      const p = V.pts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.array[i * 3 + 1] + dt * V.sp[i];
        if (y > 26) y = 3;
        p.array[i * 3 + 1] = y;
      }
      p.needsUpdate = true;
    }
    this.glitter.rotation.y += dt * 0.02;
    this.lights.forEach((L, i) => (L.intensity = 38 + 10 * Math.sin(t * 1.3 + i * 2)));
    // Neptune turns towards the sub and blesses it now and then
    const local = this.group.worldToLocal(sub.pos.clone());
    const nepP = this.neptune.group.position;
    const toSubN = local.clone().sub(nepP);
    const dN = toSubN.length();
    this.neptune.group.rotation.y += (Math.atan2(-toSubN.x, -toSubN.z) - this.neptune.group.rotation.y) * Math.min(1, dt * 0.6);
    nepP.y = this.nepBase.y + Math.sin(t * 0.8) * 0.5;
    const cyc = t % 12;
    const bless = cyc > 8 ? Math.sin(((cyc - 8) / 4) * PI) : 0;
    animNeptune(this.neptune.rig, t, dt, { look: 0, near: dN < 45, bless });
    // the mermaid: rounds between the rings, a barrel roll now and then, waves when you are near
    this.merA += dt * 0.12;
    const mr = 45.5 + Math.sin(t * 0.3) * 1.2;
    const mp = new THREE.Vector3(Math.cos(this.merA) * mr, 12 + Math.sin(t * 0.7) * 3, Math.sin(this.merA) * mr);
    const prev = this.mermaid.group.position.clone();
    this.mermaid.group.position.copy(mp);
    const vel = mp.clone().sub(prev);
    if (vel.lengthSq() > 1e-6) {
      this.mermaid.group.rotation.order = 'YXZ';
      this.mermaid.group.rotation.y = Math.atan2(-vel.x, -vel.z);
      this.mermaid.group.rotation.x = Math.atan2(vel.y, Math.hypot(vel.x, vel.z)) * 0.8;
    }
    const rollCyc = t % 14;
    this.mermaid.group.rotation.z = rollCyc > 12 ? ((rollCyc - 12) / 2) * TAU : Math.sin(t * 0.5) * 0.15;
    const dM = local.distanceTo(mp);
    animMer(this.mermaid.rig, t, dt, 6, { wave: dM < 40 });
    let hello = null;
    if (dN < 45 && !this.metNeptune) {
      this.metNeptune = true;
      hello = 'neptune';
    } else if (dM < 32 && !this.metMermaid) {
      this.metMermaid = true;
      hello = 'mermaid';
    }
    return hello;
  }

  dispose() {
    this.scene.remove(this.group, this.life, this.hall);
    // the city's own geometry and materials (the animals share theirs with the rest of the game)
    this.group.traverse((o) => o.geometry && o.geometry.dispose());
    this.hall.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !Object.values(this.M).includes(o.material)) o.material.dispose();
    });
    Object.values(this.M).forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.world.magicCol = null;
  }
}

// Where Atlantis appears: the flattest stretch of trench floor near the sub (along the trench axis).
export function atlantisSpot(world, sub) {
  let best = null;
  for (let dx = -160; dx <= 160; dx += 16) {
    const x = Math.max(-700, Math.min(700, sub.pos.x + dx));
    const z = axisZ(x);
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      for (const f of [0, 0.5, 1]) {
        const h = world.heightAt(x + Math.cos(a) * R * f, z + Math.sin(a) * R * f);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    }
    const score = (hi - lo) + Math.abs(dx) * 0.05; // flat first, then close
    if (!best || score < best.score) best = { x, z, score };
  }
  return { x: best.x, z: best.z };
}
