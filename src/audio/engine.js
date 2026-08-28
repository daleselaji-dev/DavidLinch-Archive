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
 * 「那头」的应答谱系 DNA（v1.15 门禁 73，供单测）：固定小三度双音
 * D3→F3。v1.10 起的远声族（doorfar/pipeknock/drawerfar/liftbell）
 * 各说各话；v1.14 检修口盖板回敲刻意与 pipeknock 同源之后，审计
 * 立的纪律是——远声若再「应答」，给那头一条独立音色谱系：无论隔着
 * 档案墙的风道哼鸣（replyhum）还是替你收掉最后一拍（replytap），
 * 音高都是这同一副嗓子。七厅背后答话的，从来是同一个东西。
 */
export const REPLY_DYAD = [146.83, 174.61];

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
      case 'wetstir': { // v1.11 缠布之物: 湿性蠕鸣——布下有什么极小地挪了一下
        const f = noise('pink', 0.9, 'bandpass', 300, 2.5, 0.14, 0, 0.3);
        f.frequency.linearRampToValueAtTime(190, t + 0.8);
        noise('pink', 0.11, 'bandpass', 920, 6, 0.08, 0.2);
        noise('pink', 0.08, 'bandpass', 680, 6, 0.07, 0.46);
        tone('sine', 132, 68, 0.55, 0.05, 0.12);
        break;
      }
      case 'reversecup': { // v1.11 红房间咖啡: 逆放式凝固音——包络倒着走的一声
        noise('pink', 0.7, 'bandpass', 760, 4, 0.12, 0, 0.62); // 攻击在尾端（倒放感）
        tone('sine', 96, 320, 0.66, 0.09, 0.02);               // 频率上行（磁带倒转）
        tone('sine', 640, 212, 0.3, 0.05, 0.62);               // 尾端反扣一口
        break;
      }
      case 'deepdrip': { // v1.11 帘后小门: 很深的一声水滴——门后是一个大得多的空间
        tone('sine', 1180, 340, 0.09, 0.12);
        tone('sine', 660, 190, 0.5, 0.07, 0.1);
        noise('brown', 1.6, 'lowpass', 220, 1, 0.1, 0.16, 0.4); // 空腔回声尾
        tone('sine', 74, 52, 1.2, 0.05, 0.2);
        break;
      }
      case 'dreadswell': { // v1.11 拐角 dread 拍: 低频升压——次声般的空气变重（灯才开始不对）
        const f = noise('brown', 2.0, 'lowpass', 90, 1, 0.3, 0, 1.3);
        f.frequency.linearRampToValueAtTime(210, t + 1.9);
        tone('sine', 27, 46, 2.0, 0.3);
        tone('sine', 54, 92, 1.9, 0.07, 0.12);
        break;
      }
      case 'fencewomp': { // v1.11 P16 巷内瓦楞铁皮被夜风推了一下: 板面弹性闷弹 + 高位薄嗒两声 + 落定
        noise('brown', 0.55, 'lowpass', 220, 0.8, 0.16, 0, 0.05);
        tone('sine', 74, 58, 0.5, 0.09);
        noise('white', 0.1, 'bandpass', 2400, 6, 0.024, 0.04);
        tone('square', 1240, 1180, 0.03, 0.018, 0.16);
        tone('square', 980, 950, 0.03, 0.013, 0.35);
        noise('brown', 0.22, 'lowpass', 300, 1, 0.05, 0.42);
        break;
      }
      case 'scrape': { // 金属刮擦（v1.8 拐角惊吓）: 宽带擦噪拖行下坠 + 双声高位金属啸 + 尾端石屑
        const f = noise('pink', 0.9, 'bandpass', 950, 3, 0.16, 0, 0.16);
        f.frequency.linearRampToValueAtTime(340, t + 0.85);
        tone('sawtooth', 2140, 1580, 0.5, 0.016, 0.08);
        tone('sawtooth', 3260, 2380, 0.32, 0.011, 0.18);
        noise('white', 0.06, 'highpass', 4300, 2, 0.045, 0.76);
        break;
      }
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
      // ---------- v1.9 新音色（门禁 49：配套新交互） ----------
      case 'flamegut': { // 长明灯火苗吞吸：软气流内吸上扬 + 玻璃罩微鸣 + 低位余温
        const f = noise('pink', 0.55, 'bandpass', 460, 1.4, 0.1, 0, 0.2);
        f.frequency.linearRampToValueAtTime(920, t + 0.42);
        tone('sine', 1180, 1172, 0.5, 0.012, 0.1);
        noise('brown', 0.42, 'lowpass', 140, 1, 0.05, 0.12, 0.1);
        break;
      }
      case 'woodknock': { // 柴垛滚响：圆木互磕的木质空腔三连 + 树皮碎屑
        tone('sine', 132, 86, 0.16, 0.16);
        tone('sine', 178, 122, 0.12, 0.1, 0.14);
        tone('sine', 104, 76, 0.2, 0.12, 0.27);
        noise('pink', 0.09, 'bandpass', 880, 2, 0.05, 0.02);
        noise('pink', 0.26, 'highpass', 1900, 1, 0.026, 0.32, 0.06);
        break;
      }
      case 'porcelain': { // 瓷釉轻磕：亮短非谐双分音 + 指甲弹瓷高频挑 + 第二记更轻
        tone('sine', 2140, 2118, 0.22, 0.05);
        tone('sine', 3320, 3288, 0.14, 0.03, 0.006);
        noise('white', 0.02, 'highpass', 5200, 2, 0.04);
        tone('sine', 2260, 2238, 0.15, 0.026, 0.19);
        break;
      }
      case 'sharpen': { // 手摇铅笔刀：六格摇柄棘轮 + 木屑削擦持续层
        for (let i = 0; i < 6; i++) {
          noise('pink', 0.05, 'bandpass', 1300 + (i % 2) * 260, 4, 0.05, i * 0.11);
          tone('square', 96, 88, 0.03, 0.018, i * 0.11);
        }
        noise('pink', 0.5, 'highpass', 2600, 1, 0.03, 0.08, 0.2);
        break;
      }
      case 'tassel': { // 金穗流苏拂过丝绒：柔软细索一拂 + 铜钩轻碰尾音
        noise('pink', 0.3, 'bandpass', 1500, 1.2, 0.05, 0, 0.07);
        noise('pink', 0.16, 'bandpass', 2200, 1.6, 0.026, 0.16, 0.05);
        tone('sine', 1430, 1418, 0.2, 0.018, 0.24);
        break;
      }
      case 'mutetrumpet': { // v1.13 台侧弱音小号：鼻音短句两粒（A4→F4），气声垫底
        // 弱音器的鼻腔感=基频压弱、2/3 次分音反重（哇音靠分音配比近似）；
        // 总时长 ~2.3s，比抬落动画多活半拍——这个厅的规矩：声音不跟人走
        for (const [f0, f1, at, dur] of [[440, 434, 0, 0.72], [349, 344, 0.78, 1.5]]) {
          tone('sawtooth', f0, f1, dur, 0.014, at);
          tone('sine', f0 * 2, f1 * 2, dur, 0.045, at);
          tone('sine', f0 * 3.02, f1 * 3.02, dur * 0.9, 0.034, at + 0.02);
          tone('sine', f0, f1, dur, 0.028, at);
        }
        noise('pink', 2.2, 'bandpass', 1500, 4, 0.018, 0.05, 0.5);
        break;
      }
      // ---------- v1.14 新音色（门禁 69：彩蛋第二批配套） ----------
      case 'papertear': { // 旧海报撕角：纤维嘶裂由高滑低 + 断裂颗粒串 + 纸片离墙的一口软风
        const tr = noise('white', 0.34, 'bandpass', 3200, 1.6, 0.06, 0, 0.006);
        tr.frequency.exponentialRampToValueAtTime(900, t + 0.3);
        for (let i = 0; i < 5; i++) {
          noise('white', 0.016, 'highpass', 4400 - i * 420, 3, 0.034 - i * 0.004, 0.03 + i * 0.055);
        }
        noise('pink', 0.22, 'bandpass', 640, 1.2, 0.024, 0.24, 0.06);
        break;
      }
      case 'clapslap': { // 场记板合拍：两板硬木宽带瞬态 + 木腔短鸣 + 棚壁一次回弹
        noise('white', 0.03, 'highpass', 2400, 1, 0.11, 0, 0.002);
        tone('sine', 620, 240, 0.07, 0.1);
        tone('sine', 1180, 860, 0.05, 0.05, 0.004);
        noise('pink', 0.1, 'bandpass', 480, 2, 0.05, 0.008, 0.004);
        // 棚壁回弹（一间大房间在答应）：迟 90ms 的低短影
        noise('pink', 0.07, 'bandpass', 700, 2, 0.022, 0.09, 0.01);
        break;
      }
      // ---------- v1.15 新音色（门禁 73：彩蛋第三批 + 远声应答谱系） ----------
      case 'replyhum': { // 那头的嗓子：D3→F3 两粒气声哼鸣——共振噪声成音（永远带着呼吸，不是干净正弦）
        noise('pink', 0.9, 'bandpass', REPLY_DYAD[0], 26, 0.16, 0, 0.3);
        noise('pink', 0.24, 'bandpass', REPLY_DYAD[0] * 2, 14, 0.03, 0.12, 0.1);
        noise('pink', 1.1, 'bandpass', REPLY_DYAD[1], 26, 0.14, 0.72, 0.34);
        noise('pink', 0.3, 'bandpass', REPLY_DYAD[1] * 2, 14, 0.026, 0.86, 0.12);
        noise('brown', 1.9, 'lowpass', 190, 1, 0.05, 0, 0.5); // 墙那边的胸腔
        break;
      }
      case 'replytap': { // 那头的指节：同一副音高落成两记叩点（调过音的敲击——它不是随手敲的）
        for (const [i, f] of REPLY_DYAD.entries()) {
          const at = i * 0.34;
          tone('sine', f * 2, f, 0.16, 0.09, at);
          tone('sine', f * 3.02, f * 2.98, 0.05, 0.022, at);
          noise('white', 0.02, 'lowpass', 900, 1, 0.05, at, 0.002);
        }
        noise('brown', 0.5, 'lowpass', 220, 1, 0.028, 0.36, 0.1);
        break;
      }
      case 'stonebrush': { // 指腹擦过石刻纹：矿物颗粒摩擦一拂（由细滑粗）+ 两粒石籽 + 掌根收尾软压
        const sb = noise('pink', 0.5, 'bandpass', 1750, 2.2, 0.05, 0, 0.09);
        sb.frequency.exponentialRampToValueAtTime(950, t + 0.42);
        noise('white', 0.06, 'highpass', 5200, 2, 0.014, 0.1);
        noise('white', 0.05, 'highpass', 4600, 2, 0.012, 0.3);
        noise('brown', 0.16, 'lowpass', 380, 1, 0.035, 0.4, 0.05);
        break;
      }
      case 'glasswipe': { // 指腹擦过凝雾玻璃：湿滑黏滞双短鸣 + 底下一层软擦 + 收尾高频珠
        noise('pink', 0.34, 'bandpass', 920, 1.4, 0.042, 0, 0.08);
        tone('sine', 1180, 1430, 0.16, 0.028, 0.05);
        tone('sine', 1540, 1210, 0.19, 0.024, 0.24);
        noise('white', 0.06, 'highpass', 4200, 2, 0.012, 0.32);
        break;
      }
      case 'chainrattle': { // 起重链受扰：链身低闷一坠 + 环环相磕的高位密簇（密→疏）+ 落定单磕
        tone('sine', 118, 74, 0.14, 0.09);
        noise('brown', 0.12, 'lowpass', 300, 1, 0.06, 0, 0.01);
        for (let i = 0; i < 9; i++) {
          const d = 0.05 + i * 0.05 + i * i * 0.011;
          tone('square', 2280 + (i % 4) * 310, 2100 + (i % 3) * 240, 0.03, 0.015, d);
          noise('white', 0.018, 'bandpass', 3400 - i * 160, 8, 0.028 - i * 0.002, d);
        }
        tone('sine', 1620, 1590, 0.12, 0.02, 0.78);
        break;
      }
      case 'tapewhirr': { // 开盘机走带（~4.2s）：马达起转 + 带面嘶声 + 房间低语（像倒着说）+ 停机顿挫
        tone('sawtooth', 36, 52, 0.6, 0.045);              // 马达爬速
        tone('sawtooth', 52, 50, 1.5, 0.032, 0.5);         // 稳态哼鸣（三段接力）
        tone('sawtooth', 51, 50, 1.5, 0.03, 1.7);
        tone('sawtooth', 50, 48, 1.2, 0.028, 2.9);
        noise('pink', 3.5, 'highpass', 3800, 0.7, 0.028, 0.45, 0.5);   // 带面嘶
        noise('brown', 3.0, 'bandpass', 310, 6, 0.075, 0.7, 0.9);      // 房间低语的底
        tone('sine', 224, 176, 1.6, 0.026, 1.1);           // 两支下坠的假嗓分音——
        tone('sine', 172, 208, 1.4, 0.022, 2.3);           // 听不清在说什么，也不该听清
        for (let i = 0; i < 7; i++) tone('square', 96, 90, 0.02, 0.011, 0.55 + i * 0.5); // 卷轴抖点
        tone('sine', 140, 58, 0.16, 0.08, 4.0);            // 停机闷顿
        noise('white', 0.05, 'bandpass', 900, 2, 0.04, 4.0);
        tone('square', 1800, 1740, 0.02, 0.02, 4.08);      // 继电器小咔
        break;
      }
      case 'carpass': { // 窗外夜车驶过（~4.6s）：湿路胎噪由远及近再远 + 引擎多普勒 + 过窗时的一口低涌
        noise('pink', 2.4, 'bandpass', 950, 1.1, 0.055, 0, 2.0);      // 驶近（长攻，2s 涨满）
        noise('pink', 2.2, 'bandpass', 760, 1.1, 0.05, 2.2, 0.15);    // 驶离（快起长衰）
        tone('sawtooth', 44, 56, 2.2, 0.038, 0.1);         // 引擎逼近（音高爬升）
        tone('sawtooth', 56, 34, 2.2, 0.034, 2.3);         // 引擎远去（多普勒下坠）
        tone('sawtooth', 88, 112, 2.2, 0.016, 0.1);        // 二次分音同步
        tone('sawtooth', 112, 68, 2.2, 0.014, 2.3);
        noise('brown', 1.2, 'lowpass', 220, 1, 0.075, 1.7, 0.5);      // 过窗那一口低涌
        noise('white', 0.5, 'highpass', 2400, 1, 0.02, 2.1, 0.18);    // 水花碎响
        break;
      }
      case 'winch': { // 吊灯绞盘（v1.10）：摇柄棘轮圈 + 钢缆绷紧上行呻吟 + 滑轮吱鸣 + 自重接管
        for (let i = 0; i < 8; i++) {
          tone('square', 118, 104, 0.035, 0.02, i * 0.16);
          noise('pink', 0.045, 'bandpass', 900 + (i % 2) * 180, 4, 0.038, i * 0.16);
        }
        tone('sine', 74, 96, 1.1, 0.05, 0.1);
        tone('sine', 1080, 1010, 0.5, 0.014, 0.5);
        noise('brown', 0.4, 'lowpass', 240, 1, 0.05, 1.1, 0.1);
        break;
      }
      case 'wallbox': { // 卡座点唱盒（v1.10）：投币簧 + 曲目牌翻页嗒嗒（密到疏）+ 机芯醒来的低哼
        tone('square', 2600, 2400, 0.02, 0.02);
        for (let i = 0; i < 5; i++) {
          noise('white', 0.02, 'bandpass', 3000 - i * 240, 6, 0.03, 0.16 + i * 0.09);
          tone('square', 180, 160, 0.02, 0.012, 0.16 + i * 0.09);
        }
        tone('sine', 96, 100, 0.8, 0.03, 0.7);
        tone('sine', 192, 200, 0.7, 0.014, 0.75);
        break;
      }
      case 'lockerclang': { // 铁皮更衣柜（v1.10）：门簧锐鸣 + 哐当闭合 + 空腔铁皮余振
        tone('square', 1650, 1520, 0.06, 0.03);
        noise('white', 0.04, 'highpass', 3400, 2, 0.04);
        tone('sine', 96, 60, 0.3, 0.16, 0.42);
        noise('brown', 0.16, 'lowpass', 400, 1, 0.1, 0.42);
        tone('sine', 340, 328, 0.5, 0.03, 0.44);
        tone('sine', 512, 490, 0.36, 0.02, 0.46);
        break;
      }
      case 'waterlap': { // 接水桶被碰（v1.10）：桶沿一声 + 水在铁皮里晃两拍（第二拍更轻）+ 迟到的一滴
        tone('sine', 520, 470, 0.14, 0.04);
        noise('pink', 0.4, 'bandpass', 620, 2.4, 0.05, 0.06, 0.1);
        tone('sine', 300, 380, 0.3, 0.026, 0.1);
        noise('pink', 0.3, 'bandpass', 540, 2.6, 0.036, 0.5, 0.1);
        tone('sine', 1900, 2300, 0.08, 0.02, 0.95);
        break;
      }
      case 'callbell': { // 候场呼叫铃（v1.10）：两短一长电铃（铃锤连击近似）+ 继电器收拍
        for (const [d, len] of [[0, 0.14], [0.26, 0.14], [0.52, 0.5]]) {
          const hits = Math.floor(len / 0.024);
          for (let i = 0; i < hits; i++) {
            tone('square', 2350, 2280, 0.02, 0.016, d + i * 0.024);
          }
          tone('sine', 1180, 1160, len + 0.1, 0.02, d);
        }
        tone('square', 900, 860, 0.02, 0.02, 1.1);
        break;
      }
      case 'latchsnap': { // 皮箱锁扣（v1.10）：簧压蓄力 + 双扣错拍弹开 + 皮革腔体微震
        noise('pink', 0.05, 'bandpass', 1400, 3, 0.03);
        tone('square', 2100, 1900, 0.025, 0.03, 0.07);
        tone('square', 2350, 2100, 0.025, 0.028, 0.19);
        tone('sine', 210, 170, 0.16, 0.05, 0.08);
        noise('brown', 0.12, 'lowpass', 300, 1, 0.04, 0.2);
        break;
      }
      // ---------- v1.10 P13「远处的声」：四种极远氛围事件（全部闷声化——
      // 高频先被距离吃掉，只剩腔体和低频；音量都压在暗处，像是听错了。
      // twinpeaks 的远声复用既有 owl，挂在环飞剪影的实时方位上） ----------
      case 'pipeknock': { // eraserhead 远处管道被敲三下（谁在楼那头对暖气说话）
        for (const [d, v] of [[0, 1], [0.44, 0.85], [0.94, 0.6]]) {
          tone('sine', 187, 165, 0.5 * v + 0.2, 0.05 * v, d);
          tone('sine', 476, 460, 0.22, 0.02 * v, d);
          noise('brown', 0.1, 'lowpass', 260, 1, 0.05 * v, d);
        }
        break;
      }
      case 'sirenfar': { // mulholland 极远的警笛掠过：两轮上下滑 + 城市底噪一口
        for (const d of [0, 1.9]) {
          tone('sine', 620, 940, 0.95, 0.016, d);
          tone('sine', 940, 590, 0.95, 0.014, d + 0.95);
        }
        noise('brown', 3.8, 'lowpass', 180, 0.8, 0.02, 0, 1.2);
        break;
      }
      case 'drawerfar': { // archive 隔壁房间一只木抽屉滑轨到底闷闷关上（隔壁没有人）
        noise('pink', 0.5, 'lowpass', 340, 1, 0.028, 0, 0.3);
        noise('brown', 0.16, 'lowpass', 200, 1, 0.07, 0.5);
        tone('sine', 74, 52, 0.3, 0.05, 0.5);
        tone('sine', 400, 380, 0.06, 0.012, 0.54);
        break;
      }
      case 'liftbell': { // lobby 电梯到站的一声叮——这栋楼没有电梯
        tone('sine', 932, 926, 1.4, 0.028);
        tone('sine', 1397, 1388, 0.9, 0.014, 0.01);
        noise('brown', 0.5, 'lowpass', 150, 1, 0.02, 0.15, 0.2);
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
