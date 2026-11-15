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

// ---------------------------------------------------------------- the seven creatures in the order of the trenches (names, legend, sources)
export const FABLES = {
  java: {
    name: { en: 'Moon-Pearl Dragon', de: 'Mondperlen-Drache' },
    legend: {
      en: 'Inspired by the Bakunawa of Philippine legend: a giant sea serpent said to swallow the moon – people banged pots and pans until it spat the moon out again.',
      de: 'Inspiriert von der Bakunawa aus Sagen der Philippinen: eine riesige Seeschlange, die den Mond verschluckt haben soll – die Menschen trommelten auf Töpfe und Pfannen, bis sie ihn wieder ausspuckte.',
    },
    source: [['Wikipedia: Bakunawa', 'https://en.wikipedia.org/wiki/Bakunawa']],
  },
  southsandwich: {
    name: { en: 'Captain Bushybeard', de: 'Kapitän Rauschebart' },
    legend: {
      en: 'Captain Bushybeard comes from the bedtime stories that Isabella’s dad tells her – a friendly pirate with the longest beard on all seven seas. His merry yellow crew, the Gigglings, and the sea fairy Princess Perla live with him.',
      de: 'Kapitän Rauschebart stammt aus den Gutenachtgeschichten, die Isabellas Papa erzählt – ein freundlicher Pirat mit dem längsten Bart aller sieben Meere. Bei ihm wohnen seine fröhliche gelbe Mannschaft, die Kicherlinge, und die Meeresfee Prinzessin Perla.',
    },
    source: [],
  },
  puertorico: {
    name: { en: 'Ice Kraken', de: 'Eis-Kraken' },
    legend: {
      en: 'The Kraken is a sea monster from Norwegian sailors’ tales, perhaps imagined from sightings of giant squid. Bishop Erik Pontoppidan described it in his Natural History of Norway (1752).',
      de: 'Der Kraken ist ein Seeungeheuer aus den Erzählungen norwegischer Seeleute, vielleicht ausgedacht nach Sichtungen von Riesenkalmaren. Bischof Erik Pontoppidan beschrieb ihn 1752 in seiner Naturgeschichte Norwegens.',
    },
    source: [['Britannica: kraken', 'https://www.britannica.com/topic/kraken']],
  },
  izu: {
    name: { en: 'Captain Eight-Arms', de: 'Kapitän Achtarm' },
    legend: {
      en: 'Sailors told of colossal octopuses that could grab whole ships – in 1801 the naturalist Pierre Denys de Montfort even drew one attacking a sailing ship. Captain Eight-Arms is our friendly pirate version.',
      de: 'Seeleute erzählten von gewaltigen Kraken, die ganze Schiffe packen konnten – 1801 zeichnete der Naturforscher Pierre Denys de Montfort sogar einen, der ein Segelschiff angreift. Kapitän Achtarm ist unsere freundliche Piraten-Version.',
    },
    source: [['Biodiversity Heritage Library: Release the Kraken!', 'https://blog.biodiversitylibrary.org/2014/10/release-kraken']],
  },
  kuril: {
    name: { en: 'Umibōzu the Sea Giant', de: 'Umibōzu, der Meeresriese' },
    legend: {
      en: 'Umibōzu (“sea monk”) is a yōkai from Japanese folklore: a giant dark figure with a round head that suddenly rises from the sea in front of sailors.',
      de: 'Umibōzu („Meeresmönch“) ist ein Yōkai aus japanischen Volkssagen: eine riesige dunkle Gestalt mit rundem Kopf, die plötzlich vor Seeleuten aus dem Meer auftaucht.',
    },
    source: [['Wikipedia: Umibōzu', 'https://en.wikipedia.org/wiki/Umib%C5%8Dzu']],
  },
  tonga: {
    name: { en: 'The Flying Dutchman', de: 'Der Fliegende Holländer' },
    legend: {
      en: 'The Flying Dutchman is a legendary ghost ship of European sailors’ lore, doomed to sail the seas forever and never reach port.',
      de: 'Der Fliegende Holländer ist ein sagenhaftes Geisterschiff aus der Seefahrt Europas – dazu verdammt, ewig über die Meere zu segeln, ohne je einen Hafen zu erreichen.',
    },
    source: [['Britannica: Flying Dutchman', 'https://www.britannica.com/topic/Flying-Dutchman']],
  },
  mariana: {
    name: { en: 'Leviathan', de: 'Leviathan' },
    legend: {
      en: 'Leviathan is a giant sea monster from ancient Middle Eastern myths and the Hebrew Bible – sometimes a sea serpent, sometimes a whale-like dragon.',
      de: 'Leviathan ist ein riesiges Meeresungeheuer aus alten Mythen des Nahen Ostens und der Hebräischen Bibel – mal eine Seeschlange, mal ein walartiger Drache.',
    },
    source: [['Britannica: Leviathan', 'https://www.britannica.com/topic/Leviathan-Middle-Eastern-mythology']],
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

// ---------------------------------------------------------------- 7 · Leviathan (Mariana)
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

// ---------------------------------------------------------------- 4 · Captain Eight-Arms, octopus pirate (Izu)
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

// ---------------------------------------------------------------- 3 · Ice Kraken (Puerto Rico)
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

// ---------------------------------------------------------------- 5 · Umibōzu, the sea giant (Kuril)
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

// ---------------------------------------------------------------- 6 · The Flying Dutchman, a ghost ship (Tonga)
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
    turn: 0.5,
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

// ---------------------------------------------------------------- 2 · Captain Bushybeard (South Sandwich)
// A friendly pirate from the owner's bedtime stories for Isabella: tricorn hat, eye patch, a hook for a hand, a
// wooden leg and an enormous beard. One of his crew sits on his shoulder; in his hall a hundred of them hop
// about, and a little sea fairy flies around. (The crew and the fairy are original designs.)

// a crew member ("Kicherling"): round, yellow, striped sailor shirt, red spotted bandana, two big eyes
function mergeColored(parts) {
  let n = 0;
  const geos = parts.map(([geo, hex, m, paintFn]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.set(paintFn ? paintFn(p.getX(i), p.getY(i), p.getZ(i)) : hex);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    n += p.count;
    return g;
  });
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(n * 3);
    let o = 0;
    for (const g of geos) {
      arr.set(g.attributes[name].array, o * 3);
      o += g.attributes.position.count;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  out.computeBoundingSphere();
  return out;
}
const T4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
let crewGeo = null;
export function crewGeometry() {
  if (crewGeo) return crewGeo;
  const YEL = 0xffd23a;
  const shirt = (x, y) => (y > 0.82 ? YEL : Math.floor((y + 1) * 9) % 2 ? 0x2f5fd8 : 0xf4f6ff);
  const bandana = (x, y, z) => (Math.sin(Math.atan2(z, x) * 10) * Math.sin(y * 18) > 0.72 ? 0xffffff : 0xe2322a);
  const body = mergeColored([
    [new THREE.SphereGeometry(0.9, 24, 18), 0, T4(0, 1.05, 0, 0, 0, 0, 1, 1.05, 0.95), shirt],
    [new THREE.SphereGeometry(0.93, 24, 8, 0, TAU, 0, 0.95), 0, T4(0, 1.12, -0.02, -0.18, 0, 0, 1, 1.0, 0.98), bandana],
    [new THREE.ConeGeometry(0.16, 0.42, 6), 0xe2322a, T4(0.1, 1.55, -0.92, -2.2, 0, 0.5)],
    [new THREE.ConeGeometry(0.16, 0.42, 6), 0xe2322a, T4(-0.12, 1.5, -0.9, -2.0, 0, -0.6)],
    [new THREE.SphereGeometry(0.25, 14, 10), 0xffffff, T4(-0.29, 1.27, 0.72)],
    [new THREE.SphereGeometry(0.25, 14, 10), 0xffffff, T4(0.29, 1.27, 0.72)],
    [new THREE.SphereGeometry(0.12, 10, 8), 0x2a1a10, T4(-0.29, 1.27, 0.94)],
    [new THREE.SphereGeometry(0.12, 10, 8), 0x2a1a10, T4(0.29, 1.27, 0.94)],
    [new THREE.SphereGeometry(0.04, 6, 4), 0xffffff, T4(-0.25, 1.32, 1.04)],
    [new THREE.SphereGeometry(0.04, 6, 4), 0xffffff, T4(0.33, 1.32, 1.04)],
    [new THREE.TorusGeometry(0.24, 0.05, 6, 14, PI), 0x8a1a1a, T4(0, 0.97, 0.84, -0.25, 0, PI)],
    [new THREE.SphereGeometry(0.1, 8, 6), 0xffa0a0, T4(-0.5, 1.02, 0.66, 0, 0, 0, 1, 0.6, 0.5)],
    [new THREE.SphereGeometry(0.1, 8, 6), 0xffa0a0, T4(0.5, 1.02, 0.66, 0, 0, 0, 1, 0.6, 0.5)],
    [new THREE.SphereGeometry(0.3, 10, 8), 0x6a3a1a, T4(-0.33, 0.13, 0.12, 0, 0, 0, 0.85, 0.45, 1.25)],
    [new THREE.SphereGeometry(0.3, 10, 8), 0x6a3a1a, T4(0.33, 0.13, 0.12, 0, 0, 0, 0.85, 0.45, 1.25)],
  ]);
  const arm = mergeColored([
    [new THREE.CylinderGeometry(0.11, 0.13, 0.62, 8), YEL, T4(0, -0.31, 0)],
    [new THREE.SphereGeometry(0.15, 10, 8), YEL, T4(0, -0.64, 0)],
  ]);
  crewGeo = { body, arm, mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05, emissive: 0x2a2000, emissiveIntensity: 0.35 }) };
  return crewGeo;
}
// one crew member as a normal object (the one on the captain's shoulder)
function crewMember() {
  const G = crewGeometry(), g = new THREE.Group();
  g.add(new THREE.Mesh(G.body, G.mat));
  const arms = [-1, 1].map((sx) => {
    const a = new THREE.Mesh(G.arm, G.mat);
    a.position.set(sx * 0.84, 1.15, 0.05);
    g.add(a);
    return a;
  });
  return { group: g, arms };
}

// the sea fairy princess: shell dress, translucent fin wings, a starfish crown and a pearl wand
function seaFairy() {
  const G = new THREE.Group();
  const skin = std(0xffdcc8, { roughness: 0.55, emissive: 0x5a3020, emissiveIntensity: 0.2 });
  const hairM = shiny(0xb98cff, 0.3, { roughness: 0.4 });
  const dressG = new THREE.LatheGeometry([[0, 0], [1.05, 0.05], [0.95, 0.5], [0.6, 1.35], [0.32, 2.0], [0.28, 2.3], [0, 2.35]].map(([a, b]) => new THREE.Vector2(a, b)), 28);
  const dp = dressG.attributes.position, dc = new Float32Array(dp.count * 3), c = new THREE.Color();
  for (let i = 0; i < dp.count; i++) {
    const y = dp.getY(i), a = Math.atan2(dp.getZ(i), dp.getX(i));
    c.set(0x5ff0e0).lerp(new THREE.Color(0xff8ab8), Math.min(1, y / 2.3));
    if (y < 0.5) c.lerp(new THREE.Color(0xffffff), 0.35 * (0.5 + 0.5 * Math.sin(a * 14))); // scalloped shell hem
    dc.set([c.r, c.g, c.b], i * 3);
  }
  dressG.setAttribute('color', new THREE.BufferAttribute(dc, 3));
  const body = grp(G, [0, 0, 0]);
  add(body, dressG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.2, emissive: 0x3a2a4a, emissiveIntensity: 0.45 }));
  for (let k = 0; k < 7; k++) add(body, new THREE.SphereGeometry(0.06, 6, 4), glow(0xffffff), [Math.cos(k * 0.9) * 0.55, 0.6 + (k % 3) * 0.35, Math.sin(k * 0.9) * 0.55 * 0.9 + 0.1]);
  const head = grp(body, [0, 2.75, 0]);
  add(head, new THREE.SphereGeometry(0.5, 22, 16), skin);
  eye(head, 0.13, [-0.17, 0.05, 0.42], { iris: 0x7a3aff, ry: -0.2 });
  eye(head, 0.13, [0.17, 0.05, 0.42], { iris: 0x7a3aff, ry: 0.2 });
  add(head, new THREE.TorusGeometry(0.1, 0.025, 6, 12, PI), glow(0xd84a6a), [0, -0.17, 0.46], [0, 0, PI]);
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.07, 8, 6), glow(0xff9ab8, { transparent: true, opacity: 0.6 }), [sx * 0.3, -0.08, 0.38]);
  add(head, new THREE.SphereGeometry(0.54, 20, 12, 0, TAU, 0, PI * 0.55), hairM, [0, 0.05, -0.04]);
  add(head, new THREE.SphereGeometry(0.28, 14, 10), hairM, [0, 0.55, -0.15]);
  add(head, new THREE.SphereGeometry(0.09, 8, 6), glow(0xffffff), [0, 0.6, 0.12]);
  const curls = [];
  for (const sx of [-1, 1]) curls.push(chainY(grp(head, [sx * 0.42, -0.05, -0.05]), 5, 0.22, 0.12, 0.07, hairM));
  // a starfish crown with pearls
  const crown = grp(head, [0, 0.5, 0.18], [-0.3, 0, 0]);
  for (let k = 0; k < 5; k++) add(crown, new THREE.ConeGeometry(0.07, 0.3, 5), shiny(0xff7a4a, 0.4), [Math.cos((k / 5) * TAU + PI / 2) * 0.12, Math.sin((k / 5) * TAU + PI / 2) * 0.12, 0], [0, 0, (k / 5) * TAU]);
  add(crown, new THREE.SphereGeometry(0.06, 8, 6), glow(0xffffff), [0, 0, 0.04]);
  // arms, one with the pearl wand
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = grp(body, [sx * 0.3, 2.15, 0.05]);
    add(a, new THREE.CylinderGeometry(0.06, 0.07, 0.8, 8), skin, [0, -0.4, 0]);
    add(a, new THREE.SphereGeometry(0.08, 8, 6), skin, [0, -0.82, 0]);
    arms.push(a);
  }
  const wand = grp(arms[1], [0, -0.85, 0.05], [0.4, 0, 0]);
  add(wand, new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), shiny(0xf2c24a, 0.5, { metalness: 0.8 }), [0, 0.5, 0]);
  add(wand, new THREE.SphereGeometry(0.14, 12, 10), glow(0xfff0fa), [0, 1.1, 0]);
  const wh = softHalo(0xffd8ff, 1.4);
  wh.position.set(0, 1.1, 0);
  wand.add(wh);
  // four translucent fin wings
  const wingM = new THREE.MeshStandardMaterial({ color: 0xd8f8ff, emissive: 0x8ad8ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const wings = [];
  for (const sx of [-1, 1]) {
    for (const [y, sz, tilt] of [[2.1, 1.3, 0.35], [1.6, 0.9, -0.3]]) {
      const w = grp(body, [sx * 0.12, y, -0.2]);
      add(w, new THREE.CircleGeometry(1, 20), wingM, [sx * sz * 0.9, sz * 0.25, 0], [0, 0, sx * tilt], [sz * 0.95, sz * 0.5, 1]);
      w.userData.sx = sx;
      wings.push(w);
    }
  }
  return {
    group: G,
    update(t) {
      wings.forEach((w, i) => (w.rotation.y = w.userData.sx * (0.35 + Math.sin(t * 20 + i * 0.4) * 0.55)));
      arms[0].rotation.z = -0.4 + Math.sin(t * 2) * 0.2;
      arms[1].rotation.z = 0.5 + Math.sin(t * 1.6) * 0.3;
      arms[1].rotation.x = -0.6 + Math.sin(t * 1.3) * 0.3;
      body.rotation.z = Math.sin(t * 1.1) * 0.12;
      curls.forEach((cl) => cl.forEach((j, i) => (j.rotation.z = Math.sin(t * 3 + i) * 0.15)));
    },
  };
}

// the captain's company on their own (results screen turntables): sized to about 6 units
export function buildCompanion(kind) {
  if (kind === 'perla') {
    const f = seaFairy();
    f.update(0.4);
    f.group.scale.setScalar(6 / 3.6);
    return f.group;
  }
  const m = crewMember();
  m.arms[0].rotation.z = -2.4;
  m.group.scale.setScalar(6 / 2.4);
  return m.group;
}

function rauschebart() {
  const G = new THREE.Group();
  const skin = std(0xf2c09a, { roughness: 0.55, emissive: 0x5a2a1a, emissiveIntensity: 0.2 });
  const coat = shiny(0x1c2c6a, 0.18, { roughness: 0.55 });
  const red = shiny(0xc8282a, 0.2, { roughness: 0.5 });
  const gold = shiny(0xf2c24a, 0.4, { metalness: 0.85, roughness: 0.28 });
  const black = std(0x1a1414, { roughness: 0.6 });
  const wood = std(0x8a5a2a, { roughness: 0.75 });
  const shirtM = std(0xf4eedc, { roughness: 0.7 });
  const beardM = shiny(0xb04a1c, 0.18, { roughness: 0.8 });
  const steel = std(0xd8e0ea, { metalness: 0.9, roughness: 0.2, emissive: 0x3a4250, emissiveIntensity: 0.3 });
  const body = grp(G);
  // legs: a boot and a wooden peg
  add(body, new THREE.CylinderGeometry(0.42, 0.38, 2.0, 14), coat, [0.55, 1.6, 0]);
  add(body, new THREE.CylinderGeometry(0.4, 0.42, 0.9, 14), black, [0.55, 0.45, 0.05]);
  add(body, new THREE.SphereGeometry(0.42, 14, 10), black, [0.55, 0.12, 0.35], [0, 0, 0], [1, 0.5, 1.5]);
  add(body, new THREE.CylinderGeometry(0.42, 0.38, 1.1, 14), coat, [-0.55, 2.1, 0]);
  add(body, new THREE.CylinderGeometry(0.3, 0.14, 1.65, 10), wood, [-0.55, 0.82, 0]);
  add(body, new THREE.TorusGeometry(0.31, 0.06, 6, 14), steel, [-0.55, 1.6, 0], [PI / 2, 0, 0]);
  // a big belly in a long navy coat with gold buttons, a red sash and a belt
  add(body, new THREE.LatheGeometry([[0, 2.0], [1.55, 2.05], [1.45, 3.0], [1.3, 4.2], [1.15, 5.4], [0.9, 6.0], [0, 6.1]].map(([a, b]) => new THREE.Vector2(a, b)), 30), coat);
  add(body, new THREE.SphereGeometry(1.1, 22, 16), shirtM, [0, 4.0, 0.62], [0, 0, 0], [0.9, 1.25, 0.75]);
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) add(body, new THREE.SphereGeometry(0.1, 8, 6), gold, [sx * 0.72, 5.3 - k * 0.55, 1.05 - k * 0.02]);
  add(body, new THREE.TorusGeometry(1.42, 0.2, 8, 30), red, [0, 3.35, 0], [PI / 2, 0, 0]);
  add(body, new THREE.TorusGeometry(1.4, 0.09, 6, 30), black, [0, 3.0, 0], [PI / 2, 0, 0]);
  add(body, new THREE.BoxGeometry(0.5, 0.42, 0.12), gold, [0, 3.0, 1.42]);
  add(body, new THREE.BoxGeometry(0.28, 0.9, 0.1), red, [0.9, 2.85, 1.05], [0, 0.6, 0.2]);
  for (const sx of [-1, 1]) {
    add(body, new THREE.BoxGeometry(0.8, 0.18, 0.55), gold, [sx * 1.05, 5.95, 0], [0, 0, sx * -0.25]);
    for (let k = 0; k < 5; k++) add(body, new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4), gold, [sx * (0.75 + k * 0.13), 5.68, 0.18]);
  }
  // arms: the right one ends in a big hook, the left one waves
  const armR = grp(body, [-1.25, 5.6, 0.1], [0.15, 0, -0.35]);
  add(armR, new THREE.CylinderGeometry(0.36, 0.32, 2.0, 12), coat, [0, -1.0, 0]);
  add(armR, new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12), red, [0, -1.95, 0]);
  add(armR, new THREE.CylinderGeometry(0.22, 0.12, 0.45, 10), steel, [0, -2.3, 0]);
  add(armR, new THREE.TorusGeometry(0.38, 0.09, 8, 20, PI * 1.35), steel, [0.32, -2.8, 0], [0, 0, PI * 0.8]);
  add(armR, new THREE.ConeGeometry(0.1, 0.25, 8), steel, [0.68, -2.62, 0], [0, 0, -0.6]);
  const armL = grp(body, [1.25, 5.6, 0.1], [0, 0, 0.35]);
  add(armL, new THREE.CylinderGeometry(0.36, 0.32, 1.9, 12), coat, [0, -0.95, 0]);
  add(armL, new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12), red, [0, -1.85, 0]);
  const hand = grp(armL, [0, -2.25, 0]);
  add(hand, new THREE.SphereGeometry(0.34, 14, 10), skin, [0, 0, 0], [0, 0, 0], [0.9, 1.1, 0.7]);
  add(hand, new THREE.CapsuleGeometry(0.09, 0.25, 4, 8), skin, [0.32, 0.12, 0.05], [0, 0, -0.9]);
  // head: rosy face, big nose, one eye and a patch, bushy brows
  const head = grp(body, [0, 6.9, 0.25]);
  add(head, new THREE.SphereGeometry(0.95, 26, 20), skin, [0, 0, 0], [0, 0, 0], [1, 1.05, 0.95]);
  add(head, new THREE.SphereGeometry(0.28, 14, 10), std(0xe89a80, { roughness: 0.5 }), [0, -0.05, 0.92]);
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.22, 10, 8), glow(0xff8a8a, { transparent: true, opacity: 0.5 }), [sx * 0.5, -0.12, 0.72]);
  const eyeL = eye(head, 0.2, [0.36, 0.25, 0.78], { iris: 0x3a7a2a, ry: 0.25 });
  add(head, new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), black, [-0.36, 0.25, 0.86], [PI / 2, 0, 0.2]);
  add(head, new THREE.TorusGeometry(0.98, 0.04, 6, 30), black, [0, 0.35, 0], [PI / 2 - 0.3, 0.3, 0]);
  for (const sx of [-1, 1]) add(head, new THREE.BoxGeometry(0.52, 0.14, 0.18), beardM, [sx * 0.37, 0.52, 0.8], [0, 0, sx * -0.18]);
  const mouthMesh = add(head, new THREE.SphereGeometry(0.2, 12, 8), glow(0x5a0a12), [0, -0.5, 0.82], [0, 0, 0], [1.4, 0.5, 0.4]);
  // the enormous beard: wide, bushy and so long it reaches down to the boots
  const beard = [];
  let bp = grp(head, [0, -0.55, 0.55]);
  const bw = [1.35, 1.75, 1.65, 1.2, 0.7];
  const beardHi = shiny(0xc85a26, 0.2, { roughness: 0.8 });
  for (let k = 0; k < 5; k++) {
    const j = grp(bp, k ? [0, -0.95, 0.04] : [0, 0, 0]);
    add(j, new THREE.SphereGeometry(1, 24, 16), beardM, [0, -0.48, 0.05], [0, 0, 0], [bw[k], 0.72, 0.6]);
    for (const a of [-1.2, -0.6, 0.6, 1.2]) add(j, new THREE.SphereGeometry(0.26, 10, 8), beardHi, [Math.sin(a) * bw[k] * 0.82, -0.42 + Math.abs(a) * 0.1, 0.38 + Math.cos(a) * 0.12]);
    beard.push(j);
    bp = j;
  }
  for (let k = 0; k < 3; k++) add(beard[4], new THREE.SphereGeometry(0.13, 10, 8), gold, [(k - 1) * 0.3, -1.0, 0.3]);
  for (const sx of [-1, 1]) {
    const braid = chainY(grp(beard[1], [sx * 1.55, -0.5, 0.15]), 5, 0.42, 0.22, 0.12, beardHi);
    add(braid[4], new THREE.SphereGeometry(0.13, 8, 6), gold, [0, -0.42, 0]);
  }
  // the curly moustache
  const tache = [];
  for (const sx of [-1, 1]) tache.push(add(head, new THREE.TorusGeometry(0.42, 0.14, 8, 18, PI * 1.25), beardM, [sx * 0.42, -0.32, 0.86], [0, sx > 0 ? PI : 0, -0.35]));
  // a big tricorn with gold trim, a golden anchor and a red feather
  const hat = grp(head, [0, 0.72, -0.05], [-0.12, 0, 0]);
  add(hat, new THREE.CylinderGeometry(0.85, 1.0, 0.85, 24), black, [0, 0.4, 0]);
  add(hat, new THREE.CylinderGeometry(1.9, 1.9, 0.13, 3), black, [0, -0.02, 0]);
  for (let e = 0; e < 3; e++) {
    const th = PI / 3 + (e * TAU) / 3;
    const b = add(hat, new THREE.BoxGeometry(1.9 * 1.7, 0.62, 0.12), black, [Math.sin(th) * 0.9, 0.22, Math.cos(th) * 0.9]);
    b.rotation.order = 'YXZ';
    b.rotation.set(-0.55, th, 0);
  }
  add(hat, new THREE.TorusGeometry(1.86, 0.05, 4, 3), gold, [0, 0.02, 0], [PI / 2, 0, -PI / 2]);
  const anchor = grp(hat, [0, 0.42, 1.08], [-0.45, 0, 0]);
  add(anchor, new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), gold);
  add(anchor, new THREE.TorusGeometry(0.17, 0.04, 6, 14, PI), gold, [0, -0.2, 0], [0, 0, PI]);
  add(anchor, new THREE.BoxGeometry(0.3, 0.05, 0.05), gold, [0, 0.14, 0]);
  add(anchor, new THREE.TorusGeometry(0.06, 0.025, 6, 10), gold, [0, 0.3, 0]);
  const feather = chainY(grp(hat, [0.75, 0.55, -0.3], [PI - 0.5, 0, -0.5]), 6, 0.35, 0.16, 0.05, red);
  // a crew member on his left shoulder
  const mate = crewMember();
  mate.group.scale.setScalar(0.6);
  mate.group.position.set(1.15, 6.08, -0.05);
  body.add(mate.group);
  const mouth = grp(head, [0, -0.5, 1.0]);
  return {
    group: G,
    mouth,
    anim(t, dt, talk) {
      body.position.y = Math.abs(Math.sin(t * 0.9)) * 0.06;
      body.rotation.z = Math.sin(t * 0.9) * 0.03;
      head.rotation.y = Math.sin(t * 0.5) * 0.15;
      head.rotation.x = Math.sin(t * 0.7) * 0.04;
      mouthMesh.scale.y = talk ? 0.5 + 0.5 * Math.abs(Math.sin(t * 11)) : 0.35;
      tache.forEach((m, s) => (m.rotation.z = -0.35 + (talk ? Math.sin(t * 11) * 0.1 : 0)));
      beard.forEach((j, k) => k && (j.rotation.x = Math.sin(t * 0.9 - k * 0.5) * 0.035 + (talk ? Math.sin(t * 11) * 0.01 : 0)));
      armL.rotation.z = 0.35 + 1.9 + Math.sin(t * 3) * 0.35; // waving
      armL.rotation.x = -0.2;
      hand.rotation.z = Math.sin(t * 6) * 0.3;
      armR.rotation.x = 0.15 + Math.sin(t * 0.8) * 0.08;
      eyeL.scale.y = blink(t, 0.6);
      feather.forEach((j, i) => (j.rotation.z = Math.sin(t * 1.8 + i * 0.5) * 0.12));
      // the little mate giggles and waves
      mate.group.position.y = 6.08 + Math.abs(Math.sin(t * 4)) * 0.12;
      mate.arms[0].rotation.z = -2.4 + Math.sin(t * 7) * 0.5;
      mate.arms[1].rotation.z = 0.3 + Math.sin(t * 5) * 0.2;
    },
    // in his hall: a hundred crew members hop about and a sea fairy flies around
    makeExtras({ R, dais, subLen }) {
      const g = new THREE.Group();
      const CG = crewGeometry(), N = 100;
      const bodies = new THREE.InstancedMesh(CG.body, CG.mat, N), armsM = new THREE.InstancedMesh(CG.arm, CG.mat, N * 2);
      bodies.frustumCulled = armsM.frustumCulled = false;
      g.add(bodies, armsM);
      const rnd = Math.random, crew = [];
      const spot = () => {
        const a = rnd() * TAU, d = dais + 2.5 + rnd() * Math.max(2, R - dais - 9);
        return [Math.cos(a) * d, Math.sin(a) * d];
      };
      const KINDS = ['hop', 'walk', 'walk', 'flip', 'spin', 'dance', 'wave', 'tumble', 'laugh'];
      for (let i = 0; i < N; i++) {
        const [x, z] = spot();
        crew.push({ x, z, yaw: rnd() * TAU, b: 'hop', tm: rnd() * 3, ph: rnd(), s: (subLen * 0.36) / 2.1 * (0.85 + rnd() * 0.3), tx: x, tz: z, d: 3 });
      }
      const pick = (c) => {
        c.b = KINDS[(rnd() * KINDS.length) | 0];
        c.d = c.b === 'flip' ? 1.1 : c.b === 'tumble' ? 2.4 : 2 + rnd() * 3;
        c.tm = c.d;
        if (c.b === 'walk') [c.tx, c.tz] = spot();
      };
      const m4 = new THREE.Matrix4(), mA = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), p3 = new THREE.Vector3(), s3 = new THREE.Vector3();
      const fairy = seaFairy();
      fairy.group.scale.setScalar((subLen * 0.75) / 3.2);
      g.add(fairy.group);
      const TN = 70, tp = new Float32Array(TN * 3).fill(9999);
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
      g.add(new THREE.Points(tg, new THREE.PointsMaterial({ map: dot(), color: 0xffd8ff, size: 0.55, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
      let ti = 0, tAcc = 0;
      const prev = new THREE.Vector3();
      return {
        group: g,
        update(t, dt, sub) {
          crew.forEach((c, i) => {
            c.tm -= dt;
            if (c.tm <= 0) pick(c);
            const k = 1 - c.tm / c.d; // 0..1 through the current trick
            let y = 0, sx = 1, sy = 1, rx = 0, rz = 0, aL = 0.35, aR = 0.35, h = 0.55 * c.s * 2.1;
            const hop = (f) => {
              const ph = (t * f + c.ph) % 1;
              y = 4 * ph * (1 - ph) * h;
              if (ph < 0.08 || ph > 0.94) {
                sy = 0.82;
                sx = 1.1;
              }
              return ph;
            };
            if (c.b === 'hop') hop(1.6);
            else if (c.b === 'walk') {
              const dx = c.tx - c.x, dz = c.tz - c.z, dd = Math.hypot(dx, dz);
              if (dd > 0.3) {
                const v = Math.min(dd, dt * 4.5 * c.s * 2);
                c.x += (dx / dd) * v;
                c.z += (dz / dd) * v;
                c.yaw = Math.atan2(dx, dz);
              }
              hop(2.4);
              aL = 0.35 + Math.sin(t * 12 + i) * 0.5;
              aR = 0.35 - Math.sin(t * 12 + i) * 0.5;
            } else if (c.b === 'flip') {
              y = 4 * k * (1 - k) * h * 3.2;
              rx = -k * TAU;
              aL = aR = 2.6;
            } else if (c.b === 'spin') {
              hop(2);
              c.yaw += dt * 9;
              aL = aR = 1.5;
            } else if (c.b === 'dance') {
              rz = Math.sin(t * 9 + i) * 0.3;
              y = Math.abs(Math.sin(t * 9 + i)) * h * 0.3;
              aL = 2.4 + Math.sin(t * 9) * 0.4;
              aR = 2.4 - Math.sin(t * 9) * 0.4;
            } else if (c.b === 'wave') {
              c.yaw = Math.atan2(sub.x - c.x, sub.z - c.z);
              aR = 2.6 + Math.sin(t * 10 + i) * 0.4;
              y = Math.abs(Math.sin(t * 3 + i)) * h * 0.15;
            } else if (c.b === 'tumble') {
              rz = (k < 0.25 ? k / 0.25 : k < 0.7 ? 1 : (1 - k) / 0.3) * (PI / 2);
              aL = aR = 1.2;
            } else if (c.b === 'laugh') {
              sy = 1 + Math.sin(t * 22 + i) * 0.07;
              rx = Math.sin(t * 11) * 0.12 - 0.15;
              aL = aR = -0.2;
            }
            p3.set(c.x, 0.95 + y, c.z);
            e.set(rx, c.yaw, rz);
            q.setFromEuler(e);
            m4.compose(p3, q, s3.set(c.s * sx, c.s * sy, c.s * sx));
            bodies.setMatrixAt(i, m4);
            for (const [j, sd, a] of [[0, -1, aL], [1, 1, aR]]) {
              mA.makeRotationZ(sd * -a).setPosition(sd * 0.84, 1.15, 0.05);
              armsM.setMatrixAt(i * 2 + j, mA.premultiply(m4));
            }
          });
          bodies.instanceMatrix.needsUpdate = armsM.instanceMatrix.needsUpdate = true;
          // the fairy flies a big figure of eight through the hall
          const u = t * 0.16, rr = R * 0.55;
          prev.copy(fairy.group.position);
          fairy.group.position.set(Math.sin(u) * rr, R * 0.32 + Math.sin(u * 1.7) * R * 0.12, Math.sin(2 * u) * rr * 0.55);
          const v = fairy.group.position.clone().sub(prev);
          if (v.lengthSq() > 1e-6) fairy.group.rotation.y = Math.atan2(v.x, v.z);
          fairy.update(t);
          tAcc += dt;
          if (tAcc > 0.03) {
            tAcc = 0;
            const w = fairy.group.position;
            tp.set([w.x + (rnd() - 0.5) * 0.6, w.y + 0.8 + (rnd() - 0.5) * 0.6, w.z + (rnd() - 0.5) * 0.6], ti * 3);
            ti = (ti + 1) % TN;
            tg.attributes.position.needsUpdate = true;
          }
        },
      };
    },
  };
}

const BUILD = { java: dragon, southsandwich: rauschebart, puertorico: kraken, izu: captain, kuril: umibozu, tonga: ghostShip, mariana: leviathan };

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
