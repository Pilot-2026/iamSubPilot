// Building blocks for more detailed animals: lofted bodies with painted
// (vertex-coloured) skin, thin fins, eyes with iris and highlight.
// Convention: head at -z, tail at +z, up = +y.

import * as THREE from './vendor/three.min.js';

const _c = new THREE.Color();
const _c2 = new THREE.Color();
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// A body of revolution with elliptic cross-sections.
// w(t), h(t): half width / half height at t (0 = snout, 1 = tail tip); y(t): centre line height.
// paint(t, a, out): skin colour at t and angle a around the body (0 = top, PI = belly).
export function loftBody({ len, w, h, y = () => 0, seg = 30, rad = 18, paint, n = null }) {
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const z = -len / 2 + t * len;
    const ww = Math.max(0.002, w(t)), hh = Math.max(0.002, h(t)), yy = y(t);
    for (let j = 0; j < rad; j++) {
      const a = (j / rad) * Math.PI * 2;
      let sx = Math.sin(a), cy = Math.cos(a);
      if (n) {
        // superellipse: n > 2 gives a boxier cross-section (sperm whale head)
        const e = 2 / n(t);
        sx = Math.sign(sx) * Math.pow(Math.abs(sx), e);
        cy = Math.sign(cy) * Math.pow(Math.abs(cy), e);
      }
      pos.push(sx * ww, yy + cy * hh, z);
      paint(t, a, _c);
      col.push(_c.r, _c.g, _c.b);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < rad; j++) {
      const a = i * rad + j, b = i * rad + ((j + 1) % rad), c = (i + 1) * rad + j, d = (i + 1) * rad + ((j + 1) % rad);
      idx.push(a, b, c, b, d, c);
    }
  }
  // close both ends (snout and tail) with a fan
  const f0 = pos.length / 3;
  pos.push(0, y(0), -len / 2);
  paint(0, Math.PI / 2, _c);
  col.push(_c.r, _c.g, _c.b);
  const f1 = f0 + 1;
  pos.push(0, y(1), len / 2);
  paint(1, Math.PI / 2, _c);
  col.push(_c.r, _c.g, _c.b);
  const last = seg * rad;
  for (let j = 0; j < rad; j++) {
    idx.push(f0, (j + 1) % rad, j);
    idx.push(f1, last + j, last + ((j + 1) % rad));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make sure the normals point outwards
  const nrm = g.attributes.normal;
  const mid = Math.floor(seg / 2) * rad;
  if (nrm.getY(mid) < 0) {
    const ix = g.index.array;
    for (let k = 0; k < ix.length; k += 3) {
      const tmp = ix[k + 1];
      ix[k + 1] = ix[k + 2];
      ix[k + 2] = tmp;
    }
    g.computeVertexNormals();
  }
  return g;
}

// Smooth curve through control points [[t, v], ...] (cosine blend between neighbours).
export function prof(pts) {
  return (t) => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
        const u = (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(u * Math.PI));
      }
    }
    return pts[pts.length - 1][1];
  };
}

// Typical fish/whale outline: blunt head, thick middle, thin tail stock.
export function fishProfile(t, { head = 0.18, peak = 0.35, tail = 0.06, blunt = 0.6 } = {}) {
  if (t < peak) {
    const u = t / peak;
    return Math.pow(Math.sin((u * Math.PI) / 2), blunt) * (1 - head) + head * u;
  }
  const u = (t - peak) / (1 - peak);
  return (1 - u) * (1 - u) * (1 - tail) + tail * (1 - u * 0.6);
}

// Dark back, pale belly, optional extra pattern.
export function countershade(top, belly, { line = 0.15, soft = 0.35, pattern = null } = {}) {
  const T = new THREE.Color(top), B = new THREE.Color(belly);
  return (t, a, out) => {
    const k = smooth(-soft, soft, -Math.cos(a) - line);
    out.copy(T).lerp(B, k);
    if (pattern) pattern(t, a, out);
  };
}

export function vcMat(opts = {}) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05, ...opts });
}

