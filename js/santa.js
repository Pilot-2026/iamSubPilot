// Christmas special: Santa Claus in his sleigh, pulled through the oceans by four seahorses. He swims through every
// dive from one week before to one week after Christmas (17 Dec – 2 Jan) and calls "Ho ho ho, merry Christmas"
// to the player. The secret code (5 × key 2, or 10 taps on your own sub) calls him at any time – and also dresses
// up your sub for Christmas (Santa hat, garland, blinking lights). Original design, built facing +z.

import * as THREE from './vendor/three.min.js';

const PI = Math.PI, TAU = Math.PI * 2;

export function xmasSeason(d = new Date()) {
  const m = d.getMonth(), day = d.getDate();
  return (m === 11 && day >= 17) || (m === 0 && day <= 2);
}

// ---------------------------------------------------------------- helpers
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.1, ...o });
const shiny = (c, k = 0.25, o = {}) => std(c, { emissive: c, emissiveIntensity: k, ...o });
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
let dotTex = null;
function dot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  return (dotTex = new THREE.CanvasTexture(c));
}
function halo(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}
function eye(parent, r, p, iris, ry = 0) {
  const g = grp(parent, p, [0, ry, 0]);
  add(g, new THREE.SphereGeometry(r, 16, 12), std(0xffffff, { roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.2 }));
  add(g, new THREE.SphereGeometry(r * 1.01, 16, 6, 0, TAU, 0, 0.62), shiny(iris, 0.4), [0, 0, 0], [PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(r * 1.02, 16, 6, 0, TAU, 0, 0.3), glow(0x08080c), [0, 0, 0], [PI / 2, 0, 0]);
  add(g, new THREE.SphereGeometry(r * 0.14, 6, 4), glow(0xffffff), [r * 0.25, r * 0.3, r * 0.92]);
  return g;
}
// red and white candy stripes along y
function candy(geo, n = 8) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  geo.computeBoundingBox();
  const y0 = geo.boundingBox.min.y, hy = geo.boundingBox.max.y - y0 || 1;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)), f = ((p.getY(i) - y0) / hy) * n + a / TAU;
    const red = Math.floor(f * 2) % 2 === 0;
    col.set(red ? [0.85, 0.06, 0.08] : [1, 1, 1], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const candyM = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0xa04040, emissiveIntensity: 0.55 });

