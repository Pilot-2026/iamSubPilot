// Detailed animal and object models (replace the simple ones in creatures.js).
// Same sizes, orientation (head at -z) and animation hooks (userData.*) as before.

import * as THREE from './vendor/three.min.js';
import { mulberry32 } from './util.js';
import { loftBody, prof, countershade, vcMat, finGeo, finMat, finRays, eye, eyes, paintGeo, lumpy, smooth } from './detail.js';

const cache = new Map();
function std(color, opts = {}) {
  const key = 'std' + color + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts }));
  return cache.get(key);
}
function basic(color, opts = {}) {
  const key = 'bas' + color + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return cache.get(key);
}
let glowTex = null;
function glowSprite(color, size, opacity = 0.8) {
  if (!glowTex) {
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
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}
const at = (o, x, y, z) => (o.position.set(x, y, z), o);
// add a child and return the CHILD (Object3D.add returns the parent)
const put = (parent, o) => (parent.add(o), o);
function tube(points, radius, mat, seg = 20, radial = 8) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, radius, radial, false), mat);
}
// tapering tube (radius r0 → r1)
function taperTube(points, r0, r1, mat, seg = 24, radial = 8) {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, 1, radial, false);
  const p = geo.attributes.position, n = geo.attributes.normal;
  const curve = new THREE.CatmullRomCurve3(points);
  const pts = curve.getSpacedPoints(seg);
  for (let i = 0; i < p.count; i++) {
    const ring = Math.floor(i / (radial + 1));
    const c = pts[Math.min(ring, seg)];
    const r = r0 + (r1 - r0) * (ring / seg);
    p.setXYZ(i, c.x + n.getX(i) * r, c.y + n.getY(i) * r, c.z + n.getZ(i) * r);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
const col = (hex) => new THREE.Color(hex);
// fin with rays, added to parent
function fin(parent, pts, kind, s, color, opacity, pos, rays = 0, rayColor = 0x000000) {
  const mesh = new THREE.Mesh(finGeo(pts, kind, s), finMat(color, opacity));
  const grp = new THREE.Group();
  grp.add(mesh);
  if (rays) grp.add(finRays(pts, kind, s, rayColor, rays));
  if (pos) grp.position.set(...pos);
  parent.add(grp);
  return grp;
}
// a little row of glowing photophores
function photophores(parent, list, color, size = 0.025) {
  const m = basic(color);
  const geo = new THREE.SphereGeometry(1, 8, 6);
  for (const [x, y, z] of list) {
    const d = new THREE.Mesh(geo, m);
    d.scale.setScalar(size);
    d.position.set(x, y, z);
    parent.add(d);
  }
}

export const MODELS = {
  // ======================= upper ocean =======================
  dolphin() {
    const g = new THREE.Group();
    const L = 3.0;
    const w = prof([[0, 0.05], [0.07, 0.07], [0.1, 0.13], [0.17, 0.3], [0.4, 0.44], [0.7, 0.26], [0.92, 0.08], [1, 0.05]]);
    const h = prof([[0, 0.045], [0.07, 0.07], [0.1, 0.15], [0.17, 0.34], [0.4, 0.48], [0.7, 0.3], [0.92, 0.09], [1, 0.05]]);
    const yv = prof([[0, -0.12], [0.1, -0.1], [0.2, 0.02], [0.5, 0.02], [1, 0.05]]);
    const paint = countershade(0x5d7085, 0xeef1f3, {
      line: 0.05,
      pattern: (t, a, out) => {
        // lighter "spinal blaze" sweeping up the flank, darker cape on the back
        const flank = smooth(0.25, 0.45, t) * (1 - smooth(0.62, 0.8, t));
        if (Math.abs(Math.cos(a)) < 0.45) out.lerp(col(0xb9c5d1), flank * 0.45);
        if (Math.cos(a) > 0.75 && t > 0.15 && t < 0.6) out.multiplyScalar(0.85);
      },
    });
    g.add(new THREE.Mesh(loftBody({ len: L, w, h, y: yv, paint }), vcMat({ roughness: 0.32 })));
    // mouth line + blowhole
    const dark = std(0x23303b);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 4, 20, Math.PI), dark);
    mouth.rotation.set(Math.PI / 2, 0, 0);
    mouth.scale.set(1, 3.2, 1);
    g.add(at(mouth, 0, -0.17, -1.12));
    put(g, at(new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), dark), 0, 0.395, -0.62)).rotation.x = -Math.PI / 2;
    eyes(g, 0.2, -0.05, -1.04, 0.045, { iris: 0x2a1a10 });
    // dorsal fin (falcate), flippers
    fin(g, [[0, 0], [0.18, 0.05, 0.42, 0.42], [0.36, 0.38, 0.38, 0.0]], 'dorsal', 1, 0x56697d, 1, [0, 0.43, -0.05]);
    for (const s of [-1, 1]) {
      const fl = fin(g, [[0, 0], [0.1, 0.25, 0.26, 0.42], [0.22, 0.2, 0.2, 0.0]], 'side', s, 0x5d7085, 1, [s * 0.32, -0.22, -0.5]);
      fl.rotation.z = s * -0.55;
    }
    // fluke (animated)
    const fluke = new THREE.Group();
    for (const s of [-1, 1]) fin(fluke, [[0, 0], [-0.05, 0.35, 0.18, 0.55], [0.22, 0.32, 0.12, 0.04]], 'side', s, 0x56697d, 1, [0, 0, 0]);
    g.add(at(fluke, 0, 0.05, 1.42));
    g.userData.fluke = fluke;
    return g;
  },

  humpback() {
    const g = new THREE.Group();
    const L = 9.6;
    const w = prof([[0, 0.25], [0.06, 0.62], [0.2, 1.0], [0.42, 1.15], [0.7, 0.6], [0.9, 0.22], [1, 0.14]]);
    const h = prof([[0, 0.18], [0.06, 0.55], [0.2, 0.95], [0.42, 1.05], [0.7, 0.62], [0.9, 0.25], [1, 0.12]]);
    const yv = prof([[0, -0.15], [0.2, 0], [1, 0.1]]);
    const paint = countershade(0x1f2832, 0xd7dcdf, {
      line: 0.35,
      soft: 0.25,
      pattern: (t, a, out) => {
        // ventral throat pleats: dark grooves along the belly in the front half
        if (t < 0.5 && Math.cos(a) < -0.35 && Math.sin(a * 18) > 0.4) out.multiplyScalar(0.6);
        // white mottling on the flank
        if (Math.sin(t * 61 + a * 7) * Math.sin(t * 23 - a * 13) > 0.82) out.lerp(col(0xdcdfe2), 0.6);
      },
    });
    g.add(new THREE.Mesh(loftBody({ len: L, w, h, y: yv, paint, seg: 56, rad: 56 }), vcMat({ roughness: 0.55 })));
    // knobby tubercles on the head and jaw
    const knob = std(0x2a333d, { roughness: 0.8 });
    const kg = new THREE.SphereGeometry(1, 8, 6);
    const r = mulberry32(3);
    for (let i = 0; i < 22; i++) {
      const z = -4.6 + r() * 1.9, x = (r() - 0.5) * 1.0;
      const k = new THREE.Mesh(kg, knob);
      k.scale.setScalar(0.07 + r() * 0.05);
      g.add(at(k, x, 0.45 + (z + 4.6) * 0.25, z));
    }
    eyes(g, 0.98, -0.32, -2.65, 0.09);
    // long white pectoral flippers with a bumpy front edge
    for (const s of [-1, 1]) {
      const pts = [[0, 0], [-0.2, 0.8], [-0.1, 1.3], [-0.25, 1.9], [-0.05, 2.4], [-0.15, 3.0], [0.15, 3.5], [0.55, 2.4], [0.7, 1.0], [0.6, 0]];
      const fl = fin(g, pts, 'side', s, 0xe4e7ea, 1, [s * 0.95, -0.6, -1.9]);
      fl.rotation.set(0, s * 0.35, s * -0.5);
    }
    fin(g, [[0, 0], [0.25, 0.5], [0.6, 0.0]], 'dorsal', 1, 0x1f2832, 1, [0, 0.95, 2.2]);
    const fluke = new THREE.Group();
    for (const s of [-1, 1]) fin(fluke, [[0, 0], [-0.25, 0.9, 0.2, 1.7], [0.5, 1.5], [0.35, 1.1], [0.55, 0.7], [0.4, 0.35], [0.5, 0.05]], 'side', s, 0x1f2832, 1, [0, 0, 0]);
    g.add(at(fluke, 0, 0.12, 4.65));
    g.userData.fluke = fluke;
    return g;
  },

  spermwhale() {
    const g = new THREE.Group();
    const L = 8.6;
    const w = prof([[0, 0.8], [0.04, 0.95], [0.3, 1.02], [0.42, 1.05], [0.7, 0.6], [0.92, 0.2], [1, 0.12]]);
    const h = prof([[0, 0.85], [0.04, 1.0], [0.3, 1.05], [0.42, 1.1], [0.7, 0.62], [0.92, 0.2], [1, 0.1]]);
    const n = prof([[0, 4.5], [0.3, 4], [0.45, 2.2], [1, 2]]);
    const paint = (t, a, out) => {
      out.setHex(0x4a4f58);
      // wrinkled skin: darker and lighter streaks
      const s = Math.sin(t * 90 + Math.sin(a * 5) * 2) * Math.sin(a * 17 + t * 9);
      out.multiplyScalar(0.88 + s * 0.1);
      if (Math.cos(a) < -0.7 && t < 0.35) out.lerp(col(0xbfc2c4), 0.35);
    };
    g.add(new THREE.Mesh(loftBody({ len: L, w, h, n, paint, seg: 40, rad: 24 }), vcMat({ roughness: 0.8 })));
    // narrow lower jaw with teeth
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 2.8, 1, 1, 6), std(0xd8d8d0));
    g.add(at(jaw, 0, -1.02, -2.4));
    const tooth = new THREE.ConeGeometry(0.035, 0.14, 6);
    const tm = std(0xf4f1e6, { roughness: 0.3 });
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) g.add(at(new THREE.Mesh(tooth, tm), s * 0.17, -0.86, -3.6 + i * 0.2));
    eyes(g, 1.0, -0.55, -1.0, 0.08);
    // hump and knuckles along the back, blowhole on the left front
    fin(g, [[0, 0], [0.3, 0.42], [0.8, 0]], 'dorsal', 1, 0x454a53, 1, [0, 1.05, 1.5]);
    for (let i = 0; i < 5; i++) g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), std(0x4a4f58, { roughness: 0.8 })), 0, 0.9 - i * 0.07, 2.3 + i * 0.36));
    put(g, at(new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), std(0x22262c)), -0.3, 1.06, -4.0)).rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.1, 0.4], [0.45, 0.5], [0.4, 0]], 'side', s, 0x454a53, 1, [s * 0.95, -0.6, -0.6]).rotation.z = s * -0.5;
    const fluke = new THREE.Group();
    for (const s of [-1, 1]) fin(fluke, [[0, 0], [-0.2, 0.7, 0.15, 1.4], [0.45, 1.25], [0.4, 0.6], [0.45, 0.05]], 'side', s, 0x454a53, 1, [0, 0, 0]);
    g.add(at(fluke, 0, 0, 4.25));
    g.userData.fluke = fluke;
    return g;
  },

  whaleshark() {
    const g = new THREE.Group();
    const L = 8.4;
    const w = prof([[0, 0.8], [0.05, 1.12], [0.25, 1.28], [0.5, 1.05], [0.78, 0.45], [0.95, 0.2], [1, 0.16]]);
    const h = prof([[0, 0.38], [0.05, 0.55], [0.25, 0.85], [0.5, 0.85], [0.78, 0.45], [0.95, 0.22], [1, 0.16]]);
    const yv = prof([[0, -0.1], [0.3, 0], [1, 0.08]]);
    const paint = countershade(0x2f4a68, 0xdfe3e6, {
      line: 0.25,
      pattern: (t, a, out) => {
        if (Math.cos(a) < -0.2) return;
        // checkerboard of pale spots and stripes (unique for every whale shark)
        const sx = Math.sin(t * 110), sy = Math.sin(a * 9);
        if (sx > 0.45 && sy > 0.45) out.lerp(col(0xf2f4f6), 0.85);
        if (Math.abs(Math.sin(t * 30)) < 0.07 && t > 0.2 && t < 0.85) out.lerp(col(0xc9d3de), 0.55);
        // three ridges along the back
        if (Math.abs(Math.cos(a) - 0.92) < 0.02 || Math.abs(Math.cos(a) - 0.6) < 0.02) out.multiplyScalar(0.8);
      },
    });
    g.add(new THREE.Mesh(loftBody({ len: L, w, h, y: yv, paint, seg: 72, rad: 44 }), vcMat({ roughness: 0.5 })));
    // wide flat mouth, gill slits
    const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 1.3, 4, 10).rotateZ(Math.PI / 2), basic(0x0b0f14));
    g.add(at(mouth, 0, -0.2, -4.17));
    const slit = new THREE.BoxGeometry(0.03, 0.6, 0.06);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      const sl = new THREE.Mesh(slit, std(0x1a2a3a));
      sl.rotation.x = 0.15;
      g.add(at(sl, s * (1.18 - i * 0.02), -0.08, -2.7 + i * 0.28));
    }
    eyes(g, 1.02, 0.02, -3.55, 0.07, { iris: 0x0d0d0d }, 0.15);
    fin(g, [[0, 0], [0.35, 0.95], [0.75, 0.9], [0.9, 0]], 'dorsal', 1, 0x2f4a68, 1, [0, 0.82, 0.4]);
    fin(g, [[0, 0], [0.15, 0.35], [0.4, 0]], 'dorsal', 1, 0x2f4a68, 1, [0, 0.4, 2.6]);
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.4, 1.6], [0.9, 1.5], [0.8, 0]], 'side', s, 0x2f4a68, 1, [s * 1.15, -0.45, -1.4]).rotation.z = s * -0.35;
    const tail = new THREE.Group();
    fin(tail, [[0, 0], [0.4, 1.0, 0.95, 2.0], [0.75, 1.0], [0.5, 0.2], [0.75, -0.7], [0.3, -1.1, 0.0, -0.15]], 'dorsal', 1, 0x2f4a68, 1, [0, 0, 0]);
    g.add(at(tail, 0, 0.08, 4.05));
    g.userData.tail = tail;
    return g;
  },

  turtle() {
    const g = new THREE.Group();
    // shell with painted scutes
    const shellGeo = new THREE.SphereGeometry(1, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    shellGeo.scale(0.78, 0.36, 0.98);
    paintGeo(shellGeo, (p, out) => {
      const a = Math.atan2(p.x, p.z), rr = Math.hypot(p.x / 0.78, p.z / 0.98);
      // central row, side rows and rim of plates with dark seams
      const ring = rr < 0.42 ? 0 : rr < 0.82 ? 1 : 2;
      const cells = [3, 8, 22][ring];
      const f = ((a / (Math.PI * 2)) * cells + (ring === 0 ? (p.z > 0 ? 0.5 : 0) : 0) + 10) % 1;
      const seam = Math.min(f, 1 - f) < 0.05 || Math.abs(rr - 0.42) < 0.03 || Math.abs(rr - 0.82) < 0.03;
      out.setHex(seam ? 0x2e2410 : 0x6b5a2a);
      if (!seam) out.lerp(col(0x9b8342), 0.5 * Math.max(0, Math.sin(a * cells * 2 + rr * 9)));
    });
    g.add(new THREE.Mesh(shellGeo, vcMat({ roughness: 0.45 })));
    const plastron = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xe2d39a));
    plastron.scale.set(0.72, 0.12, 0.9);
    g.add(plastron);
    const skin = std(0x8a9466, { roughness: 0.7 });
    // head with beak and eyes
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin);
    head.scale.set(0.2, 0.18, 0.27);
    g.add(at(head, 0, 0.03, -1.12));
    g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 10).rotateX(-Math.PI / 2), std(0x4a4630)), 0, 0.0, -1.38));
    eyes(g, 0.15, 0.08, -1.2, 0.04, { iris: 0x2b1a08 });
    const flips = [];
    const scaleSkin = (len) => {
      const pts = [[0, -0.05], [0.12, len * 0.5], [0.08, len], [-0.06, len * 0.92], [-0.14, len * 0.4], [-0.12, -0.05]];
      return pts;
    };
    for (const s of [-1, 1]) {
      for (const [z, len, wide] of [[-0.45, 1.0, 1], [0.62, 0.45, 0.7]]) {
        const piv = new THREE.Group();
        const f = fin(piv, scaleSkin(len).map(([u, v]) => [u * wide, v]), 'side', s, 0x7d8a5a, 1, [0, 0, 0]);
        f.rotation.y = s * 0.45;
        g.add(at(piv, s * 0.62, -0.04, z));
        flips.push(piv);
      }
    }
    g.userData.flips = flips;
    return g;
  },

  manta() {
    const g = new THREE.Group();
    const top = std(0x1a2028, { roughness: 0.5, side: THREE.DoubleSide });
    const belly = std(0xeceff2, { roughness: 0.5, side: THREE.DoubleSide });
    // central body
    const w = prof([[0, 0.45], [0.15, 0.75], [0.5, 0.82], [0.85, 0.4], [1, 0.08]]);
    const h = prof([[0, 0.12], [0.2, 0.3], [0.5, 0.32], [0.85, 0.18], [1, 0.05]]);
    const paint = countershade(0x1a2028, 0xeceff2, {
      line: 0.0,
      soft: 0.12,
      pattern: (t, a, out) => {
        if (Math.cos(a) > 0.3 && t > 0.15 && t < 0.45 && Math.abs(Math.sin(a)) > 0.45) out.lerp(col(0xdfe3e6), 0.75); // white shoulder patches
      },
    });
    g.add(new THREE.Mesh(loftBody({ len: 2.6, w, h, paint }), vcMat({ roughness: 0.5 })));
    // wings: dark top layer + white underside, swept back with pointed tips
    const pts = [[-0.95, 0], [-0.55, 1.2], [0.1, 2.45], [0.35, 2.75], [0.3, 2.3], [0.55, 1.1], [0.9, 0]];
    const wings = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const up = new THREE.Mesh(finGeo(pts, 'side', s), top);
      up.position.y = 0.012;
      const dn = new THREE.Mesh(finGeo(pts, 'side', s), belly);
      dn.position.y = -0.012;
      piv.add(up, dn);
      g.add(at(piv, s * 0.6, 0, 0));
      wings.push(piv);
      // cephalic lobes (the "horns") and eyes
      const lobe = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 8).rotateX(Math.PI / 2), top);
      lobe.rotation.y = s * 0.15;
      g.add(at(lobe, s * 0.38, 0, -1.48));
      const e = eye(0.05, { iris: 0x101010 });
      e.rotation.y = s * Math.PI / 2;
      g.add(at(e, s * 0.47, 0.06, -1.15));
      // gill slits underneath
      for (let i = 0; i < 5; i++) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.02), basic(0x5a6068)), s * 0.32, -0.27, -0.45 + i * 0.13));
    }
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.05), basic(0x0b0d10)), 0, -0.05, -1.31));
    const tail = taperTube([new THREE.Vector3(0, 0, 1.25), new THREE.Vector3(0, 0.02, 2.0), new THREE.Vector3(0, -0.02, 2.8)], 0.05, 0.008, top, 16, 6);
    g.add(tail);
    g.userData.wings = wings;
    return g;
  },

  tuna() {
    const g = new THREE.Group();
    const L = 2.0;
    const w = prof([[0, 0.04], [0.08, 0.15], [0.3, 0.29], [0.55, 0.26], [0.85, 0.07], [1, 0.04]]);
    const h = prof([[0, 0.04], [0.08, 0.17], [0.3, 0.36], [0.55, 0.3], [0.85, 0.07], [1, 0.05]]);
    const paint = countershade(0x183f86, 0xdfe6ec, {
      line: 0.05,
      soft: 0.2,
      pattern: (t, a, out) => {
        if (Math.abs(Math.cos(a) - 0.1) < 0.12 && t > 0.12 && t < 0.75) out.lerp(col(0xffd23a), 0.55); // yellow side band
        if (Math.cos(a) < -0.2 && Math.sin(t * 70) > 0.6 && t > 0.3 && t < 0.8) out.multiplyScalar(0.9); // faint belly bars
      },
    });
    g.add(new THREE.Mesh(loftBody({ len: L, w, h, paint }), vcMat({ roughness: 0.25, metalness: 0.35 })));
    eyes(g, 0.11, 0.05, -0.72, 0.045, { iris: 0x1a1a1a, ball: 0xc9d4dc }, 0.2);
    const yel = 0xffc928;
    fin(g, [[0, 0], [0.12, 0.25], [0.3, 0]], 'dorsal', 1, 0x183f86, 1, [0, 0.34, -0.25]);
    fin(g, [[0, 0], [0.05, 0.45], [0.25, 0]], 'dorsal', 1, yel, 1, [0, 0.3, 0.12]);
    const anal = fin(g, [[0, 0], [0.05, 0.42], [0.25, 0]], 'dorsal', 1, yel, 1, [0, -0.27, 0.15]);
    anal.rotation.z = Math.PI;
    for (let i = 0; i < 6; i++) {
      for (const sy of [1, -1]) {
        const f = fin(g, [[0, 0], [0.02, 0.06], [0.06, 0]], 'dorsal', 1, yel, 1, [0, sy * (0.2 - i * 0.025), 0.45 + i * 0.07]);
        if (sy < 0) f.rotation.z = Math.PI;
      }
    }
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.25, 0.32], [0.12, 0]], 'side', s, 0x183f86, 1, [s * 0.25, -0.02, -0.35]).rotation.z = s * -0.35;
    const tail = new THREE.Group();
    fin(tail, [[0, 0], [0.15, 0.4, 0.28, 0.55], [0.12, 0.05], [0.28, -0.55], [0.15, -0.4, 0, 0]], 'dorsal', 1, 0x183f86, 1, [0, 0, 0]);
    g.add(at(tail, 0, 0, 0.98));
    g.userData.tail = tail;
    return g;
  },

  moonjelly() {
    const g = new THREE.Group();
    const bellMat = std(0xdcecff, { transparent: true, opacity: 0.4, roughness: 0.12, side: THREE.DoubleSide, depthWrite: false, emissive: 0x203040, emissiveIntensity: 0.3 });
    const bellGeo = new THREE.SphereGeometry(0.8, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    // scalloped rim
    const p = bellGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0.15) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        const k = 1 + Math.sin(a * 16) * 0.03;
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
    }
    bellGeo.computeVertexNormals();
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.scale.y = 0.55;
    g.add(bell);
    // four horseshoe gonads and radial canals
    const gon = std(0xc8a0f0, { transparent: true, opacity: 0.85, emissive: 0x402060, emissiveIntensity: 0.5 });
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 20, Math.PI * 1.4), gon);
      r.rotation.set(Math.PI / 2, 0, (i * Math.PI) / 2);
      bell.add(at(r, Math.cos((i * Math.PI) / 2) * 0.28, 0.3, Math.sin((i * Math.PI) / 2) * 0.28));
    }
    const canal = basic(0xe8f2ff, { transparent: true, opacity: 0.5 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.55), canal);
      c.rotation.y = -a;
      bell.add(at(c, Math.cos(a) * 0.45, 0.62, Math.sin(a) * 0.45));
    }
    // fringe of fine tentacles and four frilly oral arms
    const fr = basic(0xf2f8ff, { transparent: true, opacity: 0.4 });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.35, 3), fr);
      g.add(at(t, Math.cos(a) * 0.79, -0.16, Math.sin(a) * 0.79));
    }
    const arm = std(0xeef6ff, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.78;
      const pts = [];
      for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(Math.cos(a) * (0.1 + k * 0.02) + Math.sin(k * 1.7) * 0.04, -0.05 - k * 0.17, Math.sin(a) * (0.1 + k * 0.02)));
      g.add(taperTube(pts, 0.06, 0.015, arm, 16, 6));
    }
    g.userData.bell = bell;
    return g;
  },

  sunfish() {
    const g = new THREE.Group();
    const L = 2.1;
    const w = prof([[0, 0.12], [0.12, 0.26], [0.45, 0.32], [0.85, 0.25], [1, 0.12]]);
    const h = prof([[0, 0.3], [0.12, 0.85], [0.45, 1.2], [0.85, 1.0], [1, 0.75]]);
    const paint = (t, a, out) => {
      out.setHex(0x8d99a3);
      if (Math.cos(a) < -0.3) out.lerp(col(0xd3d9dd), 0.5);
      const m = Math.sin(t * 40 + Math.cos(a) * 6) * Math.sin(a * 9 - t * 12);
      if (m > 0.5) out.lerp(col(0xc4ccd2), 0.6); // mottled skin
    };
    g.add(new THREE.Mesh(loftBody({ len: L, w, h, paint }), vcMat({ roughness: 0.55, metalness: 0.1 })));
    // clavus: the frilly "tail" at the back
    const clav = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 0.5 + (i / 12) * Math.PI;
      clav.push([Math.cos(a) * -0.1 + 0.18 * (1 + 0.25 * Math.sin(i * 1.9)), Math.sin(a) * 0.9]);
    }
    const clavGeo = finGeo([[0, 0.9], ...clav.map(([u, v]) => [u, v]), [0, -0.9]], 'dorsal');
    g.add(at(new THREE.Mesh(clavGeo, finMat(0x8a96a0, 1)), 0, 0, 0.98));
    const fins = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const f = fin(piv, [[-0.25, 0], [0.05, 1.5], [0.35, 1.35], [0.3, 0]], 'dorsal', 1, 0x7f8b95, 1, [0, 0, 0]);
      if (s < 0) f.rotation.z = Math.PI;
      g.add(at(piv, 0, s * 1.0, 0.55));
      fins.push(piv);
    }
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.08, 0.22], [0.2, 0]], 'side', s, 0x7f8b95, 1, [s * 0.27, 0.1, -0.35]);
    eyes(g, 0.26, 0.32, -0.72, 0.075, { iris: 0x2a2a2a }, 0.1);
    g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 14), std(0x5a4a4a)), 0, 0, -1.05));
    g.userData.fins = fins;
    return g;
  },

  // ======================= twilight & dark zone =======================
  hatchetfish() {
    const g = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry((() => {
      const s = new THREE.Shape();
      s.moveTo(-0.3, 0.12);
      s.lineTo(0.3, 0.1);
      s.lineTo(0.42, 0.0);
      s.lineTo(0.3, -0.05);
      s.quadraticCurveTo(0.0, -0.48, -0.3, -0.32);
      s.closePath();
      return s;
    })(), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -0.04);
    geo.rotateY(Math.PI / 2);
    paintGeo(geo, (p, out) => {
      out.setHex(0xd8e3ec);
      if (p.y > 0.05) out.lerp(col(0x5d6a78), 0.7);
      out.multiplyScalar(0.9 + 0.1 * Math.sin(p.z * 60)); // shimmering scale bands
    });
    g.add(new THREE.Mesh(geo, vcMat({ metalness: 0.6, roughness: 0.25 })));
    photophores(g, Array.from({ length: 10 }, (_, i) => [0.03 * (i % 2 ? 1 : -1), -0.3 + Math.abs(i - 4.5) * 0.025, -0.28 + i * 0.06]), 0x5fd0ff, 0.022);
    // big tubular eyes looking up
    for (const s of [-1, 1]) {
      const e = eye(0.06, { iris: 0x0a0a0a, ball: 0xbfd6e6 });
      e.rotation.set(-0.9, s * 0.6, 0);
      g.add(at(e, s * 0.05, 0.07, -0.28));
    }
    fin(g, [[0, 0], [0.05, 0.12], [0.12, 0]], 'dorsal', 1, 0xc0ccd6, 0.7, [0, 0.12, 0.12]);
    fin(g, [[0, 0], [0.16, 0.1], [0.2, -0.1], [0.12, -0.12]], 'dorsal', 1, 0xc0ccd6, 0.7, [0, 0, 0.38]);
    const wrap = new THREE.Group();
    wrap.add(g);
    return wrap;
  },

  barreleye() {
    const g = new THREE.Group();
    const w = prof([[0, 0.08], [0.2, 0.2], [0.5, 0.22], [0.85, 0.12], [1, 0.05]]);
    const h = prof([[0, 0.08], [0.2, 0.22], [0.5, 0.26], [0.85, 0.12], [1, 0.05]]);
    const paint = (t, a, out) => {
      out.setHex(0x3a2c27);
      if (Math.cos(a) < -0.2) out.lerp(col(0x6b5248), 0.4);
      if (Math.sin(t * 80 + a * 3) > 0.7) out.multiplyScalar(0.8);
    };
    g.add(at(new THREE.Mesh(loftBody({ len: 1.3, w, h, paint }), vcMat({ roughness: 0.45 })), 0, 0, 0.15));
    // transparent dome over the head
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), std(0xd8f6ff, { transparent: true, opacity: 0.28, roughness: 0.03, depthWrite: false }));
    dome.scale.set(0.2, 0.2, 0.32);
    g.add(at(dome, 0, 0.17, -0.25));
    const eyesArr = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.15, 16), basic(0x6dff9a));
      e.position.y = 0.06;
      piv.add(e);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 8), std(0x0d3020, { roughness: 0.05, metalness: 0.4 }));
      lens.position.y = 0.135;
      piv.add(lens);
      g.add(at(piv, s * 0.06, 0.13, -0.24));
      eyesArr.push(piv);
      // nostrils that look like eyes
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), basic(0x0c0c0c)), s * 0.075, 0.03, -0.52));
    }
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.1, 0.42], [0.3, 0.35], [0.25, 0]], 'side', s, 0x5a4038, 0.7, [s * 0.2, -0.05, -0.05], 6, 0x2a1a14).rotation.z = s * -0.3;
    fin(g, [[0, 0], [0.12, 0.2], [0.3, 0.18], [0.3, -0.18], [0.12, -0.2]], 'dorsal', 1, 0x5a4038, 0.7, [0, 0, 0.78]);
    g.userData.eyes = eyesArr;
    return g;
  },

  bristlemouth() {
    const g = new THREE.Group();
    const w = prof([[0, 0.03], [0.15, 0.06], [0.5, 0.06], [1, 0.015]]);
    const h = prof([[0, 0.03], [0.15, 0.085], [0.5, 0.08], [1, 0.02]]);
    g.add(new THREE.Mesh(loftBody({ len: 0.7, w, h, paint: countershade(0x111318, 0x2a2e36) }), vcMat({ roughness: 0.35 })));
    // big mouth with bristle teeth
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.14), basic(0x050505));
    g.add(at(jaw, 0, -0.03, -0.28));
    for (let i = 0; i < 8; i++) g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.025, 4), std(0xe8e4d8)), (i % 2 ? 0.035 : -0.035), -0.022, -0.34 + i * 0.012));
    eyes(g, 0.035, 0.03, -0.25, 0.015, { iris: 0x0a0a0a, ball: 0x9aa4b0 }, 0.3);
    photophores(g, Array.from({ length: 12 }, (_, i) => [(i % 2 ? 1 : -1) * 0.05, -0.05, -0.18 + Math.floor(i / 2) * 0.07]), 0x7dffb0, 0.012);
    fin(g, [[0, 0], [0.06, 0.06], [0.1, -0.06]], 'dorsal', 1, 0x222630, 0.8, [0, 0, 0.34]);
    return g;
  },

  lanternfish() {
    const g = new THREE.Group();
    const w = prof([[0, 0.04], [0.15, 0.13], [0.45, 0.16], [0.85, 0.05], [1, 0.03]]);
    const h = prof([[0, 0.05], [0.15, 0.18], [0.45, 0.22], [0.85, 0.06], [1, 0.04]]);
    g.add(new THREE.Mesh(loftBody({ len: 1.05, w, h, paint: countershade(0x2f3d4c, 0x8fa2b4, { pattern: (t, a, out) => out.multiplyScalar(0.92 + 0.08 * Math.sin(t * 70)) }) }), vcMat({ metalness: 0.45, roughness: 0.3 })));
    eyes(g, 0.1, 0.05, -0.35, 0.055, { iris: 0x0a0a0a, ball: 0xb9c8d6 }, 0.15);
    // rows of light organs on the flanks and belly
    const pts = [];
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) {
      pts.push([s * 0.13, -0.1, -0.25 + i * 0.07]);
      if (i % 2 === 0) pts.push([s * 0.1, -0.16, -0.2 + i * 0.07]);
    }
    photophores(g, pts, 0x6fd8ff, 0.016);
    fin(g, [[0, 0], [0.06, 0.15], [0.16, 0]], 'dorsal', 1, 0x3a4a5a, 0.8, [0, 0.2, -0.05]);
    fin(g, [[0, 0], [0.18, 0.18], [0.1, 0], [0.18, -0.18]], 'dorsal', 1, 0x3a4a5a, 0.85, [0, 0, 0.5]);
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.12, 0.1], [0.08, 0]], 'side', s, 0x3a4a5a, 0.6, [s * 0.12, -0.05, -0.15]);
    g.scale.setScalar(0.9);
    return g;
  },

  gulper() {
    const g = new THREE.Group();
    const black = std(0x101317, { roughness: 0.35 });
    // huge balloon mouth made of thin skin
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.78), std(0x15191e, { roughness: 0.3, side: THREE.DoubleSide }));
    mouth.rotation.x = -Math.PI / 2;
    mouth.scale.set(1, 1.3, 0.8);
    g.add(mouth);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 6, 32), black);
    lip.scale.set(1, 1.3, 1);
    g.add(at(lip, 0, 0, -0.5));
    eyes(g, 0.18, 0.62, -0.42, 0.03, { iris: 0x050505, ball: 0x334 }, 0.4);
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.8) * 0.22, Math.sin(i * 0.5) * 0.05, 0.55 + i * 0.5));
    const tail = taperTube(pts, 0.14, 0.02, black, 40, 8);
    g.add(tail);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), basic(0xff5a8a));
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
    const w = prof([[0, 0.45], [0.2, 0.62], [0.5, 0.62], [0.8, 0.35], [1, 0.12]]);
    const h = prof([[0, 0.35], [0.2, 0.58], [0.5, 0.6], [0.8, 0.35], [1, 0.12]]);
    const paint = (t, a, out) => {
      out.setHex(0x1d1a1f);
      const n = Math.sin(t * 50 + a * 7) * Math.sin(a * 13 - t * 20);
      out.multiplyScalar(0.85 + n * 0.25); // warty skin
      if (Math.cos(a) < -0.5) out.lerp(col(0x2c2629), 0.4);
    };
    g.add(at(new THREE.Mesh(loftBody({ len: 1.5, w, h, paint, rad: 22 }), vcMat({ roughness: 0.8 })), 0, 0, 0.05));
    // jaw and a ring of needle teeth
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0x141114, { roughness: 0.7 }));
    g.add(at(jaw, 0, -0.12, -0.42));
    const tm = std(0xf1efe6, { roughness: 0.25, transparent: true, opacity: 0.92 });
    const tg = new THREE.ConeGeometry(0.022, 0.24, 6);
    for (let i = 0; i < 15; i++) {
      const a = -1.35 + (i / 14) * 2.7;
      const t = new THREE.Mesh(tg, tm);
      t.position.set(Math.sin(a) * 0.48, -0.06, -0.6 - Math.cos(a) * 0.2);
      t.rotation.set(Math.PI + 0.25, 0, Math.sin(a) * 0.3);
      g.add(t);
      if (i % 2 === 0) {
        const u = new THREE.Mesh(tg, tm);
        u.position.set(Math.sin(a) * 0.42, 0.12, -0.62 - Math.cos(a) * 0.17);
        u.rotation.set(-0.25, 0, -Math.sin(a) * 0.3);
        u.scale.setScalar(0.7);
        g.add(u);
      }
    }
    eyes(g, 0.33, 0.24, -0.38, 0.045, { iris: 0x050505, ball: 0x5a5560 }, 0.3);
    const stalk = taperTube([new THREE.Vector3(0, 0.55, -0.2), new THREE.Vector3(0, 1.08, -0.5), new THREE.Vector3(0, 0.95, -1.1)], 0.035, 0.018, std(0x2b2629), 20, 6);
    g.add(stalk);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), basic(0x9fffe0));
    bulb.position.set(0, 0.9, -1.15);
    g.add(bulb);
    for (let i = 0; i < 3; i++) put(g, at(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.12, 4), std(0x2b2629)), (i - 1) * 0.05, 0.86, -1.24)).rotation.x = Math.PI + 0.6;
    const glow = glowSprite(0x7dffd8, 2.2, 0.9);
    glow.position.copy(bulb.position);
    g.add(glow);
    g.userData.glow = glow;
    fin(g, [[0, 0], [0.15, 0.25], [0.4, 0]], 'dorsal', 1, 0x1d1a1f, 1, [0, 0.45, 0.45]);
    fin(g, [[0, 0], [0.3, 0.35], [0.2, 0], [0.3, -0.35]], 'dorsal', 1, 0x1d1a1f, 1, [0, 0, 0.8], 5, 0x3a3438);
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.12, 0.2], [0.22, 0.05]], 'side', s, 0x1d1a1f, 1, [s * 0.55, -0.1, 0.15]);
    return g;
  },

  seapig() {
    const g = new THREE.Group();
    const pinkMat = std(0xe9a3b6, { transparent: true, opacity: 0.86, roughness: 0.3, emissive: 0x3a0a18, emissiveIntensity: 0.25 });
    const w = prof([[0, 0.18], [0.2, 0.34], [0.6, 0.36], [1, 0.2]]);
    const h = prof([[0, 0.15], [0.2, 0.26], [0.6, 0.28], [1, 0.16]]);
    const paint = (t, a, out) => {
      out.setHex(0xeaa6b8);
      if (Math.cos(a) < -0.3) out.lerp(col(0xf5d3dc), 0.6);
    };
    const body = new THREE.Mesh(loftBody({ len: 1.1, w, h, paint }), vcMat({ transparent: true, opacity: 0.86, roughness: 0.3 }));
    g.add(at(body, 0, 0.3, 0));
    // tube feet (legs) and the antennae-like papillae on the back
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), pinkMat);
      leg.rotation.z = s * 0.3;
      g.add(at(leg, s * 0.27, 0.1, -0.4 + i * 0.2));
    }
    for (const s of [-1, 1]) {
      const ant = taperTube([new THREE.Vector3(s * 0.08, 0.5, -0.25), new THREE.Vector3(s * 0.16, 0.72, -0.28), new THREE.Vector3(s * 0.22, 0.86, -0.2)], 0.045, 0.02, pinkMat, 10, 6);
      g.add(ant);
    }
    return g;
  },

  seacucumber() {
    const g = new THREE.Group();
    const paint = (t, a, out) => {
      out.setHex(0xe08aa6);
      out.lerp(col(0xf3b8c9), 0.3 + 0.3 * Math.sin(t * 40) * Math.sin(a * 6));
    };
    const w = prof([[0, 0.16], [0.15, 0.27], [0.8, 0.26], [1, 0.12]]);
    const h = prof([[0, 0.13], [0.15, 0.22], [0.8, 0.21], [1, 0.1]]);
    g.add(new THREE.Mesh(loftBody({ len: 1.5, w, h, paint }), vcMat({ transparent: true, opacity: 0.84, roughness: 0.3, emissive: 0x401020, emissiveIntensity: 0.25 })));
    const skin = std(0xe08aa6, { transparent: true, opacity: 0.82, roughness: 0.35 });
    // papillae on the back, feeding tentacles at the front, many tube feet
    const pg = new THREE.ConeGeometry(0.04, 0.26, 6);
    for (let i = 0; i < 6; i++) for (const s of [-0.5, 0.5]) g.add(at(new THREE.Mesh(pg, skin), s * 0.2, 0.24, -0.45 + i * 0.18));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tnt = taperTube([new THREE.Vector3(Math.cos(a) * 0.08, Math.sin(a) * 0.06, -0.72), new THREE.Vector3(Math.cos(a) * 0.16, Math.sin(a) * 0.12 + 0.05, -0.85), new THREE.Vector3(Math.cos(a) * 0.2, Math.sin(a) * 0.14 - 0.05, -0.95)], 0.025, 0.008, skin, 8, 5);
      g.add(tnt);
    }
    const lg = new THREE.ConeGeometry(0.03, 0.14, 6);
    for (let i = 0; i < 12; i++) {
      const leg = new THREE.Mesh(lg, skin);
      leg.rotation.x = Math.PI;
      g.add(at(leg, (i % 2 ? 0.15 : -0.15), -0.2, -0.5 + Math.floor(i / 2) * 0.2));
    }
    return g;
  },

  vampire() {
    const g = new THREE.Group();
    const w = prof([[0, 0.12], [0.3, 0.36], [0.7, 0.34], [1, 0.2]]);
    const h = prof([[0, 0.12], [0.3, 0.36], [0.7, 0.34], [1, 0.2]]);
    const paint = (t, a, out) => {
      out.setHex(0x6a1220);
      out.multiplyScalar(0.85 + 0.15 * Math.sin(t * 30 + a * 5));
    };
    const mantle = new THREE.Mesh(loftBody({ len: 0.95, w, h, paint }), vcMat({ roughness: 0.45 }));
    g.add(at(mantle, 0, 0, -0.25));
    // webbed cape between eight arms, with white-tipped spines
    const capeMat = std(0x3d0812, { side: THREE.DoubleSide, roughness: 0.5 });
    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.0, 32, 4, true), capeMat);
    cape.rotation.x = -Math.PI / 2;
    cape.position.z = 0.65;
    const cp = cape.geometry.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const y = cp.getY(i);
      if (y < -0.3) {
        const a = Math.atan2(cp.getZ(i), cp.getX(i));
        const k = 1 - 0.12 * (0.5 + 0.5 * Math.cos(a * 8));
        cp.setX(i, cp.getX(i) * k);
        cp.setZ(i, cp.getZ(i) * k);
      }
    }
    cape.geometry.computeVertexNormals();
    g.add(cape);
    const spine = std(0xf2ece0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 5), spine);
      s.rotation.x = Math.PI / 2;
      cape.add(at(s, Math.cos(a) * 0.82, -0.45, Math.sin(a) * 0.82));
    }
    for (const s of [-1, 1]) {
      const finM = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), std(0x6a1220));
      finM.scale.set(1, 0.2, 0.7);
      g.add(at(finM, s * 0.42, 0, -0.62));
    }
    // big blue eyes
    eyes(g, 0.27, 0.12, 0.05, 0.09, { glow: 0x4fc3ff, ball: 0x2a0a10 }, 0.1);
    g.userData.cape = cape;
    return g;
  },

  grenadier() {
    const g = new THREE.Group();
    const L = 3.3;
    const w = prof([[0, 0.12], [0.08, 0.32], [0.18, 0.36], [0.4, 0.26], [0.8, 0.08], [1, 0.01]]);
    const h = prof([[0, 0.12], [0.08, 0.36], [0.18, 0.42], [0.4, 0.3], [0.8, 0.1], [1, 0.01]]);
    const paint = countershade(0x6f5e4c, 0xa8988a, {
      pattern: (t, a, out) => {
        out.multiplyScalar(0.9 + 0.1 * Math.sin(t * 120) * Math.sin(a * 14)); // rough scales
      },
    });
    const body = new THREE.Mesh(loftBody({ len: L, w, h, paint, seg: 36 }), vcMat({ roughness: 0.5, metalness: 0.12 }));
    // the head at z ≈ -0.2: shift so the old pivot stays at the head
    const tail = new THREE.Group();
    tail.add(at(body, 0, 0, L / 2 - 0.45));
    g.add(tail);
    eyes(g, 0.24, 0.12, -0.28, 0.11, { iris: 0x0a0a10, ball: 0x384050 }, 0.15);
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.18, 5), std(0x8a7a66)), 0, -0.32, -0.42));
    fin(tail, [[0, 0], [0.08, 0.45], [0.25, 0]], 'dorsal', 1, 0x5f5040, 1, [0, 0.36, 0.0]);
    fin(tail, [[0, 0], [1.8, 0.04], [1.9, 0]], 'dorsal', 1, 0x5f5040, 0.8, [0, 0.25, 0.35]);
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.18, 0.25], [0.3, 0.05]], 'side', s, 0x5f5040, 0.8, [s * 0.3, -0.08, 0.05]);
    g.userData.tail = tail;
    return g;
  },

  dumbo() {
    const g = new THREE.Group();
    const mat = std(0xf0a787, { roughness: 0.4, transparent: true, opacity: 0.93 });
    const bellGeo = new THREE.SphereGeometry(0.55, 28, 20);
    paintGeo(bellGeo, (p, out) => {
      out.setHex(0xf0a787);
      out.lerp(col(0xf6c6ae), 0.4 * (0.5 + 0.5 * Math.sin(p.x * 30) * Math.sin(p.y * 24))); // speckles
    });
    const bell = new THREE.Mesh(bellGeo, vcMat({ roughness: 0.4, transparent: true, opacity: 0.93 }));
    bell.scale.set(1, 1.1, 1);
    g.add(bell);
    // webbed arms (skirt) with eight arm tips
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.6, 32, 3, true), std(0xe98f72, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    skirt.position.y = -0.55;
    const sp = skirt.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      if (sp.getY(i) < 0.1) {
        const a = Math.atan2(sp.getZ(i), sp.getX(i));
        const k = 1 - 0.15 * (0.5 + 0.5 * Math.cos(a * 8 + Math.PI));
        sp.setX(i, sp.getX(i) * k);
        sp.setZ(i, sp.getZ(i) * k);
      }
    }
    skirt.geometry.computeVertexNormals();
    g.add(skirt);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat), Math.cos(a) * 0.74, -0.86, Math.sin(a) * 0.74));
    }
    const ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      const em = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), mat);
      em.scale.set(1, 0.14, 0.72);
      em.position.x = s * 0.18;
      ear.add(em);
      g.add(at(ear, s * 0.48, 0.32, 0));
      ears.push(ear);
    }
    eyes(g, 0.27, 0.05, -0.43, 0.075, { iris: 0x1a1210 }, 0.45);
    g.userData.ears = ears;
    return g;
  },

  supergiant() {
    const g = new THREE.Group();
    const mat = std(0xf3efe6, { roughness: 0.3 });
    const segs = 9;
    for (let i = 0; i < segs; i++) {
      const a = -0.7 + i * 0.175;
      const r = 0.24 - Math.abs(i - 3.5) * 0.018;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
      seg.scale.set(1.05, 0.9, 0.72);
      seg.position.set(0, Math.cos(a) * 0.42 - 0.3, -Math.sin(a) * 1.05);
      seg.rotation.x = a;
      g.add(seg);
      if (i > 0 && i < segs - 1) for (const s of [-1, 1]) {
        const leg = taperTube([new THREE.Vector3(s * 0.15, seg.position.y - 0.1, seg.position.z), new THREE.Vector3(s * 0.28, seg.position.y - 0.25, seg.position.z - 0.03), new THREE.Vector3(s * 0.3, seg.position.y - 0.45, seg.position.z + 0.02)], 0.025, 0.01, mat, 6, 5);
        g.add(leg);
      }
    }
    // head with antennae and dark eyes
    for (const s of [-1, 1]) {
      g.add(taperTube([new THREE.Vector3(s * 0.06, 0.05, -1.0), new THREE.Vector3(s * 0.2, 0.25, -1.35), new THREE.Vector3(s * 0.3, 0.2, -1.75)], 0.02, 0.006, mat, 10, 5));
      g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), basic(0x1a1a1a)), s * 0.12, 0.02, -0.98));
    }
    g.scale.setScalar(1.1);
    return g;
  },

  amphipod() {
    const g = new THREE.Group();
    const mat = std(0xf2b9a0, { roughness: 0.35, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat);
      seg.scale.set(1, 0.85, 0.65);
      seg.position.set(0, Math.cos(-0.6 + i * 0.2) * 0.08, -0.16 + i * 0.05);
      g.add(seg);
      for (const s of [-1, 1]) put(g, at(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.09, 4), mat), s * 0.05, -0.04, seg.position.z)).rotation.z = s * 0.5;
    }
    for (const s of [-1, 1]) g.add(taperTube([new THREE.Vector3(s * 0.02, 0.05, -0.18), new THREE.Vector3(s * 0.06, 0.12, -0.26), new THREE.Vector3(s * 0.1, 0.1, -0.34)], 0.008, 0.003, mat, 6, 4));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), basic(0x111111)), 0.03, 0.06, -0.17));
    return g;
  },

  snailfish() {
    const g = new THREE.Group();
    const L = 2.0;
    const w = prof([[0, 0.25], [0.12, 0.36], [0.3, 0.3], [0.7, 0.14], [1, 0.02]]);
    const h = prof([[0, 0.22], [0.12, 0.34], [0.3, 0.32], [0.7, 0.18], [1, 0.03]]);
    const paint = (t, a, out) => {
      out.setHex(0xf5d6d0);
      if (t < 0.25) out.lerp(col(0xf9e6e1), 0.4);
      out.lerp(col(0xe8b4ad), 0.25 * Math.max(0, Math.sin(t * 25 + a * 2)));
    };
    const body = new THREE.Mesh(loftBody({ len: L, w, h, paint }), vcMat({ transparent: true, opacity: 0.86, roughness: 0.25 }));
    const tail = new THREE.Group();
    tail.add(at(body, 0, 0, L / 2 - 0.35));
    g.add(tail);
    // long soft fins along the back and belly
    fin(tail, [[0, 0], [0.4, 0.25], [1.35, 0.18], [1.62, 0]], 'dorsal', 1, 0xf3c9c2, 0.55, [0, 0.22, 0.05]);
    const anal = fin(tail, [[0, 0], [0.4, 0.2], [1.25, 0.15], [1.5, 0]], 'dorsal', 1, 0xf3c9c2, 0.55, [0, -0.2, 0.15]);
    anal.rotation.z = Math.PI;
    for (const s of [-1, 1]) fin(g, [[0, 0], [0.18, 0.28], [0.3, 0.05]], 'side', s, 0xf3c9c2, 0.6, [s * 0.3, -0.08, -0.05]);
    eyes(g, 0.21, 0.13, -0.28, 0.045, { iris: 0x1a1a1a, ball: 0x55555c }, 0.2);
    g.userData.tail = tail;
    return g;
  },

  combjelly() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 20), std(0xbfe9ff, { transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
    body.scale.set(0.8, 1.2, 0.8);
    g.add(body);
    // inner gut and eight comb rows made of little paddles that shimmer in rainbow colours
    g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.6, 4, 10), std(0xffd0e8, { transparent: true, opacity: 0.45 })));
    const rows = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const row = new THREE.Group();
      row.rotation.y = (i / 8) * Math.PI * 2;
      for (let k = 0; k < 14; k++) {
        const a = -1.25 + (k / 13) * 2.5;
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.03), m);
        pad.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.72, 0);
        pad.rotation.z = a;
        row.add(pad);
      }
      g.add(row);
      rows.push(m);
    }
    g.userData.rows = rows;
    return g;
  },

  // ======================= seafloor objects =======================
  xeno() {
    const g = new THREE.Group();
    const geo = lumpy(0.6, 3, 4.2, 0.28, 0.6);
    paintGeo(geo, (p, out) => {
      out.setHex(0xc9b48c);
      out.lerp(col(0x8e7a58), 0.5 * (0.5 + 0.5 * Math.sin(p.x * 31) * Math.sin(p.z * 27))); // lacy, fragile surface
    });
    g.add(at(new THREE.Mesh(geo, vcMat({ roughness: 1 })), 0, 0.25, 0));
    return g;
  },

  tubeworm() {
    const g = new THREE.Group();
    const tubeMat = std(0xe9e4d4, { roughness: 0.75 });
    const plume = std(0xc7303f, { roughness: 0.5, emissive: 0x3a0508, emissiveIntensity: 0.3 });
    const r = mulberry32(7);
    for (let i = 0; i < 34; i++) {
      const h = 0.8 + r() * 1.6;
      const x = (r() - 0.5) * 3.4, z = (r() - 0.5) * 3.4;
      const lean = (r() - 0.5) * 0.4;
      const tb = taperTube([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + lean * 0.3, h * 0.5, z), new THREE.Vector3(x + lean, h, z + lean * 0.4)], 0.06, 0.042, tubeMat, 8, 7);
      g.add(tb);
      // feathery red plume
      const tip = new THREE.Vector3(x + lean, h, z + lean * 0.4);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + r();
        const f = taperTube([tip, tip.clone().add(new THREE.Vector3(Math.cos(a) * 0.08, 0.12, Math.sin(a) * 0.08)), tip.clone().add(new THREE.Vector3(Math.cos(a) * 0.14, 0.2, Math.sin(a) * 0.14))], 0.03, 0.008, plume, 5, 5);
        g.add(f);
      }
    }
    return g;
  },

  clam() {
    const g = new THREE.Group();
    const r = mulberry32(11);
    const shellGeo = new THREE.SphereGeometry(0.18, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    paintGeo(shellGeo, (p, out) => {
      const a = Math.atan2(p.z, p.x);
      out.setHex(0xece2c6);
      if (Math.sin(Math.hypot(p.x, p.z) * 120) > 0.6) out.lerp(col(0xbfb291), 0.6); // growth rings
      void a;
    });
    const mat = vcMat({ roughness: 0.45 });
    for (let i = 0; i < 24; i++) {
      const c = new THREE.Group();
      const top = new THREE.Mesh(shellGeo, mat);
      top.scale.set(1.4, 0.6, 0.9);
      c.add(top);
      const bot = new THREE.Mesh(shellGeo, mat);
      bot.scale.set(1.4, -0.4, 0.9);
      c.add(bot);
      c.rotation.set((r() - 0.5) * 0.4, r() * 6, 0);
      c.position.set((r() - 0.5) * 3, 0.04, (r() - 0.5) * 3);
      g.add(c);
    }
    return g;
  },

  sediment() {
    const g = new THREE.Group();
    const mound = new THREE.Mesh(lumpy(1, 2, 2.3, 0.12, 0.3), std(0x5a4632, { roughness: 0.95 }));
    mound.scale.set(0.9, 1, 0.75);
    g.add(mound);
    // clear core tube full of layered mud
    const core = new THREE.CylinderGeometry(0.09, 0.09, 0.8, 16);
    paintGeo(core, (p, out) => out.setHex([0x6b5236, 0x8a6d47, 0x4a3a2a, 0x9b8461][Math.floor((p.y + 0.4) * 8) % 4]));
    g.add(at(new THREE.Mesh(core, vcMat({ roughness: 0.6 })), -0.25, 0.4, 0.1));
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), std(0xffc21a)), -0.25, 0.82, 0.1));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 10), std(0x9aa6b2, { metalness: 0.6, roughness: 0.3 }));
    pole.position.set(0.2, 0.55, 0);
    g.add(pole);
    const flagGeo = new THREE.PlaneGeometry(0.42, 0.26, 6, 2);
    const fp = flagGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin((fp.getX(i) + 0.21) * 9) * 0.03);
    flagGeo.computeVertexNormals();
    const flag = new THREE.Mesh(flagGeo, std(0xffc21a, { side: THREE.DoubleSide, emissive: 0xffc21a, emissiveIntensity: 0.4 }));
    flag.position.set(0.42, 0.95, 0);
    g.add(flag);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), basic(0xffd84a));
    light.position.set(0.2, 1.12, 0);
    g.add(light);
    const glow = glowSprite(0xffd84a, 1.4, 0.7);
    glow.position.copy(light.position);
    g.add(glow);
    g.userData.glow = glow;
    return g;
  },

  nodule() {
    const g = new THREE.Group();
    const geo = lumpy(0.35, 3, 5.1, 0.2, 0.8);
    paintGeo(geo, (p, out) => {
      out.setHex(0x2a2522);
      out.lerp(col(0x5a4636), 0.4 * Math.max(0, Math.sin(p.x * 40) * Math.sin(p.z * 37))); // rusty crust
    });
    g.add(at(new THREE.Mesh(geo, vcMat({ roughness: 0.75, metalness: 0.45 })), 0, 0.2, 0));
    // small knobs (manganese grows in botryoidal bumps)
    const k = new THREE.SphereGeometry(1, 8, 6);
    const km = std(0x332c28, { roughness: 0.7, metalness: 0.4 });
    const r = mulberry32(9);
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, b = r() * 1.2;
      const m = new THREE.Mesh(k, km);
      m.scale.setScalar(0.05 + r() * 0.05);
      g.add(at(m, Math.cos(a) * Math.cos(b) * 0.33, 0.2 + Math.sin(b) * 0.24, Math.sin(a) * Math.cos(b) * 0.33));
    }
    return g;
  },

  litter() {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1.2, 1.4, 10, 10);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5) * 0.12 + Math.cos(p.getY(i) * 6) * 0.1 + Math.sin(p.getX(i) * 13 + p.getY(i) * 9) * 0.03);
    geo.computeVertexNormals();
    const bag = new THREE.Mesh(geo, std(0xe8f2f6, { transparent: true, opacity: 0.7, side: THREE.DoubleSide, roughness: 0.25 }));
    bag.rotation.x = -Math.PI / 2 + 0.3;
    bag.position.y = 0.2;
    g.add(bag);
    // plastic bottle with cap and label
    const bottle = new THREE.Group();
    bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 18), std(0x6fb6d8, { transparent: true, opacity: 0.65, roughness: 0.1 })));
    bottle.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.14, 18), std(0x6fb6d8, { transparent: true, opacity: 0.65, roughness: 0.1 })), 0, 0.32, 0));
    bottle.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 14), std(0x2a6cd8)), 0, 0.42, 0));
    bottle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.16, 18, 1, true), std(0xd8342a, { side: THREE.DoubleSide })));
    bottle.rotation.z = Math.PI / 2;
    bottle.position.set(0.6, 0.12, 0.3);
    g.add(bottle);
    // dented can
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 16), std(0xc9ced4, { metalness: 0.8, roughness: 0.3 }));
    const cp = can.geometry.attributes.position;
    for (let i = 0; i < cp.count; i++) if (cp.getX(i) > 0.04 && Math.abs(cp.getY(i)) < 0.06) cp.setX(i, cp.getX(i) * 0.75);
    can.geometry.computeVertexNormals();
    can.rotation.set(Math.PI / 2, 0, 0.6);
    can.position.set(-0.45, 0.08, -0.35);
    g.add(can);
    return g;
  },

  lander() {
    const g = new THREE.Group();
    const frame = std(0x9aa3ab, { metalness: 0.7, roughness: 0.35 });
    const dark = std(0x22262c, { metalness: 0.3, roughness: 0.5 });
    // tripod legs with feet and cross braces
    const feet = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const foot = new THREE.Vector3(Math.cos(a) * 1.15, 0.05, Math.sin(a) * 1.15);
      const top = new THREE.Vector3(Math.cos(a) * 0.45, 2.2, Math.sin(a) * 0.45);
      g.add(tube([foot, top], 0.055, frame, 2, 10));
      g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 16), dark), foot.x, 0.04, foot.z));
      feet.push({ foot, top });
    }
    for (let i = 0; i < 3; i++) {
      const A = feet[i], B = feet[(i + 1) % 3];
      const pa = A.foot.clone().lerp(A.top, 0.35), pb = B.foot.clone().lerp(B.top, 0.35);
      g.add(tube([pa, pb], 0.03, frame, 2, 8));
    }
    // ballast weight, two yellow syntactic-foam floats, camera, light, strobe
    g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), std(0x3a3a3a, { roughness: 0.9 })), 0, 0.13, 0));
    const float = std(0xf5c518, { roughness: 0.4 });
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), float);
      f.position.set(i ? 0.5 : -0.5, 2.5, 0);
      g.add(f);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 28), dark);
      band.position.copy(f.position);
      band.rotation.y = Math.PI / 2;
      g.add(band);
    }
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 16).rotateX(Math.PI / 2), std(0x2a2e34, { metalness: 0.5 }));
    cam.position.set(0, 1.5, 0.3);
    g.add(cam);
    g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), std(0x0a1a2a, { roughness: 0.05, metalness: 0.6 })), 0, 1.5, 0.551));
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12).rotateX(Math.PI / 2), frame), 0.35, 1.65, 0.25));
    g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), basic(0xfff4d0)), 0.35, 1.65, 0.401));
    // little orange flag and the label "LANDER"
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), frame), -0.5, 3.15, 0));
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), std(0xff6a1a, { side: THREE.DoubleSide }));
    g.add(at(fl, -0.35, 3.4, 0));
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    strobe.position.set(0, 3.1, 0);
    g.add(strobe);
    const glow = glowSprite(0xff3030, 3, 0.9);
    glow.position.copy(strobe.position);
    g.add(glow);
    g.userData.strobe = glow;
    return g;
  },

  whale() {
    const g = new THREE.Group();
    const bone = std(0xe6dfcc, { roughness: 0.8 });
    const mat = std(0xf2f2f2, { roughness: 1, transparent: true, opacity: 0.55 });
    // vertebrae with spines, ribs, a big skull with jaw bones
    for (let i = 0; i < 24; i++) {
      const z = -9 + i * 0.8;
      const s = 1 - Math.max(0, i - 14) * 0.07;
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.28 * s, 0.55, 12).rotateX(Math.PI / 2), bone);
      v.position.set(Math.sin(i * 0.25) * 0.15, 0.35, z);
      g.add(v);
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45 * s, 0.18), bone);
      g.add(at(sp, v.position.x, 0.7, z));
      if (i > 2 && i < 14) {
        for (const side of [-1, 1]) {
          const rib = taperTube([new THREE.Vector3(side * 0.25, 0.4, z), new THREE.Vector3(side * 1.3, 0.55, z + 0.2), new THREE.Vector3(side * 1.75, 0.05, z + 0.35)], 0.07, 0.04, bone, 10, 6);
          g.add(rib);
        }
      }
    }
    const skull = new THREE.Mesh(lumpy(1, 2, 7.7, 0.08, 0.45), bone);
    skull.scale.set(1.2, 1, 1.8);
    g.add(at(skull, 0, 0.45, -11));
    for (const side of [-1, 1]) g.add(taperTube([new THREE.Vector3(side * 0.7, 0.2, -10.2), new THREE.Vector3(side * 0.95, 0.15, -12.5), new THREE.Vector3(side * 0.4, 0.12, -14.3)], 0.12, 0.07, bone, 12, 8));
    const mat2 = new THREE.Mesh(new THREE.CircleGeometry(6, 32), mat);
    mat2.rotation.x = -Math.PI / 2;
    mat2.position.y = 0.05;
    g.add(mat2);
    return g;
  },
};
