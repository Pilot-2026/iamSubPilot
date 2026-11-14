// The research submersible: model, lights and movement.

import * as THREE from './vendor/three.min.js';
import { clamp, lerp } from './util.js';
import { WX, WZ } from './world.js';
import { PartBuilder } from './parts.js';
import { loftBody, prof, thickFin } from './detail.js';
import { buildMerFigure, animMer, MER_PALETTES } from './merfolk.js';

// ---------------------------------------------------------------------------
// Six original submarine designs. Static parts are merged per material
// (PartBuilder) to keep draw calls low; animated parts stay separate meshes.
// Forward is -Z, up is +Y, length ~4.5–6 units (not to scale – a real sub
// would be invisible at 1 unit = 10 m).

const UP = new THREE.Vector3(0, 1, 0);
const ZAX = new THREE.Vector3(0, 0, 1);

export const SUB_MODELS = [
  { id: 'isabella', color: 0xffc21a, name: { en: 'ISABELLA', de: 'ISABELLA' }, desc: { en: 'The mermaid sub: shell cockpit, golden fins, swims like a dolphin', de: 'Das Meerjungfrau-U-Boot: Muschel-Cockpit, goldene Flossen, schwimmt wie ein Delfin' } },
  { id: 'hummel', color: 0xffc21a, name: { en: 'HUMMEL-1', de: 'HUMMEL-1' }, desc: { en: 'The bumblebee: sturdy, full of gadgets', de: 'Die Hummel: robust und voller Technik' } },
  { id: 'wolfshark', color: 0xffc21a, name: { en: 'WOLFSHARK', de: 'WOLFSHARK' }, desc: { en: 'Shark-shaped and nimble – with a friendly grin', de: 'In Haiform, flink und wendig – mit freundlichem Grinsen' } },
  { id: 'puffer', color: 0xffc21a, name: { en: 'PUFFBALL', de: 'KUGELBLITZ' }, desc: { en: 'Round, spiky, absolutely unsinkable', de: 'Kugelrund, stachelig, unkaputtbar' } },
  { id: 'narwhal', color: 0xffc21a, name: { en: 'NARWHAL-X', de: 'NARWAL-X' }, desc: { en: 'Sleek torpedo with a spinning drill horn', de: 'Schlanker Torpedo mit Bohrer-Horn' } },
  { id: 'octopus', color: 0xffc21a, name: { en: 'OCTOPODA', de: 'OKTOPODA' }, desc: { en: 'Eight wiggly arms, one big window', de: 'Acht wackelnde Arme, ein großes Fenster' } },
  { id: 'rocket', color: 0xffc21a, name: { en: 'ABYSS ROCKET', de: 'TIEFSEERAKETE' }, desc: { en: 'Retro rocket – just pointing downwards', de: 'Retro-Rakete – nur eben nach unten' } },
  { id: 'ufo', color: 0xffc21a, name: { en: 'DEEP UFO', de: 'TIEFSEE-UFO' }, desc: { en: 'A flying saucer that prefers to swim', de: 'Eine fliegende Untertasse, die lieber taucht' } },
];
export const subModelById = (id) => SUB_MODELS.find((m) => m.id === id) || SUB_MODELS[0];

const nameTex = {};
function namePlateTexture(text = 'HUMMEL-1') {
  if (nameTex[text]) return nameTex[text];
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#16161c';
  g.beginPath();
  g.roundRect(6, 8, 500, 112, 40);
  g.fill();
  g.strokeStyle = '#d9a640';
  g.lineWidth = 9;
  g.stroke();
  g.fillStyle = '#ffd23f';
  g.font = '900 82px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68, 460);
  nameTex[text] = new THREE.CanvasTexture(c);
  return nameTex[text];
}

const RIVET = new THREE.SphereGeometry(0.035, 6, 4);
const BLADE_S = new THREE.BoxGeometry(0.07, 0.2, 0.02);
const BLADE_M = new THREE.BoxGeometry(0.2, 0.5, 0.04);
const FINGER = new THREE.BoxGeometry(0.05, 0.06, 0.28);
const FINGER_TIP = new THREE.BoxGeometry(0.05, 0.06, 0.12);
const FLAG_GEO = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.55, -0.12);
  s.lineTo(0, -0.26);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateY(Math.PI / 2);
  return geo;
})();

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.12, ...o });
const glassMat = () => new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.32, depthWrite: false });
const portMat = () => new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb84a, emissiveIntensity: 0.9, roughness: 0.2 });

// propeller group with n blades
function propeller(n, bladeGeo, mats, r = 0.32) {
  const prop = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const blade = new THREE.Mesh(bladeGeo, mats[i % mats.length]);
    blade.position.y = r;
    blade.rotation.y = 0.5;
    const h = new THREE.Group();
    h.rotation.z = (i * Math.PI * 2) / n;
    h.add(blade);
    prop.add(h);
  }
  return prop;
}

// a porthole (glass + rim) facing direction n at point p
function porthole(B, M, p, n, r = 0.19) {
  B.add(M.port, new THREE.CylinderGeometry(r, r, 0.08, 16), { p, q: new THREE.Quaternion().setFromUnitVectors(UP, n) });
  B.add(M.rim, new THREE.TorusGeometry(r + 0.01, 0.045, 6, 18), { p: [p[0] + n.x * 0.04, p[1] + n.y * 0.04, p[2] + n.z * 0.04], q: new THREE.Quaternion().setFromUnitVectors(ZAX, n) });
}

// ---------------- HUMMEL-1 ----------------
const BX = 1.12, BY = 1.05, BZ = 2.0; // body ellipsoid radii
const bodyR = (z) => Math.sqrt(Math.max(0, 1 - (z / BZ) ** 2)); // unit radius at z

