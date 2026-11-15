// Finding your way: the light beacon over the deepest point and the map of the explored trench.

import * as THREE from './vendor/three.min.js';
import { WX, WZ, SCALE, axisZ } from './world.js';
import { t, fmtNum, fmtDec } from './i18n.js';

// ---------------------------------------------------------------------------
// A tall column of light over the deepest point – visible from far away through the dark water.
export class DeepBeacon {
  constructor(scene, p) {
    this.group = new THREE.Group();
    this.group.position.set(p.x, p.floorY, p.z);
    const H = 34; // a soft glow above the deepest point – only seen when you are already close
    const geo = new THREE.CylinderGeometry(1.4, 3.2, H, 24, 1, true);
    geo.translate(0, H / 2, 0);
    this.uni = { uT: { value: 0 }, uColor: { value: new THREE.Color(0xffd84a) }, uOp: { value: 0.3 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uni,
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uT; uniform vec3 uColor; uniform float uOp; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float up = 1.0 - vUv.y; float fade = pow(up, 2.2); float bands = 0.65 + 0.35 * sin(vUv.y * 40.0 - uT * 4.0); float edge = pow(abs(dot(vN, vV)), 0.8); gl_FragColor = vec4(uColor, uOp * fade * bands * edge); }',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.column = new THREE.Mesh(geo, mat);
    this.column.frustumCulled = false;
    this.group.add(this.column);
    // pulsing rings on the floor
    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(3, 3.6, 48), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.4;
      this.group.add(r);
      this.rings.push(r);
    }
    // a glowing core sphere
    this.core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.9, fog: false }));
    this.core.position.y = 2.2;
    this.group.add(this.core);
    scene.add(this.group);
  }

  found() {
    this.isFound = true;
    this.uni.uColor.value.set(0x5dff9a);
    this.uni.uOp.value = 0.3;
    for (const r of this.rings) r.material.color.set(0x5dff9a);
    this.core.material.color.set(0xb8ffd2);
  }

  // pos: the sub – the marker only fades in when you are very close (about 400 m)
  update(t, pos) {
    this.uni.uT.value = t;
    const d = pos ? Math.hypot(pos.x - this.group.position.x, (pos.y - this.group.position.y) * 0.5, pos.z - this.group.position.z) : 0;
    const near = pos ? Math.max(0, Math.min(1, (40 - d) / 15)) : 1;
    this.group.visible = near > 0.01;
    if (!this.group.visible) return;
    this.uni.uOp.value = (this.isFound ? 0.2 : 0.32) * near;
    this.rings.forEach((r, i) => {
      const k = ((t * 0.35 + i / 3) % 1);
      r.scale.setScalar(1 + k * 3);
      r.material.opacity = (1 - k) * (this.isFound ? 0.25 : 0.45) * near;
    });
    this.core.material.opacity = 0.6 * near;
    this.core.position.y = 2.2 + Math.sin(t * 2) * 0.4;
  }

  dispose(scene) {
    scene.remove(this.group);
  }
}

