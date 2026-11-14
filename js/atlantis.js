// Atlantis – a secret fantasy city that rises from the seafloor once every mission of a dive is done.
// The layout follows Plato's description (Timaeus, Critias): a central island with Poseidon's temple, rings of
// land and water around it, an outer wall clad in copper, a middle one in tin and the innermost shining with
// orichalcum, hot and cold springs, bridges over the rings. On top: a colourful, futuristic underwater city –
// glass domes, a spiral tower, crystal spires, coral towers, floating light rings, glowing jellyfish lanterns.
// Neptune (Poseidon's Roman name) and a mermaid live here. They never appear anywhere else (kept secret).

import * as THREE from './vendor/three.min.js';
import { PartBuilder } from './parts.js';
import { axisZ } from './world.js';
import { buildMerFigure, animMer, MER_PALETTES, buildNeptune, animNeptune, softDot } from './merfolk.js';

const R = 72; // radius of the city (units, 1 unit = 10 m)
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15, ...o });
const glow = (color, k = 0.9, o = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.25, metalness: 0.1, ...o });
const COLS = { cyan: 0x2fe6ff, magenta: 0xff4fd8, violet: 0x9b5cff, gold: 0xffcf4a, coral: 0xff7a6a, mint: 0x6affc8, pearl: 0xf4f0ff, rose: 0xff9ec8 };

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

