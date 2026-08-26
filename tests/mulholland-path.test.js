import { describe, it, expect } from 'vitest';
import { WALK_RECTS, SCARE_ZONE, SPAWN } from '../src/halls/mulholland.js';
import { multiRectBounds } from '../src/halls/kit.js';

// ============================================================
// v1.6 门禁 37：穆赫兰道后巷通路（纯几何仿真，与运行时同一套数据）
// - WALK_RECTS 即 build() 里 multiRectBounds 用的矩形并集（模块级导出）
// - 仿真步进与 FirstPersonControls 同量级（4.2 m/s ÷ 60fps ≈ 7cm/步），
//   每步过真实的 multiRectBounds 钳制——撞墙即卡死，不存在穿墙作弊
// ============================================================

const clamp = multiRectBounds(WALK_RECTS);
const insideAny = (x, z) =>
  WALK_RECTS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);

/** 贪心行走：朝路点直线步进 + 每步边界钳制；到不了即返回卡点 */
function walk(from, waypoints, maxStepsPerLeg = 2600) {
  const p = { x: from.x, z: from.z };
  const dt = 1 / 60;
  const speed = 4.2;
  for (const [wx, wz] of waypoints) {
    let guard = 0;
    while (Math.hypot(wx - p.x, wz - p.z) > 0.3) {
      if (++guard > maxStepsPerLeg) return { ok: false, x: p.x, z: p.z, target: [wx, wz] };
      const dx = wx - p.x;
      const dz = wz - p.z;
      const d = Math.hypot(dx, dz) || 1;
      p.x += (dx / d) * speed * dt;
      p.z += (dz / d) * speed * dt;
      clamp(p);
    }
  }
  return { ok: true, x: p.x, z: p.z };
}

// TESTING.md 写明的复现路线：沿建筑右侧（票亭一侧）绕到后巷
const DOCUMENTED_ROUTE = [
  [2, -8],        // 夜路南段
  [6.5, -11],     // 右拐上便道
  [9.3, -12.8],   // 票亭转角进巷口
  [9.3, -29.5],   // 暗巷走到底
  [SCARE_ZONE.x, SCARE_ZONE.z] // 背后空地触发点
];

describe('后巷通路：出生点 → 惊吓触发点必须可走通', () => {
  it('出生点与惊吓触发点都在 walkable 并集内', () => {
    expect(insideAny(SPAWN.x, SPAWN.z)).toBe(true);
    expect(insideAny(SCARE_ZONE.x, SCARE_ZONE.z)).toBe(true);
  });

  it('惊吓后的空间错位落点（巷口 9.7, 9.5）在 walkable 内', () => {
    expect(insideAny(9.7, 9.5)).toBe(true);
  });

  it('按 TESTING.md 路线（沿建筑右侧）可走到触发点', () => {
    const r = walk(SPAWN, DOCUMENTED_ROUTE);
    expect(r.ok, `卡死在 (${r.x?.toFixed(2)}, ${r.z?.toFixed(2)}) → ${r.target}`).toBe(true);
    const d = Math.hypot(r.x - SCARE_ZONE.x, r.z - SCARE_ZONE.z);
    expect(d, '终点未落进触发圈').toBeLessThan(SCARE_ZONE.r);
  });

  it('v1.5 回归案例：沿路走到剧场右拐不再撞隐形墙（票亭转角带存在）', () => {
    // v1.5 里 (6.5, -12.5) 一带不可走——玩家在 x=4.6 被钉死。
    expect(insideAny(6.5, -12.5)).toBe(true);
    expect(insideAny(9.3, -12.8)).toBe(true);
    const r = walk({ x: 2, z: -8 }, [[9.3, -12.8]]);
    expect(r.ok, `右拐即卡死在 (${r.x?.toFixed(2)}, ${r.z?.toFixed(2)})`).toBe(true);
  });

  it('北巷口老路线（原路肩缺口）仍然走得通', () => {
    const r = walk(SPAWN, [[6, 9], [9.5, 9], [9.5, -29], [SCARE_ZONE.x, SCARE_ZONE.z]]);
    expect(r.ok).toBe(true);
  });

  it('回程：触发点 → 出生点可原路走回（不是单行道）', () => {
    const r = walk({ x: SCARE_ZONE.x, z: SCARE_ZONE.z },
      [[9.3, -29.5], [9.3, -12.8], [6.5, -11], [2, -8], [SPAWN.x, SPAWN.z]]);
    expect(r.ok).toBe(true);
  });

  it('通道最小宽度 ≥ 1.5m（便道/巷道/转角不许挤成一条缝）', () => {
    const byName = Object.fromEntries(
      WALK_RECTS.map((r) => [`${r.minX},${r.minZ}`, r])
    );
    expect(Object.keys(byName).length).toBe(WALK_RECTS.length); // 无重复矩形
    for (const r of WALK_RECTS) {
      const w = r.maxX - r.minX;
      const d = r.maxZ - r.minZ;
      expect(Math.min(w, d)).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('触发圈大半落在 walkable 内（真人走进去就能触发，不用贴边）', () => {
    let inside = 0;
    let total = 0;
    for (let a = 0; a < 16; a++) {
      for (const k of [0.35, 0.7]) {
        total += 1;
        const x = SCARE_ZONE.x + Math.cos((a / 16) * Math.PI * 2) * SCARE_ZONE.r * k;
        const z = SCARE_ZONE.z + Math.sin((a / 16) * Math.PI * 2) * SCARE_ZONE.r * k;
        if (insideAny(x, z)) inside += 1;
      }
    }
    expect(inside / total).toBeGreaterThan(0.5);
  });
});
