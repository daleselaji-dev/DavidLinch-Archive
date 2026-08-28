import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

// ============================================================
// v1.16 门禁 76/77/78：调速器落厅 + 冒烟盲区补漏 + 彩蛋第四批换轴
// 口径（对齐 GOAL_HANDOFF 第 4 轮优先项）：
//   · 换轴：远声应答（REPLY_DYAD 谱系）密度已到上限——本批七件
//     全部换到三条新轴：光的应答（ANSWER_BREATH 共享包络）/
//     温度（冷高薄、暖低软，音色不入 REPLY_DYAD）/ 时间错位
//     （应答原样迟到，走游戏时钟 dt 倒计时）
//   · 贴顶厅纪律：twinpeaks / mulholland（244/250）零新增网格——
//     热点落在既有网格上（保温座 potBase / 路灯杆 userData.pole）
//   · 零字幕（onActivate 邻域无 ui.caption）、零新增光源、
//     可重复无锁存（wait/duck/breath/t 全自复位）
//   · GLB 第三批只许落 era / bv / archive / studio（贴顶厅禁入）
//   · 冒烟盲区补漏：交互审计从此验场景归属（parent 链上溯 scene，
//     防 v1.15 studio 工作桌式「幽灵交互」二次发生）
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  lobby: read('src/halls/lobby.js'),
  archive: read('src/halls/archive.js'),
  eraserhead: read('src/halls/eraserhead.js'),
  bluevelvet: read('src/halls/bluevelvet.js'),
  twinpeaks: read('src/halls/twinpeaks.js'),
  mulholland: read('src/halls/mulholland.js'),
  studio: read('src/halls/studio.js'),
  engine: read('src/audio/engine.js'),
  kit: read('src/halls/kit.js'),
  main: read('src/main.js'),
  cjs: read('electron/main.cjs')
};

