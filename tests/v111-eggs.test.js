import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// ============================================================
// v1.11 门禁 57：多厅捏他彩蛋（≥7）+ 新音色（≥3）源码级审计。
// 口径：
//   · 每件彩蛋的核心机制字段在源（防后续改动无声拆掉）
//   · 「空间自答」的几件必须**零字幕**（橡皮头两件 / 小门 / 过影 /
//     灯牌接骨）——克制是设计的一部分，也钉进门禁
//   · 带字幕的几件 ≤22 字
//   · 新音色 wetstir / reversecup / deepdrip 在引擎且被接线
// ============================================================

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const SRC = {
  lobby: read('halls/lobby.js'),
  archive: read('halls/archive.js'),
  eraserhead: read('halls/eraserhead.js'),
  bluevelvet: read('halls/bluevelvet.js'),
  twinpeaks: read('halls/twinpeaks.js'),
  studio: read('halls/studio.js'),
  engine: read('audio/engine.js')
};

/** 取热点 onActivate 块（从 hotspots.add 锚点起到配平大括号近似段），
 *  用于断言「该热点不出字幕」。锚点取 hint 字面量。 */
const hotspotBlock = (src, hintLiteral) => {
  const at = src.indexOf(hintLiteral);
  expect(at, `hint 未找到: ${hintLiteral}`).toBeGreaterThan(-1);
  return src.slice(at, at + 900);
};

