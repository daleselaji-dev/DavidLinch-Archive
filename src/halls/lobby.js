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
  chevronMat, woodMat, marbleMat, velvetMaterial, rng, canvasTexture
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
  // 柱础 + 柱颈（v1.4 §2.3 最后一笔欠账）：
  // 八角双级脉络大理石柱础（与镶边带同石种、各柱随角度自转对齐圆心）、
  // 鎏金束环两道——柱颈一道贴住梁下，柱脚一道正好补上柱身与基座间的装配缝
  const plinthMat = marbleMat({
    base: [30, 26, 33], veinA: [168, 170, 182], veinB: [110, 98, 88],
    size: 256, seed: 61, gloss: 0.82, env: 1.2, normalScale: 0.35
  });
  const plinthGeos = [];
  const collarGeos = [];
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + Math.PI / 6 + (k * Math.PI) / 3;
    const px = Math.cos(a) * (R - 0.9);
    const pz = Math.sin(a) * (R - 0.9);
    plinthGeos.push(xform(new THREE.CylinderGeometry(0.6, 0.66, 0.12, 8), px, 0.06, pz, 0, a, 0));
    plinthGeos.push(xform(new THREE.CylinderGeometry(0.5, 0.58, 0.07, 8), px, 0.155, pz, 0, a, 0));
    collarGeos.push(xform(new THREE.TorusGeometry(0.285, 0.02, 8, 22), px, 7.82, pz, Math.PI / 2, 0, 0));
    collarGeos.push(xform(new THREE.TorusGeometry(0.3, 0.05, 10, 22), px, 0.4, pz, Math.PI / 2, 0, 0));
  }
  group.add(mergedMesh(plinthGeos, plinthMat), mergedMesh(collarGeos, goldMat));
  // 天花线脚的鎏金内圈——把柱环的金色语言带上穹顶
  const roseGilt = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.028, 8, 48), goldMat);
  roseGilt.rotation.x = Math.PI / 2;
  roseGilt.position.y = 8.27;
  group.add(roseGilt);

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
        ui.docentNote('他与作曲家巴达拉门蒂合作三十年，音乐总先于画面。');
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
      ui.docentNote('晚年他仍在写剧本，许多构想只留在笔记与访谈里。');
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
      ui.docentNote('他多年只穿一种搭配：扣到领口的白衬衫和深色外套。');
    }
  });

  // v1.4 三遍：北半场丝绒长凳一对（面向纪念台的瞻仰位——门厅有了「可以坐下」的暗示）
  // 车削木腿 ×6 + 黄铜脚箍 + 底枨、滚边座垫 + 微后仰矮背 + 双端卷枕
  const setteeVelvet = velvetMaterial(0x4e0c18);
  const setteeLegProfile = [
    new THREE.Vector2(0.045, 0), new THREE.Vector2(0.05, 0.03), new THREE.Vector2(0.026, 0.12),
    new THREE.Vector2(0.04, 0.22), new THREE.Vector2(0.034, 0.34), new THREE.Vector2(0.048, 0.42)
  ];
  for (const sx of [-1, 1]) {
    const settee = new THREE.Group();
    // 软包体：座垫 + 矮背（微后仰）+ 卷枕两端（横置圆柱）
    const backTilt = -0.14;
    const backGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.56, 10);
    backGeo.rotateZ(Math.PI / 2);
    settee.add(mergedMesh([
      xform(new THREE.BoxGeometry(1.7, 0.15, 0.6), 0, 0.5, 0),
      xform(new THREE.BoxGeometry(1.7, 0.42, 0.12), 0, 0.78, -0.27, backTilt, 0, 0),
      xform(backGeo, 0, 1.0, -0.315, backTilt, 0, 0),
      xform(new THREE.CylinderGeometry(0.085, 0.085, 0.6, 10), -0.83, 0.62, 0, Math.PI / 2, 0, 0),
      xform(new THREE.CylinderGeometry(0.085, 0.085, 0.6, 10), 0.83, 0.62, 0, Math.PI / 2, 0, 0)
    ], setteeVelvet));
    // 木架：六腿车削 + 前后底枨
    const legGeos2 = [];
    for (const lx of [-0.76, 0, 0.76]) {
      for (const lz of [-0.22, 0.22]) {
        legGeos2.push(xform(new THREE.LatheGeometry(setteeLegProfile, 10), lx, 0, lz));
      }
    }
    legGeos2.push(xform(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 8), 0, 0.16, 0.22, 0, 0, Math.PI / 2));
    legGeos2.push(xform(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 8), 0, 0.16, -0.22, 0, 0, Math.PI / 2));
    settee.add(mergedMesh(legGeos2, new THREE.MeshStandardMaterial({ color: 0x180d08, roughness: 0.5 })));
    // 黄铜脚箍 ×6
    settee.add(mergedMesh(
      [-0.76, 0, 0.76].flatMap((lx) => [-0.22, 0.22].map((lz) =>
        xform(new THREE.CylinderGeometry(0.048, 0.052, 0.035, 10), lx, 0.018, lz))),
      goldMat
    ));
    settee.position.set(sx * 2.6, 0, -6.3);
    settee.rotation.y = Math.atan2(-sx * 2.6, 6.3);
    group.add(settee);
  }

  // v1.4 五遍：纪念花圈——三脚画架 + 常青叶环 + 白花簇 + 丝绒绶带
  // 立在碑的右后肩（瞻仰位看去正好衬着帷幕）。E → 花圈在架上轻晃，
  // 两枚白瓣飘落（谁换的花，没有人承认）
  const wreathEasel = new THREE.Group();
  const easelWood = new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.55 });
  wreathEasel.add(mergedMesh([
    // 前腿一对（向上收拢）+ 后撑腿 + 搁圈横档 + 顶部靠档
    xform(new THREE.CylinderGeometry(0.018, 0.024, 1.5, 8), -0.24, 0.75, 0.02, 0, 0, -0.17),
    xform(new THREE.CylinderGeometry(0.018, 0.024, 1.5, 8), 0.24, 0.75, 0.02, 0, 0, 0.17),
    xform(new THREE.CylinderGeometry(0.016, 0.022, 1.52, 8), 0, 0.73, -0.26, 0.36, 0, 0),
    xform(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 8), 0, 0.52, 0.06, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 8), 0, 1.3, -0.075, 0, 0, Math.PI / 2)
  ], easelWood));
  // 花圈枢轴：坐在搁档上、背靠顶档（微后仰）
  const wreathPivot = new THREE.Group();
  wreathPivot.position.set(0, 0.56, 0.1);
  wreathPivot.rotation.x = -0.13;
  const WR = 0.46;
  wreathPivot.add(new THREE.Mesh(
    new THREE.TorusGeometry(WR, 0.085, 8, 28),
    new THREE.MeshStandardMaterial({ color: 0x0c1a0e, roughness: 0.95 })
  ).translateY(WR + 0.05));
  // 常青叶簇：一圈小二十面体，顶点色在两种绿之间抖动（单 mesh）
  const wRng = rng(83);
  const leafGeos = [];
  for (let i = 0; i < 84; i++) {
    const a = (i / 84) * Math.PI * 2 + (wRng() - 0.5) * 0.06;
    const rad = WR + (wRng() - 0.5) * 0.15;
    const blob = new THREE.IcosahedronGeometry(0.055 + wRng() * 0.05, 0);
    const g0 = 0.16 + wRng() * 0.26; // 明度抖动（近黑绿 → 暗松绿，压掉圣诞感）
    const cols = [];
    for (let v = 0; v < blob.attributes.position.count; v++) cols.push(0.09 * g0, 0.3 * g0 + 0.05, 0.11 * g0);
    blob.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    leafGeos.push(xform(blob,
      Math.cos(a) * rad, WR + 0.05 + Math.sin(a) * rad, (wRng() - 0.5) * 0.13,
      wRng() * Math.PI, wRng() * Math.PI, 0));
  }
  wreathPivot.add(mergedMesh(leafGeos, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, flatShading: true
  })));
  // 白花簇：奶白小球三三成组（单 mesh），下缘留给绶带
  const bloomGeos = [];
  for (let i = 0; i < 22; i++) {
    const a = 0.5 + (i / 22) * (Math.PI * 2 - 1.0); // 底部留口
    const rad = WR + (wRng() - 0.5) * 0.09;
    bloomGeos.push(xform(new THREE.SphereGeometry(0.028 + wRng() * 0.02, 8, 6),
      Math.cos(a) * rad, WR + 0.05 + Math.sin(a) * rad, 0.065 + wRng() * 0.035));
  }
  wreathPivot.add(mergedMesh(bloomGeos, new THREE.MeshStandardMaterial({
    color: 0xe9e2d2, roughness: 0.62, envMapIntensity: 0.7
  })));
  // 丝绒绶带：斜跨一幅 + 底部垂尾一条（细金边、克制不添字）
  const sashTex = canvasTexture(64, (g, s) => {
    g.fillStyle = '#380810';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(212,175,110,0.85)';
    g.fillRect(0, 4, s, 2);
    g.fillRect(0, s - 6, s, 2);
  });
  const sashMat = new THREE.MeshStandardMaterial({ map: sashTex, roughness: 0.55, side: THREE.DoubleSide });
  wreathPivot.add(mergedMesh([
    xform(new THREE.PlaneGeometry(0.13, 1.02), 0, WR + 0.05, 0.1, 0, 0, -0.68),
    xform(new THREE.PlaneGeometry(0.13, 0.42), 0.3, 0.06, 0.1, 0.06, 0, -0.1)
  ], sashMat));
  wreathEasel.add(wreathPivot);
  wreathEasel.position.set(1.75, 0, -3.05);
  wreathEasel.rotation.y = -0.15;
  group.add(wreathEasel);
  // 飘落的白瓣 ×2（平时藏起；激活后错拍落下、边落边淡）
  const petals = [];
  for (let i = 0; i < 2; i++) {
    const pm = new THREE.MeshStandardMaterial({
      color: 0xe9e2d2, roughness: 0.6, transparent: true, opacity: 0, side: THREE.DoubleSide
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.05), pm);
    p.visible = false;
    wreathEasel.add(p);
    petals.push({ mesh: p, t: -1, delay: i * 0.55, x0: -0.12 + i * 0.26 });
  }
  const wreathState = { t: -1 };
  updaters.push((dt) => {
    if (wreathState.t >= 0) {
      wreathState.t += dt;
      const decay = Math.max(0, 1 - wreathState.t * 0.5);
      if (decay <= 0) { wreathState.t = -1; wreathPivot.rotation.z = 0; }
      else wreathPivot.rotation.z = Math.sin(wreathState.t * 4.6) * 0.07 * decay;
    }
    for (const pt of petals) {
      if (pt.t < 0) continue;
      pt.t += dt;
      const ft = pt.t - pt.delay;
      if (ft < 0) continue;
      if (ft > 2.2) { pt.t = -1; pt.mesh.visible = false; continue; }
      pt.mesh.visible = true;
      const fall = ft * ft * 0.22 + ft * 0.12;
      pt.mesh.position.set(
        pt.x0 + Math.sin(ft * 3.1) * 0.06,
        Math.max(0.02, 0.62 - fall),
        0.24 + ft * 0.05
      );
      pt.mesh.rotation.set(ft * 2.1, ft * 1.3, Math.sin(ft * 4) * 0.8);
      pt.mesh.material.opacity = ft < 0.15 ? ft / 0.15 : Math.max(0, 1 - Math.max(0, ft - 1.5) / 0.7);
    }
  });
  hotspots.add(wreathPivot.children[0], {
    hint: 'E — 纪念花圈',
    onActivate: () => {
      wreathState.t = 0;
      for (const pt of petals) pt.t = 0;
      audio.sfxAt('creak', 1.75, -3.05, 0.22, 3);
      setTimeout(() => audio.sfx('flutter', 0.18), 350);
      ui.caption('白花每天都是新的。没人见过换花的人。', 4200);
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

  // ============================================================
  // v1.8 博物馆导览架：车削立柱 + 斜面台 + 三支胶木听筒挂黄铜钩 +
  // 琥珀指示灯。E → 摘听筒：咔哒 + 调谐静电 + 一段馆方讲解
  // （三段轮换，全为公开事实）；三段听全 → 吊灯轻轻压暗又亮起 +
  // 帷幕后一声耳语（这座馆自己应了一声）。冒烟名 audio-guide。
  // ============================================================
  const guideStand = new THREE.Group();
  const guideWood = new THREE.MeshStandardMaterial({ color: 0x1c1009, roughness: 0.5 });
  guideStand.add(new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.24, 0), new THREE.Vector2(0.22, 0.04), new THREE.Vector2(0.055, 0.1),
      new THREE.Vector2(0.04, 0.95), new THREE.Vector2(0.07, 1.02)
    ], 12), guideWood));
  // 斜面台（讲解铭牌面板）+ 黄铜边条
  const guideTop = mergedMesh([
    xform(new THREE.BoxGeometry(0.52, 0.05, 0.36), 0, 1.08, 0, -0.32, 0, 0),
    xform(new THREE.BoxGeometry(0.54, 0.012, 0.03), 0, 1.026, 0.164, -0.32, 0, 0)
  ], guideWood);
  guideStand.add(guideTop);
  // 三支胶木听筒（听柄 + 双碗）挂在斜台前沿的黄铜钩上
  const bakelite = new THREE.MeshStandardMaterial({ color: 0x121114, roughness: 0.35, envMapIntensity: 0.7 });
  const hookGeosG = [];
  const handsetMeshes = [];
  for (let i = 0; i < 3; i++) {
    const hx = (i - 1) * 0.17;
    hookGeosG.push(xform(new THREE.TorusGeometry(0.02, 0.006, 6, 10), hx, 1.0, 0.19, Math.PI / 2, 0, 0));
    const hs = mergedMesh([
      xform(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 8), 0, 0, 0, 0, 0, 0),
      xform(new THREE.SphereGeometry(0.032, 10, 8), 0, 0.085, 0.008),
      xform(new THREE.SphereGeometry(0.032, 10, 8), 0, -0.085, 0.008)
    ], bakelite);
    hs.position.set(hx, 0.9, 0.2);
    hs.rotation.x = 0.1;
    guideStand.add(hs);
    handsetMeshes.push(hs);
  }
  guideStand.add(mergedMesh(hookGeosG, M.brass));
  // 琥珀指示灯（讲解播放时呼吸）
  const guidePilotMat = new THREE.MeshStandardMaterial({
    color: 0x2a1602, emissive: 0xff9a2e, emissiveIntensity: 0.25, roughness: 0.4
  });
  const guidePilot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), guidePilotMat);
  guidePilot.position.set(0.2, 1.13, -0.05);
  guideStand.add(guidePilot);
  guideStand.position.set(-1.9, 0, 7.7);
  guideStand.rotation.y = Math.atan2(1.9, -7.7) + Math.PI;
  group.add(guideStand);
  // 讲解词（馆方口吻，全为公开事实；单条 ≤28 字防说教）
  const guideState = { t: -1, idx: 0, heard: new Set(), dip: 1, handset: null };
  const GUIDE_CAPS = ['——沙沙。一号讲解。', '——沙沙。二号讲解。', '——沙沙。三号讲解。'];
  const playGuide = () => {
    const i = guideState.idx;
    guideState.idx = (guideState.idx + 1) % 3;
    guideState.t = 0;
    guideState.handset = handsetMeshes[i];
    audio.sfx('click', 0.7);
    audio.sfxAt('radio', -1.9, 7.7, 0.5, 3);
    ui.caption(GUIDE_CAPS[i], 2600);
    if (i === 0) ui.docentNote('他 1946 年生于蒙大拿州米苏拉。');
    if (i === 1) ui.docentNote('拍电影之前，他在费城学画。');
    if (i === 2) ui.docentNote('这座馆里没有一帧原作画面。');
    guideState.heard.add(i);
    if (guideState.heard.size === 3) {
      guideState.heard.clear();
      // 连锁：吊灯压暗又亮起 + 帷幕后一声耳语——馆自己应了一声
      guideState.dip = 0.12;
      setTimeout(() => audio.sfx('whisper', 0.5), 900);
      setTimeout(() => ui.caption('帷幕后有人听完了。', 3600), 1300);
    }
  };
  hotspots.add(guideTop, {
    hint: 'E — 导览讲解架',
    onActivate: playGuide
  });
  updaters.push((dt, t) => {
    // 指示灯呼吸 + 被摘听筒轻晃；连锁压暗指数回弹
    if (guideState.t >= 0) {
      guideState.t += dt;
      guidePilotMat.emissiveIntensity = 1.6 + Math.sin(t * 9) * 0.7;
      if (guideState.handset) {
        guideState.handset.rotation.z = Math.sin(guideState.t * 6.5) * 0.16 * Math.max(0, 1 - guideState.t * 0.35);
      }
      if (guideState.t > 3.4) {
        guideState.t = -1;
        guidePilotMat.emissiveIntensity = 0.25;
        if (guideState.handset) { guideState.handset.rotation.z = 0; guideState.handset = null; }
      }
    }
    guideState.dip += (1 - guideState.dip) * Math.min(1, dt * 1.6);
    if (guideState.dip < 0.999) center.intensity *= guideState.dip;
  });

  return {
    group,
    spawn: { x: 0, z: 8.6, yaw: 0 },
    bounds: circleBounds(R - 2.4),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'curtain-whisper': whisperTrig, 'audio-guide': { force: playGuide } }
  };
}
