// ============================================================
// MurmurVoice — 「代替配音」（v1.5）：介于真实与虚假之间的非人声。
// 清晰真人朗读（TTS）已从展馆退场；这里不朗读、不复述——
// 把一句旁白转成一串气声音节（成形滤波噪声的简化元音口型）、
// 无线电静电碎语与句尾的一次呼吸：听得出「有个声音在说话」，
// 永远听不清它在说什么字。
// 全部 WebAudio 实时合成——零 TTS、零录音采样。
// ============================================================

// 纯数据配方（供单元测试校验参数域）
export const MURMUR = {
  // 简化元音口型的成形滤波中心频率对 [F1, F2]（Hz）：
  // 落在真实语音共振峰域内游走，但绝不成词
  vowels: [
    [420, 1480], [560, 1040], [320, 2050], [640, 1280], [380, 920]
  ],
  sylGap: [0.1, 0.19],      // 音节间隔 [min, max)（秒）
  sylDur: [0.07, 0.16],     // 音节长度
  minorPause: [0.26, 0.5],  // 顿号/逗号级停顿
  majorPause: [0.6, 1.0],   // 句号级停顿（含一次呼吸）
  staticChance: 0.14,       // 无线电静电碎语替换概率
  level: 0.15               // 总线电平（压在底噪之下）
};

/**
 * murmurPlan — 纯函数：把一句旁白排成非人声事件时间线（供单测）。
 * 返回 [{ type:'syl'|'static'|'breath', t, dur, f1?, f2?, gain }...]，
 * t 单调不减；结尾必有一次呼吸（一句话说完，先呼吸再沉默）。
 */
export function murmurPlan(text, rand = Math.random) {
  const events = [];
  let t = 0.12;
  for (const ch of Array.from(text)) {
    if (ch === ' ' || ch === '\u00a0') continue;
    if ('。！？…'.includes(ch)) {
      events.push({ type: 'breath', t, dur: 0.55, gain: 0.5 });
      t += MURMUR.majorPause[0] + rand() * (MURMUR.majorPause[1] - MURMUR.majorPause[0]);
      continue;
    }
    if ('，、；：—'.includes(ch)) {
      t += MURMUR.minorPause[0] + rand() * (MURMUR.minorPause[1] - MURMUR.minorPause[0]);
      continue;
    }
    if (rand() < MURMUR.staticChance) {
      events.push({ type: 'static', t, dur: 0.05 + rand() * 0.06, gain: 0.45 + rand() * 0.3 });
    } else {
      const [f1, f2] = MURMUR.vowels[Math.floor(rand() * MURMUR.vowels.length)];
      events.push({
        type: 'syl',
        t,
        dur: MURMUR.sylDur[0] + rand() * (MURMUR.sylDur[1] - MURMUR.sylDur[0]),
        f1: f1 * (0.92 + rand() * 0.16),
        f2: f2 * (0.92 + rand() * 0.16),
        gain: 0.55 + rand() * 0.45
      });
    }
    t += MURMUR.sylGap[0] + rand() * (MURMUR.sylGap[1] - MURMUR.sylGap[0]);
  }
  events.push({ type: 'breath', t: t + 0.15, dur: 0.9, gain: 0.6 });
  return events;
}

export class MurmurVoice {
  constructor(audio) {
    this.audio = audio; // AudioEngine 实例（借用 ctx / master / 噪声缓冲 / 混响总线）
    this._nodes = [];
  }

  /** 低声「说」一句——与字母显现同时进行，互不指望对方 */
  speak(text) {
    this.stop();
    const a = this.audio;
    if (!a.ctx || a.muted) return;
    const ctx = a.ctx;
    const t0 = ctx.currentTime + 0.05;

    const out = ctx.createGain();
    out.gain.value = MURMUR.level;
    // 轻微声像漂移：那个声音不肯站在正中间
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = (Math.random() - 0.5) * 0.4;
      out.connect(pan);
      pan.connect(a.master);
      this._nodes.push(pan);
    } else {
      out.connect(a.master);
    }
    if (a.reverb && a.reverb.buffer) out.connect(a.reverb);
    this._nodes.push(out);

    for (const ev of murmurPlan(text)) {
      if (ev.type === 'syl') this._syllable(out, t0 + ev.t, ev);
      else if (ev.type === 'static') this._static(out, t0 + ev.t, ev);
      else this._breath(out, t0 + ev.t, ev);
    }
  }

  stop() {
    for (const n of this._nodes) {
      try { n.stop?.(); } catch { /* already stopped */ }
      try { n.disconnect(); } catch { /* ok */ }
    }
    this._nodes = [];
  }

  _noiseSrc(type, t, dur) {
    const s = this.audio.ctx.createBufferSource();
    s.buffer = this.audio._noiseBuffer(type);
    s.loop = true;
    s.start(t);
    s.stop(t + dur + 0.1);
    this._nodes.push(s);
    return s;
  }

  _env(t, attack, dur, peak) {
    const g = this.audio.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this._nodes.push(g);
    return g;
  }

  /** 气声「元音」：粉噪并联过两级成形带通（简化 F1/F2 共振峰），口型微滑 */
  _syllable(out, t, ev) {
    const ctx = this.audio.ctx;
    const src = this._noiseSrc('pink', t, ev.dur);
    const g = this._env(t, 0.02, ev.dur, ev.gain);
    for (const [f, q, k] of [[ev.f1, 6.5, 1], [ev.f2, 8.5, 0.55]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f, t);
      // 口型在音节内轻轻合拢
      bp.frequency.linearRampToValueAtTime(f * 0.94, t + ev.dur);
      bp.Q.value = q;
      const bg = ctx.createGain();
      bg.gain.value = k;
      src.connect(bp);
      bp.connect(bg);
      bg.connect(g);
      this._nodes.push(bp, bg);
    }
    g.connect(out);
  }

  /** 无线电静电碎语：一小格载波沙沙，像信号里丢掉的那个词 */
  _static(out, t, ev) {
    const ctx = this.audio.ctx;
    const src = this._noiseSrc('crackle', t, ev.dur);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1700;
    const g = this._env(t, 0.008, ev.dur, ev.gain * 0.7);
    src.connect(hp);
    hp.connect(g);
    g.connect(out);
    this._nodes.push(hp);
  }

  /** 句尾呼吸：低通粉噪慢起慢落——一句话说完先呼吸再沉默 */
  _breath(out, t, ev) {
    const ctx = this.audio.ctx;
    const src = this._noiseSrc('pink', t, ev.dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 480;
    const g = this._env(t, ev.dur * 0.42, ev.dur, ev.gain * 0.5);
    src.connect(lp);
    lp.connect(g);
    g.connect(out);
    this._nodes.push(lp);
  }
}
