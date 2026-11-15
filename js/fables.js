// The secret fable creatures of Atlantis – one per trench, each inspired by an old sea legend (sources below).
// They live in the hidden hall inside the big building in the middle of Atlantis and tell every visitor the same
// secret: a treasure of positive-thinking sentences. All of them are fantasy (original designs, friendly versions
// of the legends). Every creature is built facing +z, and gets an anim(t, dt, talk) and a mouth anchor for the
// speech bubbles.

import * as THREE from './vendor/three.min.js';

const PI = Math.PI, TAU = Math.PI * 2;

// ---------------------------------------------------------------- what they say (the same secret everywhere)
export const FABLE_SPEECH = {
  de: [
    'Herzlich willkommen{name},',
    'für ein positives, glückliches Leben habe ich für dich folgende Positiv Denken Sätze bereit,',
    'ein Schatz, den du immer einsetzen kannst und dir zu jeder Gelegenheit vorsagen kannst:',
    'Ich bin positiv, ich bin zuversichtlich, ich bin innerlich und äußerlich fröhlich.',
    'Ich bin voller Energie, Begeisterung und Lebenskraft.',
    'Ich mag mich so wie ich bin.',
    'Ich liebe mich, ich liebe alle Menschen, ich liebe alles.',
    'Ich bin achtsam und lebe im Hier und Jetzt.',
    'Ich bin dankbar und zufrieden.',
    'Und ich bin mutig😀',
  ],
  en: [
    'A warm welcome{name},',
    'for a positive, happy life I have these positive-thinking sentences ready for you,',
    'a treasure you can always use and say to yourself on every occasion:',
    'I am positive, I am confident, I am cheerful inside and out.',
    'I am full of energy, enthusiasm and vitality.',
    'I like myself just the way I am.',
    'I love myself, I love all people, I love everything.',
    'I am mindful and live in the here and now.',
    'I am grateful and content.',
    'And I am brave😀',
  ],
};

// ---------------------------------------------------------------- the seven creatures (names, legend, sources)
export const FABLES = {
  java: {
    name: { en: 'Moon-Pearl Dragon', de: 'Mondperlen-Drache' },
    legend: {
      en: 'Inspired by the Bakunawa of Philippine legend: a giant sea serpent said to swallow the moon – people banged pots and pans until it spat the moon out again.',
      de: 'Inspiriert von der Bakunawa aus Sagen der Philippinen: eine riesige Seeschlange, die den Mond verschluckt haben soll – die Menschen trommelten auf Töpfe und Pfannen, bis sie ihn wieder ausspuckte.',
    },
    source: [['Wikipedia: Bakunawa', 'https://en.wikipedia.org/wiki/Bakunawa']],
  },
  mariana: {
    name: { en: 'Leviathan', de: 'Leviathan' },
    legend: {
      en: 'Leviathan is a giant sea monster from ancient Middle Eastern myths and the Hebrew Bible – sometimes a sea serpent, sometimes a whale-like dragon.',
      de: 'Leviathan ist ein riesiges Meeresungeheuer aus alten Mythen des Nahen Ostens und der Hebräischen Bibel – mal eine Seeschlange, mal ein walartiger Drache.',
    },
    source: [['Britannica: Leviathan', 'https://www.britannica.com/topic/Leviathan-Middle-Eastern-mythology']],
  },
  puertorico: {
    name: { en: 'Captain Eight-Arms', de: 'Kapitän Achtarm' },
    legend: {
      en: 'Sailors told of colossal octopuses that could grab whole ships – in 1801 the naturalist Pierre Denys de Montfort even drew one attacking a sailing ship. Captain Eight-Arms is our friendly pirate version.',
      de: 'Seeleute erzählten von gewaltigen Kraken, die ganze Schiffe packen konnten – 1801 zeichnete der Naturforscher Pierre Denys de Montfort sogar einen, der ein Segelschiff angreift. Kapitän Achtarm ist unsere freundliche Piraten-Version.',
    },
    source: [['Biodiversity Heritage Library: Release the Kraken!', 'https://blog.biodiversitylibrary.org/2014/10/release-kraken']],
  },
  southsandwich: {
    name: { en: 'Ice Kraken', de: 'Eis-Kraken' },
    legend: {
      en: 'The Kraken is a sea monster from Norwegian sailors’ tales, perhaps imagined from sightings of giant squid. Bishop Erik Pontoppidan described it in his Natural History of Norway (1752).',
      de: 'Der Kraken ist ein Seeungeheuer aus den Erzählungen norwegischer Seeleute, vielleicht ausgedacht nach Sichtungen von Riesenkalmaren. Bischof Erik Pontoppidan beschrieb ihn 1752 in seiner Naturgeschichte Norwegens.',
    },
    source: [['Britannica: kraken', 'https://www.britannica.com/topic/kraken']],
  },
  izu: {
    name: { en: 'Umibōzu the Sea Giant', de: 'Umibōzu, der Meeresriese' },
    legend: {
      en: 'Umibōzu (“sea monk”) is a yōkai from Japanese folklore: a giant dark figure with a round head that suddenly rises from the sea in front of sailors.',
      de: 'Umibōzu („Meeresmönch“) ist ein Yōkai aus japanischen Volkssagen: eine riesige dunkle Gestalt mit rundem Kopf, die plötzlich vor Seeleuten aus dem Meer auftaucht.',
    },
    source: [['Wikipedia: Umibōzu', 'https://en.wikipedia.org/wiki/Umib%C5%8Dzu']],
  },
  kuril: {
    name: { en: 'The Flying Dutchman', de: 'Der Fliegende Holländer' },
    legend: {
      en: 'The Flying Dutchman is a legendary ghost ship of European sailors’ lore, doomed to sail the seas forever and never reach port.',
      de: 'Der Fliegende Holländer ist ein sagenhaftes Geisterschiff aus der Seefahrt Europas – dazu verdammt, ewig über die Meere zu segeln, ohne je einen Hafen zu erreichen.',
    },
    source: [['Britannica: Flying Dutchman', 'https://www.britannica.com/topic/Flying-Dutchman']],
  },
  tonga: {
    name: { en: 'Zaratan the Island Turtle', de: 'Zaratan, die Inselschildkröte' },
    legend: {
      en: 'In medieval bestiaries sailors mistake a giant sea creature for an island and land on its back – the aspidochelone (“shield turtle”), later also called zaratan.',
      de: 'In mittelalterlichen Tierbüchern halten Seeleute ein riesiges Meerestier für eine Insel und landen auf seinem Rücken – den Aspidochelone („Schildkröte“), später auch Zaratan genannt.',
    },
    source: [
      ['The Medieval Bestiary: Whale (aspidochelone)', 'https://www.medievalbestiary.bestiary.ca/imagesources/imgsrc104305.htm'],
      ['A Book of Creatures: Aspidochelone', 'https://abookofcreatures.com/2019/08/16/aspidochelone/'],
    ],
  },
};

