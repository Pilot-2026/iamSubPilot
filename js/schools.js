// Schools of small fish (instanced, cheap): lots of life in the upper ocean,
// glowing shoals in the twilight zone. Purely decorative – not photo targets.

import * as THREE from './vendor/three.min.js';
import { mulberry32, clamp } from './util.js';
import { SCALE } from './world.js';
import { loftBody, prof, finGeo } from './detail.js';

let fishGeo = null;
// A small fish: smooth body (dark back, silver flank, white belly, eye), dorsal fin, forked tail, side fins.
export function fishGeometry() {
  if (fishGeo) return fishGeo;
  const w = prof([[0, 0.03], [0.1, 0.1], [0.32, 0.16], [0.62, 0.11], [0.88, 0.035], [1, 0.03]]);
  const h = prof([[0, 0.03], [0.1, 0.13], [0.32, 0.24], [0.62, 0.17], [0.88, 0.05], [1, 0.04]]);
  const paint = (t, a, out) => {
    const up = Math.cos(a);
    out.setScalar(up > 0.35 ? 0.42 : up > -0.25 ? 0.86 : 1.0);
    if (up > 0.1 && up < 0.35) out.setScalar(0.62);
    // eye: a dark spot with a light ring on both sides of the head
    const side = Math.abs(Math.sin(a));
    if (t > 0.1 && t < 0.17 && side > 0.75 && up > 0.05 && up < 0.5) out.setScalar(t > 0.115 && t < 0.155 && up > 0.12 && up < 0.42 ? 0.04 : 1.0);
    // a faint lateral line
    if (Math.abs(up + 0.02) < 0.05 && t > 0.2 && t < 0.85) out.multiplyScalar(0.8);
  };
  const body = loftBody({ len: 1.2, w, h, y: () => 0, seg: 16, rad: 12, paint }).toNonIndexed();
  const fins = [
    finGeo([[0, 0], [0.08, 0.16], [0.2, 0.0]], 'dorsal'), // dorsal
    finGeo([[0, 0], [0.16, 0.2, 0.22, 0.26], [0.1, 0.0], [0.22, -0.26], [0.16, -0.2, 0, 0]], 'dorsal'), // forked tail
    finGeo([[0, 0], [0.12, 0.1], [0.08, 0]], 'side', 1),
    finGeo([[0, 0], [0.12, 0.1], [0.08, 0]], 'side', -1),
    finGeo([[0, 0], [0.05, 0.08], [0.12, 0]], 'dorsal'), // anal (flipped below)
  ];
  fins[0].translate(0, 0.21, -0.1);
  fins[1].translate(0, 0, 0.56);
  fins[2].translate(0.1, -0.06, -0.25);
  fins[3].translate(-0.1, -0.06, -0.25);
  fins[4].rotateZ(Math.PI);
  fins[4].translate(0, -0.16, 0.15);
  const parts = [body, ...fins.map((f) => f.toNonIndexed())];
  let n = 0;
  parts.forEach((p) => (n += p.attributes.position.count));
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  parts.forEach((p, k) => {
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    if (k === 0) col.set(p.attributes.color.array, o * 3);
    else col.fill(0.7, o * 3, (o + p.attributes.position.count) * 3);
    o += p.attributes.position.count;
  });
  fishGeo = new THREE.BufferGeometry();
  fishGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  fishGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  fishGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return fishGeo;
}

// Shared time uniform for the tail wiggle.
export const fishTime = { value: 0 };

