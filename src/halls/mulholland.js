// ============================================================
// 《穆赫兰道》展厅 —— NIGHT ROAD & THE ILLUSION THEATER
// 夜路 + 路灯 + 剧场 + 蓝色立方体 (梦境反转交互)
// 彩蛋 v1.5：
//   · THE THING AT THE CORNER —— 沿暗巷走到剧场拐角的人，会遇到那个东西
//     （五幕节奏：灯相异常→真空压迫→拐角现身逼近→扑→黑幕错位）
//   · THERE IS NO BAND —— 对着舞台话筒按 E，歌声与歌者剪影会先后离场
// 全部原创程序化惊吓/幻象，无镜头复刻、无对白引用
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, curtain, curtainWithValance, neonSign, micStand, doorway,
  smokeLayer, dustField, lightCone, lightCone2, quotePlaque, vitrine,
  nightmareFigure, zoneTrigger, multiRectBounds,
  mergedMesh, xform, roundedBoxMesh, brushedMetalTexture, velvetMaterial,
  asphaltMat, woodMat, rustMat, rng
} from './kit.js';
import { propMats, theaterSeats, ticketBooth, phoneBooth, streetLampV2, dressingMirror } from './props.js';
import { quoteById } from '../data/essays.js';

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
    grade: { lift: [0.014, 0.004, 0.016], gamma: [1.0, 1.0, 1.03], gain: [1.05, 1.0, 0.96] }
  }
};

