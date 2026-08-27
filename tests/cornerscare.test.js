import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { cornerTrigger, lurchEase, multiRectBounds } from '../src/halls/kit.js';
import {
  CORNER_SCARE, CORNER_EDGE, THEATER_WALL, LURK_PATH,
  SCARE_BEATS, WAKE_POINT, WALK_RECTS, SCARE_REGION, SPAWN
} from '../src/halls/mulholland.js';

// ============================================================
// v1.8 门禁 44/45：拐角惊吓（主触发）—— 纯逻辑仿真。
// 与运行时同一个 cornerTrigger + 同一份 CORNER_SCARE/SCARE_BEATS 数据。
// 核心断言：
//   · 顺巷南行、垃圾箱·后门方向即将入画 → 进区即触发（主路径）
//   · 背向北归穿区 → 永不触发（不吓走回头路的人）
//   · 面朝墙进区 → 转回那个方向的瞬间才触发（「即将看见」才是扳机）
//   · 区外任何朝向不触发；冷却期不复触发、冷却后可重复
//   · 多幕节拍次序与留白（SCARE_BEATS）；顿挪缓动确实一顿一顿
// ============================================================

const Z = CORNER_SCARE.zone;
const makeTrig = (onFire) =>
  cornerTrigger(Z, CORNER_SCARE.lookAt, onFire, {
    fov: CORNER_SCARE.fov, cooldown: CORNER_SCARE.cooldown
  });

/** 以固定帧率沿 x=Z.x 直线南行/北归（步速与 FirstPersonControls 同量级） */
function walkLine(trig, { yaw, fromZ, toZ, x = Z.x, fps = 60, speed = 4.2 }) {
  const dt = 1 / fps;
  const dir = Math.sign(toZ - fromZ);
  for (let z = fromZ; dir > 0 ? z < toZ : z > toZ; z += dir * speed * dt) {
    trig.update({ x, z, yaw }, dt);
  }
}

