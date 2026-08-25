// ============================================================
// JazzLayer — 程序化「深夜爵士」氛围层。
// 全部由 WebAudio 振荡器与噪声实时合成：慢速摇摆律动的刷镲、
// 行走贝斯、柔和钢琴式和声、偶尔的弱音铜管短句、黑胶炒豆底噪。
// 不含任何真实爵士录音或采样素材；可与各厅林奇低频底噪混音，可开关。
// ============================================================

// 纯数据配方（供单元测试校验参数域）
export const JAZZ = {
  bpm: 63,
  swing: 0.66, // 摇摆八分中后半拍的位置（0.5=平直，0.66≈三连音摇摆）
  // 四小节循环: Dm7 → G7 → Cmaj7 → Am7（D dorian 夜色进行）
  progression: [
    {
      name: 'Dm7',
      bass: [73.42, 87.31, 110.0, 130.81],
      chord: [261.63, 293.66, 349.23, 440.0]
    },
    {
      name: 'G7',
      bass: [98.0, 123.47, 146.83, 87.31],
      chord: [246.94, 293.66, 349.23, 392.0]
    },
    {
      name: 'Cmaj7',
      bass: [65.41, 82.41, 98.0, 123.47],
      chord: [261.63, 329.63, 392.0, 493.88]
    },
    {
      name: 'Am7',
      bass: [110.0, 98.0, 82.41, 73.42],
      chord: [220.0, 261.63, 329.63, 392.0]
    }
  ],
  // 爵士 ride 骨架（以拍为单位，含摇摆后八分）
  ridePattern: [0, 1, 1.66, 2, 3, 3.66],
  hornScale: [293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25],
  level: 0.16 // 总线混音电平（压在底噪之下）
};

export class JazzLayer {
  constructor(audio) {
    this.audio = audio;       // AudioEngine 实例（借用 ctx / master / 噪声缓冲）
    this.playing = false;
    this._bus = null;
    this._timer = null;
    this._nextBeatTime = 0;
    this._beat = 0;           // 全局拍计数
    this._crackle = null;
  }

  get enabled() { return this.playing; }

