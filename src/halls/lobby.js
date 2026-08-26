// ============================================================
// 总览大厅 —— THE VELVET FOYER 天鹅绒大厅
// 红天鹅绒环形围合（带帷头层）+ 黑白折线地板 + 鎏金地圈 +
// 立柱环 + 六扇门 + 中央纪念台。文字极少：一块引语展签。
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, curtainRing, floorMesh, neonSign, doorway,
  smokeLayer, dustField, lightCone2, hangingBulb, makeFlicker,
  quotePlaque, vitrine, zoneTrigger, circleBounds,
  column, mergedMesh, xform, brushedMetalTexture,
  chevronMat, woodMat, marbleMat
} from './kit.js';
import {
  propMats, chandelier, memorialStele, gramophone,
  lectern, stanchionRope, ushersBell, dimmerPlate, callaLily, lilyMats, ashStand
} from './props.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'lobby',
  name: 'THE VELVET FOYER · 天鹅绒大厅',
  ambience: 'lobby',
  narration: 'lobby',
  space: 'hall',
  floorSfx: 'wood',
  look: {
    saturation: 1.04, tint: 0xfff4ee, fogColor: 0x0a0406, fogDensity: 0.05,
    bg: 0x080304, exposure: 1.05, bloom: 0.9,
    // v1.4 P4/P5：暗部微蓝紫 + 高光偏暖增益 + 中等 halation（帷幕红晕）
    halation: 0.17,
    grade: { lift: [0.012, 0.004, 0.018], gamma: [1.04, 1.0, 0.98], gain: [1.06, 1.0, 0.94] }
  }
};

