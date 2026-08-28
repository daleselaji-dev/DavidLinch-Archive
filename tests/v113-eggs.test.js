import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// ============================================================
// v1.13 门禁 63：七厅彩蛋齐加一遍（每厅新增 1 件可发现彩蛋）
// 口径：
//   · 每件彩蛋的核心机制字段在源（防后续改动无声拆掉）
//   · 每件 ≥2 通道反馈：动画状态字段 + sfx 接线（+短句）在同一
//     onActivate 邻域
//   · 字幕全部 ≤22 字、只说一次（said/closed 锁存）
//   · 新音色 mutetrumpet 在引擎且被 mulholland 接线；
//     音色时长 > 抬落动画时长（声音比乐器晚收——本厅的规矩）
//   · INTERACTIVE_MIN 七厅全部上调（普查 -1 口径不回退）
// ============================================================

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const SRC = {
  lobby: read('halls/lobby.js'),
  archive: read('halls/archive.js'),
  eraserhead: read('halls/eraserhead.js'),
  bluevelvet: read('halls/bluevelvet.js'),
  twinpeaks: read('halls/twinpeaks.js'),
  mulholland: read('halls/mulholland.js'),
  studio: read('halls/studio.js'),
  engine: read('audio/engine.js')
};

/** 从 hint 字面量起取 onActivate 邻域（配平大括号近似段） */
const hotspotBlock = (src, hintLiteral, span = 900) => {
  const at = src.indexOf(hintLiteral);
  expect(at, `hint 未找到: ${hintLiteral}`).toBeGreaterThan(-1);
  return src.slice(at, at + span);
};

// [厅, hint, 机制状态字段, 音色, 一次性短句]
const EGGS = [
  ['lobby', "hint: 'E — 一支放反了的花'", 'backLilyNod', "'tassel'", '有人先来过了。'],
  ['eraserhead', "hint: 'E — 用剩的橡皮'", 'stubState', "'woodknock'", '橡皮上没有字。'],
  ['bluevelvet', "hint: 'E — 吧台尽头的小费罐'", 'tipState', "'coin'", '都是留给歌手的。'],
  ['twinpeaks', "hint: 'E — 一只倒扣的杯'", 'flipState', "'porcelain'", '下面什么也没有。'],
  ['mulholland', "hint: 'E — 一支带弱音器的小号'", 'tptState', "'mutetrumpet'", '声音比它晚走半拍。'],
  ['studio', "hint: 'E — 一只没干的黏土小像'", 'clayState', "'wetstir'", '它还没干。'],
  ['archive', "hint: 'E — 趴在地上的书'", 'tentState', "'page'", '读到一半的人走了。']
];

describe('v1.13 门禁 63：七件彩蛋核心机制在源', () => {
  it.each(EGGS)('%s %s：状态字段 + 音色接线', (hall, hint, state, sfx) => {
    expect(SRC[hall]).toContain(state);
    const block = hotspotBlock(SRC[hall], hint);
    expect(block, `${hall} 彩蛋缺声通道`).toContain(sfx);
    expect(block, `${hall} 彩蛋缺动画/状态通道`).toContain(state);
  });

  it.each(EGGS)('%s 短句「%s」≤22 字且在源', (hall, _hint, _state, _sfx, cap) => {
    expect(SRC[hall]).toContain(cap);
    expect(cap.length).toBeLessThanOrEqual(22);
  });

  it.each(EGGS)('%s 短句只说一次（said/closed 锁存在 onActivate 邻域）', (hall, hint) => {
    const block = hotspotBlock(SRC[hall], hint);
    expect(/\.said|closed/.test(block), `${hall} 彩蛋短句未锁存`).toBe(true);
  });
});

