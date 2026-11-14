// Merfolk: the mermaid figure (used for the sub ISABELLA and – in other colours – for the mermaid of Atlantis)
// and Neptune, the sea king of Atlantis. All original designs, built from lofted, vertex-painted bodies.
// Convention for the mermaid: she swims lying on her belly, head at -z, back = +y.
// Neptune stands upright, facing -z.

import * as THREE from './vendor/three.min.js';
import { PartBuilder } from './parts.js';
import { loftBody, prof, thickFin, eye, finMat, finRays } from './detail.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.08, ...o });
// soft round dot for glitter and bubbles (points would otherwise be square)
let dotTex = null;
export function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}
const vc = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.1, ...o });
const lerp = (a, b, k) => a + (b - a) * k;
const C1 = new THREE.Color(), C2 = new THREE.Color();
function grad(cols, u, out) {
  u = Math.min(1, Math.max(0, u)) * (cols.length - 1);
  const i = Math.min(cols.length - 2, Math.floor(u));
  C1.set(cols[i]);
  C2.set(cols[i + 1]);
  return out.copy(C1).lerp(C2, u - i);
}
// capsule along +z starting at z = 0
function capZ(r, len, seg = 8) {
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 4, seg);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, len / 2);
  return g;
}

// colour schemes – ISABELLA (the sub) and the mermaid of Atlantis look clearly different
export const MER_PALETTES = {
  isabella: { skin: 0xf6caa6, hair: [0xffd64f, 0xffb24a, 0xff8fbf], top: 0xff5f93, pearl: 0xfff4fa, tail: [0x18c7b4, 0x34d6ff, 0x5a8cff, 0x9c5cff], fin: 0xffcf4a, iris: 0x4a3ad8, gold: 0xffcf4a, gem: 0x9ff3ff },
  atlantis: { skin: 0xe8b38d, hair: [0xe6dcff, 0xc8b2ff, 0xff8fe0], top: 0x2fd6c8, pearl: 0xffffff, tail: [0xff8a6a, 0xff4f9a, 0xd23cff, 0x7a4cff], fin: 0xffb08a, iris: 0x14a37f, gold: 0xfff0f8, gem: 0xff7ad9 },
};

