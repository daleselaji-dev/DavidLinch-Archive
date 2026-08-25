// ============================================================
// props — v1.3 精修道具预制体库。
// 原则（PRODUCTION_PLAN §3）：
//   · 每件关键道具 ≥4 个有命名意义的部件层级；
//   · 旋转体一律车削（LatheGeometry）；曲臂用 TubeGeometry 走贝塞尔；
//   · 静态同材质部件合并单 mesh，动态/可交互部件独立；
//   · 通过 userData 暴露交互挂点（setOn / drawer / wheel / …）。
// 所有几何与贴图均程序化生成，无外部素材。
// ============================================================
import * as THREE from 'three';
import {
  roundedBoxGeo, roundedBoxMesh, mergedMesh, xform, canvasTexture,
  woodMat, brassMat, chromeMat, ironMat, leatherMat, rng
} from './kit.js';

/** 每厅一次性创建的共享材质组（切厅时随 group 一并 dispose） */
export function propMats() {
  return {
    brass: brassMat(),
    chrome: chromeMat(),
    iron: ironMat(),
    darkWood: woodMat({ base: [30, 18, 12], planks: 2, size: 256, seed: 41, gloss: 0.6 }),
    warmWood: woodMat({ base: [52, 32, 16], planks: 2, size: 256, seed: 42, gloss: 0.55 })
  };
}

/** 车削剖面辅助：[[r, y], ...] → LatheGeometry */
function lathe(profile, segments = 24) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** 曲管辅助：三点二次贝塞尔 → TubeGeometry */
function bentTube(p0, p1, p2, radius, seg = 20) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...p0), new THREE.Vector3(...p1), new THREE.Vector3(...p2)
  );
  return new THREE.TubeGeometry(curve, seg, radius, 8, false);
}

// ============================================================
// 大厅 —— 黄铜多臂吊灯
// 部件：吊链 / 中轴（车削）/ 六曲臂（贝塞尔管）/ 烛杯 / 灯泡 / 垂坠
// ============================================================
export function chandelier({ arms = 6, radius = 1.15, mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  // 中轴：花瓶式车削
  const columnGeo = lathe([
    [0.02, 0], [0.11, 0.04], [0.05, 0.14], [0.16, 0.3], [0.13, 0.46],
    [0.05, 0.6], [0.1, 0.74], [0.04, 0.88], [0.07, 1.0], [0.02, 1.1]
  ], 22);
  // 吊链环（交替扭转的小圆环合并）
  const chainGeos = [];
  const linkGeo = new THREE.TorusGeometry(0.035, 0.009, 6, 12);
  for (let i = 0; i < 10; i++) {
    chainGeos.push(xform(linkGeo, 0, 1.16 + i * 0.058, 0, Math.PI / 2, (i % 2) * Math.PI / 2, 0));
  }
  linkGeo.dispose();
  // 曲臂 + 烛杯 + 承托盘
  const armGeos = [];
  const cupGeo = lathe([[0.012, 0], [0.05, 0.02], [0.06, 0.1], [0.075, 0.13]], 14);
  const drip = lathe([[0.09, 0], [0.1, 0.012], [0.05, 0.02]], 14);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    armGeos.push(bentTube(
      [dx * 0.1, 0.42, dz * 0.1],
      [dx * radius * 0.72, 0.05, dz * radius * 0.72],
      [dx * radius, 0.42, dz * radius],
      0.02
    ));
    armGeos.push(xform(cupGeo, dx * radius, 0.42, dz * radius));
    armGeos.push(xform(drip, dx * radius, 0.4, dz * radius));
  }
  cupGeo.dispose();
  drip.dispose();
  const metal = mergedMesh([columnGeo, ...chainGeos, ...armGeos], M.brass);
  g.add(metal);
  // 灯泡（火苗灯形，emissive 共享材质）
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0x201408, emissive: 0xffd9a0, emissiveIntensity: 3.0
  });
  const bulbGeos = [];
  const flameGeo = lathe([[0.001, 0], [0.028, 0.02], [0.034, 0.06], [0.014, 0.12], [0.002, 0.15]], 10);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2;
    bulbGeos.push(xform(flameGeo, Math.cos(a) * radius, 0.55, Math.sin(a) * radius));
  }
  flameGeo.dispose();
  const bulbs = mergedMesh(bulbGeos, bulbMat);
  g.add(bulbs);
  const light = new THREE.PointLight(0xffd9a0, 9, 15, 1.7);
  light.position.y = 0.6;
  g.add(light);
  g.userData.light = light;
  g.userData.bulbMat = bulbMat;
  g.userData.setPower = (v) => {
    light.intensity = 9 * v;
    bulbMat.emissiveIntensity = 3.0 * Math.max(0.03, v);
  };
  return g;
}

// ============================================================
// 档案廊 —— 荧光灯具（吊杆 + 折板反光罩 + 双管 + 端盖）
// ============================================================
export function fluorescentFixture({ len = 2.8, mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const housingGeos = [
    xform(new THREE.BoxGeometry(0.42, 0.06, len), 0, 0.14, 0),
    xform(new THREE.BoxGeometry(0.3, 0.1, len, 1, 1, 1), 0, 0.08, 0),
    // 折板反光翼
    xform(new THREE.BoxGeometry(0.2, 0.015, len), -0.16, 0.05, 0, 0, 0, 0.7),
    xform(new THREE.BoxGeometry(0.2, 0.015, len), 0.16, 0.05, 0, 0, 0, -0.7),
    // 端盖
    xform(new THREE.BoxGeometry(0.42, 0.16, 0.04), 0, 0.1, len / 2),
    xform(new THREE.BoxGeometry(0.42, 0.16, 0.04), 0, 0.1, -len / 2),
    // 吊杆
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), 0, 0.42, -len * 0.32),
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), 0, 0.42, len * 0.32)
  ];
  g.add(mergedMesh(housingGeos, M.iron));
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0xdfe8ff, emissiveIntensity: 2.6, toneMapped: true
  });
  const tubeGeo = new THREE.CapsuleGeometry(0.028, len - 0.34, 4, 10);
  const tubes = mergedMesh([
    xform(tubeGeo, -0.08, 0.02, 0, Math.PI / 2, 0, 0),
    xform(tubeGeo, 0.08, 0.02, 0, Math.PI / 2, 0, 0)
  ], tubeMat);
  tubeGeo.dispose();
  g.add(tubes);
  g.userData.tubeMat = tubeMat;
  return g;
}