// ---------------------------------------------------------------- a seahorse with harness and bells
function seahorse(c1, c2, finC, withHat) {
  const G = new THREE.Group();
  const bodyM = shiny(c1, 0.28, { roughness: 0.38, metalness: 0.2 });
  const bellyM = shiny(c2, 0.3, { roughness: 0.4 });
  const ridgeM = shiny(new THREE.Color(c1).multiplyScalar(0.7).getHex(), 0.2, { roughness: 0.35, metalness: 0.3 });
  const finM = new THREE.MeshStandardMaterial({ color: finC, emissive: finC, emissiveIntensity: 0.6, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  const gold = shiny(0xf2c24a, 0.45, { metalness: 0.85, roughness: 0.25 });
  const red = shiny(0xc8202a, 0.25);
  const head = grp(G, [0, 3.25, 0]);
  add(head, new THREE.SphereGeometry(0.38, 18, 14), bodyM, [0, 0, 0], [0, 0, 0], [0.82, 1, 1.12]);
  add(head, new THREE.CylinderGeometry(0.1, 0.15, 0.95, 12), bodyM, [0, -0.2, 0.6], [PI / 2 + 0.4, 0, 0]);
  add(head, new THREE.CylinderGeometry(0.13, 0.1, 0.12, 12), ridgeM, [0, -0.39, 1.04], [PI / 2 + 0.4, 0, 0]);
  eye(head, 0.13, [-0.25, 0.1, 0.14], 0xffb020, -1.0);
  eye(head, 0.13, [0.25, 0.1, 0.14], 0xffb020, 1.0);
  for (let k = 0; k < 5; k++) add(head, new THREE.ConeGeometry(0.06, 0.28, 5), ridgeM, [Math.cos(k * 1.26) * 0.12, 0.42, -0.08 + Math.sin(k * 1.26) * 0.12], [Math.sin(k * 1.26) * 0.3, 0, -Math.cos(k * 1.26) * 0.3]);
  for (const sx of [-1, 1]) add(head, new THREE.ConeGeometry(0.05, 0.22, 5), ridgeM, [sx * 0.3, -0.12, -0.05], [0, 0, sx * 1.4]);
  if (withHat) {
    const hat = grp(head, [0.05, 0.42, -0.05], [-0.25, 0, -0.35]);
    add(hat, new THREE.ConeGeometry(0.26, 0.6, 14), red, [0, 0.3, 0]);
    add(hat, new THREE.TorusGeometry(0.25, 0.08, 8, 16), std(0xffffff), [0, 0.02, 0], [PI / 2, 0, 0]);
    add(hat, new THREE.SphereGeometry(0.1, 10, 8), std(0xffffff), [0, 0.64, 0]);
  }
  // the S-shaped body made of bony rings, belly in front, then the curling tail
  const radii = [0.27, 0.36, 0.44, 0.48, 0.46, 0.4, 0.33];
  const segs = [];
  let p = grp(head, [0, -0.28, -0.18], [0.55, 0, 0]);
  radii.forEach((r, i) => {
    const j = grp(p, i ? [0, -0.38, 0] : [0, 0, 0], [i < 3 ? -0.22 : 0.12, 0, 0]);
    add(j, new THREE.CylinderGeometry(r, radii[i + 1] || r * 0.85, 0.4, 14, 1, true), bodyM, [0, -0.19, 0]);
    add(j, new THREE.SphereGeometry(r, 14, 10), bodyM);
    add(j, new THREE.TorusGeometry(r * 1.0, 0.035, 6, 18), ridgeM, [0, -0.02, 0], [PI / 2, 0, 0]);
    add(j, new THREE.SphereGeometry(r * 0.78, 12, 8), bellyM, [0, -0.15, r * 0.38], [0, 0, 0], [0.9, 1, 0.65]);
    segs.push(j);
    p = j;
  });
  const tail = [];
  for (let i = 0; i < 11; i++) {
    const r = 0.3 * (1 - i / 12) + 0.04;
    const j = grp(p, [0, -0.32, 0]);
    add(j, new THREE.CylinderGeometry(r, r * 0.9, 0.34, 10, 1, true), bodyM, [0, -0.16, 0]);
    add(j, new THREE.SphereGeometry(r, 10, 8), bodyM);
    if (i % 2 === 0) add(j, new THREE.TorusGeometry(r, 0.025, 5, 12), ridgeM, [0, 0, 0], [PI / 2, 0, 0]);
    tail.push(j);
    p = j;
  }
  // a fluttering dorsal fin with rays, small pectoral fins behind the head
  const dorsal = grp(segs[3], [0, -0.1, -0.42]);
  add(dorsal, new THREE.CircleGeometry(0.62, 18, PI * 0.55, PI * 0.9), finM, [0, 0, 0], [0, PI / 2, 0]);
  for (let k = 0; k < 6; k++) add(dorsal, new THREE.BoxGeometry(0.015, 0.6, 0.015), ridgeM, [0, Math.cos(PI * 0.6 + k * 0.16) * 0.3, -Math.sin(PI * 0.6 + k * 0.16) * 0.3], [PI * 0.1 + k * 0.16 - 0.4, 0, 0]);
  const pecs = [-1, 1].map((sx) => {
    const f = grp(segs[0], [sx * 0.28, -0.05, 0]);
    add(f, new THREE.CircleGeometry(0.28, 12, -0.8, 1.6), finM, [sx * 0.05, 0, 0], [0, sx * 0.4, 0]);
    return f;
  });
  // harness: a red strap with golden bells
  add(segs[2], new THREE.TorusGeometry(0.47, 0.06, 6, 20), red, [0, -0.15, 0], [PI / 2, 0, 0]);
  const bells = [-1, 1].map((sx) => {
    const b = grp(segs[2], [sx * 0.48, -0.25, 0.12]);
    add(b, new THREE.SphereGeometry(0.11, 10, 8), gold);
    add(b, new THREE.TorusGeometry(0.035, 0.012, 4, 8), gold, [0, 0.12, 0]);
    return b;
  });
  add(segs[0], new THREE.TorusGeometry(0.3, 0.05, 6, 16), red, [0, -0.05, 0], [PI / 2, 0, 0]);
  const rein = grp(segs[2], [0, -0.15, -0.45]);
  return {
    group: G,
    rein,
    anim(t, ph) {
      G.position.y = Math.sin(t * 1.7 + ph) * 0.22;
      G.rotation.x = Math.sin(t * 1.7 + ph + 0.8) * 0.06;
      head.rotation.x = Math.sin(t * 1.3 + ph) * 0.06;
      tail.forEach((j, i) => (j.rotation.x = -0.32 - i * 0.03 + Math.sin(t * 1.5 + ph - i * 0.35) * 0.08));
      dorsal.rotation.y = Math.sin(t * 24 + ph) * 0.45;
      pecs.forEach((f, s) => (f.rotation.y = (s ? 1 : -1) * Math.sin(t * 26 + ph) * 0.5));
      bells.forEach((b, s) => (b.rotation.z = Math.sin(t * 9 + ph + s) * 0.4));
    },
  };
}

// ---------------------------------------------------------------- the sleigh with Santa and his sack
export function buildSanta() {
  const G = new THREE.Group();
  const red = shiny(0xd0182a, 0.22, { roughness: 0.3, metalness: 0.3 });
  const suit = shiny(0xc8102a, 0.2, { roughness: 0.6 });
  const fur = std(0xfaf8f2, { roughness: 0.95, emissive: 0x5a5a5a, emissiveIntensity: 0.25 });
  const gold = shiny(0xf2c24a, 0.45, { metalness: 0.85, roughness: 0.22 });
  const black = std(0x16120f, { roughness: 0.5 });
  const green = shiny(0x1a6a3a, 0.2, { roughness: 0.8 });
  const skin = std(0xf6c6a8, { roughness: 0.55, emissive: 0x5a2a1a, emissiveIntensity: 0.2 });
  const sleigh = grp(G, [0, 0, -1.5]);
  // body: side profile with a curled front and a high back, extruded and rounded
  const sh = new THREE.Shape();
  sh.moveTo(-3.2, 0.45);
  sh.lineTo(-3.35, 2.6);
  sh.quadraticCurveTo(-3.55, 3.55, -2.85, 3.5);
  sh.quadraticCurveTo(-2.4, 3.45, -2.5, 2.9);
  sh.quadraticCurveTo(-2.2, 1.95, -1.2, 1.9);
  sh.lineTo(1.4, 1.85);
  sh.quadraticCurveTo(2.6, 1.9, 2.95, 2.75);
  sh.quadraticCurveTo(3.25, 3.55, 3.75, 3.3);
  sh.quadraticCurveTo(4.1, 3.0, 3.75, 2.75);
  sh.quadraticCurveTo(3.45, 2.6, 3.4, 1.6);
  sh.quadraticCurveTo(3.3, 0.6, 2.4, 0.45);
  sh.closePath();
  const body = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 3, curveSegments: 18 });
  body.translate(0, 0, -1.2).rotateY(-PI / 2);
  add(sleigh, body, red);
  // golden trim along both side edges and golden scrollwork
  const outline = sh.getPoints(40).map((v) => new THREE.Vector3(0, v.y, v.x));
  for (const sx of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3(outline.map((v) => v.clone().setX(sx * 1.35)), true);
    add(sleigh, new THREE.TubeGeometry(curve, 160, 0.07, 6, true), gold);
    for (const [z, y, r, a0] of [[0.2, 1.15, 0.45, 0], [-1.6, 1.25, 0.38, PI], [1.9, 1.1, 0.3, PI * 0.5], [-2.7, 2.2, 0.28, 0]]) {
      add(sleigh, new THREE.TorusGeometry(r, 0.05, 6, 20, PI * 1.5), gold, [sx * 1.37, y, z], [0, PI / 2, a0]);
      add(sleigh, new THREE.TorusGeometry(r * 0.5, 0.04, 6, 14, PI * 1.4), gold, [sx * 1.37, y + r * 0.25, z + r * 0.3], [0, PI / 2, a0 + 1]);
    }
    add(sleigh, new THREE.SphereGeometry(0.12, 10, 8), gold, [sx * 1.37, 3.35, 3.7]);
  }
  // runners curling up at the front, with struts
  const run = new THREE.CatmullRomCurve3([[-3.7, 0.15], [-3.2, -0.25], [-1, -0.32], [1.6, -0.32], [3.3, -0.25], [4.1, 0.25], [4.5, 1.0], [4.25, 1.55], [3.85, 1.45], [3.85, 1.1]].map(([z, y]) => new THREE.Vector3(0, y, z)));
  for (const sx of [-1, 1]) {
    add(sleigh, new THREE.TubeGeometry(run, 80, 0.11, 8), gold, [sx * 1.05, 0, 0]);
    for (const z of [-2.6, -0.4, 1.8]) add(sleigh, new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), gold, [sx * 1.05, 0.1, z]);
  }
  // cushions, a tartan blanket, lanterns, a garland with blinking lights
  add(sleigh, new THREE.BoxGeometry(2.3, 0.35, 1.9), green, [0, 2.05, -1.35]);
  add(sleigh, new THREE.BoxGeometry(2.3, 1.2, 0.35), green, [0, 2.75, -2.55], [-0.2, 0, 0]);
  const tc = document.createElement('canvas');
  tc.width = tc.height = 64;
  const tg = tc.getContext('2d');
  tg.fillStyle = '#b01828';
  tg.fillRect(0, 0, 64, 64);
  tg.fillStyle = 'rgba(20,60,30,0.75)';
  for (let k = 0; k < 64; k += 16) {
    tg.fillRect(k, 0, 6, 64);
    tg.fillRect(0, k, 64, 6);
  }
  tg.fillStyle = 'rgba(255,220,120,0.6)';
  for (let k = 8; k < 64; k += 16) {
    tg.fillRect(k, 0, 1.5, 64);
    tg.fillRect(0, k, 64, 1.5);
  }
  const tt = new THREE.CanvasTexture(tc);
  tt.colorSpace = THREE.SRGBColorSpace;
  tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
  tt.repeat.set(3, 2);
  add(sleigh, new THREE.BoxGeometry(2.45, 0.08, 1.6), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.9 }), [0, 2.3, 0.15], [0.15, 0, 0]);
  const lights = [];
  for (const sx of [-1, 1]) {
    const lt = grp(sleigh, [sx * 1.35, 2.55, 2.6]);
    add(lt, new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), gold, [0, -0.3, 0]);
    add(lt, new THREE.BoxGeometry(0.34, 0.42, 0.34), gold, [0, 0.21, 0]);
    add(lt, new THREE.SphereGeometry(0.15, 10, 8), glow(0xffd27a), [0, 0.21, 0]);
    add(lt, new THREE.ConeGeometry(0.26, 0.22, 4), gold, [0, 0.53, 0], [0, PI / 4, 0]);
    const h = halo(0xffd27a, 1.6);
    h.position.set(0, 0.21, 0);
    lt.add(h);
  }
  const rim = outline.filter((v) => v.y > 1.8);
  rim.forEach((v, i) => {
    if (i % 2) return;
    for (const sx of [-1, 1]) {
      add(sleigh, new THREE.SphereGeometry(0.13, 8, 6), green, [sx * 1.3, v.y + 0.12, v.z]);
      if (i % 4 === 0) lights.push(add(sleigh, new THREE.SphereGeometry(0.07, 8, 6), glow(0xffffff), [sx * 1.3, v.y + 0.25, v.z]));
    }
  });
  // the sack full of presents
  const sack = grp(sleigh, [0, 2.3, -2.2]);
  add(sack, new THREE.SphereGeometry(1.0, 18, 14), std(0x8a5a2e, { roughness: 0.95 }), [0, 0.75, -0.45], [0.2, 0, 0.1], [1.05, 1.15, 0.85]);
  add(sack, new THREE.TorusGeometry(0.42, 0.06, 6, 16), std(0xd8b070), [0, 1.62, -0.55], [PI / 2 - 0.3, 0, 0]);
  const giftCols = [[0x2a7ad8, 0xffd84a], [0x2ab85a, 0xd8202a], [0xf2f2f2, 0xd8202a], [0xa84ad8, 0xf2c24a], [0xf28a2a, 0x2a5ad8]];
  [[0, 1.95, -0.5, 0.55], [-0.5, 1.75, -0.35, 0.42], [0.55, 1.8, -0.3, 0.46], [0.25, 2.25, -0.65, 0.36], [-0.3, 2.2, -0.75, 0.32]].forEach(([x, y, z, s], i) => {
    const gft = grp(sack, [x, y, z], [i * 0.4, i * 0.7, i * 0.2]);
    const [cb, cr] = giftCols[i];
    add(gft, new THREE.BoxGeometry(s, s, s), shiny(cb, 0.25));
    add(gft, new THREE.BoxGeometry(s * 1.02, s * 1.02, s * 0.18), shiny(cr, 0.35));
    add(gft, new THREE.BoxGeometry(s * 0.18, s * 1.02, s * 1.02), shiny(cr, 0.35));
    for (const sx of [-1, 1]) add(gft, new THREE.TorusGeometry(s * 0.18, s * 0.05, 6, 12), shiny(cr, 0.35), [sx * s * 0.15, s * 0.58, 0], [0, PI / 2, sx * 0.6]);
  });
  const cane = grp(sack, [0.8, 1.6, -0.2], [0.2, 0, -0.3]);
  add(cane, candy(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 10, 12)), candyM(), [0, 0.7, 0]);
  add(cane, new THREE.TorusGeometry(0.2, 0.08, 8, 14, PI), std(0xd8101a), [0.2, 1.4, 0]);
  // a little teddy bear peeking out of the sack
  const ted = grp(sack, [-0.7, 1.95, -0.1], [0, 0.4, 0.25]);
  add(ted, new THREE.SphereGeometry(0.3, 14, 10), std(0xb8823a, { roughness: 0.95 }));
  for (const sx of [-1, 1]) {
    add(ted, new THREE.SphereGeometry(0.11, 8, 6), std(0xb8823a, { roughness: 0.95 }), [sx * 0.22, 0.22, -0.02]);
    add(ted, new THREE.SphereGeometry(0.04, 6, 4), black, [sx * 0.1, 0.06, 0.27]);
  }
  add(ted, new THREE.SphereGeometry(0.11, 8, 6), std(0xe8c890), [0, -0.06, 0.25]);
  // ---- Santa
  const santa = grp(sleigh, [0, 2.15, -1.05]);
  for (const sx of [-1, 1]) {
    add(santa, new THREE.CylinderGeometry(0.33, 0.3, 1.2, 12), suit, [sx * 0.42, 0.2, 0.5], [PI / 2 - 0.15, 0, 0]);
    add(santa, new THREE.TorusGeometry(0.31, 0.1, 8, 16), fur, [sx * 0.42, 0.12, 1.05], [0.1, 0, 0]);
    add(santa, new THREE.CylinderGeometry(0.3, 0.3, 0.7, 12), black, [sx * 0.42, -0.25, 1.25]);
    add(santa, new THREE.SphereGeometry(0.32, 12, 8), black, [sx * 0.42, -0.6, 1.45], [0, 0, 0], [0.95, 0.55, 1.4]);
  }
  add(santa, new THREE.SphereGeometry(1.05, 24, 18), suit, [0, 0.95, 0], [0, 0, 0], [1.05, 1.0, 0.95]);
  add(santa, new THREE.BoxGeometry(0.34, 1.7, 0.12), fur, [0, 0.95, 0.98]);
  add(santa, new THREE.TorusGeometry(1.0, 0.13, 8, 28), fur, [0, 0.25, 0], [PI / 2, 0, 0]);
  add(santa, new THREE.TorusGeometry(1.08, 0.1, 8, 28), black, [0, 0.95, 0], [PI / 2, 0, 0]);
  add(santa, new THREE.BoxGeometry(0.42, 0.34, 0.12), gold, [0, 0.95, 1.1]);
  add(santa, new THREE.BoxGeometry(0.24, 0.18, 0.13), black, [0, 0.95, 1.12]);
  add(santa, new THREE.SphereGeometry(0.75, 18, 12), suit, [0, 1.85, -0.05], [0, 0, 0], [1.15, 0.8, 0.95]);
  // arms: the right one holds the reins, the left one waves
  const armR = grp(santa, [-0.85, 1.85, 0.05], [-0.9, 0, -0.3]);
  add(armR, new THREE.CylinderGeometry(0.24, 0.22, 1.1, 12), suit, [0, -0.55, 0]);
  add(armR, new THREE.TorusGeometry(0.22, 0.09, 8, 14), fur, [0, -1.1, 0], [PI / 2, 0, 0]);
  add(armR, new THREE.SphereGeometry(0.2, 10, 8), black, [0, -1.28, 0]);
  const handR = grp(armR, [0, -1.3, 0.05]);
  const armL = grp(santa, [0.85, 1.85, 0.05]);
  add(armL, new THREE.CylinderGeometry(0.24, 0.22, 1.1, 12), suit, [0, -0.55, 0]);
  add(armL, new THREE.TorusGeometry(0.22, 0.09, 8, 14), fur, [0, -1.1, 0], [PI / 2, 0, 0]);
  const mitten = grp(armL, [0, -1.3, 0]);
  add(mitten, new THREE.SphereGeometry(0.21, 10, 8), black, [0, 0, 0], [0, 0, 0], [1, 1.15, 0.8]);
  add(mitten, new THREE.CapsuleGeometry(0.07, 0.15, 4, 8), black, [0.18, 0.08, 0.05], [0, 0, -0.9]);
  // head: rosy cheeks, round nose, gold spectacles, bushy white brows, a big fluffy beard and moustache
  const head = grp(santa, [0, 2.75, 0.05]);
  add(head, new THREE.SphereGeometry(0.58, 22, 18), skin);
  add(head, new THREE.SphereGeometry(0.15, 12, 10), std(0xf2a090, { roughness: 0.45 }), [0, -0.02, 0.58]);
  for (const sx of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.15, 10, 8), glow(0xff8a90, { transparent: true, opacity: 0.55 }), [sx * 0.32, -0.08, 0.44]);
    add(head, new THREE.SphereGeometry(0.075, 10, 8), glow(0x1a1210), [sx * 0.2, 0.12, 0.52]);
    add(head, new THREE.SphereGeometry(0.022, 6, 4), glow(0xffffff), [sx * 0.2 + 0.02, 0.15, 0.59]);
    add(head, new THREE.TorusGeometry(0.13, 0.018, 6, 18), gold, [sx * 0.2, 0.12, 0.57]);
    for (let k = 0; k < 3; k++) add(head, new THREE.SphereGeometry(0.07, 8, 6), fur, [sx * (0.12 + k * 0.08), 0.3 + k * 0.01, 0.5 - k * 0.03]);
  }
  add(head, new THREE.BoxGeometry(0.14, 0.02, 0.02), gold, [0, 0.13, 0.6]);
  const beardM = std(0xffffff, { roughness: 0.95, emissive: 0x6a6a6a, emissiveIntensity: 0.3 });
  const beard = grp(head, [0, -0.3, 0.3]);
  add(beard, new THREE.SphereGeometry(0.62, 18, 14), beardM, [0, -0.4, 0.1], [0, 0, 0], [1.05, 1.15, 0.6]);
  for (let k = 0; k < 9; k++) {
    const a = (k / 8) * PI - PI / 2;
    add(beard, new THREE.SphereGeometry(0.2, 10, 8), beardM, [Math.sin(a) * 0.55, -0.45 - Math.cos(a) * 0.55, 0.22]);
  }
  const tache = [-1, 1].map((sx) => add(head, new THREE.SphereGeometry(0.2, 12, 8), beardM, [sx * 0.2, -0.2, 0.55], [0, 0, sx * 0.35], [1.4, 0.65, 0.7]));
  const mouthMesh = add(head, new THREE.SphereGeometry(0.1, 10, 8), glow(0x6a0a14), [0, -0.33, 0.6], [0, 0, 0], [1.3, 0.5, 0.5]);
  // the floppy hat with fur band and pompom
  add(head, new THREE.TorusGeometry(0.55, 0.14, 10, 24), fur, [0, 0.38, -0.02], [PI / 2 - 0.15, 0, 0]);
  const hat = [];
  let hp = grp(head, [0, 0.45, -0.05], [-0.2, 0, 0]);
  for (let k = 0; k < 5; k++) {
    const r0 = 0.52 * (1 - k / 5) + 0.06, r1 = 0.52 * (1 - (k + 1) / 5) + 0.06;
    const j = grp(hp, k ? [0, 0.3, 0] : [0, 0, 0]);
    add(j, new THREE.CylinderGeometry(r1, r0, 0.32, 16), suit, [0, 0.15, 0]);
    hat.push(j);
    hp = j;
  }
  add(hp, new THREE.SphereGeometry(0.16, 12, 10), fur, [0, 0.36, 0]);
  // ---- four seahorses in two pairs, reins to Santa's hand
  const team = [
    seahorse(0xf2a23a, 0xffe2a0, 0xffd27a, true),
    seahorse(0xf2a23a, 0xffe2a0, 0xffd27a, true),
    seahorse(0xe2484a, 0xffc8b0, 0xff9ab0, false),
    seahorse(0x2ab8a8, 0xbaf8e8, 0x8affe8, false),
  ];
  const at = [[-1.4, 11.6], [1.4, 11.6], [-1.4, 6.9], [1.4, 6.9]];
  team.forEach((h, i) => {
    h.group.position.set(at[i][0], 0.3, at[i][1]);
    h.group.scale.setScalar(1.35);
    G.add(h.group);
    h.base = h.group.position.clone();
  });
  const reinM = new THREE.LineBasicMaterial({ color: 0xf2c24a });
  const reinGeo = new THREE.BufferGeometry();
  reinGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(team.length * 2 * 3 + 2 * 3), 3));
  const reins = new THREE.LineSegments(reinGeo, reinM);
  G.add(reins);
  // a trail of glittering snowflakes behind the sleigh
  const N = 140, sp = new Float32Array(N * 3), age = new Float32Array(N).fill(99);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: dot(), color: 0xfff6e0, size: 0.45, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  snow.frustumCulled = false;
  G.add(snow);
  let si = 0;
  const mouth = grp(head, [0, -0.35, 0.7]);
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  return {
    group: G,
    mouth,
    length: 17,
    anim(t, dt, talk) {
      sleigh.position.y = Math.sin(t * 1.2) * 0.2;
      sleigh.rotation.z = Math.sin(t * 0.9) * 0.04;
      sleigh.rotation.x = Math.sin(t * 1.2 + 1) * 0.025;
      team.forEach((h, i) => h.anim(t, i * 1.3));
      head.rotation.y = Math.sin(t * 0.6) * 0.2;
      head.rotation.z = Math.sin(t * 1.1) * 0.05;
      armL.rotation.z = 2.5 + Math.sin(t * 5) * 0.35;
      mitten.rotation.z = Math.sin(t * 8) * 0.3;
      armR.rotation.x = -0.9 + Math.sin(t * 1.6) * 0.08;
      hat.forEach((j, k) => (j.rotation.x = -0.12 - k * 0.07 + Math.sin(t * 2.2 - k * 0.5) * 0.06));
      mouthMesh.scale.y = talk ? 0.5 + 0.5 * Math.abs(Math.sin(t * 10)) : 0.3;
      tache.forEach((m) => (m.position.y = -0.2 + (talk ? Math.sin(t * 10) * 0.015 : 0)));
      lights.forEach((l, i) => l.material.color.setHSL((Math.floor(t * 2.5) * 0.17 + i * 0.27) % 1, 1, Math.sin(t * 6 + i) > -0.3 ? 0.62 : 0.15));
      // reins from every harness to Santa's hand
      G.updateMatrixWorld(true);
      const inv = G.matrixWorld.clone().invert();
      handR.getWorldPosition(v2).applyMatrix4(inv);
      const a = reinGeo.attributes.position.array;
      team.forEach((h, i) => {
        h.rein.getWorldPosition(v1).applyMatrix4(inv);
        a.set([v1.x, v1.y, v1.z, v2.x, v2.y, v2.z], i * 6);
      });
      reinGeo.attributes.position.needsUpdate = true;
      // snowflake trail
      for (let k = 0; k < 2; k++) {
        sp.set([(Math.random() - 0.5) * 2.4, 1 + Math.random() * 2.5, -4.6 - Math.random()], si * 3);
        age[si] = 0;
        si = (si + 1) % N;
      }
      for (let i = 0; i < N; i++) {
        age[i] += dt;
        sp[i * 3 + 2] -= dt * 5;
        sp[i * 3 + 1] += Math.sin(t * 2 + i) * dt * 0.3;
        if (age[i] > 4) sp[i * 3 + 1] = 9999;
      }
      sg.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- your own sub, dressed up for Christmas
// the biggest solid part (= the hull), measured in the sub's own frame – arm, light beam, glows and glass left out
function mainPart(group, under = group) {
  const ud = group.userData, inv = group.matrixWorld.clone().invert();
  let best = null, bestV = 0;
  under.traverse((o) => {
    if (!o.isMesh) return;
    for (let q = o; q && q !== group; q = q.parent) if (q === ud.beam || (ud.arm && q === ud.arm.root) || q.isSprite) return;
    const m = o.material;
    if (m && !Array.isArray(m) && (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.6))) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const sz = b.getSize(new THREE.Vector3()), v = sz.x * sz.y * sz.z;
    if (v > bestV) {
      bestV = v;
      best = b;
    }
  });
  return best || new THREE.Box3(new THREE.Vector3(-0.8, -0.6, -2), new THREE.Vector3(0.8, 0.6, 2));
}

export function decorateSub(group) {
  const ud = group.userData;
  group.updateMatrixWorld(true);
  const deco = new THREE.Group();
  deco.name = 'xmas';
  group.add(deco);
  const red = shiny(0xd0182a, 0.55), fur = std(0xffffff, { roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.45 });
  const cols = [0xff3040, 0x40ff60, 0xffd040, 0x40a0ff, 0xff60ff];
  const bulbs = [];
  const makeHat = (hs) => {
    const h = new THREE.Group();
    const tip = grp(h, [0, 0, 0], [0, 0, 0.25]);
    add(tip, new THREE.ConeGeometry(hs, hs * 2.2, 18), red, [0, hs * 1.1, 0]);
    add(tip, new THREE.SphereGeometry(hs * 0.32, 12, 10), fur, [0, hs * 2.2, 0]);
    add(h, new THREE.TorusGeometry(hs, hs * 0.3, 10, 22), fur, [0, 0, 0], [PI / 2, 0, 0]);
    h.userData.tip = tip;
    return h;
  };
  // a ring of fir with blinking lights
  const garland = (c, rx, ry, rot, nb, bulbR) => {
    const w = grp(deco, [c.x, c.y, c.z], rot);
    add(w, new THREE.TorusGeometry(1, 0.07 / Math.min(rx, ry), 6, 48), shiny(0x1a7a3a, 0.35), [0, 0, 0], [0, 0, 0], [rx, ry, 1]);
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * TAU;
      bulbs.push(add(w, new THREE.SphereGeometry(bulbR, 8, 6), glow(cols[i % cols.length]), [Math.cos(a) * (rx + bulbR * 0.6), Math.sin(a) * (ry + bulbR * 0.6), 0]));
    }
  };
  let hat;
  if (ud.type === 'isabella' && ud.mer && ud.mer.head) {
    // Isabella: the hat on her head (it moves with her), a wreath of lights around the cockpit dome
    const hb = mainPart(group, ud.mer.head), hc = hb.getCenter(new THREE.Vector3()), hz = hb.getSize(new THREE.Vector3());
    const hs = Math.max(hz.x, hz.z) * 0.42;
    hat = makeHat(hs);
    hat.position.set(hc.x, hb.max.y - hs * 0.15, hc.z + hz.z * 0.08);
    hat.rotation.set(0.35, 0, 0);
    deco.add(hat);
    ud.mer.head.attach(hat);
    garland(new THREE.Vector3(0, 0.4, -1.47), 0.36, 0.44, [PI / 2, 0, 0], 12, 0.06);
  } else {
    const hull = mainPart(group), size = hull.getSize(new THREE.Vector3()), c = hull.getCenter(new THREE.Vector3());
    const hs = Math.min(0.85, Math.max(0.32, Math.min(size.x, size.y) * 0.3));
    hat = makeHat(hs);
    hat.position.set(c.x, hull.max.y - hs * 0.2, c.z - size.z * 0.18);
    hat.rotation.set(-0.2, 0, 0);
    deco.add(hat);
    // tied around the hull like a ribbon around a present
    garland(new THREE.Vector3(c.x, c.y, c.z + size.z * 0.12), size.x / 2 + 0.04, size.y / 2 + 0.04, [0, 0, 0], 14, 0.1);
    // a little candy cane on the side
    const cane = grp(deco, [c.x + size.x * 0.5, c.y + size.y * 0.15, c.z + size.z * 0.3], [0, 0, -0.3]);
    add(cane, candy(new THREE.CylinderGeometry(0.06, 0.06, size.y * 0.7, 8, 10)), candyM());
    add(cane, new THREE.TorusGeometry(0.14, 0.06, 6, 12, PI), shiny(0xd8101a, 0.55), [0.14, size.y * 0.35, 0]);
  }
  return {
    group: deco,
    update(t) {
      bulbs.forEach((b, i) => b.material.color.setHex(cols[(i + Math.floor(t * 3)) % cols.length]).multiplyScalar(Math.sin(t * 7 + i * 1.7) > -0.2 ? 1 : 0.25));
      hat.userData.tip.rotation.z = 0.25 + Math.sin(t * 2) * 0.08;
    },
  };
}
