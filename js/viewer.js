// A small separate 3D view: shows one animal / object / sub large and lets the camera
// circle around it (discovery card, sub picker). Also renders "turntables"
// (a strip of frames from all sides) for the rotating thumbnails on the results screen.

import * as THREE from './vendor/three.min.js';
import { buildModel, animUpper } from './creatures.js';
import { buildSubModel, animateSubModel } from './sub.js';
import { buildMerFigure, animMer, MER_PALETTES, buildNeptune, animNeptune } from './merfolk.js';
import { buildFable } from './fables.js';

function makeFigure(name) {
  const f = name === 'neptune' ? buildNeptune() : buildMerFigure(MER_PALETTES.atlantis);
  f.group.userData.fig = f;
  f.group.userData.figName = name;
  return f.group;
}

let shared = null;
export function viewer() {
  if (!shared) shared = new Viewer();
  return shared;
}

// Build a model by kind: 'sub:<id>' or a creature model name.
export function makeModel(key) {
  if (key.startsWith('fig:')) return makeFigure(key.slice(4)); // Neptune / mermaid: only shown after meeting them in Atlantis
  if (key.startsWith('fable:')) return buildFable(key.slice(6), 6).group; // the secret fable creatures (results, after meeting them)
  if (key.startsWith('sub:')) {
    const m = buildSubModel(key.slice(4), null, false);
    if (m.userData.beam) m.remove(m.userData.beam);
    if (m.userData.glowMat) m.userData.glowMat.opacity = 0.5;
    return m;
  }
  return buildModel(key);
}

function disposeTree(o) {
  o.traverse((c) => {
    if (c.geometry) c.geometry.dispose();
  });
}

class Viewer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'viewer3d';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xdff6ff, 0x1a3048, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(3, 5, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fe0ff, 1.2);
    rim.position.set(-4, 2, -5);
    this.scene.add(rim);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 500);
    this.model = null;
    this.raf = 0;
    this.angle = 0;
  }

  setModel(key) {
    if (this.model) {
      this.scene.remove(this.model);
      disposeTree(this.model);
    }
    this.key = key;
    this.model = makeModel(key);
    this.model.rotation.y = 0;
    this.scene.add(this.model);
    this.model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    this.model.traverse((o) => {
      if (o.isMesh && !(o.material && o.material.blending === THREE.AdditiveBlending)) box.expandByObject(o);
    });
    if (box.isEmpty()) box.setFromObject(this.model);
    this.center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    this.radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
  }

  // distance so the model fills the view
  place(angle, w, h, zoom = 1) {
    const vfov = (this.camera.fov * Math.PI) / 180;
    const fit = Math.max(this.radius / Math.tan(vfov / 2), this.radius / (Math.tan(vfov / 2) * (w / h)));
    const d = fit * 1.18 * zoom;
    const c = this.center;
    this.camera.position.set(c.x + Math.sin(angle) * d, c.y + d * 0.28 + Math.sin(angle * 0.7) * d * 0.08, c.z + Math.cos(angle) * d);
    this.camera.lookAt(c);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Show a model live inside a container element until hide() is called.
  show(container, key, opts = {}) {
    const { speed = 0.5, zoom = 1, drag: canDrag = true, start } = opts;
    this.hide();
    this.setModel(key);
    this.opts = opts;
    if (start !== undefined) this.angle = start;
    container.appendChild(this.canvas);
    const fitToBox = () => {
      const r = container.getBoundingClientRect();
      this.resize(Math.max(40, Math.round(r.width)), Math.max(40, Math.round(r.height)));
    };
    fitToBox();
    this.container = container;
    this.ro = new ResizeObserver(fitToBox);
    this.ro.observe(container);
    // drag to turn it yourself
    let drag = null;
    if (canDrag) container.onpointerdown = (e) => {
      drag = { x: e.clientX };
      container.setPointerCapture && container.setPointerCapture(e.pointerId);
    };
    container.onpointermove = (e) => {
      if (!drag) return;
      this.angle -= (e.clientX - drag.x) * 0.012;
      drag.x = e.clientX;
    };
    container.onpointerup = container.onpointercancel = () => (drag = null);
    this.dragging = () => !!drag;
    let last = performance.now();
    this.t = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.t += dt;
      if (!this.dragging || !this.dragging()) this.angle += dt * speed;
      if (this.model) {
        if (this.key.startsWith('sub:')) animateSubModel(this.model, dt, this.t, 2, true);
        else if (this.key.startsWith('fig:')) {
          const f = this.model.userData.fig;
          if (this.model.userData.figName === 'neptune') animNeptune(f.rig, this.t, dt, { bless: Math.max(0, Math.sin(this.t * 0.5)) });
          else animMer(f.rig, this.t, dt, 4, {});
        } else animUpper(this.model, this.key, this.t * 1.2);
      }
      this.place(this.angle, this.w, this.h, zoom);
      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  hide() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.ro) this.ro.disconnect();
    this.ro = null;
    if (this.container) this.container.onpointerdown = this.container.onpointermove = this.container.onpointerup = this.container.onpointercancel = null;
    this.dragging = null;
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.container = null;
  }

  get active() {
    return !!this.raf;
  }

  // A strip of `n` frames all around the model (w × h each) for cheap rotating thumbnails.
  turntable(key, n = 24, w = 200, h = 150) {
    const wasActive = this.active ? { container: this.container, key: this.key, opts: { ...this.opts, start: this.angle } } : null;
    this.hide();
    this.setModel(key);
    this.resize(w, h);
    const strip = document.createElement('canvas');
    const pr = this.renderer.getPixelRatio();
    strip.width = w * n * pr;
    strip.height = h * pr;
    const g = strip.getContext('2d');
    for (let i = 0; i < n; i++) {
      if (this.model && !key.startsWith('sub:')) animUpper(this.model, key, i * 0.4);
      this.place(-0.8 + (i / n) * Math.PI * 2, w, h);
      this.renderer.render(this.scene, this.camera);
      g.drawImage(this.canvas, i * w * pr, 0, w * pr, h * pr);
    }
    if (wasActive && wasActive.container && wasActive.container.isConnected) this.show(wasActive.container, wasActive.key, wasActive.opts);
    return { strip, n, w: w * pr, h: h * pr };
  }
}

// Play a turntable strip in a canvas element (returns a stop function).
export function playTurntable(canvas, tt, fps = 12) {
  canvas.width = tt.w;
  canvas.height = tt.h;
  const g = canvas.getContext('2d');
  let i = 0, last = 0, raf = 0;
  const step = (now) => {
    if (!canvas.isConnected) return;
    if (now - last > 1000 / fps) {
      last = now;
      g.clearRect(0, 0, tt.w, tt.h);
      g.drawImage(tt.strip, i * tt.w, 0, tt.w, tt.h, 0, 0, tt.w, tt.h);
      i = (i + 1) % tt.n;
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