// ============================================================
// 档案廊 —— 卡片目录柜（抽屉阵列 + 黄铜拉手与标签框 + 一只可拉抽屉）
// ============================================================
export function cardCatalog({ cols = 4, rows = 5, mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const W = cols * 0.24 + 0.08;
  const H = rows * 0.19 + 0.14;
  const body = roundedBoxMesh(W, H, 0.46, 0.02, M.darkWood);
  body.position.y = H / 2 + 0.06;
  // 底座线脚
  const plinth = roundedBoxMesh(W + 0.06, 0.08, 0.5, 0.02, M.darkWood);
  plinth.position.y = 0.04;
  // 顶檐
  const cornice = roundedBoxMesh(W + 0.05, 0.05, 0.5, 0.015, M.darkWood);
  cornice.position.y = H + 0.08;
  g.add(body, plinth, cornice);
  // 抽屉面板 + 拉手 + 标签框（合并）
  const faceGeos = [];
  const brassGeos = [];
  const faceGeo = roundedBoxGeo(0.205, 0.155, 0.02, 0.008, 2);
  const pullGeo = new THREE.CylinderGeometry(0.008, 0.014, 0.05, 8);
  const frameGeo = new THREE.BoxGeometry(0.09, 0.035, 0.006);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -W / 2 + 0.16 + c * 0.24;
      const y = 0.19 + r * 0.19;
      if (r === rows - 2 && c === 1) continue; // 留给可拉抽屉
      faceGeos.push(xform(faceGeo, x, y, 0.235));
      brassGeos.push(xform(pullGeo, x, y - 0.03, 0.255, Math.PI / 2, 0, 0));
      brassGeos.push(xform(frameGeo, x, y + 0.035, 0.246));
    }
  }
  faceGeo.dispose(); pullGeo.dispose(); frameGeo.dispose();
  g.add(mergedMesh(faceGeos, M.warmWood));
  g.add(mergedMesh(brassGeos, M.brass));
  // 可拉抽屉（独立部件：面板 + 屉体 + 卡片）
  const drawer = new THREE.Group();
  const dFace = roundedBoxMesh(0.205, 0.155, 0.02, 0.008, M.warmWood);
  const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.4), M.darkWood);
  dBody.position.z = -0.21;
  const dPull = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.05, 8), M.brass);
  dPull.rotation.x = Math.PI / 2;
  dPull.position.set(0, -0.03, 0.02);
  const cardGeos = [];
  const cardGeo = new THREE.BoxGeometry(0.15, 0.09, 0.006);
  const r1 = rng(53);
  for (let i = 0; i < 22; i++) {
    cardGeos.push(xform(cardGeo, 0, -0.01 + r1() * 0.015, -0.05 - i * 0.016, -0.06 + r1() * 0.12, 0, 0));
  }
  cardGeo.dispose();
  const cards = mergedMesh(cardGeos, new THREE.MeshStandardMaterial({ color: 0xd8cfba, roughness: 0.85 }));
  drawer.add(dFace, dBody, dPull, cards);
  drawer.position.set(-W / 2 + 0.16 + 1 * 0.24, 0.19 + (rows - 2) * 0.19, 0.235);
  g.add(drawer);
  g.userData.drawer = drawer;
  g.userData.drawerFace = dFace;
  return g;
}

// ============================================================
// 蓝丝绒 / 双峰 diner —— 点唱机（拱顶 + 格栅 + 氖光弧管 + 按键排）
// ============================================================
export function jukebox({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  // 机身：下箱体 + 半圆拱顶
  const body = roundedBoxMesh(0.92, 0.9, 0.62, 0.05, M.darkWood);
  body.position.y = 0.45;
  const archGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.6, 26, 1, false, 0, Math.PI);
  const arch = new THREE.Mesh(archGeo, M.darkWood);
  arch.rotation.set(0, 0, -Math.PI / 2);
  arch.rotation.x = Math.PI / 2;
  arch.position.y = 0.9;
  g.add(body, arch);
  // 氖光弧管 ×2（外/内圈）
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0xff2e88, emissiveIntensity: 2.2, toneMapped: false
  });
  const tubeMat2 = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0x3ec5ff, emissiveIntensity: 2.0, toneMapped: false
  });
  const arc1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.016, 8, 30, Math.PI), tubeMat);
  arc1.position.set(0, 0.9, 0.31);
  const arc2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.013, 8, 26, Math.PI), tubeMat2);
  arc2.position.set(0, 0.9, 0.315);
  g.add(arc1, arc2);
  // 面板格栅（竖条合并）+ 显示窗
  const grillGeos = [];
  const barGeo = new THREE.BoxGeometry(0.028, 0.42, 0.02);
  for (let i = 0; i < 9; i++) {
    grillGeos.push(xform(barGeo, -0.28 + i * 0.07, 0.46, 0.315));
  }
  barGeo.dispose();
  g.add(mergedMesh(grillGeos, M.brass));
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a10, emissive: 0xffca7a, emissiveIntensity: 0.35
  });
  const win = roundedBoxMesh(0.56, 0.2, 0.02, 0.01, windowMat);
  win.position.set(0, 0.98, 0.29);
  win.rotation.x = -0.18;
  g.add(win);
  g.userData.win = win;
  // 按键排
  const keyGeos = [];
  const keyGeo = new THREE.BoxGeometry(0.045, 0.02, 0.03);
  for (let i = 0; i < 8; i++) keyGeos.push(xform(keyGeo, -0.19 + i * 0.055, 0.76, 0.33, -0.5, 0, 0));
  keyGeo.dispose();
  g.add(mergedMesh(keyGeos, new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.4 })));
  // 底座踢脚
  const kick = roundedBoxMesh(0.98, 0.09, 0.68, 0.02, M.iron);
  kick.position.y = 0.045;
  g.add(kick);
  const glow = new THREE.PointLight(0xff5ea8, 0, 5, 1.8);
  glow.position.set(0, 1.1, 0.5);
  g.add(glow);
  g.userData.setOn = (on) => {
    tubeMat.emissiveIntensity = on ? 3.4 : 1.2;
    tubeMat2.emissiveIntensity = on ? 3.2 : 1.0;
    windowMat.emissiveIntensity = on ? 1.1 : 0.35;
    glow.intensity = on ? 7 : 0;
  };
  g.userData.tubeMats = [tubeMat, tubeMat2];
  return g;
}