// ---------------------------------------------------------------------------
// Mermaid figure. Returns { group, rig, info }.
export function buildMerFigure(P, { sub = false } = {}) {
  const g = new THREE.Group();
  const rig = { P, armL: null, armR: null, tail: [], fins: [], strands: [], eyes: [], head: null, fluke: null, gemMat: null, t0: Math.random() * 10 };
  const M = {
    body: vc({ roughness: 0.5 }),
    skin: std(P.skin, { roughness: 0.55 }),
    hair: std(P.hair[0], { roughness: 0.4, metalness: 0.15 }),
    gold: std(P.gold, { metalness: 0.85, roughness: 0.28, emissive: P.gold, emissiveIntensity: 0.12 }),
    pearl: std(P.pearl, { metalness: 0.35, roughness: 0.18, emissive: 0x332a33, emissiveIntensity: 0.2 }),
    dark: std(0x3a2416, { roughness: 0.6 }),
    lips: std(0xe0506f, { roughness: 0.4 }),
    cheek: new THREE.MeshBasicMaterial({ color: 0xff8fb0, transparent: true, opacity: 0.5, depthWrite: false }),
    tail: vc({ roughness: 0.3, metalness: 0.35, emissive: P.tail[1], emissiveIntensity: 0.06 }),
    fin: finMat(P.fin, 0.9),
  };
  rig.gemMat = new THREE.MeshStandardMaterial({ color: P.gem, emissive: P.gem, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.2 });
  const B = new PartBuilder();

  // ---- torso (shoulders at z = -1.95, waist at z = -0.5) with a sequin top and pearl trims ----
  const TL = 1.45, tz0 = -1.95;
  const tw = prof([[0, 0.36], [0.12, 0.45], [0.35, 0.47], [0.72, 0.37], [1, 0.4]]);
  const th = prof([[0, 0.3], [0.15, 0.34], [0.4, 0.35], [0.75, 0.29], [1, 0.31]]);
  const TOP = new THREE.Color(P.top), SKIN = new THREE.Color(P.skin);
  const torso = loftBody({ len: TL, w: tw, h: th, seg: 26, rad: 22, paint: (t, a, out) => {
    if (t > 0.14 && t < 0.52) {
      out.copy(TOP).multiplyScalar(0.86 + 0.14 * Math.abs(Math.sin(t * 95) * Math.sin(a * 13)));
    } else out.copy(SKIN);
  } });
  torso.translate(0, 0.02, tz0 + TL / 2);
  B.add(M.body, torso);
  for (const tt of [0.14, 0.52]) {
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      B.add(M.pearl, new THREE.SphereGeometry(0.03, 8, 6), { p: [Math.sin(a) * tw(tt) * 1.03, 0.02 + Math.cos(a) * th(tt) * 1.03, tz0 + tt * TL] });
    }
  }
  // golden sash with a star at the waist
  B.add(M.gold, new THREE.TorusGeometry(1, 0.035, 6, 30), { p: [0, 0.02, tz0 + TL * 0.97], s: [tw(0.97) * 1.04, th(0.97) * 1.06, 1] });
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.045 : 0.11, a = (i / 10) * Math.PI * 2;
    if (i) star.lineTo(Math.sin(a) * r, Math.cos(a) * r);
    else star.moveTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  B.add(M.gold, new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: false }), { p: [0, 0.02 - th(0.97) * 1.06, tz0 + TL * 0.97], r: [Math.PI / 2, 0, 0] });
  // neck
  B.add(M.skin, new THREE.CylinderGeometry(0.14, 0.17, 0.42, 14), { p: [0, 0.14, -2.07], r: [Math.PI / 2 - 0.65, 0, 0] });

  // ---- head (face towards -z, lifted so she looks ahead) ----
  const head = new THREE.Group();
  head.position.set(0, 0.36, -2.3);
  g.add(head);
  rig.head = head;
  const HB = new PartBuilder();
  HB.add(M.skin, new THREE.SphereGeometry(0.46, 28, 20));
  for (const s of [-1, 1]) {
    const e = eye(0.105, { iris: P.iris });
    e.position.set(s * 0.165, 0.04, -0.38);
    e.rotation.y = Math.PI - s * 0.22;
    head.add(e);
    rig.eyes.push(e);
    // brows and lashes
    HB.add(M.dark, new THREE.BoxGeometry(0.12, 0.018, 0.02), { p: [s * 0.17, 0.17, -0.41], r: [0, 0, s * 0.18] });
    for (let k = 0; k < 3; k++) HB.add(M.dark, new THREE.BoxGeometry(0.012, 0.045, 0.012), { p: [s * (0.14 + k * 0.04), 0.135, -0.43], r: [0.4, 0, s * (0.35 - k * 0.25)] });
    // rosy cheeks
    const ck = new THREE.Mesh(new THREE.CircleGeometry(0.065, 16), M.cheek);
    ck.position.set(s * 0.27, -0.06, -0.37);
    ck.rotation.y = Math.PI - s * 0.55;
    head.add(ck);
  }
  HB.add(M.skin, new THREE.SphereGeometry(0.038, 10, 8), { p: [0, -0.03, -0.46] });
  HB.add(M.lips, new THREE.TorusGeometry(0.075, 0.016, 6, 18, Math.PI), { p: [0, -0.135, -0.41], r: [0.25, 0, Math.PI] });
  // hair: cap over the back and the top, fringe over the forehead (the face stays free)
  const FACE = 1.0;
  HB.add(M.hair, new THREE.SphereGeometry(0.5, 26, 16, Math.PI * 1.5 + FACE, Math.PI * 2 - 2 * FACE, 0, Math.PI * 0.64), { p: [0, 0.03, 0.03], s: [1.06, 1.05, 1.1] });
  HB.add(M.hair, new THREE.SphereGeometry(0.5, 20, 8, Math.PI * 1.5 - FACE, 2 * FACE, 0, Math.PI * 0.27), { p: [0, 0.02, 0], s: [1.07, 1.06, 1.07] });
  // tiara with little points and pearls
  HB.add(M.gold, new THREE.TorusGeometry(0.47, 0.025, 6, 34, Math.PI * 0.9), { p: [0, 0.2, -0.1], r: [-0.55, 0, Math.PI * 0.05] });
  for (let k = -2; k <= 2; k++) {
    const a = Math.PI * 0.5 + k * 0.26;
    HB.add(M.gold, new THREE.ConeGeometry(0.035, 0.13, 6), { p: [Math.cos(a) * 0.47, 0.2 + Math.sin(a) * 0.47 * Math.cos(0.55) + 0.05, -0.1 - Math.sin(a) * 0.47 * Math.sin(0.55)], r: [-0.55, 0, a - Math.PI / 2] });
    if (k) HB.add(M.pearl, new THREE.SphereGeometry(0.028, 8, 6), { p: [Math.cos(a) * 0.48, 0.2 + Math.sin(a) * 0.48 * Math.cos(0.55), -0.1 - Math.sin(a) * 0.48 * Math.sin(0.55) - 0.02] });
  }
  HB.build(head);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), rig.gemMat);
  gem.position.set(0, 0.2 + 0.47 * Math.cos(0.55) + 0.02, -0.1 - 0.47 * Math.sin(0.55) - 0.03);
  head.add(gem);
  rig.gem = gem;
  // flowing hair strands (chains that sway one after the other)
  const hairMats = [0, 1, 2, 3, 4].map((i) => std(grad(P.hair, i / 4, new THREE.Color()).getHex(), { roughness: 0.4, metalness: 0.15 }));
  for (let j = 0; j < 13; j++) {
    const ph = (j / 12 - 0.5) * 2.0; // spread around the back of the head
    const root = new THREE.Group();
    root.position.set(Math.sin(ph) * 0.3, 0.16 + Math.cos(ph) * 0.08 - Math.abs(ph) * 0.1, 0.24);
    root.rotation.set(0.1 + Math.abs(ph) * 0.3, ph * 0.28, 0);
    head.add(root);
    const chain = [];
    let parent = root;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      if (i) seg.position.z = 0.32;
      const m = new THREE.Mesh(capZ(0.13 * (1 - i * 0.15), 0.38), hairMats[i]);
      seg.add(m);
      parent.add(seg);
      chain.push(seg);
      parent = seg;
    }
    rig.strands.push({ chain, ph: j * 1.37 });
  }

  // ---- arms (pointing forward, swim strokes) ----
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.44, 0.03, -1.8);
    g.add(sh);
    const AB = new PartBuilder();
    AB.add(M.skin, new THREE.SphereGeometry(0.12, 12, 10));
    AB.add(M.skin, capZ(0.095, 0.56), { r: [0, Math.PI, 0] });
    AB.build(sh);
    const el = new THREE.Group();
    el.position.z = -0.53;
    sh.add(el);
    const EB = new PartBuilder();
    EB.add(M.skin, capZ(0.083, 0.5), { r: [0, Math.PI, 0] });
    EB.add(M.gold, new THREE.TorusGeometry(0.088, 0.02, 6, 16), { p: [0, 0, -0.4] });
    EB.add(M.pearl, new THREE.SphereGeometry(0.03, 8, 6), { p: [0, 0.09, -0.4] });
    EB.build(el);
    const hand = new THREE.Group();
    hand.position.z = -0.5;
    el.add(hand);
    const HB2 = new PartBuilder();
    HB2.add(M.skin, new THREE.SphereGeometry(1, 12, 8), { p: [0, 0, -0.07], s: [0.075, 0.035, 0.09] });
    for (let f = 0; f < 4; f++) HB2.add(M.skin, capZ(0.018, 0.1), { p: [-0.045 + f * 0.03, 0, -0.13], r: [0, Math.PI + (f - 1.5) * 0.08, 0] });
    HB2.add(M.skin, capZ(0.02, 0.09), { p: [s * 0.06, 0, -0.04], r: [0, Math.PI + s * 0.9, 0] });
    HB2.build(hand);
    const arm = { sh, el, hand, s };
    if (s < 0) rig.armL = arm;
    else rig.armR = arm;
  }

  // ---- tail: chain of segments with shimmering scales, side fins and the fluke ----
  const LS = [0.66, 0.62, 0.58, 0.52, 0.46, 0.4];
  const WS = [0.41, 0.4, 0.35, 0.28, 0.21, 0.15, 0.1];
  const TOT = LS.reduce((a, b) => a + b, 0);
  let zAcc = 0, parent = g;
  for (let i = 0; i < LS.length; i++) {
    const seg = new THREE.Group();
    if (i === 0) seg.position.set(0, 0.02, tz0 + TL - 0.05);
    else seg.position.z = LS[i - 1];
    parent.add(seg);
    const z0 = zAcc, L = LS[i];
    const geo = loftBody({
      len: L + 0.06,
      w: (t) => lerp(WS[i], WS[i + 1], t) * (1 + 0.05 * Math.sin(t * Math.PI)),
      h: (t) => lerp(WS[i], WS[i + 1], t) * 0.86 * (1 + 0.05 * Math.sin(t * Math.PI)),
      seg: 10,
      rad: 22,
      paint: (t, a, out) => {
        const gz = z0 + t * L;
        grad(P.tail, gz / TOT, out);
        const sc = 0.8 + 0.2 * Math.abs(Math.sin(gz * 26)) * Math.abs(Math.sin(a * 9 + Math.floor(gz * 26 / Math.PI) * 1.57));
        out.multiplyScalar(sc);
        if (Math.cos(a) < -0.35) out.lerp(C2.set(0xffffff), 0.18); // lighter belly
      },
    });
    geo.translate(0, 0, (L + 0.06) / 2 - 0.03);
    seg.add(new THREE.Mesh(geo, M.tail));
    rig.tail.push(seg);
    zAcc += L;
    parent = seg;
  }
  // hip frills and fins along the tail
  for (const s of [-1, 1]) {
    const hf = new THREE.Group();
    hf.position.set(s * 0.34, 0.0, 0.12);
    rig.tail[0].add(hf);
    const pts = [[0, 0], [0.15, 0.32], [0.45, 0.5], [0.5, 0.25], [0.32, 0]];
    hf.add(new THREE.Mesh(thickFin(pts, 'side', s, 0.05), M.fin));
    hf.add(finRays(pts, 'side', s, 0xb07a10, 5));
    rig.fins.push({ g: hf, s, base: 0 });
    const mf = new THREE.Group();
    mf.position.set(s * 0.25, -0.02, 0.2);
    rig.tail[2].add(mf);
    const pts2 = [[0, 0], [0.12, 0.22], [0.36, 0.3], [0.3, 0.1], [0.25, 0]];
    mf.add(new THREE.Mesh(thickFin(pts2, 'side', s, 0.04), M.fin));
    rig.fins.push({ g: mf, s, base: 0.2 });
  }
  // fluke (horizontal like a dolphin's)
  const fluke = new THREE.Group();
  fluke.position.z = LS[LS.length - 1] - 0.02;
  rig.tail[rig.tail.length - 1].add(fluke);
  const FB = new PartBuilder();
  const lobe = [[0, 0.02], [0.2, 0.32], [0.58, 0.95], [0.92, 1.12], [0.76, 0.66], [0.64, 0.3], [0.72, 0]];
  for (const s of [-1, 1]) {
    FB.add(M.fin, thickFin(lobe, 'side', s, 0.06));
    fluke.add(finRays(lobe, 'side', s, 0xb07a10, 7));
  }
  FB.add(M.gold, new THREE.SphereGeometry(0.06, 10, 8), { p: [0, 0, 0.02] });
  FB.build(fluke);
  rig.fluke = fluke;
  B.build(g);
  return { group: g, rig, info: { tailSeg1: rig.tail[1], tz0, TL } };
}

