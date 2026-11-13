// The research submersible: model, lights and movement.

import * as THREE from './vendor/three.min.js';
import { clamp, lerp } from './util.js';
import { WX, WZ } from './world.js';

export function buildSubModel(color = 0xf2a03d, withLights = false) {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.6, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0c2a44, roughness: 0.1, metalness: 0.5, emissive: 0x0a3050, emissiveIntensity: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });

  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 2.6, 6, 14), hullMat);
  hull.rotation.x = Math.PI / 2;
  g.add(hull);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), glassMat);
  dome.position.set(0, 0.05, -1.75);
  g.add(dome);
  const sail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 1.5), hullMat);
  sail.position.set(0, 1.0, 0.2);
  g.add(sail);
  const skid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 3.2), darkMat);
  skid.position.set(0, -1.05, 0);
  g.add(skid);
  for (const sx of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10), darkMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(sx * 1.15, -0.2, 0.9);
    g.add(pod);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lampMat);
    lamp.position.set(sx * 0.7, -0.55, -1.75);
    g.add(lamp);
  }
  const prop = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.05), darkMat);
    blade.position.y = 0.3;
    const holder = new THREE.Group();
    holder.rotation.z = (i * Math.PI * 2) / 3;
    holder.add(blade);
    prop.add(holder);
  }
  prop.position.set(0, 0, 2.35);
  g.add(prop);
  g.userData.prop = prop;
  g.userData.lampMat = lampMat;

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
  beam.position.set(0, -0.4, -1.9);
  g.add(beam);
  g.userData.beam = beam;

  if (withLights) {
    const spot = new THREE.SpotLight(0xfff3dc, 60, 45, 0.55, 0.55, 1.0);
    spot.position.set(0, -0.3, -1.9);
    const target = new THREE.Object3D();
    target.position.set(0, -2.5, -20);
    g.add(target);
    spot.target = target;
    g.add(spot);
    const fill = new THREE.PointLight(0xcfe8ff, 4, 14, 1.0);
    fill.position.set(0, 1.5, 0);
    g.add(fill);
    g.userData.spot = spot;
    g.userData.fill = fill;
  }
  return g;
}

export class Sub {
  constructor(scene, world, upgrades) {
    this.world = world;
    this.group = buildSubModel(0xf2a03d, true);
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
    if (fill) fill.intensity = on ? 4 : 0.6;
    beam.visible = on;
    lampMat.color.set(on ? 0xfff4d0 : 0x333333);
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  lightInfo() {
    const dir = this.forward().clone();
    dir.y = -0.12;
    dir.normalize();
    const p = this.pos.clone().addScaledVector(this.forward(), 1.9);
    return { pos: p, dir, on: this.lightOn, range: this.lightRange };
  }

  update(dt, input, opts = {}) {
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
    const prop = this.group.userData.prop;
    prop.rotation.z += dt * (2 + Math.abs(newFwd) * 3);
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
    const on = s.l !== 0;
    this.group.userData.beam.visible = on;
    this.group.userData.lampMat.color.set(on ? 0xfff4d0 : 0x333333);
  }

  update(dt) {
    this.group.position.lerp(this.target, 1 - Math.exp(-dt * 6));
    let d = this.targetYaw - this.group.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.group.rotation.y += d * (1 - Math.exp(-dt * 6));
    this.group.userData.prop.rotation.z += dt * 6;
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
