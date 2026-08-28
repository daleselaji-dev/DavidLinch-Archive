// ============================================================
// 总览大厅 —— THE VELVET FOYER 天鹅绒大厅
// 红天鹅绒环形围合（v1.5 整体化单件幕）+ 黑白折线地板 +
// 立柱环 + 六扇门 + 中央纪念台。
// v1.7 第一版构图回归：中央只有「台 + 光锥 + 独石碑」三件——
// 碑换成全高 2.9m 的「一道光缝」独石（正面铭文/背面烟纹/
// 侧棱光缝，任何角度轮廓完整），双面洗光，不再是黑里显露
// 一半的方块。全部小件退到柱环内缘（r≈10.6）各归其位：
// 入口两翼=名册讲台+迎宾铃（接待），东=留声机（音乐角），
// 西=空白胶片柜，西南=引语立牌，东南=花圈+大衣（悼念角）；
// 中央 8m 半径空场只留献花的铜瓶。文字极少：一座走近才
// 显字的引语立牌。
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, curtainRing, floorMesh, neonSign, doorway,
  smokeLayer, dustField, lightCone2, hangingBulb, makeFlicker,
  quoteStand, quoteStandUpdater, vitrine, zoneTrigger, circleBounds,
  column, mergedMesh, xform, brushedMetalTexture,
  chevronMat, woodMat, marbleMat, rng, canvasTexture, noiseCanvasTexture, contactShadows
} from './kit.js';
import {
  propMats, chandelier, memorialStele, gramophone,
  lectern, ushersBell, dimmerPlate, callaLily, lilyMats
} from './props.js';
import { quoteById, DOCENT } from '../data/essays.js';

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
    grade: { lift: [0.012, 0.004, 0.018], gamma: [1.04, 1.0, 0.98], gain: [1.06, 1.0, 0.94] },
    // v1.9 B1：雾的呼吸（34s 一息，±10%）
    fogPulse: { period: 34, depth: 0.1 }
  }
};

const R = 14.5;

// v1.9 B3：开幕点灯只演一次（本次会话内重复进厅不再播）
let openingPlayed = false;

