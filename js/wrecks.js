// Wrecks near the deep end of every trench: a broken warship and a crashed four-engine plane from the Second
// World War. Both are big enough to swim into; coins, chests and other treasures lie inside and are collected by
// swimming through them. (Generic designs – no real ship or aircraft, no markings.)

import * as THREE from './vendor/three.min.js';
import { axisZ, DEEP_X } from './world.js';
import { mulberry32 } from './util.js';
import { lootMesh } from './atlantis.js';
import { softDot } from './merfolk.js';

const PI = Math.PI, TAU = Math.PI * 2;

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.2, ...o });
function add(parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  m.rotation.set(...r);
  if (Array.isArray(s)) m.scale.set(...s);
  else m.scale.setScalar(s);
  parent.add(m);
  return m;
}

// rusty paint: vertex colours mixing paint, rust and dark stains
function rustify(geo, paint, rnd, amount = 0.6) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const a = new THREE.Color(paint), rust = new THREE.Color(0x7a3a1a), dark = new THREE.Color(0x2a2420), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 0.5 + 0.5 * Math.sin(x * 1.7 + z * 0.9) * Math.sin(y * 2.3 - z * 0.37) + (rnd() - 0.5) * 0.25;
    c.copy(a).lerp(rust, Math.max(0, Math.min(1, n * amount + (y < -3 ? 0.25 : 0))));
    if (n > 0.85) c.lerp(dark, 0.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const vcol = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.25, side: THREE.DoubleSide, ...o });

