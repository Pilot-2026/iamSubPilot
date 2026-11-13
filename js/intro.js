// Title screen + menu background: a small "aquarium" with many real and
// fantasy animals circling the word HADAL (water shader on the letters) and
// the HUMMEL-1 sub cruising around it with its lights on.

import * as THREE from './vendor/three.min.js';
import { buildModel, animUpper } from './creatures.js';
import { buildSubModel, animateSubModel } from './sub.js';
import { fishGeometry, fishMaterial, fishTime } from './schools.js';
import { mulberry32, clamp, lerp } from './util.js';

const TEXT_W = 26, TEXT_H = 6.5, TEXT_Y = 2.2;

function titleTexture() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 400px system-ui, "Arial Black", sans-serif';
  const word = 'HADAL';
  // manual letter spacing
  const spacing = 70;
  const widths = [...word].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (word.length - 1);
  let x = 1024 - total / 2;
  const pos = widths.map((w) => {
    const p = x + w / 2;
    x += w + spacing;
    return p;
  });
  const draw = (fill, blur, color) => {
    g.shadowBlur = blur;
    g.shadowColor = color;
    g.fillStyle = fill;
    [...word].forEach((ch, i) => g.fillText(ch, pos[i], 270));
  };
  draw('rgba(56,232,255,0.9)', 60, 'rgba(56,232,255,0.9)');
  const grd = g.createLinearGradient(0, 80, 0, 460);
  grd.addColorStop(0, '#f2fdff');
  grd.addColorStop(0.45, '#5cecff');
  grd.addColorStop(1, '#0a6f98');
  draw(grd, 0, 'transparent');
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  [...word].forEach((ch, i) => g.strokeText(ch, pos[i], 270));
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// [model, scale, rx, rz, height, speed, count]
const CAST = [
  ['whaleshark', 0.5, 20, 12, -5.5, 0.07, 1],
  ['humpback', 0.42, 25, 15, 9, -0.05, 1],
  ['manta', 0.95, 15, 10, -2.8, 0.13, 1],
  ['turtle', 1.25, 12.5, 9, 6.2, -0.17, 1],
  ['dolphin', 0.85, 17, 12, 1.2, 0.24, 3],
  ['sunfish', 0.9, 21, 9, -7.5, 0.05, 1],
  ['jellyphant', 0.75, 13, 8, -4.5, -0.11, 1],
  ['toaster', 0.85, 11, 13, 7.5, 0.15, 1],
  ['duckangler', 1.0, 18, 10, 4.5, -0.12, 1],
  ['sheep', 1.0, 9, 11, -6.5, 0.16, 1],
  ['sockopus', 0.75, 22, 13, -1.5, -0.08, 1],
  ['angler', 1.5, 10, 7, -2.2, 0.21, 1],
  ['dumbo', 1.6, 14, 6, 5.2, 0.09, 1],
  ['vampire', 1.3, 24, 9, 2.5, 0.1, 1],
  ['barreleye', 2.6, 8, 9, 0.2, -0.2, 1],
  ['combjelly', 1.3, 19, 7, 7.2, 0.06, 2],
  ['moonjelly', 1.0, 16, 14, 3.5, 0.03, 3],
];

