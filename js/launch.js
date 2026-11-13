// Launch sequence: the sub hangs on two chains from the ship's A-frame, swings
// out over the stern, is lowered into the sea and released. Skippable.

import * as THREE from './vendor/three.min.js';
import { smoothstep, clamp, lerp } from './util.js';

const LINK = new THREE.TorusGeometry(0.17, 0.055, 4, 8);
const LINK_LEN = 0.26;
const MAX_LINKS = 64;

export class Launch {
  constructor(dive, { short = false } = {}) {
    this.dive = dive;
    this.world = dive.world;
    this.sub = dive.sub;
    this.t = 0;
    this.T = short ? { lift: 0.5, swing: 1.4, lower: 3.4, release: 4.2 } : { lift: 1.1, swing: 2.7, lower: 5.2, release: 6.2 };
    this.mesh = new THREE.InstancedMesh(LINK, new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 }), MAX_LINKS * 2);
    this.mesh.frustumCulled = false;
    dive.scene.add(this.mesh);
    this.sub.locked = true;
    this.sub.yaw = -Math.PI / 2;
    this.sub.vel.set(0, 0, 0);
    this.L = 5.9;
    this.angle = -0.15;
    this.done = false;
    this.splashed = false;
    this.camUnder = false;
    this.released = false;
    this.camStart = null;
    this.camOrbit = 0;
    this.place();
  }

  skip() {
    if (this.t < this.T.lower - 0.1) this.t = this.T.lower - 0.1;
  }

  // Sub position from the A-frame angle and chain length.
  place() {
    const [a, b] = this.world.sheaves();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const swing = Math.sin(this.t * 2.2) * 0.35 * Math.exp(-Math.max(0, this.t - this.T.lift) * 0.6) * (this.t > this.T.lift ? 1 : 0);
    this.sub.pos.set(mid.x, mid.y - this.L - 1.1, mid.z + swing);
    this.sub.group.rotation.set(0, 0, 0);
    this.sub.group.rotation.order = 'YXZ';
    this.sub.group.rotation.y = this.sub.yaw;
    this.sub.group.rotation.z = swing * 0.15;
    this.sheaveA = a;
    this.sheaveB = b;
  }

  drawChains(drop = 0) {
    const s = this.sub.pos;
    // sub-local attach points (front at +x because the sub faces +x)
    const ends = [new THREE.Vector3(s.x - 1.1, s.y + 1.05, s.z), new THREE.Vector3(s.x + 1.0, s.y + 1.05, s.z)];
    const tops = [this.sheaveA, this.sheaveB];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), dir = new THREE.Vector3(), p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    let k = 0;
    for (let c = 0; c < 2; c++) {
      const top = tops[c];
      const end = drop > 0 ? top.clone().lerp(ends[c], 1 - drop) : ends[c];
      dir.subVectors(end, top);
      const len = dir.length();
      dir.normalize();
      const n = Math.min(MAX_LINKS, Math.floor(len / LINK_LEN));
      const base = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      for (let i = 0; i < n; i++) {
        p.copy(top).addScaledVector(dir, (i + 0.5) * LINK_LEN);
        q.copy(base);
        // alternate link orientation like a real chain
        q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i % 2 ? Math.PI / 2 : 0));
        q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
        m.compose(p, q, one);
        this.mesh.setMatrixAt(k++, m);
      }
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // Returns true while the launch is running.
  update(dt, camera) {
    if (this.done) {
      // A-frame swings back afterwards
      if (this.angle > -0.15) {
        this.angle = Math.max(-0.15, this.angle - dt * 0.35);
        this.world.setAframe(this.angle);
      }
      return false;
    }
    this.t += dt;
    const T = this.T;
    const t = this.t;
    const hooks = this.dive.hooks;
    if (t < T.lift) {
      this.L = lerp(5.9, 3.0, smoothstep(0, T.lift, t));
      if (!this.winch) {
        this.winch = true;
        hooks.winch(true);
      }
    } else if (t < T.swing) {
      this.angle = lerp(-0.15, 0.62, smoothstep(T.lift, T.swing, t));
      this.L = 3.0;
    } else if (t < T.lower) {
      this.angle = 0.62;
      this.L = lerp(3.0, 14, smoothstep(T.swing, T.lower, t));
    } else {
      this.angle = 0.62;
      if (!this.released) {
        this.released = true;
        hooks.winch(false);
        hooks.release();
      }
    }
    this.world.setAframe(this.angle);
    if (!this.released) {
      this.place();
      this.drawChains();
    } else {
      // free: the sub sinks a little while the empty chains are pulled up
      const f = smoothstep(T.lower, T.release, t);
      this.sub.pos.y -= dt * 2.2;
      this.drawChains(f);
      const [a, b] = this.world.sheaves();
      this.sheaveA = a;
      this.sheaveB = b;
    }
    // splash when the sub hits the water
    if (!this.splashed && this.sub.pos.y < 0.4) {
      this.splashed = true;
      this.world.splash(this.sub.pos);
      hooks.splash();
    }

    // camera
    const s = this.sub.pos;
    let desired, look;
    if (t < T.swing) {
      this.camOrbit += dt * 0.1;
      const a = 0.75 + this.camOrbit;
      desired = new THREE.Vector3(s.x + Math.sin(a) * 19, Math.max(s.y + 3.5, 4), s.z + Math.cos(a) * 19);
      look = new THREE.Vector3(s.x - 2, s.y - 0.5, s.z - 6);
    } else if (!this.released) {
      const f = smoothstep(T.swing, T.lower, t);
      const off = new THREE.Vector3(lerp(13, 7, f), lerp(3.5, 1.2, f), lerp(14, 8, f));
      desired = s.clone().add(off);
      // trail the sub so the camera goes under a moment later
      desired.y = Math.max(desired.y, s.y + 2.4);
      look = s.clone().add(new THREE.Vector3(0, -0.3, 0));
    } else {
      const fwd = this.sub.forward();
      const f = smoothstep(T.lower, T.release, t);
      const chase = s.clone().addScaledVector(fwd, -12).add(new THREE.Vector3(0, 5.5, 0));
      chase.y = Math.min(chase.y, -0.8);
      const side = s.clone().add(new THREE.Vector3(7, 1.2, 8));
      side.y = Math.min(side.y, -0.8);
      desired = side.lerp(chase, f);
      look = s.clone().addScaledVector(fwd, 18 * f).add(new THREE.Vector3(0, -1, 0));
    }
    if (!this.camStart) {
      this.camStart = true;
      camera.position.copy(desired);
    } else camera.position.lerp(desired, 1 - Math.exp(-dt * 3.5));
    camera.lookAt(look);
    if (!this.camUnder && camera.position.y < -0.05) {
      this.camUnder = true;
      hooks.underwater();
    }
    if (t >= T.release) this.finish();
    return true;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.mesh.visible = false;
    this.sub.locked = false;
    this.sub.vel.set(0, -2, 0);
    if (!this.splashed) {
      this.splashed = true;
      this.dive.hooks.splash();
    }
    if (!this.camUnder) {
      this.camUnder = true;
      this.dive.hooks.underwater();
    }
    this.dive.hooks.done();
  }
}

export { clamp };