// ============================================================
// 双峰夜街 —— 40 年代轿车 v2
// 部件：车身 / 舱室与舷窗 / 前后翼子板×4 / 踏板 / 镀铬保险杠×2 /
//       格栅条 / 圆大灯×2 / 尾灯 / 车轮（胎+铬毂盖）×4 / 引擎盖饰条
// ============================================================
export function sedanCar({ color = 0x11161c, mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.34, metalness: 0.6, clearcoat: 0.8, clearcoatRoughness: 0.25,
    envMapIntensity: 1.3
  });
  // 车身主体 + 舱室（圆角，比例参考 40 年代流线）
  const bodyGeos = [
    xform(roundedBoxGeo(4.0, 0.66, 1.62, 0.2), 0, 0.72, 0),
    xform(roundedBoxGeo(2.0, 0.6, 1.42, 0.26), -0.32, 1.28, 0),
    // 发动机舱盖脊线
    xform(roundedBoxGeo(1.4, 0.16, 0.5, 0.07), 1.35, 1.03, 0),
    // 行李箱斜背
    xform(roundedBoxGeo(0.9, 0.4, 1.3, 0.16), -1.72, 0.95, 0, 0, 0, 0.35)
  ];
  g.add(mergedMesh(bodyGeos, paint));
  // 翼子板（半embedded 球壳拉长）+ 踏板
  const fenderGeos = [];
  const fenderGeo = new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [x, z] of [[1.32, 0.82], [1.32, -0.82], [-1.32, 0.82], [-1.32, -0.82]]) {
    fenderGeos.push(xform(fenderGeo, x, 0.42, z, 0, 0, 0, 1).scale(1.3, 0.85, 0.62));
  }
  fenderGeo.dispose();
  fenderGeos.push(xform(new THREE.BoxGeometry(1.4, 0.06, 0.24), 0, 0.4, 0.86));
  fenderGeos.push(xform(new THREE.BoxGeometry(1.4, 0.06, 0.24), 0, 0.4, -0.86));
  g.add(mergedMesh(fenderGeos, paint));
  // 镀铬件：保险杠 / 格栅 / 大灯圈 / 盖饰条
  const chromeGeos = [
    xform(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 12), 2.1, 0.5, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 12), -2.12, 0.5, 0, Math.PI / 2, 0, 0),
    xform(new THREE.BoxGeometry(0.04, 0.03, 1.1), 2.02, 1.06, 0)
  ];
  for (let i = 0; i < 5; i++) {
    chromeGeos.push(xform(new THREE.BoxGeometry(0.03, 0.34, 0.05), 2.02, 0.78, -0.24 + i * 0.12));
  }
  for (const z of [0.52, -0.52]) {
    chromeGeos.push(xform(new THREE.TorusGeometry(0.13, 0.03, 8, 16), 2.0, 0.86, z, 0, Math.PI / 2, 0));
  }
  g.add(mergedMesh(chromeGeos, M.chrome));
  // 大灯（可点亮）
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a14, emissive: 0xffe9c0, emissiveIntensity: 0.12
  });
  const headGeos = [];
  for (const z of [0.52, -0.52]) {
    headGeos.push(xform(new THREE.SphereGeometry(0.115, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 2.02, 0.86, z, 0, 0, -Math.PI / 2));
  }
  const heads = mergedMesh(headGeos, headMat);
  g.add(heads);
  g.userData.heads = heads;
  // 尾灯
  const tail = mergedMesh([
    xform(new THREE.BoxGeometry(0.03, 0.07, 0.12), -2.16, 0.92, 0.55),
    xform(new THREE.BoxGeometry(0.03, 0.07, 0.12), -2.16, 0.92, -0.55)
  ], new THREE.MeshStandardMaterial({ color: 0x3a0508, emissive: 0xd4243c, emissiveIntensity: 0.4 }));
  g.add(tail);
  // 车窗（整体镶入的深色玻璃）
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1218, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85,
    envMapIntensity: 1.6
  });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.44, 1.44), glassMat)
    .translateX(-0.32).translateY(1.32));
  // 车轮：胎（torus）+ 铬毂盖（lathe）
  const tireGeos = [];
  const capGeos = [];
  const tireGeo = new THREE.TorusGeometry(0.3, 0.125, 10, 20);
  const capGeo = lathe([[0.0, 0.06], [0.1, 0.055], [0.16, 0.02], [0.17, 0]], 16);
  for (const [x, z] of [[1.32, 0.78], [1.32, -0.78], [-1.32, 0.78], [-1.32, -0.78]]) {
    tireGeos.push(xform(tireGeo, x, 0.36, z));
    capGeos.push(xform(capGeo, x, 0.36, z + (z > 0 ? 0.06 : -0.06), z > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0));
  }
  tireGeo.dispose(); capGeo.dispose();
  g.add(mergedMesh(tireGeos, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.92 })));
  g.add(mergedMesh(capGeos, M.chrome));
  const headLightL = new THREE.SpotLight(0xffe9c0, 0, 16, 0.5, 0.5, 1.4);
  headLightL.position.set(2.05, 0.86, 0);
  headLightL.target.position.set(8, 0.4, 0);
  g.add(headLightL, headLightL.target);
  g.userData.setLights = (on) => {
    headMat.emissiveIntensity = on ? 2.6 : 0.12;
    headLightL.intensity = on ? 26 : 0;
  };
  g.userData.headMat = headMat;
  return g;
}

// ============================================================
// 穆赫兰道剧场 —— 折座排椅（铸铁端架 + 翻座 + 靠背 + 排灯）
// 返回合并后的静态排 + 一把独立可交互座椅。
// ============================================================
export function theaterSeats({ rows = 3, cols = 6, dx = 0.86, dz = 1.05, mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const cushMat = leatherMat([70, 14, 22], { seed: 61 });
  const frameGeos = [];
  const cushGeos = [];
  let special = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * dx;
      const z = r * dz;
      // 铸铁端架（每椅左侧一片 + 行末右侧）
      frameGeos.push(xform(roundedBoxGeo(0.05, 0.62, 0.55, 0.02), x - dx / 2 + 0.06, 0.31, z));
      if (c === cols - 1) frameGeos.push(xform(roundedBoxGeo(0.05, 0.62, 0.55, 0.02), x + dx / 2 - 0.06, 0.31, z));
      // 扶手木条
      frameGeos.push(xform(new THREE.CylinderGeometry(0.032, 0.032, 0.5, 8), x - dx / 2 + 0.06, 0.6, z, Math.PI / 2, 0, 0));
      if (c === cols - 1) frameGeos.push(xform(new THREE.CylinderGeometry(0.032, 0.032, 0.5, 8), x + dx / 2 - 0.06, 0.6, z, Math.PI / 2, 0, 0));
      const isSpecial = r === 1 && c === 2;
      if (isSpecial) {
        // 可交互座椅：翻起状态的坐垫单独成 mesh
        special = new THREE.Group();
        const seat = roundedBoxMesh(0.62, 0.09, 0.5, 0.04, cushMat);
        seat.position.set(0, 0.62, 0.16);
        seat.rotation.x = -1.25; // 翻起
        const back = roundedBoxMesh(0.62, 0.62, 0.13, 0.05, cushMat);
        back.position.set(0, 0.72, 0.3);
        back.rotation.x = -0.18;
        special.add(seat, back);
        special.position.set(x, 0, z);
        special.userData.seat = seat;
        continue;
      }
      // 坐垫（微下陷）+ 靠背
      cushGeos.push(xform(roundedBoxGeo(0.62, 0.13, 0.5, 0.05), x, 0.44, z - 0.04, -0.06, 0, 0));
      cushGeos.push(xform(roundedBoxGeo(0.62, 0.62, 0.13, 0.05), x, 0.72, z + 0.3, -0.18, 0, 0));
    }
  }
  g.add(mergedMesh(frameGeos, M.iron));
  g.add(mergedMesh(cushGeos, cushMat));
  if (special) g.add(special);
  // 排灯（走道侧小灯珠）
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0xffca7a, emissiveIntensity: 1.8
  });
  const domeGeos = [];
  const domeGeo = new THREE.SphereGeometry(0.03, 8, 6);
  for (let r = 0; r < rows; r++) {
    domeGeos.push(xform(domeGeo, -(cols / 2) * dx - 0.02, 0.32, r * dz));
    domeGeos.push(xform(domeGeo, (cols / 2) * dx + 0.02, 0.32, r * dz));
  }
  domeGeo.dispose();
  g.add(mergedMesh(domeGeos, domeMat));
  g.userData.specialSeat = special;
  g.userData.domeMat = domeMat;
  return g;
}