// ---------------------------------------------------------------- small helpers
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.1, ...o });
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
// a friendly eye looking along +z (iris and pupil are caps on the eyeball)
function eye(parent, r, p, { iris = 0x2a6a8a, glowIris = false, ry = 0, rx = 0 } = {}) {
  const g = grp(parent, p, [rx, ry, 0]);
  add(g, new THREE.SphereGeometry(r, 22, 16), std(0xffffff, { roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.2 }));
  const cap = (rr, th, mat) => add(g, new THREE.SphereGeometry(rr, 22, 8, 0, TAU, 0, th), mat, [0, 0, 0], [PI / 2, 0, 0]);
  cap(r * 1.01, 0.62, glowIris ? glow(iris) : shiny(iris, 0.4));
  cap(r * 1.02, 0.3, glow(0x07070c));
  add(g, new THREE.SphereGeometry(r * 0.13, 8, 6), glow(0xffffff), [r * 0.25, r * 0.28, r * 0.93]);
  return g;
}
// chain of tapering segments growing backwards along -z (serpent bodies)
function chainZ(parent, n, len, r0, r1, mat, each) {
  const joints = [];
  let p = parent;
  for (let i = 0; i < n; i++) {
    const r = r0 + (r1 - r0) * (i / (n - 1)), rn = r0 + (r1 - r0) * Math.min(1, (i + 1) / (n - 1));
    const j = grp(p, i === 0 ? [0, 0, 0] : [0, 0, -len]);
    add(j, new THREE.CylinderGeometry(r, rn, len * 1.04, 16, 1, true), mat, [0, 0, -len / 2], [PI / 2, 0, 0]);
    add(j, new THREE.SphereGeometry(r, 16, 10), mat);
    if (each) each(j, i, r);
    joints.push(j);
    p = j;
  }
  return joints;
}
// chain hanging down along -y (tentacles)
function chainY(parent, n, len, r0, r1, mat, each) {
  const joints = [];
  let p = parent;
  for (let i = 0; i < n; i++) {
    const r = r0 + (r1 - r0) * (i / (n - 1)), rn = r0 + (r1 - r0) * Math.min(1, (i + 1) / (n - 1));
    const j = grp(p, i === 0 ? [0, 0, 0] : [0, -len, 0]);
    add(j, new THREE.CylinderGeometry(r, rn, len * 1.04, 12, 1, true), mat, [0, -len / 2, 0]);
    add(j, new THREE.SphereGeometry(r, 12, 8), mat);
    if (each) each(j, i, r);
    joints.push(j);
    p = j;
  }
  return joints;
}
// root of a tentacle on a ring: local -y hangs down, local +z points outwards
function armRoot(parent, a, rr, y) {
  const g = grp(parent, [Math.cos(a) * rr, y, Math.sin(a) * rr]);
  g.rotation.order = 'YXZ';
  g.rotation.y = PI / 2 - a;
  return g;
}
function softHalo(color, size) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}
let dotTex = null;
function dot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  return (dotTex = new THREE.CanvasTexture(c));
}
const blink = (t, ph) => ((t + ph) % 4.3 < 0.13 ? 0.12 : 1);

// ---------------------------------------------------------------- 1 · Moon-pearl dragon (Java)
function dragon() {
  const G = new THREE.Group();
  const teal = shiny(0x1fb5a8, 0.2, { metalness: 0.35, roughness: 0.35 });
  const gold = shiny(0xf2c24a, 0.35, { metalness: 0.8, roughness: 0.3 });
  const belly = shiny(0xffe2a0, 0.22);
  const maneM = new THREE.MeshStandardMaterial({ color: 0x8af8ff, emissive: 0x3fd8ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const neck = grp(G, [0, 7, 5]);
  const head = grp(neck);
  add(head, new THREE.SphereGeometry(1.2, 26, 18), teal, [0, 0, 0], [0, 0, 0], [1, 0.85, 1.1]);
  add(head, new THREE.SphereGeometry(0.75, 22, 14), teal, [0, -0.1, 1.15], [0, 0, 0], [0.95, 0.62, 1.35]);
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.09, 8, 6), glow(0x08202a), [sx * 0.28, 0.12, 2.08]);
  const jaw = grp(head, [0, -0.42, 0.35]);
  add(jaw, new THREE.SphereGeometry(0.62, 20, 12), belly, [0, -0.05, 0.8], [0, 0, 0], [0.88, 0.33, 1.38]);
  add(jaw, new THREE.SphereGeometry(0.4, 14, 8), glow(0xff6a8a), [0, 0.06, 0.95], [0, 0, 0], [0.8, 0.2, 1.1]);
  const eyes = [eye(head, 0.34, [-0.62, 0.38, 0.62], { iris: 0xffa820, ry: -0.35 }), eye(head, 0.34, [0.62, 0.38, 0.62], { iris: 0xffa820, ry: 0.35 })];
  for (const sx of [-1, 1]) {
    const h = grp(head, [sx * 0.45, 0.85, -0.3], [-0.95, 0, sx * 0.3]);
    add(h, new THREE.ConeGeometry(0.17, 1.8, 10), gold, [0, 0.9, 0]);
    add(head, new THREE.BoxGeometry(0.5, 0.12, 0.2), gold, [sx * 0.62, 0.72, 0.62], [0, sx * 0.4, sx * 0.25]);
  }
  // whiskers that float in the water
  const whiskers = [];
  for (const sx of [-1, 1]) {
    const root = grp(head, [sx * 0.45, -0.2, 1.65], [0.2, sx * -2.4, 0]);
    whiskers.push(chainZ(root, 7, 0.45, 0.06, 0.025, gold));
  }
  // flowing mane
  const mane = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 8 - 0.5) * 2.4;
    const m = add(head, new THREE.PlaneGeometry(0.75, 2.4), maneM, [Math.sin(a) * 1.0, 0.3 + Math.cos(a) * 0.5, -0.9], [0.9, a * 0.6, 0]);
    mane.push(m);
  }
  // the long body
  const body = grp(neck, [0, -0.15, -0.95]);
  const fins = [];
  const joints = chainZ(body, 26, 1.0, 1.15, 0.24, teal, (j, i, r) => {
    add(j, new THREE.ConeGeometry(r * 0.32, r * 0.9, 6), gold, [0, r * 1.05, -0.5], [-0.35, 0, 0]);
    add(j, new THREE.BoxGeometry(r * 1.25, 0.12, 0.92), belly, [0, -r * 0.93, -0.5]);
    if (i % 3 === 1) for (const sx of [-1, 1]) add(j, new THREE.SphereGeometry(r * 0.16, 8, 6), glow(0x9ffaff), [sx * r * 0.98, r * 0.15, -0.5]);
    if (i === 25) fins.push(add(j, new THREE.CircleGeometry(1.4, 18, PI * 0.2, PI * 0.6), maneM, [0, 0, -1.4], [PI / 2, 0, PI])); // tail fan
  });
  // two front legs holding the moon pearl
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = grp(joints[2], [sx * 0.85, -0.5, -0.4], [0.9, 0, sx * -0.5]);
    add(l, new THREE.CylinderGeometry(0.22, 0.18, 1.6, 10), teal, [0, -0.8, 0]);
    for (let c = 0; c < 3; c++) add(l, new THREE.ConeGeometry(0.07, 0.4, 6), gold, [(c - 1) * 0.12, -1.75, 0.08], [0.6, 0, 0]);
    legs.push(l);
  }
  const pearl = add(G, new THREE.SphereGeometry(0.75, 28, 20), new THREE.MeshStandardMaterial({ color: 0xeef8ff, emissive: 0xbfe8ff, emissiveIntensity: 1.1, roughness: 0.15 }), [0, 4.2, 6.8]);
  const halo = softHalo(0xaee8ff, 4.5);
  halo.position.copy(pearl.position);
  G.add(halo);
  const mouth = grp(head, [0, -0.35, 2.0]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      joints.forEach((j, i) => {
        j.rotation.y = 0.21 + 0.22 * Math.sin(t * 0.8 - i * 0.38);
        j.rotation.x = (i < 6 ? -0.17 : 0.025) + 0.05 * Math.sin(t * 0.6 - i * 0.3);
      });
      neck.rotation.set(-0.12 + Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.45) * 0.15, 0);
      jaw.rotation.x = talk ? 0.22 + 0.16 * Math.sin(t * 13) : 0.04;
      whiskers.forEach((w, s) => w.forEach((j, i) => (j.rotation.y = Math.sin(t * 1.4 + i * 0.6 + s) * 0.25)));
      mane.forEach((m, k) => (m.rotation.z = Math.sin(t * 1.6 + k) * 0.18));
      eyes.forEach((e) => (e.scale.y = blink(t, 0.7)));
      const pk = 1 + Math.sin(t * 2.2) * 0.06;
      pearl.scale.setScalar(pk);
      halo.scale.setScalar(4.5 * pk);
      pearl.position.y = 4.2 + Math.sin(t * 0.9) * 0.25;
      halo.position.y = pearl.position.y;
      legs.forEach((l, s) => (l.rotation.x = 0.9 + Math.sin(t * 0.9 + s) * 0.08));
    },
  };
}