  start() {
    const a = this.audio;
    if (this.playing || !a.ctx) return;
    this.playing = true;
    const ctx = a.ctx;
    const t = ctx.currentTime;

    this._bus = ctx.createGain();
    this._bus.gain.setValueAtTime(0, t);
    this._bus.gain.linearRampToValueAtTime(JAZZ.level, t + 2.2);
    // 轻柔低通——像从隔壁房间飘来的乐队
    this._tone = ctx.createBiquadFilter();
    this._tone.type = 'lowpass';
    this._tone.frequency.value = 3400;
    this._bus.connect(this._tone);
    this._tone.connect(a.master);

    // 黑胶炒豆底噪
    this._crackle = ctx.createBufferSource();
    this._crackle.buffer = a._noiseBuffer('crackle');
    this._crackle.loop = true;
    const cg = ctx.createGain();
    cg.gain.value = 0.16;
    const cf = ctx.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 1800;
    this._crackle.connect(cf); cf.connect(cg); cg.connect(this._bus);
    this._crackle.start();

    this._beat = 0;
    this._nextBeatTime = t + 0.15;
    // 前瞻调度器：每 40ms 检查，把 0.3s 内的拍事件排入队列
    this._timer = setInterval(() => this._schedule(), 40);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this._timer);
    this._timer = null;
    const ctx = this.audio.ctx;
    if (this._bus && ctx) {
      const t = ctx.currentTime;
      this._bus.gain.cancelScheduledValues(t);
      this._bus.gain.linearRampToValueAtTime(0, t + 1.2);
      const bus = this._bus;
      const tone = this._tone;
      const crackle = this._crackle;
      setTimeout(() => {
        try { crackle.stop(); } catch { /* stopped */ }
        try { crackle.disconnect(); } catch { /* ok */ }
        try { bus.disconnect(); } catch { /* ok */ }
        try { tone.disconnect(); } catch { /* ok */ }
      }, 1400);
    }
    this._bus = null;
  }

  setEnabled(b) { if (b) this.start(); else this.stop(); }

  // ---------- 调度 ----------
  _schedule() {
    const ctx = this.audio.ctx;
    if (!ctx) return;
    const beatDur = 60 / JAZZ.bpm;
    while (this._nextBeatTime < ctx.currentTime + 0.3) {
      this._playBeat(this._beat, this._nextBeatTime, beatDur);
      this._beat++;
      this._nextBeatTime += beatDur;
    }
  }

  _playBeat(beat, t, beatDur) {
    const bar = Math.floor(beat / 4);
    const beatInBar = beat % 4;
    const chordCfg = JAZZ.progression[bar % JAZZ.progression.length];

    // 行走贝斯：每拍一个音，轻微滑入
    this._bass(chordCfg.bass[beatInBar], t, beatDur * 0.96);

    // ride：正拍 + 2/4 拍的摇摆后八分
    this._ride(t, beatInBar === 1 || beatInBar === 3 ? 0.055 : 0.04);
    if (beatInBar === 1 || beatInBar === 3) {
      this._ride(t + beatDur * JAZZ.swing, 0.032);
      this._brush(t, beatDur); // 刷镲扫弦感落在 2/4
    }

    // 钢琴式和声：稀疏切分（每小节 1-2 次，落在摇摆后半拍）
    if ((beatInBar === 0 && Math.random() < 0.5) || (beatInBar === 2 && Math.random() < 0.35)) {
      this._chord(chordCfg.chord, t + beatDur * JAZZ.swing, beatDur * 1.6);
    }

    // 弱音铜管：约每 8-16 小节一个 2-4 音短句
    if (beatInBar === 0 && bar % 8 === 5 && Math.random() < 0.6) {
      this._hornPhrase(t, beatDur);
    }
  }

  // ---------- 音色 ----------
  _bass(freq, t, dur) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    const o2 = ctx.createOscillator(); // 一点泛音让它像拨弦
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.5);
    o.connect(g); o2.connect(g2);
    g.connect(this._bus); g2.connect(this._bus);
    o.start(t); o.stop(t + dur + 0.05);
    o2.start(t); o2.stop(t + dur + 0.05);
  }

  _ride(t, peak) {
    const ctx = this.audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.audio._noiseBuffer('white');
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 5600 + Math.random() * 900;
    f.Q.value = 2.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    src.connect(f); f.connect(g); g.connect(this._bus);
    src.start(t); src.stop(t + 0.4);
  }

  _brush(t, beatDur) {
    const ctx = this.audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.audio._noiseBuffer('pink');
    src.playbackRate.value = 0.8;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1300, t);
    f.frequency.linearRampToValueAtTime(2400, t + beatDur * 0.8);
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.02, t + beatDur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + beatDur * 0.95);
    src.connect(f); f.connect(g); g.connect(this._bus);
    src.start(t); src.stop(t + beatDur);
  }

  _chord(freqs, t, dur) {
    const ctx = this.audio.ctx;
    for (const [i, fr] of freqs.entries()) {
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.value = fr;
      const g = ctx.createGain();
      const pk = 0.028 - i * 0.004;
      const dt = t + i * 0.012; // 琶音式微错位
      g.gain.setValueAtTime(0.0001, dt);
      g.gain.exponentialRampToValueAtTime(Math.max(pk, 0.008), dt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, dt + dur);
      o.connect(g); g.connect(this._bus);
      o.start(dt); o.stop(dt + dur + 0.05);
    }
  }

  _hornPhrase(t, beatDur) {
    const ctx = this.audio.ctx;
    const n = 2 + Math.floor(Math.random() * 3);
    let time = t;
    let idx = Math.floor(Math.random() * JAZZ.hornScale.length);
    for (let i = 0; i < n; i++) {
      const fr = JAZZ.hornScale[idx];
      idx = Math.max(0, Math.min(JAZZ.hornScale.length - 1, idx + (Math.random() < 0.5 ? -1 : 1)));
      const dur = beatDur * (i === n - 1 ? 2.4 : 0.9);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fr;
      // 颤音
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.2;
      const vg = ctx.createGain();
      vg.gain.value = fr * 0.006;
      vib.connect(vg); vg.connect(o.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 950;
      f.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.035, time + 0.09);
      g.gain.setValueAtTime(0.035, time + dur * 0.6);
      g.gain.linearRampToValueAtTime(0.0001, time + dur);
      o.connect(f); f.connect(g); g.connect(this._bus);
      o.start(time); o.stop(time + dur + 0.05);
      vib.start(time); vib.stop(time + dur + 0.05);
      time += dur * (0.92 + Math.random() * 0.16);
    }
  }
}
