// ============================================================
// 《穆赫兰道》展厅 —— NIGHT ROAD & THE ILLUSION THEATER
// 夜路 + 路灯 + 剧场 + 蓝色立方体 (梦境反转交互)
// 惊吓（v1.22 显形线换代）：贴原作戏剧节奏——走向拐角的那段路本身
// 是 dread（心跳渐密/巷灯渐次不稳），玩家的视线**即将越过拐角看见
// 墙后之物**的那一帧（显形线几何）才是扳机：灯一口气全灭、它从拐角
// 后闪出、镜头特写接管推向那张脸 → 错拍站住盯你 → 扑近 → 闷击黑幕
// 错位传送。v1.7 转身惊吓保留为暗巷深段/空地的第二重扳机。
// （原创程序化惊吓，无镜头复刻、无对白引用）
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  PALETTE, canvasTexture, curtain, curtainWithValance, neonSign, micStand, doorway,
  smokeLayer, dustField, lightCone, lightCone2, quoteStand, quoteStandUpdater, vitrine,
  veiledFigure, cornerWraith, zoneTrigger, turnTrigger, cornerTrigger,
  multiRectBounds,
  mergedMesh, xform, roundedBoxMesh, brushedMetalTexture, velvetMaterial,
  asphaltMat, woodMat, concreteMat, rng
} from './kit.js';
// v1.15 门禁 72：拐角魅影 GLB（gen_corner_wraith.py 五拍精修定稿）——
// ?inline data URI + 手动 base64 解码绕 electron sandbox fetch 拦截
// （勘破记录见 twinpeaks.js 孪生松）
import wraithGlbUri from '../assets/corner_wraith.glb?inline';
import { propMats, theaterSeats, ticketBooth, phoneBooth, streetLampV2, dressingMirror } from './props.js';
import { quoteById, DOCENT } from '../data/essays.js';

export const meta = {
  id: 'mulholland',
  name: 'MULHOLLAND DR. · 梦境错位 (2001)',
  ambience: 'mulholland',
  narration: 'mulholland',
  space: 'outdoor',
  floorSfx: 'asphalt',
  look: {
    saturation: 0.96, tint: 0xf5eee6, fogColor: 0x0a0705, fogDensity: 0.04,
    bg: 0x030204, exposure: 1.0, bloom: 0.9,
    // v1.4 P4/P5：梦境紫红暗部 + 暖高光（好莱坞夜与霓虹的双重性）
    halation: 0.16,
    grade: { lift: [0.014, 0.004, 0.016], gamma: [1.0, 1.0, 1.03], gain: [1.05, 1.0, 0.96] },
    // v1.9 B1：夜路的雾快而不安（28s，±13%）
    fogPulse: { period: 28, depth: 0.13 }
  }
};

// 场地: 夜路区 + 剧场内部 + 建筑右侧便道 + 暗巷 + 剧场背后的空地（彩蛋区）
// v1.6 后巷通路修通：v1.5 的路面（maxX 4.6）与暗巷（minX 8.4）之间只有北端
// z∈[6.5,12.5] 一个无标记缺口——玩家沿路走到剧场想右拐即撞 x=4.6 的隐形墙。
// 现在建筑右侧全段是一条水泥便道：路上任何一点右拐 → 便道南下 →
// 绕过票亭转角 → 进巷（沿巷东移了电话亭，巷宽 1.7m 不再穿模杂物）→ 空地。
const ROAD = { minX: -4.6, maxX: 4.6, minZ: -13.6, maxZ: 19 };
const ROOM = { minX: -7.2, maxX: 7.2, minZ: -25.6, maxZ: -14.2 };
const DOOR = { minX: -1.35, maxX: 1.35, minZ: -14.9, maxZ: -13.2 };
const WALKWAY = { minX: 4.6, maxX: 8.4, minZ: -12.0, maxZ: 10.3 };    // 建筑右侧便道（票亭以北）
const CORNER = { minX: 6.3, maxX: 10.1, minZ: -13.6, maxZ: -12.0 };   // 票亭与立面转角间的拐弯
const ALLEY = { minX: 8.4, maxX: 10.1, minZ: -31.5, maxZ: 12.5 };     // 暗巷全段（含北巷口）
const BACKLOT = { minX: -10.5, maxX: 10.1, minZ: -30.7, maxZ: -27.6 }; // 背后空地（避开垃圾箱体）