function buildHummel(g, B, ctx) {
  const M = {
    body: std(ctx.color, { emissive: ctx.color, emissiveIntensity: 0.14 }),
    stripe: std(0x1b1b22, { roughness: 0.55, metalness: 0.2 }),
    brass: std(0xd4a548, { roughness: 0.3, metalness: 0.85 }),
    steel: std(0x8b98a6, { roughness: 0.35, metalness: 0.7 }),
    port: portMat(),
    red: new THREE.MeshBasicMaterial({ color: 0xff3344 }),
    green: new THREE.MeshBasicMaterial({ color: 0x33ff77 }),
    panel: std(0x113322, { emissive: 0x2bff9a, emissiveIntensity: 0.7 }),
    skin: std(0xf2c9a0, { roughness: 0.6 }),
  };
  M.rim = M.brass;
  // body, stripes, rivets (no rivets where the name plate sits)
  B.add(M.body, new THREE.SphereGeometry(1, 28, 18), { s: [BX, BY, BZ] });
  for (const zc of [-0.55, 0.35, 1.2]) {
    const z1 = zc - 0.2, z2 = zc + 0.2;
    const geo = new THREE.CylinderGeometry(bodyR(z2) + 0.022, bodyR(z1) + 0.022, z2 - z1, 30, 1, true);
    geo.rotateX(Math.PI / 2);
    B.add(M.stripe, geo, { p: [0, 0, zc], s: [BX, BY, 1] });
    for (const ze of [z1 - 0.03, z2 + 0.03]) {
      const rr = bodyR(ze) + 0.02;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        if (zc === 0.35 && Math.abs(Math.sin(a)) < 0.4) continue;
        B.add(M.brass, RIVET, { p: [Math.cos(a) * rr * BX, Math.sin(a) * rr * BY, ze] });
      }
    }
  }
  // cockpit bubble, dashboard and a tiny pilot
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.84, 22, 16), glassMat());
  bubble.position.set(0, 0.1, -1.86);
  bubble.renderOrder = 2;
  g.add(bubble);
  B.add(M.brass, new THREE.TorusGeometry(0.8, 0.085, 8, 28), { p: [0, 0.08, -1.42] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    B.add(M.steel, RIVET, { p: [Math.cos(a) * 0.8, 0.08 + Math.sin(a) * 0.8, -1.5], s: 1.3 });
  }
  B.add(M.stripe, new THREE.BoxGeometry(0.95, 0.3, 0.32), { p: [0, -0.32, -2.25], r: [-0.4, 0, 0] });
  for (let i = 0; i < 5; i++) B.add(i % 2 ? M.red : M.panel, new THREE.BoxGeometry(0.1, 0.05, 0.06), { p: [-0.3 + i * 0.15, -0.17, -2.36], r: [-0.4, 0, 0] });
  B.add(M.skin, new THREE.SphereGeometry(0.2, 12, 10), { p: [0, 0.12, -1.8] });
  B.add(M.stripe, new THREE.TorusGeometry(0.2, 0.045, 6, 16), { p: [0, 0.16, -1.8], r: [0, Math.PI / 2, 0], s: [1, 1, 1.05] });
  for (const sx of [-1, 1]) B.add(M.brass, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), { p: [sx * 0.08, 0.16, -1.99], r: [Math.PI / 2, 0, 0] });
  B.add(M.stripe, new THREE.BoxGeometry(0.5, 0.42, 0.2), { p: [0, -0.12, -1.55] });
  // portholes with rivets
  for (const sx of [-1, 1]) {
    for (const z of [-0.1, 0.78]) {
      const a = 0.32;
      const rr = bodyR(z);
      const n = new THREE.Vector3(sx * Math.cos(a) * BY, Math.sin(a) * BX, 0).normalize();
      const p = [sx * Math.cos(a) * rr * BX, Math.sin(a) * rr * BY, z];
      porthole(B, M, p, n);
      for (let i = 0; i < 6; i++) {
        const b = (i / 6) * Math.PI * 2;
        const tangent = new THREE.Vector3(-n.y, n.x, 0);
        const off = tangent.clone().multiplyScalar(Math.cos(b) * 0.27).add(new THREE.Vector3(0, 0, Math.sin(b) * 0.27));
        B.add(M.steel, RIVET, { p: [p[0] + off.x + n.x * 0.03, p[1] + off.y + n.y * 0.03, z + off.z] });
      }
    }
  }
  // hatch tower, wheel, periscope, camera
  B.add(M.body, new THREE.CylinderGeometry(0.42, 0.48, 0.5, 18), { p: [0, 1.12, -0.05] });
  B.add(M.stripe, new THREE.CylinderGeometry(0.44, 0.44, 0.1, 18), { p: [0, 1.4, -0.05] });
  B.add(M.brass, new THREE.TorusGeometry(0.24, 0.035, 6, 18), { p: [0, 1.5, -0.05], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) B.add(M.brass, new THREE.BoxGeometry(0.46, 0.03, 0.03), { p: [0, 1.5, -0.05], r: [0, (i * Math.PI) / 3, 0] });
  B.add(M.brass, new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), { p: [0, 1.52, -0.05] });
  B.add(M.steel, new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), { p: [0.22, 1.8, 0.12] });
  B.add(M.steel, new THREE.BoxGeometry(0.13, 0.13, 0.32), { p: [0.22, 2.3, 0.02] });
  B.add(M.port, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), { p: [0.22, 2.3, -0.15], r: [Math.PI / 2, 0, 0] });
  B.add(M.stripe, new THREE.BoxGeometry(0.28, 0.2, 0.26), { p: [-0.15, 1.1, -0.62] });
  B.add(M.stripe, new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), { p: [-0.15, 1.1, -0.78], r: [Math.PI / 2, 0, 0] });
  // tail: stinger, duct ring, rudder, stabilizers, nav lights, flag pole
  B.add(M.stripe, new THREE.ConeGeometry(0.36, 0.8, 14).rotateX(Math.PI / 2), { p: [0, 0, 2.15] });
  B.add(M.body, new THREE.TorusGeometry(0.66, 0.08, 8, 30), { p: [0, 0, 2.62] });
  B.add(M.stripe, new THREE.TorusGeometry(0.66, 0.03, 6, 30), { p: [0, 0, 2.52] });
  for (let i = 0; i < 4; i++) B.add(M.steel, new THREE.BoxGeometry(0.05, 0.62, 0.05), { p: [0, 0, 2.6], r: [0, 0, (i * Math.PI) / 2 + Math.PI / 4] });
  B.add(M.stripe, new THREE.BoxGeometry(0.08, 0.85, 0.6), { p: [0, 0.82, 1.78], r: [0.25, 0, 0] });
  B.add(M.body, new THREE.BoxGeometry(0.09, 0.22, 0.6), { p: [0, 1.22, 1.88], r: [0.25, 0, 0] });
  for (const sx of [-1, 1]) {
    B.add(M.stripe, new THREE.BoxGeometry(0.8, 0.07, 0.5), { p: [sx * 0.95, 0, 1.75], r: [0, sx * -0.15, 0] });
    B.add(M.body, new THREE.BoxGeometry(0.22, 0.08, 0.52), { p: [sx * 1.42, 0, 1.82], r: [0, sx * -0.15, 0] });
    B.add(sx < 0 ? M.red : M.green, new THREE.SphereGeometry(0.07, 8, 6), { p: [sx * 1.55, 0.05, 1.68] });
  }
  B.add(M.steel, new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), { p: [0, 1.55, 2.0] });
  // side pipes with clamps
  for (const sx of [-1, 1]) {
    const pts = [];
    for (const z of [-1.3, -0.6, 0.2, 1.0, 1.5]) {
      const y = -0.42;
      const x = BX * Math.sqrt(Math.max(0.02, bodyR(z) ** 2 - (y / BY) ** 2)) + 0.07;
      pts.push(new THREE.Vector3(sx * x, y, z));
    }
    B.add(M.brass, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.05, 6, false));
    for (const pp of pts.slice(1, 4)) B.add(M.steel, new THREE.CylinderGeometry(0.075, 0.075, 0.08, 8), { p: [pp.x, pp.y, pp.z], r: [Math.PI / 2, 0, 0] });
  }
  // headlamps
  for (const sx of [-1, 1]) {
    B.add(M.stripe, new THREE.CylinderGeometry(0.2, 0.15, 0.3, 14), { p: [sx * 0.62, -0.58, -1.55], r: [Math.PI / 2, 0, 0] });
    B.add(M.brass, new THREE.TorusGeometry(0.19, 0.03, 6, 16), { p: [sx * 0.62, -0.58, -1.71] });
    ctx.lamp(sx * 0.62, -0.58, -1.715, 0.16);
  }
  // side thruster pods – low and aft, so the name plate stays visible
  const sideProps = [];
  for (const sx of [-1, 1]) {
    B.add(M.stripe, new THREE.CylinderGeometry(0.2, 0.2, 0.62, 12), { p: [sx * 1.05, -0.62, 1.12], r: [Math.PI / 2, 0, 0] });
    B.add(M.body, new THREE.CylinderGeometry(0.21, 0.21, 0.12, 12), { p: [sx * 1.05, -0.62, 0.92], r: [Math.PI / 2, 0, 0] });
    B.add(M.steel, new THREE.BoxGeometry(0.34, 0.06, 0.18), { p: [sx * 0.78, -0.6, 1.12] });
    B.add(M.brass, new THREE.ConeGeometry(0.09, 0.2, 10).rotateX(-Math.PI / 2), { p: [sx * 1.05, -0.62, 0.74] });
    const sp = propeller(3, BLADE_S, [M.brass], 0.11);
    sp.position.set(sx * 1.05, -0.62, 1.48);
    g.add(sp);
    sideProps.push(sp);
  }
  // skids with struts
  for (const sx of [-1, 1]) {
    B.add(M.stripe, new THREE.BoxGeometry(0.12, 0.09, 2.8), { p: [sx * 0.68, -1.22, 0.15] });
    B.add(M.stripe, new THREE.BoxGeometry(0.12, 0.09, 0.45), { p: [sx * 0.68, -1.1, -1.38], r: [-0.6, 0, 0] });
    for (const z of [-0.8, 0.2]) B.add(M.steel, new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), { p: [sx * 0.62, -0.98, z], r: [0, 0, sx * 0.25] });
  }
  B.add(M.stripe, new THREE.BoxGeometry(0.7, 0.04, 0.45), { p: [0, -1.18, -0.85] });
  for (const sx of [-1, 1]) B.add(M.brass, new THREE.BoxGeometry(0.03, 0.22, 0.45), { p: [sx * 0.35, -1.08, -0.85] });
  // name plates (above the pipe, nothing in front of them)
  const plateMat = new THREE.MeshBasicMaterial({ map: namePlateTexture(), transparent: true, fog: true });
  for (const sx of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.31), plateMat);
    pl.position.set(sx * 1.15, -0.1, 0.2);
    pl.rotation.y = sx * (Math.PI / 2 - 0.06);
    g.add(pl);
  }
  // flag, beacon, main propeller
  const flag = new THREE.Mesh(FLAG_GEO, std(0xff4d6d, { side: THREE.DoubleSide, roughness: 0.7 }));
  flag.position.set(0, 1.8, 2.0);
  g.add(flag);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa21a }));
  beacon.position.set(-0.22, 1.5, 0.22);
  g.add(beacon);
  const prop = propeller(5, BLADE_M, [M.body, M.stripe]);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 10).rotateX(Math.PI / 2), M.brass);
  hub.position.z = 0.12;
  prop.add(hub);
  prop.position.set(0, 0, 2.62);
  g.add(prop);
  Object.assign(g.userData, { prop, sideProps, beacon, flag });
  return { lamp: [0, -0.5, -1.9], top: 1.05, attach: [1.0, 1.1], arm: [0, -0.98, -1.05] };
}