describe('v1.11 门禁 57：七件彩蛋核心机制在源', () => {
  it('eraserhead 缠布之物：呼吸搏动 + E 屏息 + wetstir + 怠速翻身', () => {
    expect(SRC.eraserhead).toContain('bundleState');
    expect(SRC.eraserhead).toContain("'wetstir'");
  });

  it('eraserhead 焦黑坑洼球：裂纹 emissive + om 低鸣 + 常态自转', () => {
    expect(SRC.eraserhead).toContain('orbState');
    expect(SRC.eraserhead).toContain("'om'");
  });

  it('bluevelvet 耳形凹痕首饰盒：负空间衬垫 + 合盖弹缝 + 慢爬回', () => {
    expect(SRC.bluevelvet).toContain('earTex');
    expect(SRC.bluevelvet).toContain('jbState');
    expect(SRC.bluevelvet).toContain("'latchsnap'");
  });

  it('twinpeaks 椅臂凝固咖啡：双材质单 mesh（groups）+ 30° 倾斜 + reversecup', () => {
    expect(SRC.twinpeaks).toContain('mergeGeometries([cupParts, solidCoffee], true)');
    expect(SRC.twinpeaks).toContain('-0.52 * a');
    expect(SRC.twinpeaks).toContain("'reversecup'");
  });

  it('studio 帘后小门：三处预置位掷点 + 把手半圈 + deepdrip 双通道', () => {
    expect(SRC.studio).toMatch(/SPOTS\[Math\.floor\(Math\.random\(\) \* SPOTS\.length\)\]/);
    expect(SRC.studio).toContain('lever.rotation.z = Math.PI * a');
    // E 触发一声 + 怠速 seeded 一声，两处接线
    expect(SRC.studio.match(/sfxAt\('deepdrip'/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('archive 心跳灯牌接骨：整排灯牌材质收档 + lub-dub 与音色 0.42s 对时', () => {
    expect(SRC.archive).toContain('plaqueMats.push(plaque.material)');
    expect(SRC.archive).toContain('hbBump(u, 0.42');
    expect(SRC.archive).toContain("sfxAt('heartbeat'");
  });

  it('lobby 帷幕过影：seeded 90–150s + 人形暗带贴幕 + 绒面脚步跟方位', () => {
    expect(SRC.lobby).toContain('passState');
    expect(SRC.lobby).toContain('90 + passRng() * 60');
    expect(SRC.lobby).toContain("sfxAt('step-carpet'");
  });
});

describe('v1.11 门禁 57：克制口径（空间自答的几件零字幕）', () => {
  it.each([
    ['eraserhead', "hint: 'E — 检修盆里的缠布'"],
    ['eraserhead', "hint: 'E — 搁架上的焦黑球'"],
    ['studio', "hint: 'E — 墙脚的小门'"],
    ['archive', "hint: 'E — 这块灯牌'"]
  ])('%s %s：onActivate 不出字幕', (hall, hint) => {
    expect(hotspotBlock(SRC[hall], hint)).not.toContain('ui.caption');
  });

  it('lobby 过影全程无字幕无热点（撞见才算数）', () => {
    const at = SRC.lobby.indexOf('帷幕后的过影');
    const block = SRC.lobby.slice(at, at + 2600);
    expect(block).not.toContain('ui.caption');
    expect(block).not.toContain('hotspots.add');
  });

  it.each([
    ['twinpeaks', '这一杯不会洒。'],
    ['bluevelvet', '衬垫还记得它的形状。']
  ])('%s 字幕「%s」≤22 字', (hall, cap) => {
    expect(SRC[hall]).toContain(cap);
    expect(cap.length).toBeLessThanOrEqual(22);
  });
});

describe('v1.11 门禁 57：几何与连锁守卫', () => {
  it('lobby 过影走在触不可及的半径（幕内 R-0.5 > 可行走 R-2.4）', () => {
    expect(SRC.lobby).toContain('const PASS_R = R - 0.5');
    expect(SRC.lobby).toContain('circleBounds(R - 2.4)');
  });

  it('lobby 过影 → 窃语连锁：12s 内触发补一口 breath', () => {
    expect(SRC.lobby).toContain('passLink.now - passLink.lastEnd < 12');
    const at = SRC.lobby.indexOf('passLink.now - passLink.lastEnd < 12');
    expect(SRC.lobby.slice(at, at + 220)).toContain("'breath'");
  });

  it('lobby 过影让位开幕点灯（opening 未完不来人）', () => {
    const at = SRC.lobby.indexOf('帷幕后的过影');
    expect(SRC.lobby.slice(at, at + 2600)).toContain('if (opening.t >= 0) return');
  });

  it('archive 灯牌隐藏期挪出射线（y=-60，隐形网格仍会被 raycast）', () => {
    expect(SRC.archive.match(/ghostPlaque\.position\.y = -60|, -60, 8\.2\)/g)?.length)
      .toBeGreaterThanOrEqual(2);
    expect(SRC.archive).toContain('ghostPlaque.position.y = GHOST_Y');
    // 热点守卫：不可见时按 E 无效；搏动进行中不叠拍（余温期可再按）
    expect(SRC.archive).toContain('if (!ghostPlaque.visible || (hbPulse.t >= 0 && hbPulse.t <= 1.05)) return');
  });

  it('studio 小门三处预置位都贴墙脚（z=-9.27 后墙两处 + x=2.73 西墙一处）', () => {
    expect(SRC.studio).toContain('{ x: 3.02, z: -9.27, ry: 0 }');
    expect(SRC.studio).toContain('{ x: 2.73, z: -8.55, ry: Math.PI / 2 }');
    expect(SRC.studio).toContain('{ x: 5.75, z: -9.27, ry: 0 }');
  });

  it('archive 灯牌 P14：齐搏收拍后幽灵灯牌带 26s 余温（它记得被按过）', () => {
    expect(SRC.archive).toContain('const cool = (u - 1.05) / 26');
    expect(SRC.archive).toContain('0.7 * (1.16 - 0.16 * cool)');
    // 年表灯箱不带余温（立刻归位）——只有那块不在年表上的记得
    expect(SRC.archive).toContain('for (const m of plaqueMats) m.emissiveIntensity = 0.5;');
  });

  it('studio 小门 P13：三处预置位地面磨痕合并单 mesh（门会搬家这件事地板自己说）', () => {
    // 磨痕铺满全部预置位（SPOTS.map 合并），不只当前掷中的那处
    expect(SRC.studio).toContain('SPOTS.map((p) => xform(');
    expect(SRC.studio).toContain('三处墙脚都有');
    // 贴地防深度打架口径与 dragMark 同族：微抬 + 不写深度
    expect(/scuffGeo[\s\S]{0,400}depthWrite: false/.test(SRC.studio)).toBe(true);
  });

  it('twinpeaks 凝固咖啡面并进杯体（跟杯走），碟不动', () => {
    // 咖啡面是杯几何的一个 group，不是独立静止 mesh
    expect(SRC.twinpeaks).toContain('solidCoffee');
    expect(SRC.twinpeaks).toContain('cupPivot.add(cup)');
    expect(SRC.twinpeaks).toContain('fcGrp.add(saucer)');
  });
});

describe('v1.11 门禁 57：新音色 ≥3 在引擎且被接线', () => {
  it.each([
    ['wetstir', 'eraserhead'],
    ['reversecup', 'twinpeaks'],
    ['deepdrip', 'studio']
  ])('%s：引擎实现 + %s 接线', (name, hall) => {
    expect(SRC.engine).toContain(`case '${name}'`);
    expect(SRC[hall]).toContain(`'${name}'`);
  });

  it('dreadswell（门禁 55 拐角恐惧拍）也在引擎——本轮新音色共 4 种', () => {
    expect(SRC.engine).toContain("case 'dreadswell'");
  });
});