// ============================================================
// 穆赫兰道暗巷 —— 电话亭 v2（立柱框架 + 玻璃 + 折门 + 话机 + 螺旋线）
// ============================================================
export function phoneBooth({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const frameCol = new THREE.MeshStandardMaterial({ color: 0x152030, roughness: 0.5, metalness: 0.6 });
  // 四角立柱 + 横梁
  const frameGeos = [];
  const postGeo = new THREE.BoxGeometry(0.07, 2.4, 0.07);
  for (const [x, z] of [[-0.42, 0.42], [0.42, 0.42], [-0.42, -0.42], [0.42, -0.42]]) {
    frameGeos.push(xform(postGeo, x, 1.2, z));
  }
  postGeo.dispose();
  for (const y of [0.08, 1.0, 2.36]) {
    frameGeos.push(xform(new THREE.BoxGeometry(0.9, 0.06, 0.07), 0, y, 0.42));
    frameGeos.push(xform(new THREE.BoxGeometry(0.9, 0.06, 0.07), 0, y, -0.42));
    frameGeos.push(xform(new THREE.BoxGeometry(0.07, 0.06, 0.9), -0.42, y, 0));
    frameGeos.push(xform(new THREE.BoxGeometry(0.07, 0.06, 0.9), 0.42, y, 0));
  }
  g.add(mergedMesh(frameGeos, frameCol));
  // 顶盖 + 发光顶牌
  const roof = roundedBoxMesh(0.98, 0.12, 0.98, 0.03, frameCol);
  roof.position.y = 2.46;
  const topSignMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a, emissive: 0x88c8ff, emissiveIntensity: 0.9
  });
  const topSign = roundedBoxMesh(0.9, 0.22, 0.08, 0.02, topSignMat);
  topSign.position.set(0, 2.66, 0);
  g.add(roof, topSign);
  // 玻璃三面（正面留门）
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbcd8e8, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.12,
    envMapIntensity: 1.6, depthWrite: false
  });
  for (const [x, z, ry] of [[0, -0.42, 0], [-0.42, 0, Math.PI / 2], [0.42, 0, Math.PI / 2]]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.3), glassMat);
    pane.position.set(x, 1.68, z);
    pane.rotation.y = ry;
    g.add(pane);
  }
  // 折门（两扇，绕铰链） —— userData.door 供交互
  const door = new THREE.Group();
  const leafMat = frameCol;
  const leaf1 = new THREE.Group();
  const l1frame = mergedMesh([
    xform(new THREE.BoxGeometry(0.05, 2.24, 0.05), 0.02, 1.18, 0),
    xform(new THREE.BoxGeometry(0.05, 2.24, 0.05), 0.4, 1.18, 0)
  ], leafMat);
  const l1glass = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.24), glassMat);
  l1glass.position.set(0.21, 1.62, 0);
  leaf1.add(l1frame, l1glass);
  const leaf2 = leaf1.clone();
  leaf2.position.x = 0.42;
  leaf2.rotation.y = 0.12;
  door.add(leaf1, leaf2);
  door.position.set(-0.44, 0, 0.42);
  g.add(door);
  g.userData.door = door;
  // 话机箱 + 听筒 + 螺旋线
  const boxUnit = roundedBoxMesh(0.3, 0.5, 0.16, 0.02, M.iron);
  boxUnit.position.set(0, 1.5, -0.32);
  const handset = mergedMesh([
    xform(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 10), 0, 0.11, 0),
    xform(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 10), 0, -0.11, 0),
    xform(new THREE.BoxGeometry(0.045, 0.16, 0.035), 0, 0, 0)
  ], M.iron);
  handset.position.set(-0.19, 1.56, -0.32);
  // 螺旋话线
  class Helix extends THREE.Curve {
    getPoint(t) {
      const a = t * Math.PI * 14;
      return new THREE.Vector3(Math.cos(a) * 0.02, -t * 0.42, Math.sin(a) * 0.02 - 0.32);
    }
  }
  const cord = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 120, 0.006, 6), frameCol);
  cord.position.set(-0.19, 1.5, 0);
  g.add(boxUnit, handset, cord);
  const innerLight = new THREE.PointLight(0x88c8ff, 1.6, 3, 2);
  innerLight.position.set(0, 2.2, 0);
  g.add(innerLight);
  g.userData.light = innerLight;
  g.userData.topSignMat = topSignMat;
  g.userData.handset = handset;
  return g;
}

// ============================================================
// 林奇的房间 —— 工作台灯 v2（重底座 + 双节弹簧臂 + 铝罩 + 旋钮）
// ============================================================
export function angleLamp({ shadeColor = 0x1c4232, mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const enamel = new THREE.MeshPhysicalMaterial({
    color: shadeColor, roughness: 0.32, metalness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3,
    envMapIntensity: 1.1
  });
  // 车削重底座 + 旋钮
  const baseGeo = lathe([[0.14, 0], [0.135, 0.02], [0.1, 0.035], [0.05, 0.05], [0.035, 0.07]], 20);
  const knobGeo = lathe([[0.0, 0], [0.018, 0.004], [0.02, 0.02], [0.012, 0.03]], 12);
  const base = mergedMesh([
    baseGeo,
    xform(knobGeo, 0.1, 0.05, 0)
  ], enamel);
  g.add(base);
  // 下臂 / 铰点 / 上臂 / 弹簧
  const armMat = M.chrome;
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), armMat);
  lower.position.set(0.02, 0.26, 0);
  lower.rotation.z = 0.35;
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), armMat);
  elbow.position.set(0.095, 0.455, 0);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), armMat);
  upper.position.set(0.02, 0.63, 0);
  upper.rotation.z = -0.75;
  // 弹簧（螺旋管）
  class Spring extends THREE.Curve {
    getPoint(t) {
      const a = t * Math.PI * 18;
      return new THREE.Vector3(t * 0.3, t * 0.13 + Math.cos(a) * 0.012, Math.sin(a) * 0.012);
    }
  }
  const spring = new THREE.Mesh(new THREE.TubeGeometry(new Spring(), 100, 0.0035, 6), armMat);
  spring.position.set(-0.1, 0.35, 0);
  spring.rotation.z = 0.5;
  g.add(lower, elbow, upper, spring);
  // 铝罩（车削钟形）+ 灯泡 + 光
  const shadeGeo = lathe([[0.01, 0], [0.1, -0.01], [0.13, -0.1], [0.12, -0.17]], 20);
  const shade = new THREE.Mesh(shadeGeo, enamel);
  shade.position.set(-0.12, 0.82, 0);
  shade.rotation.z = 0.7;
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a0, emissiveIntensity: 3 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), bulbMat);
  bulb.position.set(-0.19, 0.74, 0);
  const light = new THREE.PointLight(0xffd9a0, 5, 8, 1.8);
  light.position.set(-0.24, 0.72, 0);
  g.add(shade, bulb, light);
  g.userData.light = light;
  g.userData.bulbMat = bulbMat;
  g.userData.shade = shade;
  return g;
}

