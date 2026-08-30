import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cornerTrigger, lurchEase, multiRectBounds } from '../src/halls/kit.js';
import {
  CORNER_SCARE, CORNER_EDGE, THEATER_WALL, REVEAL_PATH, APPROACH_DREAD,
  SCARE_BEATS, CLOSEUP, WAKE_POINT, WALK_RECTS, SCARE_REGION, SPAWN
} from '../src/halls/mulholland.js';

// ============================================================
// v1.22 门禁 100：拐角惊吓显形线换代 —— 纯逻辑仿真。
// 与运行时同一个 cornerTrigger v2 + 同一份 CORNER_SCARE/SCARE_BEATS。
// 机制账（v1.8→v1.12 四轮圆形触发区仍被判「时机不对」的病灶）：
//   圆区触发与「看见」无关——本轮把触发时机钉死在**视线越过拐角、
//   墙后之物即将入画**的几何瞬间（显形线 = 拐角沿 K 与藏身点 R 的
//   连线）。核心断言：
//   · 贴墙走的人在拐角沿本体触发；中巷/对侧按几何各差一小步
//   · 显形线就是可见线：跨线 ⟺ 视线不再被墙截断（逐点等价）
//   · 背向北归穿区不触发；区外/线北任何朝向不触发
//   · 冷却期不复触发、冷却后可重复；单拍节奏比 v1.12 砍半
// ============================================================

const G = CORNER_SCARE.gate;
const K = CORNER_SCARE.corner;
const R = CORNER_SCARE.reveal;
const makeTrig = (onFire) =>
  cornerTrigger(CORNER_SCARE, onFire, {
    fov: CORNER_SCARE.fov, cooldown: CORNER_SCARE.cooldown
  });
// 显形线上的跨线 z（给定 x）：0.85(z+26.8) = 0.2(x-8.05) 的解
const crossZ = (x) => K.z + ((K.z - R.z) / (K.x - R.x)) * (x - K.x);

/** 以固定帧率沿 x 直线南行/北归（步速与 FirstPersonControls 同量级） */
function walkLine(trig, { yaw, fromZ, toZ, x = 9.3, fps = 60, speed = 4.2 }) {
  const dt = 1 / fps;
  const dir = Math.sign(toZ - fromZ);
  for (let z = fromZ; dir > 0 ? z < toZ : z > toZ; z += dir * speed * dt) {
    trig.update({ x, z, yaw }, dt);
  }
}