// Mermaid animation. speed: units/s; opts.wave: wave with the right hand; opts.spin: barrel roll amount
export function animMer(rig, t, dt, speed = 0, opts = {}) {
  t += rig.t0;
  const moving = Math.min(1, Math.max(0, (speed - 0.8) / 3));
  const f = 1.1 + Math.min(speed, 12) * 0.12;
  const amp = 0.1 + moving * 0.12;
  const ph = t * f * Math.PI * 2 * 0.5;
  rig.tail.forEach((seg, i) => {
    seg.rotation.x = Math.sin(ph - i * 0.62) * amp * (0.4 + i * 0.22);
    seg.rotation.y = Math.sin(t * 0.7 + i * 0.5) * 0.03;
  });
  if (rig.fluke) rig.fluke.rotation.x = Math.sin(ph - 4.2) * amp * 1.5;
  for (const fn of rig.fins) fn.g.rotation.z = fn.s * (0.15 + 0.28 * Math.sin(t * 5.5 + fn.base * 7 + fn.s));
  // arms: breaststroke while swimming, a gentle float when slow, a wave now and then (or when asked)
  const stroke = (t * f * 0.5) % 1;
  const q = 0.5 - 0.5 * Math.cos(stroke * Math.PI * 2);
  const waveNow = opts.wave || (t % 11 > 9.2);
  for (const arm of [rig.armL, rig.armR]) {
    if (!arm) continue;
    const s = arm.s;
    const swimY = -s * (0.08 + q * 1.15), swimEl = s * q * 0.95, swimX = -0.15 * q;
    const idleY = -s * (0.45 + 0.12 * Math.sin(t * 1.3 + s)), idleEl = s * (0.35 + 0.1 * Math.sin(t * 1.7 + s)), idleX = 0.12 * Math.sin(t * 0.9 + s);
    let y = lerp(idleY, swimY, moving), e = lerp(idleEl, swimEl, moving), x = lerp(idleX, swimX, moving);
    if (waveNow && s > 0) {
      x = 1.25;
      y = -0.35;
      e = 0.55 * Math.sin(t * 11);
    }
    arm.sh.rotation.set(x, y, 0);
    arm.el.rotation.set(0, e, 0);
    arm.hand.rotation.set(0, 0, Math.sin(t * 2 + s) * 0.2);
  }
  // head: looking around, blinking
  if (rig.head) {
    rig.head.rotation.y = 0.28 * Math.sin(t * 0.45) + (opts.look || 0);
    rig.head.rotation.x = 0.07 * Math.sin(t * 0.8);
    rig.head.rotation.z = 0.06 * Math.sin(t * 0.6);
  }
  const blink = t % 3.9 < 0.13 ? 0.12 : 1;
  for (const e of rig.eyes) e.scale.y = blink;
  for (const st of rig.strands) {
    st.chain.forEach((seg, i) => {
      seg.rotation.x = 0.04 + 0.07 * Math.sin(t * 2.1 - i * 0.8 + st.ph) - moving * 0.03;
      seg.rotation.y = 0.1 * Math.sin(t * 1.6 - i * 0.6 + st.ph * 1.3);
    });
  }
  if (rig.gemMat) rig.gemMat.emissiveIntensity = 0.9 + 0.5 * Math.sin(t * 3);
  if (rig.gem) rig.gem.rotation.y += dt * 1.5;
}

