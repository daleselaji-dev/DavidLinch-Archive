import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { INTERVIEWS, INTERVIEW_THEMES } from '../src/data/interviews.js';
import { QUOTES, DOCENT } from '../src/data/essays.js';

// ============================================================
// v1.20 门禁 94/95/96：活轴盘点首轮（第 8 轮）
// 口径（对齐 GOAL_HANDOFF 第 8 轮优先项 + STYLE_AUDIT §10 观察点）：
//   · 先盘点再动手——「收官/封口」轴只巡不动（回声窗窗长是终态、
//     GLB 七件六厅是终态、drawerfar 恰三处是终态）；本轮只投两条
//     活轴：studio 程序化精修（台灯 v3 手作）+ 访谈质量维护首轮
//     （替换弱条目而非追加）；
//   · 低密度厅「第三层反应」判死：给既有件叠第三层 ≈「问第三遍」
//     同构模板，红线不开；
//   · 精修纪律：只动做工不动账——零新增交互/字幕/音色/光源，
//     hint 与光路一字不动，mesh 账只减不增；
//   · 音色 98 刹车照旧、INTERACTIVE_MIN 195 逐厅相等。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  props: read('src/halls/props.js'),
  studio: read('src/halls/studio.js'),
  engine: read('src/audio/engine.js'),
  electron: read('electron/main.cjs'),
  main: read('src/main.js'),
  styleAudit: read('STYLE_AUDIT.md')
};

// angleLamp v3 函数区（到下一个导出为止——防止钉到别的道具身上）
const LAMP = SRC.props.slice(
  SRC.props.indexOf('export function angleLamp'),
  SRC.props.indexOf('export function radioCabinet')
);

describe('v1.20 门禁 94：studio 台灯 v3·手作精修（程序化，非 GLB）', () => {
  it('手作四件账在源：车削木底座 / 手弯单管 / 定植锤痕 / 布包余线', () => {
    expect(LAMP, '木底座应走 woodMat（v2 珐琅金属座退役）').toContain('woodMat');
    expect(LAMP, '手弯杆应是 CatmullRom 单管').toContain('CatmullRomCurve3');
    expect(LAMP, '锤痕应有定植扰动（atan2 角频率）').toContain('Math.atan2(z, x)');
    expect(LAMP, '布包电线余线在账').toContain('布包电线');
  });

  it('v2 工厂件退役不回流：拉簧类与 clearcoat 清漆都不许再出现（哑光是手刷漆的诚实）', () => {
    expect(LAMP).not.toContain('class Spring');
    expect(LAMP).not.toContain('clearcoat');
  });

  it('光路原封：恰一盏 PointLight 且 3.4/5.5/1.8 三值不动（D-11 克制账不回退）', () => {
    expect((LAMP.match(/new THREE\.PointLight/g) || []).length).toBe(1);
    expect(LAMP).toContain("new THREE.PointLight(0xffd9a0, 3.4, 5.5, 1.8)");
  });

  it('userData 接线契约不破（studio 热点/光路挂点一字不动）', () => {
    for (const key of ['userData.light', 'userData.bulbMat', 'userData.shade']) {
      expect(LAMP).toContain(key);
    }
  });

  it('精修不配新声不配新词：函数区零 setTimeout / 零 sfx / 零 caption', () => {
    expect(LAMP).not.toContain('setTimeout');
    expect(LAMP).not.toContain('sfx');
    expect(LAMP).not.toContain('caption');
  });

  it('studio 接线不动：hint / 两句字幕 / 摆位原样（世界不宣布自己被精修过）', () => {
    expect(SRC.studio).toContain("hint: 'E — 台灯（他的绿罩台灯）'");
    expect(SRC.studio).toContain("ui.caption(lampState.on ? '台灯亮了。' : '台灯灭了。', 2400)");
    expect(SRC.studio).toContain('lamp.position.set(-6.55, 0.905, -2.35)');
  });

  it('studio 零 GLB 导入红线复钉（精修必须是程序化的——这间屋不进口）', () => {
    expect(SRC.studio).not.toContain('.glb?inline');
  });

  it('锤痕接缝安全：扰动只用整数角频率（lathe 接缝重复顶点同凹深，不裂缝）', () => {
    // a * 7 / a * 3 / a * 11 —— 2π 跳变下 sin(n·a) 连续的充分条件是 n ∈ ℤ
    expect(LAMP).toContain('a * 7');
    expect(LAMP).toContain('a * 3');
    expect(LAMP).toContain('a * 11');
  });
});

describe('v1.20 门禁 95：访谈质量维护首轮（替换弱条目而非追加）', () => {
  it('条数恰 38 持平（封顶 40 语义下的「替换不追加」——涨一条都算破口径）', () => {
    expect(INTERVIEWS.length).toBe(38);
  });

  it('四主题 10/10/9/9 逐格持平（同主题内替换，分布一格不动）', () => {
    const dist = INTERVIEW_THEMES.map(
      (t) => INTERVIEWS.filter((v) => v.theme === t).length);
    expect(dist).toEqual([10, 10, 9, 9]);
  });

  it('弱条目退役：absurdity（与立牌 sense 领地重叠）全库不回流', () => {
    expect(INTERVIEWS.find((v) => v.id === 'absurdity')).toBeUndefined();
    expect(INTERVIEWS.some((v) => v.en.includes('absurdity all around'))).toBe(false);
  });

  it('换入条目在册：detectives（心境）——原句、译文、出处类型齐备', () => {
    const d = INTERVIEWS.find((v) => v.id === 'detectives');
    expect(d).toBeTruthy();
    expect(d.theme).toBe('心境');
    expect(d.en).toContain('detectives in life');
    expect(d.en.length).toBeLessThanOrEqual(200);
    expect(d.zh.length).toBeLessThanOrEqual(120);
    expect(d.source).toBe('公开访谈');
  });

  it('防撞：detective 语料在 QUOTES/DOCENT 零出现（五轮防撞口径照旧）', () => {
    for (const q of QUOTES) expect(q.en.toLowerCase()).not.toContain('detective');
    for (const note of Object.values(DOCENT)) expect(note).not.toContain('侦探');
  });
});

describe('v1.20 门禁 96：活轴盘点入册 + 纪律复钉', () => {
  it('活轴盘点账入册：STYLE_AUDIT §11 存在且判定四轴（两投两不投）', () => {
    expect(SRC.styleAudit).toContain('## 11.');
    expect(SRC.styleAudit).toContain('活轴盘点');
    // 判死记录必须留痕：第三层反应 ≈ 问第三遍同构
    expect(SRC.styleAudit).toContain('第三层');
  });

  it('零新增交互：INTERACTIVE_MIN 阈值表与 v1.19 逐厅相等（195 普查口径不动）', () => {
    expect(SRC.electron).toContain(
      'lobby: 21, archive: 36, eraserhead: 29, bluevelvet: 23');
    expect(SRC.electron).toContain(
      'twinpeaks: 26, mulholland: 24, studio: 29');
  });

  it('音色 98 刹车照旧：合成器 case 恰 98 种（精修复用旧账，零新嗓子）', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
  });

  it('版本口径一致：package.json 与 __SV__.version 都是 1.20.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('1.20.0');
    expect(SRC.main).toContain("version: '1.20.0'");
  });
});
