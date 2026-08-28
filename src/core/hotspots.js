// ============================================================
// Hotspots — 视线中心/点击 双通道的可交互物系统。
// 命中时脉冲高亮 + HUD 提示；E 键 / 点击 / 触屏按钮触发。
// ============================================================
import * as THREE from 'three';

const MAX_DIST = 4.6;
const HOVER_TINT = new THREE.Color(0xffc98a); // 暖光呼吸基准色（蜡烛琥珀）

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
      // 归还原材质（悬停用的是克隆件，绝不污染共享材质）
      const ud = this.current.userData;
      if (ud._hoverOrig) {
        this.current.material = ud._hoverOrig;
        ud._hoverOrig = null;
      }
    }
    this.current = mesh;
    if (mesh) {
      // v1.6：悬停暖光对所有 Standard 材质生效（含 emissive 为黑的木/铁件）。
      // 共享材质（M.brass 等）直接调 emissive 会让全厅同料件一起亮——
      // 改为按 mesh 克隆一份悬停材质并缓存，离开即换回。
      const m = mesh.material;
      if (m && m.emissive && !Array.isArray(m)) {
        const ud = mesh.userData;
        if (!ud._hoverMat || ud._hoverSrc !== m) {
          ud._hoverMat = m.clone();
          ud._hoverSrc = m;
          ud._hoverBaseEm = m.emissive.clone();
          ud._hoverBaseInt = m.emissiveIntensity;
        }
        ud._hoverOrig = m;
        mesh.material = ud._hoverMat;
        this._pulseT = 0;
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

    const c = this.current;
    if (c && c.userData._hoverOrig) {
      this._pulseT += dt;
      const ud = c.userData;
      const k = Math.sin(this._pulseT * 6) * 0.5 + 0.5;
      // 蜡光呼吸：在原自发光之上叠一层微暖，暗料件也能看见"它在等你"
      ud._hoverMat.emissive.copy(ud._hoverBaseEm).lerp(HOVER_TINT, 0.3 + k * 0.25);
      ud._hoverMat.emissiveIntensity = Math.max(ud._hoverBaseInt, 0.22 + k * 0.3);
    }
  }
}
