// ============================================================
// Narration — 原创旁白。优先 Web Speech API 朗读，
// 不可用时降级为字幕；随时可开关。
// ============================================================
import { NARRATIONS } from '../data/essays.js';

export class Narration {
  constructor(ui) {
    this.ui = ui;
    this.enabled = true;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this._voice = null;
    if (this.supported) {
      const pick = () => {
        const voices = window.speechSynthesis.getVoices();
        this._voice =
          voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('zh')) ||
          voices[0] || null;
      };
      pick();
      window.speechSynthesis.onvoiceschanged = pick;
    }
  }

  speakKey(key) {
    const n = NARRATIONS[key];
    if (!n) return;
    this.speak(n.text, n.lang);
  }

  speak(text, lang = 'zh-CN') {
    // 字幕永远显示（无障碍与无 TTS 环境的降级）
    this.ui.caption(text, Math.max(5000, text.length * 150));
    if (!this.enabled || !this.supported) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.9;
      u.pitch = 0.72;
      u.volume = 0.9;
      if (this._voice) u.voice = this._voice;
      window.speechSynthesis.speak(u);
    } catch {
      // TTS 失败时保留字幕即可
    }
  }

  stop() {
    if (this.supported) {
      try { window.speechSynthesis.cancel(); } catch { /* ok */ }
    }
  }

  setEnabled(b) {
    this.enabled = b;
    if (!b) this.stop();
  }
}