// an open hull shell (U-shaped cross-sections) from u0 to u1 along the length L (local z from +L/2 at the bow)
function hullPiece(u0, u1, L, W, D, rnd) {
  const NU = 22, NV = 14, pos = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = u0 + ((u1 - u0) * i) / NU;
    const bow = Math.max(0, Math.min(1, u / 0.22)), stern = Math.max(0, Math.min(1, (1 - u) / 0.08));
    const w = W * Math.sqrt(bow) * (0.75 + 0.25 * stern), d = D * (0.7 + 0.3 * Math.min(bow * 1.5, 1));
    const z = L / 2 - u * L;
    for (let j = 0; j <= NV; j++) {
      const a = -PI / 2 + (j / NV) * PI;
      // jagged edges at the break: the plates are torn
      const tear = (u === u0 && u0 > 0) || (u === u1 && u1 < 1) ? (rnd() - 0.5) * 1.6 : 0;
      pos.push(Math.sin(a) * w, -Math.pow(Math.cos(a), 0.7) * d, z + tear);
    }
  }
  for (let i = 0; i < NU; i++)
    for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j, b = a + NV + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildShip(rnd) {
  const G = new THREE.Group();
  const L = 70, W = 7.5, D = 8;
  const steel = std(0x5a5f62, { metalness: 0.4 });
  const dark = std(0x23262a);
  const pieces = [];
  for (const [u0, u1, roll, yaw, dz, dy] of [[0, 0.46, 0.22, 0.05, 0, 0], [0.53, 1, -0.32, -0.18, -5, -0.8]]) {
    const P = new THREE.Group();
    const hull = new THREE.Mesh(rustify(hullPiece(u0, u1, L, W, D, rnd), 0x6b3a32, rnd), vcol());
    P.add(hull);
    // deck plates with holes (you can dive in from above too)
    const z0 = L / 2 - u0 * L, z1 = L / 2 - u1 * L;
    for (let z = z1 + 2; z < z0 - 2; z += 4) {
      const uu = (L / 2 - z) / L, wHere = W * Math.sqrt(Math.max(0, Math.min(1, uu / 0.22)));
      if (rnd() < 0.35 || wHere < 2) continue; // a hole
      add(P, rustify(new THREE.BoxGeometry(wHere * 1.9, 0.25, 3.8), 0x5a5048, rnd, 0.8), vcol(), [0, 0, z], [0, 0, (rnd() - 0.5) * 0.08]);
    }
    // railings
    for (const sx of [-1, 1]) for (let z = z1 + 3; z < z0 - 3; z += 3.2) if (rnd() < 0.7) add(P, new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5), steel, [sx * W * Math.sqrt(Math.max(0, Math.min(1, (L / 2 - z) / L / 0.22))) * 0.97, 0.6, z], [0, 0, (rnd() - 0.5) * 0.6]);
    P.rotation.set(0, yaw, roll);
    P.position.set(0, dy, dz);
    G.add(P);
    pieces.push(P);
  }
  const [bow, stern] = pieces;
  // bow: a gun turret and the bridge with dark windows
  const turret = new THREE.Group();
  add(turret, rustify(new THREE.CylinderGeometry(2.4, 2.8, 1.8, 16), 0x5a5f62, rnd), vcol(), [0, 0.9, 0]);
  add(turret, rustify(new THREE.BoxGeometry(3.6, 1.6, 4), 0x5a5f62, rnd), vcol(), [0, 2.4, 0]);
  for (const sx of [-0.7, 0.7]) add(turret, new THREE.CylinderGeometry(0.22, 0.25, 6, 8), dark, [sx, 2.5, 4.2], [PI / 2 - 0.08, 0, 0]);
  turret.position.set(0, 0, 22);
  turret.rotation.y = 0.5;
  bow.add(turret);
  const bridge = new THREE.Group();
  add(bridge, rustify(new THREE.BoxGeometry(9, 4, 7), 0x6a6e70, rnd), vcol(), [0, 2, 0]);
  add(bridge, rustify(new THREE.BoxGeometry(7, 3, 5), 0x6a6e70, rnd), vcol(), [0, 5.5, -0.5]);
  for (let k = 0; k < 6; k++) add(bridge, new THREE.PlaneGeometry(0.8, 0.9), std(0x0a1418, { emissive: 0x0a2a30, emissiveIntensity: 0.5 }), [-2.5 + k, 5.8, 2.02]);
  const mast = add(bridge, new THREE.CylinderGeometry(0.25, 0.32, 9, 8), steel, [0, 11.5, -1], [0.15, 0, 0.3]);
  bridge.position.set(0, 0, 9);
  bow.add(bridge);
  // stern: a tilted funnel, a second turret, the propeller and an anchor chain
  const funnel = add(stern, rustify(new THREE.CylinderGeometry(2, 2.3, 7, 18), 0x4a4440, rnd), vcol(), [0, 3.4, -8], [0.25, 0, 0.1]);
  const t2 = turret.clone();
  t2.position.set(0, 0, -24);
  t2.rotation.y = PI - 0.7;
  stern.add(t2);
  const prop = new THREE.Group();
  const bronze = std(0x8a6a3a, { metalness: 0.7, roughness: 0.4 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    add(prop, new THREE.BoxGeometry(0.4, 2.6, 0.9), bronze, [Math.sin(a) * -1.3, Math.cos(a) * 1.3, 0], [0, 0.3, a]);
  }
  add(prop, new THREE.SphereGeometry(0.6, 10, 8), bronze);
  prop.position.set(0, -D * 0.75, -L / 2 + 1.5);
  stern.add(prop);
  const chain = new THREE.Group();
  for (let k = 0; k < 18; k++) add(chain, new THREE.TorusGeometry(0.35, 0.1, 5, 10), dark, [Math.sin(k * 0.5) * 3, -k * 0.55, k * 0.4], [k % 2 ? PI / 2 : 0, 0, 0]);
  chain.position.set(W * 0.6, -1, L / 2 - 6);
  bow.add(chain);
  // life: sponges, anemones and soft corals grown on the wreck
  const life = [0xff7a5a, 0xffd06a, 0xb08aff, 0x7affd8, 0xff9ad0];
  for (let k = 0; k < 40; k++) {
    const P = pieces[k % 2], z = (k % 2 ? -1 : 1) * (6 + rnd() * 26), side = rnd() < 0.5 ? -1 : 1;
    add(P, new THREE.SphereGeometry(0.4 + rnd() * 0.6, 8, 6), std(life[k % life.length], { emissive: life[k % life.length], emissiveIntensity: 0.25, roughness: 0.6 }), [side * (W * 0.9 + rnd() * 0.3), -rnd() * D * 0.8, z], [0, 0, 0], [1, 0.6 + rnd(), 1]);
  }
  return { group: G, pieces, L, W, D };
}