// ---------------- WOLFSHARK (shark-shaped sub) ----------------
function buildWolfShark(g, B, ctx) {
  const M = {
    body: std(ctx.color, { emissive: ctx.color, emissiveIntensity: 0.13, roughness: 0.32 }),
    dark: std(0x1b1b22, { roughness: 0.45, metalness: 0.25 }),
    steel: std(0x8b98a6, { roughness: 0.35, metalness: 0.7 }),
    white: std(0xf4f1ea, { roughness: 0.35 }),
    rim: std(0xd4a548, { metalness: 0.85, roughness: 0.3 }),
    port: portMat(),
  };
  const L = 5.4, HW = 0.95, HH = 1.0;
  const wf = prof([[0, 0.06], [0.06, 0.45], [0.18, 0.84], [0.4, 1.0], [0.66, 0.8], [0.86, 0.4], [1, 0.2]]);
  const hf = prof([[0, 0.06], [0.06, 0.42], [0.18, 0.82], [0.4, 1.0], [0.66, 0.78], [0.86, 0.4], [1, 0.22]]);
  const yf = prof([[0, 0.22], [0.15, 0.08], [0.4, 0], [1, 0.08]]);
  const w = (t) => wf(t) * HW, h = (t) => hf(t) * HH, z = (t) => -L / 2 + t * L;
  const hull = loftBody({ len: L, w, h, y: yf, seg: 40, rad: 32, paint: (t, a, out) => out.setRGB(1, 1, 1) });
  hull.deleteAttribute('color');
  B.add(M.body, hull, {});
  // dark back stripe and fin tips, like a real shark's darker back
  for (const t of [0.3, 0.5, 0.7]) B.add(M.dark, new THREE.TorusGeometry(1, 0.035, 6, 32, Math.PI * 0.5), { p: [0, yf(t), z(t)], r: [0, 0, Math.PI / 4], s: [w(t) * 1.005, h(t) * 1.005, 1] });
  // friendly painted grin with white teeth under the nose
  const mt = 0.09;
  B.add(M.dark, new THREE.TorusGeometry(1, 0.05, 6, 24, Math.PI), { p: [0, yf(mt) - h(mt) * 0.15, z(mt) + 0.05], r: [Math.PI / 2 + 0.35, 0, Math.PI], s: [w(mt) * 0.98, w(mt) * 1.1, 1] });
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.12 + (0.76 * i) / 8);
    B.add(M.white, new THREE.ConeGeometry(0.045, 0.12, 4), { p: [Math.cos(a) * w(mt) * 0.96, yf(mt) - h(mt) * 0.15 + 0.03 - Math.sin(a) * 0.02, z(mt) + 0.05 - Math.sin(a) * w(mt) * 0.38], r: [Math.PI, 0, 0] });
  }
  // gill slits (cooling vents)
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const t = 0.24 + i * 0.035;
    B.add(M.dark, new THREE.BoxGeometry(0.03, h(t) * 0.75, 0.07), { p: [sx * w(t) * 0.99, yf(t) - 0.05, z(t)], r: [0.12, 0, 0] });
  }
  // eyes = glowing portholes, cockpit dome on top
  for (const sx of [-1, 1]) porthole(B, M, [sx * w(0.13) * 0.93, yf(0.13) + h(0.13) * 0.3, z(0.13)], new THREE.Vector3(sx, 0.25, -0.35).normalize(), 0.15);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), glassMat());
  dome.scale.set(0.42, 0.34, 0.62);
  dome.position.set(0, yf(0.22) + h(0.22) * 0.88, z(0.22));
  dome.renderOrder = 2;
  g.add(dome);
  B.add(M.rim, new THREE.TorusGeometry(1, 0.035, 6, 28), { p: [0, yf(0.22) + h(0.22) * 0.88, z(0.22)], r: [Math.PI / 2, 0, 0], s: [0.43, 0.63, 1] });
  // dorsal fin with a black tip and the beacon on top
  const dY = yf(0.42) + h(0.42) * 0.85, dZ = z(0.42);
  B.add(M.body, thickFin([[0, 0], [0.45, 1.05], [0.62, 1.12], [0.66, 0.72], [1.05, 0]], 'dorsal', 1, 0.12), { p: [0, dY, dZ] });
  B.add(M.dark, thickFin([[0.43, 0.98], [0.62, 1.12], [0.64, 0.86]], 'dorsal', 1, 0.15), { p: [0, dY, dZ] });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa21a }));
  beacon.position.set(0, dY + 1.16, dZ + 0.62);
  g.add(beacon);
  // pectoral fins = dive planes
  for (const sx of [-1, 1]) {
    const pY = yf(0.34) - h(0.34) * 0.45, pX = sx * w(0.34) * 0.88;
    B.add(M.body, thickFin([[0, 0], [0.35, 1.2], [0.75, 1.3], [0.8, 0]], 'side', sx, 0.1), { p: [pX, pY, z(0.34)], r: [0, 0, sx * -0.35] });
    B.add(M.dark, new THREE.SphereGeometry(0.07, 10, 8), { p: [pX + sx * 1.24 * Math.cos(0.35), pY - 1.24 * Math.sin(0.35), z(0.34) + 0.55] });
    ctx.lamp(sx * 0.32, yf(0.03) - 0.1, z(0.03) + 0.05, 0.1);
  }
  // name plates "WOLFSHARK"
  const plateMat = new THREE.MeshBasicMaterial({ map: namePlateTexture('WOLFSHARK'), transparent: true, fog: true });
  const tp = 0.56;
  for (const sx of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), plateMat);
    pl.position.set(sx * (w(tp) * 1.01 + 0.01), yf(tp) + 0.08, z(tp));
    pl.rotation.y = sx * (Math.PI / 2 - 0.1);
    g.add(pl);
  }
  // tail: vertical shark tail (wags) with the propeller in a ring duct
  const tail = new THREE.Group();
  const TB = new PartBuilder();
  TB.add(M.body, thickFin([[0, 0.1], [0.55, 1.15, 0.95, 1.55], [0.7, 0.7], [0.42, 0], [0.75, -0.95], [0.25, -0.55, 0, -0.1]], 'dorsal', 1, 0.11), {});
  TB.add(M.dark, thickFin([[0.76, 1.28], [0.95, 1.55], [0.86, 1.08]], 'dorsal', 1, 0.14), {});
  TB.build(tail);
  tail.position.set(0, yf(0.95), z(0.95));
  g.add(tail);
  B.add(M.rim, new THREE.TorusGeometry(0.34, 0.06, 8, 24), { p: [0, yf(1) - 0.02, z(1) + 0.1] });
  const prop = propeller(4, BLADE_M, [M.dark, M.steel], 0.18);
  prop.scale.setScalar(0.8);
  prop.position.set(0, yf(1) - 0.02, z(1) + 0.12);
  g.add(prop);
  Object.assign(g.userData, { prop, beacon });
  g.userData.anim = (dt, t, speed) => {
    tail.rotation.y = Math.sin(t * (2.2 + speed * 0.25)) * 0.28;
  };
  return { lamp: [0, yf(0.03) - 0.1, z(0.03)], top: 1.0, attach: [1.2, 1.0], arm: [0, -0.92, -1.25] };
}