// ---------------------------------------------------------------------------
// Neptune: sea king with a long beard, a golden crown, a flowing cape, a scaly merman tail and a glowing trident.
export function buildNeptune() {
  const g = new THREE.Group();
  const rig = { tail: [], beard: [], hair: [], eyes: [], cape: null, capeBase: null, t0: 0 };
  const SK = 0xd99a72;
  const M = {
    body: vc({ roughness: 0.55 }),
    skin: std(SK, { roughness: 0.55 }),
    white: std(0xf4f6ff, { roughness: 0.5 }),
    gold: std(0xffc83a, { metalness: 0.9, roughness: 0.22, emissive: 0xffa200, emissiveIntensity: 0.18 }),
    dark: std(0x2a2a3a),
    tail: vc({ roughness: 0.3, metalness: 0.4, emissive: 0x0a6a5a, emissiveIntensity: 0.08 }),
    fin: finMat(0x7ff0d8, 0.85),
    cape: new THREE.MeshStandardMaterial({ color: 0x0f8f7a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x053a33, emissiveIntensity: 0.25 }),
    trim: std(0xffc83a, { metalness: 0.8, roughness: 0.3 }),
  };
  rig.glow = new THREE.MeshStandardMaterial({ color: 0x9ffcff, emissive: 0x5fe8ff, emissiveIntensity: 1.4, roughness: 0.1 });
  const B = new PartBuilder();
  // torso, upright: waist at y = 0, shoulders at y = 1.25
  const TH = 1.3;
  const tw = prof([[0, 0.5], [0.3, 0.6], [0.65, 0.72], [0.88, 0.78], [1, 0.62]]);
  const td = prof([[0, 0.36], [0.4, 0.42], [0.75, 0.48], [1, 0.4]]);
  const SKC = new THREE.Color(SK), SHD = new THREE.Color(SK).multiplyScalar(0.8);
  const torso = loftBody({ len: TH, w: tw, h: td, seg: 24, rad: 24, paint: (t, a, out) => {
    out.copy(SKC);
    // a hint of muscles on the front (front = -z → angle around PI after turning upright)
    const front = Math.cos(a) > 0.3;
    if (front && ((t > 0.12 && t < 0.55 && Math.abs(Math.sin(a * 2)) < 0.12) || Math.abs(t - 0.32) < 0.012 || Math.abs(t - 0.45) < 0.012 || Math.abs(t - 0.7) < 0.015)) out.copy(SHD);
  } });
  torso.rotateX(-Math.PI / 2);
  torso.translate(0, TH / 2, 0);
  B.add(M.body, torso);
  // golden belt with a big shell
  B.add(M.gold, new THREE.TorusGeometry(1, 0.06, 8, 32), { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], s: [tw(0.03) * 1.05, td(0.03) * 1.08, 1] });
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + (i / 8) * 1.8;
    B.add(M.gold, new THREE.CylinderGeometry(0.018, 0.035, 0.32, 6), { p: [Math.sin(a) * 0.14, 0.05 + Math.cos(a) * 0.14, -td(0.03) * 1.12], r: [0, 0, -a] });
  }
  // shoulder pauldrons (golden shells)
  for (const s of [-1, 1]) B.add(M.gold, new THREE.SphereGeometry(0.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), { p: [s * 0.74, 1.2, 0], r: [0, 0, -s * 0.5], s: [1, 0.7, 1.1] });
  // neck
  B.add(M.skin, new THREE.CylinderGeometry(0.2, 0.25, 0.3, 14), { p: [0, 1.38, 0] });

  // head
  const head = new THREE.Group();
  head.position.set(0, 1.85, 0);
  g.add(head);
  rig.head = head;
  const HB = new PartBuilder();
  HB.add(M.skin, new THREE.SphereGeometry(0.42, 26, 20), { s: [1, 1.08, 1] });
  HB.add(M.skin, new THREE.SphereGeometry(0.09, 10, 8), { p: [0, -0.02, -0.42], s: [0.9, 1.1, 1] });
  for (const s of [-1, 1]) {
    const e = eye(0.085, { iris: 0x2a7fe0 });
    e.position.set(s * 0.15, 0.08, -0.35);
    e.rotation.y = Math.PI - s * 0.2;
    head.add(e);
    rig.eyes.push(e);
    HB.add(M.white, new THREE.BoxGeometry(0.16, 0.05, 0.06), { p: [s * 0.16, 0.2, -0.37], r: [0, 0, s * 0.22] }); // bushy brows
    HB.add(M.white, capZ(0.045, 0.32), { p: [s * 0.03, -0.12, -0.42], r: [0.3, s * 1.9, 0] }); // moustache
  }
  // white hair cap
  HB.add(M.white, new THREE.SphereGeometry(0.45, 24, 16, Math.PI * 1.5 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.62), { p: [0, 0.04, 0.02], s: [1.06, 1.08, 1.1] });
  // crown: golden band with points and coloured gems
  HB.add(M.gold, new THREE.CylinderGeometry(0.43, 0.41, 0.14, 28, 1, true), { p: [0, 0.34, 0] });
  const gemCols = [0xff4f7a, 0x4fd8ff, 0x7cff6a, 0xffd04f, 0xc77bff, 0x4fd8ff, 0xff4f7a];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + Math.PI;
    HB.add(M.gold, new THREE.ConeGeometry(0.06, 0.3, 6), { p: [Math.sin(a) * 0.42, 0.53, Math.cos(a) * 0.42] });
    HB.add(std(gemCols[k], { emissive: gemCols[k], emissiveIntensity: 0.7, roughness: 0.1 }), new THREE.OctahedronGeometry(0.045), { p: [Math.sin(a) * 0.44, 0.35, Math.cos(a) * 0.44] });
  }
  HB.build(head);
  // beard: strands hanging from the chin and jaw
  for (let j = 0; j < 9; j++) {
    const a = -1.0 + (j / 8) * 2.0;
    const root = new THREE.Group();
    root.position.set(Math.sin(a) * 0.3, -0.2 - Math.cos(a) * 0.08, -Math.cos(a) * 0.3);
    root.rotation.set(Math.PI / 2 + 0.25, 0, 0); // pointing down (capZ goes along +z → turn to -y)
    head.add(root);
    const chain = [];
    let parent = root;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      if (i) seg.position.z = 0.2;
      seg.add(new THREE.Mesh(capZ(0.08 * (1 - i * 0.14), 0.24), M.white));
      parent.add(seg);
      chain.push(seg);
      parent = seg;
    }
    rig.beard.push({ chain, ph: j * 0.9 });
  }
  // long hair down the back
  for (let j = 0; j < 7; j++) {
    const a = -1.1 + (j / 6) * 2.2;
    const root = new THREE.Group();
    root.position.set(Math.sin(a) * 0.36, 0.05, 0.3);
    root.rotation.set(Math.PI / 2 - 0.25, 0, 0);
    head.add(root);
    const chain = [];
    let parent = root;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      if (i) seg.position.z = 0.26;
      seg.add(new THREE.Mesh(capZ(0.07 * (1 - i * 0.12), 0.3), M.white));
      parent.add(seg);
      chain.push(seg);
      parent = seg;
    }
    rig.hair.push({ chain, ph: j * 1.1 });
  }

  // arms: right one holds the trident, left one gestures
  const mkArm = (s) => {
    const sh = new THREE.Group();
    sh.position.set(s * 0.82, 1.12, 0);
    g.add(sh);
    const A = new PartBuilder();
    A.add(M.skin, new THREE.SphereGeometry(0.2, 12, 10));
    A.add(M.skin, capZ(0.16, 0.75), { r: [Math.PI / 2, 0, 0] }); // down along -y
    A.add(M.gold, new THREE.TorusGeometry(0.17, 0.035, 6, 18), { p: [0, -0.35, 0], r: [Math.PI / 2, 0, 0] });
    A.build(sh);
    const el = new THREE.Group();
    el.position.y = -0.72;
    sh.add(el);
    const E = new PartBuilder();
    E.add(M.skin, capZ(0.14, 0.7), { r: [Math.PI / 2, 0, 0] });
    E.add(M.gold, new THREE.CylinderGeometry(0.16, 0.16, 0.16, 16), { p: [0, -0.52, 0] });
    E.build(el);
    const hand = new THREE.Group();
    hand.position.y = -0.7;
    el.add(hand);
    const H = new PartBuilder();
    H.add(M.skin, new THREE.SphereGeometry(1, 12, 8), { p: [0, -0.08, 0], s: [0.1, 0.13, 0.07] });
    for (let f = 0; f < 4; f++) H.add(M.skin, capZ(0.03, 0.15), { p: [-0.06 + f * 0.04, -0.17, 0], r: [Math.PI / 2, 0, 0] });
    H.build(hand);
    return { sh, el, hand, s };
  };
  rig.armR = mkArm(1);
  rig.armL = mkArm(-1);
  // trident in the right hand
  const tri = new THREE.Group();
  tri.position.set(0, -0.12, 0);
  rig.armR.hand.add(tri);
  const T = new PartBuilder();
  T.add(M.gold, new THREE.CylinderGeometry(0.05, 0.06, 5.2, 10), { p: [0, 1.2, 0] });
  T.add(M.gold, new THREE.TorusGeometry(0.09, 0.03, 6, 14), { p: [0, 3.0, 0], r: [Math.PI / 2, 0, 0] });
  T.add(M.gold, new THREE.BoxGeometry(0.9, 0.08, 0.08), { p: [0, 3.82, 0] });
  for (const x of [-0.42, 0, 0.42]) {
    T.add(M.gold, new THREE.CylinderGeometry(0.04, 0.05, x ? 0.75 : 0.95, 8), { p: [x, x ? 4.18 : 4.28, 0] });
    T.add(M.gold, new THREE.ConeGeometry(0.1, 0.32, 8), { p: [x, x ? 4.7 : 4.9, 0] });
    T.add(M.gold, new THREE.ConeGeometry(0.05, 0.16, 6), { p: [x + (x < 0 ? 0.08 : x > 0 ? -0.08 : 0.08), x ? 4.52 : 4.72, 0], r: [0, 0, x < 0 ? -0.7 : 0.7] });
  }
  T.add(M.gold, new THREE.ConeGeometry(0.08, 0.25, 8), { p: [0, -1.5, 0], r: [Math.PI, 0, 0] });
  T.build(tri);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), rig.glow);
  orb.position.set(0, 3.82, 0);
  tri.add(orb);
  rig.trident = tri;
  rig.orb = orb;
  // sparkles around the trident
  const sp = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 1.6;
    sp[i * 3 + 1] = 3.4 + Math.random() * 1.8;
    sp[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
  }
  const spg = new THREE.BufferGeometry();
  spg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  rig.sparkMat = new THREE.PointsMaterial({ map: softDot(), color: 0xaaf8ff, size: 0.22, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  rig.sparks = new THREE.Points(spg, rig.sparkMat);
  tri.add(rig.sparks);

  // cape from the shoulders, waving
  const capeGeo = new THREE.PlaneGeometry(1.9, 2.6, 10, 14);
  capeGeo.translate(0, -1.3, 0);
  const cape = new THREE.Mesh(capeGeo, M.cape);
  cape.position.set(0, 1.28, 0.42);
  g.add(cape);
  rig.cape = cape;
  rig.capeBase = capeGeo.attributes.position.array.slice();
  B.add(M.trim, new THREE.TorusGeometry(0.98, 0.04, 6, 24, Math.PI), { p: [0, 1.3, 0.38], r: [0, 0, 0] });

  // merman tail curling below the waist
  const LS = [0.62, 0.6, 0.56, 0.52, 0.46, 0.4, 0.34];
  const WS = [0.5, 0.48, 0.43, 0.37, 0.3, 0.23, 0.16, 0.1];
  const TOT = LS.reduce((a, b) => a + b, 0);
  const TCOL = [0x0fae8e, 0x18c7a4, 0x2fd6c8, 0x1f9fd8];
  let zAcc = 0, parent = g;
  for (let i = 0; i < LS.length; i++) {
    const seg = new THREE.Group();
    if (i === 0) {
      seg.position.set(0, 0.05, 0);
      seg.rotation.x = Math.PI / 2; // +z of the chain points down
    } else seg.position.z = LS[i - 1];
    parent.add(seg);
    const z0 = zAcc, L = LS[i];
    const geo = loftBody({
      len: L + 0.06,
      w: (t) => lerp(WS[i], WS[i + 1], t),
      h: (t) => lerp(WS[i], WS[i + 1], t) * 0.82,
      seg: 8,
      rad: 22,
      paint: (t, a, out) => {
        const gz = z0 + t * L;
        grad(TCOL, gz / TOT, out);
        out.multiplyScalar(0.78 + 0.22 * Math.abs(Math.sin(gz * 22)) * Math.abs(Math.sin(a * 9 + Math.floor(gz * 22 / Math.PI) * 1.57)));
      },
    });
    geo.translate(0, 0, (L + 0.06) / 2 - 0.03);
    seg.add(new THREE.Mesh(geo, M.tail));
    rig.tail.push(seg);
    zAcc += L;
    parent = seg;
  }
  const fl = new THREE.Group();
  fl.position.z = LS[LS.length - 1];
  rig.tail[rig.tail.length - 1].add(fl);
  const lobe = [[0, 0.03], [0.25, 0.4], [0.7, 1.15], [1.1, 1.35], [0.9, 0.8], [0.75, 0.35], [0.85, 0]];
  for (const s of [-1, 1]) {
    fl.add(new THREE.Mesh(thickFin(lobe, 'side', s, 0.07), M.fin));
    fl.add(finRays(lobe, 'side', s, 0x2a9a8a, 8));
  }
  rig.fluke = fl;
  B.build(g);
  return { group: g, rig };
}

// opts: look (yaw towards the player), near (player close), bless (0..1 raise the trident)
export function animNeptune(rig, t, dt, opts = {}) {
  // tail: slow undulation, curled forward
  rig.tail.forEach((seg, i) => {
    const base = i === 0 ? Math.PI / 2 - 0.15 : 0.22;
    seg.rotation.x = base + Math.sin(t * 1.3 - i * 0.6) * 0.12 * (0.4 + i * 0.18);
  });
  if (rig.fluke) rig.fluke.rotation.x = Math.sin(t * 1.3 - 4.6) * 0.25;
  // head turns to the player, blinks
  const look = Math.max(-0.9, Math.min(0.9, opts.look || 0));
  rig.head.rotation.y += (look - rig.head.rotation.y) * Math.min(1, dt * 2);
  rig.head.rotation.x = 0.05 * Math.sin(t * 0.7);
  const blink = t % 4.6 < 0.14 ? 0.1 : 1;
  for (const e of rig.eyes) e.scale.y = blink;
  for (const b of rig.beard) b.chain.forEach((seg, i) => {
    seg.rotation.x = 0.06 * Math.sin(t * 1.4 - i * 0.7 + b.ph);
    seg.rotation.y = 0.1 * Math.sin(t * 1.1 - i * 0.5 + b.ph);
  });
  for (const h of rig.hair) h.chain.forEach((seg, i) => {
    seg.rotation.x = 0.1 + 0.08 * Math.sin(t * 1.2 - i * 0.6 + h.ph);
    seg.rotation.y = 0.12 * Math.sin(t * 0.9 - i * 0.5 + h.ph);
  });
  // right arm: trident held up; raised high when blessing
  // (arms hang along -y; a positive x-rotation swings them forward/up)
  const bless = opts.bless || 0;
  const s1 = 0.35 + bless * 2.25 + 0.05 * Math.sin(t * 0.9), s2 = 1.25 - bless * 1.1;
  rig.armR.sh.rotation.set(s1, 0, 0.32 - bless * 0.12);
  rig.armR.el.rotation.set(s2, 0, 0);
  rig.trident.rotation.set(-(s1 + s2), 0, -(0.32 - bless * 0.12) * 0.9); // the trident stays upright
  rig.glow.emissiveIntensity = 1.1 + 0.6 * Math.sin(t * 3) + bless * 3;
  rig.orb.scale.setScalar(1 + bless * 0.8 + 0.1 * Math.sin(t * 5));
  rig.sparkMat.opacity = 0.35 + bless * 0.6;
  rig.sparks.rotation.y += dt * (0.6 + bless * 4);
  // left arm: waves at the player when near, else a calm open-hand gesture
  if (opts.near) {
    rig.armL.sh.rotation.set(0.3, 0, -2.4);
    rig.armL.el.rotation.set(0, 0, -0.7 * Math.sin(t * 7));
  } else {
    rig.armL.sh.rotation.set(0.45 + 0.15 * Math.sin(t * 0.8), 0, -0.4 - 0.12 * Math.sin(t * 0.6));
    rig.armL.el.rotation.set(0.9 + 0.25 * Math.sin(t * 0.8), 0, 0);
  }
  // cape waves in the current
  const pos = rig.cape.geometry.attributes.position, b0 = rig.capeBase;
  for (let i = 0; i < pos.count; i++) {
    const x = b0[i * 3], y = b0[i * 3 + 1];
    const k = -y / 2.6; // 0 at the shoulders, 1 at the hem
    pos.array[i * 3 + 2] = b0[i * 3 + 2] + k * (0.35 + 0.25 * Math.sin(t * 1.8 + y * 2 + x * 1.5)) + k * k * 0.4;
    pos.array[i * 3] = x * (1 + k * 0.25);
  }
  pos.needsUpdate = true;
  rig.cape.geometry.computeVertexNormals();
}