// glowing water ring with a moving shimmer
function waterRing(r0, r1, color, uni) {
  const geo = new THREE.RingGeometry(r0, r1, 96, 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: uni.uT, uC: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uT; uniform vec3 uC; varying vec3 vP; void main(){ float r = length(vP.xz); float a = atan(vP.z, vP.x); float w = 0.55 + 0.25*sin(r*1.7 - uT*2.0) + 0.2*sin(a*12.0 + uT*1.3 + r*0.4); gl_FragColor = vec4(uC * (0.55 + 0.6*w), 0.82); }',
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  return new THREE.Mesh(geo, mat);
}

export class Atlantis {
  constructor(scene, world, center, seed = 1) {
    this.scene = scene;
    this.world = world;
    // the platform lies on the highest ground under it (nothing pokes through), the skirt covers the slope below
    let top = world.heightAt(center.x, center.z);
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      for (const f of [0.45, 0.8, 1.0]) top = Math.max(top, world.heightAt(center.x + Math.cos(a) * R * f, center.z + Math.sin(a) * R * f));
    }
    const y0 = top + 1.5;
    this.center = new THREE.Vector3(center.x, y0, center.z);
    this.group = new THREE.Group();
    this.group.position.copy(this.center);
    scene.add(this.group);
    this.uni = { uT: { value: 0 } };
    this.spin = []; // [object, speed]
    this.bob = []; // [object, baseY, amp, speed, phase]
    this.r = rng(seed);
    this.build();
    this.buildPeople();
    this.rise = 0; // the city rises from the floor at the start
    this.group.scale.set(1, 0.02, 1);
  }

  build() {
    const G = this.group, r = this.r;
    const B = new PartBuilder();
    const M = {
      marble: std(0xf2eefc, { roughness: 0.55, emissive: 0x2a2440, emissiveIntensity: 0.35 }),
      stone: std(0x6a6488, { roughness: 0.8, emissive: 0x1a1430, emissiveIntensity: 0.3 }),
      copper: std(0xd9844a, { metalness: 0.8, roughness: 0.32, emissive: 0x6a2a08, emissiveIntensity: 0.4 }),
      tin: std(0xd8e2ee, { metalness: 0.85, roughness: 0.25, emissive: 0x303a48, emissiveIntensity: 0.4 }),
      orichalcum: glow(0xff7a2a, 0.75, { metalness: 0.7, roughness: 0.3 }),
      silver: std(0xe8eef8, { metalness: 0.9, roughness: 0.18, emissive: 0x3a4250, emissiveIntensity: 0.45 }),
      gold: std(COLS.gold, { metalness: 0.9, roughness: 0.22, emissive: 0xa86a00, emissiveIntensity: 0.5 }),
      cyan: glow(COLS.cyan, 1.1, { fog: false }),
      magenta: glow(COLS.magenta, 1.0, { fog: false }),
      violet: glow(COLS.violet, 1.0, { fog: false }),
      mint: glow(COLS.mint, 0.9, { fog: false }),
      coral: std(COLS.coral, { emissive: COLS.coral, emissiveIntensity: 0.45 }),
      rose: std(COLS.rose, { emissive: COLS.rose, emissiveIntensity: 0.4 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xbfe8ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.28, depthWrite: false, emissive: 0x2a6aa0, emissiveIntensity: 0.4 }),
    };
    this.M = M;
    // ---- platform and a skirt down the slope ----
    B.add(M.marble, new THREE.CylinderGeometry(R, R + 4, 3, 72), { p: [0, -1.5, 0] });
    B.add(M.stone, new THREE.CylinderGeometry(R + 4, R + 22, 160, 72, 1, true), { p: [0, -83, 0] });
    // ---- rings of water and land (Plato: two of land, three of water) ----
    for (const [r0, r1, c, y] of [[14, 20, COLS.cyan, 1.3], [38, 44, COLS.violet, 1.3], [64, 70, COLS.gold, 0.4]]) {
      const w = waterRing(r0, r1, c, this.uni);
      w.position.y = y;
      G.add(w);
    }
    B.add(M.marble, new THREE.CylinderGeometry(20 + 18, 20 + 18, 1.2, 72, 1, false), { p: [0, 0.6, 0] }); // land ring 1 (centre gets cut by the water ring drawn above)
    // walls: copper outside, tin in the middle, orichalcum around the island
    B.add(M.copper, new THREE.CylinderGeometry(70.6, 70.6, 5, 96, 1, true), { p: [0, 2.5, 0] });
    B.add(M.tin, new THREE.CylinderGeometry(44.4, 44.4, 3.6, 80, 1, true), { p: [0, 1.8, 0] });
    B.add(M.orichalcum, new THREE.CylinderGeometry(14.3, 14.3, 3, 64, 1, true), { p: [0, 1.5, 0] });
    for (const [rr, mat, h] of [[70.6, M.copper, 5], [44.4, M.tin, 3.6], [14.3, M.orichalcum, 3]]) {
      B.add(M.gold, new THREE.TorusGeometry(rr, 0.35, 6, 96), { p: [0, h, 0], r: [Math.PI / 2, 0, 0] });
      const n = Math.round(rr / 3.2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        B.add(mat, new THREE.CylinderGeometry(0.9, 1.1, h + 2.5, 8), { p: [Math.cos(a) * rr, (h + 2.5) / 2, Math.sin(a) * rr] });
        B.add(M.gold, new THREE.ConeGeometry(1.0, 1.8, 8), { p: [Math.cos(a) * rr, h + 3.4, Math.sin(a) * rr] });
      }
    }
    // central island (raised) with steps
    B.add(M.marble, new THREE.CylinderGeometry(14, 14.5, 2.4, 64), { p: [0, 1.2, 0] });
    for (let k = 0; k < 3; k++) B.add(M.marble, new THREE.CylinderGeometry(11 - k * 1.6, 11.6 - k * 1.6, 0.8, 48), { p: [0, 2.8 + k * 0.8, 0] });
    // ---- bridges over the rings in four directions, with lanterns ----
    for (let q = 0; q < 4; q++) {
      const a = (q / 4) * Math.PI * 2 + Math.PI / 4;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (const [r0, r1] of [[13, 21], [37, 45], [63, 71]]) {
        const mid = (r0 + r1) / 2, len = r1 - r0;
        B.add(M.marble, new THREE.BoxGeometry(len, 0.6, 4), { p: [ca * mid, 1.4, sa * mid], r: [0, -a, 0] });
        B.add(M.gold, new THREE.TorusGeometry(len / 2, 0.25, 6, 24, Math.PI), { p: [ca * mid + -sa * 2.2, 1.4, sa * mid + ca * 2.2], r: [0, -a, 0] });
        B.add(M.gold, new THREE.TorusGeometry(len / 2, 0.25, 6, 24, Math.PI), { p: [ca * mid + sa * 2.2, 1.4, sa * mid - ca * 2.2], r: [0, -a, 0] });
        for (const e of [r0 + 0.5, r1 - 0.5]) for (const side of [-1, 1]) {
          B.add(M.gold, new THREE.CylinderGeometry(0.15, 0.2, 3, 6), { p: [ca * e - sa * 2.4 * side, 3, sa * e + ca * 2.4 * side] });
          B.add(M.cyan, new THREE.SphereGeometry(0.5, 10, 8), { p: [ca * e - sa * 2.4 * side, 4.8, sa * e + ca * 2.4 * side] });
        }
      }
    }
    // ---- the temple of Poseidon: silver colonnade, golden dome, a crystal spire with light rings ----
    const TY = 5.2;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      B.add(M.silver, new THREE.CylinderGeometry(0.55, 0.65, 9, 12), { p: [Math.cos(a) * 7.5, TY + 4.5, Math.sin(a) * 7.5] });
      B.add(M.gold, new THREE.BoxGeometry(1.6, 0.6, 1.6), { p: [Math.cos(a) * 7.5, TY + 9.2, Math.sin(a) * 7.5], r: [0, -a, 0] });
    }
    B.add(M.gold, new THREE.CylinderGeometry(8.6, 8.6, 1.4, 48), { p: [0, TY + 10, 0] });
    B.add(M.silver, new THREE.CylinderGeometry(5.5, 5.5, 8, 32), { p: [0, TY + 4, 0] });
    B.add(M.gold, new THREE.SphereGeometry(8.2, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), { p: [0, TY + 10.6, 0] });
    for (let i = 0; i < 12; i++) B.add(M.silver, new THREE.TorusGeometry(8.25, 0.18, 6, 24, Math.PI / 2), { p: [0, TY + 10.6, 0], r: [0, (i / 12) * Math.PI * 2, Math.PI / 2] });
    B.add(M.orichalcum, new THREE.CylinderGeometry(0.8, 1.2, 3, 12), { p: [0, TY + 19.5, 0] });
    const spire = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), M.cyan);
    spire.scale.set(1, 3.2, 1);
    spire.position.set(0, TY + 27, 0);
    G.add(spire);
    this.spin.push([spire, 0.5]);
    for (let k = 0; k < 3; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5 + k * 2, 0.22, 8, 64), [M.magenta, M.gold, M.cyan][k]);
      ring.position.set(0, TY + 26, 0);
      ring.rotation.set(Math.PI / 2 + k * 0.5, k * 0.8, 0);
      G.add(ring);
      this.spin.push([ring, 0.35 + k * 0.2, 'xy']);
    }
    // light beam from the spire (seen from far away)
    const beamGeo = new THREE.CylinderGeometry(1.2, 2.4, 220, 20, 1, true);
    beamGeo.translate(0, 110, 0);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { uT: this.uni.uT },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uT; varying vec2 vUv; void main(){ float up = 1.0 - vUv.y; vec3 c = mix(vec3(1.0,0.35,0.85), vec3(0.2,0.95,1.0), 0.5+0.5*sin(vUv.y*10.0 - uT*2.0)); gl_FragColor = vec4(c, 0.45 * pow(up, 2.0)); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const beam = new THREE.Mesh(beamGeo, this.beamMat);
    beam.position.y = TY + 30;
    beam.frustumCulled = false;
    G.add(beam);

    // ---- buildings on the two land rings ----
    const kinds = ['spiral', 'dome', 'crystal', 'coral', 'pagoda', 'dome', 'crystal', 'coral'];
    const place = (n, rMin, rMax, off) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + off;
        // keep the bridges free
        const q = ((a - Math.PI / 4) / (Math.PI / 2)) % 1;
        if (Math.min(Math.abs(q), Math.abs(1 - q)) < 0.09) continue;
        const rr = rMin + r() * (rMax - rMin);
        this.building(B, kinds[(i + Math.floor(off * 10)) % kinds.length], Math.cos(a) * rr, Math.sin(a) * rr, 0.8 + r() * 0.5);
      }
    };
    place(12, 25, 33, 0.12);
    place(18, 49, 59, 0.3);
    // hot and cold springs (Plato) as fountains of bubbles
    this.springs = [];
    for (const [a, col] of [[Math.PI * 0.12, 0xff8a3a], [Math.PI * 1.12, 0x5ad0ff]]) this.spring(Math.cos(a) * 29, Math.sin(a) * 29, col);
    // glowing kelp gardens on the outer ring
    this.kelp = [];
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, rr = 46 + r() * 16;
      const k = new THREE.Group();
      k.position.set(Math.cos(a) * rr, 0.6, Math.sin(a) * rr);
      const h = 6 + r() * 8;
      const mat = [M.mint, M.cyan, M.magenta][i % 3];
      let parent = k;
      for (let s = 0; s < 4; s++) {
        const sg = new THREE.Group();
        if (s) sg.position.y = h / 4;
        sg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h / 4, 6).translate(0, h / 8, 0), mat));
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat);
        bud.position.set(0.3, h / 6, 0);
        sg.add(bud);
        parent.add(sg);
        parent = sg;
        this.kelp.push([sg, r() * 6, s]);
      }
      G.add(k);
    }
    // jellyfish lanterns drifting over the city
    this.lanterns = [];
    const bellGeo = new THREE.SphereGeometry(1.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const col = [COLS.magenta, COLS.cyan, COLS.violet, COLS.mint, COLS.gold][i % 5];
      const l = new THREE.Group();
      const bell = new THREE.Mesh(bellGeo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, transparent: true, opacity: 0.75, fog: false, side: THREE.DoubleSide }));
      l.add(bell);
      const tm = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7, fog: false });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const pts = [];
        for (let s = 0; s <= 6; s++) pts.push(new THREE.Vector3(Math.cos(a) * 0.8 + Math.sin(s * 1.3 + k) * 0.25, -s * 0.55, Math.sin(a) * 0.8));
        l.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), tm));
      }
      const a = r() * Math.PI * 2, rr = 10 + r() * 55;
      l.position.set(Math.cos(a) * rr, 14 + r() * 18, Math.sin(a) * rr);
      l.scale.setScalar(0.8 + r() * 1.2);
      G.add(l);
      this.lanterns.push({ l, bell, a, rr, y: l.position.y, ph: r() * 10, sp: 0.04 + r() * 0.05 });
    }
    // glitter swirling above the city
    const N = 400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = 2 + r() * 40;
      pos[i * 3 + 2] = Math.sin(a) * rr;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.glitter = new THREE.Points(pg, new THREE.PointsMaterial({ map: softDot(), color: 0xfff0ff, size: 0.9, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    G.add(this.glitter);
    B.build(G);
    // lights: bright and colourful down here in the dark
    const L1 = new THREE.PointLight(0xfff4ff, 70, 190, 1);
    L1.position.set(0, 40, 0);
    const L2 = new THREE.PointLight(COLS.magenta, 35, 110, 1);
    L2.position.set(40, 16, 10);
    const L3 = new THREE.PointLight(COLS.cyan, 35, 110, 1);
    L3.position.set(-38, 16, -14);
    G.add(L1, L2, L3);
    this.lights = [L2, L3];
  }

  // one futuristic building (into the merged parts B, moving pieces as own meshes)
  building(B, kind, x, z, s) {
    const M = this.M, G = this.group, r = this.r;
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    if (kind === 'spiral') {
      // slim tower with a glowing helix ramp around it (a nod to modern "ocean spiral" city concepts)
      const h = 22 * s;
      B.add(M.pearl || M.marble, new THREE.CylinderGeometry(1.4 * s, 2.2 * s, h, 16), { p: [x, h / 2, z] });
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const a = i * 0.21;
        pts.push(new THREE.Vector3(x + Math.cos(a) * 3.2 * s, (i / 120) * h, z + Math.sin(a) * 3.2 * s));
      }
      B.add(pick([M.cyan, M.magenta, M.mint]), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.35 * s, 6, false));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.4 * s, 20, 14), pick([M.magenta, M.cyan, M.violet]));
      bulb.position.set(x, h + 2 * s, z);
      G.add(bulb);
      this.bob.push([bulb, bulb.position.y, 0.6, 1.2, r() * 6]);
    } else if (kind === 'dome') {
      // glass bubble habitat with a glowing garden inside
      const rr = (4.5 + r() * 2) * s;
      B.add(M.marble, new THREE.CylinderGeometry(rr * 1.05, rr * 1.12, 1, 24), { p: [x, 0.9, z] });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(rr, 26, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.glass);
      dome.position.set(x, 1.3, z);
      dome.renderOrder = 3;
      G.add(dome);
      for (let k = 0; k < 6; k++) {
        const a = r() * Math.PI * 2, d = r() * rr * 0.6;
        B.add(pick([M.coral, M.rose, M.mint, M.magenta]), new THREE.SphereGeometry((0.6 + r() * 0.9) * s, 10, 8), { p: [x + Math.cos(a) * d, 2 + r() * rr * 0.4, z + Math.sin(a) * d] });
      }
      B.add(M.gold, new THREE.TorusGeometry(rr, 0.18, 6, 32), { p: [x, 1.35, z], r: [Math.PI / 2, 0, 0] });
      B.add(M.gold, new THREE.ConeGeometry(0.4, 2.5, 8), { p: [x, 1.3 + rr + 1, z] });
    } else if (kind === 'crystal') {
      // stacked, slowly turning crystals
      const mat = pick([M.magenta, M.cyan, M.violet]);
      B.add(M.silver, new THREE.CylinderGeometry(2.2 * s, 2.8 * s, 2, 8), { p: [x, 1.6, z] });
      let y = 3;
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry((2.4 - k * 0.5) * s, 0), mat);
        c.scale.set(1, 2.1, 1);
        y += (2.6 - k * 0.4) * 2.2 * s;
        c.position.set(x, y - 2.6 * s, z);
        G.add(c);
        this.spin.push([c, (k % 2 ? -1 : 1) * (0.3 + r() * 0.3)]);
      }
    } else if (kind === 'coral') {
      // organic tower of stacked rings, like a coral
      let y = 1.2;
      const mats = [M.coral, M.rose, M.gold, M.magenta];
      for (let k = 0; k < 7; k++) {
        const rr = (3.2 - k * 0.32) * s;
        B.add(mats[k % mats.length], new THREE.TorusGeometry(rr, 0.9 * s, 10, 24), { p: [x, y, z], r: [Math.PI / 2, 0, 0] });
        y += 2.0 * s;
      }
      B.add(M.coral, new THREE.CylinderGeometry(1.2 * s, 2.2 * s, y, 12), { p: [x, y / 2, z] });
      B.add(M.mint, new THREE.SphereGeometry(1.4 * s, 12, 10), { p: [x, y + 0.8, z] });
    } else if (kind === 'pagoda') {
      // central column with floating rings that hover and turn
      const h = 18 * s;
      B.add(M.silver, new THREE.CylinderGeometry(1.0 * s, 1.6 * s, h, 12), { p: [x, h / 2, z] });
      for (let k = 0; k < 4; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry((4.5 - k * 0.8) * s, 0.4 * s, 8, 40), [M.cyan, M.gold, M.magenta, M.violet][k]);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 4 + k * 4 * s, z);
        G.add(ring);
        this.bob.push([ring, ring.position.y, 0.5, 0.9 + k * 0.2, k]);
        this.spin.push([ring, 0.4 + k * 0.1, 'z']);
      }
      B.add(M.gold, new THREE.ConeGeometry(1.4 * s, 4 * s, 10), { p: [x, h + 2 * s, z] });
    }
  }

  spring(x, z, col) {
    const N = 90;
    const pos = new Float32Array(N * 3), speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = x + (Math.random() - 0.5) * 1.6;
      pos[i * 3 + 1] = Math.random() * 16;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 1.6;
      speed[i] = 3 + Math.random() * 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: softDot(), color: col, size: 1.0, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.group.add(pts);
    const basin = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.5, 8, 24), glow(col, 0.8, { fog: false }));
    basin.rotation.x = Math.PI / 2;
    basin.position.set(x, 1.6, z);
    this.group.add(basin);
    this.springs.push({ pts, speed, x, z });
  }

  buildPeople() {
    // Neptune in front of his temple
    const nep = buildNeptune();
    nep.group.scale.setScalar(3.2);
    nep.group.position.set(0, 9, -17);
    this.group.add(nep.group);
    this.neptune = nep;
    // the mermaid of Atlantis swims her rounds around the temple
    const mer = buildMerFigure(MER_PALETTES.atlantis);
    mer.group.scale.setScalar(1.8);
    this.group.add(mer.group);
    this.mermaid = mer;
    this.merA = 0;
    this.merRoll = 0;
  }

  // keep the sub above the city floor (the platform is solid)
  clampSub(sub) {
    const dx = sub.pos.x - this.center.x, dz = sub.pos.z - this.center.z;
    const d = Math.hypot(dx, dz);
    if (d < R + 2) {
      const top = this.center.y + (d < 14.5 ? 5.5 : 1.2) * this.group.scale.y + 1.2;
      if (sub.pos.y < top) {
        sub.pos.y = top;
        if (sub.vel.y < 0) sub.vel.y = 0;
      }
    }
  }

  // returns 'neptune' / 'mermaid' when the sub comes close to one of them for the first time
  update(dt, t, sub) {
    this.uni.uT.value = t;
    if (this.rise < 1) {
      this.rise = Math.min(1, this.rise + dt / 3.5);
      const k = this.rise * this.rise * (3 - 2 * this.rise);
      this.group.scale.set(1, 0.02 + 0.98 * k, 1);
    }
    for (const [o, sp, ax] of this.spin) {
      if (ax === 'xy') {
        o.rotation.x += dt * sp * 0.5;
        o.rotation.y += dt * sp;
      } else if (ax === 'z') o.rotation.z += dt * sp;
      else o.rotation.y += dt * sp;
    }
    for (const [o, y, amp, sp, ph] of this.bob) o.position.y = y + Math.sin(t * sp + ph) * amp;
    for (const [sg, ph, s] of this.kelp) {
      sg.rotation.z = Math.sin(t * 0.9 + ph + s * 0.5) * 0.12;
      sg.rotation.x = Math.cos(t * 0.7 + ph + s * 0.4) * 0.08;
    }
    for (const L of this.lanterns) {
      L.a += dt * L.sp;
      L.l.position.set(Math.cos(L.a) * L.rr, L.y + Math.sin(t * 0.6 + L.ph) * 2.5, Math.sin(L.a) * L.rr);
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + L.ph);
      L.bell.scale.set(1 + pulse * 0.12, 1 - pulse * 0.15, 1 + pulse * 0.12);
      L.bell.material.emissiveIntensity = 0.6 + pulse * 0.6;
    }
    for (const S of this.springs) {
      const p = S.pts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.array[i * 3 + 1] + dt * S.speed[i];
        if (y > 18) {
          y = 1.5;
          p.array[i * 3] = S.x + (Math.random() - 0.5) * 1.6;
          p.array[i * 3 + 2] = S.z + (Math.random() - 0.5) * 1.6;
        }
        p.array[i * 3 + 1] = y;
        p.array[i * 3] += Math.sin(t * 3 + i) * dt * 0.4;
      }
      p.needsUpdate = true;
    }
    this.glitter.rotation.y += dt * 0.03;
    this.lights.forEach((L, i) => (L.intensity = 30 + 10 * Math.sin(t * 1.3 + i * 2)));
    // people
    const local = this.group.worldToLocal(sub.pos.clone());
    const nepP = this.neptune.group.position;
    const toSubN = local.clone().sub(nepP);
    const dN = toSubN.length();
    this.neptune.group.rotation.y += (Math.atan2(-toSubN.x, -toSubN.z) - this.neptune.group.rotation.y) * Math.min(1, dt * 0.6);
    this.neptune.group.position.y = 9 + Math.sin(t * 0.8) * 0.6;
    const cyc = t % 12;
    const bless = cyc > 8 ? Math.sin(((cyc - 8) / 4) * Math.PI) : 0;
    animNeptune(this.neptune.rig, t, dt, { look: 0, near: dN < 45, bless });
    // mermaid: rounds around the temple, a barrel roll now and then, waves when you are near
    this.merA += dt * 0.19;
    const mr = 30 + Math.sin(t * 0.3) * 4;
    const mp = new THREE.Vector3(Math.cos(this.merA) * mr, 13 + Math.sin(t * 0.7) * 4, Math.sin(this.merA) * mr);
    const prev = this.mermaid.group.position.clone();
    this.mermaid.group.position.copy(mp);
    const vel = mp.clone().sub(prev);
    if (vel.lengthSq() > 1e-6) {
      const yaw = Math.atan2(-vel.x, -vel.z);
      this.mermaid.group.rotation.order = 'YXZ';
      this.mermaid.group.rotation.y = yaw;
      this.mermaid.group.rotation.x = Math.atan2(vel.y, Math.hypot(vel.x, vel.z)) * 0.8;
    }
    const rollCyc = t % 14;
    this.mermaid.group.rotation.z = rollCyc > 12 ? ((rollCyc - 12) / 2) * Math.PI * 2 : Math.sin(t * 0.5) * 0.15;
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
    this.scene.remove(this.group);
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
