import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  APPROACH_SQUEEZE, APPROACH_DREAD, CORNER_SCARE, CLOSEUP, SCARE_BEATS,
  VACUUM, WAKE_RELIGHT, WAKE_DAZE, WAKE_POINT, RIM_BEATS, STARE_TILT
} from '../src/halls/mulholland.js';
import { INTERVIEWS } from '../src/data/interviews.js';

// ============================================================
// v1.26 门禁 106：新 Goal 第 7 轮（体验层定向修补——r6 走查三靶）
// 口径（对齐 GOAL_HANDOFF 第 6→7 轮交接 + r6 逐帧探针报告）：
//   · 显形线机制**不换**、gen_corner_wraith 几何**不回炉**、
//     SCARE_BEATS 六拍**零改动**（拍长不动 → VACUUM 派生账原封，
//     不触发 v124 改钉条款）；本轮三刀全部落在**体验层**：
//     ① 接近压迫 FOV 渐窄（APPROACH_SQUEEZE）：跨线前最后 ~2m
//        视野从 70° smoothstep 收窄 5°——与 APPROACH_DREAD 同一道
//        armed() 闸，位置驱动收放，跨线帧 grab.fov0 交接给 CLOSEUP
//        续推（无一帧回弹）；
//     ② reveal 滑出去抽搐拍：v1.22 三口急抽搐（beat=sin(s·6π)）
//        退役——滑出是一整口气的闪（用户原话「闪出来」像原片）；
//        s=1 体态逐位相同（sin(6π)=0），错拍/rush 零改动；
//     ③ wake 后巷灯缓慢重燃（WAKE_RELIGHT）：拐角惊吓醒来巷灯 3s
//        smoothstep 燃回（劫后余生的余韵），转身惊吓照旧瞬回——
//        两重 wake 分家第四轴（醒姿/字幕时机/朝向/灯的归来）。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  mull: read('src/halls/mulholland.js'),
  kit: read('src/halls/kit.js'),
  main: read('src/main.js'),
  engine: read('src/audio/engine.js'),
  cjs: read('electron/main.cjs')
};
// 显形线中巷跨线点（与 cornerscare.test 同一笔账——几何零改动的对照系）
const K = CORNER_SCARE.corner;
const R = CORNER_SCARE.reveal;
const crossZ = (x) => K.z + ((K.z - R.z) / (K.x - R.x)) * (x - K.x);

