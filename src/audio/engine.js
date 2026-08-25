// ============================================================
// AudioEngine — 全程序化 WebAudio 合成。
// 环境底噪(每厅配方) + 交互音效。绝无采样素材。
// ============================================================
import { DRONES } from './drones.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._amb = null;
    this._ambTimers = [];
    this._buffers = {};
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
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
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
  sfx(name, vol = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.value = vol;
    out.connect(this.master);

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
      default:
        tone('sine', 660, 660, 0.08, 0.04);
    }
  }
}