// ---------------------------------------------------------------- 2 · Leviathan (Mariana)
function leviathan() {
  const G = new THREE.Group();
  const skin = shiny(0x3a5ad0, 0.26, { metalness: 0.3, roughness: 0.38 });
  const belly = shiny(0x9cc4f0, 0.22);
  const plate = shiny(0x1a2a66, 0.2, { metalness: 0.55, roughness: 0.3 });
  const cyan = glow(0x6ffaff);
  const finM = new THREE.MeshStandardMaterial({ color: 0x4a7aff, emissive: 0x2a5aff, emissiveIntensity: 0.45, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  const head = grp(G, [0, 6, 4.5]);
  add(head, new THREE.SphereGeometry(2, 30, 20), skin, [0, 0, 0], [0, 0, 0], [1.2, 0.92, 1.5]);
  for (const sx of [-1, 1]) {
    add(head, new THREE.BoxGeometry(1.4, 0.3, 0.9), plate, [sx * 1.15, 1.25, 1.1], [0.2, sx * 0.4, sx * 0.35]);
    const h = grp(head, [sx * 1.0, 1.3, -0.6], [-1.15, 0, sx * 0.45]);
    add(h, new THREE.ConeGeometry(0.3, 3.2, 10), plate, [0, 1.6, 0]);
    add(h, new THREE.SphereGeometry(0.14, 8, 6), cyan, [0, 3.25, 0]);
    add(head, new THREE.SphereGeometry(0.9, 14, 10), finM, [sx * 2.3, -0.2, 0.2], [0, sx * 0.4, sx * 0.6], [1.5, 0.12, 1]);
  }
  const eyes = [eye(head, 0.45, [-1.5, 0.55, 1.45], { iris: 0x6ffaff, glowIris: true, ry: -0.55 }), eye(head, 0.45, [1.5, 0.55, 1.45], { iris: 0x6ffaff, glowIris: true, ry: 0.55 })];
  const jaw = grp(head, [0, -0.7, 0.5]);
  add(jaw, new THREE.SphereGeometry(1.75, 26, 14, 0, TAU, PI / 2, PI / 2), belly, [0, 0.15, 0.9], [0, 0, 0], [1.08, 0.5, 1.4]);
  for (let k = 0; k < 9; k++) add(head, new THREE.BoxGeometry(0.08, 0.5, 0.08), cyan, [(k - 4) * 0.36, -0.75, 2.75 - Math.abs(k - 4) * 0.12]);
  for (let k = 0; k < 6; k++) add(head, new THREE.SphereGeometry(0.12, 8, 6), cyan, [(k % 2 ? 1 : -1) * (1.6 + (k >> 1) * 0.15), -0.1 - (k >> 1) * 0.35, 0.2 - (k >> 1) * 0.6]);
  const bodyRoot = grp(head, [0, -0.15, -2.6]);
  const fins = [];
  const joints = chainZ(bodyRoot, 9, 2.0, 1.9, 0.45, skin, (j, i, r) => {
    add(j, new THREE.ConeGeometry(r * 0.35, r * 1.0, 4), plate, [0, r * 1.02, -1], [-0.4, PI / 4, 0], [1, 1, 0.35]);
    add(j, new THREE.SphereGeometry(r * 0.95, 14, 8), belly, [0, -r * 0.35, -1], [0, 0, 0], [1, 0.62, 1.15]);
    for (const sx of [-1, 1]) add(j, new THREE.SphereGeometry(r * 0.1 + 0.05, 8, 6), cyan, [sx * r * 0.97, r * 0.2, -1]);
    if (i === 1 || i === 3 || i === 5) {
      for (const sx of [-1, 1]) {
        const f = grp(j, [sx * r * 0.9, -0.1, -0.8]);
        add(f, new THREE.SphereGeometry(1, 18, 10), finM, [sx * (1.6 + r * 0.3), 0, -0.3], [0, sx * 0.25, 0], [1.9 + r * 0.4, 0.07, 1]);
        f.userData.sx = sx;
        fins.push(f);
      }
    }
    if (i === 8) for (const sx of [-1, 1]) add(j, new THREE.SphereGeometry(1, 16, 8), finM, [sx * 1.1, 0, -2.2], [0, sx * 0.6, 0], [1.6, 0.08, 0.8]);
  });
  const mouth = grp(head, [0, -0.6, 3.1]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      joints.forEach((j, i) => {
        j.rotation.x = (i === 0 ? 0.05 : 0.04) + 0.09 * Math.sin(t * 0.9 - i * 0.6);
        j.rotation.y = 0.16 + 0.1 * Math.sin(t * 0.5 - i * 0.45);
      });
      fins.forEach((f, k) => (f.rotation.z = f.userData.sx * (0.15 + 0.3 * Math.sin(t * 1.3 + k * 0.4))));
      head.position.y = 6 + Math.sin(t * 0.8) * 0.3;
      head.rotation.y = Math.sin(t * 0.4) * 0.12;
      jaw.rotation.x = talk ? 0.18 + 0.14 * Math.sin(t * 11) : 0.03;
      eyes.forEach((e) => (e.scale.y = blink(t, 1.9)));
    },
  };
}

// ---------------------------------------------------------------- 3 · Captain Eight-Arms, octopus pirate (Puerto Rico)
function captain() {
  const G = new THREE.Group();
  const skin = shiny(0xe24a3c, 0.2, { roughness: 0.5 });
  const spotM = std(0xa8282a, { roughness: 0.6 });
  const sucker = std(0xffd6b8, { emissive: 0xff9a7a, emissiveIntensity: 0.15 });
  const hatM = std(0x1d1616, { roughness: 0.75 });
  const goldM = shiny(0xf2c24a, 0.4, { metalness: 0.85, roughness: 0.28 });
  const brown = std(0x5a3418, { roughness: 0.7 });
  const mantle = grp(G, [0, 7.4, 0]);
  add(mantle, new THREE.SphereGeometry(2.2, 32, 22), skin, [0, 0.7, -0.3], [0.25, 0, 0], [1, 1.25, 1.05]);
  for (let k = 0; k < 16; k++) {
    const a = k * 2.4, el = 0.2 + ((k * 0.37) % 1) * 1.1;
    const n = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    if (n.z > 0.5 && n.y < 0.7) continue; // keep the face clear
    add(mantle, new THREE.SphereGeometry(0.22 + (k % 3) * 0.06, 10, 6), spotM, [n.x * 2.15, 0.7 + n.y * 2.7, -0.3 + n.z * 2.25], [0, 0, 0], [1, 1, 0.35]).lookAt(n.x * 10, 0.7 + n.y * 30, n.z * 10);
  }
  const eyeL = eye(mantle, 0.62, [-0.85, -0.15, 1.75], { iris: 0x3a9a4a, ry: -0.2 });
  // eye patch over the right eye, the strap goes round the head
  add(mantle, new THREE.CylinderGeometry(0.62, 0.62, 0.12, 20), hatM, [0.85, -0.15, 2.05], [PI / 2, 0, 0]);
  add(mantle, new THREE.TorusGeometry(2.25, 0.06, 6, 40), hatM, [0, 0.3, -0.3], [PI / 2 + 0.55, 0, 0.25]);
  for (const sx of [-1, 1]) add(mantle, new THREE.TorusGeometry(0.5, 0.11, 6, 16, PI * 0.8), brown, [sx * 0.85, 0.55, 2.0], [0, 0, PI * 0.1 + (sx > 0 ? 0.2 : -0.2)]);
  // a curly moustache and a mouth
  const tache = [];
  for (const sx of [-1, 1]) tache.push(add(mantle, new THREE.TorusGeometry(0.36, 0.1, 8, 18, PI * 1.4), brown, [sx * 0.42, -0.98, 2.02], [0, sx > 0 ? PI : 0, -0.7]));
  const mouthMesh = add(mantle, new THREE.SphereGeometry(0.3, 14, 10), glow(0x3a0a12), [0, -1.32, 1.92], [0, 0, 0], [1.3, 0.45, 0.4]);
  // tricorn hat with golden trim and a shell badge
  const hat = grp(mantle, [0, 3.35, -0.45], [-0.2, 0, 0]);
  add(hat, new THREE.CylinderGeometry(1.2, 1.45, 1.1, 24), hatM, [0, 0.45, 0]);
  add(hat, new THREE.CylinderGeometry(2.5, 2.5, 0.16, 3), hatM, [0, -0.05, 0]);
  for (let e = 0; e < 3; e++) {
    const th = PI / 3 + (e * TAU) / 3;
    const b = add(hat, new THREE.BoxGeometry(2.5 * 1.7, 0.75, 0.14), hatM, [Math.sin(th) * 1.18, 0.28, Math.cos(th) * 1.18]);
    b.rotation.order = 'YXZ';
    b.rotation.set(-0.55, th, 0);
  }
  add(hat, new THREE.TorusGeometry(2.45, 0.06, 4, 3), goldM, [0, 0.04, 0], [PI / 2, 0, -PI / 2]);
  add(hat, new THREE.CylinderGeometry(1.46, 1.46, 0.14, 24, 1, true), goldM, [0, 0.0, 0]);
  add(hat, new THREE.SphereGeometry(0.42, 14, 8, 0, TAU, 0, PI / 2), std(0xfff4e8), [0, 0.55, 1.3], [PI / 2, 0, 0], [1, 1, 0.4]);
  add(mantle, new THREE.TorusGeometry(0.3, 0.06, 8, 20), goldM, [-2.05, -0.5, 0.7], [0, PI / 2, 0]);
  // eight arms
  const arms = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + PI / 8;
    const root = armRoot(mantle, a, 1.25, -1.3);
    const joints = chainY(root, 12, 0.6, 0.45, 0.07, skin, (j, i, r) => {
      if (i % 2 === 0) add(j, new THREE.SphereGeometry(r * 0.42, 8, 6), sucker, [0, -0.3, -r * 0.85]);
    });
    arms.push({ root, joints, k });
  }
  const tip = (k) => arms[k].joints[11];
  // props: telescope, ship's wheel, treasure chest
  const scope = grp(tip(1), [0, -0.4, 0], [PI / 2, 0, 0]);
  add(scope, new THREE.CylinderGeometry(0.2, 0.26, 1.8, 14), goldM, [0, 0.4, 0]);
  add(scope, new THREE.CylinderGeometry(0.15, 0.15, 1.0, 12), brown, [0, 1.6, 0]);
  const wheel = grp(tip(3), [0, -0.9, 0], [0, 0, PI / 2]);
  add(wheel, new THREE.TorusGeometry(1.0, 0.09, 8, 28), brown);
  for (let s = 0; s < 8; s++) {
    const sa = (s / 8) * TAU;
    add(wheel, new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), brown, [0, 0, 0], [0, 0, sa]);
    add(wheel, new THREE.SphereGeometry(0.1, 8, 6), goldM, [Math.cos(sa + PI / 2) * 1.3, Math.sin(sa + PI / 2) * 1.3, 0]);
  }
  add(wheel, new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12), goldM, [0, 0, 0], [PI / 2, 0, 0]);
  const chest = grp(tip(5), [0, -0.9, 0]);
  add(chest, new THREE.BoxGeometry(1.4, 0.8, 0.9), brown, [0, 0, 0]);
  add(chest, new THREE.BoxGeometry(1.45, 0.12, 0.95), goldM, [0, 0.42, 0]);
  add(chest, new THREE.BoxGeometry(1.4, 0.35, 0.9), brown, [0, 0.75, -0.3], [-0.9, 0, 0]);
  add(chest, new THREE.SphereGeometry(0.55, 16, 8, 0, TAU, 0, PI / 2), glow(0xffd84a), [0, 0.38, 0], [0, 0, 0], [1.1, 0.4, 0.7]);
  const mouth = grp(mantle, [0, -1.35, 2.2]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      for (const { root, joints, k } of arms) {
        root.rotation.x = -0.65 + Math.sin(t * 0.9 + k) * 0.08;
        joints.forEach((j, i) => {
          if (i === 0) return;
          j.rotation.x = -0.1 + Math.sin(t * 1.3 + k * 0.8 + i * 0.45) * 0.17;
          j.rotation.z = Math.sin(t * 0.9 + k * 1.7 + i * 0.3) * 0.08;
        });
      }
      // the telescope arm lifts the telescope to the eye now and then
      const look = Math.max(0, Math.sin(t * 0.35)) ** 3;
      arms[1].root.rotation.x = -0.65 - look * 1.6;
      mantle.position.y = 7.4 + Math.sin(t * 0.9) * 0.35;
      mantle.rotation.z = Math.sin(t * 0.6) * 0.06;
      mouthMesh.scale.y = talk ? 0.45 + 0.4 * Math.abs(Math.sin(t * 12)) : 0.25;
      tache.forEach((m, s) => (m.rotation.z = (s ? -0.7 : -0.7) + (talk ? Math.sin(t * 12) * 0.12 : 0)));
      eyeL.scale.y = blink(t, 0.3);
      wheel.rotation.x = t * 0.4;
    },
  };
}

