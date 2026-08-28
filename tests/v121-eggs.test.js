import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { INTERVIEWS, INTERVIEW_THEMES } from '../src/data/interviews.js';
import { QUOTES, DOCENT } from '../src/data/essays.js';

// ============================================================
// v1.21 门禁 97/98/99：维护收官轮（第 9 轮）
// 口径（对齐 GOAL_HANDOFF 第 9 轮优先项 + STYLE_AUDIT §11 观察点）：
//   · 盘点增量化——只盘状态变了的轴，没变的引用 §11（本轮状态变
//     了的恰两条：studio 精修轴问诊三件老抛光件 → 只有转盘挂账、
//     修完转维护；访谈轴第二次换血 → 机制成熟转维护）；
//   · 精修「先问哪件看着假」：磁带机（v1.9+v1.12 两轮抛光）与
//     收音机 v2 问诊零病灶不动手——只修转盘（唱臂悬空/无唱针/
//     无主轴/无歇臂柱四处互相拆台的实病灶）；
//   · 修法是工厂做工——手作语言（弯点出平面/锤痕/歪旋钮）是
//     台灯的专利，不扩散到唱机；
//   · 换血止损线 ≤2：本轮只换一条（negativity → setup）即收手；
//   · 封口轴五条零触碰、音色 98 刹车、INTERACTIVE_MIN 195 逐厅
//     相等、gen_*.py 恰七件照旧。
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

// turntable 函数区（到下一个导出为止——防止钉到别的道具身上）
const TT = SRC.props.slice(
  SRC.props.indexOf('export function turntable'),
  SRC.props.indexOf('export function typewriter')
);