describe('v1.13 门禁 63：彩蛋各自的克制口径', () => {
  it('lobby 碑后白花藏在碑背面（z<-1 的背面位）且连动光缝（seamPulse 借亮）', () => {
    const at = SRC.lobby.indexOf('backLily.position.set');
    expect(at).toBeGreaterThan(-1);
    expect(SRC.lobby.slice(at, at + 60)).toMatch(/-1\.\d+\)/);
    expect(hotspotBlock(SRC.lobby, "hint: 'E — 一支放反了的花'")).toContain('seamPulse.t = 0');
  });

  it('eraserhead 橡皮立起转半圈又躺回（π/2 复位）——不多说一个字', () => {
    expect(SRC.eraserhead).toContain("stubEraser.rotation.set(0, 1.1, Math.PI / 2)");
    // 动画完整段：立起→转半圈→躺回
    const at = SRC.eraserhead.indexOf('stubState.t += dt');
    const seg = SRC.eraserhead.slice(at, at + 700);
    expect(seg).toContain('1 - rise + fall * fall');
  });

  it('bluevelvet 小费罐硬币在罐底（三枚错落合并）+ 摇晃衰减复位', () => {
    const at = SRC.bluevelvet.indexOf('const tipJar');
    const seg = SRC.bluevelvet.slice(at, at + 1600);
    expect((seg.match(/CylinderGeometry\(0\.01[46], 0\.01[46], 0\.003, 10\)/g) || []).length).toBe(3);
    expect(SRC.bluevelvet).toContain('tipJar.rotation.z = 0');
  });

  it('twinpeaks 倒扣杯只有杯抬、碟不动（flipLift 独立组）+ 落定第二声更轻', () => {
    expect(SRC.twinpeaks).toContain('const flipLift');
    expect(SRC.twinpeaks).toContain('flipCup.add(flipSaucer, flipLift)');
    const block = hotspotBlock(SRC.twinpeaks, "hint: 'E — 一只倒扣的杯'");
    expect((block.match(/sfxAt\('porcelain'/g) || []).length).toBe(2);
  });

  it('mulholland 小号：音色 2.3s > 动画 1.75s——收拍后声音独自活半拍', () => {
    expect(SRC.mulholland).toContain('tptState.t / 1.75');
    // 引擎里第二粒音在 0.78s 起、长 1.5s（尾点 ~2.28s）
    const at = SRC.engine.indexOf("case 'mutetrumpet'");
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.engine.slice(at, at + 900);
    expect(seg).toContain('0.78, 1.5');
  });

  it('studio 黏土小像初始脸朝墙（-π/2）且转头极慢（dt * 1.1）、可转回去', () => {
    expect(SRC.studio).toContain('clayHead.rotation.y = -Math.PI / 2');
    expect(SRC.studio).toContain('dt * 1.1');
    expect(SRC.studio).toContain('clayState.facing = !clayState.facing');
  });

  it('archive 趴地书合上是永久的（closed 锁存后只剩纸声，不再撑起）', () => {
    expect(SRC.archive).toContain('tentState.closed = true');
    const block = hotspotBlock(SRC.archive, "hint: 'E — 趴在地上的书'", 1100);
    expect(block).toContain('合上以后只剩纸声');
  });
});

describe('v1.13 门禁 63：新音色 + 交互密度阈值', () => {
  it('mutetrumpet 在引擎：鼻音配比（基频弱、2/3 次分音反重）+ 气声垫', () => {
    const at = SRC.engine.indexOf("case 'mutetrumpet'");
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.engine.slice(at, at + 900);
    expect(seg).toContain("tone('sawtooth', f0, f1, dur, 0.014, at)");
    expect(seg).toContain('f0 * 3.02');
    expect(seg).toContain("noise('pink', 2.2");
  });

  it('INTERACTIVE_MIN 七厅全部上调（v1.13 普查 -1 口径）', () => {
    const cjs = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    const at = cjs.indexOf('const INTERACTIVE_MIN');
    const seg = cjs.slice(at, at + 260);
    const mins = {
      lobby: 18, archive: 32, eraserhead: 25, bluevelvet: 20,
      twinpeaks: 22, mulholland: 21, studio: 26
    };
    for (const [hall, min] of Object.entries(mins)) {
      const m = new RegExp(`${hall}:\\s*(\\d+)`).exec(seg);
      expect(m, `INTERACTIVE_MIN 缺 ${hall}`).toBeTruthy();
      expect(Number(m[1]), `INTERACTIVE_MIN.${hall} 回退`).toBeGreaterThanOrEqual(min);
    }
  });
});