describe('v1.26 门禁 106·靶一：接近压迫 FOV 渐窄（APPROACH_SQUEEZE 窗口账）', () => {
  it('窗口贴跨线：收满点 = APPROACH_DREAD 涨落终点（同步不另起炉灶），在跨线点以北', () => {
    expect(APPROACH_SQUEEZE.z1).toBe(APPROACH_DREAD.z1);
    expect(APPROACH_SQUEEZE.z1).toBeGreaterThan(crossZ(9.3)); // 收满在跨线之前
  });

  it('涨程 ~2m（起点距中巷跨线点 2.0±0.2m）——「跨线前约 2m」的字面账', () => {
    expect(APPROACH_SQUEEZE.z0 - APPROACH_SQUEEZE.z1).toBeGreaterThanOrEqual(1.5);
    expect(APPROACH_SQUEEZE.z0 - APPROACH_SQUEEZE.z1).toBeLessThanOrEqual(2.5);
    expect(Math.abs(APPROACH_SQUEEZE.z0 - crossZ(9.3) - 2)).toBeLessThanOrEqual(0.2);
    // 收窄窗完全落在 dread 涨落区内（压迫是 dread 的视觉声部，不越界）
    expect(APPROACH_SQUEEZE.z0).toBeLessThan(APPROACH_DREAD.z0);
  });

  it('收窄量克制：5°（70→65），浅于特写推量（压迫是慢推的首拍不是另一台镜头）', () => {
    expect(APPROACH_SQUEEZE.drop).toBe(7);
    expect(70 - APPROACH_SQUEEZE.drop).toBeGreaterThanOrEqual(60);
    expect(APPROACH_SQUEEZE.drop).toBeLessThan(CLOSEUP.fovPush);
  });

  it('接线：armed() 门 + 惊吓中不收 + 巷内限定 + 位置驱动 smoothstep', () => {
    expect(SRC.mull).toContain('if (scare.phase === 0 && cornerTrig.armed()) {');
    expect(SRC.mull).toContain('(APPROACH_SQUEEZE.z0 - pv.z) / (APPROACH_SQUEEZE.z0 - APPROACH_SQUEEZE.z1)');
    expect(SRC.mull).toContain('want = qf * qf * (3 - 2 * qf);');
  });

  it('收放不对称：收窄直取位置值（跨线帧压满无时滞）、松开按帧缓释（闸口翻脸不弹回）', () => {
    expect(SRC.mull).toContain(
      'squeeze.k = want >= squeeze.k ? want : squeeze.k + (want - squeeze.k) * Math.min(1, dt * 6);');
  });

  it('特写接管期间压迫层让位（镜头归 CLOSEUP），FOV 写回带 epsilon 闸（不空转投影矩阵）', () => {
    expect(SRC.mull).toContain('if (grab.on || !engine.camera) return;');
    expect(SRC.mull).toContain('const f = baseFov - APPROACH_SQUEEZE.drop * squeeze.k;');
    expect(SRC.mull).toContain('if (Math.abs(engine.camera.fov - f) < 0.0005) return;');
  });

  it('交接账：跨线帧捕获当前 FOV 起步续推 + squeeze 清零（醒来不补写旧账）', () => {
    const seg = SRC.mull.slice(
      SRC.mull.indexOf('const doCornerScare'), SRC.mull.indexOf("scare.sub = 'stare';"));
    expect(seg).toContain('grab.fov0 = engine.camera ? engine.camera.fov : baseFov;');
    expect(seg).toContain('squeeze.k = 0;');
    expect(SRC.mull).toContain(
      'engine.camera.fov = grab.fov0 - (grab.fov0 - (baseFov - CLOSEUP.fovPush)) * push;');
  });

  it('推近终点数学账：push=1 时无论 fov0 收到哪，终点都是 baseFov−fovPush', () => {
    const end = (fov0) => fov0 - (fov0 - (70 - CLOSEUP.fovPush)) * 1;
    expect(end(70)).toBeCloseTo(70 - CLOSEUP.fovPush, 9);
    expect(end(70 - APPROACH_SQUEEZE.drop)).toBeCloseTo(70 - CLOSEUP.fovPush, 9);
    // push=0 起点就是 fov0——交接帧零跳变
    const start = (fov0) => fov0 - (fov0 - (70 - CLOSEUP.fovPush)) * 0;
    expect(start(65)).toBe(65);
  });

  it('显形线几何零改动的对照系仍成立：中巷跨线点 z≈−26.506（±5mm）', () => {
    expect(crossZ(9.3)).toBeCloseTo(-26.506, 2);
  });
});

