// Keyboard and touch controls.

export class Input {
  constructor() {
    this.keys = new Set();
    this.joy = { x: 0, y: 0, active: false };
    this.touchUp = false;
    this.touchDown = false;
    this.handlers = {};
    this.enabled = false;
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
  }

  on(action, fn) {
    this.handlers[action] = fn;
  }

  fire(action) {
    if (this.handlers[action]) this.handlers[action]();
  }

  onKey(e, down) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.code;
    if (down) this.keys.add(k);
    else this.keys.delete(k);
    if (!this.enabled) {
      if (down && k === 'Escape') this.fire('escape');
      if (down && k === 'KeyH') this.fire('help');
      return;
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    if (!down || e.repeat) return;
    const map = { KeyF: 'sonar', KeyL: 'light', KeyC: 'photo', Enter: 'photo', KeyG: 'grab', KeyI: 'ask', KeyH: 'help', KeyX: 'boost', KeyB: 'surface', Escape: 'escape', KeyP: 'escape', KeyM: 'mute' };
    if (map[k]) this.fire(map[k]);
  }

  bindTouch(root) {
    const joyEl = root.querySelector('#joystick');
    const knob = root.querySelector('#joyKnob');
    let joyId = null;
    let cx = 0, cy = 0;
    const R = 42;
    const start = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      joyId = t.identifier ?? 'mouse';
      const r = joyEl.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      move(e);
      e.preventDefault();
    };
    const move = (e) => {
      if (joyId === null) return;
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      const t = list.find((tt) => (tt.identifier ?? 'mouse') === joyId);
      if (!t) return;
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / R;
      this.joy.y = -dy / R;
      this.joy.active = true;
      e.preventDefault();
    };
    const end = (e) => {
      const list = e.changedTouches ? Array.from(e.changedTouches) : [e];
      if (!list.some((tt) => (tt.identifier ?? 'mouse') === joyId)) return;
      joyId = null;
      knob.style.transform = 'translate(0,0)';
      this.joy.x = this.joy.y = 0;
      this.joy.active = false;
    };
    joyEl.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    joyEl.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    const hold = (id, prop) => {
      const el = root.querySelector(id);
      const on = (e) => {
        this[prop] = true;
        el.classList.add('pressed');
        e.preventDefault();
      };
      const off = () => {
        this[prop] = false;
        el.classList.remove('pressed');
      };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off);
      el.addEventListener('touchcancel', off);
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    };
    hold('#btnUp', 'touchUp');
    hold('#btnDown', 'touchDown');

    root.querySelectorAll('[data-action]').forEach((el) => {
      const act = el.dataset.action;
      const fire = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.enabled || act === 'escape') this.fire(act);
      };
      el.addEventListener('touchstart', fire, { passive: false });
      // touchstart calls preventDefault, so no extra synthetic click follows on touch screens
      el.addEventListener('click', fire);
    });
  }

  state() {
    const k = this.keys;
    let throttle = 0, turn = 0, vertical = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) throttle += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) throttle -= 0.6;
    if (k.has('KeyA') || k.has('ArrowLeft')) turn -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) turn += 1;
    if (k.has('Space') || k.has('KeyE')) vertical += 1;
    if (k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyQ')) vertical -= 1;
    if (this.joy.active) {
      throttle += this.joy.y > 0 ? this.joy.y : this.joy.y * 0.6;
      turn += this.joy.x;
    }
    if (this.touchUp) vertical += 1;
    if (this.touchDown) vertical -= 1;
    const clampv = (v) => Math.max(-1, Math.min(1, v));
    const boost = k.has('ControlLeft') || k.has('ControlRight') || (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.95);
    return { throttle: clampv(throttle), turn: clampv(turn), vertical: clampv(vertical), boost };
  }
}
