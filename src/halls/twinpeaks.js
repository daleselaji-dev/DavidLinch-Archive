// ============================================================
// 《双峰》展厅 —— THE DARK PINES 黑松林（v1.2 多分区可逛地图）
//   ① 林间空地：红帷幕之门（回大厅）+ 树桩咖啡 + 石阵彩蛋
//   ② 红房间氛围区：几何折线地板 + 红帷幕围合 + 扶手椅（原创抽象致敬）
//   ③ 小镇夜街：路灯 + 老轿车剪影 + DINER 柜台一角（樱桃派/咖啡壶）
//   ④ 瀑布眺望台：木栈台 + 瀑布 + 锯木厂剪影
// 分区之间由林间小径连接。全部原创程序化，无镜头复刻。
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, curtain, curtainRing, neonSign,
  smokeLayer, dustField, quotePlaque, velvetMaterial,
  zoneTrigger, zonesBounds, pineGeometryMaterial,
  roundedBoxMesh, mergedMesh, xform, railing, rockMesh, armchair,
  groundStrip, gravelTexture, woodTexture, brushedMetalTexture, lightCone,
  chevronMat, asphaltMat, woodMat, waterMat
} from './kit.js';
import {
  propMats, sedanCar, streetLampV2, trafficLight, pieCase,
  counterClutter, ceilingFan, viewScope
} from './props.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'twinpeaks',
  name: 'TWIN PEAKS · 黑松林 (1990)',
  ambience: 'twinpeaks',
  narration: 'twinpeaks',
  look: { saturation: 0.82, tint: 0xdcecdf, fogColor: 0x030805, fogDensity: 0.028, bg: 0x02040a, exposure: 0.95, bloom: 0.8 }
};