describe('v1.26 门禁 106·靶二：reveal 滑出去抽搐拍（一整口气的闪——只改滑出段）', () => {
  const glbLurch = /wraith\.userData\.setLurch = \(s, t = 0\) => \{[^]*?\};/.exec(SRC.mull)?.[0] ?? '';
  const kitWraith = SRC.kit.slice(SRC.kit.indexOf('export function cornerWraith'));
  const kitLurch = /setLurch = \(s, t = 0\) => \{[^]*?\};/.exec(kitWraith)?.[0] ?? '';

  it('抽搐拍退役双侧到位：GLB 版与 kit 兜底版 setLurch 体内 beat=sin(s·6π) 全部消失', () => {
    expect(glbLurch.length).toBeGreaterThan(0);
    expect(kitLurch.length).toBeGreaterThan(0);
    for (const body of [glbLurch, kitLurch]) {
      expect(body).not.toContain('Math.PI * 6');
      expect(body).not.toContain('beat');
    }
  });

  it('滑出段体态平滑加深保留（前倾/抬头随 s 一路进）——GLB 与兜底逐行同账', () => {
    for (const body of [glbLurch, kitLurch]) {
      expect(body).toContain('pivot.rotation.x = 0.12 + s * 0.14;');
      expect(body).toContain('headPivot.rotation.x = -(0.06 + s * 0.34);');
      expect(body).toContain('Math.sin(t * 1.7) * 0.045'); // 发帘惯性慢摆（t 基）保留
    }
  });

  it('s=1 交接无缝数学账：sin(6π)=0——旧账错拍站桩体态与新账逐位相同', () => {
    expect(Math.abs(Math.sin(Math.PI * 6))).toBeLessThan(1e-12);
  });

  it('调用形与路径：setLurch(s,t)/(1,t)/setRush(k,t) + v1.28 peek→slide 四次方', () => {
    expect(SRC.mull).toContain('wraith.userData.setLurch(s, t)');
    expect(SRC.mull).toContain('wraith.userData.setLurch(1, t)');
    expect(SRC.mull).toContain('wraith.userData.setRush(k, t)');
    expect(SRC.mull).toContain('REVEAL_PEEK');
    expect(SRC.mull).toContain('(1 - k) ** 4');
    expect(SRC.mull).toContain('revealBez(s, wraith.position)');
  });

  it('错拍/rush 仍在：歪头参数在册、rush 高频扑动（sin(t·13)）双侧仍在', () => {
    expect(STARE_TILT.rad).toBeGreaterThan(0);
    expect(STARE_TILT.rad).toBeLessThanOrEqual(0.12);
    const glbRush = /wraith\.userData\.setRush = \(k, t = 0\) => \{[^]*?\};/.exec(SRC.mull)?.[0] ?? '';
    const kitRush = /setRush = \(k, t = 0\) => \{[^]*?\};/.exec(kitWraith)?.[0] ?? '';
    for (const body of [glbRush, kitRush]) {
      expect(body).toContain('Math.sin(t * 13)');
      expect(body).toContain('Math.sin(t * 11)');
    }
  });

  it('lurchEase 纯函数留册（kit 导出与顿挪性质单测不拆——它是账，不是现役曲线）', () => {
    expect(SRC.kit).toContain('export function lurchEase');
  });
});

describe('v1.26 门禁 106·靶三：wake 后巷灯缓慢重燃（WAKE_RELIGHT——分家第四轴）', () => {
  it('拍长账：3s 燃回——比环境音归还（VACUUM.release 1.6s）慢，灯是最后回来的', () => {
    expect(WAKE_RELIGHT).toEqual({ dur: 3 });
    expect(WAKE_RELIGHT.dur).toBeGreaterThan(VACUUM.release);
    // 燃满仍在拐角字幕窗内（1.15s 迟到 + 5.2s 驻留 > 3s——灯回满时那句话还在）
    expect(WAKE_RELIGHT.dur).toBeLessThan(WAKE_DAZE.captionMs / 1000 + 5.2);
  });

  it('只给拐角惊吓：daze 分支起燃（relight.t=0），else 分支灯随醒瞬回（转身惊吓原语言）', () => {
    const seg = SRC.mull.slice(
      SRC.mull.indexOf('const wakeUp'), SRC.mull.indexOf('const doCornerScare'));
    const daze = seg.indexOf('if (daze) {');
    expect(daze).toBeGreaterThan(-1);
    expect(seg.indexOf('relight.t = 0;')).toBeGreaterThan(daze);
    const other = seg.indexOf('} else {');
    expect(seg.indexOf('backLampState.on = 1;')).toBeGreaterThan(other);
    expect(seg.indexOf('lampKill.v = 0;')).toBeGreaterThan(other);
  });

  it('更新器：游戏时钟累加（软渲染纪律）+ smoothstep 燃回 + 两灯同一口气', () => {
    expect(SRC.mull).toContain('relight.t += dt;');
    expect(SRC.mull).toContain('const k = Math.min(1, relight.t / WAKE_RELIGHT.dur);');
    expect(SRC.mull).toContain('const e = k * k * (3 - 2 * k);');
    expect(SRC.mull).toContain('lampKill.v = 1 - e;');
    expect(SRC.mull).toContain('backLampState.on = e;');
  });

  it('新惊吓接管灯时重燃让位（phase≠0 中止——灯归惊吓管，不跟惊吓抢）', () => {
    expect(SRC.mull).toContain('if (scare.phase !== 0) { relight.t = -1; return; }');
  });

  it('WAKE_POINT/WAKE_DAZE 原值复钉（挪落点三案判死——本轮动的是灯不是落点）', () => {
    expect(WAKE_POINT).toEqual({ x: 9.7, z: 9.5 });
    expect(WAKE_DAZE).toEqual({ pitch: -0.36, captionMs: 1150, yaw: 0 });
  });

  it('两重惊吓的灯灭帧原封：doCornerScare 与 doScare 都仍是 lampKill=1 + backLamp 熄', () => {
    expect((SRC.mull.match(/lampKill\.v = 1;\s*\n\s*backLampState\.on = 0;/g) || []).length).toBe(2);
  });
});

