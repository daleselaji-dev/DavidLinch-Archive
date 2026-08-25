// ============================================================
// Hotspots — 视线中心/点击 双通道的可交互物系统。
// 命中时脉冲高亮 + HUD 提示；E 键 / 点击 / 触屏按钮触发。
// ============================================================
import * as THREE from 'three';

const MAX_DIST = 4.6;

export class Hotspots {
  constructor(camera, ui, audio) {
    this.camera = camera;
    this.ui = ui;
    this.audio = audio;
    this.ray = new THREE.Raycaster();
    this.ray.far = MAX_DIST * 2;
    this.items = [];
    this.current = null;
    this._pulseT = 0;
  }

  /** mesh 需为可 raycast 的 Mesh；data: {hint, onActivate} */
  add(mesh, data) {
    mesh.userData.hotspot = data;
    this.items.push(mesh);
  }

  clear() {
    this.items = [];
    this._setCurrent(null);
  }

  activate() {
    const c = this.current;
    if (c) {
      this.audio.sfx('click');
      c.userData.hotspot.onActivate();
    }
  }

  /** 触屏/解锁状态: 用屏幕坐标点击 */
  tap(clientX, clientY) {
    const ndc = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects(this.items, false);
    if (hits.length && hits[0].distance < MAX_DIST * 1.4) {
      this.audio.sfx('click');
      hits[0].object.userData.hotspot.onActivate();
      return true;
    }
    return false;
  }

  _setCurrent(mesh) {
    if (this.current === mesh) return;
    if (this.current) {
      const m = this.current.material;
      if (m && m.emissive && this.current.userData._baseEmissive !== undefined) {
        m.emissiveIntensity = this.current.userData._baseEmissive;
      }
    }
    this.current = mesh;
    if (mesh) {
      if (mesh.material && mesh.material.emissive) {
        mesh.userData._baseEmissive = mesh.material.emissiveIntensity;
      }
      this.audio.sfx('hover');
      this.ui.setHint(mesh.userData.hotspot.hint || '互动');
      this.ui.setCrosshairHot(true);
    } else {
      this.ui.setHint(null);
      this.ui.setCrosshairHot(false);
    }
  }

  update(dt) {
    if (!this.items.length) return;
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.ray.intersectObjects(this.items, false);
    const hit = hits.length && hits[0].distance < MAX_DIST ? hits[0].object : null;
    this._setCurrent(hit);

    if (this.current && this.current.material && this.current.material.emissive) {
      this._pulseT += dt;
      const base = this.current.userData._baseEmissive ?? 0.4;
      this.current.material.emissiveIntensity = base + (Math.sin(this._pulseT * 7) * 0.5 + 0.5) * 0.9;
    }
  }
}