// ---------------- ISABELLA (mermaid sub) ----------------
// A swimming mermaid with a scallop-shell cockpit on her back, a glowing gem in her tiara as headlight and
// side thrusters at the hips. Tail, fins, arms, hair, head and eyes are all animated.
function buildIsabella(g, B, ctx) {
  const { group: fig, rig, info } = buildMerFigure(MER_PALETTES.isabella, { sub: true });
  g.add(fig);
  const M = {
    shell: std(0xffe3ef, { metalness: 0.35, roughness: 0.25, emissive: 0x3a1a28, emissiveIntensity: 0.15 }),
    rib: std(0xffb3d1, { metalness: 0.3, roughness: 0.3 }),
    gold: std(0xffcf4a, { metalness: 0.85, roughness: 0.28 }),
    jet: new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0.85 }),
  };
  // scallop shell on the back with the glass cockpit bubble
  const sz = -1.25, sy = 0.36;
  for (let i = 0; i < 9; i++) {
    const a = -1.0 + (i / 8) * 2.0;
    B.add(i % 2 ? M.rib : M.shell, new THREE.SphereGeometry(1, 10, 8, 0, Math.PI, 0, Math.PI / 2), { p: [Math.sin(a) * 0.12, sy, sz + 0.12 - Math.cos(a) * 0.12], r: [-Math.PI / 2, a, 0], s: [0.1, 0.62, 0.16] });
  }
  B.add(M.gold, new THREE.TorusGeometry(0.36, 0.03, 6, 26, Math.PI), { p: [0, sy + 0.02, sz + 0.1], r: [-Math.PI / 2, 0, 0] });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), glassMat());
  dome.scale.set(0.3, 0.26, 0.38);
  dome.position.set(0, sy + 0.02, sz - 0.22);
  dome.renderOrder = 2;
  g.add(dome);
  B.add(M.gold, new THREE.TorusGeometry(1, 0.03, 6, 26), { p: [0, sy + 0.02, sz - 0.22], r: [Math.PI / 2, 0, 0], s: [0.31, 0.39, 1] });
  // side thrusters at the hips (glow brighter when going fast)
  const jets = [];
  for (const s of [-1, 1]) {
    B.add(M.gold, new THREE.CylinderGeometry(0.1, 0.12, 0.3, 14, 1, true), { p: [s * 0.46, -0.08, -0.45], r: [Math.PI / 2, 0, 0] });
    const j = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), M.jet);
    j.position.set(s * 0.46, -0.08, -0.3);
    g.add(j);
    jets.push(j);
  }
  // headlight: the gem in her tiara
  ctx.lamp(0, 0.98, -2.68, 0.07, true);
  // name plates "ISABELLA" on the tail (they move with it)
  const plateMat = new THREE.MeshBasicMaterial({ map: namePlateTexture('ISABELLA'), transparent: true, fog: true });
  for (const sx of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.24), plateMat);
    pl.position.set(sx * 0.41, 0.06, 0.32);
    pl.rotation.y = sx * (Math.PI / 2 - 0.08);
    info.tailSeg1.add(pl);
  }
  g.userData.anim = (dt, t, speed) => {
    animMer(rig, t, dt, speed, {});
    const k = Math.min(1, speed / 9);
    for (const j of jets) {
      j.material.opacity = 0.45 + 0.5 * k + 0.08 * Math.sin(t * 20);
      j.scale.setScalar(0.9 + 0.3 * k);
    }
  };
  return { lamp: [0, 0.98, -2.7], top: 0.75, attach: [1.4, 1.5], arm: [0, -0.48, -1.25] };
}

// ---------------- KUGELBLITZ (puffer fish ball) ----------------
function buildPuffer(g, B, ctx) {
  const M = {
    body: std(ctx.color, { emissive: ctx.color, emissiveIntensity: 0.12 }),
    belly: std(0xfff0b8),
    spike: std(0x2a2a30, { roughness: 0.5 }),
    spot: std(0x1b1b22),
    rim: std(0x2a2a30, { metalness: 0.6, roughness: 0.3 }),
    port: portMat(),
    dark: std(0x2a2a30, { metalness: 0.4 }),
  };
  B.add(M.body, new THREE.SphereGeometry(1.35, 30, 20), { s: [1, 0.95, 1.05] });
  B.add(M.belly, new THREE.SphereGeometry(1.3, 26, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), { s: [1.01, 0.97, 1.06] });
  const rnd = mulberry(5);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, b = 0.15 + rnd() * 0.45;
    const n = new THREE.Vector3(Math.cos(a) * Math.sin(b * Math.PI), Math.cos(b * Math.PI), Math.sin(a) * Math.sin(b * Math.PI));
    if (n.z < -0.55) continue;
    B.add(M.spot, new THREE.SphereGeometry(0.16, 8, 6), { p: [n.x * 1.32, n.y * 1.26, n.z * 1.38], s: [1, 0.35, 1], q: new THREE.Quaternion().setFromUnitVectors(UP, n) });
  }
  // spikes (separate group so they can puff up)
  const SB = new PartBuilder();
  const N = 70;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    const n = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    if (n.z < -0.6 && Math.abs(n.y) < 0.6) continue; // keep the window free
    if (n.y < -0.8) continue;
    SB.add(M.spike, new THREE.ConeGeometry(0.07, 0.36, 6), { p: [n.x * 1.42, n.y * 1.34, n.z * 1.46], q: new THREE.Quaternion().setFromUnitVectors(UP, n) });
  }
  const spikes = new THREE.Group();
  SB.build(spikes);
  g.add(spikes);
  // big round window + rim
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), glassMat());
  win.position.set(0, 0.12, -1.18);
  win.renderOrder = 2;
  g.add(win);
  B.add(M.rim, new THREE.TorusGeometry(0.64, 0.08, 8, 28), { p: [0, 0.12, -1.22] });
  B.add(M.dark, new THREE.BoxGeometry(0.7, 0.18, 0.2), { p: [0, -0.25, -1.3] });
  for (const sx of [-1, 1]) {
    porthole(B, M, [sx * 1.15, 0.45, 0.15], new THREE.Vector3(sx * 0.85, 0.45, 0.1).normalize(), 0.17);
    ctx.lamp(sx * 0.42, -0.62, -1.24, 0.13);
    B.add(M.rim, new THREE.CylinderGeometry(0.16, 0.12, 0.2, 12), { p: [sx * 0.42, -0.62, -1.14], r: [Math.PI / 2, 0, 0] });
  }
  // pectoral fins (flap)
  const fins = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group();
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), std(0xffd84a, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    f.scale.set(1, 0.6, 1);
    f.position.x = sx * 0.4;
    f.rotation.y = Math.PI / 2;
    piv.add(f);
    piv.position.set(sx * 1.28, -0.2, 0.25);
    g.add(piv);
    fins.push(piv);
  }
  // tail fan + prop in a ring
  B.add(M.body, new THREE.ConeGeometry(0.5, 0.6, 16).rotateX(Math.PI / 2), { p: [0, 0, 1.55] });
  B.add(M.rim, new THREE.TorusGeometry(0.55, 0.07, 8, 26), { p: [0, 0, 1.95] });
  const tail = new THREE.Mesh(new THREE.CircleGeometry(0.6, 3), std(0x1b1b22, { side: THREE.DoubleSide }));
  tail.rotation.set(0, Math.PI / 2, Math.PI / 2);
  tail.position.set(0, 0, 2.35);
  tail.scale.set(1, 1.3, 1);
  g.add(tail);
  const prop = propeller(4, BLADE_M, [M.dark], 0.28);
  prop.position.set(0, 0, 1.95);
  g.add(prop);
  // little landing legs
  for (const [x, z] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.6], [0.6, 0.6]]) {
    B.add(M.rim, new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), { p: [x, -1.25, z] });
    B.add(M.rim, new THREE.SphereGeometry(0.1, 8, 6), { p: [x, -1.5, z] });
  }
  g.userData.prop = prop;
  g.userData.anim = (dt, t, speed) => {
    const s = 1 + Math.max(0, Math.sin(t * 0.9)) * 0.1;
    spikes.scale.setScalar(s);
    fins.forEach((f, i) => (f.rotation.y = (i ? 1 : -1) * Math.sin(t * 6) * 0.5));
    tail.rotation.y = Math.PI / 2 + Math.sin(t * 4) * 0.3;
  };
  return { lamp: [0, -0.55, -1.35], top: 1.3, attach: [0.7, 0.7], arm: [0, -1.2, -0.5] };
}

