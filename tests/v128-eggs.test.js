import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import {
  REVEAL_PEEK, SCARE_BEATS, CLOSEUP, STARE_TILT, RIM_BEATS,
  VACUUM, APPROACH_SQUEEZE, WAKE_ECHO, WAKE_DAZE
} from '../src/halls/mulholland.js';
import { DOCENT } from '../src/data/essays.js';
import { INTERVIEWS, interviewById } from '../src/data/interviews.js';

// ============================================================
// v1.28 门禁 108：原著对齐大改（用户证词「不够吓人/建模/内容/不符合原著」）
//   · 两阶段 peek→slide + 加长错拍 + 硬 rim + 侵入 CLOSEUP
//   · corner_wraith 第三轮回炉（眼组不动）
//   · DOCENT mulholland + 访谈质量替换两条
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  mull: read('src/halls/mulholland.js'),
  gen: read('scripts/blender/gen_corner_wraith.py'),
  main: read('src/main.js'),
  engine: read('src/audio/engine.js'),
  cjs: read('electron/main.cjs')
};

describe('v1.28 门禁 108：两阶段 peek 惊吓（原著拐角语义）', () => {
  it('REVEAL_PEEK 参数域：s∈(0,1) hold 闪拍 ≤150ms（v1.29 贴角闪现）', () => {
    expect(REVEAL_PEEK.s).toBeGreaterThan(0.05);
    expect(REVEAL_PEEK.s).toBeLessThan(0.4);
    expect(REVEAL_PEEK.holdMs).toBeGreaterThanOrEqual(60);
    expect(REVEAL_PEEK.holdMs).toBeLessThanOrEqual(150);
  });

  it('peek 冻住再 slide：源码两分支 + 四次方 slide', () => {
    expect(SRC.mull).toContain('REVEAL_PEEK.holdMs / 1000');
    expect(SRC.mull).toContain('revealBez(REVEAL_PEEK.s, wraith.position)');
    expect(SRC.mull).toContain('(1 - k) ** 4');
  });

  it('SCARE_BEATS 加长错拍：stare=720、窗宽守恒 rush−stare=950、全程 ≤4.5s', () => {
    expect(SCARE_BEATS).toEqual({
      reveal: 0, stare: 720, rush: 1670, shock: 2070, blackout: 2570, wake: 3470
    });
    expect(SCARE_BEATS.rush - SCARE_BEATS.stare).toBe(950);
    expect(SCARE_BEATS.wake).toBeLessThanOrEqual(4500);
  });

  it('VACUUM hold 随 wake 派生：0.045+hold = wake/1000+0.3', () => {
    expect(0.045 + VACUUM.hold).toBeCloseTo(SCARE_BEATS.wake / 1000 + 0.3, 6);
    expect(VACUUM.hold).toBe(3.725);
  });

  it('错拍第四口心跳在 rush 之前（加长 stare 窗）', () => {
    expect(SRC.mull).toContain('B.stare + 940');
    expect(SCARE_BEATS.stare + 940).toBeLessThan(SCARE_BEATS.rush);
  });
});

describe('v1.28 门禁 108：侵入 CLOSEUP + 硬 rim + 压迫 FOV', () => {
  it('CLOSEUP 侵入性：grabIn 0.10 / fovPush 18 / headY 2.05', () => {
    expect(CLOSEUP).toEqual({ grabIn: 0.10, fovPush: 18, headY: 2.05 });
    expect(CLOSEUP.fovPush).toBeLessThanOrEqual(18);
    expect(CLOSEUP.grabIn * 1000).toBeLessThan(SCARE_BEATS.stare);
  });

  it('RIM_BEATS 硬剪影：base/strike 抬档', () => {
    expect(RIM_BEATS).toEqual({ base: 8.2, strike: 4.8, breath: 0.65, surge: 4.0 });
    expect(RIM_BEATS.strike).toBeLessThanOrEqual(RIM_BEATS.base);
  });

  it('APPROACH_SQUEEZE drop 7°（70→63 压迫）', () => {
    expect(APPROACH_SQUEEZE).toEqual({ z0: -24.5, z1: -26.4, drop: 7 });
    expect(APPROACH_SQUEEZE.drop).toBeLessThan(CLOSEUP.fovPush);
  });

  it('STARE_TILT 加深：rad 0.095', () => {
    expect(STARE_TILT).toEqual({ at: 0.28, span: 0.42, rad: 0.095 });
    expect(STARE_TILT.rad).toBeLessThanOrEqual(0.12);
  });
});

