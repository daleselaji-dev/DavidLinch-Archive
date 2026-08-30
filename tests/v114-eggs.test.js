import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// ============================================================
// v1.14 门禁 69：彩蛋第二批（七厅又各 +1）——STYLE_AUDIT 纪律升级版
// 口径（对齐 STYLE_AUDIT「下一轮观察点」）：
//   · 字幕总量冻结：七件**全部零字幕**（onActivate 邻域无 ui.caption）
//   · 错拍成为默认：每件至少一个通道不与按键同拍（setTimeout/later/
//     游戏时钟 wait 延迟 ≥0.8s）
//   · 世界记得你：永久态 ≤1 件/厅（rolled/asked/left/stood/torn 锁存，
//     不复位）；archive 反向一件——推严的抽屉 2.6s 后自己滑开，
//     这件事你永远改变不了
//   · 光的礼貌：全批零新增光源（studio 暗拍走既有顶灯乘法）
//   · 新音色 papertear / clapslap 在引擎且被接线
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
const hotspotBlock = (src, hintLiteral, span = 1000) => {
  const at = src.indexOf(hintLiteral);
  expect(at, `hint 未找到: ${hintLiteral}`).toBeGreaterThan(-1);
  return src.slice(at, at + span);
};

// [厅, hint, 机制状态字段, 即时音色, 错拍音色]
const EGGS = [
  ['lobby', "hint: 'E — 中缝里的钢笔'", 'penState', "'porcelain'", "'page'"],
  ['archive', "hint: 'E — 没关严的抽屉'", 'ajarState', "'page'", "'drawerfar'"],
  ['eraserhead', "hint: 'E — 检修口盖板'", 'panelState', "'clank'", "'pipeknock'"],
  ['bluevelvet', "hint: 'E — 吧台上的火柴盒'", 'matchState', "'strike'", "'breath'"],
  ['twinpeaks', "hint: 'E — 手板上的硬币'", 'coinState', "'coin'", "'woodknock'"],
  ['mulholland', "hint: 'E — 翘起的海报角'", 'flapState', "'papertear'", "'flutter'"],
  ['studio', "hint: 'E — 一块场记板'", 'slateState', "'clapslap'", 'slateState.dip']
];

describe('v1.14 门禁 69：七件彩蛋核心机制在源', () => {
  it.each(EGGS)('%s %s：状态字段 + 双通道（即时 + 错拍）接线', (hall, hint, state, sfxNow, sfxLate) => {
    expect(SRC[hall]).toContain(state);
    const block = hotspotBlock(SRC[hall], hint);
    expect(block, `${hall} 彩蛋缺状态通道`).toContain(state);
    // 即时/错拍通道可能在 onActivate 或其驱动的 updater 邻域——全文兜底
    expect(SRC[hall], `${hall} 彩蛋缺即时声通道`).toContain(sfxNow);
    expect(SRC[hall], `${hall} 彩蛋缺错拍通道`).toContain(sfxLate);
  });

  it.each(EGGS)('%s 零字幕（onActivate 全块无 ui.caption——字幕总量冻结）', (hall, hint) => {
    // 精确截到 hotspots.add 的收口 `\n  });`——不吃进邻近交互的字幕
    const at = SRC[hall].indexOf(hint);
    expect(at, `hint 未找到: ${hint}`).toBeGreaterThan(-1);
    const end = SRC[hall].indexOf('\n  });', at);
    expect(end).toBeGreaterThan(at);
    const block = SRC[hall].slice(at, end);
    expect(block, `${hall} 彩蛋二批不许带字幕`).not.toContain('ui.caption');
  });
});

