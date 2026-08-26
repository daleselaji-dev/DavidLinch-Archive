import { describe, it, expect } from 'vitest';
import { WALK_RECTS, SCARE_REGION, SCARE_POINT, SPAWN } from '../src/halls/mulholland.js';
import { multiRectBounds } from '../src/halls/kit.js';

// ============================================================
// v1.6 门禁 37 / v1.7 门禁 40：穆赫兰道后巷通路（纯几何仿真，
// 与运行时同一套数据）
// - WALK_RECTS 即 build() 里 multiRectBounds 用的矩形并集（模块级导出）
// - 仿真步进与 FirstPersonControls 同量级（4.2 m/s ÷ 60fps ≈ 7cm/步），
//   每步过真实的 multiRectBounds 钳制——撞墙即卡死，不存在穿墙作弊
// - v1.7：终点断言改为「落进转身惊吓武装区 SCARE_REGION」——
//   走到空地深处站定后，猛回头即触发（触发本体见 turnscare.test.js）
// ============================================================

const clamp = multiRectBounds(WALK_RECTS);
const insideAny = (x, z) =>
  WALK_RECTS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
const insideScare = (x, z) =>
  SCARE_REGION.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);

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
  [SCARE_POINT.x, SCARE_POINT.z] // 背后空地站定点（武装区深处）
];

describe('后巷通路：出生点 → 惊吓武装区必须可走通', () => {
  it('出生点与站定点都在 walkable 并集内', () => {
    expect(insideAny(SPAWN.x, SPAWN.z)).toBe(true);
    expect(insideAny(SCARE_POINT.x, SCARE_POINT.z)).toBe(true);
  });

  it('站定点落在转身惊吓武装区内（走到就能上膛）', () => {
    expect(insideScare(SCARE_POINT.x, SCARE_POINT.z)).toBe(true);
  });

  it('惊吓后的空间错位落点（巷口 9.7, 9.5）在 walkable 内、且在武装区外', () => {
    expect(insideAny(9.7, 9.5)).toBe(true);
    expect(insideScare(9.7, 9.5)).toBe(false); // 醒来的地方不许立刻再吓一次
  });

  it('按 TESTING.md 路线（沿建筑右侧）可走到站定点', () => {
    const r = walk(SPAWN, DOCUMENTED_ROUTE);
    expect(r.ok, `卡死在 (${r.x?.toFixed(2)}, ${r.z?.toFixed(2)}) → ${r.target}`).toBe(true);
    expect(insideScare(r.x, r.z), '终点未落进武装区').toBe(true);
  });

  it('v1.5 回归案例：沿路走到剧场右拐不再撞隐形墙（票亭转角带存在）', () => {
    // v1.5 里 (6.5, -12.5) 一带不可走——玩家在 x=4.6 被钉死。
    expect(insideAny(6.5, -12.5)).toBe(true);
    expect(insideAny(9.3, -12.8)).toBe(true);
    const r = walk({ x: 2, z: -8 }, [[9.3, -12.8]]);
    expect(r.ok, `右拐即卡死在 (${r.x?.toFixed(2)}, ${r.z?.toFixed(2)})`).toBe(true);
  });

  it('北巷口老路线（原路肩缺口）仍然走得通', () => {
    const r = walk(SPAWN, [[6, 9], [9.5, 9], [9.5, -29], [SCARE_POINT.x, SCARE_POINT.z]]);
    expect(r.ok).toBe(true);
  });

  it('回程：站定点 → 出生点可原路走回（不是单行道）', () => {
    const r = walk({ x: SCARE_POINT.x, z: SCARE_POINT.z },
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

  it('武装区绝大部分落在 walkable 内（真人走进去就能上膛，不用贴边）', () => {
    let inside = 0;
    let total = 0;
    for (const r of SCARE_REGION) {
      for (let i = 0; i <= 8; i++) {
        for (let j = 0; j <= 8; j++) {
          total += 1;
          const x = r.minX + ((r.maxX - r.minX) * i) / 8;
          const z = r.minZ + ((r.maxZ - r.minZ) * j) / 8;
          if (insideAny(x, z)) inside += 1;
        }
      }
    }
    expect(inside / total).toBeGreaterThan(0.9);
  });

  it('武装区覆盖暗巷深段与背后空地两段（转身惊吓不是单点圈）', () => {
    expect(SCARE_REGION.length).toBeGreaterThanOrEqual(2);
    // 暗巷深段：巷中恐惧拍（z≈-21.5）之后走到哪里回头都可能中招
    expect(insideScare(9.3, -22)).toBe(true);
    expect(insideScare(9.3, -29)).toBe(true);
    // 背后空地全域
    expect(insideScare(-8, -29)).toBe(true);
    // 巷口浅段（刚进巷）不上膛——先给恐惧拍留呼吸
    expect(insideScare(9.3, -8)).toBe(false);
  });
});