// ---------------- NARWAL-X ----------------
function buildNarwhal(g, B, ctx) {
  const M = {
    body: std(ctx.color, { roughness: 0.3, metalness: 0.2, emissive: ctx.color, emissiveIntensity: 0.12 }),
    top: std(0x1b1b22, { roughness: 0.35, metalness: 0.3 }),
    speck: std(0x3a3020),
    rim: std(0xc9d6e2, { metalness: 0.85, roughness: 0.25 }),
    port: portMat(),
    horn: std(0xf3ead2, { roughness: 0.4 }),
    groove: std(0x8a7a55),
    glow: new THREE.MeshBasicMaterial({ color: 0xfff2c0 }),
  };
  B.add(M.body, new THREE.SphereGeometry(1, 28, 18), { s: [0.88, 0.8, 2.45] });
  B.add(M.top, new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.38), { s: [0.9, 0.82, 2.47] });
  const rnd = mulberry(9);
  for (let i = 0; i < 26; i++) {
    const z = (rnd() - 0.5) * 3.6, a = (rnd() - 0.5) * 1.6;
    const rr = Math.sqrt(Math.max(0.05, 1 - (z / 2.45) ** 2));
    B.add(M.speck, new THREE.SphereGeometry(0.06 + rnd() * 0.05, 6, 4), { p: [Math.sin(a) * 0.88 * rr, Math.cos(a) * 0.8 * rr + 0.01, z], s: [1, 0.4, 1] });
  }
  // canopy
  const can = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glassMat());
  can.scale.set(0.42, 0.32, 0.95);
  can.position.set(0, 0.62, -0.9);
  can.renderOrder = 2;
  g.add(can);
  B.add(M.rim, new THREE.TorusGeometry(1, 0.03, 6, 30), { p: [0, 0.62, -0.9], r: [Math.PI / 2, 0, 0], s: [0.43, 0.96, 1] });
  // glowing side stripes
  for (const sx of [-1, 1]) {
    B.add(M.glow, new THREE.BoxGeometry(0.02, 0.06, 2.6), { p: [sx * 0.86, -0.12, 0.1] });
    for (const z of [-0.2, 0.6]) porthole(B, M, [sx * 0.8, 0.22, z], new THREE.Vector3(sx, 0.25, 0).normalize(), 0.13);
    // swept side fins
    B.add(M.top, new THREE.BoxGeometry(0.9, 0.06, 0.55), { p: [sx * 1.15, -0.25, 0.6], r: [0, sx * -0.55, sx * -0.2] });
    ctx.lamp(sx * 0.42, -0.4, -2.14, 0.12);
  }
  // tail flukes + prop
  for (const sx of [-1, 1]) B.add(M.top, new THREE.BoxGeometry(1.0, 0.07, 0.5), { p: [sx * 0.55, 0, 2.55], r: [0, sx * -0.5, 0] });
  B.add(M.rim, new THREE.TorusGeometry(0.42, 0.06, 8, 24), { p: [0, 0, 2.55] });
  const prop = propeller(3, BLADE_M, [M.rim], 0.22);
  prop.position.set(0, 0, 2.6);
  g.add(prop);
  // spinning spiral drill horn
  const horn = new THREE.Group();
  const HB = new PartBuilder();
  HB.add(M.horn, new THREE.ConeGeometry(0.16, 2.3, 12).rotateX(-Math.PI / 2), {});
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const f = i / 60, z = 1.15 - f * 2.3, r = 0.16 * (1 - f) + 0.012;
    pts.push(new THREE.Vector3(Math.cos(f * 30) * r, Math.sin(f * 30) * r, z));
  }
  HB.add(M.groove, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.018, 4, false), {});
  HB.build(horn);
  horn.position.set(0, -0.05, -3.55);
  g.add(horn);
  B.add(M.rim, new THREE.CylinderGeometry(0.2, 0.26, 0.25, 14).rotateX(Math.PI / 2), { p: [0, -0.05, -2.42] });
  g.userData.prop = prop;
  g.userData.anim = (dt, t, speed) => {
    horn.rotation.z += dt * (2 + speed * 0.8);
  };
  return { lamp: [0, -0.4, -2.2], top: 0.82, attach: [1.0, 1.1], arm: [0, -0.72, -1.2] };
}

// ---------------- OKTOPODA ----------------
function buildOctopus(g, B, ctx) {
  const M = {
    body: std(ctx.color, { emissive: ctx.color, emissiveIntensity: 0.12, roughness: 0.3 }),
    spot: std(0xe0a000),
    tip: std(0x1b1b22),
    rim: std(0xd4a548, { metalness: 0.85, roughness: 0.3 }),
    port: portMat(),
    dark: std(0x1b1b22),
  };
  B.add(M.body, new THREE.SphereGeometry(1.2, 28, 20), { p: [0, 0.35, 0.15], s: [1, 1.12, 1.15] });
  const rnd = mulberry(3);
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2, b = rnd() * 0.5;
    const n = new THREE.Vector3(Math.cos(a) * Math.sin(b * Math.PI), Math.cos(b * Math.PI), Math.sin(a) * Math.sin(b * Math.PI));
    if (n.z < -0.6) continue;
    B.add(M.spot, new THREE.SphereGeometry(0.15 + rnd() * 0.1, 8, 6), { p: [n.x * 1.18, 0.35 + n.y * 1.32, 0.15 + n.z * 1.36], s: [1, 0.3, 1], q: new THREE.Quaternion().setFromUnitVectors(UP, n) });
  }
  B.add(M.dark, new THREE.CylinderGeometry(0.95, 0.85, 0.35, 24), { p: [0, -0.55, 0.15] });
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 14), glassMat());
  win.position.set(0, 0.25, -1.05);
  win.renderOrder = 2;
  g.add(win);
  B.add(M.rim, new THREE.TorusGeometry(0.6, 0.08, 8, 28), { p: [0, 0.25, -1.1] });
  for (const sx of [-1, 1]) {
    porthole(B, M, [sx * 0.85, 0.95, -0.5], new THREE.Vector3(sx * 0.7, 0.5, -0.5).normalize(), 0.15);
    ctx.lamp(sx * 0.45, -0.32, -1.18, 0.12);
  }
  // eight arms: chains of segments that wave
  const arms = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const root = new THREE.Group();
    root.position.set(Math.cos(a) * 0.72, -0.68, 0.15 + Math.sin(a) * 0.72);
    root.rotation.y = -a + Math.PI / 2;
    let parent = root;
    const segs = [];
    for (let s = 0; s < 4; s++) {
      const r0 = 0.16 * (1 - s * 0.2), r1 = 0.16 * (1 - (s + 1) * 0.2) + 0.02;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 0.42, 8), s === 3 ? M.tip : M.body);
      m.position.y = -0.21;
      const j = new THREE.Group();
      j.position.y = s === 0 ? 0 : -0.42;
      j.add(m);
      parent.add(j);
      parent = j;
      segs.push(j);
    }
    g.add(root);
    arms.push({ segs, ph: k * 0.8, back: Math.sin(a) });
  }
  const prop = propeller(3, BLADE_M, [M.dark], 0.24);
  prop.position.set(0, 0.3, 1.55);
  g.add(prop);
  B.add(M.rim, new THREE.TorusGeometry(0.4, 0.06, 8, 22), { p: [0, 0.3, 1.5] });
  g.userData.prop = prop;
  g.userData.anim = (dt, t, speed) => {
    const trail = Math.min(0.9, 0.35 + speed * 0.05);
    for (const arm of arms) {
      arm.segs.forEach((j, s) => {
        j.rotation.x = (s === 0 ? trail : 0.25) + Math.sin(t * 2.4 + arm.ph + s * 0.9) * 0.28;
      });
    }
  };
  return { lamp: [0, -0.2, -1.25], top: 1.7, attach: [0.6, 0.7], arm: [0, -0.62, -0.7] };
}