export function build(ctx) {
  const { engine, hotspots, ui, goTo, audio, player, narration } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  // 开幕点灯门（各灯组的乘法闸）：首次进馆从黑里逐组升起
  // v1.10 C1：+flame（第 0 拍长明灯闸）+dust（收口「尘埃醒来」闸）
  const openGate = openingPlayed
    ? { bulb: [1, 1, 1, 1, 1, 1], chand: 1, amb: 1, flame: 1, dust: 1 }
    : { bulb: [0, 0, 0, 0, 0, 0], chand: 0, amb: 0.22, flame: 0, dust: 0 };
  const opening = { t: openingPlayed ? -1 : 0 };
  openingPlayed = true;

  // 地板 —— 黑白折线拼花（v1.3 三通道：法线拼缝 + 蜡面粗糙度变化）
  const floor = floorMesh(R * 2.4, R * 2.4, chevronMat('#0b0b0d', '#ded7c8', { repeat: 7, seed: 21 }));
  group.add(floor);
  const M = propMats();
  const goldMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.3, metalness: 0.95, envMapIntensity: 1.3
  });
  // v1.5 减法：只留一道外金圈——此前内圈/镶边/台沿叠出四五道
  // 同心环，把中央纪念台切成「一排一排」；地面语言收敛到一句
  const ringOuter = new THREE.Mesh(new THREE.RingGeometry(R - 3.4, R - 3.15, 72), goldMat);
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.y = 0.006;
  group.add(ringOuter);

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
  const curtainWall = curtainRing(R, 8.4, PALETTE.velvet, 26);
  group.add(curtainWall);
  const valance = curtainRing(R - 0.12, 1.35, 0xa8142a, 30);
  valance.position.y = 7.25;
  group.add(valance);
  // v1.7 触觉反馈：摸一下帷幕——一阵波纹爬上整幅绒面，
  // 帷头随之下坠又弹回（点哪儿都有回应的第一课）
  const curtainRipple = { t: -1 };
  updaters.push((dt) => {
    if (curtainRipple.t < 0) return;
    curtainRipple.t += dt;
    const u = curtainRipple.t;
    if (u > 2.8) {
      curtainRipple.t = -1;
      valance.position.y = 7.25;
      return;
    }
    valance.position.y = 7.25 - Math.sin(Math.min(u * 3, Math.PI)) * 0.1 * Math.exp(-u * 1.1);
    curtainWall.rotation.y = Math.sin(u * 5.2) * 0.0035 * Math.exp(-u * 1.4);
  });
  hotspots.add(curtainWall.children[0], {
    hint: 'E — 摸一下天鹅绒',
    onActivate: () => {
      if (curtainRipple.t < 0) curtainRipple.t = 0;
      audio.sfx('curtain', 0.6);
      if (Math.random() < 0.22) setTimeout(() => audio.sfx('whisper', 0.25), 700);
    }
  });
  // v1.9 抛光第 1 遍：天花从「一块纯黑平圆」换成放射褶皱绒布篷顶——
  // 48 道明暗交替褶楔向中心线脚收拢，中心暖深红、边缘沉进黑；
  // 顶冠洗光一亮，整个穹顶像帐篷内壁一样立起来（黑洞消失）。
  const canopyTex = canvasTexture(256, (g, s) => {
    const c = s / 2;
    const base = g.createRadialGradient(c, c, 6, c, c, c);
    base.addColorStop(0, '#41121a');
    base.addColorStop(0.5, '#240b11');
    base.addColorStop(1, '#0b0406');
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * Math.PI * 2;
      const a1 = ((i + 1) / 48) * Math.PI * 2;
      g.fillStyle = i % 2 ? 'rgba(255,178,144,0.05)' : 'rgba(0,0,0,0.17)';
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, c, a0, a1);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.lineWidth = 1;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c);
      g.stroke();
    }
  });
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.25, 40),
    new THREE.MeshStandardMaterial({
      map: canopyTex, bumpMap: canopyTex, bumpScale: 0.35, roughness: 0.85
    })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 8.4;
  group.add(ceil);
  // 幕顶鎏金收口环（压住帷头与篷顶的接缝，接住顶冠洗光）
  const canopyRim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.08, 0.05, 8, 64), goldMat);
  canopyRim.rotation.x = Math.PI / 2;
  canopyRim.position.y = 7.94;
  group.add(canopyRim);
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

  // 双层体积光锥（v1.4 P7：内芯亮 + 外晕柔，跟随调光档；
  // v1.10 C2：加尘埃流——灰在光柱里落，随呼吸微涨落，低档退素色）
  const cone = lightCone2(0.7, 3.1, 7.6, 0xf2e9dc, 0.05, { dust: true });
  cone.position.y = 4.2;
  group.add(cone);
  updaters.push((dt, t) => cone.userData.updateDust(dt, t, engine.breath, engine.quality === 'high'));

  // 中央纪念碑 v3「一道光缝」（v1.7）：全高独石 + 侧棱光缝 +
  // 正面铭文/背面烟纹；关于林奇 热点
  const stele = memorialStele({ mats: M });
  stele.position.y = 0.24;
  group.add(stele);
  hotspots.add(stele.userData.inscription, {
    hint: 'E — 关于大卫·林奇（1946–2025）',
    onActivate: () => ui.showArtist()
  });
  // 双面洗光：正面读铭文，背面读烟纹——绕到哪一面都不是黑板
  const steleWash = new THREE.PointLight(0xffe6c4, 3.4, 4.6, 2);
  steleWash.position.set(0, 1.6, 2.0);
  const steleWashB = new THREE.PointLight(0xffe6c4, 2.6, 4.4, 2);
  steleWashB.position.set(0, 1.8, -2.0);
  group.add(steleWash, steleWashB);
  // 光缝呼吸 + 触碰应答：E → 光缝涌亮一拍 + 石钟低鸣
  const seamPulse = { t: -1 };
  updaters.push((dt, t) => {
    const breathe = 1.4 + Math.sin(t * 0.9) * 0.25;
    let flare = 0;
    if (seamPulse.t >= 0) {
      seamPulse.t += dt;
      if (seamPulse.t > 2.6) seamPulse.t = -1;
      else flare = Math.sin(Math.min(1, seamPulse.t / 2.6) * Math.PI) * 2.2;
    }
    stele.userData.setSeam(breathe + flare);
  });
  // v1.10 抛光 P2·件 1：碑顶的一缕烟——光缝从冠沿漏出去的那一点，
  // 在碑顶上方立着一缕几乎看不见的烟（馆名的那个字）。双十字面片、
  // 纹理上卷 + 极缓摆动；透明度跟光缝同呼吸，触碑光缝涌亮时它也旺一口。
  const wispTex = canvasTexture(128, (g2, s) => {
    g2.clearRect(0, 0, s, s);
    g2.lineCap = 'round';
    for (const [x0, w2, a] of [[0.5, 5, 0.5], [0.42, 3, 0.3], [0.6, 2.5, 0.24]]) {
      g2.strokeStyle = `rgba(242,233,220,${a})`;
      g2.lineWidth = w2;
      g2.beginPath();
      g2.moveTo(s * x0, s);
      g2.bezierCurveTo(s * (x0 - 0.14), s * 0.72, s * (x0 + 0.16), s * 0.5, s * x0, s * 0.32);
      g2.bezierCurveTo(s * (x0 - 0.12), s * 0.2, s * (x0 + 0.08), s * 0.1, s * (x0 + 0.02), 0);
      g2.stroke();
    }
  });
  wispTex.wrapS = wispTex.wrapT = THREE.RepeatWrapping;
  const wispMat = new THREE.MeshBasicMaterial({
    map: wispTex, transparent: true, opacity: 0.14,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const wisp = new THREE.Group();
  for (const ry of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.15), wispMat);
    p.rotation.y = ry;
    wisp.add(p);
  }
  // 光缝在 +x 侧棱顶端漏出去（碑组 y=0.24，碑身顶 ≈3.25）
  wisp.position.set(0.5, 3.85, 0);
  group.add(wisp);
  updaters.push((dt, t) => {
    wispTex.offset.y -= dt * 0.11;
    wisp.rotation.z = Math.sin(t * 0.5) * 0.06;
    const flare2 = seamPulse.t >= 0 ? Math.sin(Math.min(1, seamPulse.t / 2.6) * Math.PI) : 0;
    wispMat.opacity = (0.1 + Math.sin(t * 0.9) * 0.035 + flare2 * 0.22) * openGate.chand;
  });

  const seamTouched = { once: false };
  hotspots.add(stele.children[0], {
    hint: 'E — 独石与光缝',
    onActivate: () => {
      seamPulse.t = 0;
      audio.sfx('stonechime', 0.7);
      if (!seamTouched.once) {
        seamTouched.once = true;
        ui.caption('石头是温的。', 3200);
      }
    }
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
    // 极缓的烛光呼吸 × 调光档 × 开幕点灯门
    const breathe = 0.92 + Math.sin(t * 2.1) * 0.05 + Math.sin(t * 5.7) * 0.03;
    lustre.userData.setPower(breathe * dim.v * openGate.chand);
    crownWash.intensity = 4.5 * breathe * dim.v * openGate.chand;
    // 双层体积锥跟随调光（灯暗时光柱一并收薄）；
    // 踏上纪念台的问候拍（daisGreet）会让光柱涌亮一阵
    cone.userData.setStrength((0.3 + breathe * dim.v * 0.7 + daisGreet.boost * 0.8) * openGate.chand);
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
  // 开幕序列里霓虹最后才醒（先有火，再有名字）
  if (opening.t >= 0) { title.visible = false; sub.visible = false; }

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
  // v1.10 抛光 P2·件 2：门里的光落在门外——每扇门的虚空色在踏步前
  // 洒一摊淡色光池（另一段片场漏出来的光），与门内微光同拍呼吸、
  // 相位随门错开；开幕点灯前不亮。共享径向渐变贴图，六材质各自着色。
  const poolTex = canvasTexture(128, (g2, s) => {
    const rad = g2.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    rad.addColorStop(0, 'rgba(255,255,255,0.5)');
    rad.addColorStop(0.55, 'rgba(255,255,255,0.16)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = rad;
    g2.fillRect(0, 0, s, s);
  });
  const doorPools = [];
  const doorGroups = [];
  for (const d of doors) {
    const door = doorway({ label: d.label, labelZh: d.labelZh, color: d.color });
    const x = Math.cos(d.angle) * (R - 2.1);
    const z = Math.sin(d.angle) * (R - 2.1);
    door.position.set(x, 0, z);
    door.lookAt(0, 0, 0);
    group.add(door);
    doorGroups.push(door);
    updaters.push(door.userData.update);
    doorPortals.push(door.userData.portal);
    hotspots.add(door.userData.portal, {
      nav: true,
      hint: `E — 进入 ${d.labelZh.replace(/\s/g, '')}`,
      onActivate: () => goTo(d.id)
    });
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 1.9),
      new THREE.MeshBasicMaterial({
        map: poolTex, color: new THREE.Color(d.color), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    pool.rotation.x = -Math.PI / 2;
    // 踏步前 1.45m，贴地一丝抬起防深度打架
    pool.position.set(Math.cos(d.angle) * (R - 3.55), 0.012, Math.sin(d.angle) * (R - 3.55));
    group.add(pool);
    doorPools.push({ mesh: pool, phase: d.angle * 2.3 });
  }
  updaters.push((dt, t) => {
    for (const p of doorPools) {
      p.mesh.material.opacity = (0.16 + Math.sin(t * 1.7 + p.phase) * 0.07) * openGate.chand;
    }
  });

  // ---------- v1.12 E-9：门后刚走过一个人（一次性，无字幕） ----------
  // 本次进馆第一次走近任意一扇门时，那扇门的虚空里有个剪影横穿过
  // 去——遮住底缘渗光与中缝竖隙，两声很轻的脚步，之后整馆不再出现。
  // 与「帷幕后的暗影」（环幕慢巡的鼓包）机制/位置/读感均不同：这个
  // 只在你正要进门的那一刻、在门里。抽象无面目剪影（头影 + 披落身
  // 形，非肖像）；单 mesh（lobby +1）
  const doorGhostTex = canvasTexture(64, (g2, s) => {
    g2.clearRect(0, 0, s, s);
    const blob = (cx, cy, rx, ry, a) => {
      const grad = g2.createRadialGradient(cx, cy, 0, cx, cy, rx);
      grad.addColorStop(0, `rgba(0,0,0,${a})`);
      grad.addColorStop(0.7, `rgba(0,0,0,${a * 0.85})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g2.save();
      g2.translate(cx, cy);
      g2.scale(1, ry / rx);
      g2.translate(-cx, -cy);
      g2.fillStyle = grad;
      g2.beginPath();
      g2.arc(cx, cy, rx, 0, Math.PI * 2);
      g2.fill();
      g2.restore();
    };
    blob(32, 10, 7, 8.5, 0.95);            // 头影
    blob(32, 30, 12, 16, 0.95);            // 肩
    blob(32, 44, 10.5, 22, 0.92);          // 披落身形（下摆渐收）
  });
  const doorGhostMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 3.0),
    new THREE.MeshBasicMaterial({
      map: doorGhostTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false
    })
  );
  doorGhostMesh.position.set(0, 1.6, 0.05);
  doorGhostMesh.visible = false;
  doorGroups[0].add(doorGhostMesh);
  const doorGhost = { t: -1, fired: false, dir: 1, step1: false, step2: false };
  const DG_DUR = 3.6;
  updaters.push((dt) => {
    if (doorGhost.fired && doorGhost.t < 0) return;
    if (doorGhost.t < 0) {
      if (openGate.chand < 1) return; // 开幕点灯前它不走
      for (const dg of doorGroups) {
        const d = Math.hypot(player.x - dg.position.x, player.z - dg.position.z);
        if (d < 2.6) {
          doorGhost.fired = true;
          doorGhost.t = 0;
          doorGhost.dir = Math.random() < 0.5 ? -1 : 1;
          doorGhost.step1 = doorGhost.step2 = false;
          dg.add(doorGhostMesh);
          doorGhostMesh.visible = true;
          break;
        }
      }
      return;
    }
    doorGhost.t += dt;
    const k = Math.min(1, doorGhost.t / DG_DUR);
    doorGhostMesh.position.x = doorGhost.dir * (-0.78 + 1.56 * k);
    doorGhostMesh.material.opacity = Math.sin(Math.PI * k) * 0.92;
    const host = doorGhostMesh.parent;
    if (!doorGhost.step1 && k > 0.3) {
      doorGhost.step1 = true;
      audio.sfxAt('step-wood', host.position.x, host.position.z, 0.16, 5);
    }
    if (!doorGhost.step2 && k > 0.62) {
      doorGhost.step2 = true;
      audio.sfxAt('step-wood', host.position.x, host.position.z, 0.13, 5);
    }
    if (k >= 1) {
      doorGhost.t = -1;
      doorGhostMesh.visible = false;
      doorGhostMesh.material.opacity = 0;
    }
  });

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
  // 开幕点灯门：逐盏乘法闸（在颤动之后相乘，与彩蛋 blackout 同法）
  updaters.push(() => {
    for (let i = 0; i < 6; i++) {
      if (openGate.bulb[i] >= 1) continue;
      bulbs[i].userData.light.intensity *= openGate.bulb[i];
      bulbs[i].userData.bulb.material.emissiveIntensity *= openGate.bulb[i];
    }
  });

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
    // v1.11 连锁：过影刚走过（12s 内）就来触发——那个还没走远，
    // 耳语更近一档（贴耳补一口气，无新字幕）
    if (passLink.now - passLink.lastEnd < 12) {
      eggTimers.push(setTimeout(() => audio.sfx('breath', 0.55), 380));
    }
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

  // ---------- v1.11 门禁 57：帷幕后的过影 ----------
  // 每 90–150s（seeded），帷幕内侧一道**人形暗带**沿幕面走过一段弧：
  // 移动的暗斑 + 走到中段帷头轻颤一口 + 极轻的绒面脚步跟着方位挪。
  // 幕从来不开，也没有字幕——大多数人只会用余光撞见一次。
  // 它刚走过时去帷幕深处触发窃语 → 耳语更近一档（连锁在上面）。
  const passerMat = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0, depthWrite: false
  });
  const passer = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 14), passerMat);
  passer.scale.set(0.5, 1.16, 0.22);
  passer.visible = false;
  group.add(passer);
  const passRng = rng(31);
  const passLink = { now: 0, lastEnd: -999 };
  const passState = { timer: 48 + passRng() * 42, t: -1, phi: 0, dir: 1, step: 0 };
  const PASS_DUR = 7.0;
  const PASS_R = R - 0.5;
  updaters.push((dt, t) => {
    passLink.now = t;
    if (opening.t >= 0) return; // 开幕点灯没走完，幕后不来人
    if (passState.t < 0) {
      passState.timer -= dt;
      if (passState.timer > 0) return;
      passState.timer = 90 + passRng() * 60;
      passState.t = 0;
      passState.dir = passRng() < 0.5 ? -1 : 1;
      passState.phi = passRng() * Math.PI * 2;
      passState.step = 0.2;
      passer.visible = true;
    }
    passState.t += dt;
    const u = passState.t / PASS_DUR;
    if (u >= 1) {
      passState.t = -1;
      passer.visible = false;
      passerMat.opacity = 0;
      passLink.lastEnd = t;
      return;
    }
    const phi = passState.phi + passState.dir * u * 1.15;
    passer.position.set(
      Math.cos(phi) * PASS_R,
      1.32 + Math.sin(passState.t * 3.4) * 0.05, // 走姿的身体起伏
      Math.sin(phi) * PASS_R
    );
    passer.rotation.y = Math.PI / 2 - phi; // 薄轴贴幕面（暗带平行于幕）
    passerMat.opacity = Math.sin(Math.min(1, u) * Math.PI) * 0.5;
    // 走到中段，帷头跟着轻颤一口（借触摸波纹通道的弱尾巴）
    if (u > 0.48 && u < 0.52 && curtainRipple.t < 0) curtainRipple.t = 1.5;
    // 极轻的绒面脚步跟着方位挪
    passState.step -= dt;
    if (passState.step <= 0) {
      passState.step = 0.66;
      audio.sfxAt('step-carpet', passer.position.x, passer.position.z, 0.16, 2.6);
    }
  });

  // ---------- 彩蛋：走上纪念台 ----------
  // 第一次踏上中央台面：光锥应声涌亮、光缝同拍呼吸——
  // 这座馆认得每一个走到碑前的人
  const daisGreet = { boost: 0 };
  updaters.push((dt) => {
    if (daisGreet.boost <= 0) return;
    daisGreet.boost = Math.max(0, daisGreet.boost - dt * 0.4);
  });
  const daisTrig = zoneTrigger({ x: 0, z: 0, r: 3.0 }, () => {
    daisGreet.boost = 1;
    seamPulse.t = 0;
    audio.sfx('swell', 0.5);
  }, { cooldown: 90 });
  updaters.push((dt) => daisTrig.update(player, dt));

  // 留声机（车削黄铜喇叭）—— 摇柄可用：上发条 → 唱片转 + 爵士层
  // v1.7 归位：东柱脚「音乐角」（柱环内缘），中央视线彻底让空
  const gramoTable = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.34, 0), new THREE.Vector2(0.3, 0.04), new THREE.Vector2(0.07, 0.1),
      new THREE.Vector2(0.06, 0.78), new THREE.Vector2(0.3, 0.86), new THREE.Vector2(0.32, 0.9)
    ], 18),
    woodMat({ base: [30, 18, 12], planks: 2, size: 256, seed: 44 })
  );
  gramoTable.position.set(10.6, 0, 0);
  group.add(gramoTable);
  const gramo = gramophone({ mats: M });
  gramo.position.set(10.6, 0.9, 0);
  gramo.rotation.y = -Math.PI / 2;
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
        audio.sfxAt('crank', 10.6, 0, 0.9);
        narration.jazz.setEnabled(true);
        ui.caption('黄铜喇叭醒了。', 3200);
      }
    }
  });

  // 展柜：一卷空白胶片（v1.7 归位：西柱脚，与东侧留声机对望）
  const reelCase = vitrine('空白胶片', 'THE UNMADE FILM', '#c9a35c');
  reelCase.position.set(-10.6, 0, 0);
  reelCase.rotation.y = Math.PI / 2;
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

  // 引语立牌（本厅唯一文字件）：远看只是一支黄铜细杆，
  // 走近，那句话才在板上显影——立牌只给名言；背景与访谈
  // 语境由讲解员在你驻足后低声补上（v1.7 导览层）。
  // 归位：西南柱脚，在去穆赫兰道门的路上。
  const q1 = quoteStand(quoteById('meaning'), '#c9a35c');
  q1.position.set(-5.3, 0, -9.18);
  q1.rotation.y = Math.atan2(5.3, 9.18);
  group.add(q1);
  updaters.push(quoteStandUpdater(q1, player, ui, {
    narration, docent: DOCENT.meaning
  }));
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  // ============================================================
  // v1.3 互动带：名册讲台 / 调光旋钮 / 迎宾铃 / 献花
  // v1.7 归位：讲台与迎宾铃分列入口两翼（接待前厅的构图理由）
  // ============================================================
  // 访客名册讲台 —— 打开留言簿（入口左翼）
  const stand = lectern({ mats: M });
  stand.position.set(-5.3, 0, 9.18);
  stand.rotation.y = Math.atan2(5.3, -9.18);
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
  // v1.9 抛光第 8 遍·触痕层：调光面板四周的指痕晕——手油把漆面
  // 蹭出一圈暗亮，右下最重（够旋钮的那只手）；被摸得最多的地方
  // 反而最亮。这个馆每晚都有人调过灯，只是你没见过他们。
  {
    const smudgeTex = canvasTexture(128, (g, s) => {
      g.clearRect(0, 0, s, s);
      const sr = rng(73);
      // 面板（0.16×0.24）在贴图里的投影区：64±22 / 64±38——
      // 晕必须围着它长，长在它背后的部分玩家永远看不见
      const px0 = 42, px1 = 86, py0 = 26, py1 = 102;
      for (let i = 0; i < 170; i++) {
        const side = sr();
        let cx, cy;
        if (side < 0.5) {          // 右缘最重（够旋钮的那只手）
          cx = px1 + Math.pow(sr(), 1.6) * 26;
          cy = py0 + sr() * (py1 - py0) * 1.08;
        } else if (side < 0.72) {  // 左缘
          cx = px0 - Math.pow(sr(), 1.6) * 18;
          cy = py0 + sr() * (py1 - py0);
        } else if (side < 0.88) {  // 下缘
          cx = px0 + sr() * (px1 - px0);
          cy = py1 + Math.pow(sr(), 1.6) * 16;
        } else {                   // 上缘最轻
          cx = px0 + sr() * (px1 - px0);
          cy = py0 - Math.pow(sr(), 1.6) * 12;
        }
        const rr3 = 1.5 + sr() * 3;
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rr3);
        grd.addColorStop(0, `rgba(196,176,142,${0.06 + sr() * 0.07})`);
        grd.addColorStop(1, 'rgba(196,176,142,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(cx, cy, rr3, 0, Math.PI * 2);
        g.fill();
      }
      // 右缘外两道下行擦痕（手每次都从同一处收回去）
      g.lineCap = 'round';
      for (let w = 0; w < 2; w++) {
        const wx = px1 + 7 + w * 9 + sr() * 3;
        g.strokeStyle = `rgba(210,192,158,${0.1 + sr() * 0.05})`;
        g.lineWidth = 4 + sr() * 3;
        g.beginPath();
        g.moveTo(wx, 46 + sr() * 8);
        g.quadraticCurveTo(wx + 3, 70, wx - 2, 92 + sr() * 8);
        g.stroke();
      }
      // 指腹磨亮的一小块（面板右缘外，手最常落的地方）
      const shine = g.createRadialGradient(px1 + 9, 60, 0, px1 + 9, 60, 12);
      shine.addColorStop(0, 'rgba(228,212,180,0.22)');
      shine.addColorStop(1, 'rgba(228,212,180,0)');
      g.fillStyle = shine;
      g.beginPath();
      g.arc(px1 + 9, 60, 12, 0, Math.PI * 2);
      g.fill();
    });
    const smudge = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.4),
      new THREE.MeshStandardMaterial({
        map: smudgeTex, transparent: true, roughness: 0.42, depthWrite: false,
        // 柱身漆面近黑：给一丝自发光当作手油泛起的暗亮（同桌面残环做法）
        emissive: 0xc4b08e, emissiveMap: smudgeTex, emissiveIntensity: 0.12
      }));
    // 贴在柱面（r=13.3）与面板（r=13.26）之间，随面板同向
    const colA = -Math.PI / 2 + Math.PI / 6;
    smudge.position.set(Math.cos(colA) * (R - 1.215), 1.35, Math.sin(colA) * (R - 1.215));
    smudge.rotation.y = dimmer.rotation.y;
    group.add(smudge);
  }

  // 迎宾铃 —— 一按，六扇门齐声增亮一拍（连锁反馈；入口右翼）
  const bellTable = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.3, 0), new THREE.Vector2(0.27, 0.04), new THREE.Vector2(0.06, 0.09),
      new THREE.Vector2(0.055, 0.82), new THREE.Vector2(0.26, 0.9), new THREE.Vector2(0.28, 0.94)
    ], 18),
    woodMat({ base: [30, 18, 12], planks: 2, size: 256, seed: 45 })
  );
  bellTable.position.set(5.3, 0, 9.18);
  group.add(bellTable);
  const bell = ushersBell({ mats: M });
  bell.position.set(5.3, 0.94, 9.18);
  group.add(bell);
  const bellPulse = { t: 0 };
  hotspots.add(bell.userData.dome, {
    hint: 'E — 迎宾铃',
    onActivate: () => {
      bellPulse.t = 1.6;
      audio.sfxAt('bell', 5.3, 9.18, 1.0);
    }
  });
  updaters.push((dt) => {
    if (bellPulse.t <= 0) return;
    bellPulse.t = Math.max(0, bellPulse.t - dt);
    const k = bellPulse.t / 1.6;
    const glowNow = 0.13 + k * 1.1 * (0.65 + Math.sin(bellPulse.t * 18) * 0.35);
    for (const p of doorPortals) p.material.emissiveIntensity = glowNow;
  });

  // 献花 —— 黄铜瓶取一支马蹄莲，放到碑前（最多七支）。
  // v1.7：铜瓶是中央空场里唯一的小件——构图理由只有一个：
  // 给碑献花。花落在台基前缘围成一小段弧。
  const urn = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.16, 0), new THREE.Vector2(0.14, 0.03), new THREE.Vector2(0.06, 0.09),
      new THREE.Vector2(0.1, 0.34), new THREE.Vector2(0.17, 0.52), new THREE.Vector2(0.15, 0.55)
    ], 18),
    M.brass
  );
  urn.position.set(2.9, 0, 2.9);
  group.add(urn);
  const lilyShared = lilyMats();
  [[0, 0.2], [2.1, 0.28], [4.2, 0.24]].forEach(([ry, rz]) => {
    const l = callaLily(lilyShared);
    l.position.set(2.9, 0.4, 2.9);
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
      const a = Math.PI / 2 + (placed.n - 4) * 0.17;
      const lily = callaLily(lilyShared);
      lily.position.set(Math.cos(a) * 2.3, 0.27, Math.sin(a) * 2.3);
      lily.rotation.set(-Math.PI / 2 + 0.18, a - Math.PI / 2, 0.3);
      group.add(lily);
      audio.sfx('page', 0.45);
      audio.sfx('chime', 0.28);
      if (placed.n === 1) ui.caption('给他留一支花。', 3200);
      else if (placed.n === 7) ui.caption('碑前放满了花。', 3200);
    }
  });

  // ============================================================
  // v1.10 抛光 P14「开门第一眼」第四看：入口到碑座的丝绒长毯——
  // 开门那一帧的最后一笔：一条深酒红的路把目光押到碑前，金双边
  // 线接住吊灯的光，中线被走浅了一道（走的人只有一条路）。两端
  // 织进流苏；献花落在毯端的弧上正好成画。纯场景件（与 C4 积水
  // 洼同口径不设热点）；静态单 mesh 零带宽，低档无需回退。
  // ============================================================
  const runnerTex = canvasTexture(256, (g2, s) => {
    // 绒底：纵向绒毛条纹（沿走向的明度微差）
    for (let x = 0; x < s; x += 2) {
      const v = 0.82 + Math.sin(x * 1.7) * 0.09 + Math.sin(x * 0.31) * 0.06;
      g2.fillStyle = `rgb(${Math.round(74 * v)},${Math.round(16 * v)},${Math.round(24 * v)})`;
      g2.fillRect(x, 0, 2, s);
    }
    // 中线磨浅的一道（软边长条——被脚底压平的绒）
    const wear = g2.createRadialGradient(s / 2, s / 2, s * 0.02, s / 2, s / 2, s * 0.5);
    wear.addColorStop(0, 'rgba(148,96,88,0.30)');
    wear.addColorStop(0.45, 'rgba(148,96,88,0.16)');
    wear.addColorStop(1, 'rgba(148,96,88,0)');
    g2.save();
    g2.translate(s / 2, s / 2);
    g2.scale(0.34, 1.05);
    g2.translate(-s / 2, -s / 2);
    g2.fillStyle = wear;
    g2.fillRect(0, 0, s, s);
    g2.restore();
    // 金双边线（左右各两道，内细外粗）
    g2.fillStyle = 'rgba(196,158,88,0.92)';
    for (const x of [0.055, 0.925]) g2.fillRect(s * x, s * 0.03, s * 0.02, s * 0.94);
    g2.fillStyle = 'rgba(196,158,88,0.6)';
    for (const x of [0.095, 0.895]) g2.fillRect(s * x, s * 0.03, s * 0.01, s * 0.94);
    // 两端横档 + 流苏（短须错落，须根略深）
    g2.fillStyle = 'rgba(196,158,88,0.8)';
    for (const y of [0.028, 0.962]) g2.fillRect(s * 0.055, s * y, s * 0.89, s * 0.01);
    for (let i = 0; i < 46; i++) {
      const x = s * (0.06 + (i / 46) * 0.88);
      const len = s * (0.014 + ((i * 7) % 5) * 0.0022);
      g2.fillStyle = `rgba(172,132,70,${0.55 + ((i * 3) % 4) * 0.08})`;
      g2.fillRect(x, 0, 1.6, len);
      g2.fillRect(x, s - len, 1.6, len);
    }
    // 织物微斑（久踩的暗点）
    for (let i = 0; i < 130; i++) {
      const rx = (i * 97) % s, rz = (i * 61) % s;
      g2.fillStyle = `rgba(20,8,10,${0.05 + (i % 3) * 0.03})`;
      g2.fillRect(rx, rz, 1.4, 1.4);
    }
  });
  const runnerRough = noiseCanvasTexture(128, 200, 42, 3);
  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 5.3),
    new THREE.MeshPhysicalMaterial({
      map: runnerTex, roughness: 0.9, metalness: 0,
      roughnessMap: runnerRough, bumpMap: runnerRough, bumpScale: 0.4,
      sheen: 1.0, sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0x8a3040).lerp(new THREE.Color(0xfff0e0), 0.35),
      envMapIntensity: 0.35,
      polygonOffset: true, polygonOffsetFactor: -2
    })
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.01, 5.4);
  group.add(runner);

  // ============================================================
  // v1.9 二级细节·lobby 件 1：碑前长明灯——与献花铜瓶左右对称，
  // 记忆的长明火。黄铜盏座（束腰车削+滴油环）+ 玻璃罩（收腰烟囱形）
  // + 双层火苗（外橙内白，独立颤动）+ 暖光。E → 火苗躬身又缓缓立起。
  // ============================================================
  const flameLamp = new THREE.Group();
  flameLamp.add(new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.17, 0), new THREE.Vector2(0.15, 0.025), new THREE.Vector2(0.055, 0.07),
      new THREE.Vector2(0.045, 0.5), new THREE.Vector2(0.085, 0.6), new THREE.Vector2(0.07, 0.64),
      new THREE.Vector2(0.13, 0.68), new THREE.Vector2(0.12, 0.72), new THREE.Vector2(0.05, 0.73)
    ], 20),
    M.brass
  ));
  // 滴油环：盏口下一圈凝住的蜡油痕（倒角高光边 + 磨损语言）
  const dripRing = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 8, 22), new THREE.MeshStandardMaterial({
    color: 0xcbb98e, roughness: 0.55, metalness: 0.2
  }));
  dripRing.rotation.x = Math.PI / 2;
  dripRing.position.y = 0.665;
  flameLamp.add(dripRing);
  // 玻璃罩：收腰烟囱形
  const chimney = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.115, 0.73), new THREE.Vector2(0.1, 0.82), new THREE.Vector2(0.078, 0.95),
      new THREE.Vector2(0.085, 1.1), new THREE.Vector2(0.07, 1.18)
    ], 20),
    new THREE.MeshPhysicalMaterial({
      color: 0xfff4e0, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.16,
      clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false
    })
  );
  flameLamp.add(chimney);
  // 双层火苗（外橙内白）
  const flamePivot = new THREE.Group();
  flamePivot.position.y = 0.75;
  const flameOuter = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0), new THREE.Vector2(0.032, 0.03), new THREE.Vector2(0.024, 0.09),
      new THREE.Vector2(0.008, 0.15), new THREE.Vector2(0.001, 0.18)
    ], 10),
    new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.85, toneMapped: false })
  );
  const flameInner = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0.01), new THREE.Vector2(0.016, 0.04), new THREE.Vector2(0.009, 0.09),
      new THREE.Vector2(0.001, 0.12)
    ], 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 0.95, toneMapped: false })
  );
  flamePivot.add(flameOuter, flameInner);
  flameLamp.add(flamePivot);
  const flameGlow = new THREE.PointLight(0xffa04a, 2.2, 4.2, 2);
  flameGlow.position.y = 0.86;
  flameLamp.add(flameGlow);
  flameLamp.position.set(-2.9, 0, 2.9);
  group.add(flameLamp);
  // 火苗常态颤动 + 交互「躬身再立起」时间线
  // v1.10 C1：乘上第 0 拍闸——开幕黑场里这粒火最先醒（从火星长成火苗）
  const flameBow = { t: -1 };
  updaters.push((dt, t) => {
    let k = 1;
    if (flameBow.t >= 0) {
      flameBow.t += dt;
      const u = flameBow.t;
      if (u > 2.4) flameBow.t = -1;
      // 前 0.5s 躬身压到 0.35，随后 1.9s 缓缓立起还超挺一口再落回
      else k = u < 0.5 ? 1 - (u / 0.5) * 0.65
        : 0.35 + Math.min(1, (u - 0.5) / 1.6) * 0.75 + Math.sin(Math.min(1, (u - 0.5) / 1.6) * Math.PI) * 0.18;
    }
    const gk = 0.04 + 0.96 * openGate.flame;
    const jitter = 1 + Math.sin(t * 11.3) * 0.06 + Math.sin(t * 27.7) * 0.05;
    flamePivot.scale.set(gk, k * jitter * gk, gk);
    flamePivot.rotation.z = Math.sin(t * 7.1) * 0.05 + Math.sin(t * 17.3) * 0.03;
    flameGlow.intensity = 2.2 * k * jitter * gk;
    flameOuter.material.opacity = 0.85 * (0.7 + 0.3 * k) * Math.min(1, openGate.flame * 3);
  });
  hotspots.add(chimney, {
    hint: 'E — 长明灯',
    onActivate: () => {
      if (flameBow.t < 0) flameBow.t = 0;
      audio.sfxAt('flamegut', -2.9, 2.9, 0.6);
      ui.caption('火从没灭过。也没人来添过油。', 3800);
    }
  });

  // ============================================================
  // v1.9 二级细节·lobby 件 2：帷幕束带——三根立柱侧挂黄铜玫瑰扣
  // + 金穗流苏对（检修幕布用的束带，歇在钩上）。E → 穗子晃起来。
  // ============================================================
  const tasselPivots = [];
  {
    const rosetteMat = M.brass;
    const cordMat = new THREE.MeshStandardMaterial({ color: 0xc9a35c, roughness: 0.5, metalness: 0.35 });
    for (const k of [1, 3, 5]) {
      const a = -Math.PI / 2 + Math.PI / 6 + (k * Math.PI) / 3;
      const tb = new THREE.Group();
      // 玫瑰扣（叠级圆盘）+ 挂钩
      tb.add(mergedMesh([
        xform(new THREE.CylinderGeometry(0.055, 0.062, 0.02, 12), 0, 0, 0, Math.PI / 2, 0, 0),
        xform(new THREE.CylinderGeometry(0.028, 0.034, 0.03, 10), 0, 0, 0.018, Math.PI / 2, 0, 0),
        xform(new THREE.TorusGeometry(0.03, 0.008, 8, 12), 0, -0.05, 0.03, 0.3, 0, 0)
      ], rosetteMat));
      // 流苏对（枢轴挂在扣下）：绳环 + 两支穗（束颈+穗身+流苏裙沿）
      const pv = new THREE.Group();
      pv.position.set(0, -0.06, 0.03);
      const tasselGeos = [];
      for (const [tx, ty] of [[-0.045, -0.1], [0.045, -0.14]]) {
        tasselGeos.push(
          xform(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), tx * 0.5, ty + 0.12, 0, 0, 0, tx > 0 ? -0.32 : 0.32),
          xform(new THREE.SphereGeometry(0.016, 8, 6), tx, ty + 0.05, 0),
          xform(new THREE.LatheGeometry([
            new THREE.Vector2(0.008, 0.05), new THREE.Vector2(0.02, 0.035), new THREE.Vector2(0.024, 0),
            new THREE.Vector2(0.028, -0.012), new THREE.Vector2(0.02, -0.05), new THREE.Vector2(0.001, -0.065)
          ], 10), tx, ty, 0)
        );
      }
      pv.add(mergedMesh(tasselGeos, cordMat));
      tb.add(pv);
      tb.position.set(Math.cos(a) * (R - 1.22), 1.62, Math.sin(a) * (R - 1.22));
      tb.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)) + Math.PI / 2;
      group.add(tb);
      tasselPivots.push({ pv, sway: 0, x: tb.position.x, z: tb.position.z, mesh: tb.children[0] });
    }
    for (const tp of tasselPivots) {
      hotspots.add(tp.mesh, {
        hint: 'E — 幕布束带',
        onActivate: () => {
          tp.sway = 1;
          audio.sfxAt('tassel', tp.x, tp.z, 0.6);
          ui.caption('穗子还在晃。刚才并没有风。', 3400);
        }
      });
    }
    updaters.push((dt, t) => {
      for (const tp of tasselPivots) {
        if (tp.sway > 0) tp.sway = Math.max(0, tp.sway - dt * 0.34);
        tp.pv.rotation.z = Math.sin(t * 4.6) * 0.02 + Math.sin(t * 4.1 + tp.x) * 0.34 * tp.sway;
        tp.pv.rotation.x = Math.sin(t * 3.4 + tp.z) * 0.2 * tp.sway;
      }
    });
  }

  // ============================================================
  // v1.10 二级细节·lobby 件 1：吊灯绞盘——东柱内侧的黄铜绞盘站，
  // 钢缆上顶经滑轮吊住中央吊灯（剧场吊挂语言：这盏灯是能放下来
  // 擦的）。E → 摇柄转、吊灯一顿一顿降半米又升回、轻微晃。
  // ============================================================
  {
    const winch = new THREE.Group();
    // 背板（贴柱）+ 鼓 + 缠好的缆 + 棘轮爪
    winch.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x241318, roughness: 0.55, metalness: 0.3 })));
    // 鼓用独立材质克隆——热点高亮脉冲不许把整馆黄铜一起点亮
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 14), M.brass.clone());
    drum.rotation.x = Math.PI / 2;
    drum.position.z = 0.13;
    winch.add(drum);
    const wound = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5, metalness: 0.75 }));
    wound.rotation.x = Math.PI / 2;
    wound.position.z = 0.13;
    winch.add(wound);
    winch.add(mergedMesh([
      // 棘轮齿盘 + 制动爪
      xform(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 18), 0, 0, 0.245, Math.PI / 2, 0, 0),
      xform(new THREE.BoxGeometry(0.03, 0.1, 0.02), 0.1, 0.11, 0.245, 0, 0, 0.5)
    ], M.brass));
    // 摇柄（枢轴在鼓轴上）：曲臂 + 木握
    const crankPivot = new THREE.Group();
    crankPivot.position.z = 0.26;
    crankPivot.add(mergedMesh([
      xform(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 8), 0, 0, 0.03, Math.PI / 2, 0, 0),
      xform(new THREE.BoxGeometry(0.03, 0.17, 0.025), 0, -0.07, 0.06),
      xform(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 8), 0, -0.14, 0.1, Math.PI / 2, 0, 0)
    ], M.brass));
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.07, 10),
      woodMat({ base: [30, 18, 12], planks: 1, size: 128, seed: 91 }));
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, -0.14, 0.12);
    crankPivot.add(grip);
    winch.add(crankPivot);
    // 装在西柱（k=4，圆心角 π）内侧面，把手朝厅心——与东侧留声机
    // 对望的机务角；东柱留给流苏束带，不同柱说不同的话
    winch.position.set(-(R - 1.24), 1.15, 0);
    winch.rotation.y = Math.PI / 2;
    group.add(winch);
    // 立缆：绞盘顶 → 柱上滑轮；横缆：滑轮 → 吊灯毂（微垂悬链）
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.45, metalness: 0.8 });
    const pulleyY = 7.9;
    group.add(mergedMesh([
      xform(new THREE.CylinderGeometry(0.008, 0.008, pulleyY - 1.35, 6), -(R - 1.27), (pulleyY + 1.15) / 2 - 0.1, 0),
      xform(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), -(R - 1.27), pulleyY, 0, Math.PI / 2, 0, 0),
      xform(new THREE.BoxGeometry(0.04, 0.12, 0.1), -(R - 1.2), pulleyY + 0.02, 0)
    ], cableMat));
    const spanCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-(R - 1.27), pulleyY + 0.04, 0),
      new THREE.Vector3(-(R - 1.27) / 2, 7.0, 0),
      new THREE.Vector3(-0.3, 7.22, 0)
    );
    group.add(new THREE.Mesh(new THREE.TubeGeometry(spanCurve, 20, 0.008, 6), cableMat));
    // 绞盘时间线：一顿一顿降半米（棘轮感）→ 悬半拍 → 匀速升回 + 轻晃
    const winchState = { t: -1 };
    updaters.push((dt) => {
      if (winchState.t < 0) return;
      winchState.t += dt;
      const u = winchState.t;
      if (u > 5.2) {
        winchState.t = -1;
        lustre.position.y = 6.55;
        lustre.rotation.x = 0;
        return;
      }
      let drop;
      if (u < 1.8) {
        // 下行分 6 格，每格只在前 40% 走（棘轮顿挪）
        const k = u / 1.8;
        const step = Math.floor(k * 6);
        const inStep = Math.min(1, (k * 6 - step) / 0.4);
        drop = (step + inStep) / 6;
      } else if (u < 2.6) drop = 1;
      else drop = Math.max(0, 1 - (u - 2.6) / 2.4);
      lustre.position.y = 6.55 - drop * 0.45;
      lustre.rotation.x = Math.sin(u * 3.1) * 0.012 * drop;
      crankPivot.rotation.z = u < 1.8 ? -u * 7 : (u < 2.6 ? -1.8 * 7 : -1.8 * 7 + (u - 2.6) * 5.25);
    });
    hotspots.add(drum, {
      hint: 'E — 吊灯绞盘',
      onActivate: () => {
        if (winchState.t >= 0) return;
        winchState.t = 0;
        audio.sfxAt('winch', -(R - 1.24), 0, 0.8);
        setTimeout(() => audio.sfx('creak', 0.25), 900);
        ui.caption('绞盘还记得灯的重量。', 3400);
      }
    });
  }

  // ============================================================
  // v1.10 二级细节·lobby 件 2：碑阶上的白花——一支马蹄莲平放在
  // 台阶前缘，没有花瓶，没有名字。E → 花身轻颤，一枚白瓣离开它。
  // ============================================================
  {
    const strayLily = callaLily(lilyShared);
    strayLily.position.set(0.85, 0.31, 2.05);
    strayLily.rotation.set(-Math.PI / 2 + 0.12, 0.5, 0.6);
    group.add(strayLily);
    // 命中代理（花太细，射线难打）
    const lilyHit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    lilyHit.position.set(0.85, 0.34, 2.05);
    group.add(lilyHit);
    // v1.10 抛光 P6：花身下一小摊接触阴影（抛光大理石上尤其读得出
    // 「放着」而非「浮着」；台面 y=0.24）
    group.add(contactShadows([{ x: 0.86, z: 2.06, r: 0.3, rz: 0.14, ry: -0.55, y: 0.247 }], 0.38));
    const strayPetal = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.055),
      new THREE.MeshStandardMaterial({
        color: 0xe9e2d2, roughness: 0.6, transparent: true, opacity: 0, side: THREE.DoubleSide
      }));
    strayPetal.visible = false;
    group.add(strayPetal);
    const lilyState = { t: -1, once: false };
    updaters.push((dt) => {
      if (lilyState.t < 0) return;
      lilyState.t += dt;
      const u = lilyState.t;
      if (u > 2.2) {
        lilyState.t = -1;
        strayPetal.visible = false;
        strayLily.rotation.z = 0.6;
        return;
      }
      strayLily.rotation.z = 0.6 + Math.sin(u * 6.5) * 0.05 * Math.max(0, 1 - u * 0.8);
      strayPetal.visible = true;
      const fall = u * u * 0.1;
      strayPetal.position.set(0.95 + u * 0.07, Math.max(0.26, 0.42 - fall), 2.12 + Math.sin(u * 2.8) * 0.03);
      strayPetal.rotation.set(u * 1.8, u * 1.2, Math.sin(u * 3.5) * 0.7);
      strayPetal.material.opacity = u < 0.15 ? u / 0.15 : Math.max(0, 1 - Math.max(0, u - 1.4) / 0.7);
    });
    hotspots.add(lilyHit, {
      hint: 'E — 台阶上的白花',
      onActivate: () => {
        if (lilyState.t < 0) lilyState.t = 0;
        audio.sfxAt('tassel', 0.85, 2.05, 0.3);
        if (!lilyState.once) {
          lilyState.once = true;
          ui.caption('一支白花。不在名册上。', 3600);
        }
      }
    });
  }

  // v1.5 减法：伞架退场（与衣帽架重复的「有人来过」件，
  // 还正好立在出生点到纪念碑的视线上）——同一句话说一遍就够

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
  // v1.7 归位：大衣与花圈合成东南「悼念角」——他的衣帽，
  // 和每天有人换的白花，在同一个柱间说同一件事
  coatTree.position.set(6.9, 0, -7.7);
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
      audio.sfxAt('creak', 6.9, -7.7, 0.3, 3);
      setTimeout(() => audio.sfx('whisper', 0.35), 500);
      ui.caption('扣子系到最上面一颗。他总是这样。', 3800);
    }
  });

  // v1.5 减法：丝绒长凳一对退场——横在出生点与碑之间，
  // 正是「中间的东西被分隔成一排一排」的元凶之一

  // 纪念花圈——三脚画架 + 常青叶环 + 白花簇 + 丝绒绶带。
  // v1.5 移位：从碑的后肩挪到帷幕脚下（东南柱间），中央视线彻底让空。
  // E → 花圈在架上轻晃，两枚白瓣飘落（谁换的花，没有人承认）
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
  wreathEasel.position.set(5.3, 0, -9.18);
  wreathEasel.rotation.y = Math.atan2(-5.3, 9.18);
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
  updaters.push((dt, t) => {
    if (wreathState.t >= 0) {
      wreathState.t += dt;
      const decay = Math.max(0, 1 - wreathState.t * 0.5);
      if (decay <= 0) { wreathState.t = -1; wreathPivot.rotation.z = 0; }
      else wreathPivot.rotation.z = Math.sin(wreathState.t * 4.6) * 0.07 * decay;
    } else {
      // v1.10 抛光 P18 微动：画架上的花圈从来没有真正静止过
      // （±0.006，13s 一个来回——像有人刚扶正过它）
      wreathPivot.rotation.z = Math.sin(t * 0.48) * 0.006;
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
      audio.sfxAt('creak', 5.3, -9.18, 0.22, 3);
      setTimeout(() => audio.sfx('flutter', 0.18), 350);
      ui.caption('白花每天都是新的。没人见过换花的人。', 4200);
    }
  });

  // 氛围: 地面烟雾 + 光尘（v1.9 B2：透明度随雾的呼吸相位同拍起伏——
  // 亮的时候尘多一点，暗的时候沉下去）
  const smoke = smokeLayer(70, { x: R * 2, z: R * 2 }, { opacity: 0.045, size: 10, yBase: 0.3, ySpread: 1.6 });
  group.add(smoke);
  updaters.push(smoke.userData.update);
  const dust = dustField(240, { x: R * 2, y: 7, z: R * 2 }, { opacity: 0.4 });
  group.add(dust);
  updaters.push(dust.userData.update);
  updaters.push(() => {
    // v1.10 C1「尘埃醒来」：开幕收口时光尘才从 0 缓升到常值
    dust.material.opacity = 0.4 * (1 + engine.breath * 0.3) * openGate.dust;
    smoke.material.opacity = 0.045 * (1 + engine.breath * 0.2);
  });

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
    center.intensity = 14 * (0.22 + dim.v * 0.78) * (0.12 + 0.88 * openGate.amb);
    const targetRz = -dim.idx * (Math.PI * 2 / 3);
    const kn = dimmer.userData.knob;
    kn.rotation.z += (targetRz - kn.rotation.z) * Math.min(1, dt * 9);
  });

  // ---------- v1.9 B3 → v1.10 C1：开幕点灯序列 v2（只演一次） ----------
  // 第 0 拍：黑场里碑前长明灯先独亮（一粒火先醒，配一声很轻的 flamegut）
  // → 0.9s 拍空 → 六盏吊灯错拍点亮（各配 lampon）→ 主灯组与光锥升起
  // （swell）→ 霓虹标题醒来（chime）→ 收口「尘埃醒来」（光尘 0→常值）。
  // 全程 ≈8.0s；本次会话内重复进厅直接满灯。
  const openingSfx = { flame: false, swell: false, neon: false, sub: false };
  updaters.push((dt) => {
    if (opening.t < 0) return;
    opening.t += dt;
    const T = opening.t;
    // 第 0 拍：火先醒（0–0.55s 从火星长成火苗）
    if (!openingSfx.flame && T >= 0.05) {
      openingSfx.flame = true;
      audio.sfxAt('flamegut', -2.9, 2.9, 0.22);
    }
    openGate.flame = Math.max(openGate.flame, Math.min(1, T / 0.55));
    for (let i = 0; i < 6; i++) {
      const k = Math.min(1, Math.max(0, (T - (1.3 + i * 0.5)) / 0.35));
      if (k > 0 && openGate.bulb[i] === 0) {
        audio.sfxAt('lampon', bulbs[i].position.x, bulbs[i].position.z, 0.3);
      }
      openGate.bulb[i] = Math.max(openGate.bulb[i], k);
    }
    const kc = Math.min(1, Math.max(0, (T - 4.0) / 2.4));
    openGate.chand = kc * kc * (3 - 2 * kc);
    openGate.amb = 0.22 + 0.78 * openGate.chand;
    amb.intensity = 1.4 * (0.3 + 0.7 * openGate.amb);
    rim.intensity = 22 * openGate.amb;
    steleWash.intensity = 3.4 * (0.15 + 0.85 * openGate.amb);
    steleWashB.intensity = 2.6 * (0.15 + 0.85 * openGate.amb);
    // 尘埃醒来：主灯升起后，光尘才在光里显形
    openGate.dust = Math.max(openGate.dust, Math.min(1, Math.max(0, (T - 5.6) / 2.2)));
    if (T >= 4.1 && !openingSfx.swell) { openingSfx.swell = true; audio.sfx('swell', 0.4); }
    if (T >= 6.5 && !openingSfx.neon) {
      openingSfx.neon = true;
      title.visible = true;
      audio.sfx('chime', 0.45);
    }
    if (T >= 7.0 && !openingSfx.sub) { openingSfx.sub = true; sub.visible = true; }
    if (T >= 8.0) {
      opening.t = -1;
      openGate.bulb = [1, 1, 1, 1, 1, 1];
      openGate.chand = 1;
      openGate.amb = 1;
      openGate.flame = 1;
      openGate.dust = 1;
      amb.intensity = 1.4;
      rim.intensity = 22;
      steleWash.intensity = 3.4;
      steleWashB.intensity = 2.6;
    }
  });

  // v1.10 抛光 P13「远处的声」：墙外极远处电梯到站的一声叮——
  // 每 90–160s（seeded）。这栋楼没有电梯。有人一直在到达。
  // 开幕点灯完成前不响（黑场里只留火苗和尘埃醒来）。
  const liftRng = rng(67);
  const liftState = { next: 60 + liftRng() * 50 };
  updaters.push((dt) => {
    if (openGate.chand < 1) return;
    liftState.next -= dt;
    if (liftState.next > 0) return;
    liftState.next = 90 + liftRng() * 70;
    audio.sfxAt('liftbell', -16, -9, 0.9, 9);
  });

  return {
    group,
    spawn: { x: 0, z: 8.6, yaw: 0 },
    bounds: circleBounds(R - 2.4),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'curtain-whisper': whisperTrig, 'dais-light': daisTrig }
  };
}
