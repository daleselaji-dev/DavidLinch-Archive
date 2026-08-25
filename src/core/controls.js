// ============================================================
// FirstPersonControls — 桌面: PointerLock + WASD；
// 触屏: 虚拟摇杆移动 + 右半屏拖动环视。含轻微步行摆动。
// ============================================================
import * as THREE from 'three';

const EYE_HEIGHT = 1.68;

export class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(camera);
    this.yawObject.position.set(0, EYE_HEIGHT, 0);

    this.enabled = false;      // 面板打开时禁用移动
    this.locked = false;
    this.keys = new Set();
    this.touchMove = new THREE.Vector2(); // 摇杆输入 (-1..1)
    this.velocity = new THREE.Vector3();
    this.clampFn = null;
    this.speed = 4.2;
    this._bobT = 0;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    this._bind();
  }

  _bind() {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    });
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    if (!this.isTouch) {
      document.addEventListener('pointerlockchange', () => {
        this.locked = document.pointerLockElement === this.dom;
      });
      document.addEventListener('mousemove', (e) => {
        if (!this.locked || !this.enabled) return;
        this._look(e.movementX, e.movementY);
      });
    } else {
      document.body.classList.add('touch');
      // 右半屏拖动环视
      let lookId = null;
      let last = null;
      this.dom.addEventListener('touchstart', (e) => {
        for (const t of e.changedTouches) {
          if (t.clientX > window.innerWidth * 0.4 && lookId === null) {
            lookId = t.identifier;
            last = { x: t.clientX, y: t.clientY };
          }
        }
      }, { passive: true });
      this.dom.addEventListener('touchmove', (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === lookId && last && this.enabled) {
            this._look((t.clientX - last.x) * 2.4, (t.clientY - last.y) * 2.4);
            last = { x: t.clientX, y: t.clientY };
          }
        }
      }, { passive: true });
      const end = (e) => {
        for (const t of e.changedTouches) if (t.identifier === lookId) { lookId = null; last = null; }
      };
      this.dom.addEventListener('touchend', end);
      this.dom.addEventListener('touchcancel', end);
    }
  }

  _look(dx, dy) {
    this.yawObject.rotation.y -= dx * 0.0021;
    this.pitchObject.rotation.x -= dy * 0.0021;
    this.pitchObject.rotation.x = Math.max(-1.45, Math.min(1.45, this.pitchObject.rotation.x));
  }

  requestLock() {
    if (!this.isTouch && !this.locked) this.dom.requestPointerLock({ unadjustedMovement: true }).catch?.(() => {});
  }

  unlock() {
    if (this.locked) document.exitPointerLock();
  }

  teleport(x, z, yaw = 0) {
    this.yawObject.position.set(x, EYE_HEIGHT, z);
    this.yawObject.rotation.y = yaw;
    this.pitchObject.rotation.x = 0;
    this.velocity.set(0, 0, 0);
  }

  setBounds(clampFn) {
    this.clampFn = clampFn;
  }

  update(dt) {
    if (!this.enabled) return;
    const f = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
              (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const s = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
              (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);

    let mx = s + this.touchMove.x;
    let mz = f - this.touchMove.y;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.6 : 1;
    const target = new THREE.Vector3(mx, 0, -mz)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yawObject.rotation.y)
      .multiplyScalar(this.speed * run);

    // 惯性阻尼
    this.velocity.lerp(target, 1 - Math.exp(-10 * dt));
    this.yawObject.position.addScaledVector(this.velocity, dt);

    if (this.clampFn) this.clampFn(this.yawObject.position);

    // 步行摆动
    const moving = this.velocity.length();
    this._bobT += dt * moving * 2.2;
    this.yawObject.position.y = EYE_HEIGHT + Math.sin(this._bobT * 3.1) * 0.016 * Math.min(moving / 3, 1);
  }
}