describe('v1.21 门禁 97：转盘病灶修（问诊三件只修一件——工厂做工，非手作）', () => {
  it('病灶三件账在源：主轴 / 歇臂柱 / 针杆（字幕「针尖落进沟槽」第一次有针尖）', () => {
    expect(TT, '转盘中心应补主轴').toContain('主轴');
    expect(TT, '静止臂应有歇处').toContain('歇臂柱');
    expect(TT, '唱头下应有针杆').toContain('针杆');
    // 针尖锥体在源（锥尖朝下的小锥台）
    expect(TT).toContain('new THREE.CylinderGeometry(0.0006, 0.0022, 0.005, 6)');
  });

  it('唱臂重指向：静止落歇臂柱（唱片外）、播放摆入沟槽带（-0.5 rad 接线复用）', () => {
    // 歇臂柱托槽坐标与臂管静止落点对齐（0.163, 0.069）
    expect(TT).toContain('0.163, 0.107, 0.069');
    // 唱头壳沿 +z 出臂（旧账 -x 指向标签正上方的悬空姿态退役）
    expect(TT).toContain('-0.019, -0.021, 0.216');
    expect(TT, '旧悬空唱头位不回流').not.toContain('headShell.position.set(-0.2, 0, 0.12)');
  });

  it('userData 接线契约不破：record / arm / platter 三挂点原名原样', () => {
    for (const key of ['userData.record', 'userData.arm', 'userData.platter']) {
      expect(TT).toContain(key);
    }
  });

  it('网格账 7→6：同材质静件合并（mergedMesh 恰 4 件、显式 Mesh 恰 1 件黑胶、底座 1 件——合计 6）', () => {
    expect((TT.match(/mergedMesh\(/g) || []).length).toBe(4);
    expect((TT.match(/new THREE\.Mesh\(/g) || []).length).toBe(1);
    expect((TT.match(/roundedBoxMesh\(/g) || []).length).toBe(1);
  });

  it('精修不配新声不配新词不配新光：函数区零 setTimeout / 零 sfx / 零 caption / 零光源', () => {
    expect(TT).not.toContain('setTimeout');
    expect(TT).not.toContain('sfx');
    expect(TT).not.toContain('caption');
    expect(TT).not.toContain('PointLight');
  });

  it('手作语言不扩散（工厂件像工厂件）：唱机函数区零手弯/零锤痕语汇', () => {
    expect(TT).not.toContain('CatmullRomCurve3');
    expect(TT).not.toContain('锤痕');
    expect(TT).not.toContain('手弯');
  });

  it('studio 接线一字不动：hint / 字幕 / 摆位 / 摆臂线（世界不宣布自己被精修过）', () => {
    expect(SRC.studio).toContain("hint: 'E — 放一张唱片'");
    expect(SRC.studio).toContain("ui.caption('针尖落进沟槽。', 3000)");
    expect(SRC.studio).toContain('tt.position.set(2.8, 0.55, 6.05)');
    expect(SRC.studio).toContain('ttState.armIn * -0.5');
  });

  it('问诊不动手的两件零改动：磁带机走带路径与收音机搜台针原样在岗', () => {
    // 磁带机（v1.12 D-6 抛光账）：走带三段 + 压带轮
    expect(SRC.studio).toContain('mkStrand(-0.19, 0.129, 0.19, 0.129)');
    // 收音机 v2：搜台指针振幅原值
    expect(SRC.studio).toContain('0.14 + Math.sin(t * 0.7) * 0.07');
  });
});

describe('v1.21 门禁 98：访谈质量维护第二轮（止损线 ≤2 内只换一条）', () => {
  it('条数不超封顶 40（v1.22 改钉：38 → 40 封顶收官，替换纪律由退役条守卫）', () => {
    expect(INTERVIEWS.length).toBeGreaterThanOrEqual(38);
    expect(INTERVIEWS.length).toBeLessThanOrEqual(40);
  });

  it('四主题分布均衡（v1.22 改钉：10/10/9/9 → 每主题 9..10，封顶终态由 v122 门禁钉死）', () => {
    const dist = INTERVIEW_THEMES.map(
      (t) => INTERVIEWS.filter((v) => v.theme === t).length);
    for (const n of dist) {
      expect(n).toBeGreaterThanOrEqual(9);
      expect(n).toBeLessThanOrEqual(10);
    }
  });

  it('弱条目退役：negativity（与 poison 领地重叠、五词口号语义最薄）全库不回流', () => {
    expect(INTERVIEWS.find((v) => v.id === 'negativity')).toBeUndefined();
    expect(INTERVIEWS.some((v) => v.en.includes('Negativity is the enemy'))).toBe(false);
    // 留任的那条更具体的同领地条目还在
    expect(INTERVIEWS.find((v) => v.id === 'poison')).toBeTruthy();
  });

  it('换入条目在册：setup（心境）——原句、译文、出处类型齐备', () => {
    const s = INTERVIEWS.find((v) => v.id === 'setup');
    expect(s).toBeTruthy();
    expect(s.theme).toBe('心境');
    expect(s.en).toContain('have a setup');
    expect(s.en.length).toBeLessThanOrEqual(200);
    expect(s.zh.length).toBeLessThanOrEqual(120);
    expect(s.source).toContain('著作');
  });

  it('防撞：setup 语料在 QUOTES/DOCENT 零出现（六轮防撞口径照旧）', () => {
    for (const q of QUOTES) expect(q.en.toLowerCase()).not.toContain('setup');
    for (const note of Object.values(DOCENT)) expect(note).not.toContain('现成的家伙');
  });

  it('止损线留痕：退役理由账在数据源注释（每轮 ≤2 条纪律入册）', () => {
    const src = read('src/data/interviews.js');
    expect(src).toContain('质量维护第二轮');
    expect(src).toContain('poison');
    expect(src).toContain('领地重叠');
  });
});

describe('v1.21 门禁 99：维护纪律复钉 + 盘点增量账 + 版本', () => {
  it('盘点增量化入册：STYLE_AUDIT §12 只盘状态变了的轴（其余引用 §11）', () => {
    expect(SRC.styleAudit).toContain('## 12.');
    expect(SRC.styleAudit).toContain('§11');
    // 问诊账留痕：三件只修一件
    expect(SRC.styleAudit).toContain('哪件看着假');
  });

  it('零新增交互：INTERACTIVE_MIN 阈值表与 v1.20 逐厅相等（195 普查口径不动）', () => {
    expect(SRC.electron).toContain(
      'lobby: 21, archive: 36, eraserhead: 29, bluevelvet: 23');
    expect(SRC.electron).toContain(
      'twinpeaks: 26, mulholland: 24, studio: 29');
  });

  it('音色 98 刹车照旧：合成器 case 恰 98 种（病灶修零新嗓子）', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
  });

  it('GLB 轴维护红线：gen_*.py 恰七件（不产新资产）', () => {
    const gens = readdirSync(new URL('../scripts/blender', import.meta.url))
      .filter((f) => /^gen_.*\.py$/.test(f));
    expect(gens.length).toBe(7);
  });

  it('studio 零 GLB 导入红线复钉（这间屋的精修永远在这间屋里做）', () => {
    expect(SRC.studio).not.toContain('.glb?inline');
  });

  it('版本口径一致：package.json 与 __SV__.version 同值（精确钉移交 v122-eggs）', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(SRC.main).toContain(`version: '${pkg.version}'`);
  });
});