describe('拐角触发器 v2：视线越过拐角的那一帧才是扳机', () => {
  it('顺巷南行（面朝南，垃圾箱·后门在视锥内）→ 跨线即触发一次', () => {
    const fire = vi.fn();
    walkLine(makeTrig(fire), { yaw: 0, fromZ: -20, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('背向北归（面朝北）穿过口袋区 → 不触发', () => {
    const fire = vi.fn();
    walkLine(makeTrig(fire), { yaw: Math.PI, fromZ: -28, toZ: -20 });
    expect(fire).not.toHaveBeenCalled();
  });

  it('跨线后面朝东墙驻留 → 不触发；转回西南方向的瞬间 → 触发', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    const dt = 1 / 60;
    const P = { x: 9.3, z: -26.8 }; // 线南 0.29m、口袋区内
    // 面朝东（背对拐角目标）站着：怎么呆都不触发
    for (let i = 0; i < 120; i++) trig.update({ x: P.x, z: P.z, yaw: -Math.PI / 2 }, dt);
    expect(fire).not.toHaveBeenCalled();
    // 慢慢转回去：视线一进 ±fov/2 锥就触发（不用完全对正）
    let yaw = -Math.PI / 2;
    let fired = -1;
    for (let i = 0; i < 180 && fire.mock.calls.length === 0; i++) {
      yaw += 0.02;
      trig.update({ x: P.x, z: P.z, yaw }, dt);
      fired = yaw;
    }
    expect(fire).toHaveBeenCalledTimes(1);
    // 触发时还没转到正对目标（atan2 求出的正对角）——「即将看见」即引爆
    const want = Math.atan2(-(CORNER_SCARE.lookAt.x - P.x), -(CORNER_SCARE.lookAt.z - P.z));
    expect(fired).toBeLessThan(want);
  });

  it('线北/区外任何朝向都不触发（巷中段/出生点/口袋区外的空地深处）', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    const dt = 1 / 60;
    for (const pose of [
      { x: 9.3, z: -20, yaw: 0 }, { x: 9.3, z: -20, yaw: Math.PI },
      { x: 9.3, z: -26.3, yaw: 0 },              // 线北 0.2m：即使朝向正确也不触发
      { x: 9.3, z: -29.5, yaw: 0.9 },            // 线南但已出口袋区（gate r=1.6）
      { x: SPAWN.x, z: SPAWN.z, yaw: 0 }, { x: SPAWN.x, z: SPAWN.z, yaw: 2 }
    ]) {
      for (let i = 0; i < 90; i++) trig.update(pose, dt);
    }
    expect(fire).not.toHaveBeenCalled();
  });

  it('冷却期内驻留/复跨不复触发；冷却走完再跨 → 可重复触发', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    walkLine(trig, { yaw: 0, fromZ: -20, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1);
    expect(trig.armed()).toBe(false); // 冷却中——接近段恐惧以此静音
    // 冷却半程反复站在线南：无效
    for (let t = 0; t < CORNER_SCARE.cooldown * 0.5; t += 0.5) {
      trig.update({ x: 9.3, z: -27.05, yaw: 0 }, 0.5);
    }
    expect(fire).toHaveBeenCalledTimes(1);
    // 冷却走完：再走一遍主路径 → 再次触发
    for (let t = 0; t < CORNER_SCARE.cooldown; t += 0.5) {
      trig.update({ x: 9.3, z: -20, yaw: 0 }, 0.5);
    }
    expect(trig.armed()).toBe(true);
    walkLine(trig, { yaw: 0, fromZ: -20, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(2);
  });

  it('force() 冒烟钩子直接引爆，并进入冷却', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    trig.force();
    expect(fire).toHaveBeenCalledTimes(1);
    walkLine(trig, { yaw: 0, fromZ: -20, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1); // 冷却中不复触发
  });

  it('yaw 多圈卷绕（4π 偏移）不影响判角', () => {
    const fire = vi.fn();
    walkLine(makeTrig(fire), { yaw: Math.PI * 4, fromZ: -20, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('低帧率（15fps 软渲染）主路径仍触发', () => {
    const fire = vi.fn();
    walkLine(makeTrig(fire), { yaw: 0, fromZ: -20, toZ: -28, fps: 15 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('参数与展厅导出一致（fov ≤ π / 冷却 ≥45s 可重复 / 口袋区半径合理）', () => {
    expect(CORNER_SCARE.fov).toBeGreaterThan(0);
    expect(CORNER_SCARE.fov).toBeLessThanOrEqual(Math.PI);
    expect(CORNER_SCARE.cooldown).toBeGreaterThanOrEqual(45);
    expect(Number.isFinite(CORNER_SCARE.cooldown)).toBe(true); // 冷却有限 → 可重复
    expect(G.r).toBeGreaterThanOrEqual(1.0);
    expect(G.r).toBeLessThanOrEqual(4);
    // 拐角沿 K 就是剧场侧墙实体南端点（显形线锚在真实遮挡几何上）
    expect(K.x).toBeCloseTo(THEATER_WALL.sideX, 5);
    expect(K.z).toBeCloseTo(THEATER_WALL.sideZ0, 5);
  });

  it('lookAt 确在「垃圾箱·后门」一侧（口袋区的西南方向）', () => {
    expect(CORNER_SCARE.lookAt.x).toBeLessThan(G.x);
    expect(CORNER_SCARE.lookAt.z).toBeLessThan(G.z);
  });
});

describe('拐角触发几何：主惊吓就长在必经之路上', () => {
  const insideAny = (x, z) =>
    WALK_RECTS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  const insideGate = (x, z) => Math.hypot(x - G.x, z - G.z) < G.r;

  it('口袋区圆心与中巷跨线点都在 walkable 内', () => {
    expect(insideAny(G.x, G.z)).toBe(true);
    expect(insideAny(9.3, crossZ(9.3))).toBe(true);
  });

  it('文档路线（沿建筑右侧→票亭转角→暗巷到底）自然触发恰一次', () => {
    const clamp = multiRectBounds(WALK_RECTS);
    const fire = vi.fn();
    const trig = makeTrig(fire);
    const p = { x: SPAWN.x, z: SPAWN.z };
    const dt = 1 / 60;
    const speed = 4.2;
    for (const [wx, wz] of [[2, -8], [6.5, -11], [9.3, -12.8], [9.3, -29.5]]) {
      let guard = 0;
      while (Math.hypot(wx - p.x, wz - p.z) > 0.3 && ++guard < 2600) {
        const dx = wx - p.x;
        const dz = wz - p.z;
        const d = Math.hypot(dx, dz) || 1;
        p.x += (dx / d) * speed * dt;
        p.z += (dz / d) * speed * dt;
        clamp(p);
        // 真人往哪走脸就朝哪（walkPath 同口径）
        trig.update({ x: p.x, z: p.z, yaw: Math.atan2(-dx / d, -dz / d) }, dt);
      }
    }
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('空间错位落点在 walkable 内、且在口袋区与转身武装区之外（醒来不许立刻再吓）', () => {
    expect(insideAny(WAKE_POINT.x, WAKE_POINT.z)).toBe(true);
    expect(insideGate(WAKE_POINT.x, WAKE_POINT.z)).toBe(false);
    expect(SCARE_REGION.some((r) =>
      WAKE_POINT.x >= r.minX && WAKE_POINT.x <= r.maxX &&
      WAKE_POINT.z >= r.minZ && WAKE_POINT.z <= r.maxZ
    )).toBe(false);
  });

  it('出生点远在口袋区外', () => {
    expect(insideGate(SPAWN.x, SPAWN.z)).toBe(false);
  });
});

// 线段 p→q 是否被侧墙（x=sideX, z∈[sideZ0,sideZ1]）或后墙
// （z=backZ, x≤backX）截断（与 v1.12 同一套遮挡验算）
const W = THEATER_WALL;
const blocked = (p, q) => {
  const dx = q.x - p.x;
  const dz = q.z - p.z;
  if (Math.abs(dx) > 1e-9) {
    const t = (W.sideX - p.x) / dx;
    if (t > 0 && t < 1) {
      const z = p.z + dz * t;
      if (z >= W.sideZ0 && z <= W.sideZ1) return true;
    }
  }
  if (Math.abs(dz) > 1e-9) {
    const t = (W.backZ - p.z) / dz;
    if (t > 0 && t < 1) {
      const x = p.x + dx * t;
      if (x <= W.backX) return true;
    }
  }
  return false;
};

describe('v1.22 门禁 100：显形线就是可见线（触发时机 = 看见时机，逐点等价）', () => {
  it('贴墙走的人（x=8.5）在拐角沿本体跨线（|Δz| ≤ 0.05m）', () => {
    expect(Math.abs(crossZ(8.5) - CORNER_EDGE.z)).toBeLessThanOrEqual(0.05);
  });

  it('中巷线（x=9.3）跨线点距拐角沿 ≤0.3m（v1.12 的 0.65m 再砍半）、不晚于拐角以南 0.1m', () => {
    expect(crossZ(9.3) - CORNER_EDGE.z).toBeLessThanOrEqual(0.3);
    expect(crossZ(9.3) - CORNER_EDGE.z).toBeGreaterThanOrEqual(-0.1);
  });

  it('靠对侧走的人（x=10.0）按几何提前一小步（口袋先张开），但仍 ≤0.5m', () => {
    expect(crossZ(10.0)).toBeGreaterThan(crossZ(9.3)); // 对侧先跨线
    expect(crossZ(10.0) - CORNER_EDGE.z).toBeLessThanOrEqual(0.5);
  });

  it('逐点等价：巷内采样网格上「跨过显形线」⟺「到藏身点的视线不被墙截断」', () => {
    const trig = makeTrig(() => {});
    for (const x of [8.5, 9.0, 9.3, 9.7, 10.0]) {
      for (const z of [-28, -27.4, -26.9, -26.3, -25.6, -24.8]) {
        const p = { x, z };
        expect(trig.revealed(p), `(${x},${z}) 跨线判定与视线遮挡不一致`)
          .toBe(!blocked(p, R));
      }
    }
  });

  it('老病灶回归钉：直巷段 z≥-26.3（线北）绝不触发——跨线那一帧才是扳机', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    walkLine(trig, { yaw: 0, fromZ: -20, toZ: -26.3 });
    expect(fire).not.toHaveBeenCalled(); // v1.8–v1.10 在 -23.6 就炸、v1.11 -25.3、v1.12 -26.05
    walkLine(trig, { yaw: 0, fromZ: -26.3, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('与巷中恐惧拍（圆心 z=-21.5 r2.6）不同拍：跨线点在恐惧区以南', () => {
    expect(crossZ(9.3)).toBeLessThan(-24.1); // 恐惧拍南缘 -24.1——两拍之间留出走路的空隙
  });

  it('接近段恐惧的数据自洽：q 终点贴在跨线点以北、涨落区间覆盖巷中段', () => {
    expect(APPROACH_DREAD.z1).toBeGreaterThanOrEqual(crossZ(9.3) - 0.15);
    expect(APPROACH_DREAD.z0 - APPROACH_DREAD.z1).toBeGreaterThanOrEqual(6); // 至少 6m 的涨程
    expect(APPROACH_DREAD.swellAt).toBeGreaterThan(APPROACH_DREAD.rearmBelow);
  });
});

describe('v1.22 门禁 100：黑影从拐角处闪出（REVEAL_PATH 贴角滑出守卫）', () => {
  const bez = (s) => {
    const u = 1 - s;
    const { poise: A, corner: B, out: C } = REVEAL_PATH;
    return {
      x: u * u * A.x + 2 * u * s * B.x + s * s * C.x,
      z: u * u * A.z + 2 * u * s * B.z + s * s * C.z
    };
  };

  it('藏身点就是显形线另一端（单一数据源：poise === CORNER_SCARE.reveal）', () => {
    expect(REVEAL_PATH.poise).toBe(CORNER_SCARE.reveal);
  });

  it('藏身点从线北任何可达采样点看，视线都被墙截断（现身不穿帮）', () => {
    const samples = [
      { x: 9.3, z: -24.6 },  // 冒烟停点（跨线前一步）
      { x: 9.3, z: -26.4 },  // 中巷线跨线点以北 0.1m
      { x: 9.3, z: -22 },    // 巷中段
      { x: 8.5, z: -26.5 },  // 贴墙走、还没到拐角沿
      { x: 10.0, z: -26.25 } // 对侧、还没跨自己那条线（对侧线 z≈-26.34）
    ];
    for (const p of samples) {
      expect(blocked(p, REVEAL_PATH.poise), `(${p.x},${p.z}) 竟能直视藏身点`).toBe(true);
    }
  });

  it('现身定点贴拐角沿（≤0.45m）——「从拐角处闪出来」落在拐角本体', () => {
    const d = Math.hypot(REVEAL_PATH.out.x - CORNER_EDGE.x, REVEAL_PATH.out.z - CORNER_EDGE.z);
    expect(d).toBeLessThanOrEqual(0.45);
  });

  it('滑出弧线贴角不回头：x 单调东进、中点擦着墙南端点（≤0.35m）', () => {
    let prevX = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const p = bez(i / 20);
      expect(p.x).toBeGreaterThanOrEqual(prevX - 1e-9);
      prevX = p.x;
    }
    const mid = bez(0.5);
    expect(Math.hypot(mid.x - K.x, mid.z - K.z)).toBeLessThanOrEqual(0.35);
    const end = bez(1);
    expect(end.x).toBe(REVEAL_PATH.out.x);
    expect(end.z).toBe(REVEAL_PATH.out.z);
  });

  it('现身定点离跨线中的玩家 ~0.9m（贴脸但不重叠）', () => {
    const player = { x: 9.3, z: crossZ(9.3) }; // 中巷线跨线点（触发帧的典型位置）
    const d = Math.hypot(player.x - REVEAL_PATH.out.x, player.z - REVEAL_PATH.out.z);
    expect(d).toBeGreaterThan(0.55);
    expect(d).toBeLessThan(2.0);
  });
});

describe('单拍节奏 SCARE_BEATS：原片的凌厉是砍出来的', () => {
  it('节拍严格递增：reveal → stare → rush → shock → blackout → wake，且 reveal=0', () => {
    expect(SCARE_BEATS.reveal).toBe(0);
    const seq = ['reveal', 'stare', 'rush', 'shock', 'blackout', 'wake']
      .map((k) => SCARE_BEATS[k]);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i], `节拍 ${i} 未递增`).toBeGreaterThan(seq[i - 1]);
    }
  });

  it('闪出是闪出：滑出窗 ≤700ms（v1.12 的 2.4s 顿挪前奏退役）', () => {
    expect(SCARE_BEATS.stare - SCARE_BEATS.reveal).toBeLessThanOrEqual(700);
    expect(SCARE_BEATS.stare - SCARE_BEATS.reveal).toBeGreaterThanOrEqual(350); // 也不是瞬移
  });

  it('错拍确实存在：它出角后先死死看你 ≥600ms，什么都不做', () => {
    expect(SCARE_BEATS.rush - SCARE_BEATS.stare).toBeGreaterThanOrEqual(600);
  });

  it('扑近到闷击 ≤500ms（快拍）；全程 ≤4.5s（比 v1.12 的 6.5s 砍半，不拖过场）', () => {
    expect(SCARE_BEATS.shock - SCARE_BEATS.rush).toBeLessThanOrEqual(500);
    expect(SCARE_BEATS.wake).toBeLessThanOrEqual(4500);
  });

  it('镜头特写数据自洽：入锁窗 ≤ 滑出窗、推近幅度克制（≤18°）、头高在身高内', () => {
    expect(CLOSEUP.grabIn * 1000).toBeLessThanOrEqual(SCARE_BEATS.stare);
    expect(CLOSEUP.fovPush).toBeGreaterThan(0);
    expect(CLOSEUP.fovPush).toBeLessThanOrEqual(18);
    expect(CLOSEUP.headY).toBeGreaterThan(1.68); // 俯不下去——它比你高
    expect(CLOSEUP.headY).toBeLessThan(2.35);
  });
});

describe('顿挪缓动 lurchEase：一顿一顿，不是匀速滑（kit 纯函数，魅影体态曲线仍在用）', () => {
  it('端点正确且单调不减', () => {
    expect(lurchEase(0)).toBe(0);
    expect(lurchEase(1)).toBeCloseTo(1);
    let prev = -1;
    for (let i = 0; i <= 400; i++) {
      const v = lurchEase(i / 400);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('每步后段死死停住（三步各有平台段）', () => {
    for (let step = 0; step < 3; step++) {
      const a = lurchEase((step + 0.6) / 3);
      const b = lurchEase((step + 0.99) / 3);
      expect(a, `第 ${step + 1} 步平台段不平`).toBeCloseTo(b, 10);
      expect(a).toBeCloseTo((step + 1) / 3, 10); // 停在整步位上
    }
  });

  it('每步前段确实在挪（不是全程冻结）', () => {
    for (let step = 0; step < 3; step++) {
      expect(lurchEase((step + 0.1) / 3)).toBeLessThan(lurchEase((step + 0.35) / 3));
    }
  });

  it('越界输入被钳制', () => {
    expect(lurchEase(-1)).toBe(0);
    expect(lurchEase(2)).toBeCloseTo(1);
  });
});

describe('源码级门禁：显形线主触发接线、镜头特写接管、接近段恐惧、字幕合规', () => {
  const src = readFileSync(new URL('../src/halls/mulholland.js', import.meta.url), 'utf8');

  it('cornerTrigger v2 以展厅导出数据接线，且 corner-scare 已入 eggs 表', () => {
    expect(src).toContain('cornerTrigger(CORNER_SCARE, doCornerScare');
    expect(src).toContain("'corner-scare': cornerTrig");
    expect(src).toContain("'turn-scare': turnTrig"); // v1.7 第二扳机保留
  });

  it('单拍素材全接线：灯灭/刮擦/心跳/抽真空/冲击闪帧/黑幕/错位传送', () => {
    expect(src).toContain("audio.sfx('lampoff', 0.4)");
    expect(src).toContain("audio.sfxAt('scrape', CORNER_EDGE.x, CORNER_EDGE.z");
    expect(src).toContain("audio.sfx('heartbeat'");
    expect(src).toContain('audio.duck(');
    expect(src).toContain('engine.shock(1, 0.9, 0x1a0000)');
    expect(src).toContain('ui.fade(true)');
    expect(src).toContain('teleport(WAKE_POINT.x, WAKE_POINT.z');
  });

  it('reveal 帧灯一口气全灭（狂闪前奏退役——原片的黑一步到位）', () => {
    expect(src).toMatch(/lampPanic\.v = 0;\s*\n\s*lampDread\.v = 0;\s*\n\s*lampKill\.v = 1;/);
    // v1.24 改钉留账：跨线帧低频升压改走惊吓直通总线（第 4 参 punch）——
    // 旧钉 sfx('dreadswell', 0.75) 只多了路由参数，音色与推子未动
    expect(src).toContain("audio.sfx('dreadswell', 0.75, 0, true)");
  });

  it('镜头特写接管接线：pitch/yaw 链取自 camera 父链、smoothstep 入锁、FOV 推近与归还', () => {
    expect(src).toContain('engine.camera.parent');
    expect(src).toContain('const k = g * g * (3 - 2 * g)');
    expect(src).toContain('CLOSEUP.fovPush');
    expect(src).toContain('updateProjectionMatrix');
    // 双脚钉死在跨线点 + 黑幕帧/wakeUp 双保险归还
    expect(src).toContain('grab.pin.x');
    expect(src.match(/releaseGrab\(\)/g).length).toBeGreaterThanOrEqual(2);
  });

  it('接近段恐惧接线：APPROACH_DREAD 导出、lampDread 通道进两盏巷灯、armed() 静音门', () => {
    expect(src).toContain('export const APPROACH_DREAD');
    expect(src.match(/lampDread\.v \* 0\.42/g)?.length).toBe(2);
    expect(src).toContain('!cornerTrig.armed()');
    expect(src).toContain('2.1 - q * 1.45'); // 心跳渐密（间隔 2.1s → 0.65s）
    expect(src).toContain("audio.sfx('dreadswell', 0.3)"); // 半程一次低频升压
  });

  it('v1.10 P7 雾涌：两重惊吓的 rush 拍都接了 fogSurge（世界跟着收紧）', () => {
    // 拐角惊吓 + 转身惊吓各一处（同一恐惧语言）
    expect(src.match(/engine\.fogSurge\(/g)?.length).toBeGreaterThanOrEqual(2);
    // 引擎侧：乘法瞬态 + 主循环指数衰减 + 低档不豁免（纯标量零带宽）
    const eng = readFileSync(new URL('../src/core/engine.js', import.meta.url), 'utf8');
    expect(eng).toContain('fogSurge(amount');
    expect(eng).toContain('this._fogSurge *= Math.exp(-dt');
    expect(eng).toMatch(/fd \*= 1 \+ this\._fogSurge/);
  });

  it('形体：拐角魅影 cornerWraith 兜底在岗（帷形人影留给转身扳机）+ 剪影光', () => {
    expect(src).toContain('cornerWraith(');
    expect(src).toContain('veiledFigure(');
    expect(src).toContain('rimLight');
  });

  it('v1.12 魅影 v3：披垂发帘 + 成绺长发 + 眼窝空洞（环红芯黑）+ 头枢轴 / 破披三指保留', () => {
    const kit = readFileSync(new URL('../src/halls/kit.js', import.meta.url), 'utf8');
    expect(kit).not.toContain('hoodVoid');   // 兜帽语言退役——换披发语言
    expect(kit).toContain('hairMat');        // 发丝材质（冷暗高光）
    expect(kit).toContain('hemTear');        // 下摆 seeded 参差发梢
    expect(kit).toContain('strandAngles');   // 成绺长发
    expect(kit).toContain('eyeMat');         // 眼窝外环（极暗红 emissive）
    expect(kit).toContain('voidMat');        // 眼窝内芯（纯黑无光）
    expect(kit).toContain('headPivot');      // 顿挪抬头的头枢轴
    expect(kit).toContain('capeGeo');        // v1.11 破披保留
    expect(kit).toContain('fingerGeos');     // v1.11 三指保留
    // 发帘是局部车削：前脸留开口（洞里是眼窝），不是整圈罩住
    expect(kit).toMatch(/LatheGeometry\(\s*hairProf, 40, OPEN_HALF, Math\.PI \* 2 - OPEN_HALF \* 2\)/);
    const lurchBody = /setLurch = \(s, t = 0\) => \{[^]*?\};/.exec(kit)?.[0] ?? '';
    // 身体冻住时红光在呼吸（v1.11 保留）
    expect(lurchBody).toMatch(/emissiveIntensity = [^;]*Math\.sin\(t/);
    // 越挪越前倾（v1.11 保留）
    expect(lurchBody).toMatch(/rotation\.x = 0\.12 \+ s \*/);
    // v1.12：头一档一档抬起（headPivot 随 s 后仰，平台段随 s 冻住）
    expect(lurchBody).toMatch(/headPivot\.rotation\.x = -\(0\.06 \+ s \*/);
    // v1.12：眼窝环呼吸（与红光错相位）
    expect(lurchBody).toMatch(/eyeMat\.emissiveIntensity = [^;]*Math\.sin\(t/);
    // v1.12 抛光：身体冻住时发帘还在极缓地摆（t 基慢摆钟频率与身体拍
    // 无关——惯性没停，它不是雕像）
    expect(lurchBody).toMatch(/hair\.rotation\.z = Math\.sin\(t \* 1\.7\)/);
    expect(lurchBody).toMatch(/hair\.rotation\.x = Math\.sin\(t \* 1\.15/);
    // rush 拍眼窝烧起来 + 发帘后甩叠高频扑动（锚在 cornerWraith 段内——
    // veiledFigure 也有 setRush）
    const wraithSrc = kit.slice(kit.indexOf('export function cornerWraith'));
    const rushBody = /setRush = \(k, t = 0\) => \{[^]*?\};/.exec(wraithSrc)?.[0] ?? '';
    expect(rushBody).toMatch(/eyeMat\.emissiveIntensity = 1\.2 \+ k \*/);
    expect(rushBody).toMatch(/hair\.rotation\.x = -0\.14 \* k/);
    expect(rushBody).toMatch(/hair\.rotation\.z = Math\.sin\(t \* 13\)/);
  });

  it('v1.22 冒烟路径同步：routeA 停在显形线以北、进区步落在线南 ≥0.24m', () => {
    const cjs = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    expect(cjs).toContain('[9.3, -24.6]');    // 停点在跨线点 z≈-26.51 以北
    expect(cjs).toContain('[[9.3, -27.05]]'); // 进区步终点（0.3m 容差后仍在线南）
    expect(cjs).not.toContain('[[9.3, -27.2]]'); // v1.12 圆区进区步必须消失
    expect(cjs).not.toContain('[9.3, -23.2]');   // 老停点（直巷中段）必须消失
  });

  it('v1.22 闪出路径接线：reveal 拍走 revealBez 贝塞尔、刮擦声钉在拐角沿', () => {
    expect(src).toContain('revealBez(s, wraith.position)');
    expect(src).toContain("audio.sfxAt('scrape', CORNER_EDGE.x, CORNER_EDGE.z");
    // 闪出体态复用 setLurch 曲线（仅换驱动进度，曲线不动）
    expect(src).toContain('wraith.userData.setLurch(s, t)');
    expect(src).toContain('wraith.userData.setLurch(1, t)'); // 错拍冻结位
  });

  it('展厅字幕全部 ≤22 字（门禁 19 口径）', () => {
    for (const m of src.matchAll(/ui\.caption\('([^']+)'/g)) {
      expect(m[1].length, `字幕超长: ${m[1]}`).toBeLessThanOrEqual(22);
    }
  });

  it('运行时冒烟门禁未回退：INTERACTIVE_MIN mulholland ≥ 18（+墙角刮痕）', () => {
    const cjs = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    const m = /mulholland:\s*(\d+)/.exec(cjs);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(18);
  });
});
