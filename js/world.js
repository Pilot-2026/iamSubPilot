// The 3D world: trench terrain, water, light by depth, sonar mapping, marine snow, ship.

import * as THREE from './vendor/three.min.js';
import { clamp, smoothstep, fbm, ridge, lerp, mulberry32, hashString } from './util.js';
import { PartBuilder } from './parts.js';

const POST = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 5);
const POST2 = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 5);
const BOLLARD = new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10);
function shipNameTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 102;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.font = 'bold 72px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('HMS ANDREW', 256, 54, 496);
  return new THREE.CanvasTexture(c);
}

export const WX = 800; // half-size along the trench (units)
export const WZ = 420; // half-size across the trench
export const SCALE = 10; // metres per unit (depth readout)
export const SHIP_X = -520;
export const DEEP_X = 360;

let bubTex = null;
let dropTex = null;
function dropTexture() {
  if (dropTex) return dropTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.5, 'rgba(235,250,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  dropTex = new THREE.CanvasTexture(c);
  return dropTex;
}
function bubbleTexture() {
  if (bubTex) return bubTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(16, 16, 12, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath();
  g.arc(11, 11, 3, 0, Math.PI * 2);
  g.fill();
  bubTex = new THREE.CanvasTexture(c);
  return bubTex;
}

let sedTex = null;
function sedimentTexture() {
  if (sedTex) return sedTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d8d8';
  g.fillRect(0, 0, 256, 256);
  const r = mulberry32(77);
  for (let i = 0; i < 2600; i++) {
    const v = 150 + Math.floor(r() * 105);
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.5})`;
    const s = 1 + r() * 3.5;
    g.beginPath();
    g.arc(r() * 256, r() * 256, s, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(70,70,70,${0.2 + r() * 0.3})`;
    g.beginPath();
    g.arc(r() * 256, r() * 256, 1 + r() * 2, 0, Math.PI * 2);
    g.fill();
  }
  sedTex = new THREE.CanvasTexture(c);
  sedTex.wrapS = sedTex.wrapT = THREE.RepeatWrapping;
  sedTex.colorSpace = THREE.SRGBColorSpace;
  sedTex.anisotropy = 4;
  return sedTex;
}

export function axisZ(x) {
  return 55 * Math.sin(x * 0.0034 + 0.4) + 22 * Math.sin(x * 0.0105 + 1.3);
}

const NX = 256;
const NZ = 136;