export class Aquarium {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05243c);
    this.scene.fog = new THREE.FogExp2(0x05243c, 0.018);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    this.mode = 'intro';
    this.t = 0;
    this.textFade = 1;
    const rng = mulberry32(2026);

    this.scene.add(new THREE.HemisphereLight(0x9fe8ff, 0x041018, 1.25));
    const sun = new THREE.DirectionalLight(0xd8fbff, 1.4);
    sun.position.set(0.3, 1, 0.4);
    this.scene.add(sun);

    // HADAL with a water shader
    this.textU = {
      map: { value: titleTexture() },
      uTime: { value: 0 },
      uSpot: { value: [new THREE.Vector2(99, 99), new THREE.Vector2(99, 99), new THREE.Vector2(99, 99)] },
      uSpotI: { value: [0, 0, 0] },
      uFade: { value: 1 },
    };
    const textMat = new THREE.ShaderMaterial({
      uniforms: this.textU,
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec2 vUv; varying vec2 vP;
        uniform float uTime;
        void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x*0.5 + uTime*1.4)*0.25 + sin(p.y*0.9 + uTime*1.1)*0.12; vP = p.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform float uTime; uniform vec2 uSpot[3]; uniform float uSpotI[3]; uniform float uFade;
        varying vec2 vUv; varying vec2 vP;
        float caust(vec2 p){
          float a = sin(p.x*2.1 + uTime*1.1 + sin(p.y*1.7 + uTime*0.6)*1.6);
          float b = sin(p.y*2.6 - uTime*0.9 + sin(p.x*1.3 - uTime*0.5)*1.4);
          float c = sin((p.x + p.y)*1.8 + uTime*0.7);
          return pow(clamp(1.0 - abs(a + b + c) / 1.6, 0.0, 1.0), 3.0);
        }
        void main(){
          vec2 uv = vUv;
          uv.x += sin(uv.y*18.0 + uTime*2.2)*0.004 + sin(uv.y*7.0 - uTime*1.3)*0.003;
          uv.y += cos(uv.x*22.0 + uTime*1.7)*0.007;
          vec4 tex = texture2D(map, uv);
          float cs = caust(vP*0.8);
          vec3 col = tex.rgb * (0.7 + 0.75*cs);
          float spot = 0.0;
          for (int k = 0; k < 3; k++) { vec2 d = vP - uSpot[k]; spot += uSpotI[k] * exp(-dot(d, d) / 7.0); }
          col += vec3(1.0, 0.95, 0.8) * spot * 1.9 * tex.a;
          col += vec3(0.6, 0.9, 1.0) * spot * 0.25 * (1.0 - tex.a) * 0.0;
          float band = smoothstep(0.035, 0.0, abs(fract(vUv.x*0.6 - vUv.y*0.25 - uTime*0.09) - 0.5));
          col += vec3(0.75, 1.0, 1.0) * band * 0.35 * tex.a;
          gl_FragColor = vec4(col, tex.a * uFade);
        }`,
    });
    const text = new THREE.Mesh(new THREE.PlaneGeometry(TEXT_W, TEXT_H, 60, 16), textMat);
    text.position.y = TEXT_Y;
    text.renderOrder = 5;
    this.text = text;
    this.scene.add(text);

    // light rays from above
    const rayTex = (() => {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 128;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 128);
      grd.addColorStop(0, 'rgba(190,245,255,0.55)');
      grd.addColorStop(1, 'rgba(190,245,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 16, 128);
      return new THREE.CanvasTexture(c);
    })();
    this.rays = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(4 + rng() * 5, 60),
        new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.18 + rng() * 0.12, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
      );
      m.position.set(-30 + i * 10 + rng() * 4, 12, -18 - rng() * 10);
      m.rotation.z = (rng() - 0.5) * 0.4;
      m.userData.base = m.rotation.z;
      m.userData.ph = rng() * 10;
      this.rays.push(m);
      this.scene.add(m);
    }

    // marine snow / bubbles
    const N = 500;
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[i * 3] = (rng() - 0.5) * 80;
      p[i * 3 + 1] = (rng() - 0.5) * 50;
      p[i * 3 + 2] = (rng() - 0.5) * 60;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfefff, size: 0.12, transparent: true, opacity: 0.6, depthWrite: false }));
    this.scene.add(this.snow);
    const BN = 60;
    const bp = new Float32Array(BN * 3);
    for (let i = 0; i < BN; i++) {
      bp[i * 3] = (rng() - 0.5) * TEXT_W;
      bp[i * 3 + 1] = TEXT_Y - 3 + rng() * 12;
      bp[i * 3 + 2] = -0.5 + rng() * 1.5;
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    this.bubbles = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xe8fbff, size: 0.22, transparent: true, opacity: 0.75, depthWrite: false }));
    this.scene.add(this.bubbles);

    // animals
    this.actors = [];
    for (const [model, scale, rx, rz, h, speed, count] of CAST) {
      for (let k = 0; k < count; k++) {
        const o = buildModel(model);
        o.scale.multiplyScalar(scale);
        this.scene.add(o);
        this.actors.push({ o, model, rx, rz, h: h + k * 1.3, speed, ph: rng() * Math.PI * 2 + k * 0.35, bob: rng() * 10, k });
      }
    }
    // fish schools orbiting the letters
    this.schools = [];
    const tints = [0x9fd2ff, 0xffd76a, 0xa8f0c8, 0xffa8d8, 0xe8f4ff];
    tints.forEach((tint, i) => {
      const n = 36;
      const mesh = new THREE.InstancedMesh(fishGeometry(), fishMaterial(i === 4), n);
      mesh.frustumCulled = false;
      const offs = [];
      const col = new THREE.Color(tint);
      for (let j = 0; j < n; j++) {
        mesh.setColorAt(j, col.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.15));
        offs.push({ x: (rng() - 0.5) * 6, y: (rng() - 0.5) * 2.4, z: (rng() - 0.5) * 6, ph: rng() * 10, s: 0.5 + rng() * 0.25 });
      }
      this.scene.add(mesh);
      this.schools.push({ mesh, offs, rx: 14 + i * 3, rz: 9 + i * 2, h: -6 + i * 3.2, speed: (i % 2 ? -1 : 1) * (0.16 + i * 0.03), ph: i * 1.3 });
    });

    // a whole fleet of subs with strong lights
    const FLEET = [
      ['hummel', 15.5, 10, 0, 0.19, 0, true],
      ['rocket', 20, 13, 5.5, -0.14, 2.1, true],
      ['ufo', 12, 8, -5.2, 0.11, 4.2, false],
      ['octopus', 22, 9, -1.8, -0.09, 1.0, false],
      ['narwhal', 18, 15, 8.6, 0.16, 3.3, false],
      ['puffer', 10.5, 12, 4.2, -0.21, 5.2, false],
    ];
    this.subs = FLEET.map(([model, R, Rz, h, speed, ph, light]) => {
      const g = buildSubModel(model, null, light);
      g.userData.beam.material.uniforms.opacity.value = 0.2;
      g.userData.beam.scale.set(1.25, 1.25, 1.7);
      g.userData.glowMat.opacity = 1;
      if (g.userData.spot) {
        g.userData.spot.intensity = 140;
        g.userData.spot.distance = 70;
      }
      g.scale.setScalar(model === 'hummel' ? 1.15 : 1);
      this.scene.add(g);
      return { g, R, Rz, h, speed, ph };
    });
    this.sub = this.subs[0].g;
    this.subLightDir = new THREE.Vector3(0, -7, -20).normalize();
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  setMode(mode) {
    this.mode = mode;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const needW = (TEXT_W * 1.12) / 2 / Math.tan(hfov / 2);
    const needH = (TEXT_H * 2.4) / 2 / Math.tan(vfov / 2);
    this.fitDist = Math.max(needW, needH, 22);
    // keep the letters clear of the text block at the bottom
    this.lookY = h < 520 ? TEXT_Y - 3.4 : w / h < 0.8 ? TEXT_Y - 1.6 : TEXT_Y - 0.6;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    fishTime.value += dt;
    this.textU.uTime.value = t;
    const wantText = this.mode === 'intro' ? 1 : 0;
    this.textFade += (wantText - this.textFade) * (1 - Math.exp(-dt * 3));
    this.textU.uFade.value = this.textFade;
    this.text.visible = this.textFade > 0.02;

    // camera: front view in the intro, slow drift in the menu
    const dist = this.fitDist || 32;
    const menu = this.mode === 'menu';
    const cx = menu ? Math.sin(t * 0.05) * 10 : Math.sin(t * 0.13) * 1.2;
    const cy = menu ? 4 + Math.sin(t * 0.07) * 2 : 1.6 + Math.sin(t * 0.17) * 0.6;
    const cz = menu ? dist * 0.85 : dist;
    const cam = this.camera.position;
    if (!this.camInit) {
      cam.set(cx, cy, cz);
      this.camInit = true;
    }
    cam.x += (cx - cam.x) * (1 - Math.exp(-dt * 1.2));
    cam.y += (cy - cam.y) * (1 - Math.exp(-dt * 1.2));
    cam.z += (cz - cam.z) * (1 - Math.exp(-dt * 1.2));
    this.camera.lookAt(0, menu ? 0 : this.lookY ?? TEXT_Y - 0.6, 0);

    for (const r of this.rays) r.rotation.z = r.userData.base + Math.sin(t * 0.3 + r.userData.ph) * 0.08;
    this.snow.position.y = -((t * 0.4) % 10);
    const bp = this.bubbles.geometry.attributes.position.array;
    for (let i = 0; i < bp.length; i += 3) {
      bp[i + 1] += dt * (1 + ((i * 7) % 5) * 0.3);
      bp[i] += Math.sin(t * 2 + i) * dt * 0.15;
      if (bp[i + 1] > TEXT_Y + 10) bp[i + 1] = TEXT_Y - 3;
    }
    this.bubbles.geometry.attributes.position.needsUpdate = true;

    // animals on elliptic orbits (some pass in front of, some behind the letters)
    for (const a of this.actors) {
      const th = a.ph + t * a.speed;
      const s = Math.sign(a.speed) || 1;
      const x = Math.cos(th) * a.rx, z = Math.sin(th) * a.rz;
      const y = a.h + Math.sin(th * 2 + a.bob) * 0.8 + Math.sin(t * 0.8 + a.bob) * 0.3;
      a.o.position.set(x, y, z);
      const vx = -Math.sin(th) * a.rx * s, vz = Math.cos(th) * a.rz * s;
      if (a.model === 'moonjelly' || a.model === 'combjelly') a.o.rotation.y += dt * 0.2;
      else a.o.rotation.y = Math.atan2(-vx, -vz);
      animUpper(a.o, a.model, t * 1.2 + a.bob);
      const u = a.o.userData;
      if (u.arms) u.arms.forEach((arm, i) => (arm.rotation.z = Math.sin(t * 2 + i) * 0.35));
      if (u.ears) u.ears.forEach((e, i) => (e.rotation.z = Math.sin(t * 3 + a.bob) * 0.5 * (i ? 1 : -1)));
      if (u.duck) u.duck.rotation.z = Math.sin(t * 2) * 0.3;
      if (u.colorMats) {
        const hue = (Math.floor(t * 2) * 0.17) % 1;
        u.colorMats.forEach((m) => {
          m.color.setHSL(hue, 0.9, 0.6);
          if (m.emissive) m.emissive.setHSL(hue, 0.9, 0.45);
        });
      }
      if (u.rows) u.rows.forEach((m, i) => m.color.setHSL((t * 0.6 + i / 8) % 1, 1, 0.6));
    }
    // fish schools
    for (const sc of this.schools) {
      const th = sc.ph + t * sc.speed;
      const s = Math.sign(sc.speed);
      const cxs = Math.cos(th) * sc.rx, czs = Math.sin(th) * sc.rz, cys = sc.h + Math.sin(th * 1.5) * 1.5;
      const yaw = Math.atan2(Math.sin(th) * sc.rx * s, -Math.cos(th) * sc.rz * s);
      sc.offs.forEach((o, j) => {
        const ph = o.ph + t;
        this._p.set(cxs + o.x + Math.sin(ph * 0.9) * 0.5, cys + o.y + Math.sin(ph * 1.3) * 0.3, czs + o.z + Math.cos(ph * 0.8) * 0.5);
        this._e.set(0, yaw + Math.sin(ph * 0.5) * 0.2, 0);
        this._q.setFromEuler(this._e);
        this._s.setScalar(o.s);
        this._m.compose(this._p, this._q, this._s);
        sc.mesh.setMatrixAt(j, this._m);
      });
      sc.mesh.instanceMatrix.needsUpdate = true;
    }

    // the fleet circles the letters and sweeps them with their lamps
    const hits = [null, null, null];
    this.subs.forEach((s, idx) => {
      const th = s.ph + t * s.speed;
      const sg = Math.sign(s.speed) || 1;
      const sp = s.g.position;
      sp.set(Math.cos(th) * s.R, TEXT_Y - 0.4 + s.h + Math.sin(th * 2) * 1.4, Math.sin(th) * s.Rz);
      const tx = -Math.sin(th) * s.R * sg, tz = Math.cos(th) * s.Rz * sg;
      const tangentYaw = Math.atan2(-tx, -tz);
      const toCenter = Math.atan2(sp.x, sp.z);
      let d = toCenter - tangentYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      s.g.rotation.order = 'YXZ';
      s.g.rotation.y = tangentYaw + d * 0.45;
      s.g.rotation.z = Math.sin(t * 0.7 + s.ph) * 0.08;
      animateSubModel(s.g, dt, t + s.ph, 4, true);
      // where the light beam hits the text plane (z = 0)
      const dir = this.subLightDir.clone().applyQuaternion(s.g.quaternion);
      if (Math.abs(dir.z) > 0.05) {
        const k = -sp.z / dir.z;
        if (k > 0 && k < 45) {
          const hx = sp.x + dir.x * k, hy = sp.y + dir.y * k - TEXT_Y;
          if (idx < 3 && Math.abs(hx) < TEXT_W * 0.6 && Math.abs(hy) < TEXT_H) hits[idx] = { x: hx, y: hy, i: clamp(1.3 - k / 32, 0, 1) * (sp.z > 0 ? 1 : 0.55) };
        }
      }
    });
    for (let k = 0; k < 3; k++) {
      const h = hits[k];
      if (h) this.textU.uSpot.value[k].set(h.x, h.y);
      this.textU.uSpotI.value[k] = lerp(this.textU.uSpotI.value[k], h ? h.i : 0, 1 - Math.exp(-dt * 6));
    }
  }
}