// ---------- 可逛分区（union 边界） ----------
const ZONES = [
  { circle: { x: 0, z: 0, r: 9.6 } },                                   // 林间空地
  { rect: { minX: -15, maxX: -5, minZ: -8, maxZ: -3 } },                // 小径→红房间 ①
  { rect: { minX: -19, maxX: -13, minZ: -14, maxZ: -6 } },              // 小径→红房间 ②
  { circle: { x: -20, z: -16, r: 6.0 } },                               // 红房间
  { rect: { minX: 6, maxX: 17, minZ: -7, maxZ: -1 } },                  // 小径→夜街
  { rect: { minX: 16.5, maxX: 27.2, minZ: -17, maxZ: 3 } },             // 小镇夜街
  { rect: { minX: 26.4, maxX: 28.0, minZ: -8.8, maxZ: -7.0 } },         // diner 门洞
  { rect: { minX: 27.6, maxX: 31.6, minZ: -12, maxZ: -3.6 } },          // diner 柜台一角
  { rect: { minX: 5.5, maxX: 9.5, minZ: -23, maxZ: -5 } },              // 小径→瀑布
  { rect: { minX: 5, maxX: 17, minZ: -29, maxZ: -22.5 } },              // 瀑布眺望台
  { rect: { minX: 6.5, maxX: 16, minZ: 6, maxZ: 13 } }                  // 林中岔路（石阵）
];
const insideWalkable = (x, z, margin = 1.6) => {
  for (const zn of ZONES) {
    if (zn.circle) {
      const r = zn.circle.r + margin;
      if ((x - zn.circle.x) ** 2 + (z - zn.circle.z) ** 2 < r * r) return true;
    } else {
      const r = zn.rect;
      if (x > r.minX - margin && x < r.maxX + margin && z > r.minZ - margin && z < r.maxZ + margin) return true;
    }
  }
  return false;
};

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player, teleport } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // ---------- 林地地面 ----------
  const groundTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#0a0f08';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 620; i++) {
      g.fillStyle = `rgba(${8 + Math.random() * 24},${14 + Math.random() * 26},${8 + Math.random() * 16},0.5)`;
      g.beginPath();
      g.arc(Math.random() * s, Math.random() * s, Math.random() * 12, 0, 7);
      g.fill();
    }
    // 针叶落层
    g.strokeStyle = 'rgba(30,40,22,0.5)';
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * s; const y = Math.random() * s; const a = Math.random() * 7;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.stroke();
    }
  }, 8, 8);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(56, 48),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // 林间小径（碎石条带把分区串成可逛地图）
  const pathMat = new THREE.MeshStandardMaterial({ map: gravelTexture(), roughness: 0.92 });
  for (const [x1, z1, x2, z2] of [
    [-5.5, -5.4, -14, -6.8],   // → 红房间
    [-14, -6.8, -18.4, -13],
    [6, -4, 16.5, -4.2],       // → 夜街
    [7.4, -6, 7.4, -22.8],     // → 瀑布
    [7.5, 6.5, 13, 10.5]       // → 石阵岔路
  ]) {
    group.add(groundStrip(x1, z1, x2, z2, 2.6, pathMat));
  }

  // ---------- 星空 + 月亮 ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = Math.random() * Math.PI * 2;
    const el = Math.random() * Math.PI * 0.46 + 0.06;
    const r = 150;
    starPos[i * 3] = Math.cos(a) * Math.cos(el) * r;
    starPos[i * 3 + 1] = Math.sin(el) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xcfe0ff, size: 0.55, transparent: true, opacity: 0.8, fog: false
  }));
  group.add(stars);
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(7, 30),
    new THREE.MeshBasicMaterial({ color: 0xe8ecf5, fog: false, toneMapped: false })
  );
  moon.position.set(-60, 52, -110);
  moon.lookAt(0, 1.7, 0);
  group.add(moon);
  const moonLight = new THREE.DirectionalLight(0x8ea6c9, 0.55);
  moonLight.position.set(-30, 50, -60);
  group.add(moonLight);

  // ---------- 松林（实例化，避开可逛分区） ----------
  const { geo: pineGeo, mat: pineMat } = pineGeometryMaterial();
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x140f0a, roughness: 0.95 });
  const COUNT = 340;
  const pines = new THREE.InstancedMesh(pineGeo, pineMat, COUNT);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, COUNT);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < COUNT && guard++ < 9000) {
    const a = Math.random() * Math.PI * 2;
    const r = 6 + Math.pow(Math.random(), 0.72) * 46;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (insideWalkable(x, z)) continue;
    const s = 0.8 + Math.random() * 2.4;
    dummy.position.set(x, 2.1 * s + 0.9, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    pines.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 0.8;
    dummy.scale.set(s, 1, s);
    dummy.rotation.y = 0;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  pines.count = placed;
  trunks.count = placed;
  group.add(pines, trunks);

  // ============================================================
  // ① 林间空地 —— 红帷幕之门
  // ============================================================
  const M = propMats();
  const gate = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 40),
    chevronMat('#0b0b0d', '#ded7c8', { repeat: 4, seed: 33 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  const gateMat = velvetMaterial(PALETTE.velvet);
  const curtainL = curtain(1.6, 3.6, PALETTE.velvet, 3, gateMat);
  curtainL.position.set(-0.85, 1.8, 0);
  const curtainR = curtain(1.6, 3.6, PALETTE.velvet, 3, gateMat);
  curtainR.position.set(0.85, 1.8, 0);
  const lintelC = curtain(3.6, 0.9, PALETTE.velvet, 6, gateMat);
  lintelC.position.set(0, 3.55, 0);
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 3.4),
    new THREE.MeshStandardMaterial({
      color: 0x050203, emissive: 0xd4243c, emissiveIntensity: 0.5, side: THREE.DoubleSide
    })
  );
  glowPlane.position.set(0, 1.75, -0.06);
  const gateLight = new THREE.PointLight(0xd4243c, 16, 15, 1.7);
  gateLight.position.set(0, 2.2, 1.2);
  gate.add(pad, curtainL, curtainR, lintelC, glowPlane, gateLight);
  gate.position.set(0, 0, -6);
  group.add(gate);
  updaters.push((dt, t) => {
    glowPlane.material.emissiveIntensity = 0.42 + Math.sin(t * 1.3) * 0.18;
    gateLight.intensity = 14 + Math.sin(t * 1.3) * 4;
  });
  hotspots.add(glowPlane, {
    nav: true,
    hint: 'E — 掀开帷幕，回到大厅',
    onActivate: () => goTo('lobby')
  });

  // 帷幕旁的黄铜档案铭牌（本厅唯一的档案入口，事实性文字）
  const brassTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#6b5232';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,240,210,0.9)';
    g.textAlign = 'center';
    g.font = '400 44px Georgia, serif';
    g.fillText('TWIN PEAKS', s / 2, s / 2 - 14);
    g.font = '28px "Courier New", monospace';
    g.fillText('1990 — 2017', s / 2, s / 2 + 36);
  });
  const brassPlate = roundedBoxMesh(0.62, 0.34, 0.03, 0.012,
    new THREE.MeshStandardMaterial({
      map: brassTex, roughness: 0.3, metalness: 0.85,
      emissive: 0xffe6b8, emissiveMap: brassTex, emissiveIntensity: 0.12
    }));
  const brassPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.045, 0.95, 10),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x584124, roughness: 0.4, metalness: 0.9 })
  );
  brassPost.position.set(2.9, 0.47, -4.5);
  brassPlate.position.set(2.9, 1.0, -4.5);
  brassPlate.rotation.set(-0.4, -2.4, 0);
  group.add(brassPost, brassPlate);
  hotspots.add(brassPlate, {
    hint: 'E — 《双峰》剧集档案',
    onActivate: () => ui.showFilm('twin-peaks')
  });

  // 树桩上的热咖啡
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 0.7, 16),
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: [44, 28, 14], planks: 1, size: 128 }), roughness: 0.95 })
  );
  stump.position.set(3.8, 0.35, 3.2);
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.07, 0.14, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.35 })
  );
  cup.position.set(3.8, 0.77, 3.2);
  group.add(stump, cup);
  const cupSteam = smokeLayer(6, { x: 0.1, z: 0.1 }, { opacity: 0.06, size: 0.5, yBase: 0.9, ySpread: 0.5, color: 0xffffff });
  cupSteam.position.set(3.8, 0, 3.2);
  group.add(cupSteam);
  updaters.push(cupSteam.userData.update);
  hotspots.add(cup, {
    hint: 'E — 一杯还冒着热气的咖啡',
    onActivate: () => {
      audio.sfx('sip');
      ui.caption('热咖啡。趁热。', 3200);
    }
  });

  // 本厅唯一引语展签（他自己的话）
  const q1 = quotePlaque(quoteById('darkness'), '#3fae6a');
  q1.position.set(-4.6, 0, 5.2);
  q1.rotation.y = 0.9;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  // 地表雾 + 萤火
  const fogLayer = smokeLayer(120, { x: 70, z: 70 }, { opacity: 0.045, size: 17, yBase: 0.25, ySpread: 1.2, color: 0x8da4ad });
  group.add(fogLayer);
  updaters.push(fogLayer.userData.update);
  const fireflies = dustField(90, { x: 44, y: 3, z: 44 }, { color: 0xbfffa8, size: 0.09, opacity: 0.8 });
  group.add(fireflies);
  const freeze = { on: false };
  updaters.push((dt, t) => { if (!freeze.on) fireflies.userData.update(dt, t); });

  // ============================================================
  // ② 红房间氛围区（几何抽象：折线地板 + 红帷幕 + 扶手椅）
  // ============================================================
  const redRoom = new THREE.Group();
  redRoom.position.set(-20, 0, -16);
  const rrFloor = new THREE.Mesh(
    new THREE.CircleGeometry(6.0, 44),
    chevronMat('#0b0b0d', '#ded7c8', { repeat: 5, seed: 34 })
  );
  rrFloor.rotation.x = -Math.PI / 2;
  rrFloor.position.y = 0.015;
  redRoom.add(rrFloor);
  // 围合帷幕（朝小径方向留缺口）
  const entryA = Math.atan2(8, 6); // 指向小径
  const gapArc = 0.72;
  redRoom.add(curtainRing(5.7, 5.2, PALETTE.velvet, 16, Math.PI * 2 - gapArc, entryA + gapArc / 2));
  // 两把相对而坐的扶手椅
  const chairA = armchair(0x2a0e16);
  chairA.position.set(-1.5, 0, 0.6);
  chairA.rotation.y = Math.PI / 2 + 0.25;
  const chairB = armchair(0x120c16);
  chairB.position.set(1.6, 0, -0.5);
  chairB.rotation.y = -Math.PI / 2 - 0.2;
  redRoom.add(chairA, chairB);
  // 落地灯（可开关 —— 房间的两副面孔）
  const rrLampPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.14, 1.7, 12),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x6b5232, roughness: 0.35, metalness: 0.9 })
  );
  rrLampPole.position.set(0.2, 0.85, -2.2);
  const rrShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 0.32, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xd8ccb2, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffe2b0, emissiveIntensity: 0.7 })
  );
  rrShade.position.set(0.2, 1.78, -2.2);
  const rrLampLight = new THREE.PointLight(0xffd9a8, 7, 10, 1.7);
  rrLampLight.position.set(0.2, 1.7, -2.2);
  const rrRedWash = new THREE.PointLight(0xd4243c, 9, 13, 1.6);
  rrRedWash.position.set(0, 3.6, 0);
  redRoom.add(rrLampPole, rrShade, rrLampLight, rrRedWash);
  const rrState = { warm: 1 };
  updaters.push((dt, t) => {
    const f = 1 + Math.sin(t * 6.2) * 0.05;
    rrLampLight.intensity = 7 * f * rrState.warm;
    rrShade.material.emissiveIntensity = 0.7 * Math.max(rrState.warm, 0.04);
    rrRedWash.intensity = rrState.warm > 0.5 ? 9 : 20 + Math.sin(t * 2.1) * 5;
  });
  hotspots.add(rrShade, {
    hint: 'E — 落地灯（这间房有两副面孔）',
    onActivate: () => {
      rrState.warm = rrState.warm ? 0 : 1;
      audio.sfx(rrState.warm ? 'lampon' : 'lampoff');
    }
  });
  group.add(redRoom);

  // ============================================================
  // ③ 小镇夜街 + DINER 柜台一角
  // ============================================================
  const town = new THREE.Group();
  // 沥青街道（v1.3 三通道：雨后微湿 —— 车辙低粗糙度反光 + 骨料法线）
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 20),
    asphaltMat({ seed: 17, repX: 1, repY: 6, wet: 0.75 })
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(21.5, 0.015, -7);
  town.add(street);
  // 人行道
  const sidewalk = roundedBoxMesh(2.2, 0.12, 20, 0.03,
    new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.85 }));
  sidewalk.position.set(26.2, 0.06, -7);
  town.add(sidewalk);

  // 路灯 v2 ×2（凹槽柱 + 曲臂 + 泪滴灯头）
  const townLamps = [];
  for (const [x, z] of [[18.5, -1], [18.5, -12]]) {
    const lamp = streetLampV2({ mats: M });
    lamp.position.set(x, 0, z);
    town.add(lamp);
    const cone = lightCone(0.3, 2.1, 4.2, 0xffd9a8, 0.05);
    cone.position.set(x + lamp.userData.headX, 2.15, z);
    town.add(cone);
    townLamps.push({ bulbMat: lamp.userData.bulbMat, light: lamp.userData.light });
  }
  updaters.push((dt, t) => {
    for (const [i, L] of townLamps.entries()) {
      const f = Math.sin(t * 14 + i * 5) > 0.94 ? 0.3 : 1;
      L.light.intensity = 8 * f;
      L.bulbMat.emissiveIntensity = 3 * f;
    }
  });

  // 悬挂信号灯（吊索横跨街道；夜间闪黄模式，可用 E 换灯）
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 8.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 })
  );
  cable.rotation.z = Math.PI / 2;
  cable.position.set(21.9, 5.0, -4.2);
  town.add(cable);
  const signal = trafficLight({ mats: M });
  signal.position.set(21.5, 4.55, -4.2);
  signal.rotation.y = Math.PI / 2;
  town.add(signal);
  const sigState = { blink: true, t: 0, phase: 1 };
  updaters.push((dt) => {
    if (!sigState.blink) return;
    sigState.t += dt;
    // 深夜闪黄：亮 0.7s / 灭 0.7s
    const on = Math.floor(sigState.t / 0.7) % 2 === 0;
    signal.userData.lampMats.forEach((m, k) => {
      m.emissiveIntensity = k === 1 && on ? 2.2 : 0.12;
    });
    signal.userData.light.color.set(signal.userData.lampCols[1]);
    signal.userData.light.intensity = on ? 3 : 0.2;
  });
  hotspots.add(signal.userData.box, {
    hint: 'E — 信号灯',
    onActivate: () => {
      sigState.blink = false;
      sigState.phase = (sigState.phase + 1) % 3;
      signal.userData.setPhase(sigState.phase);
      signal.userData.light.intensity = 3;
      audio.sfxAt('switch', 21.5, -4.2, 0.8, 4);
      setTimeout(() => { sigState.blink = true; sigState.t = 0; }, 6000);
    }
  });

  // 40 年代轿车 v2（翼子板/镀铬格栅/白圈胎；车头灯可点亮）
  const car = sedanCar({ color: 0x11161c, mats: M });
  car.position.set(20.2, 0, -13.5);
  car.rotation.y = Math.PI / 2 + 0.06;
  town.add(car);
  const carState = { on: false };
  hotspots.add(car.userData.heads, {
    hint: 'E — 车头灯',
    onActivate: () => {
      carState.on = !carState.on;
      car.userData.setLights(carState.on);
      audio.sfx(carState.on ? 'click' : 'thud', 0.6);
      if (carState.on) ui.caption('灯光洗过湿路。', 3200);
    }
  });

  // DINER 外立面
  const facadeMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, (g, s) => {
      g.fillStyle = '#1b1410';
      g.fillRect(0, 0, s, s);
      const bh = s / 10;
      for (let r = 0; r < 10; r++) {
        for (let c = -1; c < 6; c++) {
          const off = r % 2 ? s / 12 : 0;
          g.fillStyle = `rgb(${34 + Math.random() * 12},${24 + Math.random() * 8},${16 + Math.random() * 8})`;
          g.fillRect(c * (s / 6) + off + 1, r * bh + 1, s / 6 - 2, bh - 2);
        }
      }
    }, 4, 2),
    roughness: 0.88
  });
  // 立面墙（门洞两侧 + 楣）
  const facade = new THREE.Group();
  const fw1 = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.6), facadeMat);
  fw1.position.set(27.3, 2.3, -11.9);
  fw1.rotation.y = -Math.PI / 2;
  const fw2 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), facadeMat);
  fw2.position.set(27.3, 2.3, -4.4);
  fw2.rotation.y = -Math.PI / 2;
  const fwTop = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), facadeMat);
  fwTop.position.set(27.3, 3.7, -7.9);
  fwTop.rotation.y = -Math.PI / 2;
  facade.add(fw1, fw2, fwTop);
  // 大玻璃窗（暖光溢出）
  const windowGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x0c0a06, emissive: 0xffca7a, emissiveIntensity: 0.9 })
  );
  windowGlow.position.set(27.24, 2.0, -10.6);
  windowGlow.rotation.y = -Math.PI / 2;
  facade.add(windowGlow);
  const windowLight = new THREE.PointLight(0xffca7a, 6, 9, 1.8);
  windowLight.position.set(26.4, 2.0, -10.6);
  facade.add(windowLight);
  const dinerSign = neonSign('DINER', { color: '#ff2e88', size: 0.72 });
  dinerSign.position.set(27.0, 5.2, -7.9);
  dinerSign.rotation.y = -Math.PI / 2;
  facade.add(dinerSign);
  updaters.push((dt, t) => dinerSign.userData.flicker(t, 4.4));
  town.add(facade);

  // diner 内部：柜台一角
  const dinerInner = new THREE.Group();
  const dFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 9),
    chevronMat('#101013', '#cfc7b8', { repeat: 3, seed: 35 })
  );
  dFloor.rotation.x = -Math.PI / 2;
  dFloor.position.set(29.6, 0.02, -7.8);
  dinerInner.add(dFloor);
  // 内墙
  const dWallMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [40, 26, 13], planks: 5, vertical: true, size: 256 }), roughness: 0.75
  });
  const dw1 = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), dWallMat);
  dw1.position.set(31.6, 1.8, -7.8);
  dw1.rotation.y = -Math.PI / 2;
  const dw2 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), dWallMat);
  dw2.position.set(29.6, 1.8, -12.2);
  const dw3 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), dWallMat);
  dw3.position.set(29.6, 1.8, -3.4);
  dw3.rotation.y = Math.PI;
  const dCeil = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 9), new THREE.MeshStandardMaterial({ color: 0x171310, roughness: 0.95 }));
  dCeil.rotation.x = Math.PI / 2;
  dCeil.position.set(29.6, 3.6, -7.8);
  dinerInner.add(dw1, dw2, dw3, dCeil);
  // 柜台（高蜡面木台 + 金属包边踢脚）
  const counterTop = roundedBoxMesh(1.1, 0.1, 6.4, 0.04,
    woodMat({ base: [58, 34, 16], planks: 2, size: 256, seed: 36, gloss: 0.85, env: 1.0 }));
  counterTop.position.set(30.7, 1.06, -7.8);
  const counterBody = roundedBoxMesh(0.95, 1.0, 6.3, 0.04,
    new THREE.MeshStandardMaterial({ color: 0x321820, roughness: 0.55 }));
  counterBody.position.set(30.72, 0.5, -7.8);
  const counterKick = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 6.3),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x9a9a9a, roughness: 0.25, metalness: 0.95 })
  );
  counterKick.position.set(30.22, 0.09, -7.8);
  dinerInner.add(counterTop, counterBody, counterKick);
  // 吧凳 ×3（红皮面 + 铬柱，合并成 2 个 mesh）
  const seatGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 20);
  const seatRimGeo = new THREE.TorusGeometry(0.26, 0.05, 10, 22);
  const seatGeos = [];
  const poleGeos = [];
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.72, 12);
  const footGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.05, 14);
  for (const z of [-10.0, -7.8, -5.6]) {
    seatGeos.push(xform(seatGeo, 29.7, 0.82, z));
    seatGeos.push(xform(seatRimGeo, 29.7, 0.78, z, Math.PI / 2, 0, 0));
    poleGeos.push(xform(poleGeo, 29.7, 0.4, z));
    poleGeos.push(xform(footGeo, 29.7, 0.03, z));
  }
  seatGeo.dispose(); seatRimGeo.dispose(); poleGeo.dispose(); footGeo.dispose();
  dinerInner.add(mergedMesh(seatGeos, new THREE.MeshPhysicalMaterial({
    color: 0x8f0e1e, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color(0xff8090), clearcoat: 0.5, clearcoatRoughness: 0.4
  })));
  dinerInner.add(mergedMesh(poleGeos, new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0xa8a8a8, roughness: 0.2, metalness: 0.95, envMapIntensity: 1.4
  })));
  // 樱桃派（玻璃罩 + 瓷盘）
  const pieGroup = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.03, 22),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.3 }));
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.09, 20),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(128, (g, s) => {
        g.fillStyle = '#8a4a1c';
        g.fillRect(0, 0, s, s);
        g.strokeStyle = '#5c2c10';
        g.lineWidth = 5;
        for (let i = 0; i < 5; i++) {
          g.beginPath(); g.moveTo((i / 5) * s + 12, 0); g.lineTo((i / 5) * s + 12, s); g.stroke();
          g.beginPath(); g.moveTo(0, (i / 5) * s + 12); g.lineTo(s, (i / 5) * s + 12); g.stroke();
        }
      }),
      roughness: 0.7
    }));
  pie.position.y = 0.06;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.14, roughness: 0.05, envMapIntensity: 1.6, depthWrite: false }));
  dome.position.y = 0.02;
  pieGroup.add(plate, pie, dome);
  pieGroup.position.set(30.7, 1.12, -9.2);
  dinerInner.add(pieGroup);
  hotspots.add(dome, {
    hint: 'E — 玻璃罩下的樱桃派',
    onActivate: () => {
      audio.sfx('chime', 0.6);
      ui.caption('今天的派还没卖完。', 3200);
    }
  });
  // 咖啡壶（保温座 + 玻璃壶）
  const potBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 14),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x777777, roughness: 0.3, metalness: 0.9 }));
  potBase.position.set(30.7, 1.13, -6.4);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshPhysicalMaterial({ color: 0x2a1408, transparent: true, opacity: 0.7, roughness: 0.1, envMapIntensity: 1.4 }));
  pot.position.set(30.7, 1.16, -6.4);
  dinerInner.add(potBase, pot);
  hotspots.add(pot, {
    hint: 'E — 咖啡壶（续杯不要钱）',
    onActivate: () => {
      audio.sfx('sip');
      ui.caption('续了一杯。', 2600);
    }
  });
  // 旋转派柜（三层瓷盘；E → 转架）
  const pcase = pieCase({ mats: M });
  pcase.position.set(30.7, 1.12, -10.4);
  dinerInner.add(pcase);
  const pcaseState = { spin: 0 };
  updaters.push((dt) => {
    pcase.userData.rack.rotation.y += dt * (0.15 + Math.max(0, Math.min(pcaseState.spin, 1)) * 2.4);
    if (pcaseState.spin > 0) pcaseState.spin -= dt;
  });
  hotspots.add(pcase.userData.glass, {
    hint: 'E — 转一转派柜',
    onActivate: () => {
      pcaseState.spin = 2.2;
      audio.sfx('chime', 0.5);
    }
  });

  // 柜台杂物组（纸巾盒/番茄酱/糖罐/菜单牌）
  const clutter = counterClutter({ mats: M });
  clutter.position.set(30.7, 1.11, -8.4);
  clutter.rotation.y = -Math.PI / 2;
  dinerInner.add(clutter);

  // 吊扇（拉链开关 → 转/停）
  const fan = ceilingFan({ mats: M });
  fan.position.set(29.6, 3.6, -7.8);
  dinerInner.add(fan);
  const fanState = { speed: 1 };
  updaters.push((dt) => {
    fan.userData.bladeHub.rotation.y += dt * fanState.speed * 3.4;
  });
  hotspots.add(fan.userData.pull, {
    hint: 'E — 吊扇拉链',
    onActivate: () => {
      fanState.speed = fanState.speed > 0.5 ? 0.05 : 1;
      audio.sfx('click', 0.7);
    }
  });

  // 吊灯 ×2
  for (const z of [-9.5, -6.1]) {
    const dl = new THREE.PointLight(0xffca7a, 4.5, 6, 1.8);
    dl.position.set(30.2, 3.2, z);
    dinerInner.add(dl);
  }
  town.add(dinerInner);
  group.add(town);

  // ============================================================
  // ④ 瀑布眺望台
  // ============================================================
  const overlook = new THREE.Group();
  // 木栈台
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.16, 6.5),
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: [40, 26, 13], planks: 10 }), roughness: 0.8 })
  );
  deck.position.set(11, 0.08, -25.7);
  overlook.add(deck);
  const rail1 = railing(12, { height: 1.05 });
  rail1.position.set(11, 0.16, -28.8);
  const rail2 = railing(6.3, { height: 1.05 });
  rail2.position.set(4.9, 0.16, -25.7);
  rail2.rotation.y = Math.PI / 2;
  const rail3 = railing(6.3, { height: 1.05 });
  rail3.position.set(17.1, 0.16, -25.7);
  rail3.rotation.y = Math.PI / 2;
  overlook.add(rail1, rail2, rail3);
  // 峡谷崖壁剪影
  for (const [x, z, s] of [[2, -40, 7], [22, -42, 8], [12, -48, 10]]) {
    const cliff = rockMesh(s, 0x0a0e14);
    cliff.position.set(x, s * 0.35, z);
    overlook.add(cliff);
  }
  // 瀑布（滚动水纹）
  const fallsTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0c141c';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 130; i++) {
      const x = Math.random() * s;
      const w = 1 + Math.random() * 3;
      const a = 0.14 + Math.random() * 0.4;
      g.fillStyle = `rgba(214,232,246,${a})`;
      g.fillRect(x, 0, w, s);
    }
  }, 1, 2);
  const falls = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 15),
    new THREE.MeshBasicMaterial({ map: fallsTex, transparent: true, opacity: 0.85, toneMapped: false })
  );
  falls.position.set(12, 6.5, -41.5);
  overlook.add(falls);
  updaters.push((dt) => { fallsTex.offset.y -= dt * 0.32; });
  // 瀑底水潭（v1.3 静水：微波纹法线缓慢流动）+ 水雾
  const plungeMat = waterMat(0x04121c, { seed: 31, repX: 3, repY: 3 });
  const plunge = new THREE.Mesh(new THREE.CircleGeometry(6, 26), plungeMat);
  plunge.rotation.x = -Math.PI / 2;
  plunge.position.set(12, 0.01, -38.5);
  overlook.add(plunge);
  updaters.push(plungeMat.userData.update);

  // 投币观景镜（可转动镜头对准瀑布/锯木厂）
  const scope = viewScope({ mats: M });
  scope.position.set(11, 0.16, -27.6);
  overlook.add(scope);
  const scopeState = { target: 0, yaw: 0.2 };
  const SCOPE_YAWS = [0.2, -0.55];
  updaters.push((dt) => {
    scopeState.yaw += (SCOPE_YAWS[scopeState.target] - scopeState.yaw) * Math.min(1, dt * 3);
    scope.userData.head.rotation.y = scopeState.yaw;
  });
  hotspots.add(scope.userData.scope, {
    hint: 'E — 转动观景镜',
    onActivate: () => {
      scopeState.target = (scopeState.target + 1) % 2;
      audio.sfx('creak', 0.55);
      ui.caption(scopeState.target === 0 ? '瀑布不停。' : '锯木厂睡着了。', 3000);
    }
  });
  const mist = smokeLayer(36, { x: 9, z: 5 }, { opacity: 0.08, size: 6, yBase: 0.5, ySpread: 3.5, color: 0xc8dce8 });
  mist.position.set(12, 0, -39);
  overlook.add(mist);
  updaters.push(mist.userData.update);
  // 锯木厂剪影（烟囱 + 缓慢的烟）
  const millMat = new THREE.MeshBasicMaterial({ color: 0x05070c, fog: false });
  const mill = mergedMesh([
    xform(new THREE.BoxGeometry(10, 5, 6), 0, 2.5, 0),
    xform(new THREE.BoxGeometry(5, 3, 6.2), -5.5, 1.5, 0),
    xform(new THREE.CylinderGeometry(0.5, 0.7, 7, 10), 2.5, 6, 1)
  ], millMat);
  mill.position.set(30, 0, -38);
  overlook.add(mill);
  const millSmoke = smokeLayer(16, { x: 2, z: 2 }, { opacity: 0.05, size: 5, yBase: 9.5, ySpread: 4, color: 0x8a8f96 });
  millSmoke.position.set(32.5, 0, -37);
  overlook.add(millSmoke);
  updaters.push(millSmoke.userData.update);
  group.add(overlook);

  // ============================================================
  // 彩蛋：环形石阵（空间错位）
  // ============================================================
  const grove = new THREE.Group();
  const stoneGeos = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const h = 0.8 + Math.random() * 0.7;
    stoneGeos.push(xform(
      new THREE.BoxGeometry(0.4, h, 0.32),
      Math.cos(a) * 2.4, h / 2, Math.sin(a) * 2.4,
      (Math.random() - 0.5) * 0.16, a + Math.random() * 0.5, 0
    ));
  }
  grove.add(mergedMesh(stoneGeos, new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.9 })));
  const poolMat = waterMat(0x02030a, { seed: 32, repX: 1.5, repY: 1.5, env: 1.8 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.015;
  grove.add(pool);
  updaters.push(poolMat.userData.update);
  grove.position.set(14, 0, 10.5);
  group.add(grove);

  const groveEgg = () => {
    freeze.on = true;           // 萤火凝固
    audio.duck(2.2, 0.02, 3.0); // 风声被抽走
    audio.sfx('stonechime', 0.9);
    later(() => {
      glowPlane.material.emissiveIntensity = 2.6; // 远处的帷幕之门骤亮
      gateLight.intensity = 60;
    }, 900);
    later(() => ui.fade(true), 1700);
    later(() => {
      teleport(0, -3.4, 0); // 直接站在帷幕之门前
      ui.fade(false);
      freeze.on = false;
      glowPlane.material.emissiveIntensity = 0.5;
      gateLight.intensity = 16;
      audio.sfx('owl', 0.8);
      ui.caption('你没有走向帷幕。是帷幕走向了你。', 5200);
    }, 2400);
  };
  const groveTrig = zoneTrigger({ x: 14, z: 10.5, r: 2.1 }, groveEgg, { cooldown: 60 });
  updaters.push((dt) => groveTrig.update(player, dt));

  // 掠过夜空的猫头鹰剪影
  const owls = [];
  for (let i = 0; i < 2; i++) {
    const owl = new THREE.Group();
    const bodyM = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bodyM);
    body.scale.set(1, 0.55, 1.7);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 0.7), bodyM);
    wingL.position.x = -1.2;
    const wingR = wingL.clone();
    wingR.position.x = 1.2;
    owl.add(body, wingL, wingR);
    group.add(owl);
    owls.push({ owl, wingL, wingR, phase: i * 3.1, r: 26 + i * 9, h: 17 + i * 6, speed: 0.09 + i * 0.03 });
  }
  updaters.push((dt, t) => {
    for (const o of owls) {
      const a = t * o.speed + o.phase;
      o.owl.position.set(Math.cos(a) * o.r, o.h + Math.sin(t * 0.5 + o.phase) * 1.6, Math.sin(a) * o.r);
      o.owl.rotation.y = -a - Math.PI / 2;
      o.wingL.rotation.z = Math.sin(t * 5 + o.phase) * 0.5;
      o.wingR.rotation.z = -Math.sin(t * 5 + o.phase) * 0.5;
    }
  });

  group.add(new THREE.AmbientLight(0x18222a, 0.9));

  return {
    group,
    spawn: { x: 0, z: 7.5, yaw: 0 },
    bounds: zonesBounds(ZONES),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'stone-circle': groveTrig },
    onLeave: () => { for (const id of timers) clearTimeout(id); }
  };
}