export class World {
  constructor(scene, level) {
    this.scene = scene;
    this.level = level;
    this.halfW = level.steep ? 165 : 205;
    this.floorRange = Math.min(900, (level.maxDepth - level.plainDepth) * 0.35);
    this.rng = mulberry32(hashString(level.id));
    this.seamounts = [];
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = -WX + 120 + this.rng() * (2 * WX - 240);
      const z = axisZ(x) + side * (this.halfW + 70 + this.rng() * 90);
      if (Math.abs(z) < WZ - 30) this.seamounts.push({ x, z, h: 700 + this.rng() * 900, r: 45 + this.rng() * 40 });
    }
    this.buildHeightfield();
    this.buildTerrain();
    this.buildWaterSurface();
    this.buildShip();
    this.buildSnow();
    this.buildLights();
    this.buildSonar();
    this.bubbleEmitters = [];
    this.time = 0;
  }

  // ---------- terrain shape (depth in metres, positive) ----------
  depthFn(x, z) {
    const L = this.level;
    const dz = Math.abs(z - axisZ(x));
    const dd = (x - DEEP_X) / 380;
    const floor = L.maxDepth - (1 - Math.exp(-dd * dd)) * this.floorRange;
    const t = clamp(1 - dz / this.halfW, 0, 1);
    let prof = smoothstep(0, 0.82, t);
    // terraces on the walls
    prof += 0.035 * Math.sin(prof * Math.PI * 7) * (prof * (1 - prof)) * 4;
    let depth = L.plainDepth + (floor - L.plainDepth) * prof;
    // gentle hills on the plain, rocky detail on the walls
    depth += fbm(x * 0.006 + 3.1, z * 0.006 - 1.7) * 260 * (1 - 0.7 * prof);
    depth -= ridge(x * 0.022, z * 0.022) * 70 * prof * (1 - prof) * 3;
    depth += fbm(x * 0.05, z * 0.05, 2) * 18;
    for (const s of this.seamounts) {
      const d2 = ((x - s.x) ** 2 + (z - s.z) ** 2) / (s.r * s.r);
      depth -= s.h * Math.exp(-d2);
    }
    return Math.min(Math.max(depth, 400), L.maxDepth);
  }

  buildHeightfield() {
    this.dx = (2 * WX) / NX;
    this.dz = (2 * WZ) / NZ;
    this.heights = new Float32Array((NX + 1) * (NZ + 1));
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const x = -WX + i * this.dx;
        const z = -WZ + j * this.dz;
        this.heights[j * (NX + 1) + i] = -this.depthFn(x, z) / SCALE;
      }
    }
  }

  // Terrain height (world y) at x,z, matching the rendered mesh.
  heightAt(x, z) {
    const fx = clamp((x + WX) / this.dx, 0, NX - 0.0001);
    const fz = clamp((z + WZ) / this.dz, 0, NZ - 0.0001);
    const i = Math.floor(fx), j = Math.floor(fz);
    const u = fx - i, v = fz - j;
    const H = this.heights, W = NX + 1;
    const h00 = H[j * W + i], h10 = H[j * W + i + 1], h01 = H[(j + 1) * W + i], h11 = H[(j + 1) * W + i + 1];
    // same triangle split as the mesh (a-b-d / b-c-d)
    if (u + v < 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }

  depthAt(x, z) {
    return -this.heightAt(x, z) * SCALE;
  }

  deepestPoint() {
    // search along the axis near DEEP_X
    let best = { x: DEEP_X, z: axisZ(DEEP_X), y: this.heightAt(DEEP_X, axisZ(DEEP_X)) };
    for (let x = DEEP_X - 120; x <= DEEP_X + 120; x += 4) {
      for (let off = -30; off <= 30; off += 4) {
        const z = axisZ(x) + off;
        const y = this.heightAt(x, z);
        if (y < best.y) best = { x, z, y };
      }
    }
    return best;
  }

  buildTerrain() {
    const L = this.level;
    const W = NX + 1;
    const count = W * (NZ + 1);
    const pos = new Float32Array(count * 3);
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const k = j * W + i;
        pos[k * 3] = -WX + i * this.dx;
        pos[k * 3 + 1] = this.heights[k];
        pos[k * 3 + 2] = -WZ + j * this.dz;
      }
    }
    const idx = new Uint32Array(NX * NZ * 6);
    let p = 0;
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const a = j * W + i, b = a + 1, d = a + W, c = d + 1;
        idx[p++] = a; idx[p++] = d; idx[p++] = b;
        idx[p++] = b; idx[p++] = d; idx[p++] = c;
      }
    }
    const uv = new Float32Array(count * 2);
    for (let k = 0; k < count; k++) {
      uv[k * 2] = pos[k * 3] / 9;
      uv[k * 2 + 1] = pos[k * 3 + 2] / 9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const nrm = geo.getAttribute('normal');
    const col = new Float32Array(count * 3);
    const sed = L.sediment, rock = L.rock;
    for (let k = 0; k < count; k++) {
      const slope = 1 - nrm.getY(k);
      const r = smoothstep(0.18, 0.5, slope);
      const x = pos[k * 3], z = pos[k * 3 + 2];
      const n = fbm(x * 0.04, z * 0.04, 2) * 0.08;
      for (let c = 0; c < 3; c++) col[k * 3 + c] = clamp(lerp(sed[c], rock[c], r) + n, 0, 1);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0, map: sedimentTexture() });
    this.sonarUniforms = {
      uPingOrigin: { value: new THREE.Vector3() },
      uPingRadius: { value: 0 },
      uPingAlpha: { value: 0 },
      uMapped: { value: Array.from({ length: 24 }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uSonarColor: { value: new THREE.Color(0x38e8ff) },
    };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.sonarUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSonarPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvSonarPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vSonarPos;
uniform vec3 uPingOrigin; uniform float uPingRadius; uniform float uPingAlpha;
uniform vec4 uMapped[24]; uniform vec3 uSonarColor;`
        )
        .replace(
          '#include <dithering_fragment>',
          `{
  float ring = 0.0;
  if (uPingAlpha > 0.0) {
    float d = distance(vSonarPos, uPingOrigin);
    ring = (1.0 - smoothstep(0.0, 3.0, abs(d - uPingRadius))) * uPingAlpha;
  }
  float mapped = 0.0;
  for (int i = 0; i < 24; i++) {
    vec4 m = uMapped[i];
    if (m.w > 0.0) {
      float d = distance(vSonarPos.xz, m.xy);
      mapped = max(mapped, (1.0 - smoothstep(m.z * 0.8, m.z, d)) * m.w);
    }
  }
  float f = vSonarPos.y / 15.0;
  float g = abs(fract(f - 0.5) - 0.5) / max(fwidth(f), 1e-4);
  float lineV = 1.0 - min(g, 1.0);
  gl_FragColor.rgb += uSonarColor * (ring * 0.6 + mapped * (lineV * 0.5 + 0.03));
}
#include <dithering_fragment>`
        );
    };
    this.terrain = new THREE.Mesh(geo, mat);
    this.scene.add(this.terrain);
  }

  buildWaterSurface() {
    const geo = new THREE.PlaneGeometry(2 * WX + 600, 2 * WZ + 600, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.waterUniforms = {
      uTime: { value: 0 },
      uAbove: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uFogColor: { value: new THREE.Color(0x0a3d55) },
      uFogDensity: { value: 0.008 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime; uniform float uAbove; uniform vec3 uCam; uniform vec3 uFogColor; uniform float uFogDensity;
        varying vec3 vW;
        float h(vec2 p){ return sin(p.x*0.35+uTime*1.3)*0.5 + sin(p.y*0.42-uTime*1.1)*0.5 + sin((p.x+p.y)*0.9+uTime*2.1)*0.25 + sin((p.x*1.7-p.y)*1.3-uTime*2.7)*0.12; }
        void main(){
          vec2 p = vW.xz; float e = 0.4;
          vec3 n = normalize(vec3(h(p-vec2(e,0.0))-h(p+vec2(e,0.0)), 3.0, h(p-vec2(0.0,e))-h(p+vec2(0.0,e))));
          vec3 v = normalize(uCam - vW);
          float d = length(uCam - vW);
          vec3 col; float a;
          if (uAbove > 0.5) {
            float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
            col = mix(vec3(0.02,0.2,0.34), vec3(0.62,0.84,0.97), 0.12 + 0.75*fres);
            vec3 r = reflect(-v, n);
            col += vec3(1.0,0.95,0.82) * pow(max(dot(r, normalize(vec3(0.3,0.9,0.25))),0.0), 90.0) * 1.6;
            col += vec3(0.9) * smoothstep(0.92, 1.0, h(p*2.3)) * 0.12;
            a = 0.94;
          } else {
            float c = h(p*1.6) * 0.5 + 0.5;
            col = mix(vec3(0.35,0.75,0.9), vec3(0.85,1.0,1.0), c*c);
            a = 0.55;
          }
          float f = 1.0 - exp(-uFogDensity*uFogDensity*d*d);
          gl_FragColor = vec4(mix(col, uFogColor, f), a);
        }`,
    });
    this.surface = new THREE.Mesh(geo, mat);
    this.surface.position.y = 0.0;
    this.surface.renderOrder = 1;
    this.scene.add(this.surface);

    // sky dome, only visible while the camera is above the water
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(800, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vD; void main(){
          float t = clamp(vD.y, 0.0, 1.0);
          vec3 col = mix(vec3(0.80,0.93,0.99), vec3(0.22,0.55,0.86), pow(t, 0.6));
          float sun = max(dot(vD, normalize(vec3(0.3,0.9,0.25))), 0.0);
          col += vec3(1.0,0.92,0.7) * (pow(sun, 400.0) * 2.0 + pow(sun, 12.0) * 0.25);
          if (vD.y < 0.0) col = vec3(0.05,0.25,0.38);
          gl_FragColor = vec4(col, 1.0); }`,
      })
    );
    sky.renderOrder = -10;
    sky.visible = false;
    this.sky = sky;
    this.scene.add(sky);
    this.splashes = [];
  }

  // Splash where the sub breaks through the surface.
  splash(pos) {
    const N = 140;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 2.5;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = 0.2;
      p[i * 3 + 2] = Math.sin(a) * r;
      const out = 2 + Math.random() * 5;
      vel[i * 3] = Math.cos(a) * out;
      vel[i * 3 + 1] = 5 + Math.random() * 9;
      vel[i * 3 + 2] = Math.sin(a) * out;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, map: dropTexture(), transparent: true, opacity: 0.95, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.position.set(pos.x, 0, pos.z);
    this.scene.add(pts);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.08, pos.z);
    this.scene.add(ring);
    this.splashes.push({ pts, vel, ring, t: 0, kind: 'splash' });
  }

  // Burst of bubbles (e.g. around the sub right after diving in).
  bubbleBurst(pos, n = 90, spread = 3) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * spread * 2;
      p[i * 3 + 1] = (Math.random() - 0.5) * spread;
      p[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;
      vel[i * 3] = (Math.random() - 0.5) * 1.5;
      vel[i * 3 + 1] = 2 + Math.random() * 4;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ color: 0xe6fbff, size: 0.4, map: bubbleTexture(), transparent: true, opacity: 0.9, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.position.copy(pos);
    this.scene.add(pts);
    this.splashes.push({ pts, vel, t: 0, kind: 'bubbles' });
  }

  updateSplashes(dt) {
    for (const s of this.splashes) {
      s.t += dt;
      const arr = s.pts.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        if (s.kind === 'splash') s.vel[i + 1] -= 18 * dt;
        arr[i] += s.vel[i] * dt;
        arr[i + 1] += s.vel[i + 1] * dt;
        arr[i + 2] += s.vel[i + 2] * dt;
        if (s.kind === 'bubbles') arr[i] += Math.sin(s.t * 6 + i) * dt * 0.3;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      const life = s.kind === 'splash' ? 1.7 : 3.2;
      s.pts.material.opacity = Math.max(0, 1 - s.t / life);
      if (s.ring) {
        s.ring.scale.setScalar(1 + s.t * 4);
        s.ring.material.opacity = Math.max(0, 0.8 - s.t / 2);
      }
      if (s.t > life) {
        this.scene.remove(s.pts);
        s.pts.geometry.dispose();
        if (s.ring) this.scene.remove(s.ring);
        s.dead = true;
      }
    }
    this.splashes = this.splashes.filter((s) => !s.dead);
  }

  // ---------------- research vessel HMS Andrew ----------------
  // Local frame: bow at -z, stern at +z, deck ~2.6 above the waterline (y = 0).
  buildShip() {
    const g = new THREE.Group();
    const B = new PartBuilder();
    const M = {
      deck: new THREE.MeshStandardMaterial({ color: 0x6e7b76, roughness: 0.9, side: THREE.DoubleSide }),
      white: new THREE.MeshStandardMaterial({ color: 0xeef2f4, roughness: 0.55 }),
      white2: new THREE.MeshStandardMaterial({ color: 0xdfe5e8, roughness: 0.6, side: THREE.DoubleSide }),
      win: new THREE.MeshStandardMaterial({ color: 0x0b2236, roughness: 0.12, metalness: 0.6, emissive: 0x16465f, emissiveIntensity: 0.45 }),
      orange: new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5 }),
      cyan: new THREE.MeshStandardMaterial({ color: 0x2fd3e8, roughness: 0.5 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.6, metalness: 0.3 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x9aa6b2, roughness: 0.4, metalness: 0.6 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x2c63c9, roughness: 0.6 }),
      yellow: new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.6 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0xe8642a, roughness: 0.8 }),
      lamp: new THREE.MeshBasicMaterial({ color: 0xfff2c4 }),
      red: new THREE.MeshBasicMaterial({ color: 0xff3344 }),
      green: new THREE.MeshBasicMaterial({ color: 0x33ff77 }),
    };
    // ---- hull shape
    const ZS = 18, ZB = -20.5;
    const tOf = (z) => (ZS - z) / (ZS - ZB); // 0 = stern, 1 = bow
    const beamAt = (t) => {
      if (t < 0.05) return 4.85 + (t / 0.05) * 0.35;
      if (t < 0.5) return 5.2;
      const u = (t - 0.5) / 0.5;
      return Math.max(0.05, 5.2 * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.12 * u));
    };
    const deckAt = (t) => 2.6 + (t > 0.58 ? 1.3 * ((t - 0.58) / 0.42) ** 2 : 0);
    const keelAt = (t) => (t < 0.07 ? -0.9 - (t / 0.07) * 0.9 : t > 0.86 ? -1.8 + ((t - 0.86) / 0.14) ** 1.5 * 1.7 : -1.8);
    const expAt = (t) => (t > 0.55 ? 6 - 4 * Math.min(1, (t - 0.55) / 0.4) : t < 0.07 ? 3.5 + (t / 0.07) * 2.5 : 6);
    this.deckAt = (z) => deckAt(clamp(tOf(z), 0, 1));
    // hull outline for collisions (ship-local z): half beam and keel depth
    this.hull = { zb: ZB, zs: ZS, beam: (z) => beamAt(clamp(tOf(z), 0, 1)), keel: (z) => keelAt(clamp(tOf(z), 0, 1)) };
    const sectionRows = (D, K) => {
      const l = (a, b, f) => a + (b - a) * f;
      return [
        [D, 1], [D - 0.28, 1], [D - 0.3, 0], [l(D - 0.3, 0.42, 0.35), 0], [l(D - 0.3, 0.42, 0.7), 0], [0.42, 0], [0.4, 2], [0.23, 2], [0.06, 2], [0.04, 3],
        [l(0.04, K, 0.35), 3], [l(0.04, K, 0.65), 3], [l(0.04, K, 0.85), 3], [l(0.04, K, 0.95), 3], [K, 3],
      ];
    };
    const COLS = [new THREE.Color(0x14304a), new THREE.Color(0xf2f4f5), new THREE.Color(0x111214), new THREE.Color(0xa8322a)];
    const NS = 48;
    const stations = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS;
      const z = ZS - t * (ZS - ZB);
      const Bm = beamAt(t), D = deckAt(t), K = Math.min(keelAt(t), 0.0), n = expAt(t);
      const rows = sectionRows(D, K).map(([y, c]) => {
        const f = clamp((D - y) / (D - K), 0, 1);
        return [Bm * Math.pow(Math.max(0, 1 - Math.pow(f, n)), 1 / n), y, c];
      });
      stations.push({ z, t, D, Bm, rows });
    }
    const R = stations[0].rows.length;
    const pos = [], col = [], idx = [];
    // vertices: per station right side rows 0..R-1 then left side R-2..0 (keel shared)
    const W = 2 * R - 1;
    for (const st of stations) {
      const pts = [...st.rows.map(([x, y, c]) => [x, y, c]), ...st.rows.slice(0, R - 1).reverse().map(([x, y, c]) => [-x, y, c])];
      for (const [x, y, c] of pts) {
        pos.push(x, y, st.z);
        col.push(COLS[c].r, COLS[c].g, COLS[c].b);
      }
    }
    for (let i = 0; i < NS; i++) {
      for (let j = 0; j < W - 1; j++) {
        const a = i * W + j, b = a + 1, c2 = a + W, d = c2 + 1;
        idx.push(a, c2, b, b, c2, d);
      }
    }
    // transom (stern face)
    const base = pos.length / 3;
    const st0 = stations[0];
    pos.push(0, (st0.D + st0.rows[R - 1][1]) / 2, ZS);
    col.push(COLS[0].r, COLS[0].g, COLS[0].b);
    for (let j = 0; j < W - 1; j++) idx.push(base, j, j + 1);
    idx.push(base, W - 1, 0);
    const hullGeo = new THREE.BufferGeometry();
    hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    hullGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    hullGeo.setIndex(idx);
    hullGeo.computeVertexNormals();
    g.add(new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide })));
    // deck surface with a little camber
    const dpos = [], didx = [];
    for (const st of stations) {
      const e = Math.max(0.02, st.Bm - 0.02);
      dpos.push(e, st.D, st.z, 0, st.D + 0.06, st.z, -e, st.D, st.z);
    }
    for (let i = 0; i < NS; i++) {
      const a = i * 3;
      didx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
    const deckGeo = new THREE.BufferGeometry();
    deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
    deckGeo.setIndex(didx);
    deckGeo.computeVertexNormals();
    g.add(new THREE.Mesh(deckGeo, M.deck));
    // white bulwark around the foredeck + top rail
    const bpos = [], bidx = [];
    const bow = stations.filter((s) => s.t >= 0.46);
    for (const side of [1, -1]) {
      const off = bpos.length / 3;
      for (const st of bow) {
        const x = side * Math.max(0.03, st.Bm - 0.04);
        bpos.push(x, st.D, st.z, x, st.D + 1.05, st.z);
      }
      for (let i = 0; i < bow.length - 1; i++) {
        const a = off + i * 2;
        bidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const bulGeo = new THREE.BufferGeometry();
    bulGeo.setAttribute('position', new THREE.Float32BufferAttribute(bpos, 3));
    bulGeo.setIndex(bidx);
    bulGeo.computeVertexNormals();
    g.add(new THREE.Mesh(bulGeo, M.white2));
    for (const side of [1, -1]) {
      const pts = bow.map((st) => new THREE.Vector3(side * Math.max(0.03, st.Bm - 0.04), st.D + 1.08, st.z));
      B.add(M.steel, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 5, false));
    }
    // railings on the main and aft deck (stanchions + two rails)
    for (const side of [1, -1]) {
      for (let z = -1; z <= 17; z += 1.5) {
        const st = stations[Math.round(tOf(z) * NS)];
        B.add(M.steel, POST, { p: [side * (st.Bm - 0.1), st.D + 0.6, z] });
      }
      for (const y of [3.25, 3.75]) B.add(M.steel, new THREE.BoxGeometry(0.05, 0.05, 18.2), { p: [side * 5.1, y, 8] });
    }
    // hull portholes, anchors, names
    for (const side of [1, -1]) {
      for (let z = -3; z <= 12; z += 1.5) {
        const st = stations[Math.round(tOf(z) * NS)];
        B.add(M.win, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12).rotateZ(Math.PI / 2), { p: [side * (st.Bm + 0.01), 1.55, z] });
        B.add(M.steel, new THREE.TorusGeometry(0.19, 0.035, 5, 12).rotateY(Math.PI / 2), { p: [side * (st.Bm + 0.03), 1.55, z] });
      }
      const sa = stations[Math.round(tOf(-16.5) * NS)];
      B.add(M.dark, new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14).rotateZ(Math.PI / 2), { p: [side * (sa.Bm + 0.02), sa.D - 0.6, -16.5] });
      B.add(M.dark, new THREE.BoxGeometry(0.12, 1.0, 0.18), { p: [side * (sa.Bm + 0.08), sa.D - 1.3, -16.5] });
      B.add(M.dark, new THREE.BoxGeometry(0.14, 0.18, 0.75), { p: [side * (sa.Bm + 0.1), sa.D - 1.8, -16.5] });
    }
    const nameMat = new THREE.MeshBasicMaterial({ map: shipNameTexture(), transparent: true });
    for (const side of [1, -1]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), nameMat);
      pl.position.set(side * 5.23, 1.85, -1.5);
      pl.rotation.y = side * Math.PI / 2;
      g.add(pl);
    }
    const sternName = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.9), nameMat);
    sternName.position.set(0, 1.6, ZS + 0.03);
    g.add(sternName);

    // ---- superstructure (white, three decks + bridge)
    const levels = [
      { y0: 2.6, h: 2.6, w: 8.6, z0: -14.6, z1: -1.5 },
      { y0: 5.2, h: 2.3, w: 7.8, z0: -14.1, z1: -4.5 },
      { y0: 7.5, h: 2.3, w: 8.2, z0: -13.8, z1: -10.0 },
    ];
    levels.forEach((L, k) => {
      const len = L.z1 - L.z0, cz = (L.z0 + L.z1) / 2;
      B.add(M.white, new THREE.BoxGeometry(L.w, L.h, len), { p: [0, L.y0 + L.h / 2, cz] });
      B.add(M.white2, new THREE.BoxGeometry(L.w + 0.25, 0.12, len + 0.25), { p: [0, L.y0 + L.h + 0.06, cz] });
      const wy = L.y0 + L.h * 0.58;
      if (k < 2) {
        for (let z = L.z0 + 0.8; z < L.z1 - 0.5; z += 1.25) {
          for (const side of [1, -1]) B.add(M.win, new THREE.BoxGeometry(0.06, 0.62, 0.78), { p: [side * (L.w / 2 + 0.01), wy, z] });
        }
        for (let x = -L.w / 2 + 0.9; x < L.w / 2 - 0.5; x += 1.3) B.add(M.win, new THREE.BoxGeometry(0.8, 0.62, 0.06), { p: [x, wy, L.z0 - 0.01] });
        for (const side of [1, -1]) B.add(M.dark, new THREE.BoxGeometry(0.06, 1.7, 0.85), { p: [side * (L.w / 2 + 0.02), L.y0 + 0.85, L.z1 - 1.2] });
      }
      // railing around the roof
      for (const side of [1, -1]) {
        B.add(M.steel, new THREE.BoxGeometry(0.04, 0.04, len), { p: [side * (L.w / 2 + 0.05), L.y0 + L.h + 0.95, cz] });
        for (let z = L.z0; z <= L.z1; z += 1.2) B.add(M.steel, POST2, { p: [side * (L.w / 2 + 0.05), L.y0 + L.h + 0.5, z] });
      }
    });
    // bridge: tilted wrap-around windows + wings
    B.add(M.win, new THREE.BoxGeometry(8.0, 1.05, 0.1), { p: [0, 8.9, -13.88], r: [-0.22, 0, 0] });
    for (const side of [1, -1]) B.add(M.win, new THREE.BoxGeometry(0.1, 1.0, 3.4), { p: [side * 4.13, 8.85, -11.9] });
    B.add(M.white, new THREE.BoxGeometry(11.4, 0.22, 2.4), { p: [0, 7.6, -12.6] });
    for (const side of [1, -1]) {
      B.add(M.white, new THREE.BoxGeometry(1.4, 1.1, 2.0), { p: [side * 5.0, 8.25, -12.6] });
      B.add(M.win, new THREE.BoxGeometry(1.3, 0.55, 0.06), { p: [side * 5.0, 8.45, -13.62] });
      B.add(side < 0 ? M.red : M.green, new THREE.SphereGeometry(0.14, 8, 6), { p: [side * 5.75, 8.5, -12.0] });
    }
    // mast with radars, domes, antennas and lights
    B.add(M.white, new THREE.BoxGeometry(0.7, 5.2, 0.9).translate(0, 2.6, 0), { p: [0, 9.92, -11.3], r: [0.06, 0, 0] });
    B.add(M.steel, new THREE.BoxGeometry(4.2, 0.12, 0.6), { p: [0, 12.6, -11.15] });
    B.add(M.white, new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16), { p: [0, 13.3, -11.1] });
    B.add(M.white, new THREE.SphereGeometry(0.7, 14, 10), { p: [1.8, 10.8, -10.4] });
    B.add(M.white, new THREE.SphereGeometry(0.55, 14, 10), { p: [-1.8, 10.7, -10.4] });
    B.add(M.steel, new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8), { p: [1.8, 10.2, -10.4] });
    B.add(M.steel, new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8), { p: [-1.8, 10.15, -10.4] });
    for (const x of [-1.5, -0.7, 0.9, 1.6]) B.add(M.dark, new THREE.CylinderGeometry(0.025, 0.04, 2.4, 5), { p: [x, 14.3, -11.0] });
    B.add(M.lamp, new THREE.SphereGeometry(0.16, 8, 6), { p: [0, 15.4, -11.0] });
    B.add(M.steel, new THREE.CylinderGeometry(0.03, 0.03, 1.8, 5), { p: [0, 14.5, -11.0] });
    B.add(M.red, new THREE.SphereGeometry(0.12, 8, 6), { p: [-2.0, 12.75, -11.15] });
    B.add(M.green, new THREE.SphereGeometry(0.12, 8, 6), { p: [2.0, 12.75, -11.15] });
    for (const x of [-1.2, 1.2]) B.add(M.lamp, new THREE.BoxGeometry(0.35, 0.22, 0.2), { p: [x, 12.45, -11.55] });
    // funnel with company band and exhaust pipes
    const fun = new THREE.CylinderGeometry(1.05, 1.25, 4.2, 18);
    fun.scale(0.75, 1, 1.25);
    B.add(M.white, fun, { p: [0, 7.3, -3.6], r: [0.1, 0, 0] });
    B.add(M.cyan, new THREE.CylinderGeometry(1.06, 1.1, 0.8, 18).scale(0.76, 1, 1.26), { p: [0, 8.2, -3.5], r: [0.1, 0, 0] });
    B.add(M.dark, new THREE.CylinderGeometry(1.0, 1.04, 0.45, 18).scale(0.76, 1, 1.26), { p: [0, 9.3, -3.38], r: [0.1, 0, 0] });
    for (const [x, z] of [[-0.3, -3.6], [0.3, -3.6], [0, -3.0]]) B.add(M.dark, new THREE.CylinderGeometry(0.13, 0.13, 1.1, 8), { p: [x, 9.85, z], r: [0.1, 0, 0] });
    for (let i = 0; i < 5; i++) B.add(M.dark, new THREE.BoxGeometry(0.05, 0.7, 0.9), { p: [0.82, 6.4, -4.7 + i * 0.25] });
    // enclosed lifeboats on davits + liferaft canisters
    for (const side of [1, -1]) {
      const lb = new THREE.CapsuleGeometry(0.7, 3.0, 4, 12).rotateX(Math.PI / 2);
      lb.scale(1, 0.85, 1);
      B.add(M.orange, lb, { p: [side * 4.85, 6.35, -8.6] });
      B.add(M.white, new THREE.CapsuleGeometry(0.55, 2.2, 4, 10).rotateX(Math.PI / 2).scale(1, 0.7, 1), { p: [side * 4.85, 6.85, -8.6] });
      for (const z of [-10.3, -6.9]) {
        B.add(M.steel, new THREE.BoxGeometry(0.15, 2.2, 0.15), { p: [side * 4.3, 6.4, z], r: [0, 0, side * -0.35] });
        B.add(M.steel, new THREE.BoxGeometry(1.2, 0.12, 0.12), { p: [side * 4.65, 7.45, z] });
      }
      for (let i = 0; i < 4; i++) B.add(M.white, new THREE.CylinderGeometry(0.28, 0.28, 0.9, 12).rotateZ(Math.PI / 2), { p: [side * 3.6, 5.55 + (i % 2) * 0.58, -3.2 + Math.floor(i / 2) * 0.7] });
      B.add(M.steel, new THREE.BoxGeometry(1.1, 0.1, 1.6), { p: [side * 3.6, 5.27, -2.85] });
    }
    // foredeck: windlass, chain, bollards, fore mast
    const fz = -16.2, fD = this.deckAt(fz);
    for (const side of [1, -1]) {
      B.add(M.dark, new THREE.CylinderGeometry(0.45, 0.45, 0.6, 14).rotateZ(Math.PI / 2), { p: [side * 1.1, fD + 0.55, fz] });
      B.add(M.steel, new THREE.BoxGeometry(0.2, 0.7, 0.9), { p: [side * 0.55, fD + 0.35, fz] });
      B.add(M.dark, new THREE.BoxGeometry(0.16, 0.08, 2.4), { p: [side * 1.1, fD + 0.06, fz - 1.4], r: [0.08, side * -0.25, 0] });
      for (const z of [-13.4, -18.0]) {
        const d = this.deckAt(z);
        B.add(M.dark, BOLLARD, { p: [side * 2.6, d + 0.25, z] });
        B.add(M.dark, BOLLARD, { p: [side * 2.6, d + 0.25, z + 0.55] });
      }
    }
    B.add(M.steel, new THREE.CylinderGeometry(0.1, 0.14, 4.2, 8), { p: [0, fD + 2.1, -18.4] });
    B.add(M.lamp, new THREE.SphereGeometry(0.14, 8, 6), { p: [0, fD + 4.25, -18.4] });
    // aft working deck: knuckle crane, lab containers, workboat, CTD frame, bollards, deck lights, markings
    B.add(M.orange, new THREE.CylinderGeometry(0.6, 0.75, 1.6, 14), { p: [3.6, 3.4, 1.0] });
    B.add(M.orange, new THREE.BoxGeometry(1.3, 1.1, 1.5), { p: [3.6, 4.6, 1.0] });
    B.add(M.win, new THREE.BoxGeometry(0.06, 0.5, 0.8), { p: [2.94, 4.7, 1.0] });
    B.add(M.orange, new THREE.BoxGeometry(0.45, 0.45, 5.2).translate(0, 0, 2.6), { p: [3.6, 5.0, 1.0], r: [-0.55, 0, 0] });
    B.add(M.orange, new THREE.BoxGeometry(0.38, 0.38, 3.6).translate(0, 0, 1.8), { p: [3.6, 5.0 + Math.sin(0.55) * 5.2, 1.0 + Math.cos(0.55) * 5.2], r: [0.7, 0, 0] });
    B.add(M.dark, new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), { p: [3.6, 6.6, 8.5] });
    B.add(M.yellow, new THREE.BoxGeometry(0.3, 0.35, 0.3), { p: [3.6, 5.7, 8.5] });
    for (const [x, c] of [[-2.4, M.blue], [2.3, M.white]]) {
      B.add(c, new THREE.BoxGeometry(3.3, 2.5, 5.2), { p: [x, 3.88, 5.6] });
      B.add(M.dark, new THREE.BoxGeometry(3.32, 0.08, 5.22), { p: [x, 5.15, 5.6] });
      for (let i = 0; i < 6; i++) B.add(M.dark, new THREE.BoxGeometry(3.32, 2.3, 0.04), { p: [x, 3.88, 3.3 + i * 0.9] });
      B.add(M.steel, new THREE.BoxGeometry(1.0, 0.6, 0.8), { p: [x, 5.5, 4.4] });
      B.add(M.dark, new THREE.BoxGeometry(0.06, 1.9, 0.9), { p: [x + Math.sign(x) * 1.67, 3.6, 6.9] });
    }
    B.add(M.win, new THREE.BoxGeometry(0.06, 0.6, 1.3), { p: [3.96, 4.25, 5.0] });
    // workboat (RHIB) on a cradle, port side
    B.add(M.rubber, new THREE.CapsuleGeometry(0.32, 3.0, 4, 10).rotateX(Math.PI / 2), { p: [-4.2, 3.55, 10.2] });
    B.add(M.dark, new THREE.BoxGeometry(1.1, 0.35, 3.2), { p: [-4.2, 3.35, 10.2] });
    B.add(M.white, new THREE.BoxGeometry(0.6, 0.5, 0.7), { p: [-4.2, 3.85, 10.6] });
    for (const z of [9.2, 11.2]) B.add(M.steel, new THREE.BoxGeometry(1.2, 0.5, 0.15), { p: [-4.2, 2.95, z] });
    // CTD side frame, starboard
    for (const z of [9.3, 11.1]) B.add(M.yellow, new THREE.BoxGeometry(0.22, 3.2, 0.22), { p: [4.95, 4.1, z], r: [0, 0, -0.35] });
    B.add(M.yellow, new THREE.BoxGeometry(0.22, 0.22, 2.2), { p: [5.5, 5.6, 10.2] });
    B.add(M.dark, new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12).rotateX(Math.PI / 2), { p: [5.55, 5.35, 10.2] });
    B.add(M.dark, new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12).rotateZ(Math.PI / 2), { p: [3.6, 3.2, 10.2] });
    // winch drum, cradle for the sub, bollards, deck lights, yellow work-area markings
    B.add(M.dark, new THREE.CylinderGeometry(0.9, 0.9, 3.0, 16).rotateZ(Math.PI / 2), { p: [0, 3.55, 11.6] });
    for (const sx of [-1, 1]) B.add(M.orange, new THREE.BoxGeometry(0.35, 2.0, 2.0), { p: [sx * 1.7, 3.6, 11.6] });
    for (const sx of [-1, 1]) B.add(M.steel, new THREE.BoxGeometry(0.3, 0.6, 3.0), { p: [sx * 1.2, 2.95, 15.3] });
    for (const side of [1, -1]) {
      for (const z of [0.5, 13.5, 16.8]) {
        B.add(M.dark, BOLLARD, { p: [side * 4.5, 2.85, z] });
        B.add(M.dark, BOLLARD, { p: [side * 4.5, 2.85, z + 0.55] });
      }
      B.add(M.steel, new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), { p: [side * 4.85, 4.3, 3.0] });
      B.add(M.lamp, new THREE.BoxGeometry(0.4, 0.25, 0.3), { p: [side * 4.65, 6.0, 3.0] });
    }
    for (const [x, z, w, d] of [[0, 8.2, 6.2, 0.1], [0, 17.2, 6.2, 0.1], [-3.1, 12.7, 0.1, 9.0], [3.1, 12.7, 0.1, 9.0]]) B.add(M.yellow, new THREE.BoxGeometry(w, 0.02, d), { p: [x, 2.62, z] });
    B.build(g);

    // rotating radars
    const radarA = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.3), M.dark);
    radarA.position.set(0, 13.5, -11.1);
    const radarB = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.26), M.dark);
    radarB.position.set(0, 10.25, -13.2);
    g.add(radarA, radarB);
    this.radars = [radarA, radarB];

    // A-frame (stern gantry) – pivots at its base, tilts aft to lower the sub
    const af = new THREE.Group();
    af.position.set(0, 2.7, 16.4);
    const AB = new PartBuilder();
    for (const sx of [-1, 1]) {
      AB.add(M.orange, new THREE.BoxGeometry(0.6, 8, 0.6), { p: [sx * 4.3, 4, 0], r: [0, 0, sx * 0.06] });
      for (let i = 0; i < 5; i++) AB.add(i % 2 ? M.dark : M.yellow, new THREE.BoxGeometry(0.62, 0.35, 0.62), { p: [sx * 4.3 - sx * 0.02 * i, 0.4 + i * 0.35, 0], r: [0, 0, sx * 0.06] });
      AB.add(M.dark, new THREE.CylinderGeometry(0.45, 0.45, 0.8, 10).rotateZ(Math.PI / 2), { p: [sx * 4.15, 0, 0] });
      AB.add(M.dark, new THREE.CylinderGeometry(0.32, 0.32, 0.3, 14).rotateZ(Math.PI / 2), { p: [sx * 1.5, 7.55, 0] });
      AB.add(M.steel, new THREE.BoxGeometry(0.12, 0.6, 0.5), { p: [sx * 1.5, 7.85, 0] });
    }
    AB.add(M.orange, new THREE.BoxGeometry(8.6, 0.7, 0.7), { p: [0, 8, 0] });
    AB.add(M.lamp, new THREE.BoxGeometry(0.5, 0.2, 0.3), { p: [-2.6, 7.6, -0.4] });
    AB.add(M.lamp, new THREE.BoxGeometry(0.5, 0.2, 0.3), { p: [2.6, 7.6, -0.4] });
    AB.build(af);
    g.add(af);
    this.aframe = af;
    // hydraulic rams between deck and A-frame legs (follow the tilt)
    this.rams = [-1, 1].map((sx) => {
      const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 10), M.steel);
      g.add(ram);
      return { ram, sx };
    });

    g.position.set(SHIP_X, 0, axisZ(SHIP_X) - 22);
    this.ship = g;
    this.shipPos = new THREE.Vector3(SHIP_X, -2, axisZ(SHIP_X) - 1);
    this.scene.add(g);
    this.setAframe(-0.15);
  }

  // Tilt the A-frame (radians, + = aft over the water).
  setAframe(a) {
    this.aframe.rotation.x = a;
    this.aframe.updateMatrix();
    for (const { ram, sx } of this.rams || []) {
      const p0 = new THREE.Vector3(sx * 4.3, 2.75, 12.6);
      const p1 = new THREE.Vector3(sx * 4.3, 3.6, 0).applyMatrix4(this.aframe.matrix);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      ram.position.copy(mid);
      ram.scale.set(1, p0.distanceTo(p1), 1);
      ram.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    }
    this.ship.updateMatrixWorld(true);
  }

  // World positions of the two chain sheaves on the A-frame beam.
  sheaves() {
    this.ship.updateMatrixWorld(true);
    return [-1.5, 1.5].map((x) => this.aframe.localToWorld(new THREE.Vector3(x, 7.4, 0)));
  }

  buildSnow() {
    const N = 1800;
    const pos = new Float32Array(N * 3);
    const rnd = mulberry32(42);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rnd() - 0.5) * 70;
      pos[i * 3 + 1] = (rnd() - 0.5) * 44;
      pos[i * 3 + 2] = (rnd() - 0.5) * 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snowUniforms = {
      uCam: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uLightPos: { value: new THREE.Vector3() },
      uLightDir: { value: new THREE.Vector3(0, 0, -1) },
      uLightOn: { value: 1 },
      uLightRange: { value: 45 },
      uAmbient: { value: 1 },
      uFogColor: { value: new THREE.Color() },
      uPixel: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.snowUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform vec3 uCam; uniform float uTime; uniform vec3 uLightPos; uniform vec3 uLightDir;
        uniform float uLightOn; uniform float uLightRange; uniform float uAmbient; uniform float uPixel;
        varying float vBright;
        void main() {
          vec3 box = vec3(70.0, 44.0, 70.0);
          vec3 p = position;
          p.y -= uTime * 0.35;
          p.x += sin(uTime * 0.2 + position.y) * 0.6;
          vec3 rel = mod(p - uCam + box * 0.5, box) - box * 0.5;
          vec3 wp = uCam + rel;
          vec3 toP = wp - uLightPos;
          float dist = length(toP);
          float cone = smoothstep(0.82, 0.95, dot(normalize(toP), uLightDir));
          float spot = uLightOn * cone * clamp(1.0 - dist / uLightRange, 0.0, 1.0);
          float camD = length(rel);
          vBright = clamp(spot * 1.4 + uAmbient * 0.5, 0.0, 1.0) * (1.0 - smoothstep(20.0, 34.0, camD));
          vec4 mv = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uPixel * 26.0 / max(-mv.z, 1.0);
        }`,
      fragmentShader: `
        varying float vBright;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float a = smoothstep(0.5, 0.15, length(c)) * vBright;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), a * 0.8);
        }`,
    });
    this.snow = new THREE.Points(geo, mat);
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xbfefff, 0x0a1a22, 1.0);
    this.sun = new THREE.DirectionalLight(0xe6fbff, 1.6);
    this.sun.position.set(0.3, 1, 0.2);
    this.scene.add(this.hemi, this.sun);
    this.scene.fog = new THREE.FogExp2(0x0a3d55, 0.008);
    this.scene.background = new THREE.Color(0x0a3d55);
  }

  buildSonar() {
    const geo = new THREE.SphereGeometry(1, 32, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x38e8ff, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false, fog: false });
    this.pingSphere = new THREE.Mesh(geo, mat);
    this.pingSphere.visible = false;
    this.scene.add(this.pingSphere);
    this.ping = null;
    this.mappedList = [];
    // coverage grid over the trench
    this.gridNX = 80;
    this.gridNZ = 42;
    this.grid = new Uint8Array(this.gridNX * this.gridNZ);
    this.trenchCells = 0;
    this.trenchMask = new Uint8Array(this.gridNX * this.gridNZ);
    for (let j = 0; j < this.gridNZ; j++) {
      for (let i = 0; i < this.gridNX; i++) {
        const { x, z } = this.cellCenter(i, j);
        if (Math.abs(z - axisZ(x)) < this.halfW) {
          this.trenchMask[j * this.gridNX + i] = 1;
          this.trenchCells++;
        }
      }
    }
    this.mappedCells = 0;
  }

  cellCenter(i, j) {
    return { x: -WX + (i + 0.5) * ((2 * WX) / this.gridNX), z: -WZ + (j + 0.5) * ((2 * WZ) / this.gridNZ) };
  }

  // Start a sonar ping. Returns list of newly mapped cell indices.
  startPing(origin, radius) {
    this.ping = { origin: origin.clone(), radius, t: 0 };
    return this.mapAround(origin, radius);
  }

  mapAround(origin, radius) {
    const newCells = [];
    const floorY = this.heightAt(origin.x, origin.z);
    const dy = origin.y - floorY;
    const hr = Math.sqrt(Math.max(0, radius * radius - dy * dy));
    if (hr > 8) {
      this.addMappedCircle(origin.x, origin.z, hr);
      const cw = (2 * WX) / this.gridNX, cd = (2 * WZ) / this.gridNZ;
      const i0 = Math.max(0, Math.floor((origin.x - hr + WX) / cw));
      const i1 = Math.min(this.gridNX - 1, Math.floor((origin.x + hr + WX) / cw));
      const j0 = Math.max(0, Math.floor((origin.z - hr + WZ) / cd));
      const j1 = Math.min(this.gridNZ - 1, Math.floor((origin.z + hr + WZ) / cd));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const k = j * this.gridNX + i;
          if (this.grid[k]) continue;
          const c = this.cellCenter(i, j);
          if ((c.x - origin.x) ** 2 + (c.z - origin.z) ** 2 <= hr * hr) {
            this.grid[k] = 1;
            newCells.push(k);
            if (this.trenchMask[k]) this.mappedCells++;
          }
        }
      }
    }
    return newCells;
  }

  addMappedCircle(x, z, r) {
    this.mappedList.push({ x, z, r });
    if (this.mappedList.length > 24) this.mappedList.shift();
    const arr = this.sonarUniforms.uMapped.value;
    for (let i = 0; i < 24; i++) {
      const m = this.mappedList[i];
      if (m) arr[i].set(m.x, m.z, m.r, 1);
      else arr[i].set(0, 0, 0, 0);
    }
  }

  // Apply cells mapped by a teammate.
  applyCells(cells, circle) {
    for (const k of cells) {
      if (!this.grid[k]) {
        this.grid[k] = 1;
        if (this.trenchMask[k]) this.mappedCells++;
      }
    }
    if (circle) this.addMappedCircle(circle.x, circle.z, circle.r);
  }

  mappedPercent() {
    return this.trenchCells ? (100 * this.mappedCells) / this.trenchCells : 0;
  }

  // Random point on the seafloor within a depth range (metres).
  randomFloorPoint(rng, minD, maxD, opts = {}) {
    for (let tries = 0; tries < 400; tries++) {
      let x, z;
      if (opts.nearAxis) {
        x = -WX + 60 + rng() * (2 * WX - 120);
        z = axisZ(x) + (rng() - 0.5) * 2 * opts.nearAxis;
      } else if (opts.nearX !== undefined) {
        x = opts.nearX + (rng() - 0.5) * 2 * (opts.spread || 150);
        z = (rng() - 0.5) * 2 * (WZ - 40);
      } else {
        x = -WX + 40 + rng() * (2 * WX - 80);
        z = -WZ + 40 + rng() * (2 * WZ - 80);
      }
      if (Math.abs(x) > WX - 30 || Math.abs(z) > WZ - 30) continue;
      const d = this.depthAt(x, z);
      if (d >= minD && d <= maxD) return new THREE.Vector3(x, this.heightAt(x, z), z);
    }
    return null;
  }

  addBubbles(pos) {
    const N = 60;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      seeds[i] = Math.random();
      p[i * 3] = (Math.random() - 0.5) * 2;
      p[i * 3 + 1] = Math.random() * 14;
      p[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({ color: 0xd8f6ff, size: 0.45, map: bubbleTexture(), transparent: true, opacity: 0.85, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.position.copy(pos);
    this.scene.add(pts);
    this.bubbleEmitters.push({ pts, seeds });
  }

  // Lighting, fog and colour for the current depth.
  updateEnvironment(depth, cameraPos, light) {
    const L = this.level;
    const above = cameraPos.y > 0.05;
    this.above = above;
    const top = new THREE.Color(L.tintTop);
    const deep = new THREE.Color(L.tintDeep);
    const t = smoothstep(0, 1100, depth);
    const col = top.clone().lerp(deep, t);
    const hadalDark = smoothstep(1000, 5000, depth);
    col.multiplyScalar(1 - 0.55 * hadalDark);
    const surf = Math.exp(-depth / 140);
    if (above) {
      this.scene.fog.color.setHex(0xc4e6f4);
      this.scene.background.setHex(0xc4e6f4);
      this.scene.fog.density = 0.0022;
      this.hemi.intensity = 1.5;
      this.sun.intensity = 2.4;
    } else {
      this.scene.fog.color.copy(col);
      this.scene.background.copy(col);
      this.scene.fog.density = 0.0045 + 0.0145 * smoothstep(0, 1500, depth);
      this.hemi.intensity = 1.3 * surf + 0.05;
      this.sun.intensity = 2.0 * surf;
    }
    this.sky.visible = above;
    this.sky.position.copy(cameraPos);
    this.snow.visible = !above;
    this.surface.visible = above || depth < 700 || cameraPos.y > -70;
    this.waterUniforms.uAbove.value = above ? 1 : 0;
    this.waterUniforms.uCam.value.copy(cameraPos);
    this.waterUniforms.uFogColor.value.copy(this.scene.fog.color);
    this.waterUniforms.uFogDensity.value = this.scene.fog.density;
    this.snowUniforms.uCam.value.copy(cameraPos);
    this.snowUniforms.uAmbient.value = clamp(surf * 1.5, 0, 1);
    this.snowUniforms.uFogColor.value.copy(col);
    if (light) {
      this.snowUniforms.uLightPos.value.copy(light.pos);
      this.snowUniforms.uLightDir.value.copy(light.dir);
      this.snowUniforms.uLightOn.value = light.on ? 1 : 0;
      this.snowUniforms.uLightRange.value = light.range;
    }
  }

  update(dt) {
    this.time += dt;
    this.snowUniforms.uTime.value = this.time;
    if (this.ping) {
      this.ping.t += dt;
      const speed = this.ping.radius / 1.6;
      const r = this.ping.t * speed;
      this.sonarUniforms.uPingOrigin.value.copy(this.ping.origin);
      this.sonarUniforms.uPingRadius.value = r;
      const alpha = 1 - this.ping.t / 2.2;
      this.sonarUniforms.uPingAlpha.value = Math.max(0, alpha);
      if (alpha <= 0) {
        this.ping = null;
        this.sonarUniforms.uPingAlpha.value = 0;
      }
    }
    for (const b of this.bubbleEmitters) {
      const arr = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < b.seeds.length; i++) {
        arr[i * 3 + 1] += dt * (1.5 + b.seeds[i] * 2);
        arr[i * 3] += Math.sin(this.time * 2 + i) * dt * 0.2;
        if (arr[i * 3 + 1] > 16) {
          arr[i * 3 + 1] = 0;
          arr[i * 3] = (Math.random() - 0.5) * 2;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
      }
      b.pts.geometry.attributes.position.needsUpdate = true;
    }
    this.waterUniforms.uTime.value = this.time;
    if (this.radars) this.radars.forEach((r, i) => (r.rotation.y += dt * (i ? 2.4 : 1.6)));
    this.ship.position.y = Math.sin(this.time * 0.7) * 0.12;
    this.updateSplashes(dt);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }
}