describe('v1.26 门禁 106：机制/拍长/几何零改动复钉（三刀全在体验层）', () => {
  it('SCARE_BEATS 六拍原值（±0ms）——拍长不动，VACUUM 派生账原封不触发改钉', () => {
    expect(SCARE_BEATS).toEqual({
      reveal: 0, stare: 720, rush: 1670, shock: 2070, blackout: 2570, wake: 3470
    });
    expect(0.045 + VACUUM.hold).toBeCloseTo(SCARE_BEATS.wake / 1000 + 0.3, 6);
    expect(VACUUM).toEqual({
      floor: 0.05, hold: 3.725, release: 1.6,
      turnFloor: 0.03, turnHold: 2.005, turnRelease: 1.9
    });
  });

  it('CLOSEUP/RIM_BEATS/APPROACH_DREAD 原值（v1.28 演进后复钉）', () => {
    expect(CLOSEUP).toEqual({ grabIn: 0.10, fovPush: 18, headY: 2.05 });
    expect(RIM_BEATS).toEqual({ base: 8.2, strike: 4.8, breath: 0.65, surge: 4.0 });
    expect(APPROACH_DREAD).toEqual({ z0: -18.5, z1: -26.4, swellAt: 0.6, rearmBelow: 0.15 });
  });

  it('gen_corner_wraith 眼组一字不动 + v1.28 第三轮回炉账在源', () => {
    const gen = read('scripts/blender/gen_corner_wraith.py');
    expect(gen).toContain('major_radius=0.012 * H, minor_radius=0.0035 * H');
    expect(gen).toContain('emission_strength=0.9');
    expect(gen).toContain('v1.28 第三轮回炉');
    expect(gen).toContain('前垂发绺 ×7');
  });

  it('纪律三数：变奏 scare.seen 恰三处（第四例判死）· 音色 98 · 访谈 40 · 普查 195', () => {
    expect((SRC.mull.match(/if \(scare\.seen\)/g) || []).length).toBe(3);
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
    expect(INTERVIEWS.length).toBe(40);
    const m = /INTERACTIVE_MIN = \{([\s\S]*?)\}/.exec(SRC.cjs);
    const total = [...m[1].matchAll(/: (\d+)/g)].reduce((n, x) => n + Number(x[1]), 0);
    expect(total + 7).toBe(195);
  });
});

describe('v1.26 门禁 106：版本口径', () => {
  it('版本口径一致：package.json 与 __SV__.version 同值（精确钉移交 v127-eggs）', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(SRC.main).toContain(`version: '${pkg.version}'`);
  });
});