function buildPlane(rnd) {
  const G = new THREE.Group();
  const alu = 0x9aa2a6, R = 3.2;
  const tubeMat = vcol({ metalness: 0.5, roughness: 0.6 });
  const dark = std(0x23262a);
  const front = new THREE.Group(), rear = new THREE.Group();
  // fuselage in two pieces, open at the break: big enough for a sub to swim through
  add(front, rustify(new THREE.CylinderGeometry(R, R, 15, 24, 4, true), alu, rnd, 0.35), tubeMat, [0, 0, 0], [PI / 2, 0, 0]);
  add(front, rustify(new THREE.SphereGeometry(R, 24, 14, 0, TAU, 0, PI / 2), alu, rnd, 0.35), tubeMat, [0, 0, 7.5], [PI / 2, 0, 0], [1, 1.4, 1]);
  // cockpit frame with broken glass
  const glass = new THREE.MeshStandardMaterial({ color: 0x9ad8e8, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide });
  add(front, new THREE.SphereGeometry(1.8, 16, 10, 0, TAU, 0, PI / 2), glass, [0, R * 0.7, 6.5], [-0.3, 0, 0], [1, 0.7, 1.5]);
  for (let k = 0; k < 5; k++) add(front, new THREE.TorusGeometry(1.75, 0.07, 4, 16, PI), dark, [0, R * 0.7, 5.6 + k * 0.5], [0, 0, 0], [1, 0.75, 1]);
  add(rear, rustify(new THREE.CylinderGeometry(R, R * 0.45, 14, 24, 4, true), alu, rnd, 0.35), tubeMat, [0, 0, -7], [PI / 2, 0, 0]);
  // wings with four engines and bent propellers – the right wing is broken off halfway
  for (const sx of [-1, 1]) {
    const span = sx > 0 ? 9 : 17;
    const wing = add(front, rustify(new THREE.BoxGeometry(span, 0.6, 5.5), alu, rnd, 0.4), vcol({ metalness: 0.5 }), [sx * (R + span / 2 - 0.5), -0.6, -1], [0, sx * 0.06, sx * (sx > 0 ? -0.18 : 0.04)]);
    for (const k of sx > 0 ? [0] : [0, 1]) {
      const ex = sx * (R + 3.5 + k * 6.5);
      const eng = new THREE.Group();
      add(eng, rustify(new THREE.CylinderGeometry(1.1, 0.8, 4.5, 14), 0x6a6e70, rnd), vcol(), [0, 0, 0], [PI / 2, 0, 0]);
      for (let b = 0; b < 3; b++) {
        const blade = add(eng, new THREE.BoxGeometry(0.35, 2.3, 0.12), dark, [0, 0, 2.4]);
        blade.rotation.z = (b / 3) * TAU;
        blade.position.set(Math.sin(blade.rotation.z) * -1.1, Math.cos(blade.rotation.z) * 1.1, 2.4);
        blade.rotation.x = 0.5 * (rnd() - 0.2); // bent from the crash
      }
      eng.position.set(ex, -1.2, 1);
      front.add(eng);
    }
    wing.userData.sx = sx;
  }
  // the tail fin and tailplane lie broken off a little further away
  const tail = new THREE.Group();
  add(tail, rustify(new THREE.BoxGeometry(0.5, 6, 4.5), alu, rnd, 0.4), vcol(), [0, 3, 0]);
  add(tail, rustify(new THREE.BoxGeometry(11, 0.4, 3.5), alu, rnd, 0.4), vcol(), [0, 0.3, 0.3]);
  // a broken-off wing tip and an engine in the mud
  const tip = new THREE.Group();
  add(tip, rustify(new THREE.BoxGeometry(7, 0.6, 4.5), alu, rnd, 0.4), vcol(), [0, 0, 0]);
  front.rotation.set(0.04, 0, 0.12);
  rear.position.set(1.5, -0.6, -10);
  rear.rotation.set(-0.05, 0.35, -0.25);
  tail.position.set(-6, -1.5, -28);
  tail.rotation.set(0.1, 1.1, 1.2);
  tip.position.set(14, -2.4, 5);
  tip.rotation.set(0.15, 0.6, 0.3);
  G.add(front, rear, tail, tip);
  const life = [0xff7a5a, 0xffd06a, 0xb08aff, 0x7affd8];
  for (let k = 0; k < 24; k++) {
    const a = rnd() * TAU, z = -6 + rnd() * 12;
    add(k % 2 ? front : rear, new THREE.SphereGeometry(0.3 + rnd() * 0.5, 8, 6), std(life[k % life.length], { emissive: life[k % life.length], emissiveIntensity: 0.25 }), [Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02, k % 2 ? z : z - 7], [0, 0, 0], [1, 0.6, 1]);
  }
  return { group: G, front, rear, R };
}

