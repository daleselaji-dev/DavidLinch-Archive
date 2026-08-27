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
  mulholland: read('halls/mulholland.js'),
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

  it('bluevelvet P20 镜角布光：暖顶光克制钉界（强度 ≤1、半径 ≤2.5m 只罩凳盒）', () => {
    const m = /const jbKey = new THREE\.PointLight\(0xffd9b0, ([\d.]+), ([\d.]+), 2\)/.exec(SRC.bluevelvet);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeLessThanOrEqual(1);
    expect(Number(m[2])).toBeLessThanOrEqual(2.5);
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

  it('twinpeaks 咖啡 P18：每次立回杯放不回原朝向（方位漂移累积，钉界 ±0.35）', () => {
    expect(SRC.twinpeaks).toContain('fcState.yaw + drift');
    expect(SRC.twinpeaks).toContain('Math.max(-0.35, Math.min(0.35,');
    expect(SRC.twinpeaks).toContain('cupPivot.rotation.y = fcState.yaw');
  });
});

describe('v1.11 门禁 57：新音色 ≥3 在引擎且被接线', () => {
  it.each([
    ['wetstir', 'eraserhead'],
    ['reversecup', 'twinpeaks'],
    ['deepdrip', 'studio'],
    ['fencewomp', 'mulholland']
  ])('%s：引擎实现 + %s 接线', (name, hall) => {
    expect(SRC.engine).toContain(`case '${name}'`);
    expect(SRC[hall]).toContain(`'${name}'`);
  });

  it('dreadswell（门禁 55 拐角恐惧拍）也在引擎——本轮新音色共 5 种', () => {
    expect(SRC.engine).toContain("case 'dreadswell'");
  });

  it('fencewomp 稀发层：惊吓进行中让位（scare.sub 守卫）+ 位置沿围栏随机', () => {
    const at = SRC.mulholland.indexOf("audio.sfxAt('fencewomp'");
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.mulholland.slice(Math.max(0, at - 400), at + 120);
    expect(seg).toContain('if (scare.sub !== null) return');
    expect(seg).toContain('11.55, -8 - fenceRng() * 18');
  });
});

describe('v1.12 门禁 61 追加：门虚空纵深 + 门后剪影（一次性，零字幕）', () => {
  const kit = readFileSync(new URL('../src/halls/kit.js', import.meta.url), 'utf8');

  it('门虚空不再是纯色发光平板：灰度纵深贴图（底缘渗光/中缝竖隙/顶部楣影）', () => {
    expect(kit).toContain('portalDepthTex');
    expect(kit).toContain('emissiveMap: portalDepthTex');
    // 三个层次都在：底缘渗光 + 中缝竖隙 + 顶部收暗
    const at = kit.indexOf('portalDepthTex');
    const seg = kit.slice(at, at + 1600);
    expect(seg).toContain('floorGlow');
    expect(seg).toContain('slit');
    expect(seg).toContain('topShade');
  });

  it('门后剪影：贴近任意一扇门触发、整馆一次性（fired 锁存）', () => {
    expect(SRC.lobby).toContain('doorGhost');
    expect(SRC.lobby).toContain('doorGhost.fired = true');
    // 触发半径贴近门（< 3m）
    expect(/d < 2\.6/.test(SRC.lobby)).toBe(true);
    // 开幕点灯前不走
    expect(/openGate\.chand < 1\) return;.*开幕点灯前/.test(SRC.lobby)).toBe(true);
  });

  it('门后剪影零字幕（克制是设计的一部分）+ 两声轻脚步空间化', () => {
    const at = SRC.lobby.indexOf('doorGhostTex');
    const end = SRC.lobby.indexOf('doorGhostMesh.material.opacity = 0');
    expect(at).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(at);
    const seg = SRC.lobby.slice(at, end);
    expect(seg).not.toContain('ui.caption');
    expect((seg.match(/sfxAt\('step-wood'/g) || []).length).toBe(2);
  });

  it('剪影为抽象无面目（头影/肩/披落身形三团块，非肖像合规口径）', () => {
    const at = SRC.lobby.indexOf('doorGhostTex');
    const seg = SRC.lobby.slice(at, at + 1400);
    expect(seg).toContain('头影');
    expect(seg).toContain('披落身形');
    expect(seg).not.toMatch(/face|眼|口|鼻/);
  });
});

// ============================================================
// v1.12 门禁 60 追加：第十一轮巡查两件结构守卫（D-17/D-18）。
// 口径：装配矛盾修正后不许回流（百叶重新横贯双门 / 锯木厂回退平顶盒）
// ============================================================
describe('v1.12 门禁 60 追加：衣柜百叶分幅 + 锯木厂剪影 v2', () => {
  it('D-17 衣柜百叶逐门分幅：每级左右两半合并（不再整条横贯双门）+ 红渗光保留', () => {
    const at = SRC.bluevelvet.indexOf('百叶从「0.94 整条横贯双门」改为');
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.bluevelvet.slice(at, at + 900);
    // 左右两半：同一 0.4 宽板在 ±0.3 各放一块，合并单 mesh（网格数守恒）
    expect((seg.match(/BoxGeometry\(0\.4, 0\.09, 0\.03\)/g) || []).length).toBe(2);
    expect(seg).toContain('-0.3, 0, 0');
    expect(seg).toContain('0.3, 0, 0');
    expect(seg).toContain('mergedMesh');
    // 仍是 8 级、彩蛋红渗光通道保留
    expect(seg).toContain('i < 8');
    expect(seg).toContain('0xd4243c');
  });

  it('D-18 锯木厂剪影 v2：单 mesh 顶点色（厂身/月色顶/值夜窗三档）+ 焚炉 + 坡道', () => {
    const at = SRC.twinpeaks.indexOf('锯木厂剪影 v2');
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.twinpeaks.slice(at, at + 3400);
    // 顶点色驱动的无光剪影（不吃后处理、低档零损失）
    expect(seg).toContain('MeshBasicMaterial({ vertexColors: true, fog: false })');
    // 三档色：厂身近黑 / 屋面抬半档 / 值夜窗微暖
    expect(seg).toContain('0x05070c');
    expect(seg).toContain('millRoofGeos');
    expect(seg).toContain('0x0c1220');
    expect(seg).toContain('millWinGeos');
    expect(seg).toContain('0x9c6a34');
    // 剪影新五金：木屑焚炉（锥）+ 上料坡道；值夜窗恰好两粒（睡着的厂不多亮）
    expect(seg).toContain('ConeGeometry(2.3, 4.8, 12)');
    expect(seg).toContain('上料坡道');
    const winSeg = seg.slice(seg.indexOf('millWinGeos'), seg.indexOf('millTint'));
    expect((winSeg.match(/PlaneGeometry/g) || []).length).toBe(2);
  });
});