describe('拐角触发器：转过拐角那一步才是扳机', () => {
  it('顺巷南行（面朝南，垃圾箱·后门在视锥内）→ 进区即触发一次', () => {
    const fire = vi.fn();
    walkLine(makeTrig(fire), { yaw: 0, fromZ: -20, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('背向北归（面朝北）穿区 → 不触发', () => {
    const fire = vi.fn();
    walkLine(makeTrig(fire), { yaw: Math.PI, fromZ: -28, toZ: -20 });
    expect(fire).not.toHaveBeenCalled();
  });

  it('面朝东墙进区驻留 → 不触发；转回西南方向的瞬间 → 触发', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    const dt = 1 / 60;
    // 面朝东（背对拐角目标）站在区中心：怎么呆都不触发
    for (let i = 0; i < 120; i++) trig.update({ x: Z.x, z: Z.z, yaw: -Math.PI / 2 }, dt);
    expect(fire).not.toHaveBeenCalled();
    // 慢慢转回去：视线一进 ±fov/2 锥就触发（不用完全对正）
    let yaw = -Math.PI / 2;
    let fired = -1;
    for (let i = 0; i < 180 && fire.mock.calls.length === 0; i++) {
      yaw += 0.02;
      trig.update({ x: Z.x, z: Z.z, yaw }, dt);
      fired = yaw;
    }
    expect(fire).toHaveBeenCalledTimes(1);
    // 触发时还没转到正对目标（atan2 求出的正对角）——「即将看见」即引爆
    const want = Math.atan2(-(CORNER_SCARE.lookAt.x - Z.x), -(CORNER_SCARE.lookAt.z - Z.z));
    expect(fired).toBeLessThan(want);
  });

  it('区外任何朝向都不触发（巷中段/出生点）', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    const dt = 1 / 60;
    for (const pose of [
      { x: 9.3, z: -20, yaw: 0 }, { x: 9.3, z: -20, yaw: Math.PI },
      { x: SPAWN.x, z: SPAWN.z, yaw: 0 }, { x: SPAWN.x, z: SPAWN.z, yaw: 2 }
    ]) {
      for (let i = 0; i < 90; i++) trig.update(pose, dt);
    }
    expect(fire).not.toHaveBeenCalled();
  });

  it('冷却期内驻留/复进不复触发；冷却走完再进 → 可重复触发', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    walkLine(trig, { yaw: 0, fromZ: -20, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1);
    // 冷却半程反复穿区：无效
    for (let t = 0; t < CORNER_SCARE.cooldown * 0.5; t += 0.5) {
      trig.update({ x: Z.x, z: Z.z, yaw: 0 }, 0.5);
    }
    expect(fire).toHaveBeenCalledTimes(1);
    // 冷却走完：再走一遍主路径 → 再次触发
    for (let t = 0; t < CORNER_SCARE.cooldown; t += 0.5) {
      trig.update({ x: 9.3, z: -20, yaw: 0 }, 0.5);
    }
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

  it('参数与展厅导出一致（fov ≤ π / 冷却 ≥45s 可重复 / 触发区半径合理）', () => {
    expect(CORNER_SCARE.fov).toBeGreaterThan(0);
    expect(CORNER_SCARE.fov).toBeLessThanOrEqual(Math.PI);
    expect(CORNER_SCARE.cooldown).toBeGreaterThanOrEqual(45);
    expect(Number.isFinite(CORNER_SCARE.cooldown)).toBe(true); // 冷却有限 → 可重复
    // v1.12 贴角化：半径下限放宽到 1.0（更小的区才贴得住拐角）；
    // 低帧兜底另有守卫（15fps 主路径仍触发）
    expect(Z.r).toBeGreaterThanOrEqual(1.0);
    expect(Z.r).toBeLessThanOrEqual(4);
  });

  it('lookAt 确在「垃圾箱·后门」一侧（触发区的西南方向）', () => {
    expect(CORNER_SCARE.lookAt.x).toBeLessThan(Z.x);
    expect(CORNER_SCARE.lookAt.z).toBeLessThan(Z.z);
  });
});

describe('拐角触发区几何：主惊吓就长在必经之路上', () => {
  const insideAny = (x, z) =>
    WALK_RECTS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  const insideZone = (x, z) => Math.hypot(x - Z.x, z - Z.z) < Z.r;

  it('触发区圆心与北缘入口都在 walkable 内', () => {
    expect(insideAny(Z.x, Z.z)).toBe(true);
    expect(insideAny(Z.x, Z.z + Z.r * 0.9)).toBe(true);
  });

  it('文档路线（沿建筑右侧→票亭转角→暗巷到底）必然穿过触发区', () => {
    const clamp = multiRectBounds(WALK_RECTS);
    const p = { x: SPAWN.x, z: SPAWN.z };
    const dt = 1 / 60;
    const speed = 4.2;
    let crossed = false;
    for (const [wx, wz] of [[2, -8], [6.5, -11], [9.3, -12.8], [9.3, -29.5]]) {
      let guard = 0;
      while (Math.hypot(wx - p.x, wz - p.z) > 0.3 && ++guard < 2600) {
        const dx = wx - p.x;
        const dz = wz - p.z;
        const d = Math.hypot(dx, dz) || 1;
        p.x += (dx / d) * speed * dt;
        p.z += (dz / d) * speed * dt;
        clamp(p);
        if (insideZone(p.x, p.z)) crossed = true;
      }
    }
    expect(crossed).toBe(true);
  });

  it('空间错位落点在 walkable 内、且在拐角区与转身武装区之外（醒来不许立刻再吓）', () => {
    expect(insideAny(WAKE_POINT.x, WAKE_POINT.z)).toBe(true);
    expect(insideZone(WAKE_POINT.x, WAKE_POINT.z)).toBe(false);
    expect(SCARE_REGION.some((r) =>
      WAKE_POINT.x >= r.minX && WAKE_POINT.x <= r.maxX &&
      WAKE_POINT.z >= r.minZ && WAKE_POINT.z <= r.maxZ
    )).toBe(false);
  });

  it('出生点远在触发区外', () => {
    expect(insideZone(SPAWN.x, SPAWN.z)).toBe(false);
  });
});

describe('v1.12 门禁 59：触发时机钉死在拐角处（几何守卫，v1.11 的 1.4m 再收紧）', () => {
  // 顺巷南行（x=Z.x）最早可触发点 = 触发区北缘
  const zEnter = Z.z + Z.r;

  it('北缘贴着拐角沿：最早触发点距拐角 ≤0.7m、不晚于拐角以南 0.3m', () => {
    expect(zEnter - CORNER_EDGE.z).toBeLessThanOrEqual(0.7);  // v1.11 为 1.4m——用户仍嫌不贴角
    expect(zEnter - CORNER_EDGE.z).toBeGreaterThanOrEqual(-0.3); // 不晚
  });

  it('老病灶回归钉（v1.12 收紧）：直巷段 z≥-25.8 绝不触发——转过拐角那半步才是扳机', () => {
    const fire = vi.fn();
    const trig = makeTrig(fire);
    walkLine(trig, { yaw: 0, fromZ: -20, toZ: -25.8 });
    expect(fire).not.toHaveBeenCalled(); // v1.8–v1.10 在 -23.6 就炸、v1.11 在 -25.3
    walkLine(trig, { yaw: 0, fromZ: -25.8, toZ: -28 });
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('与巷中恐惧拍（圆心 z=-21.5 r2.6）不同拍：触发区北缘在恐惧区以南', () => {
    expect(zEnter).toBeLessThan(-24.1); // 恐惧拍南缘 -24.1——两拍之间必须留出走路的空隙
  });

  it('拐角沿数据自洽：拐角在巷的西侧、后墙一线', () => {
    expect(CORNER_EDGE.x).toBeLessThan(Z.x);
    expect(CORNER_EDGE.z).toBeCloseTo(-26.7, 1);
  });
});

describe('v1.12 门禁 59：黑影从拐角处挪出来（LURK_PATH 贝塞尔绕角守卫）', () => {
  const bez = (s) => {
    const u = 1 - s;
    const { hide: A, corner: B, out: C } = LURK_PATH;
    return {
      x: u * u * A.x + 2 * u * s * B.x + s * s * C.x,
      z: u * u * A.z + 2 * u * s * B.z + s * s * C.z
    };
  };
  const W = THEATER_WALL;
  // 线段 p→q 是否被侧墙（x=sideX, z∈[sideZ0,sideZ1]）或后墙
  // （z=backZ, x≤backX）截断
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

  it('藏点在剧场体内（侧墙正后方）：x<侧墙、z 在后墙以北', () => {
    expect(LURK_PATH.hide.x).toBeLessThan(W.sideX);
    expect(LURK_PATH.hide.z).toBeGreaterThan(W.backZ);
    expect(LURK_PATH.hide.z).toBeLessThan(W.sideZ1);
  });

  it('从巷/空地任何可达采样点看藏点，视线都被墙截断（现身不穿帮）', () => {
    const samples = [
      { x: Z.x, z: Z.z + Z.r },   // 触发区北缘（最早触发点）
      { x: Z.x, z: Z.z },         // 区中心
      { x: Z.x, z: Z.z - Z.r },   // 区南缘（触发后继续走）
      { x: 9.9, z: -28.5 },       // 空地东段
      { x: 9.3, z: -30.5 },       // 空地东南角
      { x: 8.5, z: -24 }          // 巷内贴墙
    ];
    for (const p of samples) {
      expect(blocked(p, LURK_PATH.hide), `(${p.x},${p.z}) 竟能直视藏点`).toBe(true);
    }
  });

  it('现身点贴拐角沿（≤0.45m）——「从拐角处挪出来」落在拐角本体', () => {
    const d = Math.hypot(LURK_PATH.out.x - CORNER_EDGE.x, LURK_PATH.out.z - CORNER_EDGE.z);
    expect(d).toBeLessThanOrEqual(0.45);
  });

  it('三顿节奏：第一顿平台仍在墙后（只闻其声）、第二顿探出拐角、第三顿全身出角', () => {
    const p1 = bez(lurchEase(0.7 / 3, 3)); // 第一顿平台段
    expect(p1.x).toBeLessThan(W.sideX);    // 还在侧墙后
    const p2 = bez(lurchEase(1.7 / 3, 3)); // 第二顿平台段
    expect(p2.x).toBeGreaterThanOrEqual(W.sideX - 0.05); // 已到墙沿/探出
    expect(p2.z).toBeLessThan(W.sideZ0 + 0.15);          // 从墙南端点（拐角）处出来
    const p3 = bez(1);
    expect(p3.x).toBe(LURK_PATH.out.x);
    expect(p3.z).toBe(LURK_PATH.out.z);
  });

  it('现身点离触发中的玩家 ~1m（贴脸但不重叠）', () => {
    const player = { x: Z.x, z: Z.z + Z.r * 0.5 }; // 触发后半步的典型位置
    const d = Math.hypot(player.x - LURK_PATH.out.x, player.z - LURK_PATH.out.z);
    expect(d).toBeGreaterThan(0.55);
    expect(d).toBeLessThan(2.0);
  });
});

describe('多幕节拍 SCARE_BEATS：够吓人的节奏是排出来的', () => {
  it('节拍严格递增：dread → hush → lurch → rush → shock → blackout → wake', () => {
    const seq = ['dread', 'hush', 'lurch', 'rush', 'shock', 'blackout', 'wake']
      .map((k) => SCARE_BEATS[k]);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i], `节拍 ${i} 未递增`).toBeGreaterThan(seq[i - 1]);
    }
  });

  it('留白确实存在：hush → lurch 之间 ≥ 500ms 万籁俱寂', () => {
    expect(SCARE_BEATS.lurch - SCARE_BEATS.hush).toBeGreaterThanOrEqual(500);
  });

  it('顿挪现身给足时长（≥1800ms，至少三顿）；扑近到闷击 ≤ 900ms（快拍）', () => {
    expect(SCARE_BEATS.rush - SCARE_BEATS.lurch).toBeGreaterThanOrEqual(1800);
    expect(SCARE_BEATS.shock - SCARE_BEATS.rush).toBeLessThanOrEqual(900);
  });

  it('全程 ≤ 8s（惊吓不许拖成过场动画）', () => {
    expect(SCARE_BEATS.wake).toBeLessThanOrEqual(8000);
  });
});

describe('顿挪缓动 lurchEase：一顿一顿，不是匀速滑', () => {
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

describe('源码级门禁：主触发是拐角、多幕素材全接线、字幕合规', () => {
  const src = readFileSync(new URL('../src/halls/mulholland.js', import.meta.url), 'utf8');

  it('cornerTrigger 以展厅导出数据接线，且 corner-scare 已入 eggs 表', () => {
    expect(src).toContain('cornerTrigger(CORNER_SCARE.zone');
    expect(src).toContain("'corner-scare': cornerTrig");
    expect(src).toContain("'turn-scare': turnTrig"); // v1.7 第二扳机保留
  });

  it('多幕素材全接线：刮擦/心跳/抽真空/冲击闪帧/黑幕/错位传送', () => {
    expect(src).toContain("audio.sfxAt('scrape'");
    expect(src).toContain("audio.sfx('heartbeat'");
    expect(src).toContain('audio.duck(');
    expect(src).toContain('engine.shock(1, 0.9, 0x1a0000)');
    expect(src).toContain('ui.fade(true)');
    expect(src).toContain('teleport(WAKE_POINT.x, WAKE_POINT.z');
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

  it('形体升级：拐角魅影 cornerWraith 上台（帷形人影留给转身扳机）+ 剪影光', () => {
    expect(src).toContain('cornerWraith(');
    expect(src).toContain('veiledFigure(');
    expect(src).toContain('rimLight');
  });

  it('v1.11 dread 拍升级：低频升压 dreadswell 接线 + 恐惧拍还灯（狂闪必须看得见）', () => {
    expect(src).toContain("audio.sfx('dreadswell'");
    // doCornerScare 第一幕：先 lampKill 归零再 lampPanic 起（恐惧拍刚灭的灯要还回来）
    expect(src).toMatch(/lampKill\.v = 0;\s*\n\s*lampPanic\.v = 1;/);
    const eng = readFileSync(new URL('../src/audio/engine.js', import.meta.url), 'utf8');
    expect(eng).toContain("case 'dreadswell'");
  });

  it('v1.12 魅影 v3：披垂发帘 + 成绺长发 + 眼窝空洞（环红芯黑）+ 头枢轴 / 破披三指保留', () => {
    const kit = readFileSync(new URL('../src/halls/kit.js', import.meta.url), 'utf8');
    expect(kit).not.toContain('hoodVoid');   // 兜帽语言退役——换披发语言
    expect(kit).toContain('hairMat');        // 发丝材质（冷暗高光）
    expect(kit).toContain('hemTear');        // 下摆 seeded 参差发梢
    expect(kit).toContain('strandAngles');   // 成绺长发 ×9
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
    // rush 拍眼窝烧起来 + 发帘后甩（锚在 cornerWraith 段内——veiledFigure 也有 setRush）
    const wraithSrc = kit.slice(kit.indexOf('export function cornerWraith'));
    const rushBody = /setRush = \(k, t = 0\) => \{[^]*?\};/.exec(wraithSrc)?.[0] ?? '';
    expect(rushBody).toMatch(/eyeMat\.emissiveIntensity = 1\.2 \+ k \*/);
    expect(rushBody).toMatch(/hair\.rotation\.x = -0\.14 \* k/);
  });

  it('v1.12 冒烟路径同步：routeA 停在新北缘外、进区步落在贴角圆心', () => {
    const cjs = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    expect(cjs).toContain('[9.3, -24.6]');   // 停点在北缘 z≈-26.05 外
    expect(cjs).toContain('[[9.3, -27.2]]'); // 进区步 = 贴角圆心（v1.12）
    expect(cjs).not.toContain('[[9.3, -26.9]]'); // v1.11 进区步必须消失
    expect(cjs).not.toContain('[9.3, -23.2]');   // 老停点（直巷中段）必须消失
  });

  it('v1.12 绕角路径接线：lurch 拍走 lurkBez 贝塞尔、刮擦声钉在拐角沿', () => {
    expect(src).toContain('lurkBez(s, wraith.position)');
    expect(src).toContain("audio.sfxAt('scrape', CORNER_EDGE.x, CORNER_EDGE.z");
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