export class Wrecks {
  constructor(scene, world, seed, subLen = 5) {
    this.scene = scene;
    this.world = world;
    this.subLen = subLen;
    const rnd = (this.rnd = mulberry32((seed ^ 0x5eaf00d) >>> 0));
    this.group = new THREE.Group();
    scene.add(this.group);
    this.loot = [];
    this.taken = 0;
    this.sites = [];
    // near the deep end of the trench, on the floor along the trench axis
    const place = (obj, x, sink, extraYaw = 0) => {
      const z = axisZ(x), slope = (axisZ(x + 5) - axisZ(x - 5)) / 10;
      obj.position.set(x, world.heightAt(x, z) - sink, z);
      obj.rotation.y = Math.atan2(1, slope) + extraYaw; // local +z along the trench
      this.group.add(obj);
      return obj;
    };
    const ship = buildShip(rnd);
    place(ship.group, DEEP_X - 95 - rnd() * 45, -ship.D * 0.6, (rnd() - 0.5) * 0.5); // keel buried, deck well above the mud
    this.sites.push({ kind: 'ship', obj: ship.group, found: false });
    const plane = buildPlane(rnd);
    place(plane.group, DEEP_X + 85 + rnd() * 50, -1.8, (rnd() - 0.5) * 1.2);
    this.sites.push({ kind: 'plane', obj: plane.group, found: false });
    // treasures inside: local positions in each wreck part
    const kinds = ['coin', 'coin', 'chest', 'goblet', 'coin', 'gem', 'crown', 'coin', 'pearl'];
    let ki = 0;
    const put = (parent, p) => {
      const kind = kinds[ki++ % kinds.length];
      const o = lootMesh(kind, [0xff4fa8, 0x46ff8a, 0x46c8ff][ki % 3]);
      const s = kind === 'chest' ? 1.4 : 1.1;
      o.scale.setScalar(s);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xffd86a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(2.4);
      o.add(halo);
      o.position.set(...p);
      o.userData = { s, base: p[1], ph: rnd() * TAU, site: parent };
      parent.add(o);
      this.loot.push(o);
    };
    for (const [z, y] of [[18, -2.5], [10, -3], [3, -2], [-14, -2.5], [-22, -3], [-30, -2], [26, -1.8]]) put(z > 0 ? ship.pieces[0] : ship.pieces[1], [(rnd() - 0.5) * 3, y, z]);
    for (const [part, p] of [[plane.front, [0, -0.8, 3]], [plane.front, [0, -0.6, -4]], [plane.rear, [0, -0.6, -4]], [plane.rear, [0, -0.5, -9]], [plane.front, [0, 0.3, 6]]]) put(part, p);
    this.events = [];
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  update(dt, t, sub) {
    for (const s of this.sites) {
      if (!s.found && s.obj.position.distanceTo(sub.pos) < 70) {
        s.found = true;
        this.events.push({ type: 'found', kind: s.kind });
      }
    }
    const reach = this.subLen * 0.5 + 1.4, w = new THREE.Vector3();
    for (const o of this.loot) {
      const u = o.userData;
      if (u.gone) continue;
      if (u.fly !== undefined) {
        u.fly += dt / 0.35;
        o.scale.setScalar(u.s * Math.max(0.01, 1 - u.fly));
        if (u.fly >= 1) {
          u.gone = true;
          o.visible = false;
        }
        continue;
      }
      o.rotation.y = t * 1.3 + u.ph;
      o.position.y = u.base + Math.sin(t * 1.5 + u.ph) * 0.2;
      o.getWorldPosition(w);
      if (w.distanceTo(sub.pos) < reach) {
        u.fly = 0;
        this.taken++;
        this.events.push({ type: 'loot', n: this.taken, total: this.loot.length });
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