// ---------------------------------------------------------------- 4 · Ice Kraken (South Sandwich)
function kraken() {
  const G = new THREE.Group();
  const ice = new THREE.MeshStandardMaterial({ color: 0xa8e2ff, emissive: 0x3a9ae0, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.92 });
  const arm = shiny(0x6aa8ff, 0.32, { roughness: 0.3 });
  const cryM = new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x9ff0ff, emissiveIntensity: 1.0, roughness: 0.05, transparent: true, opacity: 0.9 });
  const dot = glow(0x9ffaff);
  const head = grp(G, [0, 6.5, 0]);
  const prof = [[0, 0], [1.6, 0.3], [2.0, 1.6], [1.8, 3.6], [1.2, 5.6], [0.45, 6.9], [0, 7.2]].map(([a, b]) => new THREE.Vector2(a, b));
  add(head, new THREE.LatheGeometry(prof, 30), ice, [0, 0.6, -0.4], [-0.3, 0, 0]);
  const fins = [];
  for (const sx of [-1, 1]) fins.push(add(head, new THREE.SphereGeometry(1.4, 16, 10), ice, [sx * 1.6, 6.0, -2.5], [-0.3, 0, sx * 0.4], [1.4, 0.12, 1])); // fins at the tip
  for (let k = 0; k < 9; k++) {
    const a = k * 0.9, h = 1.5 + (k % 4) * 1.1;
    add(head, new THREE.OctahedronGeometry(0.35 + (k % 3) * 0.12, 0), cryM, [Math.cos(a) * 1.6, 0.6 + h, -0.4 - Math.sin(a) * 1.3 - h * 0.3], [k, k * 2, 0], [0.7, 1.6, 0.7]);
  }
  const eyes = [eye(head, 0.7, [-1.05, 0.95, 1.25], { iris: 0x2a6aff, ry: -0.45 }), eye(head, 0.7, [1.05, 0.95, 1.25], { iris: 0x2a6aff, ry: 0.45 })];
  const mouthMesh = add(head, new THREE.SphereGeometry(0.32, 14, 10), glow(0x0a1a3a), [0, 0.0, 1.62], [0, 0, 0], [1.1, 0.5, 0.5]);
  const arms = [];
  for (let k = 0; k < 8; k++) {
    const root = armRoot(head, (k / 8) * TAU + PI / 8, 1.1, -0.2);
    arms.push({ root, k, joints: chainY(root, 13, 0.6, 0.48, 0.06, arm, (j, i, r) => i % 2 && add(j, new THREE.SphereGeometry(r * 0.35, 6, 5), dot, [0, -0.3, -r * 0.85])) });
  }
  const tents = [];
  for (const sx of [-1, 1]) {
    const root = armRoot(head, PI / 2 + sx * 0.5, 0.9, -0.3);
    const joints = chainY(root, 18, 0.62, 0.3, 0.13, arm);
    add(joints[17], new THREE.SphereGeometry(0.5, 14, 10), arm, [0, -0.8, 0], [0, 0, 0], [0.7, 1.6, 0.45]);
    for (let d = 0; d < 4; d++) add(joints[17], new THREE.SphereGeometry(0.1, 6, 5), dot, [0, -0.4 - d * 0.3, -0.25]);
    tents.push({ root, joints, sx });
  }
  const mouth = grp(head, [0, 0.0, 1.9]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      for (const { root, joints, k } of arms) {
        root.rotation.x = -0.75 + Math.sin(t * 0.8 + k) * 0.1;
        joints.forEach((j, i) => i && (j.rotation.x = 0.09 + Math.sin(t * 1.2 + k * 0.9 + i * 0.4) * 0.14));
      }
      for (const { root, joints, sx } of tents) {
        root.rotation.x = -0.25;
        joints.forEach((j, i) => i && ((j.rotation.x = -0.06 + Math.sin(t * 0.9 + i * 0.35 + sx) * 0.1), (j.rotation.z = Math.sin(t * 0.7 + i * 0.3) * 0.06 * sx)));
      }
      head.position.y = 6.5 + Math.sin(t * 0.7) * 0.4;
      fins.forEach((f, s) => (f.rotation.z = (s ? 0.4 : -0.4) + Math.sin(t * 2.2) * 0.25 * (s ? 1 : -1)));
      mouthMesh.scale.y = talk ? 0.5 + 0.45 * Math.abs(Math.sin(t * 11)) : 0.3;
      eyes.forEach((e) => (e.scale.y = blink(t, 2.4)));
    },
  };
}