const mats = {};
export function fishMaterial(glow = false) {
  const key = glow ? 'g' : 'n';
  if (mats[key]) return mats[key];
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.4,
    metalness: 0.12,
    emissive: glow ? 0x3fb8ff : 0x000000,
    emissiveIntensity: glow ? 0.55 : 0,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = fishTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.3 + instanceMatrix[3].y * 0.9;
      #else
        float ph = 0.0;
      #endif
      float bend = max(0.0, transformed.z + 0.15);
      transformed.x += sin(uTime * 10.0 + ph) * 0.22 * bend * bend;`
    );
  };
  mats[key] = m;
  return m;
}

const SPECIES = {
  sardine: { tint: 0x9fd2ff, size: 0.55, count: 56, spread: 1, speed: 5 },
  mackerel: { tint: 0xa8f0c8, size: 0.85, count: 34, spread: 1.2, speed: 6 },
  fusilier: { tint: 0xffd76a, size: 0.62, count: 40, spread: 1, speed: 4.5 },
  silverside: { tint: 0xe8f4ff, size: 0.42, count: 64, spread: 0.8, speed: 4 },
  glow: { tint: 0x7f93a8, size: 0.5, count: 30, spread: 1.3, speed: 3, glow: true },
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3();

export class FishSchools {
  constructor(scene, world, seed) {
    this.scene = scene;
    this.world = world;
    this.rng = mulberry32((seed ^ 0x5eed) >>> 0);
    this.schools = [];
    const sp = world.shipPos;
    const r = this.rng;
    const around = (minR, maxR) => {
      const a = r() * Math.PI * 2, d = minR + r() * (maxR - minR);
      return [sp.x + 14 + Math.cos(a) * d, sp.z + Math.sin(a) * d];
    };
    const add = (kind, x, depth, z, roam = false) => {
      const floorY = world.heightAt(x, z);
      const y = Math.max(-depth / SCALE, floorY + 12);
      this.addSchool(kind, new THREE.Vector3(x, Math.min(y, -1.5), z), roam);
    };
    // sunlit zone: lots of schools right where the sub dives in
    const upper = ['sardine', 'mackerel', 'fusilier', 'silverside', 'sardine', 'fusilier', 'mackerel', 'silverside'];
    upper.forEach((k, i) => {
      const [x, z] = around(i < 3 ? 8 : 16, i < 3 ? 24 : 60);
      add(k, x, 8 + r() * (i < 3 ? 40 : 160), z);
    });
    // twilight zone: glowing shoals along the way down
    for (let i = 0; i < 5; i++) {
      const [x, z] = around(6, 40);
      add('glow', x, 300 + r() * 700, z);
    }
    // near the "arrival garden" on the seafloor
    for (let i = 0; i < 2; i++) {
      const [x, z] = around(4, 24);
      const fy = world.heightAt(x, z);
      this.addSchool('glow', new THREE.Vector3(x, fy + 8 + r() * 10, z), false);
    }
    // roaming schools that keep showing up around you near the surface
    for (const k of ['sardine', 'fusilier', 'mackerel']) {
      const [x, z] = around(20, 70);
      add(k, x, 10 + r() * 80, z, true);
    }
  }

  addSchool(kind, anchor, roam) {
    const S = SPECIES[kind];
    const mesh = new THREE.InstancedMesh(fishGeometry(), fishMaterial(!!S.glow), S.count);
    mesh.frustumCulled = false;
    const col = new THREE.Color(S.tint);
    const offs = [];
    for (let i = 0; i < S.count; i++) {
      mesh.setColorAt(i, col.clone().offsetHSL((this.rng() - 0.5) * 0.04, 0, (this.rng() - 0.5) * 0.12));
      // points in a flattened ball
      const u = this.rng() * Math.PI * 2, v = Math.acos(2 * this.rng() - 1), rr = Math.cbrt(this.rng());
      offs.push({
        x: Math.sin(v) * Math.cos(u) * rr * 6 * S.spread,
        y: Math.cos(v) * rr * 2.4 * S.spread,
        z: Math.sin(v) * Math.sin(u) * rr * 6 * S.spread,
        ph: this.rng() * 10,
        sc: S.size * (0.85 + this.rng() * 0.3),
      });
    }
    this.scene.add(mesh);
    this.schools.push({
      kind, S, mesh, offs, roam,
      anchor: anchor.clone(),
      center: anchor.clone(),
      radius: 10 + this.rng() * 18,
      ang: this.rng() * Math.PI * 2,
      dir: this.rng() < 0.5 ? 1 : -1,
      t: 0,
    });
  }

  update(dt, sub, cam) {
    fishTime.value += dt;
    const subPos = sub.pos;
    const subDepth = -subPos.y * SCALE;
    for (const s of this.schools) {
      if (s.roam && subDepth < 450 && s.center.distanceTo(subPos) > 120) {
        const f = sub.forward();
        s.anchor.set(subPos.x + f.x * 45 + (this.rng() - 0.5) * 50, 0, subPos.z + f.z * 45 + (this.rng() - 0.5) * 50);
        s.anchor.y = clamp(subPos.y + (this.rng() - 0.5) * 14, this.world.heightAt(s.anchor.x, s.anchor.z) + 10, -2);
        s.center.copy(s.anchor);
      }
      const dist = s.center.distanceTo(cam);
      s.mesh.visible = dist < 170;
      if (!s.mesh.visible) continue;
      s.t += dt;
      s.ang += (dt * s.S.speed * s.dir) / s.radius;
      const a = s.ang;
      s.center.set(s.anchor.x + Math.cos(a) * s.radius, s.anchor.y + Math.sin(a * 0.7) * 2.5, s.anchor.z + Math.sin(a) * s.radius);
      if (s.center.y > -1.5) s.center.y = -1.5;
      // heading = tangent of the circle
      const hx = -Math.sin(a) * s.dir, hz = Math.cos(a) * s.dir;
      const yaw = Math.atan2(-hx, -hz);
      for (let i = 0; i < s.offs.length; i++) {
        const o = s.offs[i];
        const ph = o.ph + s.t;
        _p.set(
          s.center.x + o.x + Math.sin(ph * 0.9) * 0.6,
          s.center.y + o.y + Math.sin(ph * 1.3) * 0.3,
          s.center.z + o.z + Math.cos(ph * 0.8) * 0.6
        );
        // make room for the sub
        _d.subVectors(_p, subPos);
        const dl = _d.length();
        if (dl < 8 && dl > 0.01) _p.addScaledVector(_d, ((8 - dl) / dl) * 1.1);
        if (_p.y > -1.2) _p.y = -1.2;
        _e.set(Math.sin(ph * 0.7) * 0.15, yaw + Math.sin(ph * 0.5) * 0.25, 0);
        _q.setFromEuler(_e);
        _s.setScalar(o.sc);
        _m.compose(_p, _q, _s);
        s.mesh.setMatrixAt(i, _m);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    for (const s of this.schools) {
      this.scene.remove(s.mesh);
      s.mesh.dispose();
    }
  }
}
