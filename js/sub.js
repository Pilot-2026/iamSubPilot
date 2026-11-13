// The research submersible: model, lights and movement.

import * as THREE from './vendor/three.min.js';
import { clamp, lerp } from './util.js';
import { WX, WZ } from './world.js';
import { PartBuilder } from './parts.js';

// ---------------------------------------------------------------------------
// "HUMMEL-1": an original, deliberately crazy research sub with lots of small
// parts (bumblebee theme). Static parts are merged per material to keep draw
// calls low; animated parts (propellers, wings, antenna lights, claw) stay
// separate meshes.
// Forward is -Z, up is +Y. Body length ~4.6 units (46 m in world scale – the
// game is not to scale for the sub, it would be invisible otherwise).

const UP = new THREE.Vector3(0, 1, 0);
const ZAX = new THREE.Vector3(0, 0, 1);

let nameTex = null;
function namePlateTexture() {
  if (nameTex) return nameTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#16161c';
  g.beginPath();
  g.roundRect(6, 10, 500, 108, 40);
  g.fill();
  g.strokeStyle = '#d9a640';
  g.lineWidth = 8;
  g.stroke();
  g.fillStyle = '#ffd23f';
  g.font = 'bold 74px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('HUMMEL-1', 256, 68);
  nameTex = new THREE.CanvasTexture(c);
  return nameTex;
}

const BX = 1.12, BY = 1.05, BZ = 2.0; // body ellipsoid radii
const bodyR = (z) => Math.sqrt(Math.max(0, 1 - (z / BZ) ** 2)); // unit radius at z