// ---------------------------------------------------------------- 5 · Umibōzu, the sea giant (Izu)
function umibozu() {
  const G = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x1c2c66, emissive: 0x2a3c9a, emissiveIntensity: 0.5, roughness: 0.3, transparent: true, opacity: 0.94 });
  const top = grp(G);
  add(top, new THREE.SphereGeometry(3, 36, 26), body, [0, 9.2, 0]);
  add(top, new THREE.SphereGeometry(3.2, 30, 20), body, [0, 6.0, 0], [0, 0, 0], [1.28, 0.72, 1.0]);
  add(G, new THREE.CylinderGeometry(3.0, 4.2, 5.4, 32, 1, true), body, [0, 3.0, 0]);
  // stars inside the body
  const n = 180, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * 2.6, y = 1 + Math.random() * 10.5;
    pos.set([Math.cos(a) * rr * (y > 7 ? 0.9 : 1.2), y, Math.sin(a) * rr * 0.9], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  top.add(new THREE.Points(pg, new THREE.PointsMaterial({ map: dot(), color: 0xcfe8ff, size: 0.25, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
  // big glowing eyes, brows, a calm smile, rosy cheeks
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = grp(top, [sx * 1.15, 9.6, 2.45], [0, sx * 0.3, 0]);
    add(e, new THREE.SphereGeometry(0.85, 22, 16), glow(0xf4fbff));
    add(e, new THREE.SphereGeometry(0.87, 22, 8, 0, TAU, 0, 0.5), glow(0x101a40), [0, 0, 0], [PI / 2, 0, 0]);
    add(e, new THREE.SphereGeometry(0.14, 8, 6), glow(0xffffff), [0.22, 0.25, 0.8]);
    e.add(softHalo(0x9fd8ff, 3.2));
    add(top, new THREE.TorusGeometry(0.75, 0.09, 6, 20, PI * 0.8), glow(0x0c1430), [sx * 1.15, 10.75, 2.35], [0, 0, PI * 0.1]);
    add(top, new THREE.SphereGeometry(0.45, 12, 8), glow(0xff8ab8, { transparent: true, opacity: 0.45 }), [sx * 1.85, 8.55, 2.25], [0, 0, 0], [1, 0.6, 0.4]);
    eyes.push(e);
  }
  const smile = add(top, new THREE.TorusGeometry(0.85, 0.12, 8, 24, PI), glow(0xbfe8ff), [0, 8.4, 2.82], [0, 0, PI]);
  // little arms, one with a paper lantern
  const armR = grp(top, [2.9, 6.6, 0.6], [0, 0, -0.5]);
  add(armR, new THREE.CapsuleGeometry(0.55, 2.2, 6, 12), body, [0, -1.3, 0]);
  const lantern = grp(armR, [0, -2.8, 0.6]);
  add(lantern, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), glow(0x222222), [0, 0.4, 0]);
  add(lantern, new THREE.SphereGeometry(0.6, 18, 12), glow(0xffc66a), [0, -0.3, 0], [0, 0, 0], [1, 1.2, 1]);
  add(lantern, new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12), std(0x7a2a1a), [0, 0.42, 0]);
  add(lantern, new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12), std(0x7a2a1a), [0, -1.0, 0]);
  const lh = softHalo(0xffc66a, 3.5);
  lh.position.set(0, -0.3, 0);
  lantern.add(lh);
  const armL = grp(top, [-2.9, 6.6, 0.6], [0, 0, 0.6]);
  add(armL, new THREE.CapsuleGeometry(0.55, 2.0, 6, 12), body, [0, -1.2, 0]);
  // the swirl of water it rises from
  const rings = [];
  for (let k = 0; k < 5; k++) {
    const rg = add(G, new THREE.TorusGeometry(4.6 - k * 0.4, 0.14, 8, 64), new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 0.3 + k * 0.6, 0], [PI / 2, 0, 0]);
    rings.push(rg);
  }
  const mouth = grp(top, [0, 8.2, 3.0]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      top.position.y = Math.sin(t * 0.7) * 0.3;
      top.scale.set(1 + Math.sin(t * 1.1) * 0.015, 1 - Math.sin(t * 1.1) * 0.015, 1);
      top.rotation.z = Math.sin(t * 0.5) * 0.04;
      eyes.forEach((e) => (e.scale.y = blink(t, 1.2)));
      smile.scale.y = talk ? 0.7 + 0.5 * Math.abs(Math.sin(t * 10)) : 1;
      lantern.rotation.z = Math.sin(t * 1.3) * 0.2;
      armR.rotation.z = -0.5 + Math.sin(t * 0.8) * 0.08;
      armL.rotation.z = 0.6 + Math.sin(t * 0.9 + 1) * 0.1 + (talk ? Math.sin(t * 2) * 0.2 : 0);
      rings.forEach((r, k) => {
        r.rotation.z = t * (0.4 + k * 0.15) * (k % 2 ? -1 : 1);
        r.scale.setScalar(1 + Math.sin(t * 1.5 + k) * 0.04);
      });
    },
  };
}

