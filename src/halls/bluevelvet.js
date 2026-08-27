// ============================================================
// 《蓝丝绒》展厅 —— THE BLUE ROOM 夜总会
// 蓝天鹅绒舞台（帷头层 + 台口脚灯 + 踏步）+ 桌灯烛光 +
// 吧台一角（背光酒瓶墙 + 吧凳 + 黄铜脚踏）+ 香烟薄雾
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, floorMesh, doorway, curtain, curtainWithValance,
  neonSign, micStand, smokeLayer, dustField, lightCone, lightCone2, quotePlaque, vitrine,
  velvetMaterial, zoneTrigger, rectBounds,
  mergedMesh, xform, roundedBoxMesh, roundedBoxGeo, woodTexture, brushedMetalTexture, weaveTexture,
  woodMat, fabricMat, rng
} from './kit.js';
import { propMats, jukebox, beerTaps, cashRegister, wallPhone } from './props.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'bluevelvet',
  name: 'BLUE VELVET · 蓝色房间 (1986)',
  ambience: 'bluevelvet',
  narration: 'bluevelvet',
  space: 'room',
  floorSfx: 'wood',
  look: {
    saturation: 0.92, tint: 0xdfe6ff, fogColor: 0x030409, fogDensity: 0.05,
    bg: 0x02030a, exposure: 1.0, bloom: 0.95,
    // v1.4 P4/P5：蓝调暗部 + 冷增益，halation 让桌灯在蓝屋里晕出暖圈
    halation: 0.15,
    grade: { lift: [0.004, 0.006, 0.018], gamma: [0.97, 1.0, 1.05], gain: [0.97, 0.99, 1.06] }
  }
};

