// Team challenges (co-op dives only): ten tasks that only two divers can do together. Every challenge has two
// glowing handles (✋). When one sub is at each handle at the same time, the task is done after a moment – e.g.
// two subs pull a fishing net apart and the dolphin inside swims free. Very simple on purpose: just swim into the
// glowing ring and stay there. Positions come from the dive seed, so everybody in the room sees the same ones.

import * as THREE from './vendor/three.min.js';
import { axisZ, DEEP_X, SHIP_X } from './world.js';
import { mulberry32 } from './util.js';
import { buildModel, animUpper } from './creatures.js';
import { lootMesh } from './atlantis.js';
import { softDot } from './merfolk.js';

const PI = Math.PI, TAU = Math.PI * 2;
const HOLD = 1.6; // seconds both handles must be held
const RADIUS = 6; // how close a sub must be to a handle (world units = 60 m)

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.1, ...o });
function add(parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  m.rotation.set(...r);
  if (Array.isArray(s)) m.scale.set(...s);
  else m.scale.setScalar(s);
  parent.add(m);
  return m;
}
function model(name, len) {
  const o = buildModel(name);
  const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3());
  o.scale.multiplyScalar(len / Math.max(size.x, size.y, size.z, 0.01));
  return o;
}
// a net (a dome of rope lines) over something
function netDome(r, h, color = 0xd8c8a0) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    for (let k = 0; k < 8; k++) {
      const f0 = k / 8, f1 = (k + 1) / 8;
      const p0 = [Math.cos(a) * r * Math.sin(f0 * PI * 0.5 + PI * 0.5), h * Math.cos(f0 * PI * 0.5 + PI * 0.5) * -1, Math.sin(a) * r * Math.sin(f0 * PI * 0.5 + PI * 0.5)];
      const p1 = [Math.cos(a) * r * Math.sin(f1 * PI * 0.5 + PI * 0.5), h * Math.cos(f1 * PI * 0.5 + PI * 0.5) * -1, Math.sin(a) * r * Math.sin(f1 * PI * 0.5 + PI * 0.5)];
      pts.push(...p0, ...p1);
    }
  }
  for (let k = 1; k < 8; k++) {
    const f = k / 8, rr = r * Math.sin(f * PI * 0.5 + PI * 0.5), y = -h * Math.cos(f * PI * 0.5 + PI * 0.5);
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * TAU, a1 = ((i + 1) / 24) * TAU;
      pts.push(Math.cos(a0) * rr, y, Math.sin(a0) * rr, Math.cos(a1) * rr, y, Math.sin(a1) * rr);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
}

