import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  WAKE_ECHO, WAKE_RELIGHT, WAKE_DAZE, WAKE_POINT, CORNER_EDGE,
  APPROACH_SQUEEZE, SCARE_BEATS, VACUUM, CLOSEUP
} from '../src/halls/mulholland.js';
import { spatialParams } from '../src/audio/engine.js';
import { INTERVIEWS } from '../src/data/interviews.js';

// ============================================================
// v1.27 门禁 107：新 Goal 第 8 轮（唯一小修补——劫后远门回声）
// 口径（对齐 GOAL_HANDOFF 第 7→8 轮第 3 点论证 + r6 报告遗留一笔）：
//   拐角惊吓（daze）醒来 2.0s，拐角那头很远的一扇门关上/落锁——
//   复用既有 doorfar 音色（98 刹车内零新增）、复用 v1.23 变奏应答
//   的同一扇门（CORNER_EDGE），增强劫后错位感。
//   错拍账（声先于灯）：环境音回满 1.9s → 门应一声 2.0s → 灯燃满
//   3.0s（WAKE_RELIGHT 缓燃不动——三刀参数本轮零改动）。
//   只给拐角 daze wake——转身惊吓不分家此项。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  mull: read('src/halls/mulholland.js'),
  main: read('src/main.js'),
  engine: read('src/audio/engine.js'),
  cjs: read('electron/main.cjs')
};
// wakeUp 收尾段（两重惊吓共用，daze/else 分家全在这里）
const wakeSeg = SRC.mull.slice(
  SRC.mull.indexOf('const wakeUp'), SRC.mull.indexOf('const doCornerScare'));

describe('v1.27 门禁 107：劫后远门回声（WAKE_ECHO——拍点与错拍账）', () => {
  it('拍点在任务窗内：wake 后 1.5–2.5s（取 2.0s）', () => {
    expect(WAKE_ECHO.delayMs).toBeGreaterThanOrEqual(1500);
    expect(WAKE_ECHO.delayMs).toBeLessThanOrEqual(2500);
    expect(WAKE_ECHO).toEqual({ delayMs: 2000, vol: 0.5, ref: 8 });
  });

  it('声要等世界回来：doorfar 挂 master（不走直通），拍点必须晚于环境音回满 1.9s', () => {
    // VACUUM 罩到 wake+0.3s 才开始 release 1.6s——世界的声 1.9s 回满
    expect(WAKE_ECHO.delayMs / 1000).toBeGreaterThan(0.3 + VACUUM.release);
    // 调用无第 6 参 punch——世界的声不走直通（纪律：直通只给惊吓自己的声）
    expect(wakeSeg).toContain("audio.sfxAt('doorfar', CORNER_EDGE.x, CORNER_EDGE.z, 0.5, 8);");
    expect(wakeSeg).not.toContain("'doorfar', CORNER_EDGE.x, CORNER_EDGE.z, 0.5, 8, true");
  });

  it('错拍账（声先于灯）：门响时 WAKE_RELIGHT 缓燃还没走完——巷子还压在半黑里', () => {
    const s = WAKE_ECHO.delayMs / 1000;
    expect(s).toBeLessThan(WAKE_RELIGHT.dur); // 声先于灯燃满
    const k = s / WAKE_RELIGHT.dur;
    const e = k * k * (3 - 2 * k); // 门响那一刻 smoothstep≈0.74，灯确在半途
    expect(e).toBeGreaterThan(0.5);
    expect(e).toBeLessThan(0.9);
  });

  it('字幕零新增：那句迟到字幕（1.15s+5.2s 驻留）还在屏上，这一声不解释', () => {
    expect(WAKE_ECHO.delayMs).toBeGreaterThan(WAKE_DAZE.captionMs);
    expect(WAKE_ECHO.delayMs / 1000).toBeLessThan(WAKE_DAZE.captionMs / 1000 + 5.2);
  });
});

describe('v1.27 门禁 107：接线边界（只给拐角 daze——分家不扩散）', () => {
  it('回声只在 daze 分支：调用落在 if (daze) 块内、else 之前（转身惊吓不分家此项）', () => {
    const daze = wakeSeg.indexOf('if (daze) {');
    const call = wakeSeg.indexOf("sfxAt('doorfar'");
    const other = wakeSeg.indexOf('} else {');
    expect(daze).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(daze);
    expect(call).toBeLessThan(other);
    // 且用 WAKE_ECHO.delayMs 走 later（与 wake 迟到字幕同一调度语义）
    expect(wakeSeg).toContain('}, WAKE_ECHO.delayMs);');
  });

  it('让位闸：新惊吓接管时回声让位（与 relight 同纪律——世界的声不跟惊吓抢）', () => {
    const call = wakeSeg.indexOf("sfxAt('doorfar'");
    const guard = wakeSeg.indexOf('if (scare.phase !== 0) return;');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(call); // 闸在响之前
  });

  it('方位复用 v1.23 变奏应答的同一扇门（CORNER_EDGE）——世界里答话的门只有那一扇', () => {
    expect(CORNER_EDGE).toEqual({ x: 8.3, z: -26.7 });
    // 呼叫铃变奏那句钉还在（同一扇门的另一次发言，两处互不改写）
    expect(SRC.mull).toContain('这次是拐角那头应的。');
  });

  it('relight 让位闸原封：重燃更新器 phase≠0 中止（v126 靶三接线不动）', () => {
    expect(SRC.mull).toContain('if (scare.phase !== 0) { relight.t = -1; return; }');
  });
});

