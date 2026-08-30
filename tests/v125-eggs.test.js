import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  WAKE_POINT, WAKE_DAZE, CORNER_EDGE, SCARE_BEATS, VACUUM,
  CLOSEUP, STARE_TILT, RIM_BEATS, APPROACH_DREAD
} from '../src/halls/mulholland.js';
import { INTERVIEWS } from '../src/data/interviews.js';
import { DOCENT, QUOTES, NARRATIONS } from '../src/data/essays.js';

// ============================================================
// v1.25 门禁 103：新 Goal 第 4 轮（鸮形体精修 + wake 朝向 + 真机验收基建）
// 口径（对齐 GOAL_HANDOFF 第 4 轮优先项）：
//   · 拐角惊吓四层**零翻修**——SCARE_BEATS/CLOSEUP/STARE_TILT/
//     RIM_BEATS/VACUUM/APPROACH_DREAD 原值复钉（全面翻修回报已递减）；
//   · 双峰鸮程序化精修（用户原始诉求补漏）：眼组原封不动，改的是
//     轮廓/双翼/尾/耳羽簇/栖枝关系——净账 −1 mesh（3→2，tp 244→243）；
//   · wake 空间错位下一档（挪朝向不挪落点）：拐角惊吓面南朝巷醒
//     （yaw 0，正对拐角方向 ±2.2°），转身惊吓照旧 π 背巷——两重
//     wake 分家第三轴（醒姿/字幕时机/朝向）；
//   · 真机验收基建：scareProbe 状态位只读快照 + 冒烟逐拍实录 +
//     TESTING 耳机验收清单（swiftshader 无音频、陈旧帧不可信）；
//   · 内容侧仅质量替换：DOCENT.home 印象句退役换可查证制作史；
//     访谈 40 封顶持平；变奏第四例判死（scare.seen 恰三处复钉）。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  tp: read('src/halls/twinpeaks.js'),
  mull: read('src/halls/mulholland.js'),
  main: read('src/main.js'),
  cjs: read('electron/main.cjs'),
  essays: read('src/data/essays.js')
};
// 鸮段源码（从组装到挂上枯树桩）
const OWL = SRC.tp.slice(
  SRC.tp.indexOf('const owl = new THREE.Group();'),
  SRC.tp.indexOf('snag.add(owl);'));

describe('v1.25 门禁 103：双峰鸮形体精修——眼组原封（用户口径「眼睛很好」）', () => {
  it('眼组三钉不动：位置/半径/材质（emissive 0xffb45e @1.15）逐字原值', () => {
    expect(OWL).toContain("xform(new THREE.SphereGeometry(0.02, 8, 6), -0.035, 0.315, 0.075)");
    expect(OWL).toContain("xform(new THREE.SphereGeometry(0.02, 8, 6), 0.035, 0.315, 0.075)");
    expect(OWL).toContain('color: 0x050403, emissive: 0xffb45e, emissiveIntensity: 1.15');
  });

  it('眨眼-亮起机制原封：微光眨眼 0.06、常态呼吸 1.15±0.18、E 触发亮起曲线', () => {
    expect(SRC.tp).toContain('owlState.blink > 0 ? 0.06 : 1.15 + Math.sin(t * 1.3) * 0.18');
    expect(SRC.tp).toContain('1.15 + Math.min(k * 6, 1) * 3.6 * Math.max(0, 1 - Math.max(0, k - 2.2))');
  });

  it('收形不吞眼：颈腰剖面 r(0.315) < 眼心轴距，眼球仍探出体面 ≥20mm', () => {
    const r = 0.064 + ((0.315 - 0.302) / (0.335 - 0.302)) * (0.086 - 0.064);
    const eyeAxisDist = Math.hypot(0.035, 0.075);
    expect(r).toBeLessThan(eyeAxisDist);
    expect(eyeAxisDist + 0.02 - r).toBeGreaterThanOrEqual(0.02);
  });
});

