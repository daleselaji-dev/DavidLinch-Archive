import { describe, it, expect, vi } from 'vitest';
import { turnTrigger } from '../src/halls/kit.js';
import { SCARE_REGION, SCARE_POINT, TURN_SCARE } from '../src/halls/mulholland.js';

// ============================================================
// v1.7 门禁 40：转身惊吓触发器 —— 纯逻辑仿真。
// 与运行时同一个 turnTrigger + 同一份 SCARE_REGION/TURN_SCARE 数据。
// 核心断言：
//   · 慢扫视（180° 用 2s 转完）永远不触发——看风景不该被吓
//   · 甩头式回望（180° 半秒内）在武装区内必触发
//   · 进区未满 armTime 不触发（边跑边甩视角不误伤）
//   · 区外怎么甩都不触发；冷却期内不复触发
// ============================================================

const ZONE_POSE = { x: SCARE_POINT.x, z: SCARE_POINT.z };
const OUT_POSE = { x: 0, z: 15.5 }; // 出生点：夜路，武装区外

/** 以固定帧率仿真：先驻留 dwell 秒，再用 turnSec 秒转 turnRad 弧度 */
function simulate(trig, { at = ZONE_POSE, dwell = 2, turnRad = Math.PI, turnSec = 0.25, fps = 60 }) {
  const dt = 1 / fps;
  let yaw = 0;
  for (let t = 0; t < dwell; t += dt) {
    trig.update({ x: at.x, z: at.z, yaw }, dt);
  }
  const steps = Math.max(1, Math.round(turnSec * fps));
  for (let i = 0; i < steps; i++) {
    yaw += turnRad / steps;
    trig.update({ x: at.x, z: at.z, yaw }, dt);
  }
  return yaw;
}

function makeTrig(onFire) {
  return turnTrigger(SCARE_REGION, onFire, TURN_SCARE);
}

describe('转身触发器：甩头才是扳机', () => {
  it('武装区内驻留后，180° 半秒内甩头 → 触发', () => {
    const fire = vi.fn();
    simulate(makeTrig(fire), { turnSec: 0.25 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('慢扫视（180° 用 2s）→ 不触发', () => {
    const fire = vi.fn();
    simulate(makeTrig(fire), { turnSec: 2.0 });
    expect(fire).not.toHaveBeenCalled();
  });

  it('90° 小甩视角（0.15s）→ 不触发（不是回头，只是看一眼）', () => {
    const fire = vi.fn();
    simulate(makeTrig(fire), { turnRad: Math.PI / 2, turnSec: 0.15 });
    expect(fire).not.toHaveBeenCalled();
  });

  it('反方向甩头同样触发（转角取绝对值）', () => {
    const fire = vi.fn();
    simulate(makeTrig(fire), { turnRad: -Math.PI, turnSec: 0.25 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('进区未满 armTime 就甩头 → 不触发（防边跑边甩误伤）', () => {
    const fire = vi.fn();
    simulate(makeTrig(fire), { dwell: TURN_SCARE.armTime * 0.4, turnSec: 0.25 });
    expect(fire).not.toHaveBeenCalled();
  });

  it('武装区外怎么甩都不触发', () => {
    const fire = vi.fn();
    simulate(makeTrig(fire), { at: OUT_POSE, turnSec: 0.2 });
    expect(fire).not.toHaveBeenCalled();
  });

  it('低帧率（15fps 软渲染）下甩头仍触发、慢扫视仍不触发', () => {
    const fireA = vi.fn();
    simulate(makeTrig(fireA), { turnSec: 0.3, fps: 15 });
    expect(fireA).toHaveBeenCalledTimes(1);
    const fireB = vi.fn();
    simulate(makeTrig(fireB), { turnSec: 2.0, fps: 15 });
    expect(fireB).not.toHaveBeenCalled();
  });

  it('单帧 yaw 突变（冒烟 spinYaw 钩子）→ 触发', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    const dt = 1 / 60;
    for (let t = 0; t < 2; t += dt) trig.update({ ...ZONE_POSE, yaw: 0 }, dt);
    trig.update({ ...ZONE_POSE, yaw: Math.PI }, dt);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('冷却期内不复触发；冷却过后可再次触发', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    simulate(trig, { turnSec: 0.25 });
    expect(fire).toHaveBeenCalledTimes(1);
    // 冷却半程再甩一次：无效
    const dt = 1 / 60;
    let yaw = Math.PI;
    for (let t = 0; t < TURN_SCARE.cooldown * 0.5; t += 0.5) {
      trig.update({ ...ZONE_POSE, yaw }, 0.5);
    }
    for (let i = 0; i < 15; i++) {
      yaw += Math.PI / 15;
      trig.update({ ...ZONE_POSE, yaw }, dt);
    }
    expect(fire).toHaveBeenCalledTimes(1);
    // 冷却走完 + 重新驻留：再次甩头有效
    for (let t = 0; t < TURN_SCARE.cooldown; t += 0.5) {
      trig.update({ ...ZONE_POSE, yaw }, 0.5);
    }
    for (let i = 0; i < 15; i++) {
      yaw += Math.PI / 15;
      trig.update({ ...ZONE_POSE, yaw }, dt);
    }
    expect(fire).toHaveBeenCalledTimes(2);
  });

  it('force() 冒烟钩子直接引爆', () => {
    const fire = vi.fn();
    makeTrig(fire).force();
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('参数与展厅导出一致（minTurn 2.0 rad / 上膛 1s / 冷却 ≥45s）', () => {
    expect(TURN_SCARE.minTurn).toBeCloseTo(2.0);
    expect(TURN_SCARE.armTime).toBeGreaterThanOrEqual(0.8);
    expect(TURN_SCARE.cooldown).toBeGreaterThanOrEqual(45);
  });
});