// 场地: 夜路区 + 剧场内部 + 右侧暗巷 + 剧场背后的空地（彩蛋区）
const ROAD = { minX: -4.6, maxX: 4.6, minZ: -13.6, maxZ: 19 };
const ROOM = { minX: -7.2, maxX: 7.2, minZ: -25.6, maxZ: -14.2 };
const DOOR = { minX: -1.35, maxX: 1.35, minZ: -14.9, maxZ: -13.2 };
const SHOULDER = { minX: 4.6, maxX: 11.0, minZ: 6.5, maxZ: 12.5 };  // 路肩缺口
const ALLEY = { minX: 8.4, maxX: 11.0, minZ: -31.5, maxZ: 6.5 };    // 暗巷
const BACKLOT = { minX: -10.5, maxX: 11.0, minZ: -33.0, maxZ: -27.6 }; // 背后空地

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player, teleport } = ctx;
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
  for (let i = 0; i < 7; i++) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(26 + Math.random() * 18, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x05030b, fog: false })
    );
    const a = (i / 7) * Math.PI * 2 + 0.4;
    hill.position.set(Math.cos(a) * 78, -14 + Math.random() * 6, Math.sin(a) * 78);
    hill.scale.y = 0.55;
    group.add(hill);
  }
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
    const nf = 6 + ((prng() * 3) | 0);
    for (let f = 0; f < nf; f++) {
      const af = (f / nf) * Math.PI * 2 + prng() * 0.5;
      const tilt = 0.95 + prng() * 0.85;
      const fl = 2.2 + prng() * 1.3;
      const cone = new THREE.ConeGeometry(0.16, fl, 4);
      cone.translate(0, fl / 2, 0);
      palmGeos.push(xform(cone, cx, hT, cz, 0, Math.PI - af, tilt));
    }
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
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = 14 - i * 6.5;
    const lamp = streetLampV2({ mats: M });
    lamp.position.set(side * 3.9, 0, z);
    lamp.rotation.y = side < 0 ? 0 : Math.PI; // 灯头朝向路面
    group.add(lamp);
    const headWorldX = side * (3.9 - lamp.userData.headX);
    const cone = lightCone(0.3, 2.1, 4.3, 0xffd9a8, 0.05);
    cone.position.set(headWorldX, 2.15, z);
    group.add(cone);
    lampData.push({ bulbMat: lamp.userData.bulbMat, light: lamp.userData.light, cone, broken: i === 2 });
  }
  updaters.push((dt, t) => {
    for (const [i, L] of lampData.entries()) {
      let f = 1;
      if (L.broken) {
        f = Math.sin(t * 23 + i) * Math.sin(t * 7.7) > 0.2 ? (Math.random() < 0.08 ? 0.05 : 0.9) : 0.12;
      }
      L.light.intensity = 7 * f;
      L.bulbMat.emissiveIntensity = 3 * f;
      L.cone.material.opacity = 0.05 * f;
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
      ui.docentNote('他说洛杉矶的光让他着迷，清晨的光尤其特别。');
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

  // v1.4 P3：剧场票亭（路缘外、门厅右肩；折窗 + 票口碗 + CERRADO 牌）
  const tbooth = ticketBooth({ mats: M });
  tbooth.position.set(5.35, 0, -12.8);
  tbooth.rotation.y = -Math.PI / 2; // 折窗面向夜路
  group.add(tbooth);
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
      if (opening) {
        ui.caption('窗口折开了。没有人卖票，也没有人查票。', 4200);
        ui.docentNote('它原是电视试播集，被退回后重剪为一部电影。');
      }
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
  newsBox.position.set(4.85, 0, 6.4);
  newsBox.rotation.y = -Math.PI / 2 - 0.06;
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
      audio.sfxAt('springdoor', 4.85, 6.4, 0.75, 3);
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
  // 砖块只做同色相亮度抖动（v1.6：三通道独立随机在强光下会泛成彩虹砖）
  const shellTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#191216';
    g.fillRect(0, 0, s, s);
    const bh = s / 12;
    for (let r = 0; r < 12; r++) {
      for (let c = -1; c < 7; c++) {
        const off = r % 2 ? s / 12 : 0;
        const v = Math.random() * 9;
        g.fillStyle = `rgb(${Math.round(25 + v)},${Math.round(19 + v * 0.75)},${Math.round(23 + v * 0.85)})`;
        g.fillRect(c * (s / 6) + off + 1, r * bh + 1, s / 6 - 2, bh - 2);
      }
    }
  }, 5, 3);
  // v1.6 修复：两面侧墙原法线朝向剧场内侧，从暗巷/路肩看过去被背面剔除，
  // 整面墙消失、直接透视到厅内红幕（严重破坏氛围的穿帮）。双面渲染兜底。
  const shellMat = new THREE.MeshStandardMaterial({
    map: shellTex, roughness: 0.9, bumpMap: shellTex, bumpScale: 0.35, side: THREE.DoubleSide
  });
  const mkShell = (w, h, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shellMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  mkShell(13.2, 8.2, 8.05, -20.2, Math.PI / 2);   // 右侧外墙（暗巷内壁，面朝巷）
  mkShell(13.2, 8.2, -8.05, -20.2, -Math.PI / 2); // 左侧外墙（面朝西侧路肩）
  mkShell(16.4, 8.2, 0, -26.6, Math.PI);          // 剧场后墙（空地内壁）

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
  // v1.5 P3：巷壁灯从「悬空裸灯泡」升级成完整壁灯资产——
  // 铆钉底板 + 鹅颈弯臂 + 锥形罩（可见内壁）+ 灯泡 + 板下锈挂贴花。
  // 两盏共用一个「恐慌」状态机：0 正常将熄闪烁 / 1 异常狂闪 / 2 全灭（惊吓相位驱动）
  const alleyPanic = { mode: 0 };
  const sconceRust = rustMat({ color: 0x8a8f96, seed: 53, repX: 1, repY: 1, rust: 0.7, env: 0.6 });
  const sconceShadeMat = rustMat({ color: 0x6d7076, seed: 54, repX: 1, repY: 1, rust: 0.55, env: 0.7 });
  sconceShadeMat.side = THREE.DoubleSide;
  const dripTex = canvasTexture(64, (g, s) => {
    g.clearRect(0, 0, s, s);
    const dr = rng(63);
    for (let i = 0; i < 7; i++) {
      const x = 8 + dr() * (s - 16);
      g.fillStyle = `rgba(58,32,20,${0.16 + dr() * 0.2})`;
      g.fillRect(x, 0, 2 + dr() * 3, s * (0.35 + dr() * 0.65));
    }
  });
  const dripMat = new THREE.MeshBasicMaterial({ map: dripTex, transparent: true, opacity: 0.8, depthWrite: false });
  const sconceData = [];
  for (const [z, phase] of [[-6, 0], [-19, 2.1]]) {
    const sc = new THREE.Group();
    const armCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.08, 0.03),
      new THREE.Vector3(0, 0.46, 0.1),
      new THREE.Vector3(0, 0.4, 0.36)
    );
    sc.add(mergedMesh([
      xform(new THREE.BoxGeometry(0.22, 0.36, 0.04), 0, 0, 0.02),
      xform(new THREE.SphereGeometry(0.012, 6, 5), -0.08, 0.14, 0.045),
      xform(new THREE.SphereGeometry(0.012, 6, 5), 0.08, 0.14, 0.045),
      xform(new THREE.SphereGeometry(0.012, 6, 5), -0.08, -0.14, 0.045),
      xform(new THREE.SphereGeometry(0.012, 6, 5), 0.08, -0.14, 0.045),
      new THREE.TubeGeometry(armCurve, 10, 0.016, 7)
    ], sconceRust));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.17, 0.17, 12, 1, true), sconceShadeMat);
    shade.position.set(0, 0.36, 0.38);
    sc.add(shade);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc98a, emissiveIntensity: 2.4 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), bulbMat);
    bulb.position.set(0, 0.27, 0.38);
    sc.add(bulb);
    const drip = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.6), dripMat);
    drip.position.set(0, -0.5, 0.002);
    sc.add(drip);
    sc.position.set(8.08, 3.05, z);
    sc.rotation.y = Math.PI / 2;
    group.add(sc);
    const light = new THREE.PointLight(0xffc98a, 3.3, 9, 1.8);
    light.position.set(8.46, 3.32, z);
    group.add(light);
    sconceData.push({ light, bulbMat, phase });
  }
  updaters.push((dt, t) => {
    for (const S of sconceData) {
      let f;
      if (alleyPanic.mode === 2) f = 0;
      else if (alleyPanic.mode === 1) {
        // 异常狂闪：高频错相位 strobe + 偶发整黑
        f = Math.sin(t * 47 + S.phase * 3) * Math.sin(t * 13 + S.phase) > -0.2
          ? (Math.random() < 0.1 ? 0.02 : 1.35) : 0.06;
      } else {
        f = Math.sin(t * (19 - S.phase) + S.phase) * Math.sin(t * 6.3 + S.phase * 0.4) > 0.55 ? 0.12 : 1;
      }
      S.light.intensity = 3.3 * f;
      S.bulbMat.emissiveIntensity = 2.4 * Math.max(0.02, f);
    }
  });
  // 巷内低空雾（呼吸感由氛围更新器驱动；惊吓异常相位骤浓）
  const alleyFog = smokeLayer(26, { x: 2.6, z: 26 }, { opacity: 0.055, size: 5, yBase: 0.3, ySpread: 1.6, color: 0x76809c });
  alleyFog.position.set(9.7, 0, -13);
  group.add(alleyFog);
  updaters.push(alleyFog.userData.update);
  // 拐角护板：剧场东南角包了半人高的锈角铁（货运通道的旧痕）+ 靠墙托盘
  group.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.1, 1.35, 0.04), 8.1, 0.675, -26.63),
    xform(new THREE.BoxGeometry(0.04, 1.35, 0.1), 8.13, 0.675, -26.66)
  ], sconceRust));
  const palletGeos = [];
  for (let i = 0; i < 5; i++) {
    palletGeos.push(xform(new THREE.BoxGeometry(0.13, 1.2, 0.024), -0.28 + i * 0.14, 0.6, 0.035));
  }
  for (const py of [0.12, 0.6, 1.08]) {
    palletGeos.push(xform(new THREE.BoxGeometry(0.7, 0.09, 0.05), 0, py, 0));
  }
  const pallet = mergedMesh(palletGeos, woodMat({ base: [40, 28, 18], planks: 1, size: 128, seed: 71, gloss: 0.15 }));
  pallet.position.set(5.8, 0, -26.88);
  pallet.rotation.x = -0.16;
  group.add(pallet);
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
  // v1.5 P10：漆面换 rustMat 五通道（市政绿底 + 锈斑流挂 + 点蚀金属度分层），
  // 惊吓红光扫过时不再是一块塑料大色块
  const dumpMat = rustMat({ color: 0x2a4234, seed: 58, repX: 2, repY: 1, rust: 0.75, env: 0.7 });
  const dumpster = new THREE.Group();
  const dumpBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.25, 1.3), dumpMat);
  dumpBody.position.y = 0.78;
  // 上沿外翻边
  const dumpRim = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.07, 1.42), dumpMat);
  dumpRim.position.y = 1.42;
  // 竖向压筋（前后面各 5 道，合并）
  const ribGeo = new THREE.BoxGeometry(0.07, 1.1, 0.04);
  const ribGeos = [];
  for (let i = 0; i < 5; i++) {
    const x = -1.0 + i * 0.5;
    ribGeos.push(xform(ribGeo, x, 0.76, 0.66));
    ribGeos.push(xform(ribGeo, x, 0.76, -0.66));
  }
  ribGeo.dispose();
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
  // 蒸汽口
  const ventSteam = smokeLayer(24, { x: 1.2, z: 1.2 }, { opacity: 0.06, size: 3.4, yBase: 0.2, ySpread: 2.2, color: 0xb8bcc4 });
  ventSteam.position.set(-6.5, 0, -30.5);
  group.add(ventSteam);
  updaters.push(ventSteam.userData.update);

  // 巷内电话亭 v2（立柱框架 + 玻璃 + 折门 + 螺旋话线；不通向任何地方）
  const booth = phoneBooth({ mats: M });
  booth.position.set(10.2, 0, -18);
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
      later(() => audio.sfxAt('ratchet', 10.2, -18, 0.85), 580);
    }
  });

  // ---------- 惊吓彩蛋 v3：THE THING AT THE CORNER（拐角那个东西） ----------
  // v1.6 重做，两个要求：①拐角即触发即现身——按原作的位置顺序与节奏，
  // 你走到剧场东南角的那一步它就直接从拐角后面出来了，没有铺垫拖沓；
  // ②它不再是粗黑剪影——nightmareFigure：烟垢惨白的脸、一双会亮的
  // 眼睛、纠结长发与苍白长手，由一盏下巴底下的惨白底光照出来。
  // 节奏（总长 ≈2.9s，快、准、狠）：
  //   0.00s 触发瞬间：整巷灯与后门灯同帧熄灭 + 声音被整只手拔掉 +
  //          金属擦地一声——它已经在动了
  //   0.00–0.55s 现身：从拐角后一步滑出，直接站到你面前 2.1m，
  //          惨白底光亮起，那双眼睛看着你
  //   0.55–1.55s 凝视：头猛地歪向一侧，眼睛越来越亮，向你倾过来半步，
  //          两记心跳
  //   1.55s 扑：0.22s 冲到脸前 + scare 音墙 + shock 后处理 + 眼睛暴亮
  //   2.15s 黑幕 → 2.90s 空间错位：醒来已被放回巷口，背对来路。
  // 可重复触发（冷却 45s）。
  const figure = nightmareFigure(2.4);
  figure.visible = false;
  group.add(figure);
  // 惨白底光（打在脸上的那盏）+ 背后剪影红光
  const scareFace = new THREE.PointLight(0xd8e2ee, 0, 6, 1.5);
  const scareLight = new THREE.PointLight(0x8a1408, 0, 9, 1.6);
  scareLight.position.set(6.9, 2.3, -28.7);
  group.add(scareFace, scareLight);
  // 节拍表（秒，全部由帧循环 dt 累加驱动——不是 setTimeout：低帧率机器上
  // 声画也永远同步，不会出现「音先到、影未出」的错位）
  const BEATS = { emerge: 0.55, breath: 0.7, thump2: 0.95, lunge: 1.55, hit: 1.77, blackout: 2.15, wake: 2.9 };
  const scare = {
    phase: 0, t: 0, cue: {},
    from: new THREE.Vector3(), mid: new THREE.Vector3(), to: new THREE.Vector3()
  };
  const faceAt = () => {
    figure.lookAt(player.x, 1.35, player.z);
    // 下巴高度的仰打光：照亮脸与眼窝，而不是把地面打出一滩泛光
    scareFace.position.set(
      figure.position.x + (player.x - figure.position.x) * 0.22, 1.15,
      figure.position.z + (player.z - figure.position.z) * 0.22
    );
    scareLight.position.set(
      figure.position.x - (player.x - figure.position.x) * 0.3, 2.3,
      figure.position.z - (player.z - figure.position.z) * 0.3
    );
  };

  const doScare = () => {
    if (scare.phase !== 0) return;
    scare.phase = 1;
    scare.t = 0;
    scare.cue = {};
    // 0.00s —— 拐角即触发：灯全灭 + 声音被整只手拔掉 + 它已经在动了
    alleyPanic.mode = 2;
    backLampState.on = 0;
    audio.duck(0.05, 0.02, 2.8);
    audio.sfxAt('dread', 8.6, -26.4, 1.0, 6);
    audio.sfxAt('metalscrape', 8.2, -26.8, 0.9, 5);
    audio.sfx('heartbeat', 0.9);
    // 从拐角后（剧场东南角背面）一步滑出，直接站到你面前 2.1m
    scare.from.set(6.8, 0, -27.8);
    const dir = new THREE.Vector3(player.x - 8.2, 0, player.z + 26.4).normalize();
    scare.mid.set(player.x - dir.x * 2.1, 0, player.z - dir.z * 2.1);
    figure.position.copy(scare.from);
    figure.visible = true;
  };
  const cueOnce = (name, fn) => {
    if (scare.t >= BEATS[name] && !scare.cue[name]) {
      scare.cue[name] = true;
      fn();
    }
  };
  updaters.push((dt, t) => {
    if (scare.phase === 0) return;
    scare.t += dt;
    cueOnce('breath', () => audio.sfx('breath', 0.5));
    cueOnce('thump2', () => audio.sfx('heartbeat', 1.0));
    cueOnce('lunge', () => {
      // 扑：以当前位置为起点，0.22s 冲到脸前 0.5m
      scare.phase = 4;
      scare.mid.copy(figure.position);
      const d2 = new THREE.Vector3(player.x - figure.position.x, 0, player.z - figure.position.z).normalize();
      scare.to.set(player.x - d2.x * 0.5, 0, player.z - d2.z * 0.5);
      audio.sfx('scare');
      engine.shock(1, 0.95, 0x1a0000);
    });
    cueOnce('blackout', () => {
      figure.visible = false;
      scareFace.intensity = 0;
      scareLight.intensity = 0;
      ui.fade(true);
    });
    cueOnce('wake', () => {
      // 空间错位：巷口醒来，背对来路
      teleport(9.7, 9.5, Math.PI);
      ui.fade(false);
      alleyPanic.mode = 0;
      backLampState.on = 1;
      audio.sfx('whisper', 0.7);
      ui.caption('它一直住在拐角后面。', 5200);
      scare.phase = 0; // 允许再次触发（zoneTrigger 冷却控制频率）
    });
    if (scare.phase === 1) {
      if (scare.t <= BEATS.emerge) {
        // 现身：0.55s 一步到位（快出，不磨蹭），末端一记小急停
        const u = Math.min(1, scare.t / BEATS.emerge);
        const k = u < 0.82 ? (u / 0.82) ** 1.35 : 1 - (1 - u) * 0.6;
        figure.position.lerpVectors(scare.from, scare.mid, k);
        figure.position.y = 0;
        scareFace.intensity = u * 7;
        scareLight.intensity = u * 2.2;
        figure.userData.update(dt, t, 0.55);
      } else {
        // 凝视：向你倾过来半步，头歪向一侧，眼睛越来越亮
        const u = Math.min(1, (scare.t - BEATS.emerge) / (BEATS.lunge - BEATS.emerge));
        const d3 = new THREE.Vector3(player.x - scare.mid.x, 0, player.z - scare.mid.z).normalize();
        figure.position.set(
          scare.mid.x + d3.x * u * 0.35, 0,
          scare.mid.z + d3.z * u * 0.35
        );
        figure.userData.update(dt, t, 0.6 + u * 0.4);
        scareFace.intensity = 7 + u * 3 + Math.sin(t * 37) * 0.8;
        scareLight.intensity = 2.2 + u * 1.6;
      }
      faceAt();
    } else if (scare.phase === 4 && scare.t <= BEATS.blackout) {
      const k = Math.min(1, (scare.t - BEATS.lunge) / (BEATS.hit - BEATS.lunge));
      figure.position.lerpVectors(scare.mid, scare.to, k * k);
      figure.userData.update(dt, t, 1);
      figure.rotation.z += Math.sin(scare.t * 74) * 0.1; // 高频痉挛
      scareFace.intensity = 12;
      scareLight.intensity = 6;
      faceAt();
    }
  });
  const scareTrig = zoneTrigger({ x: 9.7, z: -25.2, r: 3.4 }, doScare, { cooldown: 45 });
  updaters.push((dt) => scareTrig.update(player, dt));

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
  const stageCone = lightCone2(0.35, 1.5, 5.4, 0xffeedd, 0.06);
  stageCone.position.set(-1.6, 3.2, -4.2);
  inner.add(stageCone);
  // v1.5 P10 台口脚灯槽：舞台前沿一排黄铜杯罩小脚灯（「抽真空」时整排熄灭）
  const footGeos = [];
  const footBulbGeos = [];
  for (let i = 0; i < 7; i++) {
    footGeos.push(xform(new THREE.CylinderGeometry(0.05, 0.065, 0.07, 10), -3 + i, 0.635, -2.86));
    footBulbGeos.push(xform(new THREE.SphereGeometry(0.032, 8, 6), -3 + i, 0.685, -2.86));
  }
  inner.add(mergedMesh(footGeos, M.brass));
  const footMat = new THREE.MeshStandardMaterial({ color: 0x180e04, emissive: 0xffce8e, emissiveIntensity: 1.9 });
  inner.add(mergedMesh(footBulbGeos, footMat));
  // 厅内灯光的统一压暗系数（「没有乐队」相位把整个厅按进黑暗里）
  const houseDim = { k: 1 };
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
    sconceMat.emissiveIntensity = (2.2 + Math.sin(t * 5.3) * 0.35 + Math.sin(t * 13.7) * 0.18) * houseDim.k;
  });

  // ---------- v1.5 彩蛋：THERE IS NO BAND（没有乐队） ----------
  // 对着舞台话筒按 E，四幕连锁（总长 ≈12s，可重复）：
  //   ① 0.0s 彩排：无人声源的咏叹在光柱里浮起，歌者剪影缓缓显形，聚光收拢变亮
  //   ② 3.2s 抽真空：声音被整只手拔掉——剪影瞬灭（从来没有人）、聚光转冷、
  //          脚灯/壁烛/走道灯全厅压暗、台口大幕像被谁从后面碰了一下
  //   ③ 6.3s 空话筒独占冷光，咏叹又从没有人的地方回来
  //   ④ 9.8s 回暖复原
  // 视觉 ≥2 通道：剪影消失 / 聚光变冷 / 帷幕异动 / 全厅压暗。
  // 剪影为无面目抽象黑形（头 + 梯形身），不复刻任何受版权保护的形象。
  const singerMat = new THREE.MeshBasicMaterial({ color: 0x030206, transparent: true, opacity: 0 });
  const singer = new THREE.Group();
  const singerHead = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), singerMat);
  singerHead.scale.y = 1.18;
  singerHead.position.y = 1.46;
  const singerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.34, 1.28, 10), singerMat);
  singerBody.position.y = 0.72;
  singer.add(singerHead, singerBody);
  singer.position.set(-1.6, 0.6, -4.72);
  singer.visible = false;
  inner.add(singer);
  const noBand = { phase: 0, t: 0 };
  const spotWarm = new THREE.Color(0xffeedd);
  const spotCold = new THREE.Color(0xbfd4ff);
  const runNoBand = () => {
    if (noBand.phase !== 0) return;
    noBand.phase = 1;
    noBand.t = 0;
    singer.visible = true;
    audio.duck(3.2, 0.3, 2.2); // 环境声先退半步，给「歌声」让路
    audio.sfxAt('aria', -1.6, -24.2, 0.85, 8);
    later(() => {
      noBand.phase = 2;
      noBand.t = 0;
      audio.sfx('silencecut', 0.9);
      audio.duck(3.4, 0.008, 4.0);
      ui.caption('没有乐队。', 2800);
    }, 3200);
    later(() => {
      noBand.phase = 3;
      noBand.t = 0;
      audio.sfxAt('aria', -1.6, -24.2, 0.3, 10);
      ui.caption('可歌声还在。', 3600);
    }, 6300);
    later(() => { noBand.phase = 4; noBand.t = 0; }, 9800);
    later(() => { noBand.phase = 0; singer.visible = false; }, 12000);
  };
  updaters.push((dt, t) => {
    if (noBand.phase === 0) return;
    noBand.t += dt;
    if (noBand.phase === 1) {
      const k = Math.min(1, noBand.t / 1.1);
      singerMat.opacity = k * 0.92;
      singer.rotation.z = Math.sin(t * 0.9) * 0.03; // 影子极轻地摇
      stageSpot.color.copy(spotWarm);
      stageSpot.intensity = 46 + k * 30;
    } else if (noBand.phase === 2) {
      singerMat.opacity = 0; // 瞬灭——从来没有人
      stageSpot.color.copy(spotCold);
      stageSpot.intensity = 84;
      footMat.emissiveIntensity = 0.05;
      houseDim.k = 0.08;
      const sh = Math.sin(noBand.t * 22) * Math.exp(-noBand.t * 2.2);
      proscenium.rotation.x = sh * 0.03;
      proscenium.position.y = Math.abs(sh) * 0.05;
    } else if (noBand.phase === 3) {
      stageSpot.intensity = 70 + Math.sin(t * 1.7) * 6;
      proscenium.rotation.x *= Math.max(0, 1 - dt * 3);
      proscenium.position.y *= Math.max(0, 1 - dt * 3);
    } else if (noBand.phase === 4) {
      const k = Math.min(1, noBand.t / 2.0);
      stageSpot.color.lerpColors(spotCold, spotWarm, k);
      stageSpot.intensity = 70 + (46 - 70) * k;
      footMat.emissiveIntensity = 0.05 + k * 1.85;
      houseDim.k = Math.min(1, 0.08 + k * 0.92);
      proscenium.rotation.x = 0;
      proscenium.position.y = 0;
    }
  });
  hotspots.add(mic.children[3], {
    hint: 'E — 没有乐队，一切都是录音',
    onActivate: runNoBand
  });
  const noBandTrig = { force: runNoBand };

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
    const target = aisleState.on * houseDim.k;
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
    doorSconceMat.emissiveIntensity = (2.0 + Math.sin(t * 4.7 + 1.2) * 0.3) * houseDim.k;
    doorGlow.intensity = (2.6 + Math.sin(t * 4.7 + 1.2) * 0.35) * houseDim.k;
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
      ui.docentNote('蓝盒子没有官方解释，他拒绝为它固定唯一答案。');
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

  // 引语展签（本厅唯一文字展签）
  const q1 = quotePlaque(quoteById('sense'), '#3ec5ff');
  q1.position.set(-3.9, 0, -11.6);
  q1.rotation.y = 0.55;
  group.add(q1);
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

  // 路面夜雾与尘
  const roadHaze = smokeLayer(80, { x: 12, z: 40 }, { opacity: 0.05, size: 10, yBase: 0.25, ySpread: 1.2, color: 0x8a92b8 });
  roadHaze.position.z = 2;
  group.add(roadHaze);
  updaters.push(roadHaze.userData.update);
  const dust = dustField(150, { x: 12, y: 5, z: 36 }, { opacity: 0.3, size: 0.05, color: 0xaebdff });
  group.add(dust);
  updaters.push(dust.userData.update);

  // v1.5 氛围：雾的呼吸——路雾与巷雾按不同长波起伏；惊吓异常相位时巷雾骤浓
  updaters.push((dt, t) => {
    roadHaze.material.opacity = 0.05 * (1 + Math.sin(t * 0.11) * 0.3 + Math.sin(t * 0.043 + 1.7) * 0.2);
    const panic = alleyPanic.mode === 1 ? 0.09 : 0;
    const target = 0.055 * (1 + Math.sin(t * 0.09 + 2) * 0.3) + panic;
    alleyFog.material.opacity += (target - alleyFog.material.opacity) * Math.min(1, dt * 2);
  });
  // v1.5 氛围：稀发远景事件——远处警笛掠过 / 铁皮门远响 / 垃圾箱方向轻微金属挪动。
  // 城市在你看不到的地方继续；40–80s 一发，惊吓进行中不插话
  const farEvt = { next: 26 + Math.random() * 20 };
  updaters.push((dt, t) => {
    if (t < farEvt.next || scare.phase !== 0) return;
    farEvt.next = t + 40 + Math.random() * 40;
    const roll = Math.random();
    if (roll < 0.45) audio.sfxAt('sirenfar', -60, 40, 0.5, 45);
    else if (roll < 0.75) audio.sfxAt('doorfar', -20, -40, 0.5, 25);
    else audio.sfxAt('metalscrape', 4.6, -31, 0.28, 14);
  });

  // 回大厅之门（夜路起点）
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, 17.8);
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  group.add(new THREE.AmbientLight(0x141228, 1.15));

  return {
    group,
    spawn: { x: 0, z: 15.5, yaw: 0 },
    bounds: multiRectBounds([ROAD, ROOM, DOOR, SHOULDER, ALLEY, BACKLOT]),
    // 脚步材质分区：剧场厅内（含门廊）=地毯；路面/路肩/暗巷/背后空地=沥青
    surfaceAt: (x, z) => {
      if (z <= DOOR.maxZ && x >= ROOM.minX && x <= ROOM.maxX && z >= ROOM.minZ) return 'carpet';
      return 'asphalt';
    },
    // 混响分区：剧场厅内=绒面房间尾音；夜路/巷/空地=干外景
    spaceAt: (x, z) => {
      if (z <= DOOR.maxZ && x >= ROOM.minX && x <= ROOM.maxX && z >= ROOM.minZ) return 'room';
      return 'outdoor';
    },
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: {
      // 冒烟核验：force 直接快进到凝视拍（低帧率无头环境下时间轴确定可截）
      'corner-scare': { force: () => { scareTrig.force(); scare.t = Math.max(scare.t, 1.05); } },
      'no-band': noBandTrig
    },
    onLeave: () => {
      engine.lynchPass.uniforms.uInvert.value = 0;
      for (const id of timers) clearTimeout(id);
    }
  };
}