describe('v1.25 门禁 103：鸮形体 v2（轮廓/双翼/尾/耳羽簇——林奇式抽象非写实）', () => {
  it('轮廓三段剪影入钉：满胸 / 收颈 / 圆颅（v1.29 再收颈、圆颅略放）', () => {
    expect(OWL).toContain('new THREE.Vector2(0.124, 0.16)');
    expect(OWL).toContain('new THREE.Vector2(0.064, 0.302)');
    expect(OWL).toContain('new THREE.Vector2(0.086, 0.335)');
    expect(OWL).not.toContain('new THREE.Vector2(0.115, 0.12)');
  });

  it('合拢双翼 + 垂尾（剪影第二读点）：翼刃加长、尾楔压扁垂到枝下', () => {
    expect(OWL).toContain('wingGeo.scale(0.48, 2.45, 0.95)');
    expect((OWL.match(/xform\(wingGeo/g) || []).length).toBe(2);
    expect(OWL).toContain('tailGeo.scale(1, 1, 0.42)');
    expect(OWL).toContain('xform(tailGeo, 0, 0.008, -0.092, -2.48, 0, 0)');
    expect(0.008 + 0.1 * Math.cos(-2.48)).toBeLessThan(0);
  });

  it('耳羽簇 v3：主簇再外张 + 前副簇各一 + 面盘', () => {
    expect(OWL).toContain('new THREE.ConeGeometry(0.022, 0.11, 6)');
    expect(OWL).toContain('xform(tuftGeo, -0.056, 0.418, -0.006, 0, 0, 0.58)');
    expect(OWL).toContain('xform(tuftGeo, 0.056, 0.418, -0.006, 0, 0, -0.58)');
    expect((OWL.match(/xform\(tuftEchoGeo/g) || []).length).toBe(2);
    expect(OWL).toContain('diskGeo');
  });
});

describe('v1.25 门禁 103：鸮栖枝关系修正（悬空/骑轴几何账）', () => {
  // 主枝几何（源自 snagGeos）：圆柱 len0.8 r0.048→0.026，中心 (0.3,2.9,0.06)，
  // 绕 z 转 −1.15——枝端与鸮落点处的枝面标高按同一笔账重算
  const endX = 0.3 + 0.4 * Math.sin(1.15);
  const endY = 2.9 + 0.4 * Math.cos(1.15);
  const t = (0.62 - 0.3) / (endX - 0.3);
  const surfY = 2.9 + (endY - 2.9) * t + (0.048 + (0.026 - 0.048) * t);

  it('落座：鸮底 y3.075 距枝面 ≤5mm（旧账 3.12 悬空 48mm 判死）', () => {
    expect(OWL).toContain('owl.position.set(0.62, 3.075, 0.07);');
    expect(Math.abs(3.075 - surfY)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(3.12 - surfY)).toBeGreaterThan(0.04); // 旧账留档
  });

  it('骑轴：鸮 z0.07 距枝轴 z0.06 仅 10mm < 枝半径（旧账 z0.12 偏 60mm 爪下无枝）', () => {
    const r = 0.048 + (0.026 - 0.048) * t;
    expect(Math.abs(0.07 - 0.06)).toBeLessThanOrEqual(r);
    expect(Math.abs(0.12 - 0.06)).toBeGreaterThan(r);
  });

  it('四趾扣枝：toeGeo 恰 4 处、尖朝前下（rx≈2.55 把 +y 压到前下象限）', () => {
    expect((OWL.match(/xform\(toeGeo/g) || []).length).toBe(4);
    expect(Math.cos(2.55)).toBeLessThan(0);  // y 分量朝下
    expect(Math.sin(2.55)).toBeGreaterThan(0); // z 分量朝前
  });

  it('头转对准角随骑轴改钉留账（0.12→0.07），转头机制拍长原值', () => {
    expect(SRC.tp).toContain('Math.atan2(6.3 - 0.62, -5.7 - 0.07)');
    expect(SRC.tp).not.toContain('Math.atan2(6.3 - 0.62, -5.7 - 0.12)');
    expect(SRC.tp).toContain('if (k >= 3.2) { owlState.t = -1; return; }');
    expect(SRC.tp).toContain('const aim = k < 2.2 ? face : 0.5;');
    expect(SRC.tp).toContain('dt * (k < 0.6 ? 10 : 1.4)');
  });
});

describe('v1.25 门禁 103：鸮预算净账 −1（3 mesh → 2，tp 244→243）', () => {
  it('鸮段恰 2 个 mergedMesh（形件单 mesh + 眼组）、零裸 new THREE.Mesh', () => {
    expect((OWL.match(/mergedMesh\(/g) || []).length).toBe(2);
    expect(OWL).not.toContain('new THREE.Mesh(');
    expect(OWL).toContain('owl.add(owlBody, eyes);');
  });

  it('热点仍挂形件主体（owlBody）、hint 与触发链原封——twinpeaks 交互 26 持平', () => {
    expect(SRC.tp).toContain('hotspots.add(owlBody, {');
    expect(SRC.tp).toContain("hint: 'E — 树梢上的一双眼睛'");
    expect(SRC.tp).toContain("audio.sfxAt('flutter', -6.3, 5.7, 0.7, 5)");
    expect(SRC.tp).toContain("setTimeout(() => audio.sfxAt('owl', -6.3, 5.7, 0.5, 6), 900)");
    expect(SRC.tp).toContain('它先看见你的。');
    expect(SRC.cjs).toMatch(/twinpeaks: 26/);
  });

  it('禁新 GLB：twinpeaks 仅孪生松一件照旧（v1.14 名单）——鸮段零 glb，程序化精修不是建模回炉', () => {
    expect((SRC.tp.match(/\.glb/g) || []).length).toBe(1);
    expect(SRC.tp).toContain("pine_tree.glb?inline");
    expect(OWL).not.toContain('.glb');
  });
});

describe('v1.25 门禁 103：wake 朝向下一档（挪朝向不挪落点——分家第三轴）', () => {
  it('WAKE_POINT 持平（落点可辨识性是字幕迟到的前提）；WAKE_DAZE 添 yaw 0', () => {
    expect(WAKE_POINT).toEqual({ x: 9.7, z: 9.5 });
    expect(WAKE_DAZE).toEqual({ pitch: -0.36, captionMs: 1150, yaw: 0 });
  });

  it('几何账：面南 yaw 0 正对拐角沿——离轴 atan2(1.4,36.2)≈2.2° ≤ 3.5°', () => {
    const dx = CORNER_EDGE.x - WAKE_POINT.x;
    const dz = CORNER_EDGE.z - WAKE_POINT.z;
    const offAxis = Math.abs(Math.atan2(-dx, -dz) - WAKE_DAZE.yaw);
    expect(offAxis).toBeLessThanOrEqual(0.061); // 3.5°
    // 视线沿途地标：两盏将熄壁灯都在正前方（z 均 < 落点 z）
    expect(SRC.mull).toContain('alleyLamp.position.set(11.05, 3.4, -6);');
    expect(SRC.mull).toContain('alleyLamp2.position.set(8.35, 3.2, -19);');
    expect(-6).toBeLessThan(WAKE_POINT.z);
    expect(-19).toBeLessThan(WAKE_POINT.z);
  });

  it('接线：拐角 daze 走 WAKE_DAZE.yaw、转身照旧 π 背巷（两重 wake 收尾语原封）', () => {
    expect(SRC.mull).toContain('teleport(WAKE_POINT.x, WAKE_POINT.z, daze ? WAKE_DAZE.yaw : Math.PI);');
    expect(SRC.mull).toContain("wakeUp('有些拐角，不该拐过去。', true)");
    expect(SRC.mull).toContain("wakeUp('有些东西只在你回头时存在。')");
  });

  it('electron 冒烟 wake 断言同步：位置外加朝向档（拐角 0 / 转身 π、容差 0.02）', () => {
    expect(SRC.cjs).toContain("pollUntilWake('拐角惊吓', 40000, 0,");
    expect(SRC.cjs).toContain("pollUntilWake('转身惊吓', 40000, Math.PI,");
    expect(SRC.cjs).toContain('Math.abs(st.yaw - wantYaw) <= 0.02');
  });

  it('落点在一切触发区之外照旧：yaw 0 醒姿不落在转身武装区（几何复核）', () => {
    // SCARE_REGION 深巷段 z∈[−31.5,−16]、空地 z∈[−30.7,−27.6]——落点 z9.5 均外
    expect(WAKE_POINT.z).toBeGreaterThan(-16);
    expect(WAKE_POINT.z).toBeGreaterThan(-27.6);
  });
});

describe('v1.25 门禁 103：真机验收基建（scareProbe 状态位实录）', () => {
  it('mull 侧：build 返回只读快照（字面量，phase/sub/clock/seen 四位）', () => {
    expect(SRC.mull).toContain('scareProbe: () => ({');
    expect(SRC.mull).toContain('phase: scare.phase, sub: scare.sub, clock: +scare.clock.toFixed(3), seen: scare.seen');
  });

  it('__SV__ 转发：非惊吓厅返回 null（探针不平添状态）', () => {
    expect(SRC.main).toContain('scareProbe: () => (current && current.built.scareProbe ? current.built.scareProbe() : null)');
  });

  it('冒烟逐拍实录：wake 轮询里抓 scareProbe 并落日志（CI 外人工对照口径）', () => {
    expect(SRC.cjs).toContain('window.__SV__.scareProbe ? window.__SV__.scareProbe() : null');
    expect(SRC.cjs).toContain('状态位: phase=');
  });

  it('TESTING 有「拐角惊吓耳机验收清单」（哪几拍听什么/看什么——不靠连拍截图）', () => {
    const t = read('TESTING.md');
    expect(t).toContain('拐角惊吓耳机验收清单');
    for (const beat of ['接近段', '跨线帧', '错拍', '扑近', '黑幕', '俯冲醒']) {
      expect(t, `验收清单缺拍: ${beat}`).toContain(beat);
    }
  });
});

describe('v1.25 门禁 103：内容侧仅质量替换（关闸纪律）', () => {
  it('DOCENT.home 印象句退役，换入可查证制作史（自宅入镜——Lynch on Lynch 有载）', () => {
    expect(DOCENT.home).toContain('妖夜慌踪');
    expect(DOCENT.home).toContain('好莱坞山');
    expect(DOCENT.home.length).toBeGreaterThanOrEqual(24);
    expect(DOCENT.home.length).toBeLessThanOrEqual(96);
    // 旧印象句全库退场；二层 home2（树木研究员）原封
    expect(SRC.essays).not.toContain('门廊、走廊和草坪');
    expect(DOCENT.home2).toContain('树木研究员');
  });

  it('防撞：《妖夜慌踪》语料在 QUOTES/INTERVIEWS/NARRATIONS 零出现（仅 DOCENT.home）', () => {
    const others = [
      ...QUOTES.map((q) => q.zh + q.en),
      ...INTERVIEWS.map((v) => v.zh + v.en + v.context),
      ...Object.values(NARRATIONS).map((n) => n.text)
    ].join('');
    expect(others).not.toContain('妖夜慌踪');
    const hits = Object.values(DOCENT).filter((d) => d.includes('妖夜慌踪'));
    expect(hits.length).toBe(1);
  });

  it('访谈 40 封顶持平（本轮评审未换：最薄条 continuing 无可查证度足够的同主题替换句——宁持平不换弱）', () => {
    expect(INTERVIEWS.length).toBe(40);
    for (const theme of ['点子', '电影', '心境', '此生']) {
      expect(INTERVIEWS.filter((v) => v.theme === theme).length, `主题失衡: ${theme}`).toBe(10);
    }
  });

  it('变奏第四例判死：if (scare.seen) 恰三处照旧（缺席/换位/反转封口）', () => {
    expect((SRC.mull.match(/if \(scare\.seen\)/g) || []).length).toBe(3);
  });

  it('零新热点：INTERACTIVE_MIN 195 口径持平（阈值=普查−1，七厅和 188=195−7 表未动）', () => {
    expect(SRC.cjs).toMatch(/mulholland: 24/);
    expect(SRC.cjs).toMatch(/twinpeaks: 26/);
    const m = /INTERACTIVE_MIN = \{([\s\S]*?)\}/.exec(SRC.cjs);
    const total = [...m[1].matchAll(/: (\d+)/g)].reduce((n, x) => n + Number(x[1]), 0);
    expect(total + 7).toBe(195);
  });
});

describe('v1.25 门禁 103：拐角惊吓四层零翻修复钉（全面翻修回报已递减）', () => {
  it('SCARE_BEATS/CLOSEUP/STARE_TILT/RIM_BEATS 原值（±0ms，第三轮口径复验）', () => {
    expect(SCARE_BEATS).toEqual({
      reveal: 0, stare: 720, rush: 1670, shock: 2070, blackout: 2570, wake: 3470
    });
    expect(CLOSEUP).toEqual({ grabIn: 0.10, fovPush: 18, headY: 2.05 });
    expect(STARE_TILT).toEqual({ at: 0.28, span: 0.42, rad: 0.095 });
    expect(RIM_BEATS).toEqual({ base: 8.2, strike: 4.8, breath: 0.65, surge: 4.0 });
  });

  it('VACUUM/APPROACH_DREAD 原值（音频层账目不动；wake+0.3 派生账仍成立）', () => {
    expect(VACUUM).toEqual({
      floor: 0.05, hold: 3.725, release: 1.6,
      turnFloor: 0.03, turnHold: 2.005, turnRelease: 1.9
    });
    expect(APPROACH_DREAD).toEqual({ z0: -18.5, z1: -26.4, swellAt: 0.6, rearmBelow: 0.15 });
    expect(0.045 + VACUUM.hold).toBeCloseTo(SCARE_BEATS.wake / 1000 + 0.3, 6);
  });
});

describe('v1.25 门禁 103：版本口径', () => {
  it('版本口径一致：package.json 与 __SV__.version 同值（精确钉移交 v126-eggs）', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(SRC.main).toContain(`version: '${pkg.version}'`);
  });
});