const R = 14.5;

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player, narration } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 地板 —— 黑白折线拼花（v1.3 三通道：法线拼缝 + 蜡面粗糙度变化）
  const floor = floorMesh(R * 2.4, R * 2.4, chevronMat('#0b0b0d', '#ded7c8', { repeat: 7, seed: 21 }));
  group.add(floor);
  const M = propMats();
  const goldMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.3, metalness: 0.95, envMapIntensity: 1.3
  });
  const ringOuter = new THREE.Mesh(new THREE.RingGeometry(R - 3.4, R - 3.15, 72), goldMat);
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.y = 0.006;
  const ringInner = new THREE.Mesh(new THREE.RingGeometry(2.85, 3.02, 56), goldMat);
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.y = 0.006;
  group.add(ringOuter, ringInner);

  // 帷幕脚下的深色大理石镶边带（v1.4 P2：五通道脉络大理石——
  // 随机游走主脉+云斑+踩踏磨损+AO，抛光 clearcoat 映吊灯）+ 内缘鎏金细线
  const marbleBand = new THREE.Mesh(
    new THREE.RingGeometry(R - 1.35, R - 0.05, 72),
    marbleMat({
      base: [32, 28, 36], veinA: [172, 174, 186], veinB: [112, 100, 90],
      size: 512, seed: 53, gloss: 0.88, env: 1.5, repX: 3, repY: 3, normalScale: 0.4
    })
  );
  marbleBand.rotation.x = -Math.PI / 2;
  marbleBand.position.y = 0.007;
  const marbleLine = new THREE.Mesh(new THREE.RingGeometry(R - 1.43, R - 1.35, 72), goldMat);
  marbleLine.rotation.x = -Math.PI / 2;
  marbleLine.position.y = 0.007;
  group.add(marbleBand, marbleLine);

  // 帷幕环形墙 + 帷头层 + 深色天花与线脚
  group.add(curtainRing(R, 8.4, PALETTE.velvet, 26));
  const valance = curtainRing(R - 0.12, 1.35, 0xa8142a, 30);
  valance.position.y = 7.25;
  group.add(valance);
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.25, 40),
    new THREE.MeshStandardMaterial({ color: 0x080405, roughness: 0.95 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 8.4;
  group.add(ceil);
  // 天花中央线脚（环形叠级）
  const rosette = mergedMesh([
    xform(new THREE.TorusGeometry(3.2, 0.09, 10, 48), 0, 8.3, 0, Math.PI / 2, 0, 0),
    xform(new THREE.TorusGeometry(2.2, 0.07, 10, 40), 0, 8.24, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.5, 0.65, 0.3, 20), 0, 8.24, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x1c0e12, roughness: 0.5, metalness: 0.4, envMapIntensity: 0.8 }));
  group.add(rosette);

  // 立柱环（门与门之间）
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + Math.PI / 6 + (k * Math.PI) / 3;
    const col = column(8.4, 0.3, 0x1a1013);
    col.position.set(Math.cos(a) * (R - 0.9), 0, Math.sin(a) * (R - 0.9));
    group.add(col);
  }

  // 中央纪念台（v1.4：深色抛光大理石叠级 + 鎏金沿——碑座与地面同石种呼应）
  const daisMat = marbleMat({
    base: [24, 19, 26], veinA: [150, 148, 162], veinB: [98, 86, 76],
    size: 512, seed: 57, gloss: 0.9, env: 1.25, normalScale: 0.35
  });
  const dais = mergedMesh([
    xform(new THREE.CylinderGeometry(2.7, 2.85, 0.12, 48), 0, 0.06, 0),
    xform(new THREE.CylinderGeometry(2.45, 2.6, 0.12, 48), 0, 0.18, 0)
  ], daisMat);
  group.add(dais);
  const daisTrim = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.025, 8, 56), goldMat);
  daisTrim.rotation.x = Math.PI / 2;
  daisTrim.position.y = 0.24;
  group.add(daisTrim);

  // 双层体积光锥（v1.4 P7：内芯亮 + 外晕柔，跟随调光档）
  const cone = lightCone2(0.7, 3.1, 7.6, 0xf2e9dc, 0.05);
  cone.position.y = 4.2;
  group.add(cone);

  // 中央纪念碑 v2（削角碑身 + 鎏金铭文 + 叠级基座；关于林奇 热点）
  const stele = memorialStele({ mats: M });
  stele.position.y = 0.24;
  group.add(stele);
  hotspots.add(stele.userData.inscription, {
    hint: 'E — 关于大卫·林奇（1946–2025）',
    onActivate: () => ui.showArtist()
  });

  // 黄铜六臂吊灯（挂在天花线脚中心）；dim 为墙面调光旋钮的三档状态
  const dim = { stops: [1, 0.52, 0.16], idx: 0, v: 1 };
  const lustre = chandelier({ arms: 6, radius: 1.2, mats: M });
  lustre.position.y = 6.55;
  group.add(lustre);
  // 顶冠洗光：吊灯上方一盏小暖光，让天花线脚环从黑里显出来（随调光档）
  const crownWash = new THREE.PointLight(0xffb27a, 4.5, 6, 1.8);
  crownWash.position.set(0, 7.55, 0);
  group.add(crownWash);
  updaters.push((dt, t) => {
    lustre.rotation.y = t * 0.05;
    // 极缓的烛光呼吸 × 调光档
    const breathe = 0.92 + Math.sin(t * 2.1) * 0.05 + Math.sin(t * 5.7) * 0.03;
    lustre.userData.setPower(breathe * dim.v);
    crownWash.intensity = 4.5 * breathe * dim.v;
    // 双层体积锥跟随调光（灯暗时光柱一并收薄）
    cone.userData.setStrength(0.3 + breathe * dim.v * 0.7);
  });

  // 悬浮标题霓虹
  const title = neonSign('SMOKE & VELVET', { color: '#d4243c', size: 1.15 });
  title.position.set(0, 6.7, 0);
  group.add(title);
  const sub = neonSign('DAVID LYNCH · 1946 — 2025', { color: '#3ec5ff', size: 0.4 });
  sub.position.set(0, 5.85, 0);
  group.add(sub);
  updaters.push((dt, t) => {
    title.rotation.y = t * 0.12;
    sub.rotation.y = t * 0.12;
    title.userData.flicker(t, 3);
  });

  // 六扇门
  const doors = [
    { id: 'archive', label: 'THE ARCHIVE', labelZh: '档 案 长 廊', color: '#c9a35c', angle: -Math.PI / 2 },
    { id: 'eraserhead', label: 'ERASERHEAD', labelZh: '橡 皮 头 · 1977', color: '#b8c4cf', angle: -Math.PI / 2 + (Math.PI * 2) / 6 },
    { id: 'bluevelvet', label: 'BLUE VELVET', labelZh: '蓝 丝 绒 · 1986', color: '#4f74ff', angle: -Math.PI / 2 + (Math.PI * 4) / 6 },
    { id: 'studio', label: 'HIS ROOM', labelZh: '林 奇 的 房 间', color: '#ffb25e', angle: -Math.PI / 2 + (Math.PI * 6) / 6 },
    { id: 'twinpeaks', label: 'TWIN PEAKS', labelZh: '双 峰 · 1990', color: '#3fae6a', angle: -Math.PI / 2 + (Math.PI * 8) / 6 },
    { id: 'mulholland', label: 'MULHOLLAND DR.', labelZh: '穆 赫 兰 道 · 2001', color: '#3ec5ff', angle: -Math.PI / 2 + (Math.PI * 10) / 6 }
  ];
  const doorPortals = [];
  for (const d of doors) {
    const door = doorway({ label: d.label, labelZh: d.labelZh, color: d.color });
    const x = Math.cos(d.angle) * (R - 2.1);
    const z = Math.sin(d.angle) * (R - 2.1);
    door.position.set(x, 0, z);
    door.lookAt(0, 0, 0);
    group.add(door);
    updaters.push(door.userData.update);
    doorPortals.push(door.userData.portal);
    hotspots.add(door.userData.portal, {
      nav: true,
      hint: `E — 进入 ${d.labelZh.replace(/\s/g, '')}`,
      onActivate: () => goTo(d.id)
    });
  }

  // 吊灯环 + 电灯颤动
  const bulbs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const bulb = hangingBulb(0xffd9b0, 2.6);
    bulb.position.set(Math.cos(a) * 7.4, 8.4, Math.sin(a) * 7.4);
    group.add(bulb);
    bulbs.push(bulb);
    updaters.push(makeFlicker(bulb.userData.light, bulb.userData.bulb.material, 5, i * 3.1));
  }

  // ---------- 彩蛋：帷幕后的窃语 ----------
  const eggLight = new THREE.PointLight(0xd4243c, 0, 18, 1.5);
  eggLight.position.set(0, 2.4, -R + 1.2);
  group.add(eggLight);
  const blackout = { v: 0 };
  updaters.push(() => {
    if (blackout.v > 0) {
      for (const b of bulbs) {
        b.userData.light.intensity *= (1 - blackout.v);
        b.userData.bulb.material.emissiveIntensity *= (1 - blackout.v);
      }
    }
  });
  let eggTimers = [];
  const whisperEgg = () => {
    for (const id of eggTimers) clearTimeout(id);
    eggTimers = [];
    blackout.v = 1;
    audio.duck(1.4, 0.03, 2.2);
    audio.sfx('whisper', 0.9);
    eggTimers.push(setTimeout(() => {
      eggLight.intensity = 26;
      audio.sfx('thud', 0.8);
    }, 900));
    eggTimers.push(setTimeout(() => {
      ui.caption('帷幕在你背后合拢了一次。', 4600);
    }, 1500));
    eggTimers.push(setTimeout(() => {
      blackout.v = 0;
      eggLight.intensity = 0;
      audio.sfx('chime', 0.4);
    }, 3400));
  };
  const whisperTrig = zoneTrigger({ x: 0, z: -10.6, r: 2.4 }, whisperEgg, { cooldown: 40 });
  updaters.push((dt) => whisperTrig.update(player, dt));

  // 留声机（车削黄铜喇叭）—— 摇柄可用：上发条 → 唱片转 + 爵士层
  const gramoTable = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.34, 0), new THREE.Vector2(0.3, 0.04), new THREE.Vector2(0.07, 0.1),
      new THREE.Vector2(0.06, 0.78), new THREE.Vector2(0.3, 0.86), new THREE.Vector2(0.32, 0.9)
    ], 18),
    woodMat({ base: [30, 18, 12], planks: 2, size: 256, seed: 44 })
  );
  gramoTable.position.set(4.6, 0, 2.4);
  group.add(gramoTable);
  const gramo = gramophone({ mats: M });
  gramo.position.set(4.6, 0.9, 2.4);
  gramo.rotation.y = -2.05;
  group.add(gramo);
  const gramoState = { wind: 0, spin: 0 };
  updaters.push((dt) => {
    if (gramoState.wind > 0) {
      gramoState.wind -= dt;
      gramoState.spin += dt * 3.6;
      gramo.userData.crank.rotation.x -= dt * 5;
      gramo.userData.record.rotation.y = gramoState.spin;
      if (gramoState.wind <= 0) narration.jazz.setEnabled(false);
    }
  });
  hotspots.add(gramo.userData.horn, {
    hint: 'E — 给留声机上发条',
    onActivate: () => {
      const first = gramoState.wind <= 0;
      gramoState.wind = 46;
      if (first) {
        audio.sfxAt('crank', 4.6, 2.4, 0.9);
        narration.jazz.setEnabled(true);
        ui.caption('黄铜喇叭醒了。', 3200);
      }
    }
  });

  // 展柜：一卷空白胶片
  const reelCase = vitrine('空白胶片', 'THE UNMADE FILM', '#c9a35c');
  reelCase.position.set(-3.8, 0, 3.0);
  reelCase.rotation.y = 0.9;
  group.add(reelCase);
  const reelMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a8f96, roughness: 0.25, metalness: 0.9, envMapIntensity: 1.3
  });
  const reel = new THREE.Group();
  const reelDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 28), reelMat);
  reelDisc.rotation.x = Math.PI / 2;
  const reelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), reelMat);
  reelHub.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 14), reelMat);
    const a = (i / 4) * Math.PI * 2;
    hole.position.set(Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0);
    reel.add(hole);
  }
  reel.add(reelDisc, reelHub);
  reel.position.y = 0.12;
  reelCase.userData.slot.add(reel);
  updaters.push((dt, t) => { reel.rotation.z = t * 0.4; });
  hotspots.add(reelCase.userData.label, {
    hint: 'E — 那部没来得及拍的电影',
    onActivate: () => {
      audio.sfx('chime');
      ui.caption('一卷空白胶片。深水里还有没捞上来的鱼。', 4600);
    }
  });

  // 引语展签（本厅唯一文字展签）
  const q1 = quotePlaque(quoteById('meaning'), '#c9a35c');
  q1.position.set(-4.4, 0, -2.4);
  q1.rotation.y = 1.9;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  // ============================================================
  // v1.3 互动带：名册讲台 / 调光旋钮 / 迎宾铃 / 献花 / 绒绳围栏
  // ============================================================
  // 访客名册讲台 —— 打开留言簿
  const stand = lectern({ mats: M });
  stand.position.set(3.4, 0, 6.2);
  stand.rotation.y = -0.95;
  group.add(stand);
  hotspots.add(stand.userData.desk, {
    hint: 'E — 访客名册（写一句话）',
    onActivate: () => ui.openGuestbook()
  });

  // 立柱上的黄铜调光面板 —— 三档：常亮 / 半亮 / 烛暗
  const dimmer = dimmerPlate({ mats: M });
  {
    const colA = -Math.PI / 2 + Math.PI / 6;
    dimmer.position.set(Math.cos(colA) * (R - 1.24), 1.35, Math.sin(colA) * (R - 1.24));
    dimmer.rotation.y = Math.atan2(-dimmer.position.x, -dimmer.position.z);
  }
  group.add(dimmer);
  hotspots.add(dimmer.userData.plate, {
    hint: 'E — 吊灯调光',
    onActivate: () => {
      const prev = dim.stops[dim.idx];
      dim.idx = (dim.idx + 1) % dim.stops.length;
      audio.sfx('switch', 0.6);
      audio.sfx(dim.stops[dim.idx] < prev ? 'lampoff' : 'lampon', 0.3);
    }
  });

  // 迎宾铃 —— 一按，六扇门齐声增亮一拍（连锁反馈）
  const bellTable = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.3, 0), new THREE.Vector2(0.27, 0.04), new THREE.Vector2(0.06, 0.09),
      new THREE.Vector2(0.055, 0.82), new THREE.Vector2(0.26, 0.9), new THREE.Vector2(0.28, 0.94)
    ], 18),
    woodMat({ base: [30, 18, 12], planks: 2, size: 256, seed: 45 })
  );
  bellTable.position.set(-4.9, 0, 5.4);
  group.add(bellTable);
  const bell = ushersBell({ mats: M });
  bell.position.set(-4.9, 0.94, 5.4);
  group.add(bell);
  const bellPulse = { t: 0 };
  hotspots.add(bell.userData.dome, {
    hint: 'E — 迎宾铃',
    onActivate: () => {
      bellPulse.t = 1.6;
      audio.sfxAt('bell', -4.9, 5.4, 1.0);
    }
  });
  updaters.push((dt) => {
    if (bellPulse.t <= 0) return;
    bellPulse.t = Math.max(0, bellPulse.t - dt);
    const k = bellPulse.t / 1.6;
    const glowNow = 0.13 + k * 1.1 * (0.65 + Math.sin(bellPulse.t * 18) * 0.35);
    for (const p of doorPortals) p.material.emissiveIntensity = glowNow;
  });

  // 献花 —— 黄铜瓶取一支马蹄莲，放到碑前（最多七支）
  const urn = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.16, 0), new THREE.Vector2(0.14, 0.03), new THREE.Vector2(0.06, 0.09),
      new THREE.Vector2(0.1, 0.34), new THREE.Vector2(0.17, 0.52), new THREE.Vector2(0.15, 0.55)
    ], 18),
    M.brass
  );
  urn.position.set(2.7, 0, 1.5);
  group.add(urn);
  const lilyShared = lilyMats();
  [[0, 0.2], [2.1, 0.28], [4.2, 0.24]].forEach(([ry, rz]) => {
    const l = callaLily(lilyShared);
    l.position.set(2.7, 0.4, 1.5);
    l.rotation.set(0, ry, rz);
    group.add(l);
  });
  const placed = { n: 0 };
  hotspots.add(urn, {
    hint: 'E — 献一支花',
    onActivate: () => {
      if (placed.n >= 7) {
        audio.sfx('page', 0.25);
        return;
      }
      placed.n += 1;
      const lily = callaLily(lilyShared);
      lily.position.set(-0.9 + (placed.n - 1) * 0.3, 0.27, 0.95 + (placed.n % 2) * 0.16);
      lily.rotation.set(-Math.PI / 2 + 0.18, 0, 0.5 - placed.n * 0.14);
      group.add(lily);
      audio.sfx('page', 0.45);
      audio.sfx('chime', 0.28);
      if (placed.n === 1) ui.caption('给他留一支花。', 3200);
      else if (placed.n === 7) ui.caption('碑前放满了花。', 3200);
    }
  });

  // 天鹅绒绒绳围栏 —— 推一下会摆
  const rail = stanchionRope({ span: 1.9, mats: M });
  rail.position.set(-2.85, 0, 4.2);
  rail.rotation.y = 0.9;
  group.add(rail);
  const ropeSway = { v: 0, t: 0 };
  hotspots.add(rail.userData.rope, {
    hint: 'E — 天鹅绒围栏',
    onActivate: () => {
      ropeSway.v = 1;
      ropeSway.t = 0;
      audio.sfx('creak', 0.35);
    }
  });
  updaters.push((dt) => {
    if (ropeSway.v <= 0.004) return;
    ropeSway.t += dt;
    ropeSway.v *= Math.max(0, 1 - dt * 1.1);
    rail.userData.pivot.rotation.x = Math.sin(ropeSway.t * 7) * 0.35 * ropeSway.v;
  });

  // 立式烟灰缸 —— 碗沿搁着一支没熄的烟（E → 余烬亮起，一缕烟升）
  const ash = ashStand({ mats: M });
  ash.position.set(-4.7, 0, 3.9);
  ash.rotation.y = 0.7;
  group.add(ash);
  const wisp = smokeLayer(5, { x: 0.1, z: 0.1 }, { opacity: 0.05, size: 0.4, yBase: 0, ySpread: 0.9, color: 0xcfd4da });
  wisp.position.set(-4.66, 0.9, 3.93);
  group.add(wisp);
  updaters.push(wisp.userData.update);
  const ashState = { warm: 0 };
  updaters.push((dt, t) => {
    if (ashState.warm > 0) ashState.warm -= dt * 0.2;
    const w = Math.max(0, Math.min(ashState.warm, 1));
    wisp.material.opacity = 0.05 + w * 0.22;
    ash.userData.emberMat.emissiveIntensity = 0.5 + Math.sin(t * 2.2) * 0.2 + w * 1.6;
  });
  hotspots.add(ash.userData.bowl, {
    hint: 'E — 搁着的烟',
    onActivate: () => {
      ashState.warm = 1.8;
      audio.sfx('strike', 0.5);
      ui.caption('有人刚离开。', 3000);
    }
  });

  // ============================================================
  // v1.4 阶段 4 交互带：伞架 / 衣帽架（进门处的"有人来过"）
  // ============================================================
  // 黄铜伞架 —— 滴水盘 + 束环立架 + 三把收拢的伞（两黑一红）
  // E → 整架哐啷一晃，红伞拧了半圈（谁动过它？）
  const umbStand = new THREE.Group();
  umbStand.add(new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.24, 0), new THREE.Vector2(0.235, 0.025), new THREE.Vector2(0.2, 0.04),
      new THREE.Vector2(0.205, 0.05), new THREE.Vector2(0.02, 0.055)
    ], 20),
    M.brass
  ));
  umbStand.add(mergedMesh([
    xform(new THREE.TorusGeometry(0.16, 0.014, 8, 22), 0, 0.62, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), 0.16, 0.32, 0),
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), -0.08, 0.32, 0.139),
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), -0.08, 0.32, -0.139)
  ], M.brass));
  // 三把伞：两把黑伞烘焙合并成 3 个共享 mesh（省 draw call），红伞独立成组可拧
  const canopyPts = [
    new THREE.Vector2(0.001, 0.78), new THREE.Vector2(0.012, 0.72), new THREE.Vector2(0.05, 0.42),
    new THREE.Vector2(0.062, 0.18), new THREE.Vector2(0.05, 0.1), new THREE.Vector2(0.055, 0.06)
  ];
  const mkCanopyGeo = () => new THREE.LatheGeometry(canopyPts, 10);
  const mkShaftGeo = () => {
    const g = new THREE.CylinderGeometry(0.008, 0.008, 1.06, 8);
    g.translate(0, 0.5, 0);
    return g;
  };
  const mkTipGeo = () => {
    const g = new THREE.ConeGeometry(0.009, 0.07, 8);
    g.translate(0, 1.06, 0);
    return g;
  };
  const mkHandleGeo = () => {
    const g = new THREE.TorusGeometry(0.045, 0.011, 8, 14, Math.PI);
    g.rotateZ(Math.PI);
    g.translate(0.045, 0.02, 0);
    return g;
  };
  const umbChromeMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.3, metalness: 0.9 });
  const umbHandleMat = new THREE.MeshStandardMaterial({ color: 0x2a1608, roughness: 0.5 });
  const UA = [0.09, 0.06, 0.05, 0, 0, -0.1];
  const UB = [-0.07, 0.06, 0.1, 0.09, 0.4, 0.08];
  umbStand.add(
    mergedMesh([xform(mkCanopyGeo(), ...UA), xform(mkCanopyGeo(), ...UB)],
      new THREE.MeshStandardMaterial({ color: 0x0c0d11, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.7 })),
    mergedMesh([
      xform(mkShaftGeo(), ...UA), xform(mkTipGeo(), ...UA),
      xform(mkShaftGeo(), ...UB), xform(mkTipGeo(), ...UB)
    ], umbChromeMat),
    mergedMesh([xform(mkHandleGeo(), ...UA), xform(mkHandleGeo(), ...UB)], umbHandleMat)
  );
  const umbRed = new THREE.Group();
  umbRed.add(
    new THREE.Mesh(mkCanopyGeo(),
      new THREE.MeshStandardMaterial({ color: 0x8f1120, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.7 })),
    mergedMesh([mkShaftGeo(), mkTipGeo()], umbChromeMat),
    new THREE.Mesh(mkHandleGeo(), umbHandleMat)
  );
  umbRed.position.set(-0.03, 0.06, -0.1);
  umbRed.rotation.set(-0.08, 1.2, 0.06);
  umbStand.add(umbRed);
  umbStand.position.set(1.9, 0, 7.9);
  group.add(umbStand);
  const umbState = { t: -1 };
  updaters.push((dt) => {
    if (umbState.t < 0) return;
    umbState.t += dt;
    const decay = Math.max(0, 1 - umbState.t * 0.9);
    if (decay <= 0) { umbState.t = -1; umbStand.rotation.z = 0; umbRed.rotation.y = 1.2; return; }
    umbStand.rotation.z = Math.sin(umbState.t * 21) * 0.03 * decay;
    umbRed.rotation.y = 1.2 + Math.sin(umbState.t * 4.2) * 1.4 * (1 - decay);
  });
  hotspots.add(umbStand.children[0], {
    hint: 'E — 伞架',
    onActivate: () => {
      umbState.t = 0;
      audio.sfxAt('jostle', 1.9, 7.9, 0.7, 3);
      ui.caption('外面没有在下雨。里面也没有。', 3400);
    }
  });

  // 衣帽架 —— 车削立杆 + 四支黄铜挂钩 + 他的深色大衣与浅檐帽
  // E → 大衣荡一下、帽子晃一晃 + 一声耳语（有人刚把它挂上，或正要取走）
  const coatTree = new THREE.Group();
  coatTree.add(new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.22, 0), new THREE.Vector2(0.2, 0.03), new THREE.Vector2(0.05, 0.08),
      new THREE.Vector2(0.028, 0.6), new THREE.Vector2(0.024, 1.75), new THREE.Vector2(0.05, 1.82),
      new THREE.Vector2(0.02, 1.88), new THREE.Vector2(0.001, 1.93)
    ], 14),
    woodMat({ base: [26, 16, 10], planks: 1, size: 128, seed: 71, gloss: 0.5 })
  ));
  const hookGeos = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    hookGeos.push(xform(new THREE.CylinderGeometry(0.011, 0.011, 0.17, 8),
      Math.cos(a) * 0.085, 1.68, Math.sin(a) * 0.085, Math.PI / 2 - 0.5, a + Math.PI / 2, 0));
    hookGeos.push(xform(new THREE.SphereGeometry(0.018, 8, 6),
      Math.cos(a) * 0.155, 1.72, Math.sin(a) * 0.155));
  }
  coatTree.add(mergedMesh(hookGeos, M.brass));
  // 大衣：垂坠的深色形体（肩头挂点 → 下摆微张），略带不对称
  const coatPivot = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.02, 0), new THREE.Vector2(0.13, -0.06), new THREE.Vector2(0.17, -0.3),
      new THREE.Vector2(0.15, -0.7), new THREE.Vector2(0.19, -1.12), new THREE.Vector2(0.17, -1.16)
    ], 12),
    new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.82, envMapIntensity: 0.5 })
  );
  coat.scale.set(1, 1, 0.62);
  coatPivot.add(coat);
  coatPivot.position.set(0.14, 1.7, 0.06);
  coatPivot.rotation.y = 0.9;
  coatTree.add(coatPivot);
  // 浅檐帽：帽檐 + 帽冠（顶部微凹）
  const hatPivot = new THREE.Group();
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x17141a, roughness: 0.9 });
  const hat = mergedMesh([
    xform(new THREE.CylinderGeometry(0.15, 0.16, 0.012, 18), 0, 0.006, 0),
    xform(new THREE.LatheGeometry([
      new THREE.Vector2(0.1, 0), new THREE.Vector2(0.095, 0.07), new THREE.Vector2(0.07, 0.1),
      new THREE.Vector2(0.03, 0.105), new THREE.Vector2(0.045, 0.09), new THREE.Vector2(0.001, 0.088)
    ], 16), 0, 0.01, 0)
  ], hatMat);
  hatPivot.add(hat);
  hatPivot.position.set(-0.1, 1.85, -0.05);
  hatPivot.rotation.set(0.16, 0, -0.12);
  coatTree.add(hatPivot);
  coatTree.position.set(5.1, 0, -3.1);
  group.add(coatTree);
  const coatState = { t: -1 };
  updaters.push((dt) => {
    if (coatState.t < 0) return;
    coatState.t += dt;
    const decay = Math.max(0, 1 - coatState.t * 0.55);
    if (decay <= 0) { coatState.t = -1; coatPivot.rotation.x = 0; hatPivot.rotation.z = -0.12; return; }
    coatPivot.rotation.x = Math.sin(coatState.t * 5.2) * 0.22 * decay;
    coatPivot.rotation.z = Math.sin(coatState.t * 3.8 + 0.7) * 0.12 * decay;
    hatPivot.rotation.z = -0.12 + Math.sin(coatState.t * 8.5) * 0.1 * decay;
  });
  hotspots.add(coat, {
    hint: 'E — 挂着的大衣',
    onActivate: () => {
      coatState.t = 0;
      audio.sfxAt('creak', 5.1, -3.1, 0.3, 3);
      setTimeout(() => audio.sfx('whisper', 0.35), 500);
      ui.caption('扣子系到最上面一颗。他总是这样。', 3800);
    }
  });

  // 氛围: 地面烟雾 + 光尘
  const smoke = smokeLayer(70, { x: R * 2, z: R * 2 }, { opacity: 0.045, size: 10, yBase: 0.3, ySpread: 1.6 });
  group.add(smoke);
  updaters.push(smoke.userData.update);
  const dust = dustField(240, { x: R * 2, y: 7, z: R * 2 }, { opacity: 0.4 });
  group.add(dust);
  updaters.push(dust.userData.update);

  // 基础照明
  const amb = new THREE.AmbientLight(0x2a1214, 1.4);
  const center = new THREE.PointLight(0xffe4c8, 14, 26, 1.8);
  center.position.set(0, 6.9, 0);
  const rim = new THREE.PointLight(0x8f0e1e, 22, 40, 1.6);
  rim.position.set(0, 3.4, 0);
  group.add(amb, center, rim);
  // 调光档缓动：中央顶光跟随、旋钮指针转档
  updaters.push((dt) => {
    dim.v += (dim.stops[dim.idx] - dim.v) * Math.min(1, dt * 4.5);
    center.intensity = 14 * (0.22 + dim.v * 0.78);
    const targetRz = -dim.idx * (Math.PI * 2 / 3);
    const kn = dimmer.userData.knob;
    kn.rotation.z += (targetRz - kn.rotation.z) * Math.min(1, dt * 9);
  });

  return {
    group,
    spawn: { x: 0, z: 8.6, yaw: 0 },
    bounds: circleBounds(R - 2.4),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'curtain-whisper': whisperTrig }
  };
}