// ---------------------------------------------------------------- the ten challenges
// build() returns { group, handles: [Vector3 (local), Vector3], anim(k, t, dt) } – k: 0 → 1 after success
export const CHALLENGES = [
  {
    id: 'net',
    name: { en: 'Free the dolphin from the fishing net', de: 'Befreit den Delfin aus dem Fischernetz' },
    done: { en: 'The dolphin is free – it jumps for joy!', de: 'Der Delfin ist frei – er springt vor Freude!' },
    build() {
      const g = new THREE.Group();
      const d = model('dolphin', 5.5);
      d.position.set(0, 1.6, 0);
      g.add(d);
      const halves = [-1, 1].map((sx) => {
        const n = netDome(4.2, 4.5);
        n.scale.set(0.55, 1, 1);
        n.position.set(sx * 1.9, 0, 0);
        g.add(n);
        return n;
      });
      return {
        group: g,
        handles: [new THREE.Vector3(-8, 3, 0), new THREE.Vector3(8, 3, 0)],
        anim(k, t) {
          animUpper(d, 'dolphin', t * (k > 0 ? 2 : 0.6));
          halves.forEach((n, i) => {
            n.position.x = (i ? 1 : -1) * (1.9 + k * 7);
            n.material.opacity = 1 - k;
          });
          if (k > 0) {
            d.position.set(Math.sin(k * PI) * 3, 1.6 + k * 30 + Math.sin(k * 10) * 2, -k * 20);
            d.rotation.x = -0.6 + Math.sin(k * 12) * 0.4;
          }
        },
      };
    },
  },
  {
    id: 'turtle',
    name: { en: 'Untangle the sea turtle from the ghost net', de: 'Wickelt die Meeresschildkröte aus dem Geisternetz' },
    done: { en: 'The turtle swims off – thank you!', de: 'Die Schildkröte schwimmt davon – danke!' },
    build() {
      const g = new THREE.Group();
      const tu = model('turtle', 4.5);
      tu.position.set(0, 1.4, 0);
      g.add(tu);
      const ropes = [];
      for (let i = 0; i < 9; i++) {
        const r = add(g, new THREE.TorusGeometry(2.2 + (i % 3) * 0.3, 0.06, 4, 24), std(0x6a8a5a), [0, 1.4, 0], [i * 0.7, i * 1.3, i * 0.4]);
        ropes.push(r);
      }
      return {
        group: g,
        handles: [new THREE.Vector3(0, 3, 8), new THREE.Vector3(0, 3, -8)],
        anim(k, t) {
          animUpper(tu, 'turtle', t);
          ropes.forEach((r, i) => {
            r.scale.setScalar(1 + k * 3);
            r.material.transparent = true;
            r.material.opacity = 1 - k;
          });
          if (k > 0) tu.position.set(k * 25, 1.4 + k * 12, Math.sin(k * 6) * 2);
        },
      };
    },
  },
  {
    id: 'clam',
    name: { en: 'Open the giant clam together', de: 'Öffnet gemeinsam die Riesenmuschel' },
    done: { en: 'A shining pearl! The clam says thank you.', de: 'Eine leuchtende Perle! Die Muschel sagt danke.' },
    build() {
      const g = new THREE.Group();
      const shellM = std(0xd8b8e8, { roughness: 0.4, emissive: 0x3a2a4a, emissiveIntensity: 0.3, side: THREE.DoubleSide });
      const bottom = add(g, new THREE.SphereGeometry(4, 24, 12, 0, TAU, PI / 2, PI / 2), shellM, [0, 1.2, 0], [0, 0, 0], [1.3, 0.55, 1]);
      const lid = new THREE.Group();
      lid.position.set(0, 1.2, -4);
      add(lid, new THREE.SphereGeometry(4, 24, 12, 0, TAU, 0, PI / 2), shellM, [0, 0, 4], [0, 0, 0], [1.3, 0.55, 1]);
      g.add(lid);
      const pearl = add(g, new THREE.SphereGeometry(0.9, 20, 14), new THREE.MeshStandardMaterial({ color: 0xfff6fa, emissive: 0xffd8f0, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.3 }), [0, 1.4, 0]);
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xffe8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      h.scale.setScalar(6);
      pearl.add(h);
      return {
        group: g,
        handles: [new THREE.Vector3(-7.5, 3.5, 0), new THREE.Vector3(7.5, 3.5, 0)],
        anim(k, t) {
          lid.rotation.x = -k * 1.1 - Math.sin(t * 1.2) * 0.02;
          h.material.opacity = k;
          pearl.position.y = 1.4 + k * 3 + Math.sin(t * 2) * 0.2 * k;
        },
      };
    },
  },
  {
    id: 'chest',
    name: { en: 'Lift the heavy treasure chest', de: 'Hebt die schwere Schatztruhe' },
    done: { en: 'The chest is open – full of gold!', de: 'Die Truhe ist offen – voller Gold!' },
    build() {
      const g = new THREE.Group();
      const chest = lootMesh('chest');
      chest.scale.setScalar(3.5);
      chest.position.y = -1.2;
      g.add(chest);
      const coins = [];
      for (let i = 0; i < 16; i++) {
        const c = lootMesh('coin');
        c.scale.setScalar(0.7);
        c.visible = false;
        c.userData.a = (i / 16) * TAU;
        g.add(c);
        coins.push(c);
      }
      return {
        group: g,
        handles: [new THREE.Vector3(-7, 4, 0), new THREE.Vector3(7, 4, 0)],
        anim(k, t) {
          chest.position.y = -1.2 + Math.min(1, k * 2) * 3;
          coins.forEach((c, i) => {
            c.visible = k > 0.3;
            const f = Math.max(0, (k - 0.3) / 0.7);
            c.position.set(Math.cos(c.userData.a) * f * 6, 5 + f * 6 - f * f * 6, Math.sin(c.userData.a) * f * 6);
            c.rotation.y = t * 3 + i;
          });
        },
      };
    },
  },
  {
    id: 'boulder',
    name: { en: 'Push the boulder away from the cave', de: 'Schiebt den Felsbrocken vor der Höhle weg' },
    done: { en: 'The cave is open – a whole school of fish swims out!', de: 'Die Höhle ist offen – ein ganzer Fischschwarm schwimmt heraus!' },
    build() {
      const g = new THREE.Group();
      const rockM = std(0x5a5650, { roughness: 0.95, flatShading: true });
      add(g, new THREE.TorusGeometry(5, 2.2, 8, 16, PI), rockM, [0, 0, -1.5], [0, 0, 0], [1, 1.1, 1.4]);
      add(g, new THREE.CircleGeometry(5, 20, 0, PI), std(0x0a0a10), [0, 0, -3.2]);
      const boulder = add(g, new THREE.IcosahedronGeometry(3.4, 1), rockM, [0, 3, 0.5]);
      const fish = [];
      for (let i = 0; i < 14; i++) {
        const f = model('lanternfish', 1.2);
        f.visible = false;
        f.userData.a = Math.random() * TAU;
        f.userData.s = 0.6 + Math.random() * 0.6;
        g.add(f);
        fish.push(f);
      }
      return {
        group: g,
        handles: [new THREE.Vector3(-6, 3, 6), new THREE.Vector3(6, 3, 6)],
        anim(k, t) {
          boulder.position.set(k * 9, 3 - k * 1.5, 0.5 + k * 3);
          boulder.rotation.z = -k * 3;
          fish.forEach((f, i) => {
            f.visible = k > 0.25;
            const q = Math.max(0, k - 0.25) * f.userData.s * 2;
            f.position.set(Math.cos(f.userData.a) * q * 12, 3 + Math.sin(t * 2 + i) * 0.8 + q * 4, 2 + q * 18);
            f.rotation.y = Math.atan2(Math.cos(f.userData.a), 1);
            animUpper(f, 'lanternfish', t * 3 + i);
          });
        },
      };
    },
  },
  {
    id: 'whale',
    name: { en: 'Free the young whale from the old rope', de: 'Befreit den jungen Wal vom alten Seil' },
    done: { en: 'The young whale is free and sings a thank-you song!', de: 'Der junge Wal ist frei und singt ein Danke-Lied!' },
    build() {
      const g = new THREE.Group();
      const w = model('humpback', 12);
      w.position.set(0, 4, 0);
      g.add(w);
      const rope = [];
      for (let i = 0; i < 5; i++) rope.push(add(g, new THREE.TorusGeometry(2.6, 0.12, 5, 24), std(0xb89a6a), [0, 4, -3 + i * 1.6], [0, 0, i * 0.4]));
      const line = add(g, new THREE.CylinderGeometry(0.1, 0.1, 6, 6), std(0xb89a6a), [0, 1, -1], [0, 0, 0]);
      return {
        group: g,
        handles: [new THREE.Vector3(-8, 5, -1), new THREE.Vector3(8, 5, -1)],
        anim(k, t) {
          animUpper(w, 'humpback', t * (k > 0 ? 1.5 : 0.4));
          rope.forEach((r) => {
            r.scale.setScalar(1 + k * 2);
            r.position.y = 4 - k * 4;
            r.material.transparent = true;
            r.material.opacity = 1 - k;
          });
          line.visible = k < 0.2;
          if (k > 0) w.position.set(0, 4 + k * 26, k * 40);
        },
      };
    },
  },
  {
    id: 'barrel',
    name: { en: 'Carry the old barrel up together', de: 'Tragt gemeinsam das alte Fass nach oben' },
    done: { en: 'The rubbish floats up to the ship – the sea is a bit cleaner!', de: 'Der Müll schwebt hinauf zum Schiff – das Meer ist ein bisschen sauberer!' },
    build() {
      const g = new THREE.Group();
      const barrel = new THREE.Group();
      add(barrel, new THREE.CylinderGeometry(2, 2, 5, 18), std(0x2a6a9a, { metalness: 0.4 }), [0, 0, 0], [0, 0, PI / 2]);
      for (const x of [-1.6, 0, 1.6]) add(barrel, new THREE.TorusGeometry(2.02, 0.12, 5, 24), std(0x3a3a3a), [x, 0, 0], [0, PI / 2, 0]);
      barrel.position.set(0, 2, 0);
      barrel.rotation.y = 0.4;
      g.add(barrel);
      const balloons = [-1, 1].map((sx) => {
        const b = add(g, new THREE.SphereGeometry(1.4, 16, 12), std(0xffd23a, { emissive: 0xffa020, emissiveIntensity: 0.3 }), [sx * 1.5, 6, 0]);
        b.visible = false;
        return b;
      });
      return {
        group: g,
        handles: [new THREE.Vector3(-7, 3, 0), new THREE.Vector3(7, 3, 0)],
        anim(k) {
          barrel.position.y = 2 + k * 60;
          balloons.forEach((b) => {
            b.visible = k > 0;
            b.position.y = 6 + k * 60;
          });
        },
      };
    },
  },
  {
    id: 'lander',
    name: { en: 'Pull the stuck research lander out of the mud', de: 'Zieht den festgesteckten Forschungs-Lander aus dem Schlamm' },
    done: { en: 'The lander floats up again – the researchers get their pictures!', de: 'Der Lander steigt wieder auf – die Forscher bekommen ihre Bilder!' },
    build() {
      const g = new THREE.Group();
      const l = model('lander', 5);
      l.position.y = -1.5;
      l.rotation.z = 0.35;
      g.add(l);
      add(g, new THREE.CircleGeometry(4, 20), std(0x4a3a2a, { roughness: 1 }), [0, 0.05, 0], [-PI / 2, 0, 0]);
      return {
        group: g,
        handles: [new THREE.Vector3(-6.5, 3, 0), new THREE.Vector3(6.5, 3, 0)],
        anim(k) {
          l.position.y = -1.5 + k * 40;
          l.rotation.z = 0.35 * (1 - Math.min(1, k * 4));
        },
      };
    },
  },
  {
    id: 'crystals',
    name: { en: 'Light both crystals at the same time', de: 'Bringt beide Kristalle gleichzeitig zum Leuchten' },
    done: { en: 'A pillar of light rises – how beautiful!', de: 'Eine Lichtsäule steigt auf – wie schön!' },
    build() {
      const g = new THREE.Group();
      const cm = [0, 1].map(() => new THREE.MeshStandardMaterial({ color: 0x6ad8ff, emissive: 0x2a8aff, emissiveIntensity: 0.25, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }));
      for (const [i, sx] of [[0, -1], [1, 1]]) {
        add(g, new THREE.OctahedronGeometry(1.4, 0), cm[i], [sx * 9, 3, 0], [0, 0, 0], [1, 3, 1]);
        add(g, new THREE.OctahedronGeometry(0.8, 0), cm[i], [sx * 9 + 1, 1.5, 0.5], [0.3, 0, 0.3], [1, 2.4, 1]);
      }
      const beam = add(g, new THREE.CylinderGeometry(0.25, 0.25, 18, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 4, 0], [0, 0, PI / 2]);
      const pillar = add(g, new THREE.CylinderGeometry(1.5, 3, 80, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x9af0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [0, 40, 0]);
      return {
        group: g,
        handles: [new THREE.Vector3(-9, 5, 4), new THREE.Vector3(9, 5, 4)],
        anim(k, t) {
          cm.forEach((m) => (m.emissiveIntensity = 0.25 + k * 1.5 + (k > 0 ? Math.sin(t * 6) * 0.2 : 0)));
          beam.material.opacity = Math.min(1, k * 3) * 0.8;
          pillar.material.opacity = Math.max(0, k - 0.3) * 0.5;
        },
      };
    },
  },
  {
    id: 'doors',
    name: { en: 'Open the doors of the sunken temple', de: 'Öffnet die Tore des versunkenen Tempels' },
    done: { en: 'The temple doors are open – golden light shines out!', de: 'Die Tempeltore sind offen – goldenes Licht strahlt heraus!' },
    build() {
      const g = new THREE.Group();
      const stone = std(0xb8b0a0, { roughness: 0.9 });
      for (const sx of [-1, 1]) add(g, new THREE.BoxGeometry(1.6, 9, 1.6), stone, [sx * 4.2, 4.5, 0]);
      add(g, new THREE.BoxGeometry(10.5, 1.6, 2), stone, [0, 9.6, 0]);
      add(g, new THREE.PlaneGeometry(6.8, 8.8), new THREE.MeshBasicMaterial({ color: 0xffd86a }), [0, 4.4, -0.5]);
      const doors = [-1, 1].map((sx) => {
        const piv = new THREE.Group();
        piv.position.set(sx * 3.4, 0, 0.3);
        add(piv, new THREE.BoxGeometry(3.4, 8.8, 0.4), std(0x8a6a3a, { metalness: 0.3 }), [-sx * 1.7, 4.4, 0]);
        add(piv, new THREE.TorusGeometry(0.35, 0.08, 6, 14), std(0xffcf4a, { metalness: 0.8 }), [-sx * 3, 4.4, 0.25]);
        g.add(piv);
        piv.userData.sx = sx;
        return piv;
      });
      const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0xffd86a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      light.scale.setScalar(16);
      light.position.set(0, 4.5, 1);
      g.add(light);
      return {
        group: g,
        handles: [new THREE.Vector3(-6.5, 4, 5), new THREE.Vector3(6.5, 4, 5)],
        anim(k) {
          doors.forEach((d) => (d.rotation.y = d.userData.sx * -k * 1.7));
          light.material.opacity = k * 0.9;
        },
      };
    },
  },
];

// a glowing ring with a hand for every handle
let handTex = null;
function handTexture() {
  if (handTex) return handTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = '#7affff';
  g.lineWidth = 8;
  g.shadowColor = '#7affff';
  g.shadowBlur = 12;
  g.beginPath();
  g.arc(64, 64, 52, 0, TAU);
  g.stroke();
  g.shadowBlur = 0;
  g.font = '64px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('✋', 64, 68);
  return (handTex = new THREE.CanvasTexture(c));
}

export class TeamChallenges {
  constructor(scene, world, seed) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    const rnd = mulberry32((seed ^ 0x2c0ffe) >>> 0 || 7);
    this.list = [];
    const x0 = SHIP_X + 160, x1 = DEEP_X - 40, n = CHALLENGES.length;
    CHALLENGES.forEach((C, i) => {
      const b = C.build();
      const x = x0 + ((x1 - x0) * (i + 0.5)) / n + (rnd() - 0.5) * 30;
      const side = i % 2 ? 1 : -1;
      const z = axisZ(x) + side * (4 + rnd() * 14);
      b.group.position.set(x, world.heightAt(x, z), z);
      b.group.rotation.y = rnd() * TAU;
      this.group.add(b.group);
      // the handles
      const rings = b.handles.map((h) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: handTexture(), transparent: true, depthWrite: false }));
        s.scale.setScalar(3.4);
        s.position.copy(h);
        b.group.add(s);
        return s;
      });
      // a tether line from each handle to the sub holding it
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      const tether = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0x9affff, transparent: true, opacity: 0.9 }));
      tether.frustumCulled = false;
      this.group.add(tether);
      // a soft glow so you can see where a challenge is
      const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0x7affff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      beacon.scale.setScalar(16);
      beacon.position.set(0, 6, 0);
      b.group.add(beacon);
      this.list.push({ C, b, rings, tether, beacon, hold: 0, done: false, k: 0, idx: i });
    });
    this.events = [];
  }

  get doneCount() {
    return this.list.filter((c) => c.done).length;
  }

  // world positions of a challenge's handles
  handlePos(c, i) {
    return c.b.group.localToWorld(c.b.handles[i].clone());
  }

  markDone(id, quiet = false) {
    const c = this.list.find((x) => x.C.id === id);
    if (!c || c.done) return;
    c.done = true;
    c.rings.forEach((r) => (r.visible = false));
    c.beacon.visible = false;
    c.tether.visible = false;
    if (!quiet) this.events.push({ type: 'done', id, team: true });
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // subs: [{ pos, me }] – everybody in this dive (me first)
  update(dt, t, subs) {
    const myPos = subs[0] && subs[0].pos;
    let near = null;
    for (const c of this.list) {
      if (c.done) {
        if (c.k < 1) c.k = Math.min(1, c.k + dt / 4);
        c.b.anim(c.k, t, dt);
        continue;
      }
      c.b.anim(0, t, dt);
      const dist = myPos ? c.b.group.position.distanceTo(myPos) : 999;
      if (dist < 45 && (!near || dist < near.d)) near = { c, d: dist };
      if (dist > 160) {
        c.tether.visible = false;
        continue;
      }
      // who holds which handle (each sub can hold only one)
      const holders = c.b.handles.map((_, i) => {
        const hp = this.handlePos(c, i);
        let best = null;
        subs.forEach((s, si) => {
          const d = s.pos.distanceTo(hp);
          if (d < RADIUS && (!best || d < best.d)) best = { si, d, pos: s.pos };
        });
        return best;
      });
      const a = holders[0], b = holders[1];
      const both = a && b && a.si !== b.si;
      c.hold = both ? c.hold + dt : Math.max(0, c.hold - dt * 2);
      c.rings.forEach((r, i) => {
        const held = !!holders[i];
        r.material.color.setHex(held ? 0x7aff9a : 0xffffff);
        r.scale.setScalar((held ? 4.2 : 3.4) + Math.sin(t * 4 + i) * 0.25);
      });
      // tethers: from the handle to the sub holding it
      const arr = c.tether.geometry.attributes.position.array;
      let used = 0;
      holders.forEach((h, i) => {
        if (!h) return;
        const hp = this.handlePos(c, i);
        arr.set([hp.x, hp.y, hp.z, h.pos.x, h.pos.y, h.pos.z], used * 6);
        used++;
      });
      for (let k = used; k < 2; k++) arr.fill(0, k * 6, k * 6 + 6);
      c.tether.geometry.attributes.position.needsUpdate = true;
      c.tether.geometry.setDrawRange(0, used * 2);
      c.tether.visible = used > 0;
      c.beacon.material.opacity = 0.35 + 0.2 * Math.sin(t * 2 + c.idx);
      if (c.hold >= HOLD) {
        c.done = true;
        c.rings.forEach((r) => (r.visible = false));
        c.beacon.visible = false;
        c.tether.visible = false;
        this.events.push({ type: 'done', id: c.C.id, team: false });
      } else if (both && c.hold > 0 && !c.toldHold) {
        c.toldHold = true;
        this.events.push({ type: 'holding', id: c.C.id });
      }
      // only one sub there: tell what is missing
      if ((a || b) && !both && myPos && ((a && a.si === 0) || (b && b.si === 0)) && !c.toldAlone) {
        c.toldAlone = true;
        this.events.push({ type: 'alone', id: c.C.id });
      }
    }
    if (near && near.c !== this.lastNear) {
      this.lastNear = near.c;
      this.events.push({ type: 'near', id: near.c.C.id });
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
