// ============================================================
// AudioEngine — 全程序化 WebAudio 合成。
// 环境底噪(每厅配方) + 交互音效（支持立体声定位 sfxAt）。绝无采样素材。
// ============================================================
import { DRONES } from './drones.js';

/**
 * 立体声定位的纯几何计算（供单测）：
 * 世界系位移 (dx,dz) + 听者朝向 yaw → { pan 声像, att 距离衰减, dist }。
 * three.js 约定：yaw=0 时视线朝 -z，+x 为右手侧。
 */
export function spatialParams(dx, dz, yaw, ref = 3) {
  const dist = Math.hypot(dx, dz);
  const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const pan = dist < 0.001 ? 0 : Math.max(-1, Math.min(1, (lx / dist) * 0.85));
  const att = (Math.min(1, ref / Math.max(ref, dist))) ** 1.6;
  return { pan, att, dist };
}

/**
 * 空间混响预设（程序化脉冲响应参数，零采样；供单测）：
 * seconds 尾音长度 / damp 高频阻尼(0-1，越大越闷) / wet 湿度电平。
 */
export const SPACES = {
  hall: { seconds: 2.1, damp: 0.35, wet: 0.16 },   // 大厅/长廊：石木高挑空间
  room: { seconds: 0.8, damp: 0.72, wet: 0.1 },    // 绒面小房间：短促吸声
  tiled: { seconds: 1.5, damp: 0.18, wet: 0.17 },  // 瓷砖/水泥机房：亮尾
  outdoor: { seconds: 0.45, damp: 0.55, wet: 0.06 } // 夜外景：几乎干声
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._amb = null;
    this._ambTimers = [];
    this._buffers = {};
    this._listener = null;
  }

  /** 注册听者位姿回调：() => ({ x, z, yaw })，供 sfxAt 计算声像与衰减 */
  setListener(fn) { this._listener = fn; }

  /** 位置化音效：按世界坐标计算声像 + 距离衰减后播放 */
  sfxAt(name, x, z, vol = 1, ref = 3) {
    if (!this.ctx || this.muted) return;
    const L = this._listener && this._listener();
    if (!L) { this.sfx(name, vol); return; }
    const { pan, att } = spatialParams(x - L.x, z - L.z, L.yaw, ref);
    if (vol * att < 0.015) return; // 听不见就不占混音
    this.sfx(name, vol * att, pan);
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      // 交互音混响发送总线（程序化 IR，按厅切换空间感）
      this.reverb = this.ctx.createConvolver();
      this.reverbWet = this.ctx.createGain();
      this.reverbWet.gain.value = 0;
      this.reverb.connect(this.reverbWet);
      this.reverbWet.connect(this.master);
      if (this._pendingSpace) this.setSpace(this._pendingSpace);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  /**
   * 按厅切换空间混响：程序化生成立体声脉冲响应（指数衰减噪声 + 单极点
   * 高频阻尼，左右去相关），交互音经发送总线获得空间尾音。零采样。
   */
  setSpace(name) {
    if (!this.ctx || !this.reverb) { this._pendingSpace = name; return; }
    const p = SPACES[name] || SPACES.room;
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * p.seconds));
    const ir = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const env = Math.exp(-3.2 * (i / len));
        const w = (Math.random() * 2 - 1) * env;
        lp += (w - lp) * (1 - p.damp); // 高频阻尼：单极点低通
        d[i] = lp;
      }
      // 前 5ms 淡入避免与直达声梳状
      const fade = Math.floor(sr * 0.005);
      for (let i = 0; i < fade && i < len; i++) d[i] *= i / fade;
    }
    this.reverb.buffer = ir;
    const t = this.ctx.currentTime;
    this.reverbWet.gain.cancelScheduledValues(t);
    this.reverbWet.gain.linearRampToValueAtTime(p.wet, t + 0.8);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(m ? 0 : 0.9, t + 0.25);
  }

  /**
   * duck — 突兀静默/闪避：整体音量瞬间压低再缓慢恢复。
   * 用于字母旁白的"林奇式静默拍"与彩蛋惊吓前的抽真空。
   */
  duck(holdSec = 0.6, floor = 0.04, releaseSec = 1.4) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(floor, t + 0.045);
    g.setValueAtTime(floor, t + 0.045 + holdSec);
    g.linearRampToValueAtTime(0.9, t + 0.045 + holdSec + releaseSec);
  }

  _noiseBuffer(type) {
    if (this._buffers[type]) return this._buffers[type];
    const len = this.ctx.sampleRate * 2.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w * 0.6;
      else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else if (type === 'pink') {
        b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
        d[i] = (b0 + b1 + b2) * 0.9;
      } else if (type === 'crackle') {
        d[i] = Math.random() < 0.0018 ? w * 1.6 : w * 0.008;
      }
    }
    this._buffers[type] = buf;
    return buf;
  }

  // ---------- 环境底噪 ----------
  startAmbience(name) {
    if (!this.ctx) return;
    this.stopAmbience();
    const cfg = DRONES[name];
    if (!cfg) return;

    const t = this.ctx.currentTime;
    const bus = this.ctx.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(1, t + 2.4);
    bus.connect(this.master);

    const nodes = [bus];

    for (const o of cfg.oscs) {
      const osc = this.ctx.createOscillator();
      osc.type = o.type;
      osc.frequency.value = o.freq;
      const g = this.ctx.createGain();
      g.gain.value = o.gain;
      osc.connect(g); g.connect(bus);
      osc.start();
      nodes.push(osc, g);
    }

    for (const n of cfg.noises) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(n.type);
      src.loop = true;
      const flt = this.ctx.createBiquadFilter();
      flt.type = n.filter.type;
      flt.frequency.value = n.filter.freq;
      flt.Q.value = n.filter.q;
      const g = this.ctx.createGain();
      g.gain.value = n.gain;
      src.connect(flt); flt.connect(g); g.connect(bus);
      src.start();
      nodes.push(src, flt, g);

      if (cfg.lfo) {
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = cfg.lfo.freq;
        const lg = this.ctx.createGain();
        lg.gain.value = n.gain * cfg.lfo.depth;
        lfo.connect(lg); lg.connect(g.gain);
        lfo.start();
        nodes.push(lfo, lg);
      }
    }

    // 随机间隔事件音（远处的撞击/猫头鹰/涌动）
    for (const ev of cfg.events || []) {
      const schedule = () => {
        const gap = ev.minGap + Math.random() * (ev.maxGap - ev.minGap);
        const timer = setTimeout(() => {
          if (this._amb && this._amb.name === name) {
            this.sfx(ev.sfx, 0.5);
            schedule();
          }
        }, gap * 1000);
        this._ambTimers.push(timer);
      };
      schedule();
    }

    this._amb = { name, bus, nodes };
  }

  stopAmbience() {
    for (const timer of this._ambTimers) clearTimeout(timer);
    this._ambTimers = [];
    if (!this._amb) return;
    const { bus, nodes } = this._amb;
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.linearRampToValueAtTime(0, t + 1.1);
    setTimeout(() => {
      for (const n of nodes) { try { n.stop?.(); } catch { /* already stopped */ } try { n.disconnect(); } catch { /* ok */ } }
    }, 1300);
    this._amb = null;
  }

  // ---------- 交互音效 ----------
  sfx(name, vol = 1, pan = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.value = vol;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      out.connect(p);
      p.connect(this.master);
    } else {
      out.connect(this.master);
    }
    if (this.reverb && this.reverb.buffer) out.connect(this.reverb); // 空间感发送

    const tone = (type, f0, f1, dur, peak, delay = 0) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + delay);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + delay + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(peak, t + delay + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g); g.connect(out);
      o.start(t + delay); o.stop(t + delay + dur + 0.05);
    };
    const noise = (type, dur, filterType, freq, q, peak, delay = 0, attack = 0.012) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(type);
      const f = this.ctx.createBiquadFilter();
      f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(peak, t + delay + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t + delay); src.stop(t + delay + dur + 0.05);
      return f;
    };

    switch (name) {
      case 'hover':
        tone('sine', 840, 620, 0.09, 0.05);
        break;
      case 'click':
        tone('square', 240, 180, 0.05, 0.06);
        noise('white', 0.05, 'highpass', 2400, 1, 0.05);
        break;
      case 'whoosh': // 传送门
        noise('white', 1.15, 'bandpass', 300, 1.6, 0.32, 0, 0.35);
        tone('sine', 95, 38, 1.1, 0.22);
        break;
      case 'page':
        noise('pink', 0.16, 'highpass', 1100, 0.8, 0.1);
        break;
      case 'steam':
        noise('white', 1.5, 'highpass', 850, 0.6, 0.28, 0, 0.3);
        break;
      case 'steamfar':
        noise('white', 2.2, 'highpass', 500, 0.5, 0.07, 0, 0.8);
        break;
      case 'clank': {
        for (const [i, f] of [167, 411, 733, 1187].entries()) {
          tone('sine', f, f * 0.98, 0.5 - i * 0.09, 0.08 - i * 0.015);
        }
        tone('sine', 64, 40, 0.28, 0.18);
        break;
      }
      case 'owl':
        tone('sine', 392, 318, 0.32, 0.05);
        tone('sine', 370, 300, 0.4, 0.05, 0.45);
        break;
      case 'chime':
        tone('sine', 1318, 1310, 0.9, 0.045);
        tone('sine', 1975, 1960, 1.2, 0.028, 0.03);
        break;
      case 'fluor': // 荧光灯打嗝
        noise('white', 0.09, 'bandpass', 3400, 8, 0.06);
        noise('white', 0.05, 'bandpass', 4100, 9, 0.045, 0.13);
        break;
      case 'swell': { // 反向涌动
        const f = noise('brown', 2.8, 'lowpass', 160, 1, 0.16, 0, 2.2);
        f.frequency.linearRampToValueAtTime(900, t + 2.6);
        break;
      }
      case 'invert':
        noise('white', 1.0, 'bandpass', 500, 2, 0.2, 0, 0.7);
        tone('sawtooth', 55, 220, 0.9, 0.05);
        break;
      case 'thud':
        tone('sine', 62, 36, 0.3, 0.22);
        noise('brown', 0.2, 'lowpass', 200, 1, 0.14);
        break;
      case 'sip':
        noise('pink', 0.3, 'bandpass', 900, 3, 0.09);
        tone('sine', 190, 240, 0.24, 0.03, 0.05);
        break;
      case 'type': // 字母显现: 打字机单击
        noise('white', 0.03, 'bandpass', 2600 + Math.random() * 1400, 5, 0.05);
        tone('square', 130 + Math.random() * 60, 90, 0.025, 0.02);
        break;
      case 'typebell': // 字幕段落结束的小铃
        tone('sine', 1560, 1548, 0.7, 0.03);
        tone('sine', 2340, 2330, 0.5, 0.015, 0.02);
        break;
      case 'heartbeat': // 惊吓前奏: 两记闷响
        tone('sine', 58, 34, 0.22, 0.3);
        tone('sine', 52, 30, 0.26, 0.34, 0.42);
        break;
      case 'scare': { // 惊吓主体: 失谐锯齿簇 + 噪声墙 + 次声坠落
        for (const f of [92, 97, 184, 189, 371]) {
          tone('sawtooth', f, f * 0.42, 1.15, 0.11);
        }
        noise('white', 1.05, 'bandpass', 1500, 0.8, 0.42, 0, 0.02);
        noise('brown', 1.5, 'lowpass', 130, 1, 0.5, 0, 0.02);
        tone('sine', 34, 22, 1.5, 0.4);
        break;
      }
      case 'whisper': // 帷幕后的窃语: 成形滤波噪声一呼一吸
        noise('pink', 0.85, 'bandpass', 1900, 7, 0.11, 0, 0.3);
        noise('pink', 0.9, 'bandpass', 1450, 8, 0.09, 1.0, 0.35);
        noise('pink', 0.7, 'bandpass', 2300, 9, 0.07, 2.1, 0.3);
        break;
      case 'breath': // 衣柜里的呼吸
        noise('pink', 1.3, 'lowpass', 420, 0.8, 0.12, 0, 0.55);
        noise('pink', 1.1, 'lowpass', 360, 0.8, 0.1, 1.7, 0.5);
        break;
      case 'radio': // 收音机: 调谐噪声 + 载波哨
        noise('white', 0.8, 'bandpass', 1200, 2.5, 0.09, 0, 0.1);
        tone('sine', 720, 1560, 0.5, 0.02, 0.1);
        noise('crackle', 1.6, 'highpass', 900, 1, 0.14, 0.3);
        break;
      case 'strike': // 火柴/打火机
        noise('white', 0.12, 'highpass', 2600, 1, 0.16);
        noise('pink', 0.7, 'bandpass', 620, 2, 0.05, 0.1, 0.2);
        break;
      case 'lampon':
        tone('sine', 880, 870, 0.06, 0.05);
        noise('white', 0.04, 'highpass', 3600, 2, 0.04);
        break;
      case 'lampoff':
        tone('sine', 620, 300, 0.09, 0.05);
        break;
      case 'curtain': // 布幔滑动
        noise('pink', 0.9, 'bandpass', 800, 1.2, 0.14, 0, 0.25);
        break;
      case 'om': { // 冥想低音钟
        tone('sine', 111, 110.4, 4.5, 0.16);
        tone('sine', 222, 221, 3.6, 0.05, 0.05);
        tone('sine', 333, 332, 2.8, 0.025, 0.1);
        break;
      }
      case 'deepcall': { // 深水里的一声呼唤：次声下滑 + 双泛音 + 高处一线微光
        tone('sine', 52, 33, 4.4, 0.2);
        tone('sine', 104, 66, 3.8, 0.06, 0.12);
        tone('sine', 156, 99, 3.0, 0.028, 0.3);
        noise('pink', 3.4, 'bandpass', 2400, 7, 0.018, 0.7, 1.5);
        break;
      }
      case 'bubbles': { // 一串上升的水泡（下潜/献念）
        for (let i = 0; i < 7; i++) {
          const f0 = 280 + Math.random() * 420 + i * 95;
          tone('sine', f0, f0 * 1.9, 0.1, 0.03, i * 0.13 + Math.random() * 0.05);
        }
        noise('brown', 1.5, 'lowpass', 220, 1, 0.05, 0, 0.55);
        break;
      }
      case 'lullaby': { // 暖气炉深处的小小摇篮曲（原创五音短句）
        const seq = [523.25, 466.16, 392.0, 349.23, 392.0];
        for (const [i, f] of seq.entries()) {
          tone('sine', f, f * 0.995, 0.62, 0.045, i * 0.55);
          tone('sine', f * 2, f * 1.99, 0.4, 0.012, i * 0.55);
        }
        noise('pink', 3.2, 'bandpass', 1200, 3, 0.02, 0, 1.2);
        break;
      }
      case 'stonechime': // 林间石阵的低鸣
        tone('sine', 174, 172, 2.2, 0.07);
        tone('sine', 261, 258, 1.8, 0.04, 0.3);
        break;
      case 'bell': // 服务台迎宾铃：明亮铜质非谐分音 + 敲击瞬态
        tone('sine', 1568, 1560, 1.3, 0.07);
        tone('sine', 2093, 2086, 1.0, 0.05, 0.004);
        tone('sine', 2793, 2778, 0.6, 0.03, 0.008);
        tone('sine', 4186, 4158, 0.25, 0.018, 0.01);
        noise('white', 0.03, 'highpass', 5200, 1, 0.05);
        break;
      case 'ratchet': { // 转盘拨号弹簧回位：一串棘轮嗒嗒
        for (let i = 0; i < 9; i++) {
          noise('white', 0.018, 'bandpass', 2900 + (i % 3) * 500, 6, 0.05, 0.05 + i * 0.052);
          tone('square', 210, 190, 0.014, 0.016, 0.05 + i * 0.052);
        }
        break;
      }
      case 'creak': { // 木/革吱呀：窄带下滑 + 低频晃动
        const f = noise('pink', 0.5, 'bandpass', 950, 9, 0.11, 0, 0.09);
        f.frequency.linearRampToValueAtTime(420, t + 0.45);
        tone('sine', 88, 60, 0.4, 0.05);
        break;
      }
      case 'switch': // 重型拨杆：先簧压后落座
        tone('square', 300, 260, 0.02, 0.05);
        noise('white', 0.03, 'highpass', 2000, 1, 0.06);
        tone('sine', 120, 70, 0.1, 0.14, 0.045);
        noise('brown', 0.08, 'lowpass', 400, 1, 0.1, 0.045);
        break;
      case 'crank': { // 留声机上发条：三圈弹簧绞紧 + 黑胶苏醒
        for (let i = 0; i < 3; i++) {
          noise('pink', 0.22, 'bandpass', 640 + i * 90, 4, 0.09, i * 0.34, 0.06);
          tone('sine', 150 + i * 24, 130 + i * 24, 0.18, 0.028, i * 0.34);
        }
        noise('crackle', 1.4, 'highpass', 1600, 1, 0.08, 0.9);
        break;
      }
      case 'projector': { // 16mm 放映机：马达起转 + 24 格快门嗒嗒 + 片道摩擦
        tone('sawtooth', 30, 96, 0.8, 0.035);
        noise('pink', 1.6, 'bandpass', 480, 1.5, 0.05, 0.15, 0.3);
        for (let i = 0; i < 22; i++) {
          noise('white', 0.014, 'bandpass', 2600 + (i % 3) * 300, 5, 0.03, 0.35 + i * 0.058);
        }
        noise('crackle', 1.2, 'highpass', 3400, 1, 0.03, 0.5);
        break;
      }
      case 'doorfar': { // 墙外某扇远门：闷厚一声 + 迟来的锁舌
        noise('brown', 0.5, 'lowpass', 140, 0.8, 0.12, 0, 0.05);
        tone('sine', 46, 30, 0.5, 0.07);
        noise('white', 0.03, 'bandpass', 900, 4, 0.02, 0.42);
        break;
      }
      case 'phonering': { // 旧木盒电话双铃：两串快速金属颤 + 木箱共鸣
        for (const start of [0, 0.62]) {
          for (let i = 0; i < 10; i++) {
            tone('sine', 1180 + (i % 2) * 160, 1150, 0.03, 0.045, start + i * 0.042);
            tone('sine', 1770 + (i % 2) * 210, 1740, 0.025, 0.02, start + i * 0.042);
          }
          tone('sine', 96, 82, 0.4, 0.03, start);
        }
        break;
      }
      case 'gurgle': { // 地漏下的咕噜：低位噪声床 + 一串下坠的水泡音
        noise('brown', 1.3, 'lowpass', 220, 1.2, 0.07, 0, 0.35);
        const blips = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < blips; i++) {
          const f = 150 + Math.random() * 110;
          tone('sine', f, f * 0.55, 0.07, 0.05 + Math.random() * 0.03,
            0.1 + i * (0.12 + Math.random() * 0.08));
        }
        break;
      }
      case 'rain': { // 一段雨声坡：慢起慢落的高频嘶 + 屋檐低滴——隔 2s 叠续即成雨幕
        noise('pink', 3.4, 'highpass', 2100, 0.7, 0.045, 0, 1.3);
        noise('brown', 3.4, 'lowpass', 460, 0.6, 0.03, 0.2, 1.5);
        const drips = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < drips; i++) {
          const f = 900 + Math.random() * 900;
          tone('sine', f, f * 0.7, 0.05, 0.014 + Math.random() * 0.012, 0.4 + Math.random() * 2.4);
        }
        break;
      }
      case 'vinyl': { // 黑胶底噪一小段：尘埃嘶声 + 两三粒离散爆点
        noise('crackle', 1.5, 'highpass', 2800, 0.8, 0.028, 0, 0.3);
        const pops = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < pops; i++) {
          noise('white', 0.02, 'bandpass', 1400 + Math.random() * 1800, 6,
            0.02 + Math.random() * 0.02, Math.random() * 1.3);
        }
        break;
      }
      // ---------- v1.4 阶段 5 新音色（配套阶段 3/4 新交互） ----------
      case 'coin': { // 硬币落进黄铜碟：非谐亮鸣两跳半 + 细碎落定
        for (const [d, k] of [[0, 1], [0.16, 0.6], [0.27, 0.35]]) {
          tone('sine', 3620, 3580, 0.12 * k + 0.04, 0.05 * k, d);
          tone('sine', 5430, 5390, 0.08 * k + 0.03, 0.028 * k, d + 0.002);
          noise('white', 0.015, 'highpass', 6000, 2, 0.03 * k, d);
        }
        noise('white', 0.09, 'bandpass', 4200, 3, 0.018, 0.36, 0.02);
        break;
      }
      case 'springdoor': { // 报箱弹簧门：拉簧上滑吱一声 + 回摔闷响 + 两次余振
        const f = noise('white', 0.16, 'bandpass', 1500, 8, 0.06, 0, 0.03);
        f.frequency.linearRampToValueAtTime(2600, t + 0.14);
        tone('sine', 70, 44, 0.16, 0.16, 0.2);
        noise('brown', 0.1, 'lowpass', 300, 1, 0.1, 0.2);
        tone('sine', 62, 40, 0.1, 0.08, 0.42);
        tone('sine', 58, 38, 0.07, 0.04, 0.58);
        break;
      }
      case 'ladderroll': { // 图书梯沿轨滚动：轮滚低鸣 + 一串轮嗒 + 木身吱呀下滑
        noise('brown', 1.0, 'lowpass', 190, 1, 0.1, 0, 0.25);
        for (let i = 0; i < 7; i++) {
          noise('white', 0.016, 'bandpass', 2100 + (i % 3) * 350, 6, 0.02, 0.08 + i * 0.13);
        }
        const f = noise('pink', 0.5, 'bandpass', 880, 9, 0.045, 0.15, 0.12);
        f.frequency.linearRampToValueAtTime(560, t + 0.6);
        break;
      }
      case 'flutter': { // 黑暗里翅膀扇了三下：柔软气流扑 + 一点低空尾流
        for (let i = 0; i < 3; i++) {
          noise('pink', 0.12, 'bandpass', 480 + i * 60, 1.6, 0.09 - i * 0.02, i * 0.16, 0.04);
        }
        noise('pink', 0.5, 'lowpass', 300, 1, 0.028, 0.4, 0.2);
        break;
      }
      case 'stamp': { // 日期章一拍：抬起小咔 + 橡胶闷压 + 台面短鸣
        noise('white', 0.02, 'highpass', 2600, 2, 0.03);
        tone('sine', 130, 70, 0.09, 0.12, 0.3);
        noise('brown', 0.07, 'lowpass', 380, 1, 0.09, 0.3);
        noise('pink', 0.03, 'bandpass', 900, 4, 0.03, 0.33);
        break;
      }
      case 'iceclink': { // 冰桶里瓶子磕了两下桶壁 + 一点水晃
        tone('sine', 2350, 2320, 0.09, 0.05);
        tone('sine', 3520, 3480, 0.06, 0.028, 0.005);
        tone('sine', 2200, 2170, 0.07, 0.032, 0.19);
        noise('pink', 0.3, 'bandpass', 620, 2.5, 0.035, 0.22, 0.09);
        break;
      }
      case 'jostle': { // 伞架被碰了一下：伞骨细响一串 + 木柄互磕
        for (let i = 0; i < 4; i++) {
          tone('sine', 1450 + (i % 2) * 380, 1400, 0.05, 0.028, i * 0.07);
        }
        noise('brown', 0.12, 'lowpass', 420, 1, 0.07);
        tone('sine', 320, 250, 0.06, 0.04, 0.16);
        break;
      }
      case 'coalrattle': { // 煤块滚落：干硬碰撞串（密到疏、音高渐落）+ 低闷落定 + 碎屑滑动尾
        for (let i = 0; i < 6; i++) {
          const d = i * 0.05 + i * i * 0.014;
          noise('white', 0.03, 'bandpass', 1900 - i * 170, 6, 0.05 - i * 0.005, d, 0.003);
          tone('triangle', 250 + (i % 3) * 55, 185, 0.045, 0.026, d);
        }
        noise('brown', 0.22, 'lowpass', 260, 1, 0.07, 0.4);
        noise('pink', 0.35, 'bandpass', 900, 2, 0.02, 0.44, 0.08);
        break;
      }
      case 'pluck': { // 低音提琴拨弦小走句：D2 → A2；基频起振 + 双泛音 + 指皮擦弦 + 木腔共鸣尾
        for (const [f0, d] of [[73.4, 0], [110, 0.62]]) {
          tone('sine', f0, f0 * 0.982, 1.0, 0.17, d);
          tone('triangle', f0 * 2.005, f0 * 2, 0.42, 0.05, d);
          tone('sine', f0 * 3.01, f0 * 3, 0.2, 0.022, d);
          noise('brown', 0.05, 'lowpass', 320, 1, 0.05, d, 0.004);
        }
        noise('brown', 1.3, 'lowpass', 140, 0.8, 0.03, 0.05, 0.1);
        break;
      }
      case 'thunder': { // 远雷：一记闷裂 + 长尾滚动 + 次声沉降（音量随闪电延迟衰减）
        noise('white', 0.25, 'bandpass', 700, 1.2, 0.09, 0, 0.02);
        noise('brown', 2.8, 'lowpass', 120, 0.8, 0.2, 0.06, 0.5);
        noise('brown', 2.2, 'lowpass', 80, 1, 0.11, 1.2, 0.7);
        tone('sine', 44, 26, 1.8, 0.09, 0.1);
        break;
      }
      case 'drip': { // 天花水珠砸上水泥：高频一点 + 上滑水泡音 + 洇开微湿尾
        noise('white', 0.012, 'highpass', 3800, 3, 0.032);
        tone('sine', 640, 1520, 0.085, 0.042, 0.012);
        noise('pink', 0.15, 'bandpass', 1450, 5, 0.013, 0.035, 0.05);
        break;
      }
      // ---------- v1.5 新音色（拐角惊吓 / 没有乐队 / 对讲机 / 远景事件） ----------
      case 'dread': { // 拐角前的低压：次声涌起 + 失谐双低音互拍 + 空气变薄的高频细纱
        const f = noise('brown', 2.6, 'lowpass', 90, 1, 0.16, 0, 1.6);
        f.frequency.linearRampToValueAtTime(260, t + 2.4);
        tone('sine', 47, 45, 2.6, 0.1);
        tone('sine', 50.5, 48, 2.6, 0.08, 0.12);
        noise('pink', 2.0, 'highpass', 5200, 0.7, 0.014, 0.5, 1.1);
        break;
      }
      case 'metalscrape': { // 垃圾箱后金属拖地一声：窄带摩擦下滑 + 铁皮低鸣双分音
        const f = noise('white', 0.7, 'bandpass', 2400, 12, 0.05, 0, 0.12);
        f.frequency.linearRampToValueAtTime(680, t + 0.62);
        tone('sine', 138, 96, 0.6, 0.05, 0.05);
        tone('sine', 207, 199, 0.42, 0.022, 0.1);
        break;
      }
      case 'aria': { // 无人声源的「歌声」：正弦基频缓升 + 双共振峰噪声成形
        // （元音质感，原创单音摆动，非任何旋律或录音引用）
        tone('sine', 233, 247, 2.6, 0.055);
        tone('sine', 468, 494, 2.4, 0.02, 0.1);
        noise('pink', 2.6, 'bandpass', 780, 9, 0.05, 0, 1.1);
        noise('pink', 2.4, 'bandpass', 1900, 11, 0.028, 0.2, 1.0);
        break;
      }
      case 'silencecut': { // 声音被整只手拔掉：一拍反相噗 + 一根耳鸣细线悬在真空里
        noise('brown', 0.09, 'lowpass', 160, 1, 0.22, 0, 0.008);
        tone('sine', 3620, 3605, 1.8, 0.012, 0.06);
        break;
      }
      case 'walkie': { // 对讲机：按键咔 + 静电床 + 断续「回话」（成形滤波脉冲，非语言）+ 收尾squelch
        tone('square', 2200, 2100, 0.02, 0.05);
        noise('white', 1.9, 'bandpass', 1500, 0.9, 0.045, 0.05, 0.03);
        for (let i = 0; i < 5; i++) {
          const d = 0.5 + i * 0.24 + (i % 2) * 0.06;
          noise('pink', 0.14, 'bandpass', 640 + (i % 3) * 260, 7, 0.085, d, 0.02);
        }
        noise('white', 0.05, 'highpass', 3200, 2, 0.06, 1.9);
        break;
      }
      case 'sirenfar': { // 城市远处的警笛掠过一遍：双程滑音 + 低通闷化（远景事件，不近身）
        tone('triangle', 620, 940, 1.4, 0.016);
        tone('triangle', 940, 600, 1.5, 0.014, 1.4);
        noise('pink', 3.0, 'lowpass', 500, 1, 0.012, 0, 1.4);
        break;
      }
      // ---------- 脚步（六种地面材质；每步微抖动防机械感） ----------
      case 'step-wood': { // 木地板：低频闷响 + 板材短鸣
        const j = 0.92 + Math.random() * 0.16;
        tone('sine', 96 * j, 58, 0.09, 0.1);
        noise('brown', 0.07, 'lowpass', 320, 1, 0.07);
        noise('pink', 0.04, 'bandpass', 680 * j, 3, 0.028);
        break;
      }
      case 'step-concrete': { // 水泥：干硬短击
        const j = 0.9 + Math.random() * 0.2;
        noise('white', 0.045, 'bandpass', 1250 * j, 1.4, 0.055);
        tone('sine', 170 * j, 110, 0.05, 0.04);
        break;
      }
      case 'step-tile': { // 瓷砖/石面：亮口短击 + 微回弹
        const j = 0.9 + Math.random() * 0.2;
        noise('white', 0.035, 'highpass', 2100 * j, 1, 0.045);
        tone('sine', 240 * j, 150, 0.04, 0.035);
        noise('white', 0.02, 'bandpass', 3100 * j, 5, 0.018, 0.05);
        break;
      }
      case 'step-carpet': { // 地毯/绒面：极软闷压
        const j = 0.9 + Math.random() * 0.2;
        noise('brown', 0.09, 'lowpass', 260 * j, 1, 0.05);
        tone('sine', 68 * j, 48, 0.06, 0.028);
        break;
      }
      case 'step-asphalt': { // 沥青/砂砾：带砂粒感的擦击
        const j = 0.9 + Math.random() * 0.2;
        noise('white', 0.06, 'bandpass', 920 * j, 1.2, 0.05);
        noise('crackle', 0.05, 'highpass', 1500, 1, 0.05);
        tone('sine', 112 * j, 70, 0.05, 0.04);
        break;
      }
      case 'step-dirt': { // 泥土/林地：软压 + 碎屑
        const j = 0.9 + Math.random() * 0.2;
        noise('pink', 0.08, 'lowpass', 480 * j, 1, 0.055);
        noise('brown', 0.06, 'lowpass', 200, 1, 0.05);
        noise('white', 0.02, 'bandpass', 1900 * j, 4, 0.014, 0.02);
        break;
      }
      case 'step-metal': { // 钢格栅：短促金属鸣振
        const j = 0.94 + Math.random() * 0.12;
        tone('sine', 225 * j, 205, 0.1, 0.05);
        tone('sine', 342 * j, 330, 0.07, 0.02, 0.005);
        noise('white', 0.04, 'bandpass', 1150 * j, 4, 0.045);
        break;
      }
      default:
        tone('sine', 660, 660, 0.08, 0.04);
    }
  }
}