// ============================================================
// 林奇的房间 —— 木壳电子管收音机 v2（格栅 + 布网 + 表盘 + 双旋钮）
// ============================================================
export function radioCabinet({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  // 木壳：圆角箱体 + 拱形顶
  const caseMat = M.warmWood;
  const body = roundedBoxMesh(0.62, 0.4, 0.26, 0.03, caseMat);
  body.position.y = 0.2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 18, 1, false, 0, Math.PI), caseMat);
  top.rotation.z = Math.PI / 2;
  top.rotation.y = Math.PI / 2;
  top.position.y = 0.4;
  g.add(body, top);
  // 扬声器布网 + 格栅竖条
  const clothTex = canvasTexture(64, (g2, s) => {
    g2.fillStyle = '#3a2c18';
    g2.fillRect(0, 0, s, s);
    g2.fillStyle = 'rgba(0,0,0,0.4)';
    for (let y = 0; y < s; y += 3) for (let x = 0; x < s; x += 3) g2.fillRect(x, y, 1.4, 1.4);
  }, 2, 2);
  const cloth = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 22),
    new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.95 })
  );
  cloth.position.set(-0.13, 0.24, 0.132);
  g.add(cloth);
  const grillGeos = [];
  const gbar = new THREE.BoxGeometry(0.014, 0.24, 0.01);
  for (let i = 0; i < 5; i++) grillGeos.push(xform(gbar, -0.21 + i * 0.04, 0.24, 0.136));
  gbar.dispose();
  g.add(mergedMesh(grillGeos, M.brass));
  // 表盘玻璃 + 指针
  const dialMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a, emissive: 0xffc264, emissiveIntensity: 0.25
  });
  const dial = roundedBoxMesh(0.2, 0.12, 0.015, 0.008, dialMat);
  dial.position.set(0.14, 0.26, 0.134);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.09, 0.004),
    new THREE.MeshStandardMaterial({ color: 0xd4243c })
  );
  needle.position.set(0.14, 0.26, 0.143);
  g.add(dial, needle);
  // 双旋钮（车削）
  const knobGeo = lathe([[0.0, 0], [0.024, 0.005], [0.026, 0.02], [0.015, 0.028]], 12);
  const knobs = mergedMesh([
    xform(knobGeo, 0.08, 0.1, 0.135, Math.PI / 2, 0, 0),
    xform(knobGeo, 0.2, 0.1, 0.135, Math.PI / 2, 0, 0)
  ], M.brass);
  g.add(knobs);
  g.userData.dialMat = dialMat;
  g.userData.needle = needle;
  g.userData.body = body;
  return g;
}

// ============================================================
// 林奇的房间 —— 唱机（底座 + 转盘 + 黑胶 + 弯管唱臂 + 配重）
// ============================================================
export function turntable({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const plinth = roundedBoxMesh(0.52, 0.09, 0.42, 0.02, M.darkWood);
  plinth.position.y = 0.045;
  g.add(plinth);
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.022, 28), M.chrome);
  platter.position.set(-0.04, 0.1, 0);
  // 黑胶盘（沟槽纹理）
  const grooveTex = canvasTexture(128, (g2, s) => {
    g2.fillStyle = '#0a0a0c';
    g2.fillRect(0, 0, s, s);
    for (let r = 10; r < s / 2 - 3; r += 2) {
      g2.strokeStyle = `rgba(255,255,255,${0.03 + (r % 8 === 0 ? 0.05 : 0)})`;
      g2.beginPath(); g2.arc(s / 2, s / 2, r, 0, 7); g2.stroke();
    }
    g2.fillStyle = '#8f0e1e';
    g2.beginPath(); g2.arc(s / 2, s / 2, 9, 0, 7); g2.fill();
  });
  const record = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.155, 0.006, 28),
    new THREE.MeshStandardMaterial({ map: grooveTex, roughness: 0.32, metalness: 0.1 })
  );
  record.position.set(-0.04, 0.115, 0);
  g.add(platter, record);
  // 唱臂：支座 + 弯管 + 唱头 + 配重
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.07, 10), M.chrome);
  armBase.position.set(0.18, 0.12, -0.12);
  const armGroup = new THREE.Group();
  const armTube = new THREE.Mesh(bentTube([0, 0, 0], [-0.1, 0.02, 0.05], [-0.2, 0.0, 0.12], 0.006), M.chrome);
  const headShell = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.02), M.iron);
  headShell.position.set(-0.2, 0, 0.12);
  const counter = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), M.iron);
  counter.rotation.z = Math.PI / 2;
  counter.position.set(0.035, 0.005, -0.01);
  armGroup.add(armTube, headShell, counter);
  armGroup.position.set(0.18, 0.155, -0.12);
  g.add(armBase, armGroup);
  g.userData.record = record;
  g.userData.arm = armGroup;
  g.userData.platter = platter;
  return g;
}

// ============================================================
// 林奇的房间 —— 打字机（壳体 + 键盘阵列 + 纸卷轴 + 纸页）
// ============================================================
export function typewriter({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0x14161a, roughness: 0.4, metalness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.4
  });
  const body = roundedBoxMesh(0.42, 0.13, 0.34, 0.035, shellMat);
  body.position.y = 0.085;
  body.rotation.x = -0.1;
  const carriage = roundedBoxMesh(0.5, 0.07, 0.09, 0.025, shellMat);
  carriage.position.set(0, 0.19, -0.1);
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 12), M.iron);
  roller.rotation.z = Math.PI / 2;
  roller.position.set(0, 0.21, -0.1);
  g.add(body, carriage, roller);
  // 键帽阵列（车削小圆键，合并）
  const keyGeo = lathe([[0.0, 0], [0.014, 0.002], [0.015, 0.012], [0.011, 0.016]], 10);
  const keyGeos = [];
  const r = rng(71);
  for (let row = 0; row < 4; row++) {
    const n = 9 - (row % 2);
    for (let i = 0; i < n; i++) {
      keyGeos.push(xform(
        keyGeo,
        -0.15 + i * 0.037 + (row % 2) * 0.017,
        0.145 - row * 0.023 + r() * 0.003,
        0.14 - row * 0.052,
        -0.32, 0, 0
      ));
    }
  }
  keyGeo.dispose();
  g.add(mergedMesh(keyGeos, new THREE.MeshStandardMaterial({ color: 0xd8cfba, roughness: 0.5 })));
  // 纸页（微卷）
  const paperGeo = new THREE.PlaneGeometry(0.26, 0.24, 8, 8);
  const pp = paperGeo.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    pp.setZ(i, Math.pow(Math.max(0, pp.getY(i)), 2) * -0.6);
  }
  paperGeo.computeVertexNormals();
  const paperTex = canvasTexture(128, (g2, s) => {
    g2.fillStyle = '#e4dcc8';
    g2.fillRect(0, 0, s, s);
    g2.fillStyle = 'rgba(30,26,22,0.75)';
    for (let i = 0; i < 6; i++) g2.fillRect(18, 22 + i * 14, 30 + (i * 37) % 60, 3);
  });
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({
    map: paperTex, roughness: 0.9, side: THREE.DoubleSide
  }));
  paper.position.set(0, 0.32, -0.11);
  paper.rotation.x = -0.15;
  g.add(paper);
  g.userData.body = body;
  g.userData.paper = paper;
  return g;
}

// ============================================================
// 吊扇（电机壳车削 + 四叶 + 吊杆） —— 林奇的房间 / diner
// ============================================================
export function ceilingFan({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 8), M.iron);
  rod.position.y = -0.2;
  const motorGeo = lathe([[0.02, 0], [0.09, -0.01], [0.1, -0.08], [0.06, -0.12], [0.02, -0.13]], 18);
  const motor = new THREE.Mesh(motorGeo, M.iron);
  motor.position.y = -0.4;
  g.add(rod, motor);
  const bladeHub = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.5, 0.012, 0.11);
  const bladeGeos = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    bladeGeos.push(xform(bladeGeo, Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32, 0.1, -a, 0));
  }
  bladeGeo.dispose();
  bladeHub.add(mergedMesh(bladeGeos, M.darkWood));
  bladeHub.position.y = -0.46;
  g.add(bladeHub);
  // 拉链开关
  const pull = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), M.brass);
  pull.position.set(0.08, -0.62, 0);
  const pullCord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 4), M.iron);
  pullCord.position.set(0.08, -0.55, 0);
  g.add(pull, pullCord);
  g.userData.bladeHub = bladeHub;
  g.userData.pull = pull;
  return g;
}