// ---------------------------------------------------------------- 6 · The Flying Dutchman, a ghost ship (Kuril)
function tattered() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(128, 0);
  for (let x = 128; x >= 0; x -= 8) g.lineTo(x, 104 + Math.sin(x * 1.7) * 10 + ((x * 37) % 13));
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.ellipse(14 + ((i * 47) % 100), 18 + ((i * 29) % 80), 4 + (i % 3) * 3, 3 + (i % 2) * 4, i, 0, TAU);
    g.fill();
  }
  return new THREE.CanvasTexture(c);
}
function ghostShip() {
  const G = new THREE.Group();
  const ship = grp(G, [0, 3.5, 0]);
  const hullM = new THREE.MeshStandardMaterial({ color: 0x6affd2, emissive: 0x22c89a, emissiveIntensity: 0.6, roughness: 0.4, transparent: true, opacity: 0.78 });
  const woodM = new THREE.MeshStandardMaterial({ color: 0x3a9a82, emissive: 0x1a6a5a, emissiveIntensity: 0.45, roughness: 0.6, transparent: true, opacity: 0.85 });
  const warm = glow(0xffd27a);
  const ghostEye = glow(0xc8fff0);
  const hull = new THREE.BoxGeometry(3.4, 2.4, 11, 8, 5, 24);
  const p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i);
    const z = p.getZ(i), t = z / 5.5, y01 = (y + 1.2) / 2.4;
    const w = t > 0 ? 1 - t * t * 0.9 : 1 - t * t * t * t * 0.3;
    x *= w * (0.4 + 0.6 * Math.sqrt(Math.max(0, y01)));
    y += t * t * 0.7;
    p.setXYZ(i, x, y, z);
  }
  hull.computeVertexNormals();
  add(ship, hull, hullM);
  add(ship, new THREE.BoxGeometry(2.9, 0.12, 9.4), woodM, [0, 1.12, -0.3]);
  add(ship, new THREE.BoxGeometry(3.1, 1.7, 2.8), hullM, [0, 2.0, -4.2]);
  for (let k = 0; k < 3; k++) add(ship, new THREE.PlaneGeometry(0.5, 0.6), warm, [-0.9 + k * 0.9, 2.1, -5.62], [0, PI, 0]);
  for (const sx of [-1, 1]) {
    add(ship, new THREE.BoxGeometry(0.1, 0.5, 8.6), woodM, [sx * 1.45, 1.45, 0.2]);
    for (let k = 0; k < 6; k++) add(ship, new THREE.CircleGeometry(0.17, 12), ghostEye, [sx * (1.62 - Math.abs(k - 2.5) * 0.02), 0.45, -3.4 + k * 1.3], [0, sx * PI / 2, 0]);
    const l = add(ship, new THREE.SphereGeometry(0.25, 10, 8), warm, [sx * 1.3, 3.1, -5.4]);
    l.add(softHalo(0xffd27a, 2.2));
  }
  const sailTex = tattered();
  const sailM = new THREE.MeshStandardMaterial({ color: 0xd8fff2, emissive: 0x6affd2, emissiveIntensity: 0.55, transparent: true, opacity: 0.7, alphaMap: sailTex, side: THREE.DoubleSide, depthWrite: false });
  const sails = [];
  for (const [z, h, w] of [[3.1, 8.5, 3.6], [0, 10, 4.4], [-2.9, 8, 3.4]]) {
    add(ship, new THREE.CylinderGeometry(0.12, 0.16, h, 8), woodM, [0, 1.2 + h / 2, z]);
    for (const [hy, sw] of [[0.45, 1], [0.78, 0.8]]) {
      add(ship, new THREE.CylinderGeometry(0.07, 0.07, w * sw + 0.6, 6), woodM, [0, 1.2 + h * hy + h * 0.17, z], [0, 0, PI / 2]);
      const sg = new THREE.PlaneGeometry(w * sw, h * 0.3, 10, 6);
      const s = add(ship, sg, sailM, [0, 1.2 + h * hy + h * 0.02, z + 0.1]);
      s.userData.base = sg.attributes.position.array.slice();
      sails.push(s);
    }
  }
  const flag = add(ship, new THREE.PlaneGeometry(1.4, 0.5, 6, 1), sailM, [0.7, 11.4, 0]);
  add(ship, new THREE.CylinderGeometry(0.09, 0.12, 4.2, 8), woodM, [0, 2.3, 6.8], [1.2, 0, 0]);
  // the figurehead: a friendly carved sea maiden whose eyes light up when the ship speaks
  const fig = grp(ship, [0, 1.6, 5.75], [0.35, 0, 0]);
  add(fig, new THREE.SphereGeometry(0.55, 18, 14), hullM, [0, 0.6, 0.2]);
  add(fig, new THREE.SphereGeometry(0.62, 16, 10), woodM, [0, 0.75, -0.08], [0, 0, 0], [1.05, 1.0, 0.95]);
  add(fig, new THREE.CylinderGeometry(0.35, 0.55, 1.2, 12), hullM, [0, -0.3, 0]);
  const figEyes = [];
  for (const sx of [-1, 1]) figEyes.push(add(fig, new THREE.SphereGeometry(0.1, 8, 6), ghostEye, [sx * 0.2, 0.7, 0.7]));
  const halo = softHalo(0x8affe0, 3);
  halo.position.set(0, 0.6, 0.6);
  fig.add(halo);
  // ghostly mist around the ship
  const n = 220, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 9, Math.random() * 3 - 0.5, (Math.random() - 0.5) * 14], i * 3);
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mist = new THREE.Points(mg, new THREE.PointsMaterial({ map: dot(), color: 0x9affe0, size: 0.6, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  ship.add(mist);
  const mouth = grp(fig, [0, 0.5, 0.9]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      ship.rotation.z = Math.sin(t * 0.7) * 0.07;
      ship.rotation.x = Math.sin(t * 0.5) * 0.035;
      ship.position.y = 3.5 + Math.sin(t * 0.6) * 0.35;
      for (const s of sails) {
        const a = s.geometry.attributes.position, b = s.userData.base, w = s.geometry.parameters.width, h = s.geometry.parameters.height;
        for (let i = 0; i < a.count; i++) {
          const u = b[i * 3] / w + 0.5, v = b[i * 3 + 1] / h + 0.5;
          a.array[i * 3 + 2] = Math.sin(PI * u) * Math.sin(PI * v) * (0.9 + 0.25 * Math.sin(t * 2 + u * 4 + v * 2));
        }
        a.needsUpdate = true;
      }
      flag.rotation.y = Math.sin(t * 3) * 0.3;
      const k = talk ? 0.6 + 0.4 * Math.abs(Math.sin(t * 9)) : 0.35;
      figEyes.forEach((e) => e.scale.setScalar(0.8 + k));
      halo.material.opacity = 0.4 + k * 0.6;
      mist.rotation.y = t * 0.05;
    },
  };
}

// ---------------------------------------------------------------- 7 · Zaratan, the island turtle (Tonga)
function zaratan() {
  const G = new THREE.Group();
  const body = grp(G, [0, 3, 0]);
  const skin = shiny(0x6a8a5a, 0.18, { roughness: 0.6 });
  const shellG = new THREE.SphereGeometry(4.3, 44, 20, 0, TAU, 0, PI / 2);
  // painted shell plates (hexagons with darker seams)
  const sp = shellG.attributes.position, col = new Float32Array(sp.count * 3), c = new THREE.Color();
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i) / 1.3, z = sp.getZ(i) / 1.3;
    const q = (x * 0.577 - z / 3) / 1, r = (z * 2) / 3 / 1;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q - r);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs + q + r);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    const edge = Math.max(dq, dr, ds);
    const h = Math.sin(rq * 12.9 + rr * 78.2) * 0.5 + 0.5;
    c.setHSL(0.09 + h * 0.05, 0.45, 0.28 + h * 0.12);
    if (edge > 0.36) c.multiplyScalar(0.55);
    col.set([c.r, c.g, c.b], i * 3);
  }
  shellG.setAttribute('color', new THREE.BufferAttribute(col, 3));
  add(body, shellG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: 0x2a1a08, emissiveIntensity: 0.4 }), [0, 0, 0], [0, 0, 0], [1, 0.52, 1.2]);
  add(body, new THREE.TorusGeometry(4.3, 0.38, 8, 56), std(0x5a4024), [0, 0.05, 0], [PI / 2, 0, 0], [1, 1.2, 1]);
  add(body, new THREE.SphereGeometry(4.1, 32, 10, 0, TAU, PI / 2, PI / 2), std(0xe8d8a0), [0, 0.05, 0], [0, 0, 0], [1, 0.22, 1.18]);
  // the little island on the back
  const isl = grp(body, [0, 2.1, -0.2]);
  add(isl, new THREE.SphereGeometry(2.3, 26, 12, 0, TAU, 0, PI / 2), std(0xf2dc9a, { emissive: 0x6a5a2a, emissiveIntensity: 0.3 }), [0, -0.2, 0], [0, 0, 0], [1.25, 0.42, 1.15]);
  const palms = [];
  for (const [px, pz, lean] of [[-0.9, 0.3, 0.35], [0.7, -0.6, -0.3]]) {
    const root = grp(isl, [px, 0.6, pz], [0, 0, lean]);
    root.rotation.order = 'ZYX';
    const trunk = [];
    let pp = root;
    for (let k = 0; k < 6; k++) {
      const j = grp(pp, k ? [0, 0.55, 0] : [0, 0, 0]);
      add(j, new THREE.CylinderGeometry(0.11 - k * 0.008, 0.13 - k * 0.008, 0.6, 8), std(0x8a6a3a), [0, 0.28, 0]);
      add(j, new THREE.TorusGeometry(0.12, 0.025, 4, 10), std(0x6a4a2a), [0, 0.05, 0], [PI / 2, 0, 0]);
      trunk.push(j);
      pp = j;
    }
    const crown = grp(pp, [0, 0.6, 0]);
    for (let l = 0; l < 7; l++) {
      const leaf = grp(crown, [0, 0, 0], [0, (l / 7) * TAU, 0]);
      add(leaf, new THREE.PlaneGeometry(0.45, 1.9, 1, 4), std(0x3aa84a, { side: THREE.DoubleSide, emissive: 0x1a5a1a, emissiveIntensity: 0.4 }), [0, -0.2, 0.85], [-1.15, 0, 0]);
    }
    for (let k = 0; k < 3; k++) add(crown, new THREE.SphereGeometry(0.12, 8, 6), std(0x6a4a1a), [Math.cos(k * 2) * 0.15, -0.1, Math.sin(k * 2) * 0.15]);
    palms.push({ trunk, crown });
  }
  const hut = grp(isl, [0.9, 0.5, 0.8], [0, -0.5, 0]);
  add(hut, new THREE.BoxGeometry(0.9, 0.7, 0.8), std(0xd8b070), [0, 0.35, 0]);
  add(hut, new THREE.ConeGeometry(0.85, 0.7, 4), std(0xc89a4a), [0, 1.05, 0], [0, PI / 4, 0]);
  add(hut, new THREE.PlaneGeometry(0.25, 0.4), glow(0xffd27a), [0, 0.25, 0.41]);
  add(isl, new THREE.BoxGeometry(0.6, 0.35, 0.4), std(0x6a3a1a), [-0.4, 0.55, 1.1]);
  add(isl, new THREE.SphereGeometry(0.22, 10, 6, 0, TAU, 0, PI / 2), glow(0xffd84a), [-0.4, 0.72, 1.1]);
  for (let k = 0; k < 10; k++) add(isl, new THREE.ConeGeometry(0.08, 0.35, 4), std(0x4ab84a), [Math.cos(k * 2.3) * 1.8, 0.35, Math.sin(k * 2.3) * 1.5]);
  // head with wise eyes, bushy brows and a smile
  const neck = grp(body, [0, 0.2, 4.9]);
  add(neck, new THREE.CylinderGeometry(0.75, 0.9, 1.6, 16), skin, [0, 0, 0.3], [PI / 2 - 0.3, 0, 0]);
  const head = grp(neck, [0, 0.45, 1.3]);
  add(head, new THREE.SphereGeometry(1.1, 24, 18), skin, [0, 0, 0], [0, 0, 0], [1, 0.85, 1.2]);
  add(head, new THREE.ConeGeometry(0.45, 0.6, 12), std(0x4a5a3a), [0, -0.15, 1.3], [PI / 2, 0, 0], [1.2, 1, 0.6]);
  const eyes = [eye(head, 0.3, [-0.55, 0.38, 0.75], { iris: 0x7a4a1a, ry: -0.4 }), eye(head, 0.3, [0.55, 0.38, 0.75], { iris: 0x7a4a1a, ry: 0.4 })];
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) add(head, new THREE.SphereGeometry(0.12, 8, 6), std(0xf4f4f0), [sx * (0.35 + k * 0.12), 0.72 + Math.sin(k) * 0.04, 0.85 - k * 0.04]);
  const jaw = grp(head, [0, -0.35, 0.4]);
  add(jaw, new THREE.SphereGeometry(0.75, 18, 10, 0, TAU, PI / 2, PI / 2), std(0x4a5a3a), [0, 0.12, 0.35], [0, 0, 0], [1, 0.5, 1.2]);
  const flips = [];
  for (const [sx, z, big] of [[-1, 2.4, 1], [1, 2.4, 1], [-1, -3.2, 0.65], [1, -3.2, 0.65]]) {
    const f = grp(body, [sx * 3.6, -0.3, z]);
    add(f, new THREE.SphereGeometry(1, 18, 10), skin, [sx * 1.6 * big, 0, big > 0.8 ? 0.4 : -0.2], [0, sx * 0.4, 0], [2.4 * big, 0.25, 1.0 * big]);
    f.userData = { sx, big };
    flips.push(f);
  }
  const mouth = grp(head, [0, -0.25, 1.5]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      flips.forEach((f) => {
        const { sx, big } = f.userData;
        f.rotation.z = sx * Math.sin(t * 0.9 + (big > 0.8 ? 0 : 1.5)) * (big > 0.8 ? 0.45 : 0.25);
        f.rotation.y = sx * Math.cos(t * 0.9) * 0.2;
      });
      body.position.y = 3 + Math.sin(t * 0.9) * 0.25;
      body.rotation.z = Math.sin(t * 0.45) * 0.03;
      neck.rotation.x = Math.sin(t * 0.6) * 0.08;
      head.rotation.y = Math.sin(t * 0.35) * 0.2;
      jaw.rotation.x = talk ? 0.15 + 0.15 * Math.abs(Math.sin(t * 10)) : 0.02;
      eyes.forEach((e) => (e.scale.y = blink(t, 0.4)));
      palms.forEach(({ trunk, crown }, s) => {
        trunk.forEach((j, i) => (j.rotation.z = Math.sin(t * 1.1 + s + i * 0.3) * 0.03));
        crown.rotation.y = Math.sin(t * 0.8 + s) * 0.15;
      });
    },
  };
}

const BUILD = { java: dragon, mariana: leviathan, puertorico: captain, southsandwich: kraken, izu: umibozu, kuril: ghostShip, tonga: zaratan };

// Build the creature of a trench. size = largest extent in world units (the hall makes it 4 × as big as the sub).
export function buildFable(id, size = 0) {
  const f = (BUILD[id] || dragon)();
  f.anim(0, 0, false);
  f.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(f.group);
  const dim = box.getSize(new THREE.Vector3());
  f.extent = Math.max(dim.x, dim.y, dim.z);
  f.center = box.getCenter(new THREE.Vector3());
  f.bottom = box.min.y;
  if (size > 0) {
    const k = size / f.extent;
    f.group.scale.setScalar(k);
    f.extent = size;
    f.center.multiplyScalar(k);
    f.bottom *= k;
  }
  f.info = FABLES[id] || FABLES.java;
  return f;
}