export function buildSubModel(color = 0xffc21a, withLights = false) {
  const g = new THREE.Group();
  const B = new PartBuilder();
  const M = {
    body: new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.12, emissive: color, emissiveIntensity: 0.14 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: 0.55, metalness: 0.2 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd4a548, roughness: 0.3, metalness: 0.85 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8b98a6, roughness: 0.35, metalness: 0.7 }),
    port: new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb84a, emissiveIntensity: 0.9, roughness: 0.2 }),
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.2 }),
    red: new THREE.MeshBasicMaterial({ color: 0xff3344 }),
    green: new THREE.MeshBasicMaterial({ color: 0x33ff77 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x113322, emissive: 0x2bff9a, emissiveIntensity: 0.7 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.6 }),
  };
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.32, depthWrite: false });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xd8f2ff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  const veinMat = new THREE.MeshBasicMaterial({ color: 0x23343f, transparent: true, opacity: 0.6, depthWrite: false });

  // --- body + stripes + rivets
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
        B.add(M.brass, RIVET, { p: [Math.cos(a) * rr * BX, Math.sin(a) * rr * BY, ze] });
      }
    }
  }
  // --- cockpit bubble with brass collar, dashboard and a tiny pilot
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.84, 22, 16), glass);
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

  // --- big cartoon eyes
  for (const sx of [-1, 1]) {
    B.add(M.white, new THREE.SphereGeometry(0.3, 16, 12), { p: [sx * 0.44, 0.74, -1.02] });
    B.add(M.black, new THREE.SphereGeometry(0.14, 12, 10), { p: [sx * 0.5, 0.78, -1.27] });
    B.add(M.white, new THREE.SphereGeometry(0.045, 8, 6), { p: [sx * 0.46, 0.85, -1.38] });
    B.add(M.stripe, new THREE.TorusGeometry(0.3, 0.035, 6, 20, Math.PI), { p: [sx * 0.44, 0.76, -1.02], r: [0, sx * 0.35, 0] });
  }
  // --- portholes with brass rims
  for (const sx of [-1, 1]) {
    for (const z of [-0.1, 0.78]) {
      const a = 0.32;
      const rr = bodyR(z);
      const n = new THREE.Vector3(sx * Math.cos(a) * BY, Math.sin(a) * BX, 0).normalize();
      const p = [sx * Math.cos(a) * rr * BX, Math.sin(a) * rr * BY, z];
      B.add(M.port, new THREE.CylinderGeometry(0.19, 0.19, 0.08, 16), { p, q: new THREE.Quaternion().setFromUnitVectors(UP, n) });
      B.add(M.brass, new THREE.TorusGeometry(0.2, 0.045, 6, 18), { p: [p[0] + n.x * 0.04, p[1] + n.y * 0.04, z], q: new THREE.Quaternion().setFromUnitVectors(ZAX, n) });
      for (let i = 0; i < 6; i++) {
        const b = (i / 6) * Math.PI * 2;
        const tangent = new THREE.Vector3(-n.y, n.x, 0);
        const off = tangent.clone().multiplyScalar(Math.cos(b) * 0.27).add(new THREE.Vector3(0, 0, Math.sin(b) * 0.27));
        B.add(M.steel, RIVET, { p: [p[0] + off.x + n.x * 0.03, p[1] + off.y + n.y * 0.03, z + off.z] });
      }
    }
  }
  // --- hatch tower, wheel, periscope, camera
  B.add(M.body, new THREE.CylinderGeometry(0.42, 0.48, 0.5, 18), { p: [0, 1.12, -0.05] });
  B.add(M.stripe, new THREE.CylinderGeometry(0.44, 0.44, 0.1, 18), { p: [0, 1.4, -0.05] });
  B.add(M.brass, new THREE.TorusGeometry(0.24, 0.035, 6, 18), { p: [0, 1.5, -0.05], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) B.add(M.brass, new THREE.BoxGeometry(0.46, 0.03, 0.03), { p: [0, 1.5, -0.05], r: [0, (i * Math.PI) / 3, 0] });
  B.add(M.brass, new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), { p: [0, 1.52, -0.05] });
  B.add(M.steel, new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), { p: [0.22, 1.8, 0.12] });
  B.add(M.steel, new THREE.BoxGeometry(0.13, 0.13, 0.32), { p: [0.22, 2.3, 0.02] });
  B.add(M.port, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), { p: [0.22, 2.3, -0.15], r: [Math.PI / 2, 0, 0] });
  B.add(M.stripe, new THREE.BoxGeometry(0.28, 0.2, 0.26), { p: [-0.15, 1.1, -0.62] });
  B.add(M.black, new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), { p: [-0.15, 1.1, -0.78], r: [Math.PI / 2, 0, 0] });
  B.add(M.steel, new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), { p: [-0.15, 0.95, -0.62] });

  // --- antennae (tubes) – tips are separate (they blink)
  const tips = [];
  for (const sx of [-1, 1]) {
    const pts = [new THREE.Vector3(sx * 0.22, 0.98, -0.62), new THREE.Vector3(sx * 0.32, 1.55, -0.95), new THREE.Vector3(sx * 0.62, 1.95, -1.25), new THREE.Vector3(sx * 0.95, 2.05, -1.55)];
    B.add(M.stripe, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.04, 6, false));
    for (let i = 1; i < 4; i++) B.add(M.brass, new THREE.TorusGeometry(0.05, 0.02, 4, 10), { p: [pts[i].x * 0.92, pts[i].y * 0.97, pts[i].z * 0.95], r: [Math.PI / 2, 0, 0] });
    const tipMat = new THREE.MeshBasicMaterial({ color: sx < 0 ? 0xff7a2f : 0x55e8ff });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), tipMat);
    tip.position.copy(pts[3]);
    g.add(tip);
    tips.push(tip);
  }

  // --- tail: stinger, duct ring, rudder, stabilizers, nav lights, flag pole
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

  // --- side pipes with clamps
  for (const sx of [-1, 1]) {
    const pts = [];
    for (const z of [-1.3, -0.6, 0.2, 1.0, 1.5]) {
      const y = -0.42;
      const r2 = bodyR(z) ** 2 - (y / BY) ** 2;
      const x = BX * Math.sqrt(Math.max(0.02, r2)) + 0.07;
      pts.push(new THREE.Vector3(sx * x, y, z));
    }
    B.add(M.brass, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.05, 6, false));
    for (const pp of pts.slice(1, 4)) B.add(M.steel, new THREE.CylinderGeometry(0.075, 0.075, 0.08, 8), { p: [pp.x, pp.y, pp.z], r: [Math.PI / 2, 0, 0] });
  }
  // --- headlamps
  for (const sx of [-1, 1]) {
    B.add(M.stripe, new THREE.CylinderGeometry(0.2, 0.15, 0.3, 14), { p: [sx * 0.62, -0.58, -1.55], r: [Math.PI / 2, 0, 0] });
    B.add(M.brass, new THREE.TorusGeometry(0.19, 0.03, 6, 16), { p: [sx * 0.62, -0.58, -1.71] });
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), lampMat);
    lamp.position.set(sx * 0.62, -0.58, -1.715);
    lamp.rotation.y = Math.PI;
    g.add(lamp);
  }
  // --- side thruster pods
  const sideProps = [];
  for (const sx of [-1, 1]) {
    B.add(M.stripe, new THREE.CylinderGeometry(0.2, 0.2, 0.62, 12), { p: [sx * 1.32, -0.32, 0.3], r: [Math.PI / 2, 0, 0] });
    B.add(M.body, new THREE.CylinderGeometry(0.21, 0.21, 0.12, 12), { p: [sx * 1.32, -0.32, 0.1], r: [Math.PI / 2, 0, 0] });
    B.add(M.steel, new THREE.BoxGeometry(0.3, 0.06, 0.18), { p: [sx * 1.15, -0.3, 0.3] });
    B.add(M.brass, new THREE.ConeGeometry(0.09, 0.2, 10).rotateX(-Math.PI / 2), { p: [sx * 1.32, -0.32, -0.08] });
    const sp = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bl = new THREE.Mesh(BLADE_S, M.brass);
      bl.position.y = 0.11;
      const h = new THREE.Group();
      h.rotation.z = (i * Math.PI * 2) / 3;
      h.add(bl);
      sp.add(h);
    }
    sp.position.set(sx * 1.32, -0.32, 0.66);
    g.add(sp);
    sideProps.push(sp);
  }
  // --- skids with struts
  for (const sx of [-1, 1]) {
    B.add(M.stripe, new THREE.BoxGeometry(0.12, 0.09, 2.8), { p: [sx * 0.68, -1.22, 0.15] });
    B.add(M.stripe, new THREE.BoxGeometry(0.12, 0.09, 0.45), { p: [sx * 0.68, -1.1, -1.38], r: [-0.6, 0, 0] });
    for (const z of [-0.8, 0.2, 1.1]) B.add(M.steel, new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), { p: [sx * 0.62, -0.98, z], r: [0, 0, sx * 0.25] });
  }
  // --- grabber arm (static part) + claw
  B.add(M.steel, new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), { p: [0, -0.86, -1.15] });
  B.add(M.steel, new THREE.BoxGeometry(0.1, 0.1, 0.62), { p: [0, -0.96, -1.45], r: [0.35, 0, 0] });
  B.add(M.brass, new THREE.SphereGeometry(0.09, 8, 6), { p: [0, -1.07, -1.75] });
  B.add(M.steel, new THREE.BoxGeometry(0.09, 0.09, 0.45), { p: [0, -1.02, -1.98], r: [-0.25, 0, 0] });
  const claw = new THREE.Group();
  claw.position.set(0, -0.96, -2.2);
  const fingers = [];
  for (const sx of [-1, 1]) {
    const f = new THREE.Group();
    const seg = new THREE.Mesh(FINGER, M.steel);
    seg.position.set(0, 0, -0.14);
    f.add(seg);
    const tipF = new THREE.Mesh(FINGER_TIP, M.brass);
    tipF.position.set(-sx * 0.05, 0, -0.3);
    f.add(tipF);
    f.position.x = sx * 0.06;
    f.rotation.y = sx * 0.35;
    claw.add(f);
    fingers.push(f);
  }
  g.add(claw);
  // --- sample basket
  B.add(M.stripe, new THREE.BoxGeometry(0.7, 0.04, 0.45), { p: [0, -1.18, -0.85] });
  for (const sx of [-1, 1]) B.add(M.brass, new THREE.BoxGeometry(0.03, 0.22, 0.45), { p: [sx * 0.35, -1.08, -0.85] });

  // --- name plates
  const plateMat = new THREE.MeshBasicMaterial({ map: namePlateTexture(), transparent: true, fog: true });
  for (const sx of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.29), plateMat);
    pl.position.set(sx * 1.035, -0.47, 0.32);
    pl.rotation.set(0, sx * Math.PI / 2, 0);
    pl.rotateX(-0.42);
    g.add(pl);
  }

  // --- wings (flap), pivot at the shoulder
  const wings = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(sx * 0.32, 0.98, 0.3);
    const wgeo = new THREE.CircleGeometry(1, 24);
    wgeo.rotateX(-Math.PI / 2);
    const wing = new THREE.Mesh(wgeo, wingMat);
    wing.scale.set(0.95, 1, 0.42);
    wing.position.set(sx * 0.9, 0, 0.32);
    wing.rotation.y = sx * 0.35;
    wing.renderOrder = 3;
    piv.add(wing);
    for (let i = 0; i < 3; i++) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.012, 0.025), veinMat);
      v.position.set(sx * 0.8, 0.005, 0.22 + (i - 1) * 0.14);
      v.rotation.y = sx * (0.35 + (i - 1) * 0.18);
      piv.add(v);
    }
    piv.rotation.z = sx * 0.35;
    g.add(piv);
    wings.push(piv);
  }
  // --- flag (waves)
  const flag = new THREE.Mesh(FLAG_GEO, new THREE.MeshStandardMaterial({ color: 0xff4d6d, side: THREE.DoubleSide, roughness: 0.7 }));
  flag.position.set(0, 1.8, 2.0);
  g.add(flag);
  // --- beacon
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa21a }));
  beacon.position.set(-0.22, 1.5, 0.22);
  g.add(beacon);

  // --- main propeller
  const prop = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(BLADE_M, i % 2 ? M.stripe : M.body);
    blade.position.y = 0.32;
    blade.rotation.y = 0.5;
    const holder = new THREE.Group();
    holder.rotation.z = (i * Math.PI * 2) / 5;
    holder.add(blade);
    prop.add(holder);
  }
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 10).rotateX(Math.PI / 2), M.brass);
  hub.position.z = 0.12;
  prop.add(hub);
  prop.position.set(0, 0, 2.62);
  g.add(prop);

  B.build(g);

  g.userData.prop = prop;
  g.userData.sideProps = sideProps;
  g.userData.wings = wings;
  g.userData.tips = tips;
  g.userData.beacon = beacon;
  g.userData.flag = flag;
  g.userData.claw = fingers;
  g.userData.grab = 0;
  g.userData.lampMat = lampMat;
  g.userData.bodyMat = M.body;

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
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, -0.5, -1.9);
  beam.rotation.x = -0.33;
  g.add(beam);
  g.userData.beam = beam;

  if (withLights) {
    const spot = new THREE.SpotLight(0xfff3dc, 60, 45, 0.55, 0.55, 1.0);
    spot.position.set(0, -0.4, -1.9);
    const target = new THREE.Object3D();
    target.position.set(0, -7, -20);
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

// Animate the moving parts. speed in units/s, t = time in seconds.
export function animateSubModel(g, dt, t, speed = 0, lightOn = true) {
  const u = g.userData;
  u.prop.rotation.z += dt * (2.5 + speed * 3);
  u.sideProps.forEach((p, i) => (p.rotation.z += dt * (i ? 9 : -9)));
  const flap = 0.25 + Math.min(0.5, speed * 0.04);
  const rate = 3 + speed * 0.4;
  u.wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * (0.3 + Math.sin(t * rate) * flap)));
  u.tips.forEach((tp, i) => {
    const on = Math.sin(t * 3 + i * Math.PI) > 0;
    tp.scale.setScalar(on ? 1.15 : 0.85);
    tp.material.color.setHex(on ? (i ? 0x8ff4ff : 0xffb14a) : i ? 0x1d5d6e : 0x6e3510);
  });
  u.beacon.material.color.setHex((t * 1.3) % 1 < 0.18 ? 0xffe14a : 0x5a3a08);
  u.flag.rotation.y = Math.sin(t * 4) * 0.25;
  if (u.grab > 0) u.grab = Math.max(0, u.grab - dt * 1.4);
  const open = 0.35 + Math.sin(u.grab * Math.PI) * 0.45;
  u.claw.forEach((f, i) => (f.rotation.y = (i ? 1 : -1) * open));
  u.lampMat.color.setHex(lightOn ? 0xfff4d0 : 0x333333);
}