// ============================================================
// 双峰 diner —— 柜台杂物组（纸巾盒/番茄酱瓶/糖罐/牌架，合并装饰）
// ============================================================
export function counterClutter({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  // 纸巾盒（铬）
  const napkin = mergedMesh([
    xform(roundedBoxGeo(0.16, 0.12, 0.07, 0.015), 0, 0.06, 0),
    xform(new THREE.BoxGeometry(0.12, 0.015, 0.01), 0, 0.125, 0)
  ], M.chrome);
  // 番茄酱瓶（车削 + 红盖）
  const ketchGeo = lathe([[0.0, 0], [0.032, 0.004], [0.036, 0.1], [0.02, 0.15], [0.014, 0.2]], 12);
  const ketchup = new THREE.Mesh(ketchGeo, new THREE.MeshPhysicalMaterial({
    color: 0x6e1010, roughness: 0.25, clearcoat: 0.7, envMapIntensity: 1.2
  }));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 10),
    new THREE.MeshStandardMaterial({ color: 0xd4243c, roughness: 0.5 }));
  cap.position.y = 0.21;
  ketchup.add(cap);
  ketchup.position.set(0.16, 0, 0.02);
  // 糖罐（玻璃 + 铬盖）
  const sugarGeo = lathe([[0.0, 0], [0.03, 0.003], [0.034, 0.07], [0.028, 0.1]], 12);
  const sugar = new THREE.Mesh(sugarGeo, new THREE.MeshPhysicalMaterial({
    color: 0xdfe8ee, roughness: 0.08, transparent: true, opacity: 0.5, envMapIntensity: 1.4
  }));
  const sugarCap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.018, 12), M.chrome);
  sugarCap.position.y = 0.11;
  sugar.add(sugarCap);
  sugar.position.set(-0.15, 0, 0.04);
  // 立式菜单牌
  const menuTex = canvasTexture(128, (g2, s) => {
    g2.fillStyle = '#efe6d2';
    g2.fillRect(0, 0, s, s);
    g2.fillStyle = '#20140c';
    g2.font = '700 26px Georgia, serif';
    g2.textAlign = 'center';
    g2.fillText('PIE', s / 2, 44);
    g2.font = '18px "Courier New", monospace';
    g2.fillText('& COFFEE', s / 2, 72);
    g2.strokeStyle = '#8f0e1e';
    g2.lineWidth = 4;
    g2.strokeRect(8, 8, s - 16, s - 16);
  });
  const menu = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.12),
    new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.7, side: THREE.DoubleSide })
  );
  menu.position.set(0.02, 0.07, -0.05);
  menu.rotation.x = -0.15;
  g.add(napkin, ketchup, sugar, menu);
  return g;
}

// ============================================================
// 双峰 diner —— 旋转多层派柜（玻璃筒 + 三层瓷盘 + 派）
// ============================================================
export function pieCase({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 20), M.chrome);
  base.position.y = 0.025;
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.46, 20, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xcfe4ff, roughness: 0.05, transparent: true, opacity: 0.12,
      envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false
    })
  );
  glass.position.y = 0.28;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), M.chrome);
  lid.position.y = 0.52;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M.chrome);
  knob.position.y = 0.545;
  g.add(base, glass, lid, knob);
  g.userData.glass = glass;
  // 内部旋转架：中轴 + 三层盘 + 派
  const rack = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8), M.chrome);
  spine.position.y = 0.27;
  rack.add(spine);
  const pieMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(64, (g2, s) => {
      g2.fillStyle = '#8a4a1c';
      g2.fillRect(0, 0, s, s);
      g2.strokeStyle = '#5c2c10';
      g2.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        g2.beginPath(); g2.moveTo((i / 4) * s + 8, 0); g2.lineTo((i / 4) * s + 8, s); g2.stroke();
        g2.beginPath(); g2.moveTo(0, (i / 4) * s + 8); g2.lineTo(s, (i / 4) * s + 8); g2.stroke();
      }
    }),
    roughness: 0.7
  });
  for (let lv = 0; lv < 3; lv++) {
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.008, 18), M.chrome);
    tray.position.y = 0.12 + lv * 0.14;
    rack.add(tray);
    const n = 2 - (lv % 2);
    for (let i = 0; i < n + 1; i++) {
      const a = (i / (n + 1)) * Math.PI * 2 + lv;
      const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.03, 12, 1, false, 0, Math.PI * (0.5 + (i % 2) * 0.4)), pieMat);
      slice.position.set(Math.cos(a) * 0.09, 0.145 + lv * 0.14, Math.sin(a) * 0.09);
      slice.rotation.y = a;
      rack.add(slice);
    }
  }
  g.add(rack);
  g.userData.rack = rack;
  return g;
}

// ============================================================
// 夜街 —— 路灯 v2（凹槽柱 + 贝塞尔曲臂 + 泪滴灯头车削 + 检修门）
// ============================================================
export function streetLampV2({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const poleGeos = [
    // 基座三段
    xform(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 14), 0, 0.06, 0),
    xform(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 14), 0, 0.22, 0),
    // 主杆（上细下粗）
    xform(new THREE.CylinderGeometry(0.05, 0.09, 4.2, 12), 0, 2.4, 0),
    // 检修门鼓包
    xform(roundedBoxGeo(0.1, 0.3, 0.04, 0.015), 0, 0.7, 0.08),
    // 曲臂
    bentTube([0, 4.45, 0], [0.4, 4.75, 0], [0.92, 4.6, 0], 0.032),
    // 灯头吊环
    xform(new THREE.TorusGeometry(0.05, 0.012, 6, 12), 0.92, 4.55, 0)
  ];
  g.add(mergedMesh(poleGeos, M.iron));
  // 泪滴灯头（车削）
  const headGeo = lathe([[0.01, 0], [0.13, -0.03], [0.16, -0.14], [0.1, -0.28], [0.04, -0.34], [0.055, -0.38]], 16);
  const head = new THREE.Mesh(headGeo, M.iron);
  head.position.set(0.92, 4.52, 0);
  g.add(head);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a8, emissiveIntensity: 3 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), bulbMat);
  bulb.position.set(0.92, 4.22, 0);
  const light = new THREE.PointLight(0xffd9a8, 8, 14, 1.6);
  light.position.set(0.92, 4.15, 0);
  g.add(bulb, light);
  g.userData.bulbMat = bulbMat;
  g.userData.light = light;
  g.userData.headX = 0.92;
  return g;
}