describe('v1.16 门禁 76/77a：蒸汽调速器 GLB 落橡皮头厅（Blender 管线第 5 件）', () => {
  it('GLB 在库且守体积纪律（≤300KB）', () => {
    const size = statSync(new URL('../src/assets/steam_governor.glb', import.meta.url)).size;
    expect(size).toBeLessThanOrEqual(300 * 1024);
  });

  it('落厅方位守 GOAL_HANDOFF 红线：第三批只落 era（贴顶厅 twinpeaks/mulholland 禁入）', () => {
    expect(SRC.eraserhead).toContain("from '../assets/steam_governor.glb?inline'");
    for (const hall of ['twinpeaks', 'mulholland']) {
      expect(SRC[hall], `${hall} 已贴顶（244/250），本批禁落 GLB`)
        .not.toContain('steam_governor.glb');
    }
  });

  it('ready 承诺 + glb-landed 信号 + 装载闭环（厅等调速器就位）', () => {
    expect(SRC.eraserhead).toContain('const governorReady = new Promise');
    expect(SRC.eraserhead).toContain('glb-landed eraserhead governor');
    expect(SRC.eraserhead).toContain('ready: governorReady');
  });

  it('程序化动画直驱：GLB 与兜底共用 rigGovernor 装配 + machineState.run 转速联动', () => {
    expect(SRC.eraserhead).toContain('const rigGovernor = (spinPivot, armPivots, sleeve, sleeveY, lever)');
    // 两条路径（GLB 成功 / 程序化兜底）各调一次同一套装配口径
    expect((SRC.eraserhead.match(/rigGovernor\(/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(SRC.eraserhead).toContain('govAnim.update(govState.angle, govState.omega)');
    expect(SRC.eraserhead).toContain('const target = machineState.run * (1 + govState.boost * 1.1)');
  });

  it('调速器交互：同步代理热区（不等 GLB）+ 超速一拍 + 大机器冲一拍回敬', () => {
    expect(SRC.eraserhead).toContain("hint: 'E — 蒸汽调速器'");
    expect(SRC.eraserhead).toContain("sfxAt('govwhirr'");
    expect(SRC.eraserhead).toContain('govState.surge = 0.9');
    expect(SRC.eraserhead).toContain('machineState.run = 1.55');
  });
});

describe('v1.16 门禁 77b：冒烟盲区补漏——热点场景归属普查', () => {
  it('main.js 提供 auditHotspots：parent 链上溯必须到 engine.scene', () => {
    expect(SRC.main).toContain('auditHotspots: () =>');
    expect(SRC.main).toContain('while (node.parent) node = node.parent;');
    expect(SRC.main).toContain('if (node !== engine.scene)');
  });

  it('electron 冒烟接线：七厅逐厅普查，见孤儿热点即整场失败', () => {
    expect(SRC.cjs).toContain("'JSON.stringify(window.__SV__.auditHotspots())'");
    expect(SRC.cjs).toContain('幽灵交互');
    expect(SRC.cjs).toContain('Promise.all([interactiveCheck, orphanCheck])');
    // 失败路径必须硬退出（不是仅告警）
    const at = SRC.cjs.indexOf('const orphanCheck');
    const seg = SRC.cjs.slice(at, SRC.cjs.indexOf('hallChecks', at));
    expect((seg.match(/app\.exit\(1\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('制度化的教训在注释里留了名（v1.15 studio 工作桌事故）', () => {
    expect(SRC.cjs).toContain('studio 工作桌');
  });
});

// [厅, hint, 状态字段, 轴, 即时音色, 游戏时钟错拍行（null = 即时轴内自答）]
const EGGS = [
  ['lobby', "hint: 'E — 烛剪'", 'snuffState', '光的应答', "'brasstap'", 'snuffState.wait = 1.5'],
  ['eraserhead', "hint: 'E — 结霜的支管'", 'frostState', '温度', "'coldhiss'", 'frostState.wait = 1.7'],
  ['bluevelvet', "hint: 'E — 空话筒'", 'micState', '光的应答', "'micthump'", 'micState.wait = 1.5'],
  ['archive', "hint: 'E — 上弦钥匙'", 'windState', '时间错位', "'clocktick'", null],
  ['twinpeaks', "hint: 'E — 保温座'", 'warmState', '温度', "'warmhum'", 'warmState.wait = 1.3'],
  ['mulholland', "hint: 'E — 路灯铁杆'", 'poleEcho', '时间错位', "'poletap'", 'poleEcho.wait = 2.4'],
  ['studio', "hint: 'E — 白瓷小碟'", 'chinaState', '温度', "'chinatick'", null]
];

describe('v1.16 门禁 78：彩蛋第四批换轴（七件在源）', () => {
  it.each(EGGS)('%s %s：状态字段 + 专属音色 + 错拍走游戏时钟', (hall, hint, state, axis, sfx, waitLine) => {
    expect(SRC[hall]).toContain(hint);
    expect(SRC[hall]).toContain(`const ${state}`);
    expect(SRC[hall], `${hall} 缺音色 ${sfx}`).toContain(sfx);
    if (waitLine) expect(SRC[hall], `${hall} 错拍须走游戏时钟`).toContain(waitLine);
  });

  it.each(EGGS)('%s 零字幕（onActivate 全块无 ui.caption）', (hall, hint) => {
    const at = SRC[hall].indexOf(hint);
    expect(at, `hint 未找到: ${hint}`).toBeGreaterThan(-1);
    const end = SRC[hall].indexOf('\n  });', at);
    expect(end).toBeGreaterThan(at);
    expect(SRC[hall].slice(at, end), `${hall} 彩蛋四批不许带字幕`).not.toContain('ui.caption');
  });

  it.each(EGGS)('%s 无永久态锁存（wait/duck/breath/t 全自复位）', (hall, hint, state) => {
    const at = SRC[hall].indexOf(`const ${state}`);
    expect(at).toBeGreaterThan(-1);
    expect(SRC[hall].slice(at, at + 2400), `${hall} 彩蛋四批不许加永久态`)
      .not.toMatch(/State\.\w+ = true/);
  });

  it('全批零新增光源（v1.16 彩蛋四批标记段落无 PointLight/SpotLight）', () => {
    for (const hall of Object.keys(SRC)) {
      let from = 0;
      while ((from = SRC[hall].indexOf('v1.16 彩蛋四批', from + 1)) > -1) {
        const seg = SRC[hall].slice(from, from + 3200);
        expect(seg, `${hall} 彩蛋四批不许加光源`).not.toMatch(/new THREE\.(Point|Spot)Light/);
      }
    }
  });

  it('贴顶厅零新增网格：twinpeaks/mulholland 彩蛋段落无 new THREE.Mesh、热点落既有网格', () => {
    const hints = { twinpeaks: "hint: 'E — 保温座'", mulholland: "hint: 'E — 路灯铁杆'" };
    for (const hall of ['twinpeaks', 'mulholland']) {
      const at = SRC[hall].indexOf('v1.16 彩蛋四批');
      expect(at, `${hall} 缺彩蛋标记`).toBeGreaterThan(-1);
      // 段落 = 标记注释 → 热点登记块结束（不吃到后续无关代码）
      const end = SRC[hall].indexOf('\n  });', SRC[hall].indexOf(hints[hall], at));
      expect(end).toBeGreaterThan(at);
      const seg = SRC[hall].slice(at, end);
      expect(seg, `${hall} 已贴顶（244/250）——彩蛋禁加网格`).not.toContain('new THREE.Mesh');
      expect(seg, `${hall} 彩蛋禁加合并网格`).not.toMatch(/mergedMesh\(/);
    }
    expect(SRC.twinpeaks).toContain('hotspots.add(potBase');
    expect(SRC.mulholland).toContain('hotspots.add(poleHit');
    expect(SRC.mulholland).toContain('poleHit = lamp.userData.pole');
  });

  it('光的应答共享包络：ANSWER_BREATH 由 kit 导出，lobby/bv 两件都走它', () => {
    expect(SRC.kit).toMatch(/export const ANSWER_BREATH/);
    expect(SRC.lobby).toContain('ANSWER_BREATH(1 - snuffState.duck)');
    expect(SRC.bluevelvet).toContain('ANSWER_BREATH(1 - micState.breath)');
  });

  it('时间错位轴：archive 三格渐迟（TICK_AT 单调递增）+ studio 三嗒渐疏（CHINA_AT）', () => {
    const tick = /const TICK_AT = \[([\d., ]+)\]/.exec(SRC.archive);
    expect(tick).toBeTruthy();
    const ts = tick[1].split(',').map(Number);
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i] - ts[i - 1], '擒纵间隔必须一格比一格迟').toBeGreaterThan(ts[i - 1] - (ts[i - 2] ?? 0));
    }
    expect(SRC.studio).toMatch(/const CHINA_AT = \[/);
  });

  it('远声密度纪律：mull 迟到应答只走光通道（彩蛋段落仅 1 次 sfxAt，无远场重放）', () => {
    const at = SRC.mulholland.indexOf('v1.16 彩蛋四批');
    const end = SRC.mulholland.indexOf('\n  });', SRC.mulholland.indexOf("hint: 'E — 路灯铁杆'"));
    const seg = SRC.mulholland.slice(at, end);
    expect((seg.match(/sfxAt\(/g) || []).length).toBe(1);
    expect(seg).not.toContain('replyhum');
    expect(seg).not.toContain('replytap');
  });
});

describe('v1.16 音色第九批：换轴谱系（九件新音色，不入 REPLY_DYAD）', () => {
  it.each([
    'govwhirr', 'brasstap', 'clocktick', 'micthump', 'coldhiss',
    'icecrack', 'warmhum', 'chinatick', 'poletap'
  ])('新音色 %s 在引擎', (name) => {
    expect(SRC.engine).toContain(`case '${name}'`);
  });

  it('换轴成立：九件全部不取用 REPLY_DYAD（远声谱系密度不再加）', () => {
    for (const name of ['govwhirr', 'brasstap', 'clocktick', 'micthump', 'coldhiss',
      'icecrack', 'warmhum', 'chinatick', 'poletap']) {
      const at = SRC.engine.indexOf(`case '${name}'`);
      const end = SRC.engine.indexOf('break;', at);
      expect(SRC.engine.slice(at, end), `${name} 不得引用 REPLY_DYAD`).not.toMatch(/REPLY_DYAD\[/);
    }
  });

  it('温度轴对照成立：冷高薄（coldhiss 高通/高频）、暖低软（warmhum 低通/低频）', () => {
    const cold = SRC.engine.slice(SRC.engine.indexOf("case 'coldhiss'"), SRC.engine.indexOf('break;', SRC.engine.indexOf("case 'coldhiss'")));
    const warm = SRC.engine.slice(SRC.engine.indexOf("case 'warmhum'"), SRC.engine.indexOf('break;', SRC.engine.indexOf("case 'warmhum'")));
    expect(cold).toMatch(/highpass|bandpass/);
    expect(warm).toContain('lowpass');
  });
});

describe('v1.16 阈值重锁 + 版本', () => {
  it('INTERACTIVE_MIN 七厅全部上调（v1.16 普查 194、阈值 = 普查 -1：21/35/29/23/26/24/29）', () => {
    const at = SRC.cjs.indexOf('const INTERACTIVE_MIN');
    const seg = SRC.cjs.slice(at, at + 260);
    const mins = {
      lobby: 21, archive: 35, eraserhead: 29, bluevelvet: 23,
      twinpeaks: 26, mulholland: 24, studio: 29
    };
    for (const [hall, min] of Object.entries(mins)) {
      const m = new RegExp(`${hall}:\\s*(\\d+)`).exec(seg);
      expect(m, `INTERACTIVE_MIN 缺 ${hall}`).toBeTruthy();
      expect(Number(m[1]), `INTERACTIVE_MIN.${hall} 回退`).toBeGreaterThanOrEqual(min);
    }
  });

  // 版本钉死断言随轮转移交：v1.17 起由 v117-eggs.test.js 持有
});
