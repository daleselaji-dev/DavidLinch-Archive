// ============================================================
// Engine — 渲染器 / 场景 / 相机 / 后处理链 / 主循环 / 画质档位
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LynchShader } from './post.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050307);

    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 220);

    // 程序化环境贴图 —— 让 PBR 材质有反射依据（无外部资源）
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;
    pmrem.dispose();

    // 后处理链: 渲染 → Bloom → 色调输出 → 林奇式胶片处理
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.85, 0.55, 0.62);
    this.outputPass = new OutputPass();
    this.lynchPass = new ShaderPass(LynchShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);
    this.composer.addPass(this.lynchPass);

    this.clock = new THREE.Clock();
    this.updaters = new Set();
    // 记录后处理出厂强度（低画质档按比例回退，见 setQuality）
    this._postBase = {
      grain: this.lynchPass.uniforms.uGrain.value,
      scanline: this.lynchPass.uniforms.uScanline.value,
      aberration: this.lynchPass.uniforms.uAberration.value
    };
    this._lookHalation = this.lynchPass.uniforms.uHalation.value;
    // v1.9 B1/B2：雾的呼吸——逐厅可配的极缓正弦（纯标量更新零带宽，
    // 低画质档保留）；breath ∈ [-1,1] 同时供各厅尘埃/烟雾层做节奏调制
    this._fogPulse = null;
    this._fogBase = 0.03;
    this.breath = 0;
    this.quality = 'high';
    this._fps = { frames: 0, acc: 0, value: 60 };
    this._running = false;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(q) {
    this.quality = q;
    this.bloomPass.enabled = q === 'high';
    // 低画质档（PRODUCTION_PLAN G9/P9）：胶片颗粒/扫描线/色差减半 + 关 halation——
    // 省全屏噪声哈希、偏移三采样与六向亮部采样的带宽，同时保住"胶片感"的底色
    const k = q === 'high' ? 1 : 0.5;
    const u = this.lynchPass.uniforms;
    u.uGrain.value = this._postBase.grain * k;
    u.uScanline.value = this._postBase.scanline * k;
    u.uAberration.value = this._postBase.aberration * k;
    u.uHalation.value = q === 'high' ? this._lookHalation : 0;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cap = this.quality === 'high' ? 1.5 : 1.0;
    const pr = Math.min(window.devicePixelRatio || 1, cap);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.lynchPass.uniforms.uResolution.value.set(w * pr, h * pr);
  }

  /** 每帧回调注册（返回注销函数） */
  onUpdate(fn) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  /**
   * 展厅画面基调: 饱和度 / 色调 / 雾 / 曝光 / 泛光
   * v1.4：+grade 三段电影分级 { lift:[r,g,b], gamma:[r,g,b], gain:[r,g,b] }
   *       +halation 胶片光晕强度（低画质档自动归零）
   */
  setLook({
    saturation = 1, tint = 0xffffff, fogColor = 0x050307, fogDensity = 0.03,
    bg = fogColor, exposure = 1.05, bloom = 0.85, grade = null, halation = 0.14,
    fogPulse = null
  } = {}) {
    const u = this.lynchPass.uniforms;
    u.uSaturation.value = saturation;
    u.uTintColor.value.set(tint);
    this.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
    this.scene.background = new THREE.Color(bg);
    this.renderer.toneMappingExposure = exposure;
    this.bloomPass.strength = bloom;
    const gr = grade || {};
    u.uLift.value.fromArray(gr.lift || [0, 0, 0]);
    u.uGamma.value.fromArray(gr.gamma || [1, 1, 1]);
    u.uGain.value.fromArray(gr.gain || [1, 1, 1]);
    this._lookHalation = halation;
    u.uHalation.value = this.quality === 'high' ? halation : 0;
    this._fogBase = fogDensity;
    this._fogPulse = fogPulse; // { period, depth }
  }

  get fps() {
    return this._fps.value;
  }

  /** 惊吓冲击：瞬间抬升 uShock/uFlash，主循环内自动衰减 */
  shock(amount = 1, flash = 0.85, flashColor = null) {
    const u = this.lynchPass.uniforms;
    u.uShock.value = Math.min(1, Math.max(u.uShock.value, amount));
    u.uFlash.value = Math.min(1, Math.max(u.uFlash.value, flash));
    if (flashColor !== null) u.uFlashColor.value.set(flashColor);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.clock.start();
    const loop = () => {
      if (!this._running) return;
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const t = this.clock.elapsedTime;
      this.lynchPass.uniforms.uTime.value = t;
      // 冲击/闪光衰减
      const u = this.lynchPass.uniforms;
      if (u.uShock.value > 0.0005) u.uShock.value *= Math.exp(-dt * 2.0); else u.uShock.value = 0;
      if (u.uFlash.value > 0.0005) u.uFlash.value *= Math.exp(-dt * 7.5); else u.uFlash.value = 0;
      // 雾的呼吸（B1）：逐厅周期/深度；无配置时呼吸相位仍在走（B2 尘埃可用）
      const fp = this._fogPulse;
      this.breath = Math.sin((t * Math.PI * 2) / ((fp && fp.period) || 32));
      if (fp && this.scene.fog) {
        this.scene.fog.density = this._fogBase * (1 + (fp.depth || 0.1) * this.breath);
      }
      for (const fn of this.updaters) fn(dt, t);
      this.composer.render();
      this._fps.frames++;
      this._fps.acc += dt;
      if (this._fps.acc >= 0.5) {
        this._fps.value = Math.round(this._fps.frames / this._fps.acc);
        this._fps.frames = 0;
        this._fps.acc = 0;
      }
    };
    loop();
  }

  /** 深度释放一个场景子树的 GPU 资源 */
  disposeGroup(root) {
    root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) {
        for (const key of Object.keys(m)) {
          const v = m[key];
          if (v && v.isTexture) v.dispose();
        }
        m.dispose();
      }
    });
    if (root.parent) root.parent.remove(root);
  }
}