// ============================================================
// 双峰夜街 —— 悬挂式信号灯（横臂吊索 + 三窗灯箱 + 遮阳檐）
// ============================================================
export function trafficLight({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const box = roundedBoxMesh(0.24, 0.66, 0.24, 0.03, M.iron);
  const lampCols = [0xd4243c, 0xc9a24a, 0x3fae6a];
  const lampMats = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, emissive: lampCols[i], emissiveIntensity: i === 2 ? 2.2 : 0.12
    });
    lampMats.push(m);
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), m);
    lamp.position.set(0, 0.21 - i * 0.21, 0.125);
    g.add(lamp);
    // 遮阳檐
    const hood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.1, 12, 1, true, Math.PI, Math.PI),
      M.iron
    );
    hood.rotation.x = Math.PI / 2;
    hood.position.set(0, 0.24 - i * 0.21, 0.14);
    g.add(hood);
  }
  g.add(box);
  const light = new THREE.PointLight(lampCols[2], 3, 8, 1.8);
  light.position.set(0, -0.2, 0.4);
  g.add(light);
  g.userData.lampMats = lampMats;
  g.userData.light = light;
  g.userData.lampCols = lampCols;
  g.userData.box = box;
  /** 切换到某一窗（0红 1黄 2绿） */
  g.userData.setPhase = (i) => {
    lampMats.forEach((m, k) => { m.emissiveIntensity = k === i ? 2.2 : 0.12; });
    light.color.set(lampCols[i]);
  };
  return g;
}

// ============================================================
// 瀑布眺望台 —— 投币观景镜（基座 + 叉架 + 双筒 + 投币口）
// ============================================================
export function viewScope({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const pedGeo = lathe([[0.16, 0], [0.13, 0.05], [0.055, 0.12], [0.045, 1.0], [0.09, 1.06], [0.05, 1.12]], 16);
  const ped = new THREE.Mesh(pedGeo, M.iron);
  g.add(ped);
  const headGroup = new THREE.Group();
  const fork = mergedMesh([
    xform(new THREE.BoxGeometry(0.03, 0.16, 0.05), -0.1, 0.05, 0),
    xform(new THREE.BoxGeometry(0.03, 0.16, 0.05), 0.1, 0.05, 0),
    xform(new THREE.BoxGeometry(0.22, 0.03, 0.05), 0, -0.03, 0)
  ], M.iron);
  const scopeBody = mergedMesh([
    xform(new THREE.CylinderGeometry(0.075, 0.09, 0.3, 14), -0.0, 0.1, -0.05, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 12), -0.0, 0.1, 0.16, Math.PI / 2, 0, 0),
    // 投币盒
    xform(roundedBoxGeo(0.08, 0.1, 0.05, 0.01), 0, -0.02, 0.12)
  ], M.chrome);
  headGroup.add(fork, scopeBody);
  headGroup.position.y = 1.16;
  g.add(headGroup);
  g.userData.head = headGroup;
  g.userData.scope = scopeBody;
  return g;
}

// ============================================================
// 橡皮头锅炉房 —— 铰链炉门（圆门 + 观火窗 + 手轮锁）
// ============================================================
export function fireboxDoor({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const hinge = new THREE.Group(); // 铰链组：门绕此旋转
  const doorGeos = [
    xform(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 22), 0.36, 0, 0, Math.PI / 2, 0, 0),
    // 加强肋
    xform(new THREE.BoxGeometry(0.62, 0.05, 0.03), 0.36, 0.15, 0.04),
    xform(new THREE.BoxGeometry(0.62, 0.05, 0.03), 0.36, -0.15, 0.04),
    // 铆钉圈
    ...Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return xform(new THREE.SphereGeometry(0.02, 6, 5), 0.36 + Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.035);
    })
  ];
  const door = mergedMesh(doorGeos, M.iron);
  hinge.add(door);
  // 观火窗（emissive 独立，惊吓/交互时增亮）
  const portMat = new THREE.MeshStandardMaterial({
    color: 0x1a0c04, emissive: 0xff7a2c, emissiveIntensity: 1.4
  });
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.09, 14), portMat);
  port.position.set(0.36, 0.06, 0.041);
  hinge.add(port);
  // 手轮锁（车削轮 + 辐条）
  const wheelGeos = [
    xform(new THREE.TorusGeometry(0.09, 0.016, 8, 18), 0.36, -0.02, 0.09),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 0.17, 6), 0.36, -0.02, 0.09, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 0.17, 6), 0.36, -0.02, 0.09),
    xform(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), 0.36, -0.02, 0.05, Math.PI / 2, 0, 0)
  ];
  const wheel = mergedMesh(wheelGeos, M.chrome);
  hinge.add(wheel);
  // 铰链座
  const mount = mergedMesh([
    xform(new THREE.BoxGeometry(0.06, 0.3, 0.08), 0, 0, 0),
    xform(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), 0, 0, 0.02)
  ], M.iron);
  g.add(mount, hinge);
  g.userData.hinge = hinge;
  g.userData.portMat = portMat;
  g.userData.wheel = wheel;
  return g;
}

// ============================================================
// 橡皮头 —— 手轮阀（立管 + 大手轮 + 填料压盖）
// ============================================================
export function valveWheel({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const stem = mergedMesh([
    xform(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10), 0, 0.35, 0),
    xform(new THREE.CylinderGeometry(0.09, 0.11, 0.08, 10), 0, 0.72, 0),
    xform(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), 0, 0.84, 0)
  ], M.iron);
  g.add(stem);
  const wheel = new THREE.Group();
  const wheelMesh = mergedMesh([
    xform(new THREE.TorusGeometry(0.16, 0.022, 8, 20), 0, 0, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6), 0, 0, 0, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6), 0, 0, 0, Math.PI / 2, 0, Math.PI / 2),
    xform(new THREE.SphereGeometry(0.03, 8, 6), 0, 0, 0)
  ], M.chrome);
  wheel.add(wheelMesh);
  wheel.position.y = 0.92;
  g.add(wheel);
  g.userData.wheel = wheel;
  return g;
}

// ============================================================
// 橡皮头 —— 闸刀配电箱（铁箱 + 铰盖 + 三把闸刀 + 瓷瓶）
// ============================================================
export function fuseBox({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const box = roundedBoxMesh(0.5, 0.7, 0.14, 0.02, M.iron);
  g.add(box);
  const lid = roundedBoxMesh(0.5, 0.7, 0.02, 0.01, M.iron);
  lid.position.set(-0.48, 0, 0.08);
  lid.rotation.y = -2.2; // 常开
  g.add(lid);
  const levers = [];
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const y = 0.2 - i * 0.2;
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.05, 8), porcelain);
    seat.rotation.x = Math.PI / 2;
    seat.position.set(-0.1, y, 0.09);
    g.add(seat);
    const lever = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.024, 0.02), M.chrome);
    arm.position.x = 0.1;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 8), porcelain);
    grip.rotation.x = Math.PI / 2;
    grip.position.x = 0.2;
    lever.add(arm, grip);
    lever.position.set(-0.1, y, 0.11);
    lever.rotation.z = 0.5; // 合闸
    g.add(lever);
    levers.push(lever);
  }
  g.userData.levers = levers;
  g.userData.lid = lid;
  return g;
}