// 冒烟与单测用：通路矩形并集 / 惊吓武装区 / 出生点（纯数据，可在 node 侧仿真行走）
export const WALK_RECTS = [ROAD, ROOM, DOOR, WALKWAY, CORNER, ALLEY, BACKLOT];
// v1.11 门禁 55 / v1.12 门禁 59：拐角沿——剧场侧墙实体 x≈8.05 沿巷到
// z=-26.8、后墙 z=-26.6，「拐角」在 z≈-26.7。触发区必须贴着它
// （v1.12 收紧：北缘距拐角 ≤0.7m、不晚于拐角以南 0.3m——
// cornerscare.test 几何守卫钉死，防再漂）。
export const CORNER_EDGE = { x: 8.3, z: -26.7 };
// 剧场墙体实体（藏点视线遮挡验算与单测守卫共用）：侧墙平面 x=8.05
// 覆盖 z∈[-26.8,-13.6]；后墙平面 z=-26.6 覆盖 x∈[-8.2,8.2]。
export const THEATER_WALL = { sideX: 8.05, sideZ0: -26.8, sideZ1: -13.6, backZ: -26.6, backX: 8.2 };
// v1.22 拐角惊吓机制换代（新 Goal 第 1 轮）：v1.8→v1.12 四轮圆形
// 触发区（北缘一路收到距拐角 0.65m）仍被判「时机不对」——病灶不在
// 半径，在机制：圆区触发与「看见」无关，dread→hush→lurch 2.2s 长
// 前奏让黑影总在玩家已越过拐角之后才现身。换代成**显形线触发**：
// 以拐角沿 K 与藏身点 R 连线为可见性分界线，玩家跨线（R 即将入画）
// 的那一帧就是扳机——贴墙走的人在拐角沿本体触发、靠对侧走的人按
// 几何提前一小步；现身不再有长前奏（走近的路本身是 dread，见
// APPROACH_DREAD），它在你「快要看见墙后之物」的同一拍闪出来。
export const REVEAL_PATH = {
  poise: { x: 7.2, z: -27.0 },   // 藏身点 R：拐角口袋深处（跨线前不可见）
  corner: { x: 8.05, z: -27.2 }, // 贴墙南端点外侧（滑出弧线贴角控制点）
  out: { x: 8.55, z: -27.05 }    // 现身定点：拐角沿本体（离触发中的玩家 ~0.9m）
};
export const CORNER_SCARE = {
  gate: { x: 9.2, z: -27.1, r: 1.6 },    // 拐角口袋（锁定局部性，非触发时机）
  corner: { x: 8.05, z: -26.8 },         // 拐角沿 K = 剧场侧墙实体南端点
  reveal: REVEAL_PATH.poise,             // 藏身点 R（显形线另一端，单一数据源）
  lookAt: { x: 4.2, z: -30.6 },          // 垃圾箱与后门所在的西南方向
  fov: 2.6,                              // ±74.5°：顺巷南行必然在锥内
  cooldown: 75
};
// v1.22 接近段恐惧（对齐原片节奏：走向拐角的那段路本身是 dread，
// 配乐式的涨落长在脚下）：巷内向拐角推进 q∈[0,1]——心跳渐密渐响、
// 巷灯渐次不稳（lampDread 通道）、半程一次低频升压；退回去就退潮。
// 只在扳机上膛时生效——冷却中的巷子是安静的巷子。
export const APPROACH_DREAD = { z0: -18.5, z1: -26.4, swellAt: 0.6, rearmBelow: 0.15 };
// v1.22 单拍节奏时间线（ms，实时钟）：贴角那一帧灯灭+剪影光起，它
// 从拐角后**闪出**（0.55s 减速滑，带三口急抽搐）→ 错拍：全身出角
// 死死站住看你（红光与眼窝在呼吸）→ 扑近 → 闷击闪帧 → 黑幕 →
// 空间错位。全程 ~3.2s——比 v1.12 的 6.5s 砍半，凌厉不拖过场。
export const SCARE_BEATS = {
  reveal: 0,       // 跨线那一帧：灯一口气全灭 + 剪影光起 + 滑出开始
  stare: 550,      // 全身出角，站住，盯着你（错拍——它先看你）
  rush: 1350,      // 加速扑近（0.4s 冲到脸前）
  shock: 1750,     // 闷击 + uShock 后处理冲击 + 暗红闪帧
  blackout: 2250,  // 黑幕
  wake: 3150       // 空间错位：醒来已被移回巷口
};
// v1.22 镜头特写接管（原片语义：看见的人钉在原地，镜头推向那张脸）：
// 触发帧起接管视线——yaw/pitch 平滑锁向魅影头部并全程跟焦，FOV 从
// 基值推近 13°（林奇式慢推），双脚钉死在跨线点；黑幕帧归还镜头与 FOV。
export const CLOSEUP = { grabIn: 0.45, fovPush: 13, headY: 1.97 };
// 惊吓后的空间错位落点（巷口，背对来路；在一切触发区之外）
export const WAKE_POINT = { x: 9.7, z: 9.5 };
// v1.7 转身惊吓（保留为第二重扳机）：武装区 = 暗巷深段 + 剧场背后空地。
// 区内驻留 armTime 上膛后，甩头式回望（滑动窗累计转角 ≥ minTurn）即触发。
export const SCARE_REGION = [
  { minX: 8.4, maxX: 10.1, minZ: -31.5, maxZ: -16.0 },  // 暗巷深段（恐惧拍之后）
  { minX: -10.5, maxX: 10.1, minZ: -30.7, maxZ: -27.6 } // 剧场背后空地
];
export const TURN_SCARE = { minTurn: 2.0, window: 0.5, armTime: 1.0, cooldown: 50 };
// 冒烟/文档复现路线的锚点（空地深处，粉笔螺旋旁）
export const SCARE_POINT = { x: 2.0, z: -30.3 };
export const SPAWN = { x: 0, z: 15.5, yaw: 0 };

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player, pose, teleport } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // ---------- 夜路（v1.3 三通道：湿沥青 + 骨料法线 + 虚线中线） ----------
  const M = propMats();
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 38),
    asphaltMat({ seed: 27, repX: 1, repY: 10, wet: 0.65 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = 1;
  group.add(road);

  // 路肩土地（扩大到背巷区域）
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(70, 40),
    new THREE.MeshStandardMaterial({ color: 0x0a0810, roughness: 1 })
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = -0.03;
  group.add(dirt);

  // v1.6 通路可见化：水泥服务便道沿建筑右侧铺到巷口，暗巷里接着走——
  // 有路面的地方就是能走的地方（walkable 矩形正覆盖其上）
  const walkPadMat = concreteMat({ base: [34, 33, 38], seed: 61, repX: 1, repY: 7, joints: 9 });
  const walkPad = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 24.2), walkPadMat);
  walkPad.rotation.x = -Math.PI / 2;
  walkPad.position.set(6.5, 0.004, -1.5); // x 4.5–8.5, z -13.6–10.6：便道 + 票亭转角
  group.add(walkPad);
  const alleyPadMat = concreteMat({ base: [30, 29, 34], seed: 62, repX: 1, repY: 12, joints: 14 });
  const alleyPad = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 44.2), alleyPadMat);
  alleyPad.rotation.x = -Math.PI / 2;
  alleyPad.position.set(9.75, 0.0045, -9.6); // x 8.5–11, z -31.7–12.5：暗巷全段
  group.add(alleyPad);

  // 城市光晕地平线 + 群山剪影 + 星
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(120, 32, 14),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, (g, s) => {
        const grad = g.createLinearGradient(0, s, 0, 0);
        grad.addColorStop(0, '#38200e');
        grad.addColorStop(0.16, '#160d0a');
        grad.addColorStop(0.35, '#070710');
        grad.addColorStop(1, '#010104');
        g.fillStyle = grad;
        g.fillRect(0, 0, s, s);
      }),
      side: THREE.BackSide, fog: false
    })
  );
  group.add(horizon);
  // v1.15「先合并再新增」：七座远山剪影同材质各占一 mesh ——合并成
  // 单 mesh（−6），把预算腾给拐角魅影 GLB（12 mesh 换程序化 8 mesh）
  const hillGeos = [];
  for (let i = 0; i < 7; i++) {
    const hg = new THREE.SphereGeometry(26 + Math.random() * 18, 12, 8);
    hg.scale(1, 0.55, 1);
    const a = (i / 7) * Math.PI * 2 + 0.4;
    hillGeos.push(xform(hg, Math.cos(a) * 78, -14 + Math.random() * 6, Math.sin(a) * 78));
  }
  group.add(mergedMesh(hillGeos, new THREE.MeshBasicMaterial({ color: 0x05030b, fog: false })));
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    const a = Math.random() * Math.PI * 2;
    const el = Math.random() * Math.PI * 0.4 + 0.12;
    starPos[i * 3] = Math.cos(a) * Math.cos(el) * 110;
    starPos[i * 3 + 1] = Math.sin(el) * 110;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * 110;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  group.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaebdff, size: 0.5, transparent: true, opacity: 0.7, fog: false })));

  // v1.10 抛光 P10「远处的光」：山腰夜路上偶尔驶过一辆车——一对
  // 头灯 + 灯下一道路面拖晕，沿远山腰缓移 8.5s，途中被山形挡几口，
  // 拐弯就没了。每 75–120s（seeded）来一辆；灯永远到不了这条街。
  const carGlowTex = canvasTexture(64, (g, s) => {
    g.clearRect(0, 0, s, s);
    const grad = g.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,243,214,1)');
    grad.addColorStop(0.4, 'rgba(255,236,196,0.4)');
    grad.addColorStop(1, 'rgba(255,236,196,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
  const carMat = new THREE.MeshBasicMaterial({
    map: carGlowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide
  });
  const farCar = mergedMesh([
    xform(new THREE.PlaneGeometry(1.2, 1.2), -0.8, 0, 0),
    xform(new THREE.PlaneGeometry(1.2, 1.2), 0.8, 0, 0),
    xform(new THREE.PlaneGeometry(5.6, 0.8), 0, -0.34, -0.15)
  ], carMat);
  farCar.visible = false;
  group.add(farCar);
  const carRng = rng(47);
  const carState = { t: -1, next: 34, a0: 0, a1: 0 };
  updaters.push((dt) => {
    if (carState.t < 0) {
      carState.next -= dt;
      if (carState.next > 0) return;
      // 只走南北路轴两端的天空带（街道走廊的尽头才看得见远山），
      // 高度压在屋脊环(≤8.5)之上、山线(≤13)之下——山腰上的那条路
      const side = carRng() < 0.5 ? -Math.PI / 2 : Math.PI / 2;
      carState.a0 = side - 0.42 + carRng() * 0.2;
      carState.a1 = carState.a0 + 0.55 + carRng() * 0.3;
      farCar.visible = true;
      carState.t = 0;
      return;
    }
    carState.t += dt;
    const u = carState.t / 8.5;
    if (u >= 1) {
      carState.t = -1;
      carState.next = 75 + carRng() * 45;
      carMat.opacity = 0;
      farCar.visible = false;
      return;
    }
    const a = carState.a0 + (carState.a1 - carState.a0) * u;
    farCar.position.set(Math.cos(a) * 74, 9.6 + Math.sin(u * 4.6) * 0.4, Math.sin(a) * 74);
    farCar.lookAt(0, 2, 0);
    // 出弯入弯淡入淡出 + 途中被山形/树影挡两口（乘一层慢闸）
    carMat.opacity = Math.sin(u * Math.PI) * 0.42 * (0.55 + 0.45 * Math.abs(Math.sin(u * 8.6 + 1.1)));
  });

  // v1.4 P8 远景中层：城市屋脊剪影环（比群山近一层）+ 洛城水塔
  // 层次：路面 → 护栏 → 屋脊环(r≈62–70) → 群山(r≈78) → 地平线光晕(r=120)
  const skyGeos = [];
  const srng = rng(31);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + srng() * 0.16;
    const gap = srng() < 0.18;
    const w = 6 + srng() * 10;
    const h = 2.2 + srng() * 4.6;
    const r = 62 + srng() * 8;
    const second = srng();
    const jitter = srng() * 2 - 1;
    if (gap) continue; // 留出天际缺口（消耗同样多的随机数保持确定性）
    skyGeos.push(xform(new THREE.BoxGeometry(w, h, 1.2), Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r, 0, -a + Math.PI / 2, 0));
    if (second < 0.4) {
      skyGeos.push(xform(new THREE.BoxGeometry(w * 0.3, h * 0.5, 1.2),
        Math.cos(a) * r + jitter, h + h * 0.25 - 0.5, Math.sin(a) * r, 0, -a + Math.PI / 2, 0));
    }
  }
  // 水塔：四腿 + 桶身 + 锥顶（剧场左肩上方的老好莱坞屋顶标配）
  const wtX = -26;
  const wtZ = -50;
  skyGeos.push(xform(new THREE.CylinderGeometry(2.6, 2.8, 3.6, 10), wtX, 9.4, wtZ));
  skyGeos.push(xform(new THREE.CylinderGeometry(0.2, 2.4, 1.6, 10), wtX, 12.0, wtZ));
  for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
    skyGeos.push(xform(new THREE.BoxGeometry(0.4, 7.6, 0.4), wtX + lx, 3.8, wtZ + lz));
  }
  group.add(mergedMesh(skyGeos, new THREE.MeshBasicMaterial({ color: 0x030209, fog: false })));
  // v1.4 三遍：棕榈剪影 ×7（洛城天际线的睫毛）——三段渐斜细干（每段续着上段的倾斜
  // 累积出弧度）+ crown 六至八支锥形蕉叶（从近平展到深垂头，seeded 不重样）
  const palmGeos = [];
  const prng = rng(59);
  for (let p = 0; p < 7; p++) {
    const a = (p / 7) * Math.PI * 2 + 0.3 + prng() * 0.55;
    const r = 55 + prng() * 9;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const hT = 8.5 + prng() * 5.5;
    const leanA = prng() * Math.PI * 2;
    const lean = 0.04 + prng() * 0.09;
    const seg = hT / 3;
    let ox = 0;
    let oz = 0;
    for (let sgm = 0; sgm < 3; sgm++) {
      palmGeos.push(xform(
        new THREE.CylinderGeometry(0.16 - sgm * 0.03, 0.2 - sgm * 0.03, seg + 0.3, 5),
        px + ox, seg * sgm + seg / 2, pz + oz
      ));
      ox += Math.cos(leanA) * lean * seg;
      oz += Math.sin(leanA) * lean * seg;
    }
    const cx = px + ox;
    const cz = pz + oz;
    // v1.12 D-4（剪影级）：直锥叶远看读成「尖星」——改**两段式拱叶**
    // （根段近平展 + 梢段深垂头，喷泉剪影）+ 冠下一圈**枯叶裙**
    // （LKG 没人修剪的棕榈都披着这个）。仍并进同一合并网格。
    const nf = 6 + ((prng() * 3) | 0);
    for (let f = 0; f < nf; f++) {
      const af = (f / nf) * Math.PI * 2 + prng() * 0.5;
      const ry = Math.PI - af;
      const t1 = 0.7 + prng() * 0.45;
      const t2 = t1 + 0.55 + prng() * 0.3;
      const l1 = 1.3 + prng() * 0.7;
      const l2 = 1.1 + prng() * 0.6;
      const seg1 = new THREE.ConeGeometry(0.15, l1, 4);
      seg1.translate(0, l1 / 2, 0);
      palmGeos.push(xform(seg1, cx, hT, cz, 0, ry, t1));
      // 根段端点（Euler XYZ：dir = Ry(ry)·Rz(t)·ŷ）
      const ex = cx - Math.sin(t1) * Math.cos(ry) * l1;
      const ey = hT + Math.cos(t1) * l1;
      const ez = cz + Math.sin(t1) * Math.sin(ry) * l1;
      const seg2 = new THREE.ConeGeometry(0.1, l2, 4);
      seg2.translate(0, l2 / 2, 0);
      palmGeos.push(xform(seg2, ex, ey, ez, 0, ry, t2));
    }
    const skirt = new THREE.ConeGeometry(0.42, 1.1, 6);
    palmGeos.push(xform(skirt, cx, hT - 0.45, cz, Math.PI, 0, 0));
  }
  group.add(mergedMesh(palmGeos, new THREE.MeshBasicMaterial({ color: 0x030209, fog: false })));

  // v1.4 六遍：夜航班机——一粒红航行灯 + 一粒白频闪，90s 一班缓缓划过
  // 城市光晕上空（LKG 上空永远有一架飞机在去别处的路上）
  const planeGrp = new THREE.Group();
  const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xff2a1e, fog: false, transparent: true }));
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0 }));
  strobe.position.x = 0.9; // 机尾频闪离航行灯一点距离——「有个看不见的机身」
  planeGrp.add(navRed, strobe);
  planeGrp.visible = false;
  group.add(planeGrp);
  updaters.push((dt, t) => {
    const cyc = t % 90;
    if (cyc > 58) { planeGrp.visible = false; return; }
    planeGrp.visible = true;
    const u = cyc / 58;
    const az = -1.1 + u * 2.4; // 从剧场左肩后划向路的尽头
    planeGrp.position.set(Math.cos(az) * 96, 40 + Math.sin(u * Math.PI) * 5, Math.sin(az) * 96);
    navRed.material.opacity = Math.sin(t * 3.4) > -0.2 ? 0.9 : 0.25; // 红灯呼吸闪
    const sw = t % 1.4;
    strobe.material.opacity = sw < 0.07 || (sw > 0.16 && sw < 0.23) ? 1 : 0; // 双闪频闪
  });

  // 路灯 v2（凹槽柱 + 泪滴灯头；一盏坏了，嗡嗡作响地闪）
  const lampData = [];
  let poleHit = null; // v1.16：第一盏灯的铁杆（时间错位彩蛋热点靶）
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = 14 - i * 6.5;
    const lamp = streetLampV2({ mats: M });
    lamp.position.set(side * 3.9, 0, z);
    lamp.rotation.y = side < 0 ? 0 : Math.PI; // 灯头朝向路面
    group.add(lamp);
    if (i === 0) poleHit = lamp.userData.pole;
    const headWorldX = side * (3.9 - lamp.userData.headX);
    const cone = lightCone(0.3, 2.1, 4.3, 0xffd9a8, 0.05);
    cone.position.set(headWorldX, 2.15, z);
    group.add(cone);
    lampData.push({ bulbMat: lamp.userData.bulbMat, light: lamp.userData.light, cone, broken: i === 2 });
  }
  // ---------- v1.16 彩蛋四批·时间错位（mull）：路灯铁杆 ----------
  // 敲一下路口第一盏路灯的铁杆：poletap 铁管双鸣即刻出声，
  // 灯却像隔了一条街才听见——2.4s 游戏时钟错拍后，灯光把那记
  // 双鸣「用光原样迟放一遍」（两次快速下沉再回来）。这条路上
  // 声音和光不同步。贴顶厅纪律：零新增网格（热点落在既有灯杆
  // 上）、零字幕零光源（只调制既有灯）；可重复无锁存；不加
  // 远场重放（远声密度已到上限，应答全走光通道）。
  // v1.17 彩蛋五批·问第二遍（mull）：迟放的光落回后的回声窗内
  // **再敲一次**——铁杆这回不响，灯却在同一拍就把双沉打出来（第一遍
  // 声先光迟，第二遍光先声无：这条路上因果只肯对上一半）。贴顶厅
  // 纪律不破：零新增网格零音色（还是那盏灯、那条双沉包络）。
  // v1.19 余温总账 9s：2.4 错拍 + 0.6 双沉 = 3.0s 落定 → 窗 6.0s
  // （差异化是算出来的不是配出来的——这件的账恰好落在老值上）。
  const poleEcho = { wait: -1, t: -1, echo: 0, replay: 0 };
  updaters.push((dt, t) => {
    if (poleEcho.wait >= 0) {
      poleEcho.wait -= dt;
      if (poleEcho.wait < 0) poleEcho.t = 0;
    } else if (poleEcho.t >= 0) {
      poleEcho.t += dt;
      if (poleEcho.t > 0.6) {
        poleEcho.t = -1;
        // 回声窗只在「等来的答」之后开一扇（即时重放不续窗——
        // 七件同口径：第二遍答完即消耗，第三遍回到从头等起）
        poleEcho.echo = poleEcho.replay ? 0 : 6; // 余温 9−3.0
        poleEcho.replay = 0;
      }
    } else if (poleEcho.echo > 0) {
      poleEcho.echo -= dt;
    }
    for (const [i, L] of lampData.entries()) {
      let f = 1;
      if (L.broken) {
        f = Math.sin(t * 23 + i) * Math.sin(t * 7.7) > 0.2 ? (Math.random() < 0.08 ? 0.05 : 0.9) : 0.12;
      }
      if (i === 0 && poleEcho.t >= 0) {
        // 迟到的应答：双鸣 → 双沉（0s 与 0.26s 两个半正弦坑）
        const e = poleEcho.t;
        const dip = (p) => (e >= p && e < p + 0.16) ? Math.sin(((e - p) / 0.16) * Math.PI) : 0;
        f *= 1 - 0.9 * Math.max(dip(0), dip(0.26));
      }
      L.light.intensity = 7 * f;
      L.bulbMat.emissiveIntensity = 3 * f;
      L.cone.material.opacity = 0.05 * f;
    }
  });
  hotspots.add(poleHit, {
    hint: 'E — 路灯铁杆',
    onActivate: () => {
      if (poleEcho.wait >= 0 || poleEcho.t >= 0) return;
      if (poleEcho.echo > 0) {
        poleEcho.echo = 0;
        poleEcho.replay = 1;
        poleEcho.t = 0; // 这回光先来，声永远没来
        return;
      }
      poleEcho.wait = 2.4;
      audio.sfxAt('poletap', -3.9, 14, 0.6, 4);
    }
  });

  // 路牌热点
  const signTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#0b3d20';
    g.fillRect(30, 130, s - 60, 190);
    g.strokeStyle = '#e8e2d5';
    g.lineWidth = 8;
    g.strokeRect(44, 144, s - 88, 162);
    g.fillStyle = '#e8e2d5';
    g.textAlign = 'center';
    g.font = '400 74px Georgia, serif';
    g.fillText('MULHOLLAND DR.', s / 2, 240, s - 120);
  });
  const roadSign = roundedBoxMesh(2.6, 2.6, 0.07, 0.02,
    new THREE.MeshStandardMaterial({ map: signTex, transparent: true, roughness: 0.5, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.25 }));
  roadSign.position.set(-3.6, 2.1, 12);
  roadSign.rotation.y = 0.9;
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 10), M.iron);
  signPole.position.set(-3.6, 1.2, 12);
  group.add(roadSign, signPole);
  hotspots.add(roadSign, {
    hint: 'E — 《穆赫兰道》档案',
    onActivate: () => ui.showFilm('mulholland-drive')
  });

  // 路肩护栏（白色立柱 + 波形护板，合并单 mesh）
  const guardGeos = [];
  const guardPostGeo = new THREE.BoxGeometry(0.12, 0.75, 0.1);
  const guardBandGeo = new THREE.BoxGeometry(0.05, 0.34, 6.2);
  for (let i = 0; i < 5; i++) {
    guardGeos.push(xform(guardPostGeo, -4.35, 0.375, 14 - i * 1.55));
  }
  guardGeos.push(xform(guardBandGeo, -4.32, 0.62, 10.9, 0, 0, 0));
  guardPostGeo.dispose();
  guardBandGeo.dispose();
  group.add(mergedMesh(guardGeos, new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(256, 150, 40), color: 0x9aa0a8, roughness: 0.45, metalness: 0.7, envMapIntensity: 0.9
  })));

  // v1.4 二遍：路面家具三件——井盖 / 中线猫眼反光钉 / 门厅戏报箱一对
  // ① 铸铁井盖（同心环 + 放射短纹 + 双撬孔，微凸出湿沥青）
  const manholeTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#20232a';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(120,126,138,0.6)';
    for (let r = 8; r < 60; r += 9) {
      g.lineWidth = r % 18 === 8 ? 2 : 1;
      g.beginPath();
      g.arc(64, 64, r, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      g.beginPath();
      g.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44);
      g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58);
      g.stroke();
    }
    g.fillStyle = '#0a0b0e';
    g.beginPath(); g.arc(42, 64, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(86, 64, 4, 0, Math.PI * 2); g.fill();
  });
  const manhole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 0.014, 24),
    new THREE.MeshStandardMaterial({
      map: manholeTex, color: 0x565c66, roughness: 0.55, metalness: 0.8, envMapIntensity: 0.8
    })
  );
  manhole.position.set(1.5, 0.007, 5.2);
  group.add(manhole);
  // ② 中线猫眼反光钉（低琥珀自发光——夜路的「呼吸线」，整排合并）
  const studGeos = [];
  for (let z = -12; z <= 14; z += 2.6) {
    studGeos.push(xform(new THREE.BoxGeometry(0.1, 0.024, 0.15), 0, 0.012, z));
  }
  group.add(mergedMesh(studGeos, new THREE.MeshStandardMaterial({
    color: 0x2a2418, roughness: 0.4, metalness: 0.6,
    emissive: 0xff9e3c, emissiveIntensity: 0.55
  })));
  // v1.4 六遍：门厅前的地面星章——铺在人行道里的一颗星，名字的位置空着。
  // E → 星章描金亮一线（emissive 扫过）+ 轻响两声 +「他们把星星铺在地上，好让人踩。」
  const starTileTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#26222b';
    g.fillRect(0, 0, s, s);
    const tr = rng(67);
    for (let i = 0; i < 110; i++) {
      g.fillStyle = `rgba(${150 + (tr() * 60) | 0},${140 + (tr() * 50) | 0},${150 + (tr() * 40) | 0},${0.05 + tr() * 0.1})`;
      g.beginPath();
      g.arc(tr() * s, tr() * s, 0.6 + tr() * 1.8, 0, Math.PI * 2);
      g.fill();
    }
    // 五角星描边（空名——名字的位置什么都没有）
    g.strokeStyle = '#d8ac52';
    g.lineWidth = 10;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 104 : 40;
      const px = s / 2 + Math.cos(a) * r;
      const py = s / 2 + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.stroke();
    // 中下小圆徽（不加任何图形——只是一个空圆）
    g.lineWidth = 4;
    g.beginPath();
    g.arc(s / 2, s / 2 + 26, 15, 0, Math.PI * 2);
    g.stroke();
    // 磨损：几道踩过的暗擦痕
    g.strokeStyle = 'rgba(10,10,14,0.35)';
    for (let i = 0; i < 6; i++) {
      g.lineWidth = 3 + tr() * 5;
      g.beginPath();
      g.moveTo(tr() * s, tr() * s);
      g.quadraticCurveTo(tr() * s, tr() * s, tr() * s, tr() * s);
      g.stroke();
    }
  });
  const starTileMat = new THREE.MeshStandardMaterial({
    map: starTileTex, roughness: 0.42, metalness: 0.25, envMapIntensity: 1.1,
    emissive: 0xffc86a, emissiveMap: starTileTex, emissiveIntensity: 0.12
  });
  const starTile = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.012, 0.92), starTileMat);
  starTile.position.set(1.5, 0.007, -10.6);
  starTile.rotation.y = 0.18;
  group.add(starTile);
  const starGlint = { t: -1 };
  updaters.push((dt) => {
    if (starGlint.t < 0) return;
    starGlint.t += dt;
    if (starGlint.t > 1.3) { starGlint.t = -1; starTileMat.emissiveIntensity = 0.12; return; }
    starTileMat.emissiveIntensity = 0.12 + Math.sin((starGlint.t / 1.3) * Math.PI) * 0.55;
  });
  hotspots.add(starTile, {
    hint: 'E — 地上的星',
    onActivate: () => {
      if (starGlint.t < 0) starGlint.t = 0;
      audio.sfxAt('click', 1.5, -10.6, 0.4, 3);
      later(() => audio.sfxAt('chime', 1.5, -10.6, 0.14, 4), 520);
      ui.caption('他们把星星铺在地上，好让人踩。', 4200);
    }
  });
  // ③ 门厅戏报箱一对（黄铜框 + 玻璃 + 原创西语戏报；夹着大门左右）
  const posterA = canvasTexture(256, (g, s) => {
    g.fillStyle = '#140c18';
    g.fillRect(0, 0, s, s);
    const beam = g.createLinearGradient(0, 0, 0, s);
    beam.addColorStop(0, 'rgba(240,210,150,0.5)');
    beam.addColorStop(1, 'rgba(240,210,150,0)');
    g.save();
    g.beginPath();
    g.moveTo(s * 0.38, 40); g.lineTo(s * 0.62, 40); g.lineTo(s * 0.8, s - 30); g.lineTo(s * 0.2, s - 30);
    g.closePath();
    g.fillStyle = beam;
    g.fill();
    g.restore();
    // 歌者剪影：头 + 肩身梯形 + 麦克风杆
    g.fillStyle = '#060409';
    g.beginPath(); g.arc(s / 2, s * 0.52, 16, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(s / 2 - 26, s - 30); g.lineTo(s / 2 + 26, s - 30);
    g.lineTo(s / 2 + 14, s * 0.56); g.lineTo(s / 2 - 14, s * 0.56);
    g.closePath();
    g.fill();
    g.fillRect(s / 2 + 20, s * 0.55, 2, s * 0.32);
    g.strokeStyle = '#c8a24a';
    g.lineWidth = 5;
    g.strokeRect(12, 12, s - 24, s - 24);
    g.fillStyle = '#e6ce96';
    g.textAlign = 'center';
    g.font = '700 30px Georgia, serif';
    g.fillText('ESTA NOCHE', s / 2, 40);
    g.font = '18px Georgia, serif';
    g.fillText('UNA VOZ · SIN ORQUESTA', s / 2, s - 10);
  });
  const posterB = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0d1020';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#e8e0c8';
    g.beginPath(); g.arc(s * 0.68, s * 0.3, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0d1020';
    g.beginPath(); g.arc(s * 0.63, s * 0.27, 30, 0, Math.PI * 2); g.fill();
    // 盘山公路白虚线蜿蜒进画底
    g.strokeStyle = 'rgba(232,224,200,0.8)';
    g.lineWidth = 4;
    g.setLineDash([10, 9]);
    g.beginPath();
    g.moveTo(s * 0.16, s + 8);
    g.bezierCurveTo(s * 0.42, s * 0.78, s * 0.12, s * 0.6, s * 0.4, s * 0.5);
    g.bezierCurveTo(s * 0.62, s * 0.43, s * 0.5, s * 0.36, s * 0.66, s * 0.32);
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = '#7a90c8';
    g.lineWidth = 5;
    g.strokeRect(12, 12, s - 24, s - 24);
    g.fillStyle = '#c9d4ee';
    g.textAlign = 'center';
    g.font = '700 26px Georgia, serif';
    g.fillText('MEDIANOCHE', s / 2, 44);
    g.font = '18px Georgia, serif';
    g.fillText('FUNCIÓN DOBLE · 2:15', s / 2, s - 12);
  });
  for (const [px, tex] of [[-3.1, posterA], [3.1, posterB]]) {
    const kase = new THREE.Group();
    kase.add(mergedMesh([
      xform(new THREE.BoxGeometry(1.16, 0.07, 0.09), 0, 0.785, 0),
      xform(new THREE.BoxGeometry(1.16, 0.07, 0.09), 0, -0.785, 0),
      xform(new THREE.BoxGeometry(0.07, 1.64, 0.09), -0.545, 0, 0),
      xform(new THREE.BoxGeometry(0.07, 1.64, 0.09), 0.545, 0, 0)
    ], M.brass));
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 1.5),
      new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.32
      })
    );
    paper.position.z = 0.012;
    const glassPane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 1.56),
      new THREE.MeshPhysicalMaterial({
        color: 0xaebcd8, roughness: 0.05, transparent: true, opacity: 0.14, envMapIntensity: 1.6
      })
    );
    glassPane.position.z = 0.045;
    kase.add(paper, glassPane);
    kase.position.set(px, 2.5, -13.7);
    group.add(kase);
  }

  // ---------- 剧场外立面 ----------
  const facadeMat = new THREE.MeshStandardMaterial({ color: 0x191019, roughness: 0.75 });
  const facade = new THREE.Group();
  const mkFacade = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), facadeMat);
    m.position.set(x, y, 0);
    facade.add(m);
  };
  mkFacade(6.4, 7.4, -4.8, 3.7);
  mkFacade(6.4, 7.4, 4.8, 3.7);
  mkFacade(3.4, 3.6, 0, 5.6);
  facade.position.z = -14;
  group.add(facade);
  const marquee = neonSign('ILLUSIÓN', { color: '#ff2e88', size: 1.0 });
  marquee.position.set(0, 8.3, -13.6);
  group.add(marquee);
  const marquee2 = neonSign('EL TEATRO DEL SUEÑO · 梦 之 剧 场', { color: '#3ec5ff', size: 0.32 });
  marquee2.position.set(0, 7.45, -13.6);
  group.add(marquee2);
  updaters.push((dt, t) => {
    marquee.userData.flicker(t, 2.2);
    marquee2.userData.flicker(t, 9.1);
  });
  // ---------- v1.10 C4：剧场前的积水洼——湿了一夜的路把霓虹接住 ----------
  // 暗玻般的湿面（不规则洼形 alpha）+ ILLUSIÓN 倒影微漾；
  // 倒影亮度跟招牌同一次闪烁——坏的是同一根管子。
  {
    const puddleShape = canvasTexture(128, (g, s) => {
      g.clearRect(0, 0, s, s);
      const sr = rng(41);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const cx = s / 2 + Math.cos(a) * (10 + sr() * 16);
        const cy = s / 2 + Math.sin(a) * (6 + sr() * 10);
        g.beginPath();
        g.ellipse(cx, cy, 18 + sr() * 16, 11 + sr() * 9, a, 0, Math.PI * 2);
        g.fill();
      }
    });
    const streetPuddle = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.1),
      new THREE.MeshPhysicalMaterial({
        color: 0x05060c, roughness: 0.05, metalness: 0.12, envMapIntensity: 1.7,
        clearcoat: 1, clearcoatRoughness: 0.06,
        transparent: true, alphaMap: puddleShape, depthWrite: false
      })
    );
    streetPuddle.rotation.x = -Math.PI / 2;
    streetPuddle.position.set(-2.6, 0.008, -10.2);
    group.add(streetPuddle);
    // 倒影字：镜像躺在水里（顶端朝向观者——真实镜面几何），加法混合
    const rc = document.createElement('canvas');
    rc.width = 512;
    rc.height = 128;
    const rg = rc.getContext('2d');
    rg.textAlign = 'center';
    rg.textBaseline = 'middle';
    rg.font = '400 88px Georgia, serif';
    for (const [blur, alpha] of [[30, 0.5], [12, 0.7]]) {
      rg.shadowColor = '#ff2e88';
      rg.shadowBlur = blur;
      rg.fillStyle = `rgba(255,255,255,${alpha})`;
      rg.fillText('ILLUSIÓN', 256, 64);
    }
    const reflTex = new THREE.CanvasTexture(rc);
    const refl = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 1.15),
      new THREE.MeshBasicMaterial({
        map: reflTex, color: 0xff2e88, transparent: true, opacity: 0.66,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        side: THREE.DoubleSide, fog: false
      })
    );
    refl.rotation.x = -Math.PI / 2;
    refl.scale.y = -1;
    refl.position.set(-2.6, 0.014, -10.35);
    group.add(refl);
    const marqueeMat = marquee.children[0].material;
    updaters.push((dt, t) => {
      // 与招牌同闪 + 水面微漾（横向极缓伸缩 + 贴图微偏移，像风掠过水皮）
      refl.material.opacity = 0.66 * marqueeMat.opacity * (1 + Math.sin(t * 2.1) * 0.1);
      refl.scale.x = 1 + Math.sin(t * 1.3) * 0.014;
      reflTex.offset.x = Math.sin(t * 0.7) * 0.003;
    });
    // v1.10 抛光 P5：积水边一册被雨泡皱的场刊——PROGRAMA 刊头
    // （接住西语系统），日期栏空着；下半浸在水色里、纸面泡起波楞。
    const playbillGeo = new THREE.PlaneGeometry(0.21, 0.29, 8, 10);
    const pb = playbillGeo.attributes.position;
    for (let i = 0; i < pb.count; i++) {
      const px2 = pb.getX(i);
      const py2 = pb.getY(i);
      pb.setZ(i, Math.sin(px2 * 34 + py2 * 12) * 0.008 + Math.sin(py2 * 46) * 0.006 * (0.5 - py2 / 0.29));
    }
    playbillGeo.computeVertexNormals();
    const playbill = new THREE.Mesh(
      playbillGeo,
      new THREE.MeshStandardMaterial({
        map: canvasTexture(128, (g, s) => {
          g.fillStyle = '#b8b0a0';
          g.fillRect(0, 0, s, s);
          g.strokeStyle = 'rgba(60,52,44,0.85)';
          g.lineWidth = 3;
          g.strokeRect(10, 10, s - 20, s - 20);
          g.textAlign = 'center';
          g.save();
          g.scale(1, 1.38); // 0.21×0.29 面板纵向预拉伸补偿
          g.font = '700 17px Georgia, serif';
          g.fillStyle = '#3c3228';
          g.fillText('PROGRAMA', s / 2, 34 / 1.38);
          g.restore();
          g.strokeStyle = 'rgba(60,52,44,0.6)';
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(s * 0.3, s * 0.42);
          g.lineTo(s * 0.7, s * 0.42);
          g.stroke();
          // 水线以下：泡透的深渍从底往上洇
          const soak = g.createLinearGradient(0, s, 0, s * 0.4);
          soak.addColorStop(0, 'rgba(52,50,46,0.62)');
          soak.addColorStop(1, 'rgba(52,50,46,0)');
          g.fillStyle = soak;
          g.fillRect(0, 0, s, s);
        }), roughness: 0.92, side: THREE.DoubleSide
      })
    );
    playbill.rotation.set(-Math.PI / 2, 0, 0.7);
    playbill.position.set(-1.62, 0.012, -9.35);
    group.add(playbill);
  }
  // 招牌追逐灯泡链（合并单 mesh，整体呼吸闪烁）
  const chaseGeos = [];
  const chaseGeo = new THREE.SphereGeometry(0.05, 8, 6);
  for (let i = 0; i < 14; i++) {
    chaseGeos.push(xform(chaseGeo, -3.2 + i * 0.49, 8.95, -13.55));
  }
  for (let i = 0; i < 14; i++) {
    chaseGeos.push(xform(chaseGeo, -3.2 + i * 0.49, 7.05, -13.55));
  }
  chaseGeo.dispose();
  const chaseBulbs = mergedMesh(chaseGeos, new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0xffd9a8, emissiveIntensity: 2.2, toneMapped: true
  }));
  group.add(chaseBulbs);
  updaters.push((dt, t) => {
    chaseBulbs.material.emissiveIntensity = 1.6 + (Math.sin(t * 7) * 0.5 + 0.5) * 1.4;
  });

  // v1.9 抛光第 3 遍：立面收顶——此前屋顶线是一条 7.4m 高的平直硬边、
  // 招牌霓虹悬在天上没有着落。加通长檐口（比墙身深出切投影线）+
  // 阶梯式 Deco 山花衬板（霓虹与追逐灯泡贴板立起）+ 顶帽五枚渐收立鳍
  // + 檐下一支琥珀霓虹细管（低亮呼吸，偶尔咳一下）
  {
    const crestMat = new THREE.MeshStandardMaterial({ color: 0x140d14, roughness: 0.8 });
    group.add(mergedMesh([
      xform(new THREE.BoxGeometry(16.4, 0.3, 0.72), 0, 7.5, -14),
      xform(new THREE.BoxGeometry(16.4, 0.12, 0.6), 0, 7.72, -14),
      xform(new THREE.BoxGeometry(7.6, 2.1, 0.42), 0, 8.5, -14.1),
      xform(new THREE.BoxGeometry(1.5, 1.15, 0.42), -4.35, 8.0, -14.1),
      xform(new THREE.BoxGeometry(1.5, 1.15, 0.42), 4.35, 8.0, -14.1),
      xform(new THREE.BoxGeometry(3.0, 0.5, 0.42), 0, 9.7, -14.1),
      ...[-1.0, -0.5, 0, 0.5, 1.0].map((fx) => xform(
        new THREE.BoxGeometry(0.09, 0.5 - Math.abs(fx) * 0.22, 0.2),
        fx, 10.0 - Math.abs(fx) * 0.11, -14.1))
    ], crestMat));
    const cornTube = new THREE.Mesh(
      new THREE.BoxGeometry(15.6, 0.045, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x110a06, emissive: 0xffb36a, emissiveIntensity: 1.3, toneMapped: true })
    );
    cornTube.position.set(0, 7.34, -13.68);
    group.add(cornTube);
    updaters.push((dt, t) => {
      cornTube.material.emissiveIntensity = 1.1 + Math.sin(t * 0.9) * 0.25 + (Math.sin(t * 31) > 0.996 ? 0.8 : 0);
    });
  }

  // v1.6 巷口引导：立面右角一块「SALIDA DE ARTISTAS →」搪瓷牌 + 罩笼工作灯——
  // 演员出入口在建筑右侧；箭头指向暗巷，灯偶尔眨一下（in-world 引导，不用 UI 提示）
  const stageDoorTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#101418';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#b8b2a0';
    g.lineWidth = 5;
    g.strokeRect(10, 66, s - 20, 124);
    g.fillStyle = '#c8c2b0';
    g.textAlign = 'center';
    g.font = '700 34px Georgia, serif';
    g.fillText('SALIDA DE', s / 2 - 22, 116);
    g.fillText('ARTISTAS', s / 2 - 22, 156);
    // 右向箭头（杆 + 楔头）
    g.fillRect(s - 78, 122, 34, 10);
    g.beginPath();
    g.moveTo(s - 44, 112);
    g.lineTo(s - 20, 127);
    g.lineTo(s - 44, 142);
    g.closePath();
    g.fill();
    // 搪瓷磕碰的暗斑
    const sr = rng(71);
    g.fillStyle = 'rgba(8,8,10,0.5)';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(14 + sr() * (s - 28), 70 + sr() * 116, 1.5 + sr() * 3.5, 0, Math.PI * 2);
      g.fill();
    }
  });
  const stageDoorMat = new THREE.MeshStandardMaterial({
    map: stageDoorTex, transparent: true, roughness: 0.5, metalness: 0.3,
    emissive: 0xffffff, emissiveMap: stageDoorTex, emissiveIntensity: 0.3
  });
  const stageDoorSign = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), stageDoorMat);
  stageDoorSign.position.set(7.0, 2.6, -13.72);
  group.add(stageDoorSign);
  const signLamp = new THREE.PointLight(0xffc98a, 2.6, 6.5, 1.8);
  signLamp.position.set(7.0, 3.5, -13.3);
  const signLampBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc98a, emissiveIntensity: 2.2 })
  );
  signLampBulb.position.set(7.0, 3.42, -13.55);
  // 罩笼：半球罩 + 三根护条（合并）
  group.add(mergedMesh([
    xform(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 7.0, 3.46, -13.55),
    xform(new THREE.BoxGeometry(0.015, 0.2, 0.015), 6.92, 3.4, -13.48),
    xform(new THREE.BoxGeometry(0.015, 0.2, 0.015), 7.08, 3.4, -13.48),
    xform(new THREE.BoxGeometry(0.015, 0.2, 0.015), 7.0, 3.4, -13.63),
    xform(new THREE.BoxGeometry(0.06, 0.06, 0.5), 7.0, 3.52, -13.78)
  ], new THREE.MeshStandardMaterial({ color: 0x1c1a1e, roughness: 0.6, metalness: 0.5 })));
  group.add(signLamp, signLampBulb);
  updaters.push((dt, t) => {
    const f = Math.sin(t * 16.7 + 4.1) * Math.sin(t * 5.7) > 0.93 ? 0.25 : 1;
    signLamp.intensity = 2.6 * f;
    signLampBulb.material.emissiveIntensity = 2.2 * f;
    stageDoorMat.emissiveIntensity = 0.3 * (0.6 + 0.4 * f);
  });

  // v1.4 P3：剧场票亭（路缘外、门厅右肩；折窗 + 票口碗 + CERRADO 牌）
  const tbooth = ticketBooth({ mats: M });
  tbooth.position.set(5.35, 0, -12.8);
  tbooth.rotation.y = -Math.PI / 2; // 折窗面向夜路
  group.add(tbooth);
  // v1.9 抛光第 8 遍·触痕层：票亭北侧玻璃上一组指印——四枚指腹
  // 一枚掌根，还有两道往下的拖痕（有人扒着玻璃往里看过）。
  // CERRADO 之后留下的，工作灯眨的时候能看清。
  {
    const printTex = canvasTexture(128, (g, s) => {
      g.clearRect(0, 0, s, s);
      const pr = rng(31);
      const dab = (cx, cy, rx, ry, al) => {
        // 渐变必须建在变换后的坐标系里（画布渐变取用绘制时的用户空间，
        // 先建后 translate 会把渐变心甩到远处、椭圆只填到透明外圈）
        g.save();
        g.translate(cx, cy);
        g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
        const grd = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
        grd.addColorStop(0, `rgba(222,228,238,${al})`);
        grd.addColorStop(0.7, `rgba(222,228,238,${al * 0.5})`);
        grd.addColorStop(1, 'rgba(222,228,238,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
        g.fill();
        g.restore();
      };
      // 四枚指腹排成一道浅弧 + 掌根一团
      for (let i = 0; i < 4; i++) {
        dab(38 + i * 15, 36 + Math.sin(i * 1.1) * 6, 5.5, 8, 0.3 + pr() * 0.12);
      }
      dab(60, 74, 15, 11, 0.2);
      // 两道往下的拖痕（指尖离开玻璃前拖了一下）
      for (const tx of [46, 62]) {
        const grd = g.createLinearGradient(tx, 80, tx, 116);
        grd.addColorStop(0, 'rgba(222,228,238,0.2)');
        grd.addColorStop(1, 'rgba(222,228,238,0)');
        g.fillStyle = grd;
        g.fillRect(tx - 2.5, 80, 5, 36);
      }
    });
    const prints = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshStandardMaterial({
        map: printTex, transparent: true, roughness: 1, depthWrite: false, side: THREE.DoubleSide,
        // 北面夜里几乎不受光：给一丝自发光当作街灯的余亮（同粉笔记号做法）
        emissive: 0xdee4ee, emissiveMap: printTex, emissiveIntensity: 0.28
      }));
    // 北侧整玻（局部 x=+0.5 面）：贴外侧 7mm，路上走来正好看见
    prints.position.set(0.507, 1.42, 0.08);
    prints.rotation.y = Math.PI / 2;
    tbooth.add(prints);
  }
  const tbState = { k: 0, target: 0 };
  const coinFlare = { v: 0 };
  updaters.push((dt, t) => {
    tbState.k += (tbState.target - tbState.k) * Math.min(1, dt * 3.2);
    tbooth.userData.setFold(tbState.k);
    if (coinFlare.v > 0) coinFlare.v = Math.max(0, coinFlare.v - dt * 0.9);
    tbooth.userData.bulbMat.emissiveIntensity =
      1.6 + tbState.k * 1.6 + Math.sin(t * 11) * 0.1 + coinFlare.v * 2.4;
    tbooth.userData.light.intensity = 1.6 + tbState.k * 2.4 + coinFlare.v * 2.6;
    tbooth.userData.signMat.emissiveIntensity = 0.9 * (Math.sin(t * 12.7) > 0.94 ? 0.35 : 1);
  });
  hotspots.add(tbooth.userData.windowHit, {
    hint: 'E — 售票折窗',
    onActivate: () => {
      const opening = tbState.target < 0.5;
      tbState.target = opening ? 1 : 0;
      audio.sfxAt('clank', 4.9, -12.8, 0.5, 3);
      later(() => audio.sfxAt('creak', 4.9, -12.8, 0.4, 3), 300);
      if (opening) ui.caption('窗口折开了。没有人卖票，也没有人查票。', 4200);
    }
  });
  // v1.4 阶段 4：往票口碗里丢一枚硬币 —— 硬币划一道弧落进黄铜碟，
  // 亭里的灯应声亮了一拍（连锁：动画 + 两声 + 灯 + 短句）
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.004, 12), M.brass);
  coin.visible = false;
  group.add(coin);
  const coinState = { t: -1 };
  updaters.push((dt) => {
    if (coinState.t < 0) return;
    coinState.t += dt * 2.2;
    const k = coinState.t;
    if (k >= 1.35) { coin.visible = false; coinState.t = -1; return; }
    const kk = Math.min(k, 1);
    coin.visible = true;
    coin.position.set(
      4.3 + kk * 0.53,
      1.42 + Math.sin(kk * Math.PI) * 0.38 - kk * 0.24,
      -12.74 - kk * 0.06
    );
    coin.rotation.x += dt * 16;
    coin.scale.setScalar(k > 1 ? Math.max(0.001, 1 - (k - 1) * 2.8) : 1);
  });
  hotspots.add(tbooth.userData.bowl, {
    hint: 'E — 丢一枚硬币',
    onActivate: () => {
      if (coinState.t < 0) coinState.t = 0;
      audio.sfxAt('switch', 4.6, -12.8, 0.18, 3);
      later(() => {
        audio.sfxAt('coin', 4.83, -12.8, 0.8, 4);
        coinFlare.v = 1;
      }, 430);
      ui.caption('找零不会来了。', 3200);
    }
  });

  // v1.15 彩蛋三批（门禁 73）：亭窗左扇玻璃后挂一块「BACK IN 5」
  // 小牌——拨一下（latchsnap 轻声即时），牌子转过去，背面还是
  // BACK IN 5（这五分钟永远数不完）；1.6s 后亭子里面 replyhum
  // （远声应答谱系：里面有人应了——可是窗没开过，灯也没多亮一格）。
  // 可重复、无永久态、零字幕。
  const backInTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#d8cfb8';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#3a2c20';
    g.lineWidth = 5;
    g.strokeRect(7, 7, s - 14, s - 14);
    g.fillStyle = '#2c2018';
    g.font = 'bold 30px Georgia';
    g.textAlign = 'center';
    g.fillText('BACK IN', s / 2, 52);
    g.font = 'bold 56px Georgia';
    g.fillText('5', s / 2, 108);
  });
  const backInPivot = new THREE.Group();
  const backInSign = new THREE.Mesh(
    new THREE.BoxGeometry(0.21, 0.21, 0.007),
    new THREE.MeshStandardMaterial({ map: backInTex, roughness: 0.85 })
  );
  backInSign.position.y = -0.145;
  backInPivot.add(backInSign, new THREE.Mesh(
    new THREE.CylinderGeometry(0.0022, 0.0022, 0.08, 5),
    new THREE.MeshStandardMaterial({ color: 0x666055, roughness: 0.5, metalness: 0.6 })
  ));
  backInPivot.position.set(-0.25, 1.78, 0.42); // 亭局部系：左扇玻璃内侧
  backInPivot.rotation.y = 0.12;
  tbooth.add(backInPivot);
  const backInState = { spin: -1, wait: 0, base: 0.12 };
  updaters.push((dt) => {
    if (backInState.spin >= 0) { // 绕挂绳转半圈（0.8s 带过冲回摆）
      backInState.spin += dt;
      const u = Math.min(1, backInState.spin / 0.8);
      backInPivot.rotation.y = backInState.base + u * Math.PI +
        Math.sin(u * Math.PI) * 0.35;
      if (u >= 1) {
        backInState.base += Math.PI; // 背面成为新的正面——内容一个字没换
        backInState.spin = -1;
      }
    }
    if (backInState.wait > 0) {
      backInState.wait -= dt;
      if (backInState.wait <= 0) audio.sfxAt('replyhum', 5.35, -12.8, 0.5, 5);
    }
  });
  hotspots.add(backInSign, {
    hint: 'E — BACK IN 5',
    onActivate: () => {
      if (backInState.spin >= 0 || backInState.wait > 0) return;
      backInState.spin = 0.001;
      audio.sfxAt('latchsnap', 5.05, -13.05, 0.3, 3);
      backInState.wait = 1.6;
    }
  });

  // v1.4 阶段 4：路缘报箱 —— 洛杉矶街头的投币报箱；
  // E → 门盖弹开一条缝又被弹簧拽回（哐当 + 闷响），头版是空白的
  const newsBox = new THREE.Group();
  const newsBodyMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(128, 96, 40), color: 0x27404f, roughness: 0.5, metalness: 0.6, envMapIntensity: 0.9
  });
  const newsBody = roundedBoxMesh(0.56, 0.52, 0.42, 0.025, newsBodyMat);
  newsBody.position.y = 0.78;
  newsBox.add(newsBody);
  newsBox.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.045, 0.55, 0.045), -0.22, 0.27, 0.15),
    xform(new THREE.BoxGeometry(0.045, 0.55, 0.045), 0.22, 0.27, 0.15),
    xform(new THREE.BoxGeometry(0.045, 0.55, 0.045), -0.22, 0.27, -0.15),
    xform(new THREE.BoxGeometry(0.045, 0.55, 0.045), 0.22, 0.27, -0.15),
    xform(new THREE.BoxGeometry(0.5, 0.04, 0.36), 0, 0.03, 0),
    // 投币器小盒（门侧上缘）
    xform(new THREE.BoxGeometry(0.09, 0.12, 0.05), 0.18, 1.0, 0.235)
  ], newsBodyMat));
  // 弹簧门（铰链在上沿；窗里一份空头版）
  const newsDoor = new THREE.Group();
  const paperTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#ddd6c2';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#1a1518';
    g.font = '700 17px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('EL SUEÑO', s / 2, 24);
    g.font = '9px Georgia, serif';
    g.fillText('· DIARIO DE LA NOCHE ·', s / 2, 38);
    g.fillStyle = 'rgba(26,21,24,0.24)';
    g.fillRect(12, 50, s - 24, 14);
    g.fillRect(12, 72, s - 60, 8);
    g.fillRect(12, 86, s - 40, 8);
    g.fillRect(12, 100, s - 76, 8);
  });
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.02), newsBodyMat);
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.28),
    new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.9 })
  );
  paper.position.z = 0.011;
  doorFrame.add(paper);
  doorFrame.position.y = -0.18;
  newsDoor.add(doorFrame);
  newsDoor.position.set(0, 0.98, 0.215);
  newsBox.add(newsDoor);
  // v1.6：报箱挪到巷口铁皮墙根（原位在新便道正中会被穿模）——
  // 顺便当了往暗巷去的第一枚路标
  // v1.12 D-5（INSPECT 病灶）：v1.6 搬家时展示窗朝了 0.4m 外的铁皮
  // 墙——玩家从便道走来只见黑背板。转 180°：空头版窗、弹簧门、
  // 投币器面向来向（「第一枚路标」终于把脸转回来）
  newsBox.position.set(10.62, 0, 6.1);
  newsBox.rotation.y = -Math.PI / 2 + 0.05;
  group.add(newsBox);
  const newsState = { t: -1 };
  updaters.push((dt) => {
    if (newsState.t < 0) return;
    newsState.t += dt;
    const k = newsState.t;
    if (k >= 0.9) { newsDoor.rotation.x = 0; newsState.t = -1; return; }
    // 快开慢弹：前 0.25s 拉开，随后弹簧拽回带两次余振
    const open = k < 0.25 ? Math.sin((k / 0.25) * Math.PI / 2) : Math.cos((k - 0.25) * 9) * Math.exp(-(k - 0.25) * 5);
    newsDoor.rotation.x = -0.55 * Math.max(0, open);
  });
  hotspots.add(newsBody, {
    hint: 'E — 投币报箱',
    onActivate: () => {
      if (newsState.t < 0) newsState.t = 0;
      audio.sfxAt('springdoor', 10.62, 6.1, 0.75, 3);
      ui.caption('头版是空白的。日期也是。', 3400);
    }
  });

  // ---------- 公交站（v1.4 五遍）：混凝土墩长凳 + 晒褪广告背板 + 歪站牌 ----------
  // E → 长凳往下沉一点、板条吱呀、你旁边浮起一缕烟——没有人坐在那里
  const busStop = new THREE.Group();
  busStop.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.14, 0.44, 0.56), -0.82, 0.22, 0),
    xform(new THREE.BoxGeometry(0.14, 0.44, 0.56), 0.82, 0.22, 0),
    xform(new THREE.BoxGeometry(0.2, 0.06, 0.6), -0.82, 0.03, 0),
    xform(new THREE.BoxGeometry(0.2, 0.06, 0.6), 0.82, 0.03, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x8e8b84, roughness: 0.95 })));
  const benchSlats = mergedMesh([
    xform(new THREE.BoxGeometry(1.9, 0.045, 0.13), 0, 0.465, 0.14),
    xform(new THREE.BoxGeometry(1.9, 0.045, 0.13), 0, 0.465, -0.02),
    xform(new THREE.BoxGeometry(1.9, 0.045, 0.13), 0, 0.465, -0.18),
    // 靠背上下沿木条（夹住广告板）
    xform(new THREE.BoxGeometry(1.9, 0.06, 0.05), 0, 1.06, -0.3, -0.1, 0, 0),
    xform(new THREE.BoxGeometry(1.9, 0.06, 0.05), 0, 0.56, -0.25, -0.1, 0, 0)
  ], woodMat({ base: [52, 38, 24], planks: 1, size: 128, seed: 87, gloss: 0.25 }));
  busStop.add(benchSlats);
  // 广告背板：晒得只剩奶白底 + 一道褪色的笑容弧 + 雨痕
  const adTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#c9bfa8';
    g.fillRect(0, 0, s, s);
    const r2 = rng(29);
    for (let i = 0; i < 26; i++) { // 雨痕竖streak
      g.fillStyle = `rgba(120,108,88,${0.05 + r2() * 0.09})`;
      const x = r2() * s;
      g.fillRect(x, r2() * s * 0.3, 1.5 + r2() * 2.5, s * (0.4 + r2() * 0.6));
    }
    // 只剩一个笑容（弧线断续，像磨掉一半的印刷）
    g.strokeStyle = 'rgba(60,32,28,0.55)';
    g.lineWidth = 7;
    g.setLineDash([16, 11]);
    g.beginPath();
    g.arc(s / 2, s * 0.3, s * 0.24, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    g.setLineDash([]);
    // 边框磨损
    g.strokeStyle = 'rgba(70,58,40,0.5)';
    g.lineWidth = 5;
    g.strokeRect(6, 6, s - 12, s - 12);
  });
  const adPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 0.46),
    new THREE.MeshStandardMaterial({ map: adTex, roughness: 0.85 }));
  adPanel.position.set(0, 0.81, -0.275);
  adPanel.rotation.x = -0.1;
  busStop.add(adPanel);
  // 歪站牌：细杆 + 锈箍 + 空白客车图形牌（不添字）
  const busPole = new THREE.Group();
  busPole.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.03, 0.035, 2.7, 10), 0, 1.35, 0),
    xform(new THREE.CylinderGeometry(0.037, 0.037, 0.09, 10), 0, 0.5, 0),
    xform(new THREE.CylinderGeometry(0.037, 0.037, 0.06, 10), 0, 1.62, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 0.6, metalness: 0.5 })));
  const busSignTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#182238';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#d8d2c0';
    g.lineWidth = 4;
    g.strokeRect(8, 8, s - 16, s - 16);
    // 客车图形：圆角车身 + 车窗条 + 双轮
    g.fillStyle = '#d8d2c0';
    g.beginPath();
    g.roundRect(26, 44, 76, 34, 8);
    g.fill();
    g.fillStyle = '#182238';
    g.fillRect(32, 50, 64, 10);
    g.fillStyle = '#d8d2c0';
    g.beginPath();
    g.arc(42, 82, 7, 0, Math.PI * 2);
    g.arc(86, 82, 7, 0, Math.PI * 2);
    g.fill();
  });
  const busSign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3),
    new THREE.MeshStandardMaterial({ map: busSignTex, roughness: 0.55, side: THREE.DoubleSide }));
  busSign.position.set(0, 2.45, 0.02);
  busPole.add(busSign);
  busPole.position.set(0.95, 0, 0.42);
  busPole.rotation.z = 0.05;
  busStop.add(busPole);
  // v1.10 抛光 P18 微动：牌面在螺栓上打颤——远处道路的低频从来
  // 没停过（8.2Hz 碎颤 ×0.9Hz 慢摆双叠，振幅肉眼将将可察）
  updaters.push((dt, t) => {
    busSign.rotation.x = Math.sin(t * 8.2) * 0.004 + Math.sin(t * 0.9) * 0.006;
  });
  // 烟缕（凳子远端上方，平时隐形）
  const benchWisp = smokeLayer(3, { x: 0.08, z: 0.08 }, { opacity: 0, size: 0.3, yBase: 0, ySpread: 0.5, color: 0xc8ccd4 });
  benchWisp.position.set(-0.62, 0.95, 0);
  busStop.add(benchWisp);
  updaters.push(benchWisp.userData.update);
  busStop.position.set(5.5, 0, 11.4);
  busStop.rotation.y = -Math.PI / 2 - 0.04;
  group.add(busStop);
  const benchState = { t: -1 };
  updaters.push((dt) => {
    if (benchState.t < 0) return;
    benchState.t += dt;
    const u = benchState.t;
    // 下沉（过阻尼弹簧）+ 4s 里烟缕起又散
    const dip = u < 0.3 ? (u / 0.3) * 0.016 : 0.016 * (1 + Math.sin((u - 0.3) * 7) * 0.18 * Math.exp(-(u - 0.3) * 3));
    busStop.position.y = -dip;
    benchWisp.material.opacity = u < 0.8 ? u * 0.22 : Math.max(0, 0.18 - (u - 0.8) * 0.05);
    if (u > 4.4) {
      benchState.t = -1;
      busStop.position.y = 0;
      benchWisp.material.opacity = 0;
    }
  });
  hotspots.add(benchSlats, {
    hint: 'E — 等车的长凳',
    onActivate: () => {
      if (benchState.t >= 0) return;
      benchState.t = 0;
      audio.sfxAt('creak', 5.5, 11.4, 0.4, 3);
      setTimeout(() => audio.sfx('breath', 0.32), 900);
      ui.caption('长凳往下沉了一点。你旁边没有人。', 4400);
    }
  });

  // ---------- 剧场外壳（侧墙/后墙——暗巷贴着它走） ----------
  const shellTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#191216';
    g.fillRect(0, 0, s, s);
    const bh = s / 12;
    for (let r = 0; r < 12; r++) {
      for (let c = -1; c < 7; c++) {
        const off = r % 2 ? s / 12 : 0;
        g.fillStyle = `rgb(${24 + Math.random() * 12},${18 + Math.random() * 8},${22 + Math.random() * 10})`;
        g.fillRect(c * (s / 6) + off + 1, r * bh + 1, s / 6 - 2, bh - 2);
      }
    }
  }, 5, 3);
  const shellMat = new THREE.MeshStandardMaterial({ map: shellTex, roughness: 0.9, bumpMap: shellTex, bumpScale: 0.35 });
  const mkShell = (w, h, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shellMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  mkShell(13.2, 8.2, 8.05, -20.2, -Math.PI / 2);  // 右侧外墙（面朝剧场内侧）
  mkShell(13.2, 8.2, -8.05, -20.2, Math.PI / 2);  // 左侧外墙
  mkShell(16.4, 8.2, 0, -26.6, Math.PI);          // 剧场后墙（空地内壁）
  // v1.9 抛光第 5 遍·修一处陈年剔除洞：右侧外墙法线朝剧场内，
  // 从暗巷看整面墙被背面剔除——巷子其实一直「透视」进剧场内幕布。
  // 补一面朝巷的砖墙（穿线管/接线盒这回真钉在墙上）
  mkShell(13.2, 8.2, 8.06, -20.2, Math.PI / 2);   // 同壳同料，法线朝巷

  // 空地围墙（挡住世界尽头）—— 瓦楞铁皮：竖向波纹 + 锈迹流挂 + 接板缝
  const corrTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#131118';
    g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 8) {
      const shade = 14 + Math.abs(Math.sin(x * 0.9)) * 22;
      g.fillStyle = `rgb(${shade},${shade - 2},${shade + 4})`;
      g.fillRect(x, 0, 4, s);
    }
    // 接板缝（每 64px 一条）+ 螺栓点
    for (let x = 0; x < s; x += 64) {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(x, 0, 2, s);
      g.fillStyle = '#2e2c34';
      for (let y = 10; y < s; y += 42) g.fillRect(x - 2, y, 5, 5);
    }
    // 锈迹流挂
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * s;
      g.fillStyle = 'rgba(52,30,20,0.28)';
      g.fillRect(x, Math.random() * s * 0.3, 3 + Math.random() * 5, s * (0.2 + Math.random() * 0.6));
    }
  }, 6, 1);
  const fenceMat = new THREE.MeshStandardMaterial({
    map: corrTex, roughness: 0.72, metalness: 0.55, bumpMap: corrTex, bumpScale: 0.5
  });
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.2), fenceMat);
  fence.position.set(0, 1.6, -33.6);
  group.add(fence);
  const fenceR = new THREE.Mesh(new THREE.PlaneGeometry(42, 3.2), fenceMat);
  fenceR.position.set(11.6, 1.6, -13);
  fenceR.rotation.y = -Math.PI / 2;
  group.add(fenceR);

  // ---------- 暗巷与背后空地（彩蛋区） ----------
  // v1.6：两盏壁灯共用一个 kill 通道——巷中恐惧拍与惊吓主体都会把整条巷按进黑里
  // v1.8：再加一个 panic 通道——猛闪（v1.22 起只留给转身惊吓前的异常）
  // v1.22：再加一个 dread 通道——接近段恐惧：越靠近拐角灯越不稳
  //（阈值随 lampDread.v 下压，闪断更频），退回去就恢复
  const lampKill = { v: 0 };
  const lampPanic = { v: 0 };
  const lampDread = { v: 0 };
  // 巷口一盏将熄的壁灯（v1.6 挂上铁皮墙：支臂 + 灯座，不再悬空）
  const alleyLamp = new THREE.PointLight(0xffc98a, 3.5, 9, 1.8);
  alleyLamp.position.set(11.05, 3.4, -6);
  const alleyBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc98a, emissiveIntensity: 2.4 })
  );
  alleyBulb.position.copy(alleyLamp.position);
  group.add(alleyLamp, alleyBulb);
  group.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.5, 0.05, 0.05), 11.32, 3.52, -6),
    xform(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 8), 11.05, 3.5, -6),
    xform(new THREE.BoxGeometry(0.05, 0.4, 0.12), 11.55, 3.42, -6)
  ], new THREE.MeshStandardMaterial({ color: 0x1c1a1e, roughness: 0.6, metalness: 0.5 })));
  updaters.push((dt, t) => {
    let f = (Math.sin(t * 19) * Math.sin(t * 6.3) > 0.55 - lampDread.v * 0.42 ? 0.12 : 1) * (1 - lampKill.v);
    if (lampPanic.v > 0) f = (Math.sin(t * 46) * Math.sin(t * 13.1) > -0.15 ? 1.5 : 0.04) * (1 - lampKill.v);
    alleyLamp.intensity = 3.5 * f;
    alleyBulb.material.emissiveIntensity = 2.4 * f;
  });
  // 巷中段第二盏壁灯（不同相位的将熄闪烁）+ 灯下杂物：板条箱堆 / 垃圾桶 / 积水
  const alleyLamp2 = new THREE.PointLight(0xffc98a, 3.0, 8, 1.8);
  alleyLamp2.position.set(8.35, 3.2, -19);
  const alleyBulb2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc98a, emissiveIntensity: 2.2 })
  );
  alleyBulb2.position.copy(alleyLamp2.position);
  group.add(alleyLamp2, alleyBulb2);
  updaters.push((dt, t) => {
    let f = (Math.sin(t * 15.3 + 2.1) * Math.sin(t * 5.1 + 0.7) > 0.62 - lampDread.v * 0.42 ? 0.1 : 1) * (1 - lampKill.v);
    if (lampPanic.v > 0) f = (Math.sin(t * 41 + 1.3) * Math.sin(t * 11.7) > -0.15 ? 1.4 : 0.04) * (1 - lampKill.v);
    alleyLamp2.intensity = 3.0 * f;
    alleyBulb2.material.emissiveIntensity = 2.2 * f;
  });
  // v1.6 巷中恐惧拍（声先于影）：走到巷子中段，两盏灯同时熄一口气——
  // 黑里有一次呼吸；灯回来的时候，什么都没有。为主惊吓垫的第一拍。
  const dreadTrig = zoneTrigger({ x: 9.3, z: -21.5, r: 2.6 }, () => {
    if (scare.phase !== 0) return; // 主惊吓进行中，恐惧拍让位
    lampKill.v = 1;
    audio.sfx('lampoff', 0.3);
    later(() => audio.sfx('breath', 0.55), 700);
    later(() => {
      if (scare.phase !== 0) return; // 灯已归主惊吓管，别中途点亮
      lampKill.v = 0;
      audio.sfx('lampon', 0.2);
    }, 2200);
  }, { cooldown: 90 });
  updaters.push((dt) => dreadTrig.update(player, dt));
  // 板条箱堆（三只错位叠放，板条纹木箱）
  const crateMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(128, (g, s) => {
      g.fillStyle = '#241812';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = '#3a2a1c';
      g.lineWidth = 6;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(0, (i / 4) * s); g.lineTo(s, (i / 4) * s); g.stroke();
      }
      g.strokeRect(3, 3, s - 6, s - 6);
    }),
    roughness: 0.85
  });
  const crates = mergedMesh([
    xform(new THREE.BoxGeometry(0.72, 0.5, 0.72), 10.5, 0.25, -14.6, 0, 0.12, 0),
    xform(new THREE.BoxGeometry(0.72, 0.5, 0.72), 10.45, 0.25, -15.45, 0, -0.2, 0),
    xform(new THREE.BoxGeometry(0.62, 0.44, 0.62), 10.48, 0.72, -15.0, 0, 0.5, 0)
  ], crateMat);
  group.add(crates);
  // 垃圾桶（皱褶铁皮 + 歪靠的盖）
  const canMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x3c3c40, roughness: 0.55, metalness: 0.8
  });
  const trashCan = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.78, 14), canMat);
  trashCan.position.set(10.55, 0.39, -22.6);
  const trashLid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 14), canMat);
  trashLid.position.set(10.2, 0.06, -23.3);
  trashLid.rotation.set(0.12, 0, 1.45);
  group.add(trashCan, trashLid);
  // v1.9 抛光第 5 遍·空间错位小机关：同一只垃圾桶在巷里出现两次——
  // 连盖子歪靠的角度都一样，墙上同一枚粉笔记号。不点破，走过的人自己发凉。
  const trashCan2 = trashCan.clone();
  trashCan2.position.set(10.55, 0.39, -19.5);
  const trashLid2 = trashLid.clone();
  trashLid2.position.set(10.2, 0.06, -20.2);
  group.add(trashCan2, trashLid2);
  const alleyChalkTex = canvasTexture(64, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = 'rgba(215,210,200,0.62)';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    // 一个圈 + 圈里一支向下的箭
    g.beginPath();
    g.arc(s / 2, s / 2, 21, 0.3, 6.1);
    g.stroke();
    g.beginPath();
    g.moveTo(s / 2, 16);
    g.lineTo(s / 2, 44);
    g.moveTo(s / 2 - 7, 36);
    g.lineTo(s / 2, 46);
    g.lineTo(s / 2 + 7, 36);
    g.stroke();
  });
  const alleyChalkMat = new THREE.MeshStandardMaterial({
    map: alleyChalkTex, transparent: true, roughness: 0.95,
    emissive: 0xd7d2c8, emissiveMap: alleyChalkTex, emissiveIntensity: 0.12
  });
  for (const cz of [-22.9, -19.8]) {
    const chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), alleyChalkMat);
    chalk.position.set(11.58, 1.18, cz);
    chalk.rotation.y = -Math.PI / 2;
    group.add(chalk);
  }
  // v1.14 彩蛋二批（门禁 69）：巷墙上一张揭了一半的旧戏报——撕下
  // 翘着的那只角（papertear 即时），纸片飘落墙脚（1.4s），底下露出
  // 更早一层的残纸；1.8s 后夜风又把地上的纸片掀了一下（flutter 错拍）。
  // 永久态：角撕掉就撕掉了，纸片从此躺在墙脚。零字幕。
  const oldBillTex = canvasTexture(128, (g, s) => {
    // 褪色戏报：纸底 + 边框 + 两行铅字 + 水渍；右下角是「更早一层」
    // 的残纸（被翘角盖住，撕开才看见）
    g.fillStyle = '#8f8571';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#7c7361';
    g.fillRect(s * 0.62, s * 0.58, s * 0.38, s * 0.42); // 更早一层（更暗更旧）
    g.strokeStyle = 'rgba(40,32,24,0.55)';
    g.lineWidth = 3;
    g.strokeRect(6, 6, s - 12, s - 12);
    g.fillStyle = 'rgba(38,30,22,0.78)';
    g.textAlign = 'center';
    g.font = '700 19px Georgia, serif';
    g.fillText('ÚLTIMA FUNCIÓN', s / 2, s * 0.3);
    g.font = '12px Georgia, serif';
    g.fillText('DESDE MEDIANOCHE', s / 2, s * 0.44);
    // 更早一层上只剩半个词（残纸的语气——更早一场的 MEDIANOCHE）
    g.fillStyle = 'rgba(30,24,18,0.5)';
    g.font = '700 15px Georgia, serif';
    g.fillText('…CHE', s * 0.8, s * 0.82);
    const pr = rng(58);
    for (let i = 0; i < 26; i++) { // 水渍与晒斑
      g.fillStyle = `rgba(60,50,38,${0.04 + pr() * 0.08})`;
      g.beginPath();
      g.arc(pr() * s, pr() * s, 3 + pr() * 10, 0, Math.PI * 2);
      g.fill();
    }
  });
  const oldBill = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.78),
    new THREE.MeshStandardMaterial({ map: oldBillTex, roughness: 0.94 })
  );
  oldBill.position.set(11.575, 1.62, -17.4);
  oldBill.rotation.y = -Math.PI / 2;
  group.add(oldBill);
  // 翘着的角：盖住右下（面向巷内看是左下）那块残纸层
  const billFlap = new THREE.Mesh(
    new THREE.PlaneGeometry(0.215, 0.33),
    new THREE.MeshStandardMaterial({ color: 0x99907c, roughness: 0.94, side: THREE.DoubleSide })
  );
  const flapPivot = new THREE.Group();
  // 撕缝在角块上缘：pivot 挂在缝上，角块垂在 pivot 下方
  billFlap.position.set(0, -0.165, 0);
  flapPivot.add(billFlap);
  flapPivot.position.set(11.57, 1.62 - 0.062, -17.4 - 0.173);
  flapPivot.rotation.y = -Math.PI / 2;
  flapPivot.rotation.x = -0.38; // 翘离墙面（风吃进来的那只角）
  group.add(flapPivot);
  const flapState = { t: -1, torn: false };
  updaters.push((dt, t) => {
    if (flapState.t < 0) {
      // 没撕之前：角在夜风里极轻地翕动
      if (!flapState.torn) flapPivot.rotation.x = -0.38 + Math.sin(t * 1.7) * 0.05;
      return;
    }
    flapState.t += dt;
    const u = flapState.t / 1.4;
    if (u >= 1) {
      flapState.t = -1; // 落定墙脚——从此躺在这里
      flapPivot.position.set(11.32, 0.022, -17.22);
      flapPivot.rotation.set(-Math.PI / 2, 0.7, 0);
      billFlap.position.set(0, 0, 0.001);
      return;
    }
    // 飘落：离墙 + 下坠 + 打旋
    flapPivot.position.x = 11.57 - u * 0.25;
    flapPivot.position.y = (1.62 - 0.062) * (1 - u * u) + 0.022 * u * u;
    flapPivot.position.z = -17.4 - 0.173 + Math.sin(u * Math.PI * 2) * 0.1 + u * 0.18;
    flapPivot.rotation.x = -0.38 - u * 1.2;
    flapPivot.rotation.z = Math.sin(u * Math.PI * 3) * 0.5;
  });
  hotspots.add(billFlap, {
    hint: 'E — 翘起的海报角',
    onActivate: () => {
      if (flapState.torn) {
        // 已经躺在墙脚——夜风替你掀它（挪 1cm，不再有下文）
        audio.sfxAt('page', 11.32, -17.22, 0.14, 3);
        flapPivot.position.z += 0.01;
        return;
      }
      flapState.torn = true; // 永久：撕掉的角回不去
      flapState.t = 0;
      audio.sfxAt('papertear', 11.57, -17.4, 0.7, 4);
      // 错拍：1.8s 后夜风把地上的纸片又掀了一下
      setTimeout(() => audio.sfxAt('flutter', 11.32, -17.22, 0.3, 5), 1800);
    }
  });
  // v1.9 抛光第 5 遍：巷侧穿线管——沿剧场东墙一条黑铁管走完暗巷，
  // 两只接线盒，中段一截电缆从管卡上松脱垂成弧（走巷时的近景视差层）
  {
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.6, metalness: 0.7 });
    // 剧场东墙面在 x=8.05：管/盒/卡全部贴墙装（盒凸出 10cm、管压在盒芯上）
    const conduitGeos = [
      xform(new THREE.CylinderGeometry(0.028, 0.028, 11.6, 8), 8.1, 2.62, -20.2, Math.PI / 2, 0, 0),
      xform(new THREE.BoxGeometry(0.1, 0.22, 0.16), 8.1, 2.62, -16.4),
      xform(new THREE.BoxGeometry(0.1, 0.22, 0.16), 8.1, 2.62, -24.4),
      // 管卡两只（中段留空——电缆就是从这儿松的）
      xform(new THREE.BoxGeometry(0.06, 0.1, 0.06), 8.09, 2.62, -18.3),
      xform(new THREE.BoxGeometry(0.06, 0.1, 0.06), 8.09, 2.62, -22.1)
    ];
    // 松脱电缆：两端挂在接线盒上，中段垂成一道弧、微微鼓进巷里（近景视差层）
    const sagCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(8.12, 2.56, -16.5),
      new THREE.Vector3(8.34, 1.5, -20.3),
      new THREE.Vector3(8.12, 2.56, -24.3)
    );
    conduitGeos.push(new THREE.TubeGeometry(sagCurve, 24, 0.014, 6));
    group.add(mergedMesh(conduitGeos, conduitMat));
  }

  // 巷面积水（暗镜面长条，映出将熄壁灯）
  const puddle = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 5.2),
    new THREE.MeshPhysicalMaterial({
      color: 0x05060a, roughness: 0.06, metalness: 0.1, envMapIntensity: 2.2,
      clearcoat: 1, clearcoatRoughness: 0.08
    })
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(9.5, 0.006, -18.2);
  group.add(puddle);

  // 后门 + 门上的看护灯（惊吓时熄灭）
  const backDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.4, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x201418, roughness: 0.7, metalness: 0.3 })
  );
  backDoor.position.set(-2.5, 1.2, -26.5);
  group.add(backDoor);
  const backLampLight = new THREE.PointLight(0xd8fff2, 4, 10, 1.8);
  backLampLight.position.set(-2.5, 3.1, -27.4);
  const backLampBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xd8fff2, emissiveIntensity: 2.6 })
  );
  backLampBulb.position.copy(backLampLight.position);
  group.add(backLampLight, backLampBulb);
  const backLampState = { on: 1 };
  updaters.push((dt, t) => {
    const flick = Math.sin(t * 13.7) > 0.88 ? 0.35 : 1;
    backLampLight.intensity = 4 * flick * backLampState.on;
    backLampBulb.material.emissiveIntensity = 2.6 * flick * backLampState.on;
  });

  // 大垃圾箱（那个东西住在它后面）——艺术二遍：
  // 斜口箱体 + 竖向压筋 + 双开盖微错位 + 侧袋钩 + 脚轮，惊吓闪光时剪影可信
  // v1.12 D-7（贴脸巡查病灶）：整箱一种无贴图近黑材质——肋条 4cm
  // 起伏在同色暗光下零读出，贴脸是一块无特征黑板；而它是拐角惊吓的
  // 戏剧锚点。shading 遍：工业漆面贴图（竖刷痕/底缘锈斑带/锈滴垂痕/
  // 盖缘刮亮/撕掉招贴留下的浅色方斑——零文字合规）；几何遍：叉车袋
  // ×2 + 四角护角钢并进肋条合并网格（零新增 mesh，mul 239 贴顶纪律）
  const dumpTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#16241d';
    g.fillRect(0, 0, s, s);
    const dr = rng(73);
    // 竖向刷痕（旧漆的方向感）
    for (let i = 0; i < 60; i++) {
      const x = dr() * s;
      g.strokeStyle = dr() > 0.5
        ? `rgba(42,62,52,${0.08 + dr() * 0.12})`
        : `rgba(10,18,14,${0.08 + dr() * 0.16})`;
      g.lineWidth = 1 + dr() * 3;
      g.beginPath();
      g.moveTo(x, dr() * 40);
      g.lineTo(x + (dr() - 0.5) * 10, s - dr() * 30);
      g.stroke();
    }
    // 撕掉招贴留下的浅色方斑（只有一块颜色更嫩的漆——零文字）
    g.fillStyle = 'rgba(56,78,64,0.32)';
    g.fillRect(s * 0.6, s * 0.28, s * 0.24, s * 0.2);
    g.strokeStyle = 'rgba(14,22,17,0.5)';
    g.lineWidth = 2;
    g.strokeRect(s * 0.6, s * 0.28, s * 0.24, s * 0.2);
    // 底缘锈斑带 + 锈滴垂痕
    for (let i = 0; i < 26; i++) {
      const x = dr() * s;
      const y = s - 6 - dr() * 34;
      const r = 4 + dr() * 12;
      g.fillStyle = `rgba(${74 + (dr() * 30) | 0},${44 + (dr() * 14) | 0},20,${0.2 + dr() * 0.3})`;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.5 + dr() * 0.5), dr() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 7; i++) {
      const x = dr() * s;
      const y0 = s * (0.1 + dr() * 0.3);
      g.strokeStyle = `rgba(66,40,18,${0.16 + dr() * 0.2})`;
      g.lineWidth = 1.5 + dr() * 2;
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x + (dr() - 0.5) * 6, y0 + s * (0.2 + dr() * 0.4));
      g.stroke();
    }
    // 盖缘/上部磕碰刮亮（露底金属的斜短痕）
    for (let i = 0; i < 14; i++) {
      const x = dr() * s;
      const y = dr() * s * 0.3;
      g.strokeStyle = `rgba(120,128,122,${0.1 + dr() * 0.16})`;
      g.lineWidth = 1 + dr();
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 6 + dr() * 16, y + 2 + dr() * 6);
      g.stroke();
    }
  });
  const dumpMat = new THREE.MeshStandardMaterial({
    map: dumpTex, roughness: 0.82, metalness: 0.3, envMapIntensity: 0.5
  });
  const dumpster = new THREE.Group();
  const dumpBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.25, 1.3), dumpMat);
  dumpBody.position.y = 0.78;
  // 上沿外翻边
  const dumpRim = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.07, 1.42), dumpMat);
  dumpRim.position.y = 1.42;
  // 竖向压筋（前后面各 5 道，合并）+ v1.12 D-7 叉车袋与四角护角钢
  const ribGeo = new THREE.BoxGeometry(0.07, 1.1, 0.04);
  const ribGeos = [];
  for (let i = 0; i < 5; i++) {
    const x = -1.0 + i * 0.5;
    ribGeos.push(xform(ribGeo, x, 0.76, 0.66));
    ribGeos.push(xform(ribGeo, x, 0.76, -0.66));
  }
  ribGeo.dispose();
  // 叉车袋：前后面各两只矩形套筒（垃圾车的叉齿从这里进）
  const pocketGeo = new THREE.BoxGeometry(0.36, 0.2, 0.06);
  for (const px of [-0.62, 0.62]) {
    ribGeos.push(xform(pocketGeo, px, 0.42, 0.675));
    ribGeos.push(xform(pocketGeo, px, 0.42, -0.675));
  }
  pocketGeo.dispose();
  // 四角护角钢（竖向棱线，暗光下箱体的最外剪影）
  const cornerGeo = new THREE.BoxGeometry(0.075, 1.18, 0.075);
  for (const [cx, cz] of [[-1.29, 0.64], [1.29, 0.64], [-1.29, -0.64], [1.29, -0.64]]) {
    ribGeos.push(xform(cornerGeo, cx, 0.77, cz));
  }
  cornerGeo.dispose();
  // 双开盖（微错位开角）+ 管状把手
  const lidGeo = new THREE.BoxGeometry(1.3, 0.07, 1.36);
  const lidL = new THREE.Mesh(lidGeo, dumpMat);
  lidL.position.set(-0.66, 1.5, -0.08);
  lidL.rotation.x = -0.14;
  const lidR = new THREE.Mesh(lidGeo, dumpMat);
  lidR.position.set(0.66, 1.53, -0.14);
  lidR.rotation.x = -0.3;
  const handleGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8);
  const handles = mergedMesh([
    xform(handleGeo, -0.66, 1.56, 0.55, 0, 0, Math.PI / 2),
    xform(handleGeo, 0.66, 1.63, 0.5, 0, 0, Math.PI / 2)
  ], dumpMat);
  handleGeo.dispose();
  // 脚轮 ×4
  const wheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10);
  const wheels = mergedMesh([
    xform(wheelGeo, -1.1, 0.09, 0.5, Math.PI / 2, 0, 0),
    xform(wheelGeo, 1.1, 0.09, 0.5, Math.PI / 2, 0, 0),
    xform(wheelGeo, -1.1, 0.09, -0.5, Math.PI / 2, 0, 0),
    xform(wheelGeo, 1.1, 0.09, -0.5, Math.PI / 2, 0, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.6, metalness: 0.3 }));
  wheelGeo.dispose();
  dumpster.add(dumpBody, dumpRim, mergedMesh(ribGeos, dumpMat), lidL, lidR, handles, wheels);
  dumpster.position.set(4.2, 0, -31.6);
  dumpster.rotation.y = 0.16;
  group.add(dumpster);
  // 垃圾袋
  for (const [x, z, s] of [[2.4, -31.9, 0.42], [5.9, -31.3, 0.36], [6.5, -31.8, 0.3]]) {
    const bagGeo = new THREE.SphereGeometry(s, 7, 6);
    const bp = bagGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      bp.setY(i, bp.getY(i) * 0.72 + (Math.random() - 0.5) * 0.05);
    }
    bagGeo.computeVertexNormals();
    const bag = new THREE.Mesh(bagGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.5, metalness: 0.1 }));
    bag.position.set(x, s * 0.6, z);
    group.add(bag);
  }
  // 蒸汽口（v1.9 件 2 升级 v2：铸铁立管+弯头+喇叭口 + 保温包扎布三匝 +
  // 管根滴水锈迹贴花 + 地面格栅——空地的蒸汽第一次有了来处。
  // E → 管子先咳一声，半拍后猛喷一大口。）
  const ventSteam = smokeLayer(24, { x: 1.2, z: 1.2 }, { opacity: 0.06, size: 3.4, yBase: 0.2, ySpread: 2.2, color: 0xb8bcc4 });
  ventSteam.position.set(-6.5, 0, -30.5);
  group.add(ventSteam);
  updaters.push(ventSteam.userData.update);
  const ventPipe = new THREE.Group();
  {
    const pipeMat = new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(), color: 0x3c3a40, roughness: 0.55, metalness: 0.85, envMapIntensity: 0.7
    });
    // 立管从铁皮墙根拔起 + 弯头 + 朝格栅的喇叭口 + 两道法兰
    // （弯头：YZ 面四分之一环，起点接管顶切向 +Y、终点切向 +Z；
    //   喇叭口顺着弯头终点接出、微微下探对着地面格栅）
    ventPipe.add(mergedMesh([
      xform(new THREE.CylinderGeometry(0.085, 0.09, 1.7, 12), 0, 0.85, 0),
      xform(new THREE.TorusGeometry(0.14, 0.085, 10, 12, Math.PI / 2), 0, 1.7, 0.14, 0, Math.PI / 2, 0),
      xform(new THREE.CylinderGeometry(0.13, 0.085, 0.3, 12), 0, 1.8, 0.28, Math.PI / 2 + 0.3, 0, 0),
      xform(new THREE.CylinderGeometry(0.115, 0.115, 0.045, 12), 0, 0.32, 0),
      xform(new THREE.CylinderGeometry(0.115, 0.115, 0.045, 12), 0, 1.28, 0)
    ], pipeMat));
    // 保温包扎布三匝（旧帆布色，缠在中段，端头一小截垂布）
    const wrapMat = new THREE.MeshStandardMaterial({ color: 0x5a5244, roughness: 0.95 });
    ventPipe.add(mergedMesh([
      xform(new THREE.CylinderGeometry(0.105, 0.105, 0.34, 12), 0, 0.62, 0, 0, 0, 0.02),
      xform(new THREE.CylinderGeometry(0.102, 0.108, 0.2, 12), 0, 0.92, 0, 0, 0, -0.03),
      xform(new THREE.CylinderGeometry(0.108, 0.102, 0.24, 12), 0, 1.52, 0, 0, 0, 0.025),
      xform(new THREE.BoxGeometry(0.09, 0.2, 0.014), 0.07, 0.5, 0.06, 0.1, 0, 0.3)
    ], wrapMat));
    // 管根滴水锈迹贴花（半透明流挂）
    const rustDripTex = canvasTexture(64, (g, s) => {
      g.clearRect(0, 0, s, s);
      for (let i = 0; i < 7; i++) {
        const x = 8 + i * 7 + (i % 3) * 2;
        const grad = g.createLinearGradient(0, 6, 0, 34 + (i % 4) * 8);
        grad.addColorStop(0, 'rgba(96,48,22,0.55)');
        grad.addColorStop(1, 'rgba(96,48,22,0)');
        g.fillStyle = grad;
        g.fillRect(x, 6, 2.2, 34 + (i % 4) * 8);
      }
    });
    const rustDrip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.42),
      new THREE.MeshBasicMaterial({ map: rustDripTex, transparent: true, depthWrite: false })
    );
    rustDrip.position.set(0, 0.24, 0.1);
    ventPipe.add(rustDrip);
    // 地面格栅（喇叭口正对的那格）
    const grateGeos = [];
    for (let i = 0; i < 5; i++) grateGeos.push(xform(new THREE.BoxGeometry(0.4, 0.015, 0.045), 0, 0.012, 0.32 + (i - 2) * 0.085));
    grateGeos.push(xform(new THREE.BoxGeometry(0.05, 0.02, 0.46), -0.18, 0.012, 0.32));
    grateGeos.push(xform(new THREE.BoxGeometry(0.05, 0.02, 0.46), 0.18, 0.012, 0.32));
    ventPipe.add(mergedMesh(grateGeos, new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.7, metalness: 0.4 })));
    ventPipe.position.set(-6.5, 0, -30.9);
    group.add(ventPipe);
    const ventBurst = { t: -1 };
    updaters.push((dt) => {
      if (ventBurst.t < 0) return;
      ventBurst.t += dt;
      const u = ventBurst.t;
      if (u > 3.4) { ventBurst.t = -1; ventSteam.material.opacity = 0.06; return; }
      // 咳一声（0.5s 憋住）→ 猛喷（1.2s 峰值 0.3）→ 缓落
      ventSteam.material.opacity = u < 0.5 ? 0.02
        : 0.06 + Math.sin(Math.min(1, (u - 0.5) / 1.2) * Math.PI) * 0.26;
    });
    hotspots.add(ventPipe.children[0], {
      hint: 'E — 蒸汽立管',
      onActivate: () => {
        if (ventBurst.t >= 0) return;
        ventBurst.t = 0;
        audio.sfxAt('clank', -6.5, -30.9, 0.4);
        setTimeout(() => audio.sfxAt('steam', -6.5, -30.9, 0.8), 520);
        ui.caption('它一直烧着。给谁供的暖，不知道。', 3800);
      }
    });
  }

  // 巷内电话亭 v2（立柱框架 + 玻璃 + 折门 + 螺旋话线；不通向任何地方）
  // v1.6：贴到铁皮墙根（walkable 收到 x≤10.1，玩家从亭前经过而不再穿进亭身）
  const booth = phoneBooth({ mats: M });
  booth.position.set(10.72, 0, -18);
  booth.rotation.y = -Math.PI / 2;
  group.add(booth);
  const boothState = { open: 0, target: 0 };
  updaters.push((dt, t) => {
    boothState.open += (boothState.target - boothState.open) * Math.min(1, dt * 4);
    booth.userData.door.rotation.y = boothState.open * -1.15;
    booth.userData.topSignMat.emissiveIntensity =
      0.9 * (Math.sin(t * 15.3) > 0.92 ? 0.3 : 1);
  });
  hotspots.add(booth.userData.door.children[0].children[0], {
    hint: 'E — 折门',
    onActivate: () => {
      boothState.target = boothState.target > 0.5 ? 0 : 1;
      audio.sfx('clank', 0.4);
    }
  });
  hotspots.add(booth.userData.handset, {
    hint: 'E — 听筒还挂着微温',
    onActivate: () => {
      audio.sfx('radio', 0.6);
      ui.caption('没有拨号音。只有呼吸。', 3600);
    }
  });
  // 转盘拨号 —— 顺时针转到底，再嗒嗒嗒弹回
  const dialState = { t: 0 };
  updaters.push((dt) => {
    if (dialState.t <= 0) return;
    dialState.t = Math.max(0, dialState.t - dt);
    const k = dialState.t > 0.6 ? (1.2 - dialState.t) / 0.6 : dialState.t / 0.6;
    booth.userData.dial.rotation.z = -k * 2.4;
  });
  hotspots.add(booth.userData.dialDisc, {
    hint: 'E — 转一格拨号盘',
    onActivate: () => {
      dialState.t = 1.2;
      audio.sfx('clank', 0.22);
      later(() => audio.sfxAt('ratchet', 10.72, -18, 0.85), 580);
    }
  });

  // ---------- 惊吓 v1.22 主触发：THE THING AROUND THE CORNER ----------
  // 显形线触发（cornerTrigger v2）：玩家视线**即将越过拐角看见墙后
  // 之物**的那一帧就是扳机——不提前（走近的路交给 APPROACH_DREAD
  // 涨恐惧，不预支现身）、不延后（跨线即闪出，没有 2.2s 前奏）。
  // 单拍节奏（SCARE_BEATS 实时钟）：灯一口气全灭 + 剪影光起 + 它从
  // 拐角后 0.55s 减速滑出（带三口急抽搐）→ 错拍：站住盯你 → 扑近 →
  // 闷击 + uShock 冲击 + 暗红闪帧 → 黑幕 → 空间错位移回巷口。
  // 全程镜头特写接管（CLOSEUP）：yaw/pitch 平滑锁向那张脸并跟焦、
  // FOV 慢推 13°、双脚钉死——看见它的人动不了。冷却后可重复。
  const figure = veiledFigure(2.3);
  figure.visible = false;
  group.add(figure);
  // ---------- 惊吓主体 v4（v1.15 门禁 72）：GLB 换网格、程序化动画保留 ----------
  // 拐角魅影换成 DCC 管线定稿（corner_wraith.glb：车削布褶/发帘绺条/
  // 眼窝空洞五拍精修，12 mesh / 6.8k tris）。**评估结论**：GLB 无动画轨
  // （bpy 侧未烘 action），AnimationMixer 无轨可播——走「仅换网格保留
  // 程序化动画」：gen 脚本已把臂/帘原点设在肩点与头心（关节即对象原点），
  // 运行时装一副枢轴（pivot 体态 + headPivot 顿挪抬头 + 双臂拖摆），
  // setLurch/setRush 用 kit.cornerWraith v3 同一套曲线驱动。
  // 材质钳制走黑影类口径：roughness≥0.92 / metalness 0 / env 0.2 /
  // 眼环与内衬 emissive 保留（红光呼吸是这个角色仅有的心跳）。
  // GLB 解析失败则装回程序化 cornerWraith(2.35)——惊吓不因资产缺席。
  const wraith = new THREE.Group();
  wraith.visible = false;
  wraith.userData.setLurch = () => {};
  wraith.userData.setRush = () => {};
  group.add(wraith);
  const wraithReady = new Promise((resolve) => {
    const b64 = wraithGlbUri.slice(wraithGlbUri.indexOf(',') + 1);
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    new GLTFLoader().parse(buf.buffer, '', (gltf) => {
      const H = 2.35;
      let eyeMat = null;
      let bodyMat = null;
      gltf.scene.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material.roughness = Math.max(o.material.roughness ?? 1, 0.92);
          o.material.metalness = 0;
          o.material.envMapIntensity = 0.2;
          if (o.material.name === 'wraithEye') eyeMat = o.material;
          if (o.material.name === 'wraithBody') bodyMat = o.material;
        }
      });
      // bpy 侧的常态歪度烘在 wraithPivot 空物上——清零交还运行时
      // （setLurch/setRush 自带常态前倾与 0.06 侧歪）
      const baked = gltf.scene.getObjectByName('wraithPivot');
      if (baked) baked.rotation.set(0, 0, 0);
      // GLB 前脸在局部 -z（Blender +Y 经 Y-up 换算）——绕 y 转半圈，
      // 恢复「lookAt 后 +z 朝玩家」的 kit 约定（眼窝must看着你）
      gltf.scene.rotation.y = Math.PI;
      const pivot = new THREE.Group();
      pivot.add(gltf.scene);
      wraith.add(pivot);
      wraith.updateMatrixWorld(true);
      // 运行时枢轴：头件（发帘/绺束/面部空洞/眼窝 ×4）attach 进头心
      // 枢轴（attach 保世界位形——Y-up 换算全部由它消化）
      const headPivot = new THREE.Group();
      headPivot.position.set(0, H * 0.84, 0);
      pivot.add(headPivot);
      const veil = gltf.scene.getObjectByName('hairVeil');
      for (const name of ['hairVeil', 'hairStrands', 'faceVoidMesh',
        'eyeRing_L', 'eyeRing_R', 'eyeVoid_L', 'eyeVoid_R']) {
        const n = gltf.scene.getObjectByName(name);
        if (n) headPivot.attach(n);
      }
      const armL = gltf.scene.getObjectByName('arm_L');
      const armR = gltf.scene.getObjectByName('arm_R');
      // kit.cornerWraith v3 同一套体态曲线（顿挪冻住/越挪越前倾/
      // 头一档一档抬起/红光与眼窝错半拍呼吸/扑近烧亮）
      wraith.userData.setLurch = (s, t = 0) => {
        const beat = Math.sin(s * Math.PI * 6);
        pivot.rotation.x = 0.12 + s * 0.14;
        pivot.rotation.z = 0.06 + s * 0.045 + beat * 0.075;
        pivot.position.y = Math.abs(beat) * 0.035;
        headPivot.rotation.x = -(0.06 + s * 0.34);
        headPivot.rotation.z = -0.06 * s + beat * 0.03;
        if (veil) {
          veil.rotation.z = Math.sin(t * 1.7) * 0.045 - beat * 0.03;
          veil.rotation.x = Math.sin(t * 1.15 + 0.8) * 0.028;
        }
        if (armL) { armL.rotation.x = -0.08 + beat * 0.1; armL.rotation.z = 0.05 * beat; }
        if (armR) { armR.rotation.x = -0.08 - beat * 0.1; armR.rotation.z = 0.05 * beat; }
        if (bodyMat) bodyMat.emissiveIntensity = 0.42 + 0.36 * (0.5 + 0.5 * Math.sin(t * 2.4));
        if (eyeMat) eyeMat.emissiveIntensity = 0.55 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.4 + 1.2));
      };
      wraith.userData.setRush = (k, t = 0) => {
        pivot.rotation.x = 0.26 + 0.3 * k;
        pivot.rotation.z = 0.06 + Math.sin(t * 11) * 0.06 * k;
        pivot.position.y = 0;
        headPivot.rotation.x = -0.4 - 0.22 * k;
        headPivot.rotation.z = 0;
        if (veil) {
          veil.rotation.x = -0.14 * k;
          veil.rotation.z = Math.sin(t * 13) * 0.05 * k;
        }
        if (armL) armL.rotation.x = -0.08 - 0.55 * k;
        if (armR) armR.rotation.x = -0.08 - 0.55 * k;
        gltf.scene.scale.set(1 + k * 0.08, 1, 1 + k * 0.08);
        if (bodyMat) bodyMat.emissiveIntensity = 0.9 + k * 0.5;
        if (eyeMat) eyeMat.emissiveIntensity = 1.2 + k * 1.6;
      };
      console.log('[sv] glb-landed mulholland wraith');
      resolve(gltf.scene);
    }, (err) => {
      console.warn('[sv] glb-failed mulholland wraith', err);
      // 兜底：程序化魅影上岗（v3 全套动画在 userData 里现成）
      const proc = cornerWraith(2.35);
      wraith.add(proc);
      wraith.userData.setLurch = (s, t) => proc.userData.setLurch(s, t);
      wraith.userData.setRush = (k, t) => proc.userData.setRush(k, t);
      resolve(null);
    });
  });
  // 剪影光：拐角后一盏冷背光——黑影闪出时只读出轮廓，读不出任何细节
  // （从 out 点身后西南方向打过来——发帘团块剪影贴着拐角沿被背光
  // 切出来，眼窝空洞是剪影里仅有的两点）
  const rimLight = new THREE.PointLight(0x9fb7ff, 0, 11, 1.6);
  rimLight.position.set(6.3, 2.5, -28.7);
  group.add(rimLight);
  const rimState = { on: 0 };
  updaters.push((dt) => {
    rimLight.intensity += (rimState.on * 6.5 - rimLight.intensity) * Math.min(1, dt * 7);
  });
  // 黑影闪出路径（v1.22）：REVEAL_PATH 三点贝塞尔——poise 是显形线
  // 另一端（跨线前从巷内任何点看都被侧墙截断，触发帧恰好半身入画），
  // 贴着墙南端点外侧滑到拐角沿本体 out（离触发中的玩家约 0.9m）。
  const revealBez = (s, out) => {
    const u = 1 - s;
    const { poise: A, corner: B, out: C } = REVEAL_PATH;
    out.set(
      u * u * A.x + 2 * u * s * B.x + s * s * C.x, 0,
      u * u * A.z + 2 * u * s * B.z + s * s * C.z);
    return out;
  };
  const scare = { phase: 0, sub: null, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };
  // v1.22 镜头特写接管：pitchObject 是 camera 的父节点、yawObject 是
  // 祖父节点（controls 装配约定，WORKLOG v1.21 转盘取证同口径）。
  // 接管期间双脚钉死在跨线点、yaw/pitch 平滑锁向魅影头部并全程跟焦、
  // FOV 慢推（CLOSEUP.fovPush）——黑幕帧归还镜头。
  const pitchObj = engine.camera ? engine.camera.parent : null;
  const yawObj = pitchObj ? pitchObj.parent : null;
  const baseFov = engine.camera ? engine.camera.fov : 70;
  const grab = { on: false, t: 0, pin: { x: 0, z: 0 } };
  const releaseGrab = () => {
    grab.on = false;
    if (engine.camera && engine.camera.fov !== baseFov) {
      engine.camera.fov = baseFov;
      engine.camera.updateProjectionMatrix();
    }
  };

  // v1.11 P16：夜风偶尔推一下巷侧瓦楞围栏（fencewomp，seeded 稀发）——
  // 位置沿围栏随机（x=11.55 那面），每次都从不太一样的地方响。给长巷
  // 一个「这里的铁皮都松了」的材料证词；惊吓进行中不叠（不稀释节拍）。
  const fenceRng = rng(67);
  const fenceState = { timer: 40 + fenceRng() * 50 };
  updaters.push((dt) => {
    fenceState.timer -= dt;
    if (fenceState.timer > 0) return;
    fenceState.timer = 75 + fenceRng() * 55;
    if (scare.sub !== null) return; // 这一阵风让给惊吓
    audio.sfxAt('fencewomp', 11.55, -8 - fenceRng() * 18, 0.16, 4);
  });

  // 两重惊吓共用的收尾：黑幕里被移回巷口（背对来路），灯与声音归还
  const wakeUp = (caption) => {
    releaseGrab();
    teleport(WAKE_POINT.x, WAKE_POINT.z, Math.PI);
    ui.fade(false);
    backLampState.on = 1;
    lampKill.v = 0;
    audio.sfx('whisper', 0.7);
    ui.caption(caption, 5200);
    scare.phase = 0;
    scare.sub = null;
  };

  const doCornerScare = () => {
    if (scare.phase !== 0) return;
    scare.phase = 2;
    scare.sub = 'reveal';
    scare.t = 0;
    const B = SCARE_BEATS;
    // 跨线那一帧（reveal）：世界的灯一口气全灭（狂闪前奏退役——原片
    // 的黑一步到位，剪影光是黑里仅有的光）+ 声音塌下去 + 拐角一声
    // 刮擦；它同帧从拐角后开始滑出；镜头特写接管 + 双脚钉死同帧起。
    const pv0 = pose ? pose() : { x: player.x, z: player.z, yaw: 0 };
    grab.on = true;
    grab.t = 0;
    grab.pin.x = pv0.x;
    grab.pin.z = pv0.z;
    lampPanic.v = 0;
    lampDread.v = 0;
    lampKill.v = 1;
    backLampState.on = 0;
    audio.sfx('lampoff', 0.4);
    audio.sfx('dreadswell', 0.75);
    audio.duck(1.3, 0.06, 2.0);
    audio.sfxAt('scrape', CORNER_EDGE.x, CORNER_EDGE.z, 0.9, 5);
    revealBez(0, wraith.position);
    wraith.visible = true;
    rimState.on = 1;
    // 错拍（stare）：全身出角落定一声闷响，然后它就站在那儿看你——
    // 什么都不做（红光与眼窝错半拍呼吸是仅有的动静），心跳替你数拍
    later(() => {
      scare.sub = 'stare';
      scare.t = 0;
      audio.sfxAt('thud', CORNER_EDGE.x, CORNER_EDGE.z, 0.42, 4);
    }, B.stare);
    later(() => audio.sfx('heartbeat', 0.5), B.stare + 120);
    later(() => audio.sfx('heartbeat', 0.62), B.stare + 520);
    // 扑近（从现身定点直线冲到脸前）
    later(() => {
      scare.sub = 'rush';
      scare.t = 0;
      const pv = pose ? pose() : { x: player.x, z: player.z, yaw: 0 };
      scare.from.copy(wraith.position);
      const dx = pv.x - wraith.position.x;
      const dz = pv.z - wraith.position.z;
      const d = Math.hypot(dx, dz) || 1;
      scare.to.set(pv.x - (dx / d) * 0.85, 0, pv.z - (dz / d) * 0.85);
      audio.sfx('scare');
      audio.sfx('breath', 0.85);
      // v1.10 P7：它扑近的同一拍，雾也收拢一口（世界跟着收紧，
      // 引擎瞬态 ~3s 自行退掉——横跨黑幕，醒来时雾还没完全松开）
      engine.fogSurge(0.9);
    }, B.rush);
    later(() => { // 扑到脸前：闷击 + 后处理冲击 + 暗红闪帧
      audio.sfx('thud', 1.0);
      engine.shock(1, 0.9, 0x1a0000);
    }, B.shock);
    later(() => { // 黑幕：归还镜头与 FOV（黑里换手，玩家看不见接缝）
      wraith.visible = false;
      rimState.on = 0;
      ui.fade(true);
      releaseGrab();
    }, B.blackout);
    later(() => wakeUp('有些拐角，不该拐过去。'), B.wake);
  };
  updaters.push((dt, t) => {
    if (scare.phase !== 2) return;
    scare.t += dt;
    if (scare.sub === 'rush') {
      const k = Math.min(1, scare.t / 0.4); // 0.4s 加速冲到脸前（闷击同帧到）
      wraith.position.lerpVectors(scare.from, scare.to, k * k);
      wraith.lookAt(player.x, 1.5, player.z);
      wraith.userData.setRush(k, t);
    } else if (scare.sub === 'reveal' && wraith.visible) {
      // 闪出：0.55s 立方减速滑（快出角、减速站定）；体态复用 setLurch
      // 曲线（s 快扫 0→1 → 三口急抽搐——它不是走出来的，是抽搐着
      // 滑出来的），s=1 恰好落在冻结平台上
      const k = Math.min(1, scare.t / (SCARE_BEATS.stare / 1000));
      const s = 1 - (1 - k) ** 3;
      revealBez(s, wraith.position);
      wraith.lookAt(player.x, 1.5, player.z);
      wraith.userData.setLurch(s, t);
    } else if (scare.sub === 'stare') {
      // 错拍：死死站住（s=1 冻结位），只有红光呼吸与发帘慢摆还活着
      wraith.lookAt(player.x, 1.5, player.z);
      wraith.userData.setLurch(1, t);
    }
  });
  const cornerTrig = cornerTrigger(CORNER_SCARE, doCornerScare,
    { fov: CORNER_SCARE.fov, cooldown: CORNER_SCARE.cooldown });
  updaters.push((dt) => {
    if (pose) cornerTrig.update(pose(), dt);
  });
  // v1.22 镜头特写接管（注册在惊吓位移更新器之后——同帧读到的是
  // 魅影的最新位置）：smoothstep 入锁 0.45s，之后死锁跟焦；FOV 在
  // reveal→rush 窗内推近 13°（林奇式慢推），黑幕帧由 releaseGrab 归还
  updaters.push((dt) => {
    if (!grab.on) return;
    grab.t += dt;
    // 双脚钉死在跨线点（看见它的人动不了；y 的呼吸/步摆不动）
    player.x = grab.pin.x;
    player.z = grab.pin.z;
    if (!yawObj || !pitchObj) return;
    const hx = wraith.position.x;
    const hz = wraith.position.z;
    const want = Math.atan2(-(hx - player.x), -(hz - player.z));
    let dy = want - yawObj.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    const g = Math.min(1, grab.t / CLOSEUP.grabIn);
    const k = g * g * (3 - 2 * g); // smoothstep 入锁
    yawObj.rotation.y += dy * k;
    const dist = Math.max(0.4, Math.hypot(hx - player.x, hz - player.z));
    const wantPitch = Math.atan2(CLOSEUP.headY - 1.68, dist);
    pitchObj.rotation.x += (wantPitch - pitchObj.rotation.x) * k;
    if (engine.camera) {
      const push = Math.min(1, grab.t / (SCARE_BEATS.rush / 1000));
      engine.camera.fov = baseFov - CLOSEUP.fovPush * push;
      engine.camera.updateProjectionMatrix();
    }
  });
  // v1.22 接近段恐惧（APPROACH_DREAD）：巷内向拐角推进 q∈[0,1]——
  // 心跳渐密渐响（游戏时钟累加，软渲染安全）、巷灯渐次不稳
  // （lampDread 通道）、q 过半程一次低频升压；退回去就退潮。
  // 只在扳机上膛时生效——冷却中的巷子是安静的巷子（不预支恐惧）。
  const dread = { beatT: 0, swelled: false };
  updaters.push((dt) => {
    if (scare.phase !== 0 || !cornerTrig.armed()) { lampDread.v = 0; return; }
    const pv = pose ? pose() : { x: player.x, z: player.z };
    const inAlley = pv.x >= ALLEY.minX && pv.x <= ALLEY.maxX;
    const q = inAlley
      ? Math.max(0, Math.min(1, (APPROACH_DREAD.z0 - pv.z) / (APPROACH_DREAD.z0 - APPROACH_DREAD.z1)))
      : 0;
    lampDread.v = q;
    if (dread.swelled && q <= APPROACH_DREAD.rearmBelow) dread.swelled = false;
    if (q <= 0) { dread.beatT = 0; return; }
    if (!dread.swelled && q >= APPROACH_DREAD.swellAt) {
      dread.swelled = true;
      audio.sfx('dreadswell', 0.3);
    }
    if (q < 0.25) return; // 巷口浅段不起拍——恐惧从巷子中段才开始数
    dread.beatT += dt;
    const interval = 2.1 - q * 1.45; // 心跳间隔 2.1s → 0.65s
    if (dread.beatT >= interval) {
      dread.beatT = 0;
      audio.sfx('heartbeat', 0.16 + 0.3 * q);
    }
  });

  // ---------- 惊吓 v1.7（保留第二扳机）：THE THING BEHIND YOU ----------
  // 在暗巷深段/背后空地驻留 1s 上膛之后，任何一次甩头式回望
  // （半秒内转过约 180°），那个东西已经在你转过去的方向上、
  // 离你 4.6 米、正在扑来——转身与看见之间没有间隙。
  const doScare = () => {
    if (scare.phase !== 0) return;
    scare.phase = 1;
    scare.t = 0;
    const pv = pose ? pose() : { x: player.x, z: player.z, yaw: 0 };
    // 玩家转过去正对的方向（yaw 0 → -z）：它就在那条视线上
    const fx = -Math.sin(pv.yaw);
    const fz = -Math.cos(pv.yaw);
    scare.from.set(pv.x + fx * 4.6, 0, pv.z + fz * 4.6);
    scare.to.set(pv.x + fx * 0.85, 0, pv.z + fz * 0.85);
    figure.position.copy(scare.from);
    figure.visible = true;
    // 转身的同一帧：整巷壁灯 + 后门看护灯齐灭，世界的声音被抽走
    lampKill.v = 1;
    backLampState.on = 0;
    audio.duck(1.3, 0.02, 2.8);
    audio.sfx('scare');
    audio.sfx('breath', 0.85);
    // v1.10 P7：回头看见的同一帧雾收拢一口（与拐角惊吓同语言）
    engine.fogSurge(0.9);
    later(() => {
      // 扑到脸前的一拍：闷击 + 后处理冲击 + 暗红闪帧
      audio.sfx('thud', 1.0);
      engine.shock(1, 0.9, 0x1a0000);
    }, 400);
    later(() => {
      // 黑幕 + 空间错位：醒来时你已回到巷口
      figure.visible = false;
      ui.fade(true);
    }, 1000);
    later(() => wakeUp('有些东西只在你回头时存在。'), 1750);
  };
  updaters.push((dt, t) => {
    if (scare.phase !== 1) return;
    scare.t += dt;
    const k = Math.min(1, scare.t / 0.42); // 0.42s 内从 4.6m 扑到脸前（加速冲刺）
    figure.position.lerpVectors(scare.from, scare.to, k * k);
    figure.lookAt(player.x, 1.5, player.z);
    figure.userData.setRush(k, t); // 前倾 + 裙裾展开 + 连续侧摆——不是痉挛方块
  });
  const turnTrig = turnTrigger(SCARE_REGION, doScare, TURN_SCARE);
  updaters.push((dt) => {
    if (pose) turnTrig.update(pose(), dt);
  });

  // ---------- v1.8 场景二级细节：拐角会说话 ----------
  // ① 后墙拐角根的刮痕组（南面，从拐角后往外拖的方向）——E → 一声很近的
  // 刮擦 + 半拍后黑里一次呼吸（它听见你摸了它的墙）
  const scratchTex = canvasTexture(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const sr = rng(89);
    g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const y0 = 14 + sr() * (s - 40);
      const drift = 8 + sr() * 22;
      g.strokeStyle = `rgba(${168 + (sr() * 40) | 0},${160 + (sr() * 30) | 0},${150 + (sr() * 30) | 0},${0.28 + sr() * 0.3})`;
      g.lineWidth = 1.2 + sr() * 2.2;
      g.beginPath();
      g.moveTo(s - 6, y0);
      g.quadraticCurveTo(s * 0.55, y0 + drift * 0.4, 8 + sr() * 14, y0 + drift);
      g.stroke();
    }
    // 尽头三道并排的短抓痕（更深）
    g.strokeStyle = 'rgba(190,180,164,0.55)';
    g.lineWidth = 2.6;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(16, 44 + i * 12);
      g.lineTo(40, 52 + i * 12);
      g.stroke();
    }
  });
  const scratch = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.0),
    new THREE.MeshStandardMaterial({
      map: scratchTex, transparent: true, roughness: 0.85,
      emissive: 0xffffff, emissiveMap: scratchTex, emissiveIntensity: 0.06
    })
  );
  scratch.position.set(7.35, 1.3, -26.67);
  scratch.rotation.y = Math.PI;
  group.add(scratch);
  hotspots.add(scratch, {
    hint: 'E — 墙角的刮痕',
    onActivate: () => {
      audio.sfxAt('scrape', 7.35, -26.7, 0.45, 3);
      later(() => audio.sfx('breath', 0.35), 700);
      ui.caption('刮痕比你高，还在变多。', 4200);
    }
  });
  // ② 拐角后的地面拖痕 + 焦黑蹲踞斑（它等的地方）——纯细节，不加交互
  const dragTex = canvasTexture(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const dr = rng(97);
    // 蹲踞斑：一团焦黑（多层半透圆叠出边缘不齐）
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(4,3,6,${0.16 + dr() * 0.14})`;
      g.beginPath();
      g.ellipse(34 + dr() * 10, s - 32 + dr() * 8, 16 + dr() * 12, 10 + dr() * 8, dr(), 0, Math.PI * 2);
      g.fill();
    }
    // 拖痕：往拐角方向的几道平行擦线
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = `rgba(10,8,12,${0.3 + dr() * 0.25})`;
      g.lineWidth = 2 + dr() * 3;
      g.beginPath();
      g.moveTo(28 + dr() * 14, s - 30 - dr() * 10);
      g.lineTo(s - 8, 18 + dr() * 16);
      g.stroke();
    }
  });
  const dragMark = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: dragTex, transparent: true, opacity: 0.85, depthWrite: false })
  );
  dragMark.rotation.x = -Math.PI / 2;
  dragMark.rotation.z = 0.35;
  dragMark.position.set(7.2, 0.011, -27.6);
  group.add(dragMark);
  // ③ v1.11 B5：拐角护角铁件——剧场东南砖角上一根从地钉到 2.6m 的
  // L 形护条（老楼装卸通道的标配），锈蚀流挂，四对沉头螺栓；
  // 1.2–1.8m 高一段被**刮亮**了几道斜痕——惊吓第一幕那声金属长刮擦，
  // 从此有了实体锚点（它就是在这根铁上拖过去的）。
  {
    const ironTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#211f24';
      g.fillRect(0, 0, s, s);
      const ir = rng(53);
      for (let i = 0; i < 26; i++) { // 锈斑
        g.fillStyle = `rgba(${70 + ir() * 40 | 0},${38 + ir() * 22 | 0},${24 + ir() * 14 | 0},${0.16 + ir() * 0.22})`;
        g.beginPath();
        g.ellipse(ir() * s, ir() * s, 3 + ir() * 9, 2 + ir() * 6, ir() * 3, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 8; i++) { // 锈迹往下流挂
        const x = ir() * s;
        const y0 = ir() * s * 0.5;
        g.fillStyle = 'rgba(64,36,22,0.24)';
        g.fillRect(x, y0, 2 + ir() * 2, s * (0.2 + ir() * 0.5));
      }
      // 中段被刮亮的斜痕（贴巷面那条腿的戏眼）
      g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = `rgba(${150 + ir() * 50 | 0},${150 + ir() * 40 | 0},${146 + ir() * 40 | 0},${0.3 + ir() * 0.3})`;
        g.lineWidth = 1.2 + ir() * 1.6;
        g.beginPath();
        g.moveTo(s * 0.2 + ir() * 20, s * 0.42 + i * 7);
        g.lineTo(s * 0.86, s * 0.5 + i * 7 + ir() * 8);
        g.stroke();
      }
    });
    const ironMat = new THREE.MeshStandardMaterial({
      map: ironTex, bumpMap: ironTex, bumpScale: 0.08,
      metalness: 0.62, roughness: 0.55
    });
    const boltGeo = new THREE.CylinderGeometry(0.014, 0.017, 0.012, 8);
    const guardGeos = [
      // 贴巷面（东腿）+ 贴空地面（南腿）+ 角棱圆条
      xform(new THREE.BoxGeometry(0.016, 2.6, 0.12), 8.15, 1.31, -26.638),
      xform(new THREE.BoxGeometry(0.12, 2.6, 0.016), 8.098, 1.31, -26.69),
      xform(new THREE.CylinderGeometry(0.014, 0.014, 2.6, 8), 8.152, 1.31, -26.692)
    ];
    for (const yy of [0.34, 1.04, 1.74, 2.44]) {
      guardGeos.push(xform(boltGeo, 8.162, yy, -26.638, 0, 0, -Math.PI / 2)); // 东腿螺栓朝巷
      guardGeos.push(xform(boltGeo, 8.098, yy, -26.702, Math.PI / 2, 0, 0)); // 南腿螺栓朝空地
    }
    boltGeo.dispose();
    group.add(mergedMesh(guardGeos, ironMat));
  }

  // 空地上唯一的提示——半掩的粉笔螺旋（原创图形，无文字、无对白引用）
  const chalkTex = canvasTexture(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = 'rgba(220,220,230,0.5)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    // 向内收紧的粉笔螺旋，末端一个被划掉的小圆
    g.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.08) {
      const r = 100 - a * 4.2;
      const x = s / 2 + Math.cos(a) * r;
      const y = s / 2 + Math.sin(a) * r * 0.92;
      if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.beginPath();
    g.arc(s / 2, s / 2, 9, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(s / 2 - 15, s / 2 - 13);
    g.lineTo(s / 2 + 15, s / 2 + 13);
    g.stroke();
  });
  const chalk = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.8),
    new THREE.MeshBasicMaterial({ map: chalkTex, transparent: true, opacity: 0.55, depthWrite: false })
  );
  chalk.rotation.x = -Math.PI / 2;
  chalk.position.set(-1.5, 0.012, -30.2);
  group.add(chalk);

  // v1.7 影片彩蛋：靠在剧场后墙的场记板——片名一栏是空的，
  // 只写着「TOMA 2」（原创西语戏中戏语言，无任何原作文字）。
  // E → 上梁「啪」地合上一拍 + 后门看护灯应声闪两下（片场的暗号）
  const slateTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#14141a';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(220,214,196,0.75)';
    g.lineWidth = 2;
    for (const y of [92, 140, 188]) {
      g.beginPath(); g.moveTo(16, y); g.lineTo(s - 16, y); g.stroke();
    }
    g.fillStyle = '#dcd6c4';
    g.font = '22px "Courier New", monospace';
    g.fillText('PROD.', 20, 82);
    g.fillText('ESC.', 20, 130);
    g.fillText('TOMA', 20, 178);
    g.font = '700 30px "Courier New", monospace';
    g.fillText('— SUEÑO —', 92, 130);
    g.fillText('2', 96, 180);
    // 片名一栏留白：一条被粉笔划掉的横线
    g.strokeStyle = 'rgba(220,214,196,0.4)';
    g.beginPath(); g.moveTo(96, 74); g.lineTo(210, 74); g.stroke();
  });
  const slate = new THREE.Group();
  const slateBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.42, 0.02),
    new THREE.MeshStandardMaterial({
      map: slateTex, roughness: 0.6,
      emissive: 0xffffff, emissiveMap: slateTex, emissiveIntensity: 0.16
    })
  );
  slateBoard.position.y = 0.21;
  const stickTex = canvasTexture(64, (g, s) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#dcd6c4' : '#16161c';
      g.save();
      g.translate(i * (s / 8), 0);
      g.transform(1, 0, -0.5, 1, 8, 0);
      g.fillRect(0, 0, s / 8, s);
      g.restore();
    }
  });
  const stickMat = new THREE.MeshStandardMaterial({ map: stickTex, roughness: 0.6 });
  const stickLo = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.022), stickMat);
  stickLo.position.y = 0.445;
  const stickHi = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.022), stickMat);
  const stickPivot = new THREE.Group();
  stickPivot.position.set(-0.26, 0.47, 0); // 铰链在左端
  stickHi.position.set(0.26, 0.025, 0);
  stickPivot.add(stickHi);
  stickPivot.rotation.z = 0.42; // 平时张着口
  slate.add(slateBoard, stickLo, stickPivot);
  slate.position.set(-4.6, 0.02, -27.35);
  slate.rotation.set(-0.16, 0.35, 0.02); // 斜靠在后墙脚
  group.add(slate);
  const slateState = { t: -1 };
  updaters.push((dt) => {
    if (slateState.t < 0) return;
    slateState.t += dt;
    const u = slateState.t;
    if (u > 2.4) { slateState.t = -1; stickPivot.rotation.z = 0.42; return; }
    // 0.12s 内合上 → 弹开两次余振 → 慢慢张回
    if (u < 0.12) stickPivot.rotation.z = 0.42 * (1 - u / 0.12);
    else if (u < 0.9) stickPivot.rotation.z = Math.abs(Math.sin((u - 0.12) * 14)) * 0.08 * Math.exp(-(u - 0.12) * 4);
    else stickPivot.rotation.z = Math.min(0.42, (u - 0.9) * 0.42);
  });
  hotspots.add(slateBoard, {
    hint: 'E — 片名空着的场记板',
    onActivate: () => {
      if (slateState.t < 0) slateState.t = 0;
      later(() => audio.sfxAt('clank', -4.6, -27.35, 0.9, 3), 100);
      later(() => { backLampState.on = 0; audio.sfx('lampoff', 0.2); }, 700);
      later(() => { backLampState.on = 1; audio.sfx('lampon', 0.2); }, 1050);
      later(() => { backLampState.on = 0; }, 1350);
      later(() => { backLampState.on = 1; }, 1600);
      ui.caption('第二条。没有人喊开始。', 4200);
    }
  });

  // ---------- 剧场内部 ----------
  const inner = new THREE.Group();
  const innerFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 12),
    new THREE.MeshStandardMaterial({ color: 0x120a0e, roughness: 0.4, metalness: 0.15, envMapIntensity: 0.7 })
  );
  innerFloor.rotation.x = -Math.PI / 2;
  inner.add(innerFloor);
  const innerVelvet = velvetMaterial(PALETTE.velvet);
  const cw = [
    { w: 15, x: 0, z: -6, ry: 0 },
    { w: 12, x: -7.5, z: 0, ry: Math.PI / 2 },
    { w: 12, x: 7.5, z: 0, ry: -Math.PI / 2 },
    // v1.4 修正：南幕原在 z=6（world -14）——正好埋进外立面盒体（z -14±0.25）里，
    // 从厅内回望整面墙只剩门洞里一条布：拉进 5.45 让整幅幕摆脱立面、褶皱不穿模
    { w: 15, x: 0, z: 5.45, ry: Math.PI }
  ];
  for (const c of cw) {
    const m = curtain(c.w, 6.4, PALETTE.velvet, Math.round(c.w * 0.65), innerVelvet);
    m.position.set(c.x, 3.2, c.z);
    m.rotation.y = c.ry;
    inner.add(m);
  }
  // 台口大幕（帷头层，比裸墙幕更有剧场感）
  const proscenium = curtainWithValance(9.2, 5.6, 0xa8142a, 8);
  proscenium.position.set(0, 0, -5.75);
  inner.add(proscenium);
  const innerCeil = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 12),
    new THREE.MeshStandardMaterial({ color: 0x08050a, roughness: 0.95 })
  );
  innerCeil.rotation.x = Math.PI / 2;
  innerCeil.position.y = 6.4;
  inner.add(innerCeil);
  // v1.9 二级细节·mulholland 件 1：戏院顶棚 Deco 吊灯——
  // 十二根放射肋从中毂散开（太阳纹）+ 鎏金外环 + 车削琥珀玻璃碗，
  // 一盏慢呼吸的暗光：整个观众厅的顶第一次有了来处。
  const deco = new THREE.Group();
  const decoBrass = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x7a5c34, roughness: 0.38, metalness: 0.92, envMapIntensity: 1.0
  });
  const decoRibGeos = [
    xform(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 12), 0, -0.11, 0),
    xform(new THREE.TorusGeometry(1.35, 0.03, 8, 36), 0, -0.28, 0, Math.PI / 2, 0, 0)
  ];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    decoRibGeos.push(xform(
      new THREE.BoxGeometry(1.32, 0.035, 0.09),
      Math.cos(a) * 0.72, -0.2, Math.sin(a) * 0.72, 0, -a, -0.12
    ));
  }
  deco.add(mergedMesh(decoRibGeos, decoBrass));
  const decoBowl = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.001, -0.62), new THREE.Vector2(0.22, -0.56), new THREE.Vector2(0.34, -0.4),
      new THREE.Vector2(0.36, -0.3), new THREE.Vector2(0.3, -0.26)
    ], 20),
    new THREE.MeshStandardMaterial({
      color: 0x2a1408, roughness: 0.35, emissive: 0xffb46a, emissiveIntensity: 0.65,
      transparent: true, opacity: 0.94, side: THREE.DoubleSide
    })
  );
  deco.add(decoBowl);
  const decoLight = new THREE.PointLight(0xffb46a, 2.6, 9, 1.8);
  decoLight.position.y = -0.5;
  deco.add(decoLight);
  deco.position.set(0, 6.38, 1.9);
  inner.add(deco);
  updaters.push((dt, t) => {
    // 慢呼吸的暗光（22s 一息）+ 偶发一次极轻的镇流器颤
    const br = 0.75 + Math.sin((t * Math.PI * 2) / 22) * 0.25;
    const jit = Math.sin(t * 31) * Math.sin(t * 7.3) > 0.985 ? 0.55 : 1;
    decoLight.intensity = 2.6 * br * jit;
    decoBowl.material.emissiveIntensity = 0.65 * br * jit;
  });
  // 舞台（深色蜡面台板 + 黄铜包边）+ 话筒
  const stage = roundedBoxMesh(8, 0.6, 3, 0.06,
    woodMat({ base: [22, 13, 16], planks: 6, size: 256, seed: 28, gloss: 0.8, env: 0.8 }));
  stage.position.set(0, 0.3, -4.2);
  const stageTrim = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.3, metalness: 0.95 })
  );
  stageTrim.position.set(0, 0.61, -2.72);
  const mic = micStand();
  mic.position.set(-1.6, 0.6, -4.2);
  inner.add(stage, stageTrim, mic);
  const stageSpot = new THREE.SpotLight(0xffeedd, 46, 15, 0.3, 0.55, 1.4);
  stageSpot.position.set(0, 6.2, -1.8);
  stageSpot.target.position.set(-1.6, 0.7, -4.2);
  inner.add(stageSpot, stageSpot.target);
  // v1.4 P7：剧场聚光升级双层锥（内芯亮 + 外晕柔）
  // v1.10 C2：聚光柱里加尘埃流——观众厅的灰在光里落
  const stageCone = lightCone2(0.35, 1.5, 5.4, 0xffeedd, 0.06, { dust: true });
  stageCone.position.set(-1.6, 3.2, -4.2);
  inner.add(stageCone);
  updaters.push((dt, t) => stageCone.userData.updateDust(dt, t, engine.breath, engine.quality === 'high'));
  // 台口拱架：条纹壁柱 ×2（基座/柱身/柱帽 + 竖棱）+ 双级楣梁 + 鎏金内沿
  const archWood = woodMat({ base: [30, 12, 16], planks: 1, size: 256, seed: 44, gloss: 0.6 });
  const archGeos = [];
  for (const sx of [-1, 1]) {
    archGeos.push(xform(new THREE.BoxGeometry(0.72, 0.5, 0.6), sx * 4.7, 0.25, -2.9));
    archGeos.push(xform(new THREE.BoxGeometry(0.56, 4.7, 0.48), sx * 4.7, 2.85, -2.9));
    archGeos.push(xform(new THREE.BoxGeometry(0.78, 0.34, 0.66), sx * 4.7, 5.37, -2.9));
    for (let i = -1; i <= 1; i++) {
      archGeos.push(xform(new THREE.BoxGeometry(0.07, 4.6, 0.04), sx * 4.7 + i * 0.16, 2.85, -2.65));
    }
  }
  archGeos.push(xform(new THREE.BoxGeometry(10.2, 0.62, 0.5), 0, 5.85, -2.9));
  archGeos.push(xform(new THREE.BoxGeometry(9.6, 0.34, 0.56), 0, 5.42, -2.9));
  inner.add(mergedMesh(archGeos, archWood));
  const archTrim = mergedMesh([
    xform(new THREE.BoxGeometry(0.05, 4.9, 0.05), -4.36, 2.85, -2.68),
    xform(new THREE.BoxGeometry(0.05, 4.9, 0.05), 4.36, 2.85, -2.68),
    xform(new THREE.BoxGeometry(8.8, 0.05, 0.05), 0, 5.27, -2.68)
  ], M.brass);
  inner.add(archTrim);
  // 壁柱烛台（纯自发光小珠，不加光源）
  const sconceMat = new THREE.MeshStandardMaterial({
    color: 0x201408, emissive: 0xffc07a, emissiveIntensity: 2.2
  });
  const sconces = mergedMesh([
    xform(new THREE.SphereGeometry(0.05, 8, 6), -4.7, 3.9, -2.6),
    xform(new THREE.SphereGeometry(0.05, 8, 6), 4.7, 3.9, -2.6)
  ], sconceMat);
  inner.add(sconces);
  updaters.push((dt, t) => {
    sconceMat.emissiveIntensity = 2.2 + Math.sin(t * 5.3) * 0.35 + Math.sin(t * 13.7) * 0.18;
  });
  hotspots.add(mic.children[3], {
    hint: 'E — 没有乐队，一切都是录音',
    onActivate: () => {
      audio.sfx('swell');
      ui.caption('台上空无一人，音乐还在继续。', 4200);
    }
  });

  // v1.7 影片彩蛋：舞台边一杯没人敢喝第二口的意式浓缩——
  // 白瓷小杯 + 碟 + 方糖一粒（车削瓷件，光滑剖面）。
  // E → 一声轻抿 + 台口灯不悦地压暗一拍（片场传说：口味极其挑剔）
  const chinaMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8e2d6, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1.1
  });
  const espresso = new THREE.Group();
  const saucer = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0), new THREE.Vector2(0.075, 0.004),
      new THREE.Vector2(0.1, 0.018), new THREE.Vector2(0.098, 0.022)
    ], 24), chinaMat);
  const cup = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.024, 0.016), new THREE.Vector2(0.03, 0.02),
      new THREE.Vector2(0.048, 0.06), new THREE.Vector2(0.052, 0.082), new THREE.Vector2(0.05, 0.085)
    ], 24), chinaMat);
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.044, 20),
    new THREE.MeshStandardMaterial({ color: 0x1a0d06, roughness: 0.25, envMapIntensity: 1.3 })
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.076;
  const sugar = roundedBoxMesh(0.022, 0.014, 0.022, 0.004, chinaMat);
  sugar.position.set(0.075, 0.03, 0.015);
  sugar.rotation.y = 0.5;
  espresso.add(saucer, cup, coffee, sugar);
  espresso.position.set(2.2, 0.6, -2.85);
  inner.add(espresso);
  hotspots.add(cup, {
    hint: 'E — 台边的一杯浓缩',
    onActivate: () => {
      audio.sfx('sip', 0.7);
      later(() => {
        stageSpot.intensity = 24;
        audio.sfx('lampoff', 0.15);
      }, 600);
      later(() => { stageSpot.intensity = 46; }, 1700);
      ui.caption('第一口之后，没有第二口。', 4200);
    }
  });

  // v1.13 彩蛋：台口左侧支架上的一支弱音小号——没有乐队，可乐器
  // 都还在。E → 号身自己抬到吹奏位，鼻音短句响起；号身在乐句结束
  // **之前**就放回支架，声音又独自活了半拍才停——跟这个厅台口那句
  // 话是同一件事：声音不跟人走。三通道：动画 + 新音色 + 一次性短句。
  const tptGrp = new THREE.Group();
  const tptBrassMat = new THREE.MeshStandardMaterial({
    color: 0xc79a3e, roughness: 0.28, metalness: 0.9, envMapIntensity: 1.2
  });
  // 支架：斜杆 + 底盘 + 托口（不动的部分）
  tptGrp.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.09, 0.11, 0.016, 12), 0, 0.008, 0),
    xform(new THREE.CylinderGeometry(0.011, 0.013, 0.24, 8), 0, 0.13, 0, 0.18, 0, 0),
    xform(new THREE.TorusGeometry(0.028, 0.007, 6, 12), 0, 0.25, 0.02, Math.PI / 2 - 0.3, 0, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6, metalness: 0.4 })));
  // 摆动组：号身（主管/回管/喇叭口/三只活塞帽）+ 塞在喇叭里的弱音器
  const tptSwing = new THREE.Group();
  const tptHorn = mergedMesh([
    xform(new THREE.CylinderGeometry(0.011, 0.011, 0.3, 10), 0, 0, -0.04, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.009, 0.009, 0.24, 8), 0, -0.03, -0.05, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.05, 0.013, 0.15, 14, 1, true), 0, 0, 0.18, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8), 0, 0.028, 0.02),
    xform(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8), 0, 0.028, 0.055),
    xform(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8), 0, 0.028, 0.09)
  ], tptBrassMat);
  const tptMute = new THREE.Mesh(
    new THREE.ConeGeometry(0.036, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.5, metalness: 0.6 })
  );
  tptMute.rotation.x = -Math.PI / 2;
  tptMute.position.set(0, 0, 0.24);
  tptSwing.add(tptHorn, tptMute);
  tptSwing.position.set(0, 0.25, 0.02);
  tptGrp.add(tptSwing);
  tptGrp.position.set(-2.7, 0.6, -3.05);
  tptGrp.rotation.y = 0.5; // 喇叭口斜朝观众席
  inner.add(tptGrp);
  const tptState = { t: -1, said: false };
  updaters.push((dt) => {
    if (tptState.t < 0) return;
    tptState.t += dt;
    const u = tptState.t / 1.75;
    if (u >= 1) { tptState.t = -1; tptSwing.rotation.x = 0; return; }
    // 抬到吹奏位（0–0.2）→ 悬着（0.2–0.8）→ 放回（0.8–1）；
    // 音色 2.3s > 动画 1.75s——收拍后声音还独自活半拍
    const up = u < 0.2 ? u / 0.2 : u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
    tptSwing.rotation.x = -0.55 * up;
  });
  hotspots.add(tptHorn, {
    hint: 'E — 一支带弱音器的小号',
    onActivate: () => {
      if (tptState.t >= 0) return;
      tptState.t = 0;
      audio.sfxAt('mutetrumpet', -2.7, -23.05, 0.55, 4);
      if (!tptState.said) {
        tptState.said = true;
        ui.caption('声音比它晚走半拍。', 3400);
      }
    }
  });

  // 后台衣镜（推到台侧的化妆间道具）：E → 框边灯泡 A/B 追逐几秒再暗下
  const mirror = dressingMirror({ mats: M });
  mirror.position.set(6.6, 0, -3.2);
  mirror.rotation.y = -1.87;
  inner.add(mirror);
  const mirState = { t: -1 };
  updaters.push((dt) => {
    if (mirState.t < 0) return;
    mirState.t += dt;
    const on = mirState.t % 0.56 < 0.28;
    mirror.userData.bulbA.emissiveIntensity = on ? 2.6 : 0.3;
    mirror.userData.bulbB.emissiveIntensity = on ? 0.3 : 2.6;
    if (mirState.t > 6.2) {
      mirState.t = -1;
      mirror.userData.bulbA.emissiveIntensity = 0.12;
      mirror.userData.bulbB.emissiveIntensity = 0.12;
    }
  });
  hotspots.add(mirror.userData.hitbox, {
    hint: 'E — 后台衣镜',
    onActivate: () => {
      mirState.t = 0;
      audio.sfxAt('switch', 6.6, -23.2, 0.7, 4);
      ui.caption('镜子先记住你，再放你走。', 4200);
    }
  });

  // ============================================================
  // v1.10 阶段 2d·mulholland：候场呼叫铃——右台口壁柱朝后台的
  // 侧脸上，一只胶木按钮盒 + 黄铜铃盖 + 铃锤 + LLAMADA 珐琅小牌
  // + 一根电线管钻进上面的黑。E → 两短一长（callbell 同拍铃锤
  // 打颤、铃盖同震），2.1s 后**很远处一扇门应了一声**（连锁）——
  // 应门的不在后台。
  // ============================================================
  {
    const bellGrp = new THREE.Group();
    // 胶木按钮盒（圆角）+ 黄铜按钮环 + 黑按芯
    const bakelite = new THREE.MeshStandardMaterial({
      color: 0x17120e, roughness: 0.42, metalness: 0.1, envMapIntensity: 0.8
    });
    const bellBox = roundedBoxMesh(0.13, 0.19, 0.042, 0.012, bakelite);
    bellGrp.add(bellBox);
    const bellBrassGeos = [
      xform(new THREE.TorusGeometry(0.026, 0.007, 8, 16), 0, -0.03, 0.024),
      // 珐琅小牌托边
      xform(new THREE.BoxGeometry(0.104, 0.036, 0.006), 0, -0.128, 0.022),
      // 电线管：盒顶起、直上钻进黑（两段 + 管卡）
      xform(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 8), 0, 0.345, -0.008),
      xform(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 8), 0, 1.2, -0.008),
      xform(new THREE.BoxGeometry(0.03, 0.014, 0.02), 0, 0.5, -0.008),
      xform(new THREE.BoxGeometry(0.03, 0.014, 0.02), 0, 1.32, -0.008)
    ];
    bellGrp.add(mergedMesh(bellBrassGeos, M.brass));
    const bellBtn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.3 })
    );
    bellBtn.rotation.x = Math.PI / 2;
    bellBtn.position.set(0, -0.03, 0.026);
    bellGrp.add(bellBtn);
    // LLAMADA 珐琅小牌（接住 SALIDA/CERRADO 的西语系统）
    const llamadaTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#dfd8c8';
      g.fillRect(0, 0, s, s);
      g.save();
      g.scale(1, 3.1); // 补偿 0.096×0.03 面板压缩
      g.font = '700 21px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#3a3226';
      g.fillText('LLAMADA', s / 2, s / 2 / 3.1);
      g.restore();
      g.strokeStyle = 'rgba(90,78,58,0.7)';
      g.lineWidth = 3;
      g.strokeRect(2, 2, s - 4, s - 4);
    });
    const llamada = new THREE.Mesh(
      new THREE.PlaneGeometry(0.096, 0.03),
      new THREE.MeshStandardMaterial({ map: llamadaTex, roughness: 0.5 })
    );
    llamada.position.set(0, -0.128, 0.0265);
    bellGrp.add(llamada);
    // 黄铜铃盖（盒上方半球扣墙）+ 铃锤（细杆 + 锤珠，常态贴着盖缘）
    const bellDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        map: brushedMetalTexture(), color: 0x9a7c46, roughness: 0.3, metalness: 0.95, envMapIntensity: 1.4
      })
    );
    bellDome.rotation.x = Math.PI / 2;
    bellDome.position.set(0, 0.165, 0.008);
    bellGrp.add(bellDome);
    const hammer = new THREE.Group();
    const hamArm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.075, 6), M.brass);
    hamArm.position.y = 0.038;
    const hamBall = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), M.brass);
    hamBall.position.y = 0.078;
    hammer.add(hamArm, hamBall);
    hammer.position.set(0.028, 0.075, 0.03);
    hammer.rotation.z = -0.5;
    bellGrp.add(hammer);
    // 装在右台口壁柱朝后台的侧脸（面对衣镜——候场的人看得见它）
    bellGrp.position.set(5.0, 1.42, -2.9);
    bellGrp.rotation.y = Math.PI / 2;
    inner.add(bellGrp);
    // v1.10 抛光 P5：铃下的粉笔正字——候场的人一场一道刻在壁柱上，
    // 三组零两道，笔画深浅不一、越靠后越潦草。最后一组没刻完。
    const tally = new THREE.Mesh(
      new THREE.PlaneGeometry(0.17, 0.1),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(128, (g, s) => {
          g.clearRect(0, 0, s, s);
          const tr2 = rng(73);
          let gx = 12;
          for (let grp2 = 0; grp2 < 4; grp2++) {
            const n = grp2 < 3 ? 5 : 2; // 最后一组只有两道
            for (let k = 0; k < n; k++) {
              g.strokeStyle = `rgba(224,218,204,${0.5 + tr2() * 0.35})`;
              g.lineWidth = 2 + tr2() * 1.6;
              g.beginPath();
              if (k < 4) {
                const x0 = gx + k * 7 + (tr2() - 0.5) * 2;
                g.moveTo(x0, 46 + (tr2() - 0.5) * 5 + grp2 * 1.5);
                g.lineTo(x0 + (tr2() - 0.5) * 4, 82 + (tr2() - 0.5) * 5);
              } else {
                g.moveTo(gx - 4, 76 + (tr2() - 0.5) * 4);
                g.lineTo(gx + 25, 52 + (tr2() - 0.5) * 4);
              }
              g.stroke();
            }
            gx += 34;
          }
        }), transparent: true, roughness: 0.95, depthWrite: false
      })
    );
    tally.position.set(4.985, 1.06, -2.9);
    tally.rotation.y = Math.PI / 2;
    inner.add(tally);
    const bellState = { t: -1 };
    updaters.push((dt) => {
      if (bellState.t < 0) return;
      bellState.t += dt;
      const T = bellState.t;
      if (T > 3.2) {
        bellState.t = -1;
        hammer.rotation.z = -0.5;
        bellDome.position.z = 0.008;
        bellBtn.position.z = 0.026;
        return;
      }
      bellBtn.position.z = T < 0.25 ? 0.02 : 0.026;
      // 与 callbell 包络同拍：0–0.14 / 0.26–0.40 / 0.52–1.02 三段锤击
      const ringing = (T >= 0 && T < 0.14) || (T >= 0.26 && T < 0.4) || (T >= 0.52 && T < 1.02);
      if (ringing) {
        hammer.rotation.z = -0.5 + Math.sin(T * 260) * 0.22;
        bellDome.position.z = 0.008 + Math.sin(T * 260 + 1) * 0.0022;
      } else {
        hammer.rotation.z += (-0.5 - hammer.rotation.z) * Math.min(1, dt * 18);
        bellDome.position.z += (0.008 - bellDome.position.z) * Math.min(1, dt * 18);
      }
    });
    hotspots.add(bellBox, {
      hint: 'E — 候场呼叫铃',
      onActivate: () => {
        if (bellState.t >= 0) return;
        bellState.t = 0;
        audio.sfxAt('callbell', 5.0, -22.9, 0.65, 4);
        // 连锁：2.1s 后很远处一扇门应一声——不在后台的方向
        later(() => audio.sfxAt('doorfar', -7.0, -26.0, 0.5, 2.2), 2100);
        ui.caption('应声的门离得太远了。', 3800);
      }
    });
  }

  // 折座排椅 v2（铸铁端架 + 皮面翻座 + 排灯；一把翻起的椅子可以坐下）
  const seats = theaterSeats({ rows: 3, cols: 6, dx: 0.86, dz: 1.05, mats: M });
  seats.position.set(0, 0, -0.6);
  inner.add(seats);
  const special = seats.userData.specialSeat;
  const sitState = { down: 0, target: 0 };
  updaters.push((dt) => {
    sitState.down += (sitState.target - sitState.down) * Math.min(1, dt * 5);
    if (special) special.userData.seat.rotation.x = -1.25 + sitState.down * 1.18;
  });
  if (special) {
    hotspots.add(special.userData.seat, {
      hint: 'E — 放下这把椅子',
      onActivate: () => {
        const down = sitState.target < 0.5;
        sitState.target = down ? 1 : 0;
        audio.sfx('creak', 0.5);
        setTimeout(() => audio.sfx('thud', 0.4), 260);
        if (down) {
          // 连锁反应：台口灯亮起一拍，仿佛等你入座已久
          stageSpot.intensity = 90;
          audio.sfx('swell', 0.7);
          setTimeout(() => { stageSpot.intensity = 46; }, 2600);
          ui.caption('这个位子一直空着。', 3600);
        }
      }
    });
    // v1.9 抛光第 7 遍·空场怪谈：人在观众厅里待着，隔几十秒，
    // 那把椅子偶尔自己放下来——吱一声、顿一下；坐了一会儿，又自己
    // 翻回去。不给光、不给字幕（首次给半句），像剧场自己在等人。
    const ghostSeat = { timer: 42 + Math.random() * 40, said: false };
    const seatWp = new THREE.Vector3();
    updaters.push((dt) => {
      const p = pose();
      const inRoom = p.x > ROOM.minX && p.x < ROOM.maxX && p.z > ROOM.minZ && p.z < ROOM.maxZ;
      if (!inRoom || sitState.target > 0.5) return;
      ghostSeat.timer -= dt;
      if (ghostSeat.timer > 0) return;
      ghostSeat.timer = 70 + Math.random() * 70;
      special.getWorldPosition(seatWp);
      sitState.target = 1;
      audio.sfxAt('creak', seatWp.x, seatWp.z, 0.4, 4);
      timers.push(setTimeout(() => audio.sfxAt('thud', seatWp.x, seatWp.z, 0.3, 4), 300));
      if (!ghostSeat.said) {
        ghostSeat.said = true;
        timers.push(setTimeout(() => ui.caption('有人比你先坐下了。', 3400), 900));
      }
      // 坐一会儿，又自己翻回去（只翻自己放下的；你放下的它不动）
      timers.push(setTimeout(() => {
        if (sitState.target > 0.5) {
          sitState.target = 0;
          special.getWorldPosition(seatWp);
          audio.sfxAt('creak', seatWp.x, seatWp.z, 0.3, 4);
        }
      }, 5200 + Math.random() * 2600));
    });
  }

  // 走道排灯闸 —— 墙上的黄铜拨杆，熄掉排椅侧的小灯珠
  const aisleBox = roundedBoxMesh(0.14, 0.22, 0.07, 0.015,
    new THREE.MeshStandardMaterial({ color: 0x1a1418, roughness: 0.5, metalness: 0.5 }));
  aisleBox.position.set(7.15, 1.05, 1.8);
  aisleBox.rotation.y = -Math.PI / 2;
  const aisleLever = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.022, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a6c3c, roughness: 0.3, metalness: 0.9 })
  );
  aisleLever.position.set(7.1, 1.05, 1.8);
  aisleLever.rotation.z = 0.5;
  inner.add(aisleBox, aisleLever);
  const aisleWash = new THREE.PointLight(0xffca7a, 2.2, 8, 2);
  aisleWash.position.set(0, 1.4, 0.5);
  inner.add(aisleWash);
  const aisleState = { on: 1 };
  updaters.push((dt) => {
    const target = aisleState.on;
    seats.userData.domeMat.emissiveIntensity += (target * 1.8 - seats.userData.domeMat.emissiveIntensity) * Math.min(1, dt * 8);
    aisleWash.intensity += (target * 2.2 - aisleWash.intensity) * Math.min(1, dt * 8);
    aisleLever.rotation.z += ((aisleState.on ? 0.5 : -0.5) - aisleLever.rotation.z) * Math.min(1, dt * 10);
  });
  hotspots.add(aisleLever, {
    hint: 'E — 走道排灯',
    onActivate: () => {
      aisleState.on = aisleState.on ? 0 : 1;
      audio.sfx('switch', 0.55);
      audio.sfx(aisleState.on ? 'lampon' : 'lampoff', 0.3);
    }
  });

  // v1.4 四遍：剧场内装三件
  // ① 整幅 Deco 地毯（贝壳扇母题错行 + 双线鎏金边框 + 角键；排椅不再踩漆木板）
  const carpetTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#2c0e16';
    g.fillRect(0, 0, s, s);
    const kr = rng(67);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${30 + kr() * 30 | 0},${10 + kr() * 14 | 0},${16 + kr() * 16 | 0},0.35)`;
      g.fillRect(kr() * s, kr() * s, 2, 1);
    }
    g.strokeStyle = 'rgba(178,138,84,0.38)';
    g.lineWidth = 2;
    const step = s / 6;
    for (let row = 0; row <= 6; row++) {
      for (let col = -1; col <= 6; col++) {
        const cx = col * step + (row % 2) * step * 0.5;
        const cy = row * step;
        for (let rr = 1; rr <= 3; rr++) {
          g.beginPath();
          g.arc(cx, cy, (rr / 3) * step * 0.42, Math.PI, Math.PI * 2);
          g.stroke();
        }
      }
    }
    g.strokeStyle = 'rgba(198,158,96,0.85)';
    g.lineWidth = 6;
    g.strokeRect(18, 18, s - 36, s - 36);
    g.lineWidth = 2.5;
    g.strokeRect(34, 34, s - 68, s - 68);
    g.lineWidth = 3;
    for (const kx of [50, s - 50]) {
      for (const ky of [50, s - 50]) {
        g.strokeRect(kx - 11, ky - 11, 22, 22);
      }
    }
  });
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 8.6),
    new THREE.MeshStandardMaterial({
      map: carpetTex, roughness: 0.94,
      polygonOffset: true, polygonOffsetFactor: -1
    })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.012, 1.7);
  inner.add(carpet);
  // ② 门楣 SALIDA 出口牌（西语，接住门外戏报的语言；断闸后它是厅里唯一的光）
  const salidaTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#060e08';
    g.fillRect(0, 0, s, s);
    g.save();
    g.scale(1, 2.8); // 预拉伸补偿 0.92×0.32 面板的纵向压缩
    g.font = '700 30px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(120,255,150,0.9)';
    g.shadowBlur = 10;
    g.fillStyle = '#a8ffbe';
    g.fillText('SALIDA', s / 2, s / 2 / 2.8);
    g.restore();
  });
  const salidaMat = new THREE.MeshStandardMaterial({
    map: salidaTex, color: 0x0a0a0a, roughness: 0.6,
    emissive: 0xffffff, emissiveMap: salidaTex, emissiveIntensity: 1.6
  });
  const salida = new THREE.Group();
  salida.add(new THREE.Mesh(
    new THREE.BoxGeometry(1.04, 0.42, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.55, metalness: 0.4 })
  ));
  const salidaFace = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.32), salidaMat);
  salidaFace.position.z = 0.04;
  salida.add(salidaFace);
  salida.position.set(0, 3.75, 5.1);
  salida.rotation.y = Math.PI;
  inner.add(salida);
  updaters.push((dt, t) => {
    // 老镇流器的偶发眨眼
    salidaMat.emissiveIntensity = Math.sin(t * 17.3) * Math.sin(t * 5.1) > 0.985 ? 0.5 : 1.6;
  });
  // 入口墙补光：回望时南墙帷幕原本零受光，整面读成虚空——
  // 门侧一对烛台（与台口同语言）+ 一盏门头暖光把丝绒的褶皱找回来
  const doorSconceMat = new THREE.MeshStandardMaterial({
    color: 0x201408, emissive: 0xffc07a, emissiveIntensity: 2.0
  });
  inner.add(mergedMesh([
    xform(new THREE.SphereGeometry(0.05, 8, 6), -2.1, 2.7, 5.12),
    xform(new THREE.SphereGeometry(0.05, 8, 6), 2.1, 2.7, 5.12),
    xform(new THREE.CylinderGeometry(0.02, 0.03, 0.16, 8), -2.1, 2.58, 5.16),
    xform(new THREE.CylinderGeometry(0.02, 0.03, 0.16, 8), 2.1, 2.58, 5.16)
  ], doorSconceMat));
  const doorGlow = new THREE.PointLight(0xffbe7e, 2.6, 7, 1.8);
  doorGlow.position.set(0, 3.1, 4.7);
  inner.add(doorGlow);
  updaters.push((dt, t) => {
    doorSconceMat.emissiveIntensity = 2.0 + Math.sin(t * 4.7 + 1.2) * 0.3;
    doorGlow.intensity = 2.6 + Math.sin(t * 4.7 + 1.2) * 0.35;
  });
  // ③ 聚光柱里的浮尘——光有了质地
  const spotDust = dustField(42, { x: 2.2, y: 5.6, z: 2.2 }, { opacity: 0.5, size: 0.035, color: 0xffe8c8 });
  spotDust.position.set(-1.6, 0, -4.2);
  inner.add(spotDust);
  updaters.push(spotDust.userData.update);

  // 蓝色立方体 —— 梦境反转
  const pedestal = roundedBoxMesh(0.6, 1.15, 0.6, 0.04,
    new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.3, metalness: 0.4 }));
  pedestal.position.set(2.6, 0.58, -4.1);
  const cube = roundedBoxMesh(0.42, 0.42, 0.42, 0.03,
    new THREE.MeshPhysicalMaterial({
      color: 0x0a1a44, roughness: 0.12, metalness: 0.2,
      emissive: 0x2244ff, emissiveIntensity: 0.9, envMapIntensity: 1.6,
      clearcoat: 0.6, clearcoatRoughness: 0.2
    }));
  cube.position.set(2.6, 1.45, -4.1);
  inner.add(pedestal, cube);
  const cubeLight = new THREE.PointLight(0x2244ff, 6, 7, 1.8);
  cubeLight.position.set(2.6, 1.6, -4.1);
  inner.add(cubeLight);

  const invertState = { v: 0, target: 0 };
  updaters.push((dt, t) => {
    cube.rotation.y = t * 0.6;
    cube.rotation.x = Math.sin(t * 0.4) * 0.3;
    cube.material.emissiveIntensity = 0.7 + Math.sin(t * 2.2) * 0.3;
    invertState.v += (invertState.target - invertState.v) * Math.min(1, dt * 3);
    engine.lynchPass.uniforms.uInvert.value = invertState.v;
    if (invertState.target === 1 && invertState.v > 0.96) invertState.target = 0;
  });
  hotspots.add(cube, {
    hint: 'E — 打开蓝色立方体（后果自负）',
    onActivate: () => {
      invertState.target = 1;
      audio.sfx('invert');
      ui.caption('梦翻了个面。', 3200);
    }
  });

  // 展柜：一把蓝色钥匙（原创抽象道具研究）
  const keyCase = vitrine('蓝色钥匙', 'PROP STUDY · 原创致敬', '#3ec5ff');
  keyCase.position.set(-4.4, 0, -4.0);
  keyCase.rotation.y = 0.5;
  inner.add(keyCase);
  const keyMat = new THREE.MeshStandardMaterial({
    color: 0x0a1c55, roughness: 0.2, metalness: 0.7,
    emissive: 0x2244ff, emissiveIntensity: 0.7, envMapIntensity: 1.4
  });
  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 8, 20), keyMat);
  const keyShaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), keyMat);
  keyShaft.position.y = -0.15;
  const keyTooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), keyMat);
  keyTooth.position.set(0.02, -0.22, 0);
  const key = new THREE.Group();
  key.add(keyRing, keyShaft, keyTooth);
  key.position.y = 0.1;
  keyCase.userData.slot.add(key);
  updaters.push((dt, t) => { key.rotation.y = t * 0.8; key.position.y = 0.1 + Math.sin(t * 1.4) * 0.02; });
  hotspots.add(keyCase.userData.label, {
    hint: 'E — 它打开的不是锁',
    onActivate: () => {
      audio.sfx('chime');
      ui.caption('一把不属于任何门的钥匙。', 3600);
    }
  });

  // 引语立牌（本厅唯一文字件，走近才显影）
  const q1 = quoteStand(quoteById('sense'), '#3ec5ff');
  q1.position.set(-3.9, 0, -11.6);
  q1.rotation.y = 0.55;
  group.add(q1);
  updaters.push(quoteStandUpdater(q1, player, ui, {
    narration: ctx.narration, docent: DOCENT.sense
  }));
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  inner.position.z = -20;
  group.add(inner);

  // 剧场内的薄雾与尘
  const innerHaze = smokeLayer(40, { x: 14, z: 11 }, { opacity: 0.05, size: 7, yBase: 0.5, ySpread: 2, color: 0xb9a8d8 });
  innerHaze.position.z = -20;
  group.add(innerHaze);
  updaters.push(innerHaze.userData.update);

  // 路面夜雾与尘（v1.9 B2：透明度随雾呼吸同拍——夜路的雾会喘）
  const roadHaze = smokeLayer(80, { x: 12, z: 40 }, { opacity: 0.05, size: 10, yBase: 0.25, ySpread: 1.2, color: 0x8a92b8 });
  roadHaze.position.z = 2;
  group.add(roadHaze);
  updaters.push(roadHaze.userData.update);
  const dust = dustField(150, { x: 12, y: 5, z: 36 }, { opacity: 0.3, size: 0.05, color: 0xaebdff });
  group.add(dust);
  updaters.push(dust.userData.update);
  updaters.push(() => {
    roadHaze.material.opacity = 0.05 * (1 + engine.breath * 0.32);
    dust.material.opacity = 0.3 * (1 + engine.breath * 0.28);
  });

  // 回大厅之门（夜路起点）
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, 17.8);
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  // v1.10 抛光 P13「远处的声」：极远的警笛掠过——两轮上下滑被距离
  // 磨钝，每 100–160s（seeded）从城市光晕深处来一阵就没了。这座城
  // 总有别人的事正在发生；从来不在这条街。
  const sirenRng = rng(89);
  const sirenState = { next: 52 + sirenRng() * 50 };
  updaters.push((dt) => {
    sirenState.next -= dt;
    if (sirenState.next > 0) return;
    sirenState.next = 100 + sirenRng() * 60;
    audio.sfxAt('sirenfar', 46 + sirenRng() * 24, 52, 1.0, 20);
  });

  group.add(new THREE.AmbientLight(0x141228, 1.15));

  return {
    group,
    spawn: SPAWN,
    bounds: multiRectBounds(WALK_RECTS),
    // 脚步材质分区：剧场厅内（含门廊）=地毯；便道/暗巷=水泥；
    // 背后空地=泥土；路面=沥青
    surfaceAt: (x, z) => {
      if (z <= DOOR.maxZ && x >= ROOM.minX && x <= ROOM.maxX && z >= ROOM.minZ) return 'carpet';
      if (z <= BACKLOT.maxZ && x < ALLEY.minX) return 'dirt';
      if (x > ROAD.maxX) return 'concrete';
      return 'asphalt';
    },
    // 混响分区：剧场厅内=绒面房间尾音；夜路/巷/空地=干外景
    spaceAt: (x, z) => {
      if (z <= DOOR.maxZ && x >= ROOM.minX && x <= ROOM.maxX && z >= ROOM.minZ) return 'room';
      return 'outdoor';
    },
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    // GLB 魅影解析就位信号——main.js 等它再宣布 hall-loaded（普查完整）
    ready: wraithReady,
    eggs: { 'corner-scare': cornerTrig, 'turn-scare': turnTrig, 'alley-dread': dreadTrig },
    onLeave: () => {
      engine.lynchPass.uniforms.uInvert.value = 0;
      for (const id of timers) clearTimeout(id);
    }
  };
}