// ---------------------------------------------------------------------------
// The map: the whole trench seen from above. Explored parts (where you have been or what the sonar mapped)
// show the depth in colour, the rest stays dark. Own sub, teammates, ship, finds, the deepest point.
const MW = 480, MH = Math.round((MW * WZ) / WX);
// one hue from light (shallow) to dark (deep)
const RAMP = [[0, [178, 238, 255]], [0.25, [86, 196, 238]], [0.5, [32, 128, 205]], [0.75, [22, 66, 160]], [1, [24, 22, 96]]];
function rampColor(k) {
  k = Math.min(1, Math.max(0, k));
  for (let i = 1; i < RAMP.length; i++) {
    if (k <= RAMP[i][0]) {
      const [k0, c0] = RAMP[i - 1], [k1, c1] = RAMP[i];
      const u = (k - k0) / (k1 - k0);
      return [c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

export class MapView {
  constructor(dive) {
    this.dive = dive;
    const W = dive.world;
    this.nx = W.gridNX;
    this.nz = W.gridNZ;
    this.seen = new Uint8Array(this.nx * this.nz);
    this.trail = [];
    this.trailT = 0;
    this.markT = 0;
    // depth picture of the whole trench (computed once per dive)
    const base = document.createElement('canvas');
    base.width = MW;
    base.height = MH;
    const g = base.getContext('2d');
    const img = g.createImageData(MW, MH);
    const maxD = dive.level.maxDepth;
    for (let py = 0; py < MH; py++) {
      const z = -WZ + ((py + 0.5) / MH) * 2 * WZ;
      for (let px = 0; px < MW; px++) {
        const x = -WX + ((px + 0.5) / MW) * 2 * WX;
        const d = W.depthAt(x, z);
        // a little hill shading from the slope in x/z
        const dx = W.depthAt(x + 4, z) - d, dz = W.depthAt(x, z + 4) - d;
        const shade = Math.max(-0.18, Math.min(0.18, (dx + dz) / 900));
        const c = rampColor(Math.sqrt(Math.max(0, d) / maxD));
        const o = (py * MW + px) * 4;
        img.data[o] = c[0] * (1 - shade);
        img.data[o + 1] = c[1] * (1 - shade);
        img.data[o + 2] = c[2] * (1 - shade);
        img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    this.base = base;
    // fog over everything not explored yet; explored spots are wiped out with soft circles
    this.fog = document.createElement('canvas');
    this.fog.width = MW;
    this.fog.height = MH;
    const fg = this.fog.getContext('2d');
    fg.fillStyle = 'rgba(3, 12, 22, 0.84)';
    fg.fillRect(0, 0, MW, MH);
    this.gridDone = new Uint8Array(this.nx * this.nz);
    this.el = document.getElementById('map');
    this.canvas = this.el.querySelector('canvas');
    this.canvas.width = MW * 2;
    this.canvas.height = MH * 2;
    this.open = false;
  }

  // wipe a soft hole into the fog (world units)
  reveal(x, z, r) {
    const fg = this.fog.getContext('2d');
    const px = ((x + WX) / (2 * WX)) * MW, py = ((z + WZ) / (2 * WZ)) * MH, pr = (r / (2 * WX)) * MW;
    const grd = fg.createRadialGradient(px, py, pr * 0.45, px, py, pr);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    fg.globalCompositeOperation = 'destination-out';
    fg.fillStyle = grd;
    fg.beginPath();
    fg.arc(px, py, pr, 0, Math.PI * 2);
    fg.fill();
    fg.globalCompositeOperation = 'source-over';
  }

  // remember where the sub has been (the light reaches about 40–75 units)
  mark(pos, dt) {
    this.markT -= dt;
    if (this.markT > 0) return;
    this.markT = 0.5;
    this.reveal(pos.x, pos.z, 55);
    // cells mapped by the sonar (own pings and the teammates')
    const W = this.dive.world;
    if (W.mappedCells !== this.lastMapped) {
      this.lastMapped = W.mappedCells;
      for (let k = 0; k < W.grid.length; k++) {
        if (W.grid[k] && !this.gridDone[k]) {
          this.gridDone[k] = 1;
          const c = W.cellCenter(k % this.nx, Math.floor(k / this.nx));
          this.reveal(c.x, c.z, 22);
        }
      }
    }
    const r = 50;
    const cw = (2 * WX) / this.nx, cd = (2 * WZ) / this.nz;
    const i0 = Math.max(0, Math.floor((pos.x - r + WX) / cw)), i1 = Math.min(this.nx - 1, Math.floor((pos.x + r + WX) / cw));
    const j0 = Math.max(0, Math.floor((pos.z - r + WZ) / cd)), j1 = Math.min(this.nz - 1, Math.floor((pos.z + r + WZ) / cd));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const cx = -WX + (i + 0.5) * cw, cz = -WZ + (j + 0.5) * cd;
        if ((cx - pos.x) ** 2 + (cz - pos.z) ** 2 <= (r + cw * 0.5) ** 2) this.seen[j * this.nx + i] = 1;
      }
    }
    this.trailT -= 0.5;
    if (this.trailT <= 0) {
      this.trailT = 2;
      this.trail.push([pos.x, pos.z]);
      if (this.trail.length > 600) this.trail.shift();
    }
  }

  exploredPercent() {
    const W = this.dive.world;
    let n = 0, tot = 0;
    for (let k = 0; k < this.seen.length; k++) {
      if (!W.trenchMask[k]) continue;
      tot++;
      if (this.seen[k] || W.grid[k]) n++;
    }
    return tot ? (100 * n) / tot : 0;
  }

  toggle(force) {
    this.open = force ?? !this.open;
    this.el.classList.toggle('hidden', !this.open);
    document.getElementById('btnMap')?.classList.toggle('on', this.open);
    if (this.open) this.draw();
  }

  update(dt) {
    if (!this.open) return;
    this.drawT = (this.drawT || 0) - dt;
    if (this.drawT > 0) return;
    this.drawT = 0.25;
    this.draw();
  }

  draw() {
    const d = this.dive, W = d.world;
    const c = this.canvas, g = c.getContext('2d');
    const S = c.width / MW;
    const P = (x, z) => [((x + WX) / (2 * WX)) * c.width, ((z + WZ) / (2 * WZ)) * c.height];
    g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.base, 0, 0, c.width, c.height);
    // unexplored: dark
    g.drawImage(this.fog, 0, 0, c.width, c.height);
    // the trench axis as a faint guide line
    g.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    g.setLineDash([6 * S, 6 * S]);
    g.lineWidth = 1.2 * S;
    g.beginPath();
    for (let x = -WX; x <= WX; x += 20) {
      const [px, py] = P(x, axisZ(x));
      if (x === -WX) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    g.setLineDash([]);
    // own trail
    if (this.trail.length > 1) {
      g.strokeStyle = 'rgba(255, 237, 0, 0.55)';
      g.lineWidth = 2 * S;
      g.beginPath();
      this.trail.forEach(([x, z], i) => {
        const [px, py] = P(x, z);
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      });
      const [sx, sz] = P(d.sub.pos.x, d.sub.pos.z);
      g.lineTo(sx, sz);
      g.stroke();
    }
    const label = (txt, x, y, color = '#fff') => {
      g.font = `700 ${11 * S}px "Source Sans 3", system-ui, sans-serif`;
      g.lineWidth = 3 * S;
      g.strokeStyle = 'rgba(0,0,0,0.75)';
      g.strokeText(txt, x, y);
      g.fillStyle = color;
      g.fillText(txt, x, y);
    };
    // ship
    const [shx, shy] = P(W.shipPos.x, W.shipPos.z);
    g.fillStyle = '#ffffff';
    g.font = `${16 * S}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('🚢', shx, shy);
    // finds
    for (const f of d.found) {
      if (!f.pos) continue;
      const [fx, fy] = P(f.pos.x, f.pos.z);
      g.beginPath();
      g.arc(fx, fy, 3.2 * S, 0, Math.PI * 2);
      g.fillStyle = f.def.kind === 'fantasy' ? '#ff6ad5' : '#ffffff';
      g.fill();
      g.lineWidth = 1.2 * S;
      g.strokeStyle = '#000';
      g.stroke();
    }
    // Atlantis
    if (d.atlantis) {
      const [ax, ay] = P(d.atlantis.center.x, d.atlantis.center.z);
      g.font = `${18 * S}px system-ui, sans-serif`;
      g.fillText('🏛️', ax, ay);
      label('Atlantis', ax, ay + 15 * S, '#ffd6ff');
    }
    // wrecks you have already seen
    if (d.wrecks) {
      g.font = `${15 * S}px system-ui, sans-serif`;
      for (const w of d.wrecks.sites) {
        if (!w.found) continue;
        const [wx, wy] = P(w.obj.position.x, w.obj.position.z);
        g.fillText(w.kind === 'ship' ? '⚓' : '✈️', wx, wy);
      }
    }
    // team challenges (co-op)
    if (d.team) {
      g.font = `${14 * S}px system-ui, sans-serif`;
      for (const c of d.team.list) {
        const [cx, cy] = P(c.b.group.position.x, c.b.group.position.z);
        g.fillText(c.done ? '✅' : '🤝', cx, cy);
      }
    }
    // the deepest point is not drawn on the map – you find it with the guide under the missions
    const dp = d.cm.deepest;
    // teammates
    for (const r of d.remote.values()) {
      const p = r.group.position;
      const [rx, ry] = P(p.x, p.z);
      g.beginPath();
      g.arc(rx, ry, 4.2 * S, 0, Math.PI * 2);
      g.fillStyle = typeof r.color === 'number' ? '#' + r.color.toString(16).padStart(6, '0') : '#4fd1ff';
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 1.4 * S;
      g.stroke();
      if (r.name) label(r.name, rx, ry - 10 * S);
    }
    // own sub: arrow in the direction of travel
    const [mx, my] = P(d.sub.pos.x, d.sub.pos.z);
    const yaw = d.sub.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const ang = Math.atan2(fz, fx);
    g.save();
    g.translate(mx, my);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(9 * S, 0);
    g.lineTo(-6 * S, -5.5 * S);
    g.lineTo(-3 * S, 0);
    g.lineTo(-6 * S, 5.5 * S);
    g.closePath();
    g.fillStyle = '#ffed00';
    g.fill();
    g.lineWidth = 1.6 * S;
    g.strokeStyle = '#000';
    g.stroke();
    g.restore();
    // info line
    const dist = Math.hypot(d.sub.pos.x - dp.x, d.sub.pos.z - dp.z) * SCALE;
    const info = this.el.querySelector('.map-info');
    if (info) {
      info.textContent = `${t('mapExplored', { p: Math.round(this.exploredPercent()) })} · ${d.atDeepest ? '✓ ' + t('deepestFound') : t('mapToDeepest', { d: fmtDist(dist) })}`;
    }
  }
}

export function fmtDist(m) {
  return m >= 1000 ? `${fmtDec(m / 1000, 1)} km` : `${fmtNum(Math.round(m / 10) * 10)} m`;
}