// ============================================================
// 大厅 —— 留声机（木箱 + 车削黄铜喇叭 + 摇柄 + 转盘）
// ============================================================
export function gramophone({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const box = roundedBoxMesh(0.46, 0.2, 0.46, 0.02, M.darkWood);
  box.position.y = 0.1;
  g.add(box);
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24), M.iron);
  platter.position.y = 0.215;
  const record = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.005, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.3 })
  );
  record.position.y = 0.228;
  g.add(platter, record);
  // 黄铜大喇叭（车削花冠）+ 弯颈
  const hornGeo = lathe([
    [0.012, 0], [0.02, 0.08], [0.03, 0.16], [0.06, 0.26], [0.13, 0.36], [0.26, 0.44], [0.3, 0.46]
  ], 22);
  const horn = new THREE.Mesh(hornGeo, M.brass);
  horn.position.set(-0.05, 0.32, -0.1);
  horn.rotation.x = -0.7;
  const neck = new THREE.Mesh(bentTube([0.1, 0.24, 0.08], [0.0, 0.22, 0.0], [-0.05, 0.33, -0.09], 0.014), M.brass);
  g.add(horn, neck);
  // 摇柄
  const crank = new THREE.Group();
  const crankMesh = mergedMesh([
    xform(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), 0, 0, 0.06, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6), 0, 0.04, 0.12, 0, 0, 0),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 6), 0, 0.08, 0.12)
  ], M.brass);
  crank.add(crankMesh);
  crank.position.set(0.23, 0.12, 0.1);
  crank.rotation.y = Math.PI / 2;
  g.add(crank);
  g.userData.record = record;
  g.userData.crank = crank;
  g.userData.horn = horn;
  return g;
}

// ============================================================
// 蓝丝绒吧台 —— 三头啤酒塔（铬塔 + 车削木柄）
// ============================================================
export function beerTaps({ n = 3, mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const tower = mergedMesh([
    xform(new THREE.CylinderGeometry(0.05, 0.07, 0.36, 12), 0, 0.18, 0),
    xform(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 12), 0, 0.015, 0)
  ], M.chrome);
  g.add(tower);
  const handles = [];
  const handleGeo = lathe([[0.0, 0], [0.016, 0.01], [0.02, 0.07], [0.028, 0.12], [0.012, 0.15]], 10);
  for (let i = 0; i < n; i++) {
    const a = -0.5 + i * 0.5;
    const spout = new THREE.Mesh(bentTube([0, 0.3, 0], [Math.sin(a) * 0.1, 0.32, 0.1], [Math.sin(a) * 0.14, 0.24, 0.15], 0.014), M.chrome);
    g.add(spout);
    const hGroup = new THREE.Group();
    const handle = new THREE.Mesh(handleGeo, M.warmWood);
    hGroup.add(handle);
    hGroup.position.set(Math.sin(a) * 0.1, 0.34, 0.06);
    hGroup.rotation.x = -0.3;
    g.add(hGroup);
    handles.push(hGroup);
  }
  handleGeo.dispose();
  g.userData.handles = handles;
  return g;
}

// ============================================================
// 蓝丝绒吧台 —— 收银机（阶梯键盘 + 金额旗窗 + 摇柄 + 现金抽屉）
// ============================================================
export function cashRegister({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x2c2218, roughness: 0.35, metalness: 0.5, clearcoat: 0.5, envMapIntensity: 1.1
  });
  const body = roundedBoxMesh(0.4, 0.3, 0.34, 0.03, bodyMat);
  body.position.y = 0.25;
  body.rotation.x = -0.12;
  // 金额旗窗
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c0c, emissive: 0xffe9c0, emissiveIntensity: 0.3
  });
  const flag = roundedBoxMesh(0.3, 0.12, 0.03, 0.01, flagMat);
  flag.position.set(0, 0.44, -0.02);
  g.add(body, flag);
  // 阶梯键盘（合并）
  const keyGeo = new THREE.CylinderGeometry(0.014, 0.017, 0.02, 8);
  const keyGeos = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      keyGeos.push(xform(keyGeo, -0.12 + c * 0.06, 0.29 - r * 0.045, 0.13 + r * 0.045, -0.5, 0, 0));
    }
  }
  keyGeo.dispose();
  g.add(mergedMesh(keyGeos, M.chrome));
  // 侧摇柄
  const crank = new THREE.Group();
  crank.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), 0, 0, 0.05, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.01, 0.01, 0.09, 6), 0, -0.045, 0.1),
    xform(new THREE.SphereGeometry(0.018, 8, 6), 0, -0.09, 0.1)
  ], M.brass));
  crank.position.set(0.21, 0.3, 0);
  g.add(crank);
  // 现金抽屉（可弹出）
  const drawer = roundedBoxMesh(0.38, 0.09, 0.3, 0.02, M.darkWood);
  drawer.position.set(0, 0.075, 0.02);
  g.add(drawer);
  g.userData.drawer = drawer;
  g.userData.crank = crank;
  g.userData.flagMat = flagMat;
  g.userData.body = body;
  return g;
}

// ============================================================
// 大厅 —— 纪念碑石 v2（削角碑身 + 铭文 + 叠级基座 + 黄铜围点）
// ============================================================
export function memorialStele({ mats } = {}) {
  const M = mats || propMats();
  const g = new THREE.Group();
  // 碑身：削角八边棱柱（Cylinder 8 边 + 缩放）
  const steleMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b1216, roughness: 0.22, metalness: 0.35,
    clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.2
  });
  const bodyGeo = new THREE.CylinderGeometry(0.62, 0.7, 1.9, 8, 1);
  bodyGeo.scale(1, 1, 0.42);
  const body = new THREE.Mesh(bodyGeo, steleMat);
  body.position.y = 1.18;
  body.rotation.y = Math.PI / 8;
  // 冠部削角
  const capGeo = new THREE.CylinderGeometry(0.4, 0.64, 0.22, 8, 1);
  capGeo.scale(1, 1, 0.42);
  const cap = new THREE.Mesh(capGeo, steleMat);
  cap.position.y = 2.24;
  cap.rotation.y = Math.PI / 8;
  // 叠级基座
  const plinth = mergedMesh([
    xform(new THREE.BoxGeometry(1.6, 0.14, 0.9), 0, 0.07, 0),
    xform(new THREE.BoxGeometry(1.35, 0.12, 0.75), 0, 0.2, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x120b0e, roughness: 0.4, metalness: 0.3, envMapIntensity: 0.8 }));
  g.add(body, cap, plinth);
  // 铭文面板（事实一行：名字与年份）
  const inscTex = canvasTexture(512, (g2, s) => {
    g2.fillStyle = '#100a0d';
    g2.fillRect(0, 0, s, s);
    g2.fillStyle = '#f2e9dc';
    g2.textAlign = 'center';
    g2.font = '400 74px Georgia, serif';
    g2.fillText('DAVID LYNCH', s / 2, s / 2 - 30);
    g2.fillStyle = '#c9a35c';
    g2.font = '44px Georgia, serif';
    g2.fillText('1946 — 2025', s / 2, s / 2 + 60);
    g2.strokeStyle = 'rgba(201,163,92,0.6)';
    g2.lineWidth = 3;
    g2.strokeRect(40, s / 2 - 110, s - 80, 220);
  });
  const insc = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.96),
    new THREE.MeshStandardMaterial({
      map: inscTex, roughness: 0.5,
      emissive: 0xf2e9dc, emissiveMap: inscTex, emissiveIntensity: 0.35
    })
  );
  insc.position.set(0, 1.35, 0.155);
  g.add(insc);
  // 黄铜围点（四角球）
  const dotGeo = new THREE.SphereGeometry(0.045, 10, 8);
  g.add(mergedMesh([
    xform(dotGeo, -0.72, 0.32, 0.32), xform(dotGeo, 0.72, 0.32, 0.32),
    xform(dotGeo, -0.72, 0.32, -0.32), xform(dotGeo, 0.72, 0.32, -0.32)
  ], M.brass));
  g.userData.inscription = insc;
  return g;
}