describe('v1.27 门禁 107：可闻性与混音纪律数学账', () => {
  it('可闻性：WAKE_POINT→CORNER_EDGE ~36.2m，vol·att 在裁声线 0.015 上留 ~3× 余量', () => {
    const dist = Math.hypot(CORNER_EDGE.x - WAKE_POINT.x, CORNER_EDGE.z - WAKE_POINT.z);
    expect(dist).toBeGreaterThan(36);
    expect(dist).toBeLessThan(36.5);
    const { att } = spatialParams(
      CORNER_EDGE.x - WAKE_POINT.x, CORNER_EDGE.z - WAKE_POINT.z, WAKE_DAZE.yaw, WAKE_ECHO.ref);
    const heard = WAKE_ECHO.vol * att;
    expect(heard).toBeGreaterThanOrEqual(0.03); // 混音器 0.015 裁声线 2 倍以上
    expect(heard).toBeLessThanOrEqual(0.08);    // 但仍然是「远」——不许变成近声
  });

  it('far 族纪律复钉：位置化播放、ref≥2、vol≤1（audio.test 提取器逮得住字面量）', () => {
    expect(WAKE_ECHO.ref).toBeGreaterThanOrEqual(2);
    expect(WAKE_ECHO.vol).toBeLessThanOrEqual(1);
  });

  it('字面=账本：源码调用字面量与 WAKE_ECHO.vol/ref 一致（防两本账漂移）', () => {
    expect(wakeSeg).toContain(`, ${WAKE_ECHO.vol}, ${WAKE_ECHO.ref});`);
  });

  it('方向账：醒来面南朝巷（yaw 0），门在视线尽头近轴处（离轴 ≤0.1 声像近中）', () => {
    const { pan } = spatialParams(
      CORNER_EDGE.x - WAKE_POINT.x, CORNER_EDGE.z - WAKE_POINT.z, WAKE_DAZE.yaw, WAKE_ECHO.ref);
    expect(Math.abs(pan)).toBeLessThanOrEqual(0.1);
  });
});

describe('v1.27 门禁 107：三刀参数零改动复钉（本轮加的是声，不动三刀）', () => {
  it('APPROACH_SQUEEZE 原值（FOV 渐窄不动）', () => {
    expect(APPROACH_SQUEEZE).toEqual({ z0: -24.5, z1: -26.4, drop: 5 });
  });

  it('WAKE_RELIGHT/WAKE_DAZE/WAKE_POINT 原值（缓燃与落点朝向不动）', () => {
    expect(WAKE_RELIGHT).toEqual({ dur: 3 });
    expect(WAKE_DAZE).toEqual({ pitch: -0.36, captionMs: 1150, yaw: 0 });
    expect(WAKE_POINT).toEqual({ x: 9.7, z: 9.5 });
  });

  it('SCARE_BEATS 六拍 / VACUUM / CLOSEUP 原值（拍长几何机制全不动）', () => {
    expect(SCARE_BEATS).toEqual({
      reveal: 0, stare: 550, rush: 1500, shock: 1900, blackout: 2400, wake: 3300
    });
    expect(VACUUM).toEqual({
      floor: 0.05, hold: 3.555, release: 1.6,
      turnFloor: 0.03, turnHold: 2.005, turnRelease: 1.9
    });
    expect(CLOSEUP).toEqual({ grabIn: 0.35, fovPush: 15, headY: 1.97 });
  });

  it('纪律三数：音色恰 98（doorfar 复用零新增）· 访谈 40 · 普查 195 · 变奏恰三处', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
    expect(INTERVIEWS.length).toBe(40);
    const m = /INTERACTIVE_MIN = \{([\s\S]*?)\}/.exec(SRC.cjs);
    const total = [...m[1].matchAll(/: (\d+)/g)].reduce((n, x) => n + Number(x[1]), 0);
    expect(total + 7).toBe(195);
    expect((SRC.mull.match(/if \(scare\.seen\)/g) || []).length).toBe(3);
  });
});

describe('v1.27 门禁 107：版本口径', () => {
  it('package.json 与 __SV__.version 都是 1.27.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('1.27.0');
    expect(SRC.main).toContain("version: '1.27.0'");
  });
});
