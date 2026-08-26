// ============================================================
// Narration — 旁白系统（v1.5：配音退场）。
// 三种可切换体验模式 + 关：
//   letters  字母显现（默认）：旁白逐字打出，打字机音/故障字形/静默拍
//   murmur   低语+字母：字母显现之上叠一层非人声低语——气声音节/
//            无线电静电/句尾呼吸，介于真实与虚假之间，永远听不清字
//   jazz     爵士+字母：程序化「深夜爵士」氛围层
//   off      关闭旁白
// 清晰真人朗读（TTS）已移除：这座馆不需要一个把话说明白的声音。
// ============================================================
import { NARRATIONS } from '../data/essays.js';
import { LetterDisplay } from './letters.js';
import { JazzLayer } from '../audio/jazz.js';
import { MurmurVoice } from '../audio/murmur.js';

export const NARRATION_MODES = [
  { id: 'letters', label: '旁白 字母', desc: '字母显现（推荐）' },
  { id: 'murmur', label: '旁白 低语', desc: '非人声低语 + 字母显现' },
  { id: 'jazz', label: '旁白 爵士', desc: '爵士氛围 + 字母显现' },
  { id: 'off', label: '旁白 关', desc: '关闭旁白' }
];

export class Narration {
  constructor(ui, audio) {
    this.ui = ui;
    this.audio = audio;
    this.letters = new LetterDisplay(audio);
    this.jazz = new JazzLayer(audio);
    this.murmur = new MurmurVoice(audio);
    this.mode = 'letters';
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
    this.speak(n.text);
  }

  speak(text) {
    if (this.mode === 'off') return;
    // 字母显现是所有开启模式的基座（同时充当无障碍字幕）
    this.letters.show(text, { silenceBeats: true });
    // 低语档：非人声在字母之下咕哝——不与字幕对齐，各说各的
    if (this.mode === 'murmur') this.murmur.speak(text);
  }

  stop() {
    this.letters.cancel();
    this.murmur.stop();
  }

  /** 兼容旧 API（直接开/关） */
  setEnabled(b) {
    this.setMode(b ? 'letters' : 'off');
  }
}