// ---------------- TIEFSEERAKETE ----------------
function buildRocket(g, B, ctx) {
  const M = {
    body: std(ctx.color, { emissive: ctx.color, emissiveIntensity: 0.1, roughness: 0.35 }),
    white: std(0x1b1b22, { roughness: 0.4 }),
    rim: std(0xcfd6dd, { metalness: 0.9, roughness: 0.2 }),
    port: portMat(),
    dark: std(0x22262c, { metalness: 0.4 }),
  };
  const prof = [[0, 2.5], [0.22, 2.25], [0.5, 1.75], [0.78, 1.0], [0.95, 0.2], [0.97, -0.6], [0.92, -1.4], [0.78, -1.95], [0.6, -2.1]].map(([r, y]) => new THREE.Vector2(r, y));
  B.add(M.body, new THREE.LatheGeometry(prof, 30).rotateX(-Math.PI / 2), {});
  // white bands + rivet rings
  for (const [z, w] of [[-0.9, 0.35], [0.7, 0.25]]) {
    const r = 0.975;
    B.add(M.white, new THREE.CylinderGeometry(r, r, w, 30, 1, true).rotateX(Math.PI / 2), { p: [0, 0, z] });
  }
  B.add(M.white, new THREE.ConeGeometry(0.23, 0.26, 20).rotateX(-Math.PI / 2), { p: [0, 0, -2.37] });
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    B.add(M.rim, RIVET, { p: [Math.cos(a) * 0.99, Math.sin(a) * 0.99, 0.25], s: 1.4 });
  }
  // portholes along the top
  for (const z of [-1.2, -0.3, 0.45]) porthole(B, M, [0, Math.cos(0.15) * 0.96, z], new THREE.Vector3(0, 1, 0.05).normalize(), 0.17);
  for (const sx of [-1, 1]) porthole(B, M, [sx * 0.94, 0.15, -0.3], new THREE.Vector3(sx, 0.15, 0).normalize(), 0.2);
  // four swept fins (X)
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(1.3, 0);
  fin.lineTo(1.6, 1.15);
  fin.lineTo(1.05, 1.2);
  fin.closePath();
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const geo = new THREE.ExtrudeGeometry(fin, { depth: 0.07, bevelEnabled: false });
    geo.translate(0, 0, -0.035);
    geo.rotateY(-Math.PI / 2); // fin plane = YZ, shape x -> z (aft)
    geo.rotateZ(-Math.PI / 2); // point outward along +x
    B.add(k % 2 ? M.white : M.body, geo, { p: [Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.55], r: [0, 0, a] });
  }
  // nozzle + flame
  B.add(M.rim, new THREE.CylinderGeometry(0.42, 0.6, 0.55, 20, 1, true).rotateX(Math.PI / 2), { p: [0, 0, 2.3] });
  B.add(M.dark, new THREE.CircleGeometry(0.45, 20), { p: [0, 0, 2.1], r: [0, Math.PI, 0] });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.4, 16, 1, true).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flame.geometry.translate(0, 0, 0.7);
  flame.position.set(0, 0, 2.45);
  g.add(flame);
  const prop = propeller(4, BLADE_S, [M.rim], 0.16);
  prop.position.set(0, 0, 2.2);
  g.add(prop);
  // nose light + side lamps
  ctx.lamp(0, 0, -2.505, 0.09, true);
  for (const sx of [-1, 1]) ctx.lamp(sx * 0.5, -0.55, -1.55, 0.11);
  g.userData.prop = prop;
  g.userData.anim = (dt, t, speed) => {
    flame.scale.set(1, 1, 0.6 + speed * 0.05 + Math.random() * 0.25);
    flame.material.opacity = 0.3 + Math.random() * 0.2;
  };
  return { lamp: [0, -0.3, -2.3], top: 0.97, attach: [1.1, 1.1], arm: [0, -0.95, -0.95] };
}

// ---------------- TIEFSEE-UFO ----------------
function buildUfo(g, B, ctx) {
  const M = {
    body: std(ctx.color, { metalness: 0.45, roughness: 0.3, emissive: ctx.color, emissiveIntensity: 0.1 }),
    dark: std(0x1b1b22, { metalness: 0.6, roughness: 0.3 }),
    rim: std(0xe8eef4, { metalness: 0.9, roughness: 0.15 }),
    port: portMat(),
    ring: new THREE.MeshBasicMaterial({ color: 0xfff2c0 }),
    panel: std(0x302810, { emissive: 0xffc21a, emissiveIntensity: 0.8 }),
  };
  const prof = [[0.0, 0.42], [0.9, 0.38], [1.7, 0.2], [2.2, 0.0], [1.75, -0.22], [0.9, -0.42], [0.0, -0.46]].map(([r, y]) => new THREE.Vector2(r, y));
  B.add(M.body, new THREE.LatheGeometry(prof, 40), {});
  B.add(M.rim, new THREE.TorusGeometry(2.2, 0.06, 6, 48).rotateX(Math.PI / 2), {});
  B.add(M.dark, new THREE.CylinderGeometry(0.9, 0.7, 0.25, 30), { p: [0, -0.55, 0] });
  B.add(M.ring, new THREE.TorusGeometry(0.75, 0.05, 6, 32).rotateX(Math.PI / 2), { p: [0, -0.68, 0] });
  // dome with control panel
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat());
  dome.position.y = 0.36;
  dome.renderOrder = 2;
  g.add(dome);
  B.add(M.rim, new THREE.TorusGeometry(0.86, 0.06, 6, 30).rotateX(Math.PI / 2), { p: [0, 0.38, 0] });
  B.add(M.panel, new THREE.BoxGeometry(0.8, 0.22, 0.25), { p: [0, 0.5, -0.4], r: [-0.4, 0, 0] });
  B.add(M.dark, new THREE.CylinderGeometry(0.22, 0.25, 0.3, 12), { p: [0, 0.5, 0.15] });
  // portholes around the upper rim
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const n = new THREE.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize();
    porthole(B, M, [Math.cos(a) * 1.35, 0.3, Math.sin(a) * 1.35], n, 0.12);
  }
  // landing legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    B.add(M.dark, new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), { p: [Math.cos(a) * 1.0, -0.75, Math.sin(a) * 1.0], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] });
    B.add(M.rim, new THREE.SphereGeometry(0.12, 8, 6), { p: [Math.cos(a) * 1.15, -1.07, Math.sin(a) * 1.15] });
  }
  // rear jets
  const sideProps = [];
  for (const sx of [-1, 1]) {
    B.add(M.dark, new THREE.CylinderGeometry(0.22, 0.22, 0.7, 12).rotateX(Math.PI / 2), { p: [sx * 0.75, -0.05, 1.95] });
    B.add(M.ring, new THREE.TorusGeometry(0.22, 0.03, 6, 16), { p: [sx * 0.75, -0.05, 2.3] });
    const sp = propeller(3, BLADE_S, [M.rim], 0.11);
    sp.position.set(sx * 0.75, -0.05, 2.32);
    g.add(sp);
    sideProps.push(sp);
    ctx.lamp(sx * 0.6, -0.12, -2.07, 0.12);
  }
  // chasing rainbow lights on the rim
  const lights = new THREE.Group();
  const lmats = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    lmats.push(m);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), m);
    s.position.set(Math.cos(a) * 2.05, 0.05, Math.sin(a) * 2.05);
    lights.add(s);
  }
  g.add(lights);
  g.userData.sideProps = sideProps;
  g.userData.anim = (dt, t) => {
    lights.rotation.y += dt * 0.8;
    lmats.forEach((m, i) => m.color.setHex(Math.sin(t * 6 - i * 0.7) > 0.3 ? 0xfff2b0 : 0x5a4200));
  };
  return { lamp: [0, -0.2, -2.15], top: 1.22, attach: [0.9, 0.9], arm: [0, -0.62, -1.3] };
}

function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


// ---------------- big telescopic grabber arm (every sub) ----------------
// shoulder -> outer tube -> two telescoping tubes -> claw with 3 fingers.
// Retracted the claw sits under the nose; fully extended it reaches ~7.7 units.
const ARM_REST_PITCH = -0.55;
const ARM_BASE = 1.7; // shoulder to claw tip when retracted
const ARM_EXT = 3.0; // per telescoping tube
function tubeZ(r, len, mat) {
  const geo = new THREE.CylinderGeometry(r, r, len, 14).rotateX(Math.PI / 2);
  geo.translate(0, 0, -len / 2);
  return new THREE.Mesh(geo, mat);
}
function buildArm(g, mount) {
  const steel = std(0xa8b3bf, { metalness: 0.75, roughness: 0.3 });
  const dark = std(0x1b1b22, { roughness: 0.5, metalness: 0.3 });
  const yel = std(0xffc21a, { emissive: 0xffc21a, emissiveIntensity: 0.12 });
  const root = new THREE.Group();
  root.position.set(...mount);
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), dark);
  root.add(shoulder);
  const aim = new THREE.Group();
  aim.rotation.order = 'YXZ';
  aim.rotation.x = ARM_REST_PITCH;
  root.add(aim);
  aim.add(tubeZ(0.15, 1.1, yel));
  for (const z of [-0.25, -0.75]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.03, 6, 18), dark);
    ring.position.z = z;
    aim.add(ring);
  }
  const s2 = new THREE.Group();
  s2.add(tubeZ(0.115, 1.35, steel));
  aim.add(s2);
  const s3 = new THREE.Group();
  s3.add(tubeZ(0.085, 1.25, steel));
  s2.add(s3);
  const claw = new THREE.Group();
  claw.position.z = -1.25;
  claw.scale.setScalar(1.35); // big claw, easy to see open and close
  s3.add(claw);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.16, 12).rotateX(Math.PI / 2), dark);
  wrist.position.z = -0.08;
  claw.add(wrist);
  const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.14, 12).rotateX(Math.PI / 2), yel);
  palm.position.z = -0.22;
  claw.add(palm);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a3a }));
  lamp.position.set(0, 0.17, -0.2);
  claw.add(lamp);
  const fingers = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const base = new THREE.Group();
    base.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, -0.28);
    base.rotation.z = a - Math.PI / 2;
    const hinge = new THREE.Group();
    base.add(hinge);
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.34).translate(0, 0, -0.17), steel);
    hinge.add(f1);
    const tip = new THREE.Group();
    tip.position.z = -0.34;
    tip.rotation.x = -0.6;
    tip.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.22).translate(0, 0, -0.11), dark));
    hinge.add(tip);
    claw.add(base);
    fingers.push(hinge);
  }
  g.add(root);
  return { root, aim, s2, s3, claw, fingers, ext: 0, open: 0.5, state: 'idle', target: null, onGrip: null, carry: null, t: 0 };
}

