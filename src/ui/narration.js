// ============================================================
// Narration — 旁白系统（三种可切换体验模式 + 关）：
//   letters  字母显现（默认推荐）：屏幕逐字打出旁白，配环境音与静默拍
//   jazz     爵士+字母：字母显现之上叠加程序化深夜爵士氛围层
//   voice    语音+字母：字母显现 + 戏剧化节奏 TTS（分句停顿/变速/耳语感）
//   off      关闭旁白
// 旧式「连续干读」不再作为默认。
// ============================================================
import { NARRATIONS } from '../data/essays.js';
import { LetterDisplay } from './letters.js';
import { JazzLayer } from '../audio/jazz.js';

export const NARRATION_MODES = [
  { id: 'letters', label: '旁白 字母', desc: '字母显现（推荐）' },
  { id: 'jazz', label: '旁白 爵士', desc: '爵士氛围 + 字母显现' },
  { id: 'voice', label: '旁白 语音', desc: '戏剧化语音 + 字母显现' },
  { id: 'off', label: '旁白 关', desc: '关闭旁白' }
];

export class Narration {
  constructor(ui, audio) {
    this.ui = ui;
    this.audio = audio;
    this.letters = new LetterDisplay(audio);
    this.jazz = new JazzLayer(audio);
    this.mode = 'letters';
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this._voice = null;
    this._ttsTimers = [];
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

  get enabled() { return this.mode !== 'off'; }

  /** 循环切换模式，返回新模式描述 */
  cycleMode() {
    const idx = NARRATION_MODES.findIndex((m) => m.id === this.mode);
    const next = NARRATION_MODES[(idx + 1) % NARRATION_MODES.length];
    this.setMode(next.id);
    return next;
  }

  setMode(id) {
    this.mode = id;
    this.applyMode();
    if (id === 'off') {
      this.stop();
    }
  }

  /** 同步模式副作用（爵士层开关等）；audio 解锁后也需调用一次 */
  applyMode() {
    this.jazz.setEnabled(this.mode === 'jazz');
  }

  speakKey(key) {
    const n = NARRATIONS[key];
    if (!n) return;
    this.speak(n.text, n.lang);
  }

  speak(text, lang = 'zh-CN') {
    if (this.mode === 'off') return;
    // 字母显现是所有开启模式的基座（同时充当无障碍字幕）
    this.letters.show(text, { silenceBeats: this.mode !== 'voice' });
    if (this.mode === 'voice') this._speakDramatic(text, lang);
  }

  /**
   * 戏剧化 TTS：按句读切分，句间随机停顿，
   * 语速/音量在低语与陈述之间摆动——拒绝干巴巴连续朗读。
   */
  _speakDramatic(text, lang) {
    if (!this.supported) return;
    this._clearTts();
    try { window.speechSynthesis.cancel(); } catch { /* ok */ }
    const phrases = text.split(/(?<=[。！？；…])/).map((s) => s.trim()).filter(Boolean);
    let delay = 120;
    for (const [i, phrase] of phrases.entries()) {
      const id = setTimeout(() => {
        if (this.mode !== 'voice') return;
        try {
          const u = new SpeechSynthesisUtterance(phrase);
          u.lang = lang;
          const whisperish = Math.random() < 0.3 && i > 0;
          u.rate = whisperish ? 0.68 : 0.8 + Math.random() * 0.12;
          u.pitch = whisperish ? 0.55 : 0.68 + Math.random() * 0.1;
          u.volume = whisperish ? 0.55 : 0.9;
          if (this._voice) u.voice = this._voice;
          window.speechSynthesis.speak(u);
        } catch { /* 保留字幕即可 */ }
      }, delay);
      this._ttsTimers.push(id);
      // 估算本句朗读时长 + 戏剧化句间停顿
      delay += phrase.length * 260 + 420 + Math.random() * 900;
    }
  }

  _clearTts() {
    for (const t of this._ttsTimers) clearTimeout(t);
    this._ttsTimers = [];
  }

  stop() {
    this.letters.cancel();
    this._clearTts();
    if (this.supported) {
      try { window.speechSynthesis.cancel(); } catch { /* ok */ }
    }
  }

  /** 兼容旧 API（V 键直接开/关） */
  setEnabled(b) {
    this.setMode(b ? 'letters' : 'off');
  }
}