// A flat fin from 2-D points (u along the body towards the tail, v away from the body).
// kind: 'dorsal' (in the y-z plane, pointing up), 'side' (in the x-z plane, s = -1 left / +1 right)
const M_DORSAL = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
export function finGeo(pts, kind = 'dorsal', s = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 4) shape.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    else shape.lineTo(p[0], p[1]);
  }
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape, 8);
  if (kind === 'dorsal') g.applyMatrix4(M_DORSAL);
  else g.applyMatrix4(new THREE.Matrix4().set(0, s, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  g.computeVertexNormals();
  return g;
}

const finMats = new Map();
export function finMat(color, opacity = 0.85) {
  const key = color + ':' + opacity;
  if (!finMats.has(key)) finMats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.45, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  return finMats.get(key);
}

// Fin rays: thin darker lines fanning over a fin (gives the fin structure).
export function finRays(pts, kind, s, color, n = 6) {
  const g = new THREE.Group();
  const base = pts[0];
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 });
  const edge = pts.slice(1).map((p) => (p.length === 4 ? [p[2], p[3]] : p));
  for (let i = 0; i < n; i++) {
    const e = edge[Math.min(edge.length - 1, Math.floor(((i + 0.5) / n) * edge.length))];
    const a = [base[0], base[1]], b = [base[0] + (e[0] - base[0]) * 0.92, base[1] + (e[1] - base[1]) * 0.92];
    const v = kind === 'dorsal' ? [new THREE.Vector3(0, a[1], a[0]), new THREE.Vector3(0, b[1], b[0])] : [new THREE.Vector3(s * a[1], 0.002, a[0]), new THREE.Vector3(s * b[1], 0.002, b[0])];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), mat));
  }
  return g;
}

// Eye looking along +z of its group: eyeball, coloured iris, pupil, and a bright highlight.
const EYE_GEO = new THREE.SphereGeometry(1, 16, 12);
const DISC = new THREE.CircleGeometry(1, 20);
const eyeMats = new Map();
function m(color, basic = false, extra = {}) {
  const key = color + (basic ? 'b' : 's') + JSON.stringify(extra);
  if (!eyeMats.has(key)) eyeMats.set(key, basic ? new THREE.MeshBasicMaterial({ color, ...extra }) : new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1, ...extra }));
  return eyeMats.get(key);
}
export function eye(r, { iris = 0x3a2a10, ball = 0xf2f0e8, pupil = 0x050505, glow = null } = {}) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(EYE_GEO, m(ball));
  b.scale.setScalar(r);
  g.add(b);
  const ir = new THREE.Mesh(DISC, glow ? m(glow, true) : m(iris));
  ir.scale.setScalar(r * 0.72);
  ir.position.z = r * 0.97;
  g.add(ir);
  const pu = new THREE.Mesh(DISC, m(pupil, true));
  pu.scale.setScalar(r * 0.4);
  pu.position.z = r * 0.985;
  g.add(pu);
  const hl = new THREE.Mesh(DISC, m(0xffffff, true));
  hl.scale.setScalar(r * 0.16);
  hl.position.set(r * 0.25, r * 0.28, r * 0.995);
  g.add(hl);
  return g;
}

// Two eyes on the sides of a head (looking outwards and a bit forwards).
export function eyes(parent, x, y, z, r, opts = {}, turn = 0.35) {
  const out = [];
  for (const s of [-1, 1]) {
    const e = eye(r, opts);
    e.position.set(s * x, y, z);
    e.rotation.y = s * (Math.PI / 2 - turn);
    parent.add(e);
    out.push(e);
  }
  return out;
}

// Paint any geometry by position.
export function paintGeo(geo, fn) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    fn(v, _c2);
    col[i * 3] = _c2.r;
    col[i * 3 + 1] = _c2.g;
    col[i * 3 + 2] = _c2.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Rough, lumpy rock-like geometry (nodules, rocks).
export function lumpy(r, detail, seed, amp = 0.22, squash = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9 + seed) * Math.cos(v.y * 11 - seed * 0.7) * 0.6 + Math.sin(v.z * 13 + seed * 1.3) * 0.4 + Math.sin((v.x + v.y + v.z) * 23 + seed) * 0.25;
    v.multiplyScalar(1 + amp * n);
    v.y *= squash;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