describe('v1.14 门禁 69：错拍与永久态纪律', () => {
  it('lobby 钢笔：滚到唇边磕一声，1.7s 后名册那边一声翻页；rolled 永久不回中缝', () => {
    expect(SRC.lobby).toContain('penState.rolled = true');
    expect(SRC.lobby).toMatch(/setTimeout\(\(\) => audio\.sfxAt\('page'[^)]*\), 1700\)/);
    // 已滚过：只剩一磕，不再有下文
    const block = hotspotBlock(SRC.lobby, "hint: 'E — 中缝里的钢笔'");
    expect(block).toContain("sfxAt('porcelain', -5.3, 9.18, 0.16");
  });

  it('archive 抽屉：推严 2.6s 后自己滑开（游戏时钟 cool），这件事永远改变不了', () => {
    expect(SRC.archive).toContain('ajarState.cool = 2.6');
    expect(SRC.archive).toContain('ajarState.target = 1; // 它自己滑开');
    // 柜体格位留空由活动面板接管（cardCatalog skip 参数）
    expect(SRC.archive).toContain("skip: cabIdx === 1 ? ['1,2'] : []");
    expect(read('halls/props.js')).toContain('skipSet');
  });

  it('eraserhead 盖板：回敲 3.5s 迟到且一次比一次少（0.9→0.55→0.3），第四次起永久沉默', () => {
    expect(SRC.eraserhead).toContain('panelState.wait = 3.5');
    expect(SRC.eraserhead).toContain('[0, 0.9, 0.55, 0.3][panelState.asked]');
    expect(SRC.eraserhead).toContain('panelState.asked < 4');
  });

  it('bluevelvet 火柴：三根用一根少一根（left 永久递减），空盒只剩木哐；火苗零新光源', () => {
    expect(SRC.bluevelvet).toContain('matchState.left -= 1');
    expect(SRC.bluevelvet).toContain("sfxAt('woodknock'");
    const at = SRC.bluevelvet.indexOf('const matchbox');
    const seg = SRC.bluevelvet.slice(at, at + 2600);
    expect(seg, '火苗只许自发光，不许加光源').not.toContain('PointLight');
    expect(seg).toContain('emissiveIntensity = 2.2');
  });

  it('twinpeaks 硬币：落定是立着的（rotation π/2 + 半径抬高）且 stood 永久锁存', () => {
    expect(SRC.twinpeaks).toContain('coinState.stood = true');
    expect(SRC.twinpeaks).toContain('railCoin.rotation.set(Math.PI / 2, 0, 0.35)');
    expect(SRC.twinpeaks).toContain('railCoin.position.y = 1.2035');
  });

  it('mulholland 海报角：撕落墙脚永久躺平（torn 锁存 + 落定位姿），底下露更早一层', () => {
    expect(SRC.mulholland).toContain('flapState.torn = true');
    expect(SRC.mulholland).toContain('flapPivot.position.set(11.32, 0.022, -17.22)');
    expect(SRC.mulholland).toContain('更早一层');
  });

  it('studio 场记板：合拍即时、顶灯 1.2s 后暗一拍再回来（乘法叠在开关档位之上）', () => {
    expect(SRC.studio).toContain("later(() => { slateState.dip = 0.9; }, 1500)");
    expect(SRC.studio).toContain('slateState.dip / 0.9');
    // 暗拍乘在既有顶灯上（零新增光源）
    expect(SRC.studio).toContain('7 * ceilState.on * k');
  });
});

describe('v1.14 门禁 69：新音色 + 交互密度阈值', () => {
  it.each(['papertear', 'clapslap'])('新音色 %s 在引擎', (name) => {
    expect(SRC.engine).toContain(`case '${name}'`);
  });

  it('papertear：纤维嘶裂由高滑低（3200→900 扫频）+ 断裂颗粒串', () => {
    const at = SRC.engine.indexOf("case 'papertear'");
    const seg = SRC.engine.slice(at, at + 700);
    expect(seg).toContain('exponentialRampToValueAtTime(900');
    expect(seg).toContain('4400 - i * 420');
  });

  it('clapslap：宽带瞬态 + 90ms 迟到的棚壁回弹（房间在答应）', () => {
    const at = SRC.engine.indexOf("case 'clapslap'");
    const seg = SRC.engine.slice(at, at + 700);
    expect(seg).toContain("noise('white', 0.03, 'highpass', 2400");
    expect(seg).toContain('0.09, 0.01');
  });

  it('INTERACTIVE_MIN 七厅全部上调（v1.14 普查 -1 口径）', () => {
    const cjs = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    const at = cjs.indexOf('const INTERACTIVE_MIN');
    const seg = cjs.slice(at, at + 260);
    const mins = {
      lobby: 19, archive: 33, eraserhead: 26, bluevelvet: 21,
      twinpeaks: 24, mulholland: 22, studio: 27
    };
    for (const [hall, min] of Object.entries(mins)) {
      const m = new RegExp(`${hall}:\\s*(\\d+)`).exec(seg);
      expect(m, `INTERACTIVE_MIN 缺 ${hall}`).toBeTruthy();
      expect(Number(m[1]), `INTERACTIVE_MIN.${hall} 回退`).toBeGreaterThanOrEqual(min);
    }
  });
});
