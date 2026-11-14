// Simple solid-body collisions: every sub, animal and object gets a capsule
// (a line segment with a radius) worked out once from its 3D model.

import * as THREE from './vendor/three.min.js';

const _box = new THREE.Box3();
const _mb = new THREE.Box3();
const _inv = new THREE.Matrix4();
const _m = new THREE.Matrix4();

// Things that are not solid: light beams, glow sprites, name tags, the grab arm, faint transparent shells.
function skipObj(o, root) {
  if (o === root) return false;
  if (o.isSprite || o.isPoints || o.isLight) return true;
  const u = root.userData;
  if (u.beam && o === u.beam) return true;
  if (u.arm && o === u.arm.root) return true;
  const m = o.material;
  if (m && !Array.isArray(m) && (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.3))) return true;
  return false;
}

// Capsule in the model's own frame: centre c, axis 'x' | 'y' | 'z', half length hl, radius r.
// flat = a thin mat on the floor (seep, clams, litter) – you glide over those.
export function computeShape(root) {
  root.updateMatrixWorld(true);
  _inv.copy(root.matrixWorld).invert();
  _box.makeEmpty();
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (skipObj(p, root)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _m.multiplyMatrices(_inv, o.matrixWorld);
    _mb.copy(o.geometry.boundingBox).applyMatrix4(_m);
    _box.union(_mb);
  });
  if (_box.isEmpty()) return null;
  const s = _box.getSize(new THREE.Vector3());
  const c = _box.getCenter(new THREE.Vector3());
  const dims = { x: s.x, y: s.y, z: s.z };
  const axis = s.z >= s.x && s.z >= s.y ? 'z' : s.x >= s.y ? 'x' : 'y';
  const others = Object.entries(dims).filter(([k]) => k !== axis).map(([, v]) => v);
  const r = Math.max(0.15, (others[0] + others[1]) / 4);
  const hl = Math.max(0, dims[axis] / 2 - r);
  const flat = s.y < 0.5 && Math.min(s.x, s.z) > 1.5;
  return { c, axis, hl, r, flat, reach: hl + r };
}

const _ax = new THREE.Vector3();
const _cw = new THREE.Vector3();
// World end points of a capsule on an object that only turns around y (yaw) and scales uniformly.
export function capsuleEnds(shape, pos, yaw, scale, outA, outB) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  const c = shape.c;
  _cw.set((c.x * cs + c.z * sn) * scale, c.y * scale, (-c.x * sn + c.z * cs) * scale).add(pos);
  if (shape.axis === 'y') _ax.set(0, 1, 0);
  else if (shape.axis === 'x') _ax.set(cs, 0, -sn);
  else _ax.set(sn, 0, cs);
  outA.copy(_cw).addScaledVector(_ax, shape.hl * scale);
  outB.copy(_cw).addScaledVector(_ax, -shape.hl * scale);
}

// Closest points between segments p1-q1 and p2-q2 (Ericson, Real-Time Collision Detection). Returns distance².
const _d1 = new THREE.Vector3(), _d2 = new THREE.Vector3(), _r = new THREE.Vector3();
export function closestSegSeg(p1, q1, p2, q2, c1, c2) {
  _d1.subVectors(q1, p1);
  _d2.subVectors(q2, p2);
  _r.subVectors(p1, p2);
  const a = _d1.dot(_d1), e = _d2.dot(_d2), f = _d2.dot(_r);
  let s, t;
  if (a <= 1e-8 && e <= 1e-8) {
    s = t = 0;
  } else if (a <= 1e-8) {
    s = 0;
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = _d1.dot(_r);
    if (e <= 1e-8) {
      t = 0;
      s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = _d1.dot(_d2);
      const den = a * e - b * b;
      s = den > 1e-8 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  c1.copy(p1).addScaledVector(_d1, s);
  c2.copy(p2).addScaledVector(_d2, t);
  return c1.distanceToSquared(c2);
}

const shapeCache = new Map();
// Shape per model name (all instances of a model share it).
export function shapeFor(key, root) {
  if (!shapeCache.has(key)) shapeCache.set(key, computeShape(root));
  return shapeCache.get(key);
}
