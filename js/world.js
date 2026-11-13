// The 3D world: trench terrain, water, light by depth, sonar mapping, marine snow, ship.

import * as THREE from './vendor/three.min.js';
import { clamp, smoothstep, fbm, ridge, lerp, mulberry32, hashString } from './util.js';

export const WX = 800; // half-size along the trench (units)
export const WZ = 420; // half-size across the trench
export const SCALE = 10; // metres per unit (depth readout)
export const SHIP_X = -520;
export const DEEP_X = 360;

let bubTex = null;
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
    const geo = new THREE.PlaneGeometry(2 * WX + 400, 2 * WZ + 400, 1, 1);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: true });
    this.surface = new THREE.Mesh(geo, mat);
    this.surface.position.y = 0.0;
    this.scene.add(this.surface);
  }

  buildShip() {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1d2a3a, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.6 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb03a2e, roughness: 0.6 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 30), hullMat);
    hull.position.y = 0.2;
    const keel = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.6, 29), redMat);
    keel.position.y = -1.1;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 9), whiteMat);
    cabin.position.set(0, 2.8, -6);
    const aframe1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), redMat);
    aframe1.position.set(-3, 4, 13);
    const aframe2 = aframe1.clone();
    aframe2.position.x = 3;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 0.4), redMat);
    beam.position.set(0, 7, 13);
    g.add(hull, keel, cabin, aframe1, aframe2, beam);
    g.position.set(SHIP_X, 0.6, axisZ(SHIP_X) - 18);
    this.ship = g;
    this.shipPos = new THREE.Vector3(SHIP_X, -2, axisZ(SHIP_X));
    this.scene.add(g);
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
    const top = new THREE.Color(L.tintTop);
    const deep = new THREE.Color(L.tintDeep);
    const t = smoothstep(0, 1100, depth);
    const col = top.clone().lerp(deep, t);
    const hadalDark = smoothstep(1000, 5000, depth);
    col.multiplyScalar(1 - 0.55 * hadalDark);
    this.scene.fog.color.copy(col);
    this.scene.background.copy(col);
    this.scene.fog.density = 0.0045 + 0.019 * smoothstep(0, 1500, depth);
    const surf = Math.exp(-depth / 140);
    this.hemi.intensity = 1.3 * surf + 0.05;
    this.sun.intensity = 2.0 * surf;
    this.surface.visible = depth < 700;
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
    this.surface.material.opacity = 0.5 + Math.sin(this.time * 0.8) * 0.05;
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