const W = 19;
const D = 15;

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player, narration } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 深色木地板（v1.3 三通道：板缝法线 + 蜡面磨损）
  const M = propMats();
  group.add(floorMesh(W, D, woodMat({
    base: [26, 16, 18], planks: 10, size: 512, seed: 23, repX: 2, repY: 2,
    worn: 0.6, gloss: 0.75, env: 0.9
  })));

  // 四周深蓝帷幕墙
  const H = 6;
  const wallMat = velvetMaterial(0x101c40);
  const wallCurtains = [
    { w: W, x: 0, z: -D / 2, ry: 0 },
    { w: W, x: 0, z: D / 2, ry: Math.PI },
    { w: D, x: -W / 2, z: 0, ry: Math.PI / 2 },
    { w: D, x: W / 2, z: 0, ry: -Math.PI / 2 }
  ];
  for (const c of wallCurtains) {
    const m = curtain(c.w, H, 0x101c40, Math.round(c.w * 0.7), wallMat);
    m.position.set(c.x, H / 2, c.z);
    m.rotation.y = c.ry;
    group.add(m);
  }
  const ceil = floorMesh(W, D, new THREE.MeshStandardMaterial({ color: 0x07070c, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

  // 舞台（圆角台体 + 黄铜包边 + 踏步 + 台口脚灯）
  const brassMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.3, metalness: 0.95, envMapIntensity: 1.3
  });
  const stage = roundedBoxMesh(8.4, 0.55, 3.6, 0.06,
    new THREE.MeshStandardMaterial({ color: 0x120d10, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.8 }));
  stage.position.set(0, 0.275, -D / 2 + 2.3);
  group.add(stage);
  const stageTrim = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.03, 0.05), brassMat);
  stageTrim.position.set(0, 0.56, -D / 2 + 4.08);
  group.add(stageTrim);
  const steps = mergedMesh([
    xform(new THREE.BoxGeometry(1.6, 0.18, 0.5), 3.2, 0.09, -D / 2 + 4.4),
    xform(new THREE.BoxGeometry(1.6, 0.37, 0.5), 3.2, 0.185, -D / 2 + 3.95)
  ], new THREE.MeshStandardMaterial({ color: 0x0e0a0c, roughness: 0.5 }));
  group.add(steps);
  // 台口脚灯（一排小暖灯，合并）
  const footGeos = [];
  const footGeo = new THREE.SphereGeometry(0.035, 8, 6);
  for (let i = 0; i < 9; i++) {
    footGeos.push(xform(footGeo, -3.6 + i * 0.9, 0.6, -D / 2 + 4.12));
  }
  footGeo.dispose();
  const footLights = mergedMesh(footGeos, new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0xffc48a, emissiveIntensity: 2.4
  }));
  group.add(footLights);
  const footWash = new THREE.PointLight(0xffc48a, 3, 6, 1.8);
  footWash.position.set(0, 0.9, -D / 2 + 4.2);
  group.add(footWash);
  // v1.4 台口 v2：脚灯槽罩——底槽 + 观众侧遮光斜板 + 两端端板，
  // 灯泡有了「装在里面」的装配感，光只向舞台侧溢出（P3 去预制体感）
  const troughGeos = [
    xform(new THREE.BoxGeometry(8.6, 0.06, 0.26), 0, 0.57, -D / 2 + 4.14),
    xform(new THREE.BoxGeometry(8.6, 0.015, 0.18), 0, 0.665, -D / 2 + 4.24, 0.55, 0, 0),
    xform(new THREE.BoxGeometry(0.015, 0.12, 0.24), -4.29, 0.63, -D / 2 + 4.16),
    xform(new THREE.BoxGeometry(0.015, 0.12, 0.24), 4.29, 0.63, -D / 2 + 4.16)
  ];
  group.add(mergedMesh(troughGeos, brassMat));
  // v1.4 台口 v2：侧幕腿 ×2 + 顶部帘头——舞台开口有了完整的画框
  const legMat = velvetMaterial(0x0b142e);
  for (const sx of [-1, 1]) {
    const leg = curtain(1.4, 5.6, 0x0b142e, 4, legMat);
    leg.position.set(sx * 4.55, 2.8, -D / 2 + 3.95);
    leg.rotation.y = -sx * 0.14;
    group.add(leg);
  }
  const header = curtain(9.8, 1.3, 0x0b142e, 11, legMat);
  header.position.set(0, 5.42, -D / 2 + 3.98);
  group.add(header);

  // 舞台后幕 —— 更亮的蓝天鹅绒 + 帷头层
  const backdrop = curtainWithValance(9.4, 5.2, 0x1a2c66, 8);
  backdrop.position.set(0, 0, -D / 2 + 0.5);
  group.add(backdrop);

  // 话筒 + 聚光
  const mic = micStand();
  mic.position.set(0, 0.55, -D / 2 + 2.3);
  group.add(mic);
  const spot = new THREE.SpotLight(0xeef2ff, 60, 16, 0.32, 0.5, 1.4);
  spot.position.set(0, H - 0.2, -D / 2 + 3.4);
  spot.target.position.set(0, 0.6, -D / 2 + 2.3);
  group.add(spot, spot.target);
  // v1.4 P7：舞台聚光升级双层锥（内芯亮 + 外晕柔）
  const cone = lightCone2(0.35, 1.7, 5.2, 0xdfe6ff, 0.07);
  cone.position.set(0, 3.1, -D / 2 + 2.3);
  group.add(cone);
  // v1.4 二遍：舞台生活痕迹——返听音箱楔（网面朝话筒）+ 话筒线沿台面
  // 拖去侧幕（悬链小弯 + 两道胶带压线）；舞台从「布景」变「刚用过的台」
  const wedge = new THREE.Group();
  wedge.add(new THREE.Mesh(roundedBoxGeo(0.56, 0.32, 0.4, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.7 })));
  const grilleTex = canvasTexture(64, (g2, s) => {
    g2.fillStyle = '#08080a';
    g2.fillRect(0, 0, s, s);
    g2.fillStyle = '#1e1e26';
    for (let yy = 4; yy < s; yy += 8) {
      for (let xx = 4; xx < s; xx += 8) {
        g2.beginPath();
        g2.arc(xx, yy, 2.2, 0, Math.PI * 2);
        g2.fill();
      }
    }
  });
  const grille = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.26),
    new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.9 })
  );
  grille.position.z = 0.203;
  wedge.add(grille);
  wedge.rotation.order = 'YXZ';
  wedge.rotation.set(-0.55, -2.45, 0);
  wedge.position.set(1.18, 0.7, -D / 2 + 3.42);
  group.add(wedge);
  const cablePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.07, 0.565, -D / 2 + 2.42),
    new THREE.Vector3(0.52, 0.565, -D / 2 + 2.88),
    new THREE.Vector3(0.34, 0.565, -D / 2 + 3.34),
    new THREE.Vector3(-1.5, 0.565, -D / 2 + 3.62),
    new THREE.Vector3(-3.5, 0.565, -D / 2 + 3.28),
    new THREE.Vector3(-4.25, 0.565, -D / 2 + 2.95)
  ]);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(cablePath, 44, 0.011, 6),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.92 })
  );
  group.add(cable);
  group.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.15, 0.005, 0.07), -0.6, 0.567, -D / 2 + 3.56, 0, 0.35, 0),
    xform(new THREE.BoxGeometry(0.15, 0.005, 0.07), -2.9, 0.567, -D / 2 + 3.4, 0, -0.5, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.85 })));

  // v1.4 五遍：歇着的低音提琴——琴身 8 字挤出轮廓 + 琴颈/弦轴卷首 +
  // 琴马/系弦板/四弦 + 尾针，斜倚在圆凳上；凳面搁着琴弓。
  // E → 琴身轻晃 + 四弦颤 + 低音拨弦小走句（D2→A2）+ 聚光应一口气
  const bassGrp = new THREE.Group();
  const bassShape = new THREE.Shape();
  bassShape.moveTo(0, 0);
  bassShape.quadraticCurveTo(0.46, 0.02, 0.44, 0.3);
  bassShape.quadraticCurveTo(0.42, 0.52, 0.2, 0.6);
  bassShape.quadraticCurveTo(0.3, 0.66, 0.31, 0.84);
  bassShape.quadraticCurveTo(0.3, 1.05, 0.09, 1.1);
  bassShape.lineTo(-0.09, 1.1);
  bassShape.quadraticCurveTo(-0.3, 1.05, -0.31, 0.84);
  bassShape.quadraticCurveTo(-0.3, 0.66, -0.2, 0.6);
  bassShape.quadraticCurveTo(-0.42, 0.52, -0.44, 0.3);
  bassShape.quadraticCurveTo(-0.46, 0.02, 0, 0);
  const bassWood = new THREE.MeshPhysicalMaterial({
    color: 0x53250e, roughness: 0.32, clearcoat: 0.65, clearcoatRoughness: 0.25, envMapIntensity: 1.2
  });
  const bassBody = new THREE.Mesh(new THREE.ExtrudeGeometry(bassShape, {
    depth: 0.2, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2
  }), bassWood);
  bassBody.position.set(0, 0.1, -0.1);
  bassGrp.add(bassBody);
  const ebony = new THREE.MeshStandardMaterial({ color: 0x0c0a0a, roughness: 0.3, envMapIntensity: 1.1 });
  // f 孔一对（斜置窄条抽象）+ 琴马 + 系弦板
  bassGrp.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.022, 0.2, 0.006), -0.15, 0.76, 0.145, 0, 0, 0.18),
    xform(new THREE.BoxGeometry(0.022, 0.2, 0.006), 0.15, 0.76, 0.145, 0, 0, -0.18),
    xform(new THREE.BoxGeometry(0.24, 0.08, 0.02), 0, 0.72, 0.15),
    xform(new THREE.BoxGeometry(0.085, 0.22, 0.015), 0, 0.33, 0.15, -0.06, 0, 0)
  ], ebony));
  // 琴颈 + 指板 + 弦轴箱 + 卷首 + 四弦轴
  const neckGeos = [
    xform(new THREE.CylinderGeometry(0.03, 0.034, 0.74, 10), 0, 1.58, -0.02, 0.06, 0, 0),
    xform(new THREE.BoxGeometry(0.056, 0.66, 0.018), 0, 1.56, 0.015, 0.06, 0, 0),
    xform(new THREE.BoxGeometry(0.06, 0.17, 0.05), 0, 1.98, 0.005, 0.06, 0, 0),
    xform(new THREE.SphereGeometry(0.045, 10, 8), 0, 2.08, 0.02, 0, 0, 0, 0.9),
    xform(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 6), -0.05, 1.94, 0.005, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 6), 0.05, 2.0, 0.005, 0, 0, Math.PI / 2),
    // 尾针
    xform(new THREE.CylinderGeometry(0.008, 0.004, 0.16, 6), 0, 0.07, -0.1)
  ];
  bassGrp.add(mergedMesh(neckGeos, ebony));
  // 四弦（略随琴颈前倾）
  const bassStrings = mergedMesh(
    [-0.034, -0.0115, 0.0115, 0.034].map((sx) =>
      xform(new THREE.CylinderGeometry(0.0032, 0.0032, 1.5, 4), sx, 1.18, 0.1, -0.085, 0, 0)),
    new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.35, metalness: 0.9 })
  );
  bassGrp.add(bassStrings);
  // 靠着后幕歇：底端尾针点地、卷首埋进丝绒褶皱里
  bassGrp.position.set(-3.35, 0.55, -D / 2 + 0.9);
  bassGrp.rotation.set(-0.12, 0.35, -0.05);
  group.add(bassGrp);
  // 圆凳（座面 + 三腿）+ 搁着的琴弓（弓杆渐细 + 马尾白 + 弓根块）
  const stool = new THREE.Group();
  stool.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 16), 0, 0.6, 0),
    xform(new THREE.CylinderGeometry(0.018, 0.024, 0.6, 8), -0.14, 0.3, 0, 0, 0, 0.1),
    xform(new THREE.CylinderGeometry(0.018, 0.024, 0.6, 8), 0.11, 0.3, -0.11, 0.1, 0, -0.06),
    xform(new THREE.CylinderGeometry(0.018, 0.024, 0.6, 8), 0.11, 0.3, 0.11, -0.1, 0, -0.06),
    xform(new THREE.TorusGeometry(0.15, 0.012, 6, 14), 0, 0.2, 0, Math.PI / 2, 0, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x241109, roughness: 0.5 })));
  stool.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.007, 0.004, 0.8, 6), 0, 0.64, 0, 0, 0, Math.PI / 2 - 0.08),
    xform(new THREE.BoxGeometry(0.05, 0.032, 0.022), 0.37, 0.625, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x140c08, roughness: 0.45 })));
  stool.position.set(-2.55, 0.55, -D / 2 + 1.5);
  stool.rotation.y = 0.3;
  group.add(stool);
  // 侧台冷蓝小灯：让琴的剪影与琴弦在暗处有一条读得出的轮廓
  const bassRim = new THREE.PointLight(0x9fb2ff, 2.6, 4.5, 1.7);
  bassRim.position.set(-2.9, 2.4, -D / 2 + 1.8);
  group.add(bassRim);
  const bassState = { t: -1 };
  updaters.push((dt) => {
    if (bassState.t < 0) return;
    bassState.t += dt;
    const decay = Math.max(0, 1 - bassState.t * 0.45);
    if (decay <= 0) {
      bassState.t = -1;
      bassGrp.rotation.z = -0.05;
      bassStrings.rotation.z = 0;
      return;
    }
    bassGrp.rotation.z = -0.05 + Math.sin(bassState.t * 5.4) * 0.02 * decay;
    bassStrings.rotation.z = Math.sin(bassState.t * 31) * 0.008 * decay;
  });
  hotspots.add(bassBody, {
    hint: 'E — 歇着的低音提琴',
    onActivate: () => {
      bassState.t = 0;
      audio.sfxAt('pluck', -3.35, -D / 2 + 0.9, 0.65, 6);
      // 连锁：聚光跟着低音吸一口气（缓亮缓落，不打断呼吸更新器基线）
      const s0 = spot.intensity;
      let k = 0;
      const iv = setInterval(() => {
        k += 1;
        spot.intensity = s0 * (1 + Math.sin((k / 24) * Math.PI) * 0.35);
        if (k >= 24) { clearInterval(iv); spot.intensity = s0; }
      }, 55); // 1.3s 自清，无需入 teardown 表
      ui.caption('贝斯手去抽烟了。琴还醒着。', 4200);
    }
  });

  // 幕绳 —— 拉一下，后幕全幅打个寒颤，脚灯跟着亮一拍
  const pullRope = new THREE.Group();
  const ropeCord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 3.9, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b5232, roughness: 0.8 })
  );
  ropeCord.position.y = -1.95;
  const tassel = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0), new THREE.Vector2(0.05, -0.05), new THREE.Vector2(0.055, -0.16),
      new THREE.Vector2(0.03, -0.24), new THREE.Vector2(0.001, -0.27)
    ], 12),
    new THREE.MeshStandardMaterial({ color: 0x8a6c3c, roughness: 0.65, metalness: 0.3 })
  );
  tassel.position.y = -3.9;
  pullRope.add(ropeCord, tassel);
  pullRope.position.set(3.85, 5.1, -D / 2 + 0.9);
  group.add(pullRope);
  const curtainShudder = { t: 0, e: 0 };
  updaters.push((dt) => {
    if (curtainShudder.e <= 0.004) return;
    curtainShudder.t += dt;
    curtainShudder.e *= Math.max(0, 1 - dt * 1.3);
    const k = Math.sin(curtainShudder.t * 11) * curtainShudder.e;
    backdrop.position.x = k * 0.07;
    backdrop.rotation.y = k * 0.018;
    pullRope.rotation.x = Math.sin(curtainShudder.t * 5.5) * 0.2 * curtainShudder.e;
    footWash.intensity = 3 + curtainShudder.e * 5;
  });
  // v1.4 四遍：后幕呼吸——丝绒在没人看它的时候也在动。
  // 顶端被杆钉死（权重 0.15）、底摆最重（1.0）；褶皱幅度慢相位起伏 +
  // 一支横向游走波：逐顶点只改 Z、每帧重算法线（~1600 顶点，可忽略）
  const breathMesh = backdrop.children[0];
  const bGeo = breathMesh.geometry;
  const bPos = bGeo.attributes.position;
  const bBase = bPos.array.slice();
  updaters.push((dt, t) => {
    if (curtainShudder.e > 0.004) return; // 寒颤时让位
    for (let i = 0; i < bPos.count; i++) {
      const u = bBase[i * 3] / 9.4 + 0.5;
      const w = 1 - (bBase[i * 3 + 1] / 5.2 + 0.5) * 0.85;
      bPos.array[i * 3 + 2] = bBase[i * 3 + 2] * (1 + Math.sin(u * 5 + t * 0.6) * 0.16 * w) +
        Math.sin(u * Math.PI * 2 + t * 0.85) * 0.05 * w;
    }
    bPos.needsUpdate = true;
    bGeo.computeVertexNormals();
  });
  hotspots.add(tassel, {
    hint: 'E — 拉动幕绳',
    onActivate: () => {
      curtainShudder.t = 0;
      curtainShudder.e = 1;
      audio.sfx('curtain', 0.9);
    }
  });

  // 话筒热点 —— 影片档案
  const micHot = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0, emissive: 0x4f74ff, emissiveIntensity: 0 })
  );
  micHot.position.set(0, 1.9, -D / 2 + 2.3);
  group.add(micHot);
  hotspots.add(micHot, {
    hint: 'E — 空舞台（《蓝丝绒》档案）',
    onActivate: () => ui.showFilm('blue-velvet')
  });

  // 霓虹招牌
  const sign = neonSign('THE BLUE ROOM', { color: '#4f74ff', size: 0.72 });
  sign.position.set(0, 5.35, -D / 2 + 1.1);
  group.add(sign);
  updaters.push((dt, t) => sign.userData.flicker(t, 11));

  // 观众席小圆桌 + 桌灯（艺术二遍：车削黄铜杆 + 鼓形织物罩，去"圆锥即灯罩"观感）
  const lamps = [];
  const tableMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [24, 12, 15], planks: 1, size: 128 }), roughness: 0.4
  });
  const lampStemGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.055, 0), new THREE.Vector2(0.05, 0.012), new THREE.Vector2(0.014, 0.03),
    new THREE.Vector2(0.012, 0.22), new THREE.Vector2(0.028, 0.25), new THREE.Vector2(0.018, 0.275),
    new THREE.Vector2(0.006, 0.3)
  ], 12);
  const lampShadeGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.155, 0), new THREE.Vector2(0.162, 0.012), new THREE.Vector2(0.148, 0.026),
    new THREE.Vector2(0.122, 0.175), new THREE.Vector2(0.128, 0.19), new THREE.Vector2(0.112, 0.2)
  ], 16);
  const lampShadeMat = new THREE.MeshPhysicalMaterial({
    map: weaveTexture('#5c0e18', '#7a1424', 128, 24),
    color: 0x8f0e1e, roughness: 0.7, side: THREE.DoubleSide,
    emissive: 0xff5e3c, emissiveIntensity: 0.3,
    sheen: 0.8, sheenColor: new THREE.Color(0xff9080), sheenRoughness: 0.5
  });
  const tablePos = [[-3.4, 1.2], [3.2, 0.8], [-1.2, 3.4], [2.6, 3.8], [-4.6, 4.4], [0.6, 5.8]];
  for (const [x, z] of tablePos) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 24), tableMat);
    table.position.set(x, 0.78, z);
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.22, 0.78, 12),
      new THREE.MeshStandardMaterial({ color: 0x0c0608, roughness: 0.5 })
    );
    leg.position.set(x, 0.39, z);
    const stem = new THREE.Mesh(lampStemGeo, brassMat);
    stem.position.set(x, 0.805, z);
    const shade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    shade.position.set(x, 0.96, z);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc48a, emissiveIntensity: 3.4 })
    );
    glow.position.set(x, 1.04, z);
    const light = new THREE.PointLight(0xff9e5e, 2.6, 5, 2);
    light.position.set(x, 1.16, z);
    group.add(table, leg, stem, shade, glow, light);
    lamps.push({ light, glow });

    const wisp = smokeLayer(9, { x: 0.3, z: 0.3 }, { opacity: 0.05, size: 1.6, yBase: 1.0, ySpread: 1.5, color: 0xcdd3e0 });
    wisp.position.set(x + 0.2, 0, z);
    group.add(wisp);
    updaters.push(wisp.userData.update);
  }
  updaters.push((dt, t) => {
    lamps.forEach(({ light, glow }, i) => {
      const f = 1 + Math.sin(t * 6.5 + i * 2.2) * 0.12;
      light.intensity = 2.6 * f * dimState.warm;
      glow.material.emissiveIntensity = 3.4 * f * Math.max(dimState.warm, 0.12);
    });
  });

  // v1.4 二遍：桌面生活痕迹——玻璃烟灰缸/威士忌残杯/搁着的烟（seeded 摆位，
  // 各桌不重样：一张干净、一杯已空；烬头按「有人在抽」的节奏明灭）
  const setR = rng(41);
  const TABLE_TOP = 0.805;
  const ashProfile = [
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.06, 0.005), new THREE.Vector2(0.063, 0.03),
    new THREE.Vector2(0.05, 0.034), new THREE.Vector2(0.015, 0.013), new THREE.Vector2(0.0, 0.012)
  ];
  const glassProfile = [
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.036, 0.003), new THREE.Vector2(0.04, 0.012),
    new THREE.Vector2(0.042, 0.092), new THREE.Vector2(0.038, 0.092), new THREE.Vector2(0.036, 0.02),
    new THREE.Vector2(0.0, 0.014)
  ];
  const ashGeos = [];
  const glassGeos = [];
  const liquorGeos = [];
  const cigGeos = [];
  const emberGeos = [];
  tablePos.forEach(([x, z], i) => {
    const aa = setR() * Math.PI * 2;
    if (i !== 4) {
      const ax = x + Math.cos(aa) * 0.3;
      const az = z + Math.sin(aa) * 0.3;
      ashGeos.push(xform(new THREE.LatheGeometry(ashProfile, 14), ax, TABLE_TOP, az));
      if (i === 0 || i === 3) {
        const ca = setR() * Math.PI * 2;
        const cg = new THREE.CylinderGeometry(0.0034, 0.0034, 0.072, 6);
        cg.rotateZ(Math.PI / 2);
        cg.rotateY(-ca);
        cigGeos.push(xform(cg, ax, TABLE_TOP + 0.035, az));
        emberGeos.push(xform(new THREE.SphereGeometry(0.0044, 6, 5),
          ax + Math.cos(ca) * 0.037, TABLE_TOP + 0.035, az + Math.sin(ca) * 0.037));
      }
    }
    if (i === 1 || i === 3 || i === 4) {
      const ga = setR() * Math.PI * 2;
      const gx = x + Math.cos(ga) * 0.33;
      const gz = z + Math.sin(ga) * 0.33;
      glassGeos.push(xform(new THREE.LatheGeometry(glassProfile, 14), gx, TABLE_TOP, gz));
      if (i !== 4) liquorGeos.push(xform(new THREE.CylinderGeometry(0.031, 0.033, 0.03, 12), gx, TABLE_TOP + 0.023, gz));
    }
  });
  group.add(
    mergedMesh(ashGeos, new THREE.MeshPhysicalMaterial({
      color: 0xbfd0d8, roughness: 0.08, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, envMapIntensity: 1.5
    })),
    mergedMesh(glassGeos, new THREE.MeshPhysicalMaterial({
      color: 0xd6e2ea, roughness: 0.06, transparent: true, opacity: 0.38,
      side: THREE.DoubleSide, envMapIntensity: 1.6
    })),
    mergedMesh(liquorGeos, new THREE.MeshPhysicalMaterial({
      color: 0x8a4a10, roughness: 0.05, transparent: true, opacity: 0.88, envMapIntensity: 1.2
    })),
    mergedMesh(cigGeos, new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.85 }))
  );
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x1a0a06, emissive: 0xff5a20, emissiveIntensity: 1.6
  });
  group.add(mergedMesh(emberGeos, emberMat));
  updaters.push((dt, t) => {
    // 烟烬呼吸：慢波（搁着阴燃）+ 偶发亮起（像有人低头吸了一口）
    const drag = Math.max(0, Math.sin(t * 0.43) - 0.88) * 8;
    emberMat.emissiveIntensity = 1.1 + Math.sin(t * 2.6) * 0.35 + drag * 2.2;
  });

  // "深蓝时刻"开关 —— 一盏桌灯是热点
  const dimState = { warm: 1, blue: 0 };
  const switchLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.001, emissive: 0xffc48a, emissiveIntensity: 0.4 })
  );
  switchLamp.position.set(-3.4, 1.0, 1.2);
  group.add(switchLamp);
  const blueWash = new THREE.PointLight(0x2244ff, 0, 30, 1.4);
  blueWash.position.set(0, 4.4, 0);
  group.add(blueWash);
  hotspots.add(switchLamp, {
    hint: 'E — 熄灯 / 复灯（夜总会的两副面孔）',
    onActivate: () => {
      const toBlue = dimState.warm > 0.5;
      dimState.warm = toBlue ? 0.06 : 1;
      dimState.blue = toBlue ? 1 : 0;
      audio.sfx(toBlue ? 'thud' : 'chime');
    }
  });
  updaters.push((dt) => {
    blueWash.intensity += ((dimState.blue * 26) - blueWash.intensity) * Math.min(1, dt * 2.2);
  });

  // ============================================================
  // 丝绒卡座半圆包厢（东墙；v1.4 P3 重做件）
  // 弧形软包靠背（双排缝扣 + 黄铜滚边）+ 半环长垫（枕端收头）
  // + 独立包厢桌灯（并入桌灯烛光系统）+ 「已预留」牌
  // ============================================================
  const booth = new THREE.Group();
  const boothBack = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.42, 1.15, 40, 1, true, -Math.PI / 2, Math.PI),
    velvetMaterial(0x1a2a60)
  );
  boothBack.position.y = 0.93;
  booth.add(boothBack);
  booth.add(mergedMesh([
    xform(new THREE.TorusGeometry(1.42, 0.03, 8, 48, Math.PI), 0, 1.505, 0, Math.PI / 2, 0, 0)
  ], brassMat));
  // 双排缝扣（错位排布，软包不再是一张光皮）
  const btnGeo = new THREE.SphereGeometry(0.021, 8, 6);
  const btnGeos = [];
  for (let i = 0; i < 9; i++) {
    const th = -Math.PI * 0.42 + (i / 8) * Math.PI * 0.84;
    btnGeos.push(xform(btnGeo, Math.sin(th) * 1.395, 1.08, Math.cos(th) * 1.395));
  }
  for (let i = 0; i < 8; i++) {
    const th = -Math.PI * 0.375 + (i / 7) * Math.PI * 0.75;
    btnGeos.push(xform(btnGeo, Math.sin(th) * 1.395, 0.78, Math.cos(th) * 1.395));
  }
  btnGeo.dispose();
  booth.add(mergedMesh(btnGeos, new THREE.MeshStandardMaterial({
    color: 0x0d1434, roughness: 0.38, envMapIntensity: 1.2
  })));
  // 半环长垫：压扁的半环 + 两端枕头收头（不是又一只圆角箱）
  const cushion = mergedMesh([
    xform(new THREE.TorusGeometry(1.02, 0.16, 12, 48, Math.PI), 0, 0, 0, Math.PI / 2, 0, 0),
    xform(new THREE.SphereGeometry(0.16, 12, 10), -1.02, 0, 0),
    xform(new THREE.SphereGeometry(0.16, 12, 10), 1.02, 0, 0)
  ], velvetMaterial(0x131f4c));
  cushion.scale.set(1, 0.55, 1);
  cushion.position.y = 0.43;
  booth.add(cushion);
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.06, 0.38, 32, 1, true, -Math.PI / 2, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x0a0f24, roughness: 0.85 })
  );
  skirt.position.y = 0.19;
  booth.add(skirt);
  // 包厢桌 + 独立桌灯（并入 lamps：随烛光颤动、随深蓝时刻熄灭）
  const bTable = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), tableMat);
  bTable.position.set(0, 0.78, 0.12);
  const bLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.2, 0.78, 12),
    new THREE.MeshStandardMaterial({ color: 0x0c0608, roughness: 0.5 })
  );
  bLeg.position.set(0, 0.39, 0.12);
  const bStem = new THREE.Mesh(lampStemGeo, brassMat);
  bStem.position.set(0, 0.805, 0.12);
  const bShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
  bShade.position.set(0, 0.96, 0.12);
  const bGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc48a, emissiveIntensity: 3.4 })
  );
  bGlow.position.set(0, 1.04, 0.12);
  const bLight = new THREE.PointLight(0xff9e5e, 2.6, 5, 2);
  bLight.position.set(0, 1.16, 0.12);
  booth.add(bTable, bLeg, bStem, bShade, bGlow, bLight);
  lamps.push({ light: bLight, glow: bGlow });
  // 「已预留」立牌（帐篷折卡）
  const cardTex = canvasTexture(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = '#efe6d2';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#8a6c3c';
    g.lineWidth = 3;
    g.strokeRect(8, 8, s - 16, s - 16);
    g.fillStyle = '#2a2018';
    g.font = 'bold 34px serif';
    g.textAlign = 'center';
    g.fillText('已 预 留', s / 2, 62);
    g.fillStyle = '#8a6c3c';
    g.font = '13px serif';
    g.fillText('R E S E R V E D', s / 2, 92);
  });
  const cardGeo = new THREE.PlaneGeometry(0.15, 0.1);
  const card = mergedMesh([
    xform(cardGeo, 0, 0.048, 0.02, -0.38, 0, 0),
    xform(cardGeo, 0, 0.048, -0.02, 0.38, 0, 0)
  ], new THREE.MeshStandardMaterial({ map: cardTex, side: THREE.DoubleSide, roughness: 0.7 }));
  cardGeo.dispose();
  card.position.set(0, 0.805, 0.34);
  booth.add(card);
  booth.position.set(7.75, 0, 1.7);
  booth.rotation.y = Math.PI / 2; // 开口朝西迎向房间
  group.add(booth);
  const boothFlare = { v: 0 };
  updaters.push((dt) => {
    if (boothFlare.v <= 0.01) return;
    boothFlare.v *= Math.max(0, 1 - dt * 1.1);
    bLight.intensity = 2.6 * dimState.warm + boothFlare.v * 6;
    bGlow.material.emissiveIntensity = 3.4 * Math.max(dimState.warm, 0.12) + boothFlare.v * 4;
  });
  hotspots.add(card, {
    hint: 'E — 包厢预留牌',
    onActivate: () => {
      audio.sfx('page', 0.7);
      boothFlare.v = 1;
      ui.caption('「已预留」。没有名字，也没有日期。', 3600);
    }
  });

  // ============================================================
  // 吧台一角（西墙）：背光酒瓶墙 + 吧凳 + 黄铜脚踏
  // ============================================================
  const bar = new THREE.Group();
  // 台面（高蜡面木 + 板缝法线）+ 软包台体
  const barTop = roundedBoxMesh(0.9, 0.09, 6.4, 0.04,
    woodMat({ base: [46, 26, 20], planks: 2, size: 256, seed: 24, gloss: 0.85, env: 1.1 }));
  barTop.position.set(-W / 2 + 1.7, 1.08, 0.8);
  const barBody = roundedBoxMesh(0.78, 1.04, 6.3, 0.05,
    fabricMat('#141024', '#1c1834', { seed: 25, repX: 2, repY: 10, color: 0x8a90c0, sheenColor: 0x6070c0 }));
  barBody.position.set(-W / 2 + 1.7, 0.52, 0.8);
  // 黄铜脚踏杆
  const brassRail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6.2, 10), brassMat);
  brassRail.rotation.x = Math.PI / 2;
  brassRail.position.set(-W / 2 + 2.25, 0.22, 0.8);
  bar.add(barTop, barBody, brassRail);
  // v1.4 P2 独有印迹：台面酒渍杯印贴花层——窄长画布贴合台面比例（杯印保持正圆），
  // 干涸残渍比蜡面更光滑，在吊灯下泛出一圈圈旧夜的痕迹；一枚正压在那杯酒底下
  const ringCv = document.createElement('canvas');
  ringCv.width = 128;
  ringCv.height = 1024;
  const rg = ringCv.getContext('2d');
  const rr = (() => { let s = 24; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
  const stampRing = (px, py, rad) => {
    for (let k = 0; k < 3; k++) {
      const a0 = rr() * Math.PI * 2;
      const arc = Math.PI * (0.5 + rr() * 1.3);
      rg.strokeStyle = `rgba(226,214,188,${0.14 + rr() * 0.18})`;
      rg.lineWidth = 1 + rr() * 1.6;
      rg.beginPath();
      rg.arc(px, py, rad - k * 1.2, a0, a0 + arc);
      rg.stroke();
    }
  };
  stampRing(71, 281, 7.5); // 威士忌杯正下方（z=-0.6 处）
  for (let i = 0; i < 8; i++) stampRing(20 + rr() * 88, 80 + rr() * 860, 5 + rr() * 5);
  const ringTex = new THREE.CanvasTexture(ringCv);
  ringTex.colorSpace = THREE.SRGBColorSpace;
  const ringDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 6.2),
    new THREE.MeshPhysicalMaterial({
      map: ringTex, transparent: true, roughness: 0.16, metalness: 0,
      envMapIntensity: 1.3, depthWrite: false
    })
  );
  ringDecal.rotation.x = -Math.PI / 2;
  ringDecal.position.set(-W / 2 + 1.7, 1.1265, 0.8);
  bar.add(ringDecal);
  // 背柜 + 酒瓶墙（发光轮廓，合并两组）
  const backbar = roundedBoxMesh(0.34, 2.6, 6.4, 0.04,
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: [20, 12, 14], planks: 3, vertical: true, size: 256 }), roughness: 0.6 }));
  backbar.position.set(-W / 2 + 0.4, 1.3, 0.8);
  bar.add(backbar);
  // 修正：层板/酒瓶/背光全部置于背柜前脸之外（此前埋进柜体不可见）
  const shelfGeos = [
    xform(new THREE.BoxGeometry(0.3, 0.03, 6.0), -W / 2 + 0.74, 1.5, 0.8),
    xform(new THREE.BoxGeometry(0.3, 0.03, 6.0), -W / 2 + 0.74, 2.1, 0.8)
  ];
  bar.add(mergedMesh(shelfGeos, brassMat));
  // 酒瓶墙 v2：三种车削剖面（圆肩/溜肩高瓶/矮墩瓶）× 三色玻璃（蓝/绿/琥珀）
  const bottleProfiles = [
    [[0.001, 0], [0.042, 0.004], [0.045, 0.16], [0.03, 0.22], [0.014, 0.26], [0.013, 0.34], [0.018, 0.35]],
    [[0.001, 0], [0.038, 0.004], [0.04, 0.2], [0.02, 0.3], [0.012, 0.32], [0.011, 0.4], [0.016, 0.41]],
    [[0.001, 0], [0.05, 0.004], [0.046, 0.12], [0.024, 0.17], [0.012, 0.2], [0.011, 0.26], [0.015, 0.27]]
  ];
  const bottleTints = [
    { color: 0x1a3a55, emissive: 0x2a5a88 },  // 钴蓝
    { color: 0x14382a, emissive: 0x2a7a55 },  // 墨绿
    { color: 0x46280f, emissive: 0x8a5220 }   // 琥珀
  ];
  const bottleGeoSets = [[], [], []];
  for (let shelf = 0; shelf < 2; shelf++) {
    for (let i = 0; i < 12; i++) {
      const kind = (i + shelf * 2) % 3;
      const geo = new THREE.LatheGeometry(
        bottleProfiles[kind].map(([r, y]) => new THREE.Vector2(r, y)), 10
      );
      bottleGeoSets[(i * 7 + shelf * 5) % 3].push(
        xform(geo, -W / 2 + 0.74, 1.52 + shelf * 0.6, -1.9 + i * 0.46 + Math.random() * 0.04)
      );
      geo.dispose();
    }
  }
  const bottleMeshes = bottleGeoSets.map((geos, k) => mergedMesh(geos, new THREE.MeshPhysicalMaterial({
    color: bottleTints[k].color, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85,
    emissive: bottleTints[k].emissive, emissiveIntensity: 0.5, envMapIntensity: 1.6
  })));
  for (const m of bottleMeshes) bar.add(m);
  // 背光条（v1.4 P1：均匀发光大色块 → 渐变光带，两端与上下缘熄灭，
  // 酒瓶重新有了剪影层次）
  const barGlowTex = canvasTexture(128, (g, s) => {
    const grad = g.createLinearGradient(0, s, 0, 0);
    grad.addColorStop(0, 'rgb(4,7,14)');
    grad.addColorStop(0.42, 'rgb(46,110,190)');
    grad.addColorStop(0.7, 'rgb(18,50,96)');
    grad.addColorStop(1, 'rgb(2,4,8)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    const side = g.createLinearGradient(0, 0, s, 0);
    side.addColorStop(0, 'rgba(0,0,0,0.92)');
    side.addColorStop(0.16, 'rgba(0,0,0,0)');
    side.addColorStop(0.84, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,0,0.92)');
    g.fillStyle = side;
    g.fillRect(0, 0, s, s);
  });
  const barGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 1.4),
    new THREE.MeshStandardMaterial({
      color: 0x05070c, map: barGlowTex,
      emissive: 0xffffff, emissiveMap: barGlowTex, emissiveIntensity: 1.0
    })
  );
  barGlow.position.set(-W / 2 + 0.58, 1.9, 0.8);
  barGlow.rotation.y = Math.PI / 2;
  bar.add(barGlow);
  const barLight = new THREE.PointLight(0x66aaff, 4, 8, 1.8);
  barLight.position.set(-W / 2 + 1.4, 2.1, 0.8);
  bar.add(barLight);
  updaters.push((dt, t) => {
    barGlow.material.emissiveIntensity = 0.95 + Math.sin(t * 1.9) * 0.18;
    bottleMeshes.forEach((m, k) => {
      m.material.emissiveIntensity = 0.42 + Math.sin(t * 1.9 + 1 + k * 0.7) * 0.14;
    });
  });
  // v1.4 六遍：吧台悬挂杯架——黄铜立柱对 + 深木顶板 + 四道倒挂杯轨 +
  // 高脚杯倒吊一排（马天尼/红酒/浅碟三种车削剖面，缺两只——被桌上的酒杯借走了）。
  // E → 整排轻晃、玻璃互碰细响（谁蹭过它？）
  const rackGrp = new THREE.Group();
  rackGrp.position.set(-8.08, 2.32, 0.8); // 枢轴放顶板处，晃动绕这里
  rackGrp.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.018, 0.022, 1.2, 8), 0, -0.6, -1.35),
    xform(new THREE.CylinderGeometry(0.018, 0.022, 1.2, 8), 0, -0.6, 1.35),
    // 杯轨四道（成对细条，中缝走杯脚）
    ...[-0.135, -0.045, 0.045, 0.135].flatMap((ox) => [
      xform(new THREE.BoxGeometry(0.014, 0.01, 2.9), ox - 0.022, -0.045, 0),
      xform(new THREE.BoxGeometry(0.014, 0.01, 2.9), ox + 0.022, -0.045, 0)
    ])
  ], brassMat));
  rackGrp.add(new THREE.Mesh(
    roundedBoxGeo(0.42, 0.035, 3.0, 0.012),
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: [22, 13, 15], planks: 1, size: 128 }), roughness: 0.55 })
  ));
  const stemProfiles = [
    // 马天尼锥 / 红酒杯 / 浅碟香槟（倒挂：脚在上 y0，口在下）
    [[0.06, -0.19], [0.008, -0.1], [0.006, -0.012], [0.032, -0.006], [0.033, 0]],
    [[0.055, -0.19], [0.05, -0.155], [0.028, -0.115], [0.008, -0.095], [0.006, -0.012], [0.032, -0.006], [0.033, 0]],
    [[0.052, -0.17], [0.045, -0.125], [0.012, -0.1], [0.006, -0.012], [0.032, -0.006], [0.033, 0]]
  ];
  const stemRng = rng(41);
  const stemGeos = [];
  for (let rail = 0; rail < 4; rail++) {
    const n = rail % 2 === 0 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      if (rail === 2 && i === 1) continue; // 缺的那两只在卡座桌上
      if (rail === 3 && i === 2) continue;
      const prof = stemProfiles[(rail + i) % 3];
      const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10);
      stemGeos.push(xform(geo,
        -0.135 + rail * 0.09, -0.056,
        -1.2 + i * (2.4 / (n - 1)) + (stemRng() - 0.5) * 0.06));
      geo.dispose();
    }
  }
  rackGrp.add(mergedMesh(stemGeos, new THREE.MeshPhysicalMaterial({
    color: 0xcfe4ff, transparent: true, opacity: 0.24, roughness: 0.06,
    envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide
  })));
  bar.add(rackGrp);
  const rackState = { t: -1 };
  updaters.push((dt) => {
    if (rackState.t < 0) return;
    rackState.t += dt;
    const decay = Math.max(0, 1 - rackState.t * 0.55);
    if (decay <= 0) { rackState.t = -1; rackGrp.rotation.z = 0; return; }
    rackGrp.rotation.z = Math.sin(rackState.t * 6.2) * 0.028 * decay;
  });
  hotspots.add(rackGrp.children[1], {
    hint: 'E — 杯架',
    onActivate: () => {
      rackState.t = 0;
      audio.sfxAt('iceclink', -8.08, 0.8, 0.5, 4);
      setTimeout(() => audio.sfxAt('chime', -8.08, 0.8, 0.16, 4), 420);
      ui.caption('杯子都口朝下。免得接住什么。', 4000);
    }
  });
  // 吧凳 ×3（软包 + 铬柱，合并两组）
  const stSeatGeos = [];
  const stPoleGeos = [];
  const stSeat = new THREE.CylinderGeometry(0.24, 0.24, 0.11, 18);
  const stRim = new THREE.TorusGeometry(0.24, 0.045, 8, 20);
  const stPole = new THREE.CylinderGeometry(0.04, 0.06, 0.74, 10);
  const stFoot = new THREE.CylinderGeometry(0.18, 0.22, 0.04, 12);
  for (const z of [-1.2, 0.8, 2.8]) {
    stSeatGeos.push(xform(stSeat, -W / 2 + 2.7, 0.84, z));
    stSeatGeos.push(xform(stRim, -W / 2 + 2.7, 0.8, z, Math.PI / 2, 0, 0));
    stPoleGeos.push(xform(stPole, -W / 2 + 2.7, 0.4, z));
    stPoleGeos.push(xform(stFoot, -W / 2 + 2.7, 0.02, z));
  }
  stSeat.dispose(); stRim.dispose(); stPole.dispose(); stFoot.dispose();
  bar.add(mergedMesh(stSeatGeos, new THREE.MeshPhysicalMaterial({
    color: 0x101c40, roughness: 0.5, sheen: 0.7, sheenColor: new THREE.Color(0x5070d0),
    clearcoat: 0.4, clearcoatRoughness: 0.4
  })));
  bar.add(mergedMesh(stPoleGeos, new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0xa8a8a8, roughness: 0.2, metalness: 0.95, envMapIntensity: 1.4
  })));
  // 吊坠灯 ×3：长杆珐琅锥罩垂到吧台上方——乐队醒着时收暗（歌厅暗场规矩）
  const pendantShadeGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.16, 0), new THREE.Vector2(0.148, 0.008), new THREE.Vector2(0.125, 0.06),
    new THREE.Vector2(0.05, 0.2), new THREE.Vector2(0.022, 0.24), new THREE.Vector2(0.02, 0.31)
  ], 18);
  const pendantRodGeo = new THREE.CylinderGeometry(0.012, 0.012, 3.42, 8);
  const pendantGeos = [];
  const pendantBulbGeos = [];
  const pendantBulbGeo = new THREE.SphereGeometry(0.035, 10, 8);
  const pendantLights = [];
  const pendantCones = [];
  for (const z of [-1.2, 0.8, 2.8]) {
    pendantGeos.push(xform(pendantShadeGeo, -W / 2 + 1.7, 2.28, z));
    pendantGeos.push(xform(pendantRodGeo, -W / 2 + 1.7, 4.29, z));
    pendantBulbGeos.push(xform(pendantBulbGeo, -W / 2 + 1.7, 2.33, z));
    const pl = new THREE.PointLight(0xffc98a, 2.6, 3.8, 2);
    pl.position.set(-W / 2 + 1.7, 2.15, z);
    bar.add(pl);
    pendantLights.push(pl);
    const cone = lightCone(0.06, 0.55, 1.5, 0xffc98a, 0.05);
    cone.position.set(-W / 2 + 1.7, 1.53, z);
    bar.add(cone);
    pendantCones.push(cone);
  }
  pendantShadeGeo.dispose(); pendantRodGeo.dispose(); pendantBulbGeo.dispose();
  bar.add(mergedMesh(pendantGeos, new THREE.MeshStandardMaterial({
    color: 0x101014, roughness: 0.35, metalness: 0.6, envMapIntensity: 1.1, side: THREE.DoubleSide
  })));
  const pendantBulbMat = new THREE.MeshStandardMaterial({
    color: 0x241a10, emissive: 0xffd9a0, emissiveIntensity: 2.6, roughness: 0.4
  });
  bar.add(mergedMesh(pendantBulbGeos, pendantBulbMat));

  // v1.4 三遍：背柜上方的霓虹鸡尾酒杯——马天尼轮廓（冰蓝双层描：外晕+内芯）
  // + 橄榄和签（粉暖）+ cocktails 草字；蓝屋里唯一一块粉色，偶发断闪
  const neonTex = canvasTexture(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    const stroke = (color, blur, w2, draw) => {
      g.save();
      g.strokeStyle = color;
      g.shadowColor = color;
      g.shadowBlur = blur;
      g.lineWidth = w2;
      g.lineCap = 'round';
      draw();
      g.restore();
    };
    const glassPath = () => {
      g.beginPath();
      g.moveTo(58, 52);
      g.lineTo(198, 52);
      g.lineTo(128, 128);
      g.lineTo(128, 186);
      g.moveTo(96, 190);
      g.lineTo(160, 190);
      g.stroke();
    };
    stroke('rgba(80,220,255,0.9)', 18, 7, glassPath);
    stroke('rgba(230,250,255,0.95)', 4, 2.6, glassPath);
    const olive = () => {
      g.beginPath();
      g.arc(112, 92, 10, 0, Math.PI * 2);
      g.moveTo(96, 70);
      g.lineTo(150, 108);
      g.stroke();
    };
    stroke('rgba(255,110,150,0.9)', 14, 6, olive);
    stroke('rgba(255,230,240,0.95)', 3, 2.2, olive);
    g.font = 'italic 700 30px Georgia, serif';
    g.textAlign = 'center';
    g.save();
    g.shadowColor = 'rgba(255,110,150,0.9)';
    g.shadowBlur = 16;
    g.fillStyle = 'rgba(255,190,210,0.95)';
    g.fillText('cocktails', 128, 232);
    g.restore();
  });
  const neonCocktail = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false })
  );
  neonCocktail.position.set(-W / 2 + 0.09, 3.55, 0.8);
  neonCocktail.rotation.y = Math.PI / 2;
  bar.add(neonCocktail);
  const neonWash = new THREE.PointLight(0x5ac8e8, 2.2, 5, 2);
  neonWash.position.set(-W / 2 + 0.55, 3.5, 0.8);
  bar.add(neonWash);
  updaters.push((dt, t) => {
    const flick = Math.sin(t * 31) * Math.sin(t * 8.3) > 0.965 ? 0.25 : 1;
    const base = 0.92 + Math.sin(t * 2.2) * 0.08;
    neonCocktail.material.opacity = base * flick;
    neonWash.intensity = 2.2 * base * flick;
  });

  // 吧台壁挂电话 —— 拿起听筒：只有拨号音，然后一阵没人接的响铃
  const barPhone = wallPhone({ mats: M });
  barPhone.position.set(-W / 2 + 0.12, 1.5, 5.1);
  barPhone.rotation.y = Math.PI / 2;
  bar.add(barPhone);
  const phoneState = { busy: false, shake: 0 };
  updaters.push((dt, t) => {
    if (phoneState.shake > 0) {
      phoneState.shake -= dt;
      barPhone.userData.bells.position.x = Math.sin(t * 90) * 0.004;
      barPhone.userData.handset.rotation.x = Math.sin(t * 70) * 0.02;
    } else {
      barPhone.userData.bells.position.x = 0;
      barPhone.userData.handset.rotation.x = 0;
    }
  });
  hotspots.add(barPhone.userData.hitbox, {
    hint: 'E — 吧台电话',
    onActivate: () => {
      if (phoneState.busy) return;
      phoneState.busy = true;
      audio.sfx('click', 0.5);
      ui.caption('只有拨号音。', 2400);
      setTimeout(() => {
        phoneState.shake = 1.4;
        audio.sfxAt('phonering', -W / 2 + 0.3, 5.1, 0.65, 3);
      }, 2600);
      setTimeout(() => {
        phoneState.shake = 1.4;
        audio.sfxAt('phonering', -W / 2 + 0.3, 5.1, 0.5, 3);
        phoneState.busy = false;
      }, 4400);
    }
  });

  // 第四把吧凳 —— 被人拉离了吧台，凳面可以转
  const strayStool = new THREE.Group();
  const straySeatSpin = new THREE.Group();
  const straySeat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.11, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0x101c40, roughness: 0.5, sheen: 0.7, sheenColor: new THREE.Color(0x5070d0),
      clearcoat: 0.4, clearcoatRoughness: 0.4
    })
  );
  straySeat.position.y = 0.84;
  const strayRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 20), straySeat.material);
  strayRim.rotation.x = Math.PI / 2;
  strayRim.position.y = 0.8;
  straySeatSpin.add(straySeat, strayRim);
  const strayPole = mergedMesh([
    xform(new THREE.CylinderGeometry(0.04, 0.06, 0.74, 10), 0, 0.4, 0),
    xform(new THREE.CylinderGeometry(0.18, 0.22, 0.04, 12), 0, 0.02, 0)
  ], new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0xa8a8a8, roughness: 0.2, metalness: 0.95, envMapIntensity: 1.4
  }));
  strayStool.add(straySeatSpin, strayPole);
  strayStool.position.set(-W / 2 + 3.35, 0, 4.35);
  bar.add(strayStool);
  const stoolSpin = { w: 0 };
  updaters.push((dt) => {
    if (stoolSpin.w <= 0.01) return;
    stoolSpin.w *= Math.max(0, 1 - dt * 0.9);
    straySeatSpin.rotation.y += stoolSpin.w * dt;
  });
  hotspots.add(straySeat, {
    hint: 'E — 转一转吧凳',
    onActivate: () => {
      stoolSpin.w = 9;
      audio.sfx('creak', 0.5);
    }
  });
  // 吧台上的威士忌杯
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.045, 0.09, 14),
    new THREE.MeshPhysicalMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.25, roughness: 0.05, envMapIntensity: 1.6 })
  );
  glass.position.set(-W / 2 + 1.75, 1.17, -0.6);
  bar.add(glass);
  hotspots.add(glass, {
    hint: 'E — 一杯没人碰过的酒',
    onActivate: () => {
      audio.sfx('chime', 0.5);
      ui.caption('冰早就化了。', 2800);
    }
  });

  // 三头啤酒塔（拉一下手柄）
  const taps = beerTaps({ n: 3, mats: M });
  taps.position.set(-W / 2 + 1.7, 1.12, 2.4);
  taps.rotation.y = Math.PI / 2;
  bar.add(taps);
  const tapState = { pull: 0 };
  updaters.push((dt) => {
    if (tapState.pull > 0) {
      tapState.pull -= dt;
      taps.userData.handles[1].rotation.x = -0.3 - Math.min(1, tapState.pull) * 0.7;
    }
  });
  hotspots.add(taps.userData.handles[1].children[0], {
    hint: 'E — 拉一下酒头',
    onActivate: () => {
      tapState.pull = 1.4;
      audio.sfx('sip', 0.8);
      ui.caption('龙头是干的。', 2800);
    }
  });

  // 收银机（摇柄 → 抽屉弹开）
  const register = cashRegister({ mats: M });
  register.position.set(-W / 2 + 1.7, 1.12, -1.9);
  register.rotation.y = Math.PI / 2 - 0.2;
  bar.add(register);
  const regState = { crank: 0, open: 0, target: 0 };
  updaters.push((dt) => {
    if (regState.crank > 0) {
      regState.crank -= dt;
      register.userData.crank.rotation.x -= dt * 9;
    }
    regState.open += (regState.target - regState.open) * Math.min(1, dt * 8);
    register.userData.drawer.position.z = 0.02 + regState.open * 0.2;
    register.userData.flagMat.emissiveIntensity = 0.3 + regState.open * 0.8;
  });
  hotspots.add(register.userData.body, {
    hint: 'E — 摇动收银机',
    onActivate: () => {
      regState.crank = 0.8;
      audio.sfx('type', 0.7);
      setTimeout(() => {
        regState.target = regState.target > 0.5 ? 0 : 1;
        audio.sfx('typebell', 0.8);
      }, 500);
    }
  });
  group.add(bar);

  // 点唱机（西南角；开机 → 氖弧点亮 + 深夜爵士）
  const juke = jukebox({ mats: M });
  juke.position.set(-W / 2 + 1.3, 0, 5.4);
  juke.rotation.y = Math.PI / 2 - 0.25;
  group.add(juke);
  const jukeState = { on: false };
  hotspots.add(juke.userData.win, {
    hint: 'E — 点唱机',
    onActivate: () => {
      jukeState.on = !jukeState.on;
      juke.userData.setOn(jukeState.on);
      audio.sfx(jukeState.on ? 'chime' : 'thud', 0.6);
      narration.jazz.setEnabled(jukeState.on);
      narration.speakItem('bluevelvet-jukebox');
      if (jukeState.on) {
        ui.caption('隔壁房间的乐队醒了。', 3600);
        curtainShudder.t = 0;
        curtainShudder.e = Math.max(curtainShudder.e, 0.4); // 后幕轻轻应一下
      }
    }
  });
  // 连锁：乐队醒着时，台口脚灯洗亮、聚光缓慢呼吸——整个舞台在等一个歌手；
  // 吧台吊灯同时收暗（歌厅暗场规矩），停机全部复原
  // v1.4 阶段 4：脚灯三档情绪拨盘（暖场 / 蓝场 / 熄灯）叠乘在乐队连锁上
  const FOOT_MODES = [
    { color: new THREE.Color(0xffc48a), glow: 1.0, cap: null },
    { color: new THREE.Color(0x7a9aff), glow: 0.9, cap: '台口换成了蓝场。这里的规矩。' },
    { color: new THREE.Color(0xffc48a), glow: 0.06, cap: '脚灯熄了。舞台在黑里等。' }
  ];
  const footMode = { idx: 0 };
  updaters.push((dt, t) => {
    const k = Math.min(1, dt * 1.6);
    const mode = FOOT_MODES[footMode.idx];
    footWash.intensity += ((jukeState.on ? 7 : 3) * mode.glow - footWash.intensity) * k;
    footLights.material.emissiveIntensity +=
      ((jukeState.on ? 3.8 : 2.4) * mode.glow - footLights.material.emissiveIntensity) * k;
    footWash.color.lerp(mode.color, k);
    footLights.material.emissive.lerp(mode.color, k);
    const breathe = jukeState.on ? 1 + Math.sin(t * 0.9) * 0.16 : 1;
    spot.intensity += ((jukeState.on ? 82 : 60) * breathe - spot.intensity) * k;
    for (const pl of pendantLights) pl.intensity += ((jukeState.on ? 1.0 : 2.6) - pl.intensity) * k;
    pendantBulbMat.emissiveIntensity += ((jukeState.on ? 1.0 : 2.6) - pendantBulbMat.emissiveIntensity) * k;
    for (const c of pendantCones) c.material.opacity += ((jukeState.on ? 0.028 : 0.05) - c.material.opacity) * k;
  });
  // 拨盘面板：舞台前脸右端的黄铜小面板 + 旋钮（E → 循环三档，后幕轻应一下）
  const footPlate = new THREE.Group();
  const fpBack = roundedBoxMesh(0.16, 0.22, 0.03, 0.01, brassMat);
  const fpKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.042, 0.035, 12),
    new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.4, metalness: 0.6 })
  );
  fpKnob.rotation.x = Math.PI / 2;
  fpKnob.position.z = 0.03;
  const fpTick = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xf2e9dc, emissive: 0xf2e9dc, emissiveIntensity: 0.4 }));
  fpTick.position.set(0, 0.024, 0.048);
  fpKnob.add(fpTick);
  footPlate.add(fpBack, fpKnob);
  footPlate.position.set(4.02, 0.32, -D / 2 + 4.11);
  group.add(footPlate);
  updaters.push((dt) => {
    const target = -footMode.idx * (Math.PI * 2 / 3);
    fpKnob.rotation.y += (target - fpKnob.rotation.y) * Math.min(1, dt * 9);
  });
  hotspots.add(fpBack, {
    hint: 'E — 脚灯拨盘',
    onActivate: () => {
      footMode.idx = (footMode.idx + 1) % FOOT_MODES.length;
      audio.sfxAt('switch', 4.0, -D / 2 + 4.1, 0.6, 3);
      curtainShudder.t = 0;
      curtainShudder.e = Math.max(curtainShudder.e, 0.25);
      const cap = FOOT_MODES[footMode.idx].cap;
      if (cap) ui.caption(cap, 3400);
    }
  });

  // ---------- 香槟冰桶（包厢旁；v1.4 阶段 4） ----------
  // 三腿黄铜架 + 车削银桶卷唇 + 深绿瓶斜倚：E → 桶身一晃、瓶子磕了一下桶壁
  const bucketGrp = new THREE.Group();
  const legGeos2 = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    legGeos2.push(xform(new THREE.CylinderGeometry(0.014, 0.017, 0.78, 8),
      Math.cos(a) * 0.19, 0.38, Math.sin(a) * 0.19, Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22));
  }
  legGeos2.push(xform(new THREE.TorusGeometry(0.21, 0.013, 8, 20), 0, 0.72, 0, Math.PI / 2, 0, 0));
  legGeos2.push(xform(new THREE.TorusGeometry(0.24, 0.011, 8, 20), 0, 0.3, 0, Math.PI / 2, 0, 0));
  bucketGrp.add(mergedMesh(legGeos2, brassMat));
  const bucketSway = new THREE.Group();
  const bucket = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.09, 0), new THREE.Vector2(0.14, 0.05), new THREE.Vector2(0.185, 0.2),
      new THREE.Vector2(0.2, 0.3), new THREE.Vector2(0.215, 0.315), new THREE.Vector2(0.2, 0.325),
      new THREE.Vector2(0.19, 0.31)
    ], 20),
    new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(128, 128, 40), color: 0xb9bec6,
      roughness: 0.24, metalness: 0.95, envMapIntensity: 1.5
    })
  );
  const bottle = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.055, 0), new THREE.Vector2(0.058, 0.2), new THREE.Vector2(0.05, 0.26),
      new THREE.Vector2(0.02, 0.32), new THREE.Vector2(0.017, 0.42), new THREE.Vector2(0.023, 0.44),
      new THREE.Vector2(0.001, 0.445)
    ], 14),
    new THREE.MeshPhysicalMaterial({
      color: 0x0d2416, roughness: 0.12, metalness: 0.05,
      clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 1.4
    })
  );
  bottle.position.set(0.05, 0.16, 0);
  bottle.rotation.z = -0.42;
  bucketSway.add(bucket, bottle);
  bucketSway.position.y = 0.42;
  bucketGrp.add(bucketSway);
  bucketGrp.position.set(6.85, 0, 3.75);
  group.add(bucketGrp);
  const bucketState = { t: -1 };
  updaters.push((dt) => {
    if (bucketState.t < 0) return;
    bucketState.t += dt;
    const decay = Math.max(0, 1 - bucketState.t * 0.7);
    if (decay <= 0) { bucketState.t = -1; bucketSway.rotation.z = 0; bottle.rotation.z = -0.42; return; }
    bucketSway.rotation.z = Math.sin(bucketState.t * 13) * 0.05 * decay;
    bottle.rotation.z = -0.42 + Math.sin(bucketState.t * 9 + 0.8) * 0.1 * decay;
  });
  hotspots.add(bucket, {
    hint: 'E — 香槟冰桶',
    onActivate: () => {
      if (bucketState.t < 0) bucketState.t = 0;
      audio.sfxAt('iceclink', 6.85, 3.75, 0.6, 3);
      ui.caption('冰早就化了。酒还在等人。', 3400);
    }
  });

  // 引语展签（本厅唯一文字展签）
  const q1 = quotePlaque(quoteById('home'), '#4f74ff');
  q1.position.set(-6.4, 0, 4.6);
  q1.rotation.y = 1.15;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  // ---------- 展柜（天鹅绒样本） ----------
  const swatchCase = vitrine('天鹅绒样本', 'TEXTURE STUDY', '#4f74ff');
  swatchCase.position.set(6.8, 0, -1.6);
  swatchCase.rotation.y = -0.9;
  group.add(swatchCase);
  const swatch = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5, 24, 4), velvetMaterial(0x101c40));
  const sp = swatch.geometry.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    sp.setZ(i, Math.sin(sp.getX(i) * 26) * 0.03);
  }
  swatch.geometry.computeVertexNormals();
  swatch.position.y = 0.12;
  swatch.rotation.x = -0.3;
  swatchCase.userData.slot.add(swatch);
  hotspots.add(swatchCase.userData.label, {
    hint: 'E — 布料的两面',
    onActivate: () => {
      audio.sfx('chime');
      ui.caption('绒面向着光，底布向着墙。', 3600);
      narration.speakItem('bluevelvet-curtain');
    }
  });

  // ---------- 彩蛋：衣柜的暗侧 ----------
  const closetMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [26, 18, 12], planks: 2, vertical: true, size: 256 }), roughness: 0.8
  });
  const closet = new THREE.Group();
  // v1.3 艺术三遍：柜体分件——顶檐/底座/双门中缝/下门芯板/黄铜旋钮，不再是一只圆角箱
  const closetBody = roundedBoxMesh(1.3, 2.3, 0.7, 0.04, closetMat);
  closetBody.position.y = 1.21;
  const closetTrimGeos = [
    xform(roundedBoxGeo(1.42, 0.1, 0.8, 0.025, 2), 0, 2.41, 0),   // 顶檐
    xform(roundedBoxGeo(1.38, 0.13, 0.76, 0.025, 2), 0, 0.065, 0) // 底座线脚
  ];
  closet.add(mergedMesh(closetTrimGeos, closetMat));
  // 双门中缝 + 下半门芯板（凹入的暗色板）
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x140d08, roughness: 0.85 });
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.016, 2.14, 0.02), seamMat);
  seam.position.set(0, 1.21, 0.355);
  const panelGeos = [
    xform(new THREE.BoxGeometry(0.46, 0.5, 0.018), -0.3, 0.42, 0.358),
    xform(new THREE.BoxGeometry(0.46, 0.5, 0.018), 0.3, 0.42, 0.358)
  ];
  closet.add(seam, mergedMesh(panelGeos, new THREE.MeshStandardMaterial({
    color: 0x1c130c, roughness: 0.75
  })));
  const knobGeo = new THREE.SphereGeometry(0.024, 10, 8);
  closet.add(mergedMesh([
    xform(knobGeo, -0.07, 1.18, 0.375),
    xform(knobGeo, 0.07, 1.18, 0.375)
  ], M.brass));
  knobGeo.dispose();
  const slats = [];
  for (let i = 0; i < 8; i++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(0.94, 0.09, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.7, emissive: 0xd4243c, emissiveIntensity: 0 })
    );
    slat.position.set(0, 0.75 + i * 0.17, 0.36);
    slat.rotation.x = 0.5;
    closet.add(slat);
    slats.push(slat);
  }
  closet.add(closetBody);
  closet.position.set(6.9, 0, 5.0);
  closet.rotation.y = Math.PI + 0.35;
  group.add(closet);

  let closetTimers = [];
  const closetEgg = () => {
    for (const id of closetTimers) clearTimeout(id);
    closetTimers = [];
    const prevWarm = dimState.warm;
    dimState.warm = 0.04;
    audio.duck(1.8, 0.03, 2.6);
    audio.sfx('breath', 0.9);
    closetTimers.push(setTimeout(() => {
      for (const s of slats) s.material.emissiveIntensity = 1.4;
      audio.sfx('thud', 0.6);
      ui.caption('有什么东西正在找你。别出声。', 4600);
    }, 1400));
    closetTimers.push(setTimeout(() => {
      for (const s of slats) s.material.emissiveIntensity = 0;
      dimState.warm = prevWarm > 0.5 ? 1 : prevWarm;
      audio.sfx('chime', 0.4);
    }, 6800));
  };
  const closetTrig = zoneTrigger({ x: 7.6, z: 5.6, r: 1.25 }, closetEgg, { cooldown: 45 });
  updaters.push((dt) => closetTrig.update(player, dt));

  // 回大厅
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, D / 2 - 0.55);
  back.rotation.y = Math.PI;
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  // 氛围
  const haze = smokeLayer(60, { x: W, z: D }, { opacity: 0.05, size: 8, yBase: 0.6, ySpread: 2.2, color: 0xaab4d8 });
  group.add(haze);
  updaters.push(haze.userData.update);
  const dust = dustField(140, { x: W, y: H, z: D }, { opacity: 0.35, size: 0.04, color: 0xcfd8ff });
  group.add(dust);
  updaters.push(dust.userData.update);
  group.add(new THREE.AmbientLight(0x10142a, 1.2));

  return {
    group,
    spawn: { x: 0, z: 5.4, yaw: 0 },
    bounds: rectBounds(-W / 2 + 1.2, W / 2 - 1.2, -D / 2 + 3.2, D / 2 - 1.3),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'closet-side': closetTrig }
  };
}