export class Sub {
  constructor(scene, world, upgrades, color = 0xffc21a) {
    this.world = world;
    this.group = buildSubModel(color, true);
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
    if (vInput < -0.2 && clearance > 70) this.descentRamp = Math.min(1, this.descentRamp + dt * 0.6);
    else this.descentRamp = Math.max(0, this.descentRamp - dt * 1.8);
    if (vInput > 0.2 && this.pos.y < -25) this.ascentRamp = Math.min(1, this.ascentRamp + dt * (this.autoAscent ? 1.2 : 0.6));
    else this.ascentRamp = Math.max(0, this.ascentRamp - dt * 1.8);
    this.proximity = vInput < -0.2 && clearance < 70 && clearance > 6 && this.vel.y < -12;
    let vSpeed = 6.5;
    if (vInput < 0) vSpeed += 38 * this.descentRamp;
    if (vInput > 0) vSpeed += (this.autoAscent ? 55 : 38) * this.ascentRamp;
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
  constructor(scene, color, name) {
    this.group = buildSubModel(color, false);
    this.group.userData.beam.material = this.group.userData.beam.material.clone();
    this.group.userData.beam.material.uniforms.opacity.value = 0.08;
    scene.add(this.group);
    this.target = new THREE.Vector3();
    this.targetYaw = 0;
    this.name = name;
    this.initialized = false;
    this.label = makeNameSprite(name, color);
    this.label.position.set(0, 2.6, 0);
    this.group.add(this.label);
  }

  setState(s) {
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
