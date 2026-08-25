// ============================================================
// LetterDisplay — 「字母显现」旁白：不依赖语音，
// 字幕机/打字机式地逐字显现，偶尔故障闪现错误字形、
// 偶尔在句读处坠入突兀静默（整体音量抽走再缓慢回来）。
// 无语音环境下也能完整传达旁白。
// ============================================================

const GLITCH_POOL = 'ΔΞΨЖШЯ§¤◊∆*#%&?!';

export class LetterDisplay {
  constructor(audio) {
    this.audio = audio;
    this.box = document.createElement('div');
    this.box.className = 'letters-box';
    this.box.setAttribute('aria-live', 'polite');
    document.getElementById('app').appendChild(this.box);
    this._timers = [];
    this._active = false;
  }

  get active() { return this._active; }

  cancel() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
    this._active = false;
    this.box.classList.remove('on');
    const clearId = setTimeout(() => { if (!this._active) this.box.replaceChildren(); }, 650);
    this._timers.push(clearId);
  }

  _later(fn, ms) {
    const id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  }

  /**
   * 逐字显现一段旁白。
   * silenceBeats: 在主要句读处随机触发的静默拍（默认开）。
   */
  show(text, { silenceBeats = true, onDone = null } = {}) {
    this.cancel();
    this._active = true;
    this.box.replaceChildren();
    this.box.classList.add('on');

    const chars = Array.from(text);
    const spans = chars.map((ch) => {
      const s = document.createElement('span');
      s.className = 'lt-ch';
      s.textContent = ch === ' ' ? '\u00a0' : ch;
      this.box.appendChild(s);
      return s;
    });

    let i = 0;
    const step = () => {
      if (!this._active) return;
      if (i >= chars.length) {
        // 打完：停留后整体淡出
        this._later(() => {
          if (!this._active) return;
          this._active = false;
          this.box.classList.remove('on');
          this._later(() => { if (!this._active) this.box.replaceChildren(); }, 700);
          if (onDone) onDone();
        }, 2400 + chars.length * 45);
        return;
      }
      const ch = chars[i];
      const span = spans[i];
      i++;

      const isMajorPunct = '。！？…'.includes(ch);
      const isMinorPunct = '，、；：—'.includes(ch);

      // 故障闪现：先出现错误字形，再纠正（林奇式字幕机打嗝）
      if (!isMajorPunct && !isMinorPunct && ch !== ' ' && Math.random() < 0.035) {
        span.textContent = GLITCH_POOL[Math.floor(Math.random() * GLITCH_POOL.length)];
        span.classList.add('lt-on', 'lt-glitch');
        this.audio.sfx('type', 0.5);
        this._later(() => {
          span.textContent = ch;
          span.classList.remove('lt-glitch');
        }, 90);
      } else {
        span.classList.add('lt-on');
        if (ch !== ' ' && !isMinorPunct && Math.random() < 0.8) this.audio.sfx('type', 0.4);
      }

      // 间隔：句读长停，普通字符带抖动
      let gap = 82 + Math.random() * 70;
      if (isMinorPunct) gap = 380 + Math.random() * 220;
      if (isMajorPunct) {
        gap = 760 + Math.random() * 380;
        this.audio.sfx('typebell', 0.35);
        // 突兀静默拍：世界的声音被抽走一瞬
        if (silenceBeats && Math.random() < 0.3) {
          this.audio.duck(0.55, 0.03, 1.6);
          gap += 620;
        }
      }
      this._later(step, gap);
    };
    step();
  }
}