const _tw = new THREE.Vector3();
// Start a grab: the arm reaches for targetObj (an Object3D in the world). onGrip(claw) fires when it closes.
export function armGrab(g, targetObj, onGrip) {
  const arm = g.userData.arm;
  if (!arm || arm.state !== 'idle') return false;
  arm.state = 'out';
  arm.target = targetObj;
  arm.onGrip = onGrip;
  arm.t = 0;
  return true;
}
export function armBusy(g) {
  const arm = g.userData.arm;
  return !!arm && arm.state !== 'idle';
}

function setExt(arm, e) {
  arm.ext = e;
  const e2 = Math.min(ARM_EXT, e);
  const e3 = Math.max(0, Math.min(ARM_EXT, e - ARM_EXT));
  arm.s2.position.z = -0.2 - e2;
  arm.s3.position.z = -0.2 - e3;
}

function updateArm(g, arm, dt, t) {
  arm.t += dt;
  const approach = (cur, want, rate) => cur + (want - cur) * (1 - Math.exp(-dt * rate));
  let wantYaw = 0, wantPitch = ARM_REST_PITCH, wantExt = 0, wantOpen = 0.22 + Math.sin(t * 1.3) * 0.06;
  if (arm.state === 'out' || arm.state === 'grip') {
    if (arm.target) {
      g.updateMatrixWorld();
      arm.target.getWorldPosition(_tw);
      g.worldToLocal(_tw);
      _tw.sub(arm.root.position);
      const horiz = Math.hypot(_tw.x, _tw.z);
      wantYaw = Math.atan2(-_tw.x, -_tw.z);
      wantPitch = Math.atan2(_tw.y, horiz);
      wantExt = clamp(_tw.length() - ARM_BASE + 0.15, 0, ARM_EXT * 2);
    }
    // wide open on the way out, then the claw snaps shut around the find
    wantOpen = arm.state === 'grip' ? 0 : 1;
  }
  if (arm.state === 'in' && arm.carry) wantOpen = 0;
  arm.aim.rotation.y = approach(arm.aim.rotation.y, wantYaw, arm.state === 'idle' ? 3 : 7);
  arm.aim.rotation.x = approach(arm.aim.rotation.x, wantPitch, arm.state === 'idle' ? 3 : 7);
  const speed = arm.state === 'in' ? 7 : 10;
  const step = Math.sign(wantExt - arm.ext) * Math.min(Math.abs(wantExt - arm.ext), speed * dt);
  setExt(arm, arm.ext + step);
  arm.open = approach(arm.open, wantOpen, arm.state === 'grip' ? 9 : 5);
  // open: fingers splay ~60° outwards; closed: the tips meet in the middle
  arm.fingers.forEach((f) => (f.rotation.x = -0.12 + arm.open * 1.17));
  if (arm.state === 'out' && Math.abs(wantExt - arm.ext) < 0.05 && arm.t > 0.55) {
    arm.state = 'grip';
    arm.t = 0;
  } else if (arm.state === 'grip' && arm.t > 0.5) {
    if (arm.onGrip) arm.carry = arm.onGrip(arm.claw) || null;
    arm.onGrip = null;
    arm.target = null;
    arm.state = 'in';
    arm.t = 0;
  } else if (arm.state === 'in' && arm.ext < 0.02 && arm.t > 0.3) {
    if (arm.carry) {
      arm.carry.parent && arm.carry.parent.remove(arm.carry);
      arm.carry = null;
    }
    arm.state = 'idle';
  }
  if (arm.state === 'in' && arm.carry) arm.carry.scale.multiplyScalar(Math.exp(-dt * 0.8));
}

const BUILDERS = { isabella: buildIsabella, hummel: buildHummel, wolfshark: buildWolfShark, puffer: buildPuffer, narwhal: buildNarwhal, octopus: buildOctopus, rocket: buildRocket, ufo: buildUfo };

let glowTex = null;
function lampGlowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,250,230,1)');
  grd.addColorStop(0.2, 'rgba(255,240,200,0.6)');
  grd.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

// Build a submarine. type: one of SUB_MODELS ids.
export function buildSubModel(type = 'hummel', color = null, withLights = false) {
  const def = subModelById(type);
  const g = new THREE.Group();
  const B = new PartBuilder();
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });
  const glowMat = new THREE.SpriteMaterial({ map: lampGlowTexture(), color: 0xfff1c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const glows = [];
  const ctx = {
    color: def.color, // all subs are yellow (team colours only on the name tags)
    lamp(x, y, z, r, sphere = false) {
      const m = new THREE.Mesh(sphere ? new THREE.SphereGeometry(r, 10, 8) : new THREE.CircleGeometry(r, 16), lampMat);
      m.position.set(x, y, z);
      m.rotation.y = Math.PI;
      g.add(m);
      const s = new THREE.Sprite(glowMat);
      s.position.set(x, y, z - 0.08);
      s.scale.setScalar(r * 14);
      g.add(s);
      glows.push(s);
    },
  };
  const info = BUILDERS[def.id](g, B, ctx);
  B.build(g);
  g.userData.arm = buildArm(g, info.arm || [0, -0.9, -1.1]);
  g.userData.type = def.id;
  g.userData.top = info.top;
  g.userData.attach = info.attach;
  g.userData.lampMat = lampMat;
  g.userData.glowMat = glowMat;

  // faint light beam (purely visual)
  const beamGeo = new THREE.ConeGeometry(4.2, 18, 20, 1, true);
  beamGeo.translate(0, -9, 0);
  beamGeo.rotateX(Math.PI / 2);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0.05 }, color: { value: new THREE.Color(0xfff1c8) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float opacity; uniform vec3 color; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float along = pow(vUv.y, 1.6); float edge = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(color, opacity * along * edge * 2.0); }',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const [lx, ly, lz] = info.lamp;
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(lx, ly, lz);
  beam.rotation.x = -0.33;
  g.add(beam);
  g.userData.beam = beam;

  if (withLights) {
    const spot = new THREE.SpotLight(0xfff3dc, 60, 45, 0.55, 0.55, 1.0);
    spot.position.set(lx, ly, lz);
    const target = new THREE.Object3D();
    target.position.set(lx, ly - 7, lz - 20);
    g.add(target);
    spot.target = target;
    g.add(spot);
    const fill = new THREE.PointLight(0xcfe8ff, 14, 36, 1.0);
    fill.position.set(0, -1.2, -0.5);
    g.add(fill);
    g.userData.spot = spot;
    g.userData.fill = fill;
  }
  return g;
}

// Animate the moving parts. speed in units/s, t = time in seconds.
export function animateSubModel(g, dt, t, speed = 0, lightOn = true) {
  const u = g.userData;
  if (u.prop) u.prop.rotation.z += dt * (2.5 + speed * 3);
  if (u.sideProps) u.sideProps.forEach((p, i) => (p.rotation.z += dt * (i ? 9 : -9)));
  if (u.beacon) u.beacon.material.color.setHex((t * 1.3) % 1 < 0.18 ? 0xffe14a : 0x5a3a08);
  if (u.flag) u.flag.rotation.y = Math.sin(t * 4) * 0.25;
  if (u.arm) updateArm(g, u.arm, dt, t);
  if (u.anim) u.anim(dt, t, speed);
  u.lampMat.color.setHex(lightOn ? 0xfff4d0 : 0x333333);
}

export class Sub {
  constructor(scene, world, upgrades, color = null, model = 'hummel') {
    this.world = world;
    this.group = buildSubModel(model, color, true);
    this.t = 0;
    this.locked = false; // true while hanging on the chains
    scene.add(this.group);
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitchVis = 0;
    this.rollVis = 0;
    this.descentRamp = 0;
    this.ascentRamp = 0;
    this.lightOn = true;
    this.setUpgrades(upgrades);
    this.impact = 0; // collision strength this frame
    this.proximity = false;
    this.outOfBounds = false;
    this.autoAscent = false;
  }

  setUpgrades(u) {
    const ranges = [45, 60, 75];
    this.lightRange = ranges[u.lights || 0];
    const spot = this.group.userData.spot;
    if (spot) spot.distance = this.lightRange;
  }