describe('v1.28 门禁 108：corner_wraith 第三轮回炉', () => {
  it('GLB ≤300KB + 眼组四参数一字不动', () => {
    const size = statSync(new URL('../src/assets/corner_wraith.glb', import.meta.url)).size;
    expect(size).toBeLessThanOrEqual(300 * 1024);
    expect(SRC.gen).toContain('major_radius=0.012 * H, minor_radius=0.0035 * H');
    expect(SRC.gen).toContain('emission_strength=0.9');
    expect(SRC.gen).toContain("ring.scale = (1, 1, 1.3)");
  });

  it('第三轮回炉账：peek 肩 / 发帘收窄 / 前垂发绺 ×7 / pivot 前倾 0.18', () => {
    expect(SRC.gen).toContain('v1.28 第三轮回炉');
    expect(SRC.gen).toContain('peek 肩');
    expect(SRC.gen).toContain('OPEN_HALF = math.pi * 0.14');
    expect(SRC.gen).toContain('前垂发绺 ×7');
    expect(SRC.gen).toContain('pivot.rotation_euler = (0.18, 0.08, 0)');
  });

  it('落厅契约不破：wraithPivot / hairVeil / arm_L/R 同名', () => {
    for (const name of ['wraithPivot', 'hairVeil', 'arm_L', 'arm_R']) {
      expect(SRC.mull).toContain(name);
    }
  });
});

describe('v1.28 门禁 108：内容（穆赫兰道导览 + 访谈质量替换）', () => {
  it('DOCENT mulholland/mulholland2 在册且穆赫兰道厅接线', () => {
    expect(DOCENT.mulholland.length).toBeGreaterThanOrEqual(24);
    expect(DOCENT.mulholland2.length).toBeGreaterThanOrEqual(24);
    expect(SRC.mull).toContain('docent: DOCENT.mulholland');
    expect(SRC.mull).toContain('docent2: DOCENT.mulholland2');
  });

  it('访谈 40 封顶 + 新替换 lanight/tenclues 在册', () => {
    expect(INTERVIEWS.length).toBe(40);
    expect(interviewById('lanight')).toBeTruthy();
    expect(interviewById('tenclues')).toBeTruthy();
    expect(interviewById('milkman')).toBeFalsy();
    expect(interviewById('golfball')).toBeFalsy();
  });

  it('WAKE_ECHO 边界仍成立（v1.27 声先于灯账不被 peek 破坏）', () => {
    expect(WAKE_ECHO.delayMs).toBe(2000);
    expect(WAKE_ECHO.delayMs / 1000).toBeGreaterThan(0.3 + VACUUM.release);
    expect(WAKE_ECHO.delayMs).toBeGreaterThan(WAKE_DAZE.captionMs);
  });

  it('纪律三数：音色 98 · 访谈 40 · 普查 195 · 变奏恰三处', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
    expect(INTERVIEWS.length).toBe(40);
    const m = /INTERACTIVE_MIN = \{([\s\S]*?)\}/.exec(SRC.cjs);
    const total = [...m[1].matchAll(/: (\d+)/g)].reduce((n, x) => n + Number(x[1]), 0);
    expect(total + 7).toBe(195);
    expect((SRC.mull.match(/if \(scare\.seen\)/g) || []).length).toBe(3);
  });
});

describe('v1.28 门禁 108：版本口径', () => {
  it('package.json 与 __SV__.version 都是 1.29.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('1.29.0');
    expect(SRC.main).toContain("version: '1.29.0'");
  });
});