  setLight(on) {
    this.lightOn = on;
    const { spot, fill, beam, lampMat } = this.group.userData;
    if (spot) spot.visible = on;
    if (fill) fill.intensity = on ? 14 : 1;
    beam.visible = on;
    this.group.userData.glowMat.visible = on;
  }

  grab(targetObj, onGrip) {
    return armGrab(this.group, targetObj, onGrip);
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  lightInfo() {
    const dir = this.forward().clone();
    dir.y = -0.35;
    dir.normalize();
    const p = this.pos.clone().addScaledVector(this.forward(), 1.9);
    return { pos: p, dir, on: this.lightOn, range: this.lightRange };
  }

  update(dt, input, opts = {}) {
    if (this.locked) {
      this.t += dt;
      animateSubModel(this.group, dt, this.t, 1, this.lightOn);
      this.speed = 0;
      this.thrust = 0;
      this.impact = 0;
      this.proximity = false;
      return;
    }
    const fwd = this.forward();
    const boost = input.boost ? 1.6 : 1;
    const maxSpeed = 9 * boost * (opts.speedMul || 1);
    // turning
    this.yaw -= input.turn * 1.5 * dt;
    // forward thrust
    const targetSpeed = input.throttle * maxSpeed;
    const horiz = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    const curFwd = horiz.dot(fwd);
    const newFwd = lerp(curFwd, targetSpeed, 1 - Math.exp(-dt * 1.6));
    // remove sideways drift quickly
    const side = horiz.clone().addScaledVector(fwd, -curFwd).multiplyScalar(Math.exp(-dt * 3));
    this.vel.x = fwd.x * newFwd + side.x;
    this.vel.z = fwd.z * newFwd + side.z;

    // vertical with automatic fast descent/ascent when far from obstacles
    const floorY = this.world.heightAt(this.pos.x, this.pos.z);
    const clearance = this.pos.y - floorY;
    let vInput = input.vertical;
    if (this.autoAscent) vInput = 1;
    // boost mode (stays on until switched off): much faster diving and climbing
    const bd = this.boostDive ? 1 : 0;
    if (vInput < -0.2 && clearance > 70) this.descentRamp = Math.min(1, this.descentRamp + dt * (bd ? 1.6 : 0.6));
    else this.descentRamp = Math.max(0, this.descentRamp - dt * 1.8);
    if (vInput > 0.2 && this.pos.y < -25) this.ascentRamp = Math.min(1, this.ascentRamp + dt * (this.autoAscent ? 1.2 : bd ? 1.6 : 0.6));
    else this.ascentRamp = Math.max(0, this.ascentRamp - dt * 1.8);
    this.proximity = vInput < -0.2 && clearance < 70 && clearance > 6 && this.vel.y < -12;
    let vSpeed = bd ? 11 : 6.5;
    if (vInput < 0) vSpeed += (bd ? 66 : 38) * this.descentRamp;
    if (vInput > 0) vSpeed += (this.autoAscent ? 55 : bd ? 66 : 38) * this.ascentRamp;
    let targetV = vInput * vSpeed;
    if (vInput < 0 && clearance < 70) targetV = Math.max(targetV, -Math.max(4, clearance * 0.5));
    this.vel.y = lerp(this.vel.y, targetV, 1 - Math.exp(-dt * 2.2));

    // integrate
    this.pos.addScaledVector(this.vel, dt);

    // seafloor collision
    this.impact = 0;
    const fy = this.world.heightAt(this.pos.x, this.pos.z) + 1.4;
    if (this.pos.y < fy) {
      const pen = fy - this.pos.y;
      const speed = this.vel.length();
      if (speed > 3.5 && pen > 0.15) this.impact = Math.min(1, (speed - 3.5) / 10);
      this.pos.y = fy;
      if (this.vel.y < 0) this.vel.y = 0;
      this.vel.x *= 0.92;
      this.vel.z *= 0.92;
    }
    // surface
    if (this.pos.y > -1.6) {
      this.pos.y = -1.6;
      if (this.vel.y > 0) this.vel.y = 0;
    }
    // survey area bounds
    this.outOfBounds = false;
    const bx = WX - 40, bz = WZ - 40;
    if (Math.abs(this.pos.x) > bx) {
      this.outOfBounds = true;
      this.vel.x -= Math.sign(this.pos.x) * dt * 20;
      this.pos.x = clamp(this.pos.x, -WX + 10, WX - 10);
    }
    if (Math.abs(this.pos.z) > bz) {
      this.outOfBounds = true;
      this.vel.z -= Math.sign(this.pos.z) * dt * 20;
      this.pos.z = clamp(this.pos.z, -WZ + 10, WZ - 10);
    }

    // visuals
    const targetPitch = clamp(-this.vel.y * 0.02, -0.35, 0.35);
    this.pitchVis = lerp(this.pitchVis, targetPitch, 1 - Math.exp(-dt * 3));
    this.rollVis = lerp(this.rollVis, input.turn * 0.25 * clamp(Math.abs(newFwd) / 5, 0.3, 1), 1 - Math.exp(-dt * 3));
    this.group.rotation.set(0, 0, 0);
    this.group.rotation.order = 'YXZ';
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = this.pitchVis;
    this.group.rotation.z = this.rollVis;
    this.t += dt;
    animateSubModel(this.group, dt, this.t, Math.abs(newFwd) + Math.abs(this.vel.y) * 0.3, this.lightOn);
    this.speed = Math.abs(newFwd);
    this.thrust = Math.abs(input.throttle) + Math.abs(input.vertical) * 0.5;
  }
}

// A teammate's submersible (driven by network updates, smoothed).
export class RemoteSub {
  constructor(scene, color, name, model = 'hummel') {
    this.group = buildSubModel(model, model === 'hummel' ? color : null, false);
    this.group.userData.beam.material = this.group.userData.beam.material.clone();
    this.group.userData.beam.material.uniforms.opacity.value = 0.08;
    scene.add(this.group);
    this.target = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.targetYaw = 0;
    this.name = name;
    this.initialized = false;
    this.color = color;
    this.label = makeNameSprite(name, color);
    this.label.position.set(0, 2.6, 0);
    this.group.add(this.label);
  }

  setTalking(on) {
    if (on === this.talkOn) return;
    this.talkOn = on;
    this.label.visible = !on;
    if (!this.talkLabel) {
      this.talkLabel = makeNameSprite('🎙 ' + this.name, this.color);
      this.talkLabel.position.copy(this.label.position);
      this.group.add(this.talkLabel);
    }
    this.talkLabel.visible = on;
  }

  // briefly make the name tag big and visible through everything (quick radio call)
  flash(sec = 6) {
    this.flashT = sec;
  }

  setState(s) {
    // estimate the teammate's velocity from successive updates (used for bouncing off each other)
    const now = performance.now();
    if (this.lastStateT && this.initialized) {
      const dts = (now - this.lastStateT) / 1000;
      if (dts > 0.03 && dts < 1) {
        this._v = this._v || new THREE.Vector3();
        this._v.set(s.x - this.target.x, s.y - this.target.y, s.z - this.target.z).divideScalar(dts);
        this.vel.lerp(this._v, 0.6);
      }
    }
    this.lastStateT = now;
    this.target.set(s.x, s.y, s.z);
    this.targetYaw = s.yaw;
    if (!this.initialized) {
      this.group.position.copy(this.target);
      this.group.rotation.y = s.yaw;
      this.initialized = true;
    }
    this.lightOn = s.l !== 0;
    this.group.userData.beam.visible = this.lightOn;
  }

  update(dt) {
    this.group.position.lerp(this.target, 1 - Math.exp(-dt * 6));
    let d = this.targetYaw - this.group.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.group.rotation.y += d * (1 - Math.exp(-dt * 6));
    this.t = (this.t || 0) + dt;
    animateSubModel(this.group, dt, this.t, 4, this.lightOn !== false);
    const gm = this.group.userData.glowMat;
    gm.visible = this.lightOn !== false;
    gm.opacity = 0.6 * clamp((-this.group.position.y * 10 - 100) / 400, 0, 1);
    if (this.flashT > 0) this.flashT -= dt;
    const big = this.flashT > 0 ? 1.8 + Math.sin(this.t * 8) * 0.3 : 1;
    for (const l of [this.label, this.talkLabel]) {
      if (!l) continue;
      l.scale.set(4 * big, big, 1);
      l.material.depthTest = !(this.flashT > 0);
    }
    // hidden while still hanging above the water during the launch
    this.group.visible = this.group.position.y < -2.2;
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}

export function makeNameSprite(text, color = 0xffffff) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 48, 18);
  ctx.fill();
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  ctx.fillText(text.slice(0, 14), 128, 33);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(4, 1, 1);
  return s;
}
