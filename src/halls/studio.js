// ============================================================
// 林奇的房间 —— HIS ROOM / THE WORKSHOP
// 不是展厅，是一个人的房间：工作桌、台灯、咖啡、香烟、
// 画架、收音机（天气播报）、可拉开的帘、冥想角（深水序列）、
// 软木留言板。全部原创抽象致敬，不使用肖像与商标。
// 交互 ≥3：台灯开关 / 顶灯开关 / 喝咖啡 / 点烟 / 收音机 /
// 拉帘 / 冥想 / 画架 / 留言板，并含「咖啡→烟→天气」叙事链。
// ============================================================
import * as THREE from 'three';
import {
  canvasTexture, noiseCanvasTexture, floorMesh, doorway, smokeLayer, dustField,
  quoteStand, quoteStandUpdater, zoneTrigger,
  mergedMesh, xform, roundedBoxMesh, woodTexture, brushedMetalTexture,
  woodMat as woodPbr, fabricMat, rng
} from './kit.js';
import { propMats, angleLamp, radioCabinet, turntable, typewriter, ceilingFan, clubChair } from './props.js';
import { quoteById, DOCENT } from '../data/essays.js';

export const meta = {
  id: 'studio',
  name: 'HIS ROOM · 林奇的房间',
  ambience: 'studio',
  narration: 'studio',
  space: 'room',
  floorSfx: 'wood',
  look: {
    saturation: 1.02, tint: 0xffeeda, fogColor: 0x0d0806, fogDensity: 0.042,
    bg: 0x070403, exposure: 1.05, bloom: 0.75,
    // v1.4 P4/P5：琥珀暗部 + 暖木高光（一个人深夜工作的房间）
    halation: 0.14,
    grade: { lift: [0.014, 0.008, 0.002], gamma: [1.02, 1.0, 0.97], gain: [1.06, 1.01, 0.94] },
    // v1.9 B1：房间的呼吸最浅最慢（44s，±7%——一个人夜里的呼吸）
    fogPulse: { period: 44, depth: 0.07 }
  }
};

const W = 16.5;
const D = 13;
// 主房间 + 帘后的冥想角
const MAIN = { minX: -W / 2 + 0.9, maxX: W / 2 - 0.9, minZ: -D / 2 + 0.9, maxZ: D / 2 - 1.3 };
const ALCOVE = { minX: 2.7, maxX: 6.3, minZ: -9.2, maxZ: -D / 2 + 0.9 };

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player, store, narration } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // ---------- 房间外壳 ----------
  // 拼木地板（v1.3 三通道：板缝法线 + 起居磨损）
  const M = propMats();
  group.add(floorMesh(W, D, woodPbr({
    base: [42, 28, 14], planks: 8, size: 512, seed: 45, repX: 5, repY: 4,
    worn: 0.65, gloss: 0.5, env: 0.7
  })));

  // 深色木墙板（竖板三通道）
  const wallMat = woodPbr({
    base: [32, 22, 11], planks: 6, vertical: true, size: 256, seed: 46,
    repX: 4, repY: 1, gloss: 0.35, env: 0.5
  });
  const H = 4.6;
  const mkWall = (w, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wallMat);
    m.position.set(x, H / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  // 北墙留出帘洞（通往冥想角）
  {
    const seg1 = new THREE.Mesh(new THREE.PlaneGeometry(11.15, H), wallMat);
    seg1.position.set(-2.675, H / 2, -D / 2);
    group.add(seg1);
    const seg2 = new THREE.Mesh(new THREE.PlaneGeometry(2.15, H), wallMat);
    seg2.position.set(7.175, H / 2, -D / 2);
    group.add(seg2);
    const lintel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), wallMat);
    lintel.position.set(4.5, H - 0.5, -D / 2);
    group.add(lintel);
  }
  mkWall(W, 0, D / 2, Math.PI);
  mkWall(D, -W / 2, 0, Math.PI / 2);
  mkWall(D, W / 2, 0, -Math.PI / 2);
  // 拼板木顶 + 三道明椽（小木屋的顶，不再是黑洞）
  const ceil = floorMesh(W, D, woodPbr({
    base: [24, 16, 9], planks: 7, size: 256, seed: 47, repX: 4, repY: 3, gloss: 0.25, env: 0.35
  }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);
  const rafterGeo = new THREE.BoxGeometry(W, 0.18, 0.24);
  const rafterGeos = [];
  for (const rz of [-3.4, 0.4, 4.2]) {
    rafterGeos.push(xform(rafterGeo, 0, H - 0.09, rz));
  }
  rafterGeo.dispose();
  group.add(mergedMesh(rafterGeos, new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [18, 12, 7], planks: 1, size: 128 }), roughness: 0.85
  })));

  // 冥想角（北墙外的凹间）
  const nookMat = new THREE.MeshStandardMaterial({ color: 0x120b12, roughness: 0.9 });
  const mkNook = (w, h, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), nookMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  mkNook(3.6, H, 4.5, -9.3, 0);
  mkNook(3, H, 2.7, -7.9, Math.PI / 2);
  mkNook(3, H, 6.3, -7.9, -Math.PI / 2);
  const nookFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3),
    new THREE.MeshStandardMaterial({ color: 0x140d14, roughness: 0.85 })
  );
  nookFloor.rotation.x = -Math.PI / 2;
  nookFloor.position.set(4.5, 0.005, -7.9);
  group.add(nookFloor);
  const nookCeil = nookFloor.clone();
  nookCeil.rotation.x = Math.PI / 2;
  nookCeil.position.y = H;
  group.add(nookCeil);

  // ---------- 工作桌（西墙，圆角桌板 + 车削桌腿） ----------
  const caseWood = woodPbr({ base: [44, 28, 15], planks: 2, size: 256, seed: 47, gloss: 0.5 });
  const desk = new THREE.Group();
  const deskTop = roundedBoxMesh(3.4, 0.09, 1.3, 0.03, caseWood);
  deskTop.position.y = 0.86;
  const legGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.86, 10);
  const deskLegs = mergedMesh([
    xform(legGeo, -1.55, 0.43, -0.5), xform(legGeo, 1.55, 0.43, -0.5),
    xform(legGeo, -1.55, 0.43, 0.5), xform(legGeo, 1.55, 0.43, 0.5)
  ], caseWood);
  legGeo.dispose();
  desk.add(deskTop, deskLegs);
  // v1.4 P3 工作桌 v2：三面裙板（前面留抽屉口）——桌子有了结构，不再是板加四腿
  desk.add(mergedMesh([
    xform(new THREE.BoxGeometry(3.1, 0.16, 0.05), 0, 0.735, -0.58),
    xform(new THREE.BoxGeometry(1.05, 0.16, 0.05), -1.025, 0.735, 0.58),
    xform(new THREE.BoxGeometry(1.05, 0.16, 0.05), 1.025, 0.735, 0.58),
    xform(new THREE.BoxGeometry(0.05, 0.16, 1.1), -1.55, 0.735, 0),
    xform(new THREE.BoxGeometry(0.05, 0.16, 1.1), 1.55, 0.735, 0)
  ], caseWood));
  // 可拉抽屉：圆角前脸 + 黄铜拉手 + 抽屉斗 + 里面一支会滚的铅笔
  const drawer = new THREE.Group();
  const drawerFront = roundedBoxMesh(0.96, 0.15, 0.03, 0.008, caseWood);
  const drawerBoxMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [30, 20, 11], planks: 1, size: 128 }), roughness: 0.8
  });
  const drawerBox = mergedMesh([
    xform(new THREE.BoxGeometry(0.9, 0.02, 0.62), 0, -0.06, -0.33),
    xform(new THREE.BoxGeometry(0.02, 0.11, 0.62), -0.44, -0.015, -0.33),
    xform(new THREE.BoxGeometry(0.02, 0.11, 0.62), 0.44, -0.015, -0.33),
    xform(new THREE.BoxGeometry(0.9, 0.11, 0.02), 0, -0.015, -0.63)
  ], drawerBoxMat);
  const drawerKnob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M.brass);
  drawerKnob.position.set(0, 0, 0.03);
  const pencil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.19, 6),
    new THREE.MeshStandardMaterial({ color: 0xc8a018, roughness: 0.55 })
  );
  pencil.position.set(0.08, -0.04, -0.3);
  pencil.rotation.z = Math.PI / 2;
  drawer.add(drawerFront, drawerBox, drawerKnob, pencil);
  drawer.position.set(0, 0.735, 0.585);
  desk.add(drawer);
  const drawerState = { open: 0, target: 0, roll: 0 };
  updaters.push((dt) => {
    drawerState.open += (drawerState.target - drawerState.open) * Math.min(1, dt * 5);
    drawer.position.z = 0.585 + drawerState.open * 0.36;
    if (drawerState.roll > 0) {
      drawerState.roll = Math.max(0, drawerState.roll - dt);
      pencil.rotation.x += dt * 11 * drawerState.roll;
      pencil.position.z = -0.3 - Math.sin(drawerState.roll * Math.PI) * 0.04;
    }
  });
  hotspots.add(drawerFront, {
    hint: 'E — 桌子的抽屉',
    onActivate: () => {
      const opening = drawerState.target < 0.5;
      drawerState.target = opening ? 1 : 0;
      drawerState.roll = 0.7;
      audio.sfxAt('creak', -6.4, -1.4, 0.4, 3);
      later(() => audio.sfxAt(opening ? 'clank' : 'thud', -6.4, -1.4, 0.3, 3), 240);
      if (opening) ui.caption('抽屉里只有一支铅笔。', 3000);
    }
  });
  // 桌面器物重排：一叠错角的稿纸（打字行痕）+ 合上的小笔记本
  const pageTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#e4dcc8';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(40,34,26,0.55)';
    const r = rng(53);
    for (let y = 18; y < s - 12; y += 9) {
      const w = s * (0.42 + r() * 0.42);
      g.fillRect(12, y, w, 1.6);
    }
  });
  const pageGeo = new THREE.BoxGeometry(0.24, 0.0035, 0.32);
  desk.add(mergedMesh([
    xform(pageGeo, 0.62, 0.909, 0.28, 0, 0.16, 0),
    xform(pageGeo, 0.61, 0.913, 0.26, 0, -0.1, 0),
    xform(pageGeo, 0.64, 0.917, 0.27, 0, 0.04, 0)
  ], new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 })));
  const notebook = roundedBoxMesh(0.14, 0.025, 0.2, 0.008,
    new THREE.MeshStandardMaterial({ color: 0x2a1214, roughness: 0.6 }));
  notebook.position.set(1.28, 0.917, -0.28);
  notebook.rotation.y = -0.22;
  desk.add(notebook);
  // v1.9 件 2：手摇铅笔刀（桌角夹装）——C 形夹咬住桌沿 + 铸铁机身 +
  // 屑鼓 + 摇柄 + 桌上的木屑盘。抽屉里那支铅笔是唯一的笔，
  // 盘里的屑却是新的。E → 摇柄空转六格，一枚新屑掉进盘里。
  const sharpBody = mergedMesh([
    // C 形夹：上压板 / 桌沿外立板 / 下颚 / 蝶形压杆
    xform(new THREE.BoxGeometry(0.085, 0.014, 0.1), 1.5, 0.912, 0.585),
    xform(new THREE.BoxGeometry(0.08, 0.13, 0.012), 1.5, 0.855, 0.662),
    xform(new THREE.BoxGeometry(0.08, 0.01, 0.08), 1.5, 0.795, 0.618),
    xform(new THREE.CylinderGeometry(0.005, 0.005, 0.026, 8), 1.5, 0.806, 0.6),
    xform(new THREE.BoxGeometry(0.034, 0.006, 0.009), 1.5, 0.792, 0.6),
    // 机身：座柱 + 卧筒 + 削孔鼻锥 + 孔口
    xform(new THREE.BoxGeometry(0.055, 0.024, 0.055), 1.5, 0.928, 0.585),
    xform(new THREE.CylinderGeometry(0.03, 0.034, 0.1, 12), 1.5, 0.956, 0.585, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.018, 0.03, 0.026, 12), 1.437, 0.956, 0.585, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.0085, 0.0085, 0.012, 8), 1.421, 0.956, 0.585, 0, 0, Math.PI / 2)
  ], M.iron);
  desk.add(sharpBody);
  // 屑鼓（镀铬，卡在机身后半——里面看不见，更好）
  const sharpDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.06, 14), M.chrome);
  sharpDrum.rotation.z = Math.PI / 2;
  sharpDrum.position.set(1.527, 0.956, 0.585);
  desk.add(sharpDrum);
  // 摇柄（枢轴在筒轴上，绕局部 x 转）
  const crank = new THREE.Group();
  const crankArm = mergedMesh([
    xform(new THREE.CylinderGeometry(0.006, 0.006, 0.022, 8), 0.008, 0, 0, 0, 0, Math.PI / 2),
    xform(new THREE.BoxGeometry(0.012, 0.06, 0.014), 0.022, -0.024, 0)
  ], M.iron);
  const crankKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.042, 10), M.warmWood);
  crankKnob.rotation.z = Math.PI / 2;
  crankKnob.position.set(0.048, -0.05, 0);
  crank.add(crankArm, crankKnob);
  crank.position.set(1.557, 0.956, 0.585);
  desk.add(crank);
  // 木屑盘（锡皮浅盘 + 散屑卷 + 石墨粉点）
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.5, metalness: 0.6 });
  desk.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.13, 0.008, 0.09), 1.36, 0.909, 0.585),
    xform(new THREE.BoxGeometry(0.13, 0.018, 0.008), 1.36, 0.913, 0.543),
    xform(new THREE.BoxGeometry(0.13, 0.018, 0.008), 1.36, 0.913, 0.627),
    xform(new THREE.BoxGeometry(0.008, 0.018, 0.09), 1.297, 0.913, 0.585),
    xform(new THREE.BoxGeometry(0.008, 0.018, 0.09), 1.423, 0.913, 0.585)
  ], trayMat));
  const shavingMat = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.9, side: THREE.DoubleSide });
  const shavingGeos = [];
  {
    const r = rng(97);
    for (let i = 0; i < 7; i++) {
      shavingGeos.push(xform(
        new THREE.TorusGeometry(0.011, 0.0032, 5, 8, 3.6 + r() * 1.6),
        1.325 + r() * 0.075, 0.917, 0.555 + r() * 0.06,
        r() * Math.PI, r() * Math.PI, r() * Math.PI
      ));
    }
    // 石墨粉（几粒暗点沉在盘底）
    for (let i = 0; i < 5; i++) {
      shavingGeos.push(xform(new THREE.BoxGeometry(0.004, 0.002, 0.004),
        1.33 + r() * 0.06, 0.914, 0.56 + r() * 0.05, 0, r() * 3, 0));
    }
  }
  desk.add(mergedMesh(shavingGeos, shavingMat));
  // 会掉的那一枚新屑（平时藏在孔口里）
  const freshShaving = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0032, 5, 8, 4.4), shavingMat);
  freshShaving.visible = false;
  desk.add(freshShaving);
  const crankState = { t: -1, dropped: false };
  updaters.push((dt) => {
    if (crankState.t < 0) return;
    crankState.t += dt;
    const u = crankState.t;
    if (u > 2.8) { crankState.t = -1; return; }
    // 起步加速 → 渐停（与 sharpen 音色的六格棘轮同拍）
    const spd = u < 0.55 ? u / 0.55 : Math.max(0, 1 - (u - 0.55) / 1.7);
    crank.rotation.x += dt * 15 * spd;
    if (!crankState.dropped && u > 0.85) {
      crankState.dropped = true;
      freshShaving.visible = true;
    }
    if (crankState.dropped) {
      // 从孔口抛落进盘（0.5s 小抛物线 + 翻滚），落定后停在盘里
      const v = Math.min(1, (u - 0.85) / 0.5);
      freshShaving.position.set(
        1.421 - v * 0.055, 0.956 - v * v * 0.038, 0.585 - v * 0.012
      );
      freshShaving.rotation.set(v * 5.2, 0.4, v * 2.6);
    }
  });
  hotspots.add(sharpBody, {
    hint: 'E — 铅笔刀',
    onActivate: () => {
      if (crankState.t >= 0) return;
      crankState.t = 0;
      crankState.dropped = false;
      freshShaving.visible = false;
      audio.sfxAt('sharpen', -5.8, -2.9, 0.55, 3);
      later(() => ui.caption('屑是新的。笔只有一支。', 3400), 1200);
    }
  });
  desk.position.set(-6.4, 0, -1.4);
  desk.rotation.y = Math.PI / 2;
  group.add(desk);

  // 打字机（桌上；E → 敲一行）
  const tw = typewriter({ mats: M });
  tw.position.set(-6.45, 0.905, -1.6);
  tw.rotation.y = Math.PI / 2;
  group.add(tw);
  hotspots.add(tw.userData.body, {
    hint: 'E — 打字机',
    onActivate: () => {
      audio.sfx('type', 0.8);
      setTimeout(() => audio.sfx('type', 0.7), 190);
      setTimeout(() => audio.sfx('typebell', 0.6), 900);
      ui.caption('纸上只有一行。', 3000);
    }
  });

  // 地毯 v2：设计纹样（双圈镶边 + 菱形点环 + 中心章 + 磨损）+ 绒面 sheen
  const rugTex = canvasTexture(256, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#33160f';
    g.fillRect(0, 0, s, s);
    // 绒面杂色
    for (let i = 0; i < 1600; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * c;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(20,8,5,0.35)' : 'rgba(90,40,26,0.25)';
      g.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, 2);
    }
    const ring = (radius, width, style) => {
      g.strokeStyle = style;
      g.lineWidth = width;
      g.beginPath(); g.arc(c, c, radius, 0, Math.PI * 2); g.stroke();
    };
    // 外圈深色镶边 + 双细线
    ring(c * 0.94, s * 0.055, '#1c0c07');
    ring(c * 0.885, 2, '#8a6a4a');
    ring(c * 0.99, 2, '#8a6a4a');
    // 菱形点环
    g.fillStyle = '#7a5236';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const x = c + Math.cos(a) * c * 0.74;
      const y = c + Math.sin(a) * c * 0.74;
      g.save(); g.translate(x, y); g.rotate(a);
      g.beginPath(); g.moveTo(0, -5); g.lineTo(4, 0); g.lineTo(0, 5); g.lineTo(-4, 0); g.closePath(); g.fill();
      g.restore();
    }
    ring(c * 0.62, 1.6, '#5c3a24');
    // 中心章：同心菱形
    g.strokeStyle = '#8a6a4a';
    g.lineWidth = 2;
    for (const k of [0.3, 0.2, 0.1]) {
      g.beginPath();
      g.moveTo(c, c - c * k); g.lineTo(c + c * k, c); g.lineTo(c, c + c * k); g.lineTo(c - c * k, c);
      g.closePath(); g.stroke();
    }
    // 磨损亮斑（脚踩处）
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * c * 0.5;
      const grd = g.createRadialGradient(c + Math.cos(a) * r, c + Math.sin(a) * r, 2, c + Math.cos(a) * r, c + Math.sin(a) * r, 22);
      grd.addColorStop(0, 'rgba(140,90,60,0.16)');
      grd.addColorStop(1, 'rgba(140,90,60,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    }
  });
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 34),
    new THREE.MeshPhysicalMaterial({
      map: rugTex, roughness: 0.92, sheen: 0.55, sheenColor: new THREE.Color(0xb08060),
      sheenRoughness: 0.8, bumpMap: noiseCanvasTexture(64, 120, 60, 8), bumpScale: 0.35
    })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-1.5, 0.012, -0.5);
  group.add(rug);

  // 读书角：俱乐部椅 + 书架（合并的书脊）
  const chair = clubChair(0x2c1a10, { mats: M });
  chair.position.set(-3.2, 0, 2.6);
  chair.rotation.y = -0.7;
  group.add(chair);
  const shelfUnit = new THREE.Group();
  const shelfFrame = roundedBoxMesh(1.7, 2.5, 0.34, 0.03, caseWood);
  shelfFrame.position.y = 1.25;
  shelfUnit.add(shelfFrame);
  const bookGeos = [];
  for (let row = 0; row < 4; row++) {
    let bx = -0.7;
    while (bx < 0.66) {
      const bw = 0.05 + Math.random() * 0.06;
      const bh = 0.26 + Math.random() * 0.1;
      const geo = new THREE.BoxGeometry(bw, bh, 0.2);
      bookGeos.push(xform(geo, bx + bw / 2, 0.42 + row * 0.56 + bh / 2, 0.1, 0, 0, (Math.random() - 0.5) * 0.06));
      geo.dispose();
      bx += bw + 0.012;
    }
  }
  const books = mergedMesh(bookGeos, new THREE.MeshStandardMaterial({
    map: canvasTexture(64, (g, s) => {
      const cols = ['#5c2c1a', '#1c2c44', '#44341c', '#2c1c2c', '#1c3428'];
      for (let i = 0; i < 12; i++) {
        g.fillStyle = cols[i % cols.length];
        g.fillRect((i / 12) * s, 0, s / 12 + 1, s);
      }
    }),
    roughness: 0.8
  }));
  shelfUnit.add(books);
  shelfUnit.position.set(-1.2, 0, 6.25);
  shelfUnit.rotation.y = Math.PI;
  group.add(shelfUnit);

  // 唱机矮柜 + 唱机（E → 放一张唱片：唱臂摆入 + 黑胶转 + 深夜爵士）
  const ttConsole = roundedBoxMesh(1.2, 0.55, 0.5, 0.03, caseWood);
  ttConsole.position.set(2.8, 0.275, 6.1);
  group.add(ttConsole);
  const tt = turntable({ mats: M });
  tt.position.set(2.8, 0.55, 6.05);
  tt.rotation.y = Math.PI;
  group.add(tt);
  const ttState = { playing: false, armIn: 0, crackleT: 0 };
  updaters.push((dt) => {
    ttState.armIn += ((ttState.playing ? 1 : 0) - ttState.armIn) * Math.min(1, dt * 2.4);
    tt.userData.arm.rotation.y = ttState.armIn * -0.5;
    if (ttState.playing) {
      tt.userData.record.rotation.y -= dt * 3.5;
      // 黑胶底噪：间歇一小段尘埃嘶声 + 爆点（位置化在唱机上）
      ttState.crackleT -= dt;
      if (ttState.crackleT <= 0) {
        audio.sfxAt('vinyl', 2.8, 6.05, 0.5);
        ttState.crackleT = 1.5 + Math.random() * 0.9;
      }
    }
  });
  hotspots.add(tt.userData.record, {
    hint: 'E — 放一张唱片',
    onActivate: () => {
      ttState.playing = !ttState.playing;
      narration.jazz.setEnabled(ttState.playing);
      audio.sfx(ttState.playing ? 'chime' : 'thud', 0.5);
      if (ttState.playing) ui.caption('针尖落进沟槽。', 3000);
    }
  });

  // v1.4 五遍：节拍器（唱机矮柜左端）——方锥台身 + 摆杆/滑锤 + 侧发条钥匙。
  // E → 摆起来嗒嗒数拍，八拍后停在半拍上（不在正中——时间卡住了）
  const metro = new THREE.Group();
  const metroBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.088, 0.26, 4, 1),
    woodPbr({ base: [56, 34, 16], planks: 1, size: 128, seed: 53, gloss: 0.6 })
  );
  metroBody.rotation.y = Math.PI / 4;
  metroBody.position.y = 0.13;
  metro.add(metroBody);
  metro.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.19, 0.022, 0.19), 0, 0.011, 0),
    xform(new THREE.BoxGeometry(0.07, 0.016, 0.02), 0, 0.262, 0),
    // 侧发条钥匙（杆 + 翼片）
    xform(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6), 0.075, 0.1, 0, 0, 0, Math.PI / 2),
    xform(new THREE.BoxGeometry(0.012, 0.034, 0.008), 0.093, 0.1, 0)
  ], M.brass));
  const metroPend = new THREE.Group();
  metroPend.position.set(0, 0.045, 0.056);
  metroPend.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.0045, 0.0045, 0.2, 6), 0, 0.1, 0),
    xform(new THREE.BoxGeometry(0.032, 0.022, 0.008), 0, 0.152, 0), // 滑锤
    xform(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10), 0, -0.02, 0) // 配重
  ], new THREE.MeshStandardMaterial({ color: 0xc9cdd4, roughness: 0.3, metalness: 0.85 })));
  metro.add(metroPend);
  metro.position.set(2.32, 0.55, 6.18);
  metro.rotation.y = Math.PI + 0.28; // 偏一点脸，让受光面朝屋里
  group.add(metro);
  // 状态机：phase 累积；8 个半拍后冻在 (n+0.25)π——半拍上、偏着。
  // 初始态就冻在半拍：你发现它时摆杆已经歪着停住了
  const metroState = { on: false, phase: Math.PI * 1.25, ticks: 0, amp: 1 };
  const METRO_W = Math.PI / 0.42; // 半拍 0.42s
  updaters.push((dt) => {
    if (metroState.on) {
      const prev = metroState.phase;
      metroState.phase += dt * METRO_W;
      metroState.amp = Math.min(1, metroState.amp + dt * 3);
      // 每过半拍（sin 极值点 = phase 过 (n+0.5)π）嗒一声
      const k0 = Math.floor(prev / Math.PI - 0.5);
      const k1 = Math.floor(metroState.phase / Math.PI - 0.5);
      if (k1 > k0) {
        metroState.ticks += 1;
        audio.sfxAt('click', 2.32 + (metroState.ticks % 2 ? 0.5 : -0.5), 6.18, 0.24, 4);
        if (metroState.ticks >= 8) {
          // 冻在下一个 (n+0.25)π：过零后爬升到 0.707A 的地方
          metroState.on = false;
          metroState.phase = (Math.floor(metroState.phase / Math.PI) + 1.25) * Math.PI;
          setTimeout(() => ui.caption('它停在半拍上。', 3800), 600);
        }
      }
    }
    metroPend.rotation.z = Math.sin(metroState.phase) * 0.5 * metroState.amp;
  });
  hotspots.add(metroBody, {
    hint: 'E — 节拍器',
    onActivate: () => {
      if (metroState.on) return;
      metroState.on = true;
      metroState.ticks = 0;
      audio.sfxAt('ratchet', 2.32, 6.18, 0.3, 3);
    }
  });

  // 吊扇（拉链 → 转/停）
  const fan = ceilingFan({ mats: M });
  fan.position.set(0.4, H, 0.8);
  group.add(fan);
  const fanState = { speed: 0.6 };
  updaters.push((dt) => { fan.userData.bladeHub.rotation.y += dt * fanState.speed * 3.2; });
  hotspots.add(fan.userData.pull, {
    hint: 'E — 吊扇拉链',
    onActivate: () => {
      fanState.speed = fanState.speed > 0.3 ? 0.03 : 0.6;
      audio.sfx('click', 0.7);
    }
  });

  // 窗（可调百叶 + 夜雨玻璃，东墙）——E 拨开叶片，夜色和雨痕进来
  const windowGroup = new THREE.Group();
  const winFrame = roundedBoxMesh(0.1, 1.7, 1.5, 0.02, caseWood);
  winFrame.position.set(W / 2 - 0.05, 2.1, -3.4);
  const nightTex = canvasTexture(256, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#0a1220');
    grad.addColorStop(0.68, '#182640');
    grad.addColorStop(0.78, '#2c3e5a');
    grad.addColorStop(1, '#0b121c');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(150,180,220,0.3)';
    g.fillRect(0, s * 0.78, s, 2);
    // 远树/屋脊剪影
    g.fillStyle = 'rgba(3,6,11,0.95)';
    const r = rng(21);
    let x = 0;
    while (x < s) {
      const w = 14 + r() * 30;
      const h = s * (0.06 + r() * 0.13);
      g.fillRect(x, s * 0.8 - h, w, h + s * 0.2);
      x += w;
    }
    // 玻璃上的斜雨痕
    g.strokeStyle = 'rgba(190,212,238,0.15)';
    for (let i = 0; i < 44; i++) {
      const rx = r() * s;
      const ry = r() * s;
      const len = 10 + r() * 26;
      g.lineWidth = 0.6 + r() * 0.9;
      g.beginPath();
      g.moveTo(rx, ry);
      g.lineTo(rx - len * 0.18, ry + len);
      g.stroke();
    }
  });
  const winGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.5),
    new THREE.MeshStandardMaterial({
      color: 0x060a12, emissive: 0xffffff, emissiveMap: nightTex, emissiveIntensity: 0.5
    })
  );
  winGlow.position.set(W / 2 - 0.11, 2.1, -3.4);
  winGlow.rotation.y = -Math.PI / 2;
  // 百叶：12 片独立叶（共几何/共材质），绕长轴倾转——不再是合并死件
  const blinds = new THREE.Group();
  const slatGeo = new THREE.BoxGeometry(0.055, 0.012, 1.32);
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x201812, roughness: 0.7 });
  const slats = [];
  for (let i = 0; i < 12; i++) {
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.position.y = i * 0.125;
    slat.rotation.z = 1.12;
    blinds.add(slat);
    slats.push(slat);
  }
  blinds.position.set(W / 2 - 0.16, 1.42, -3.4);
  // 调叶木棒（垂在窗侧的细杆——射线靶不用打叶片）
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.5, 8), caseWood);
  wand.position.set(W / 2 - 0.2, 1.7, -2.72);
  const winHit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.7, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x000000 }));
  winHit.visible = false;
  winHit.position.set(W / 2 - 0.16, 2.1, -3.4);
  const moonSliver = new THREE.PointLight(0x8ea6c9, 2.4, 7, 1.9);
  moonSliver.position.set(W / 2 - 0.8, 2.1, -3.4);
  // v1.4 P3 窗雨强化：流动雨珠层（UV 下滚 + 亮珠头拖尾，叠加混合）
  const dropTex = canvasTexture(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const r = rng(52);
    for (let i = 0; i < 26; i++) {
      const x = r() * s;
      const y = r() * s;
      const len = 5 + r() * 18;
      const grad = g.createLinearGradient(x, y - len, x, y);
      grad.addColorStop(0, 'rgba(200,224,255,0)');
      grad.addColorStop(0.8, 'rgba(200,224,255,0.26)');
      grad.addColorStop(1, 'rgba(234,246,255,0.5)');
      g.fillStyle = grad;
      g.fillRect(x - 0.7, y - len, 1.5, len);
      g.fillStyle = 'rgba(234,246,255,0.55)';
      g.fillRect(x - 1, y, 2.2, 2.6);
    }
  });
  const rainLayer = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.5),
    new THREE.MeshBasicMaterial({
      map: dropTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  rainLayer.position.set(W / 2 - 0.105, 2.1, -3.4);
  rainLayer.rotation.y = -Math.PI / 2;
  // v1.9 件 1：玻璃内侧凝雾 + 一道擦痕——屋里比外面暖，水汽爬满内壁，
  // 角落最厚；有人用手背横着擦开过一道弧，弧的低端挂着两条流下来的水。
  // （擦它的人不在了。E → 一只手印在雾里浮现又退去。）
  const fogTex = canvasTexture(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    const r = rng(83);
    // 凝雾本体：中央薄、四角厚（呼吸留在玻璃上的形状）
    for (let i = 0; i < 130; i++) {
      const x = r() * s;
      const y = r() * s;
      const dx = Math.abs(x - s / 2) / (s / 2);
      const dy = Math.abs(y - s / 2) / (s / 2);
      const edge = Math.min(1, dx * dx + dy * dy + 0.22);
      const rad = 14 + r() * 30;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(220,230,240,${(0.21 * edge).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(220,230,240,0)');
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // 微小凝珠（雾里析出的亮点，越靠边越密）
    for (let i = 0; i < 260; i++) {
      const x = r() * s;
      const y = r() * s;
      const dx = Math.abs(x - s / 2) / (s / 2);
      if (r() > dx + 0.3) continue;
      g.fillStyle = `rgba(232,242,250,${0.1 + r() * 0.2})`;
      g.fillRect(x, y, 1 + r(), 1 + r());
    }
    // 一道擦痕：手背横扫的弧（三笔渐宽的 destination-out，边缘软）
    g.globalCompositeOperation = 'destination-out';
    for (const [lw, al] of [[54, 1], [68, 0.55], [84, 0.26]]) {
      g.strokeStyle = `rgba(0,0,0,${al})`;
      g.lineWidth = lw;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(s * 0.46, s * 1.06, s * 0.62, -Math.PI * 0.78, -Math.PI * 0.3);
      g.stroke();
    }
    // 擦痕低端积水往下流的两条（一长一短）
    for (const [x0, len, w2] of [[s * 0.71, s * 0.34, 3.4], [s * 0.62, s * 0.18, 2.2]]) {
      const grad = g.createLinearGradient(0, s * 0.62, 0, s * 0.62 + len);
      grad.addColorStop(0, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x0 - w2 / 2, s * 0.6, w2, len);
    }
    g.globalCompositeOperation = 'source-over';
  });
  const fogLayer = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.5),
    new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0, depthWrite: false })
  );
  fogLayer.position.set(W / 2 - 0.118, 2.1, -3.4);
  fogLayer.rotation.y = -Math.PI / 2;
  // 幽灵手印（比你的手高一掌的位置；平时不可见）
  const palmTex = canvasTexture(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const soft = (x, y, rx, ry) => {
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      const grad = g.createRadialGradient(0, 0, rx * 0.3, 0, 0, rx);
      grad.addColorStop(0, 'rgba(225,236,246,0.5)');
      grad.addColorStop(1, 'rgba(225,236,246,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
    };
    soft(s * 0.5, s * 0.66, 26, 30); // 掌心
    const fingers = [[0.3, 0.34, 9, 22], [0.44, 0.26, 9, 26], [0.58, 0.25, 9, 27], [0.7, 0.32, 8, 21]];
    for (const [fx, fy, rx, ry] of fingers) soft(s * fx, s * fy, rx, ry);
    soft(s * 0.24, 0.62 * s, 9, 16); // 拇指
  });
  const palm = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshBasicMaterial({ map: palmTex, transparent: true, opacity: 0, depthWrite: false })
  );
  palm.position.set(W / 2 - 0.122, 2.3, -3.5);
  palm.rotation.y = -Math.PI / 2;
  const wipeState = { t: -1, cool: 0 };
  // 射线靶要立在整窗 winHit 盒的近面之前，否则永远打不到
  const wipeHit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x000000 }));
  wipeHit.visible = false;
  wipeHit.position.set(W / 2 - 0.33, 2.2, -3.42);
  windowGroup.add(fogLayer, palm, wipeHit);
  updaters.push((dt) => {
    if (wipeState.cool > 0) wipeState.cool -= dt;
    if (wipeState.t < 0) return;
    wipeState.t += dt;
    const u = wipeState.t;
    if (u > 4.2) { wipeState.t = -1; palm.material.opacity = 0; return; }
    // 0.5s 浮现 → 停 1.6s → 慢慢退回雾里
    palm.material.opacity = u < 0.5 ? (u / 0.5) * 0.42
      : u < 2.1 ? 0.42
        : Math.max(0, 0.42 * (1 - (u - 2.1) / 2.1));
  });
  hotspots.add(wipeHit, {
    hint: 'E — 玻璃上的擦痕',
    onActivate: () => {
      if (wipeState.cool > 0) return;
      wipeState.cool = 6;
      wipeState.t = 0;
      audio.sfxAt('glasswipe', W / 2, -3.3, 0.5, 3);
      later(() => ui.caption('擦它的人比你高。', 3400), 900);
    }
  });
  windowGroup.add(winFrame, winGlow, blinds, wand, winHit, moonSliver, rainLayer);
  group.add(windowGroup);
  const blindState = { open: false, v: 0, rainT: 99, flash: 0 };
  updaters.push((dt) => {
    blindState.v += ((blindState.open ? 1 : 0) - blindState.v) * Math.min(1, dt * 3.2);
    const tilt = 1.12 - blindState.v * 1.0;
    for (const slat of slats) slat.rotation.z = tilt;
    // 雨珠沿玻璃下滑；偶发一记远处闪电（只在叶片开着时看得见）
    dropTex.offset.y -= dt * 0.14;
    rainLayer.material.opacity += (blindState.v * 0.85 - rainLayer.material.opacity) * Math.min(1, dt * 3);
    blindState.flash = Math.max(0, blindState.flash - dt * 3.2);
    if (blindState.v > 0.5 && Math.random() < dt * 0.045) {
      blindState.flash = 1;
      // v1.4 阶段 5：闪电之后隔 0.7–2.1s 传来远雷，越迟越远越轻（声画距离感）
      const delayS = 0.7 + Math.random() * 1.4;
      setTimeout(() => audio.sfxAt('thunder', W / 2, -3.4, 0.75 - delayS * 0.24, 10), delayS * 1000);
    }
    winGlow.material.emissiveIntensity = 0.5 + blindState.v * 0.75 + blindState.flash * 2.2;
    moonSliver.intensity = 2.4 + blindState.v * 3.2 + blindState.flash * 9;
    // 凝雾只在叶片开着时看得见；随厅呼吸微涨落（屋里的暖气也在呼吸）
    fogLayer.material.opacity = blindState.v * (0.5 + (engine.breath || 0) * 0.1);
    // 叶片开着时从窗那边叠续雨声坡（3.4s 音长 / 2s 重触发 → 连成雨幕）
    if (blindState.v > 0.35) {
      blindState.rainT += dt;
      if (blindState.rainT > 2.0) {
        blindState.rainT = 0;
        audio.sfxAt('rain', W / 2, -3.4, 0.5 * blindState.v, 7);
      }
    }
  });
  hotspots.add(winHit, {
    hint: 'E — 窗百叶',
    onActivate: () => {
      blindState.open = !blindState.open;
      audio.sfxAt('creak', W / 2 - 0.2, -3.4, 0.4, 3);
      if (blindState.open) ui.caption('外面在下雨。', 3200);
    }
  });

  // 墙上的两幅暗色抽象画（原创程序化）
  for (const [z, seed] of [[1.2, 3], [4.0, 8]]) {
    const art = roundedBoxMesh(0.9, 1.1, 0.05, 0.015,
      new THREE.MeshStandardMaterial({
        map: canvasTexture(256, (g, s) => {
          g.fillStyle = '#0c0908';
          g.fillRect(0, 0, s, s);
          for (let i = 0; i < 30; i++) {
            const a = seed + i * 0.7;
            g.strokeStyle = `rgba(${140 + Math.sin(a) * 60},${120 + Math.cos(a) * 40},${100},${0.1 + Math.random() * 0.12})`;
            g.lineWidth = 2 + Math.random() * 8;
            g.beginPath();
            g.moveTo(Math.random() * s, Math.random() * s);
            g.bezierCurveTo(Math.random() * s, Math.random() * s, Math.random() * s, Math.random() * s, Math.random() * s, Math.random() * s);
            g.stroke();
          }
          g.strokeStyle = '#3a2c1a';
          g.lineWidth = 10;
          g.strokeRect(5, 5, s - 10, s - 10);
        }),
        roughness: 0.75, emissive: 0xffffff, emissiveIntensity: 0.03
      }));
    art.position.set(-W / 2 + 0.08, 2.4, z);
    art.rotation.y = Math.PI / 2;
    group.add(art);
  }

  // 工作台灯 v2（重底座 + 弹簧臂 + 绿铝罩；可开关 — 交互①）
  const lampState = { on: 1 };
  const lamp = angleLamp({ shadeColor: 0x1c4232, mats: M });
  lamp.position.set(-6.55, 0.905, -2.35);
  lamp.rotation.y = Math.PI / 2 + 0.6;
  group.add(lamp);
  updaters.push((dt, t) => {
    const f = (1 + Math.sin(t * 7.2) * 0.05) * lampState.on;
    lamp.userData.light.intensity = 5 * f;
    lamp.userData.bulbMat.emissiveIntensity = 3 * Math.max(0.03, f);
  });
  hotspots.add(lamp.userData.shade, {
    hint: 'E — 台灯（他的绿罩台灯）',
    onActivate: () => {
      lampState.on = lampState.on ? 0 : 1;
      audio.sfx(lampState.on ? 'lampon' : 'lampoff');
      ui.caption(lampState.on ? '台灯亮了。' : '台灯灭了。', 2400);
    }
  });

  // 顶灯（可开关 — 交互②，墙上开关）
  const ceilState = { on: 1 };
  const ceilBulbs = [];
  for (const [x, z] of [[-2.5, 0.5], [3.2, 1.5]]) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffe6c0, emissiveIntensity: 2.6 })
    );
    bulb.position.set(x, H - 0.5, z);
    const light = new THREE.PointLight(0xffe6c0, 7, 14, 1.8);
    light.position.set(x, H - 0.6, z);
    group.add(bulb, light);
    ceilBulbs.push({ bulb, light });
  }
  updaters.push(() => {
    for (const { bulb, light } of ceilBulbs) {
      light.intensity = 7 * ceilState.on;
      bulb.material.emissiveIntensity = 2.6 * Math.max(0.03, ceilState.on);
    }
  });
  const wallSwitch = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.2, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.5, emissive: 0xd9cfc0, emissiveIntensity: 0.15 })
  );
  wallSwitch.position.set(-2.2, 1.5, 6.44);
  group.add(wallSwitch);
  hotspots.add(wallSwitch, {
    hint: 'E — 墙上的电灯开关',
    onActivate: () => {
      ceilState.on = ceilState.on ? 0 : 1;
      audio.sfx('switch', 0.5);
      audio.sfx(ceilState.on ? 'lampon' : 'lampoff', 0.4);
      ui.caption(ceilState.on ? '顶灯回来了。' : '只剩台灯了。', 2400);
    }
  });

  // 叙事链：咖啡 → 香烟 → 天气（60 秒内按顺序完成）
  const chain = { step: 0, t: 0 };
  updaters.push((dt) => { if (chain.step > 0 && chain.step < 3) { chain.t += dt; if (chain.t > 60) { chain.step = 0; chain.t = 0; } } });

  // 咖啡杯（交互③）
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.06, 0.11, 14),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.35 })
  );
  mug.position.set(-6.3, 0.965, -0.7);
  group.add(mug);
  const mugSteam = smokeLayer(6, { x: 0.08, z: 0.08 }, { opacity: 0.07, size: 0.4, yBase: 1.05, ySpread: 0.4, color: 0xffffff });
  mugSteam.position.set(-6.3, 0, -0.7);
  group.add(mugSteam);
  updaters.push(mugSteam.userData.update);
  hotspots.add(mug, {
    hint: 'E — 一杯很烫的咖啡',
    onActivate: () => {
      audio.sfx('sip');
      if (chain.step === 0) { chain.step = 1; chain.t = 0; }
      ui.caption('「再难喝的咖啡，也好过没有咖啡。」', 3600);
    }
  });

  // 烟灰缸与香烟（交互④：点燃/掐灭）
  const smokeState = { lit: 0 };
  const tray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.035, 12),
    new THREE.MeshStandardMaterial({ color: 0x36322c, roughness: 0.4, metalness: 0.5 })
  );
  tray.position.set(-6.55, 0.93, 0.1);
  const cig = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.7 })
  );
  cig.position.set(-6.52, 0.96, 0.1);
  cig.rotation.z = 1.35;
  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.011, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff5e2c, emissiveIntensity: 0 })
  );
  ember.position.set(-6.45, 0.978, 0.1);
  group.add(tray, cig, ember);
  const cigSmoke = smokeLayer(10, { x: 0.1, z: 0.1 }, { opacity: 0, size: 0.55, yBase: 1.0, ySpread: 1.3, color: 0xcfd4da });
  cigSmoke.position.set(-6.45, 0, 0.1);
  group.add(cigSmoke);
  updaters.push(cigSmoke.userData.update);
  updaters.push((dt, t) => {
    ember.material.emissiveIntensity = smokeState.lit * (2.2 + Math.sin(t * 3.1) * 0.9);
    cigSmoke.material.opacity += ((smokeState.lit * 0.07) - cigSmoke.material.opacity) * Math.min(1, dt * 2);
  });
  hotspots.add(tray, {
    hint: 'E — 烟灰缸（点燃 / 掐灭）',
    onActivate: () => {
      smokeState.lit = smokeState.lit ? 0 : 1;
      audio.sfx(smokeState.lit ? 'strike' : 'thud', 0.6);
      if (smokeState.lit && chain.step === 1) chain.step = 2;
      ui.caption(smokeState.lit ? '一缕烟升起来。' : '烟掐灭了。', 2600);
    }
  });

  // 画架（交互⑤：看他画画）
  const easel = new THREE.Group();
  const legMat = new THREE.MeshStandardMaterial({ color: 0x241708, roughness: 0.8 });
  for (const [rz, dx] of [[0.22, -0.4], [-0.22, 0.4], [0, 0]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 2.1, 6), legMat);
    leg.position.set(dx, 1.05, rz === 0 ? -0.35 : 0);
    leg.rotation.z = rz;
    leg.rotation.x = rz === 0 ? -0.3 : 0;
    easel.add(leg);
  }
  // v1.3 艺术三遍：画架补齐工作件——托板/横撑/顶夹 + 抹布 + 笔筒
  const easelWoodGeos = [
    xform(new THREE.BoxGeometry(0.84, 0.045, 0.11), 0, 0.72, 0.115, -0.08, 0, 0),  // 托板
    xform(new THREE.BoxGeometry(0.84, 0.03, 0.02), 0, 0.745, 0.165, -0.08, 0, 0),  // 托板前唇
    xform(new THREE.BoxGeometry(0.62, 0.05, 0.04), 0, 0.42, 0.02),                  // 前腿横撑
    xform(new THREE.BoxGeometry(0.1, 0.07, 0.06), 0, 1.98, 0.1, -0.08, 0, 0)        // 顶夹块
  ];
  easel.add(mergedMesh(easelWoodGeos, legMat));
  // 沾了颜料的抹布（搭在托板左端）
  const ragMat = new THREE.MeshStandardMaterial({ color: 0xb9ab92, roughness: 0.95 });
  const rag = mergedMesh([
    xform(new THREE.BoxGeometry(0.17, 0.016, 0.12), -0.28, 0.755, 0.12, -0.08, 0, 0.06),
    xform(new THREE.BoxGeometry(0.16, 0.2, 0.012), -0.28, 0.65, 0.18, -0.12, 0, -0.05)
  ], ragMat);
  easel.add(rag);
  // 笔筒 + 三支笔（托板右端）
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.038, 0.13, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 0.5, metalness: 0.4 })
  );
  cup.position.set(0.3, 0.81, 0.12);
  easel.add(cup);
  const brushGeos = [
    xform(new THREE.CylinderGeometry(0.006, 0.008, 0.24, 6), 0.285, 0.93, 0.11, 0.12, 0, 0.1),
    xform(new THREE.CylinderGeometry(0.006, 0.008, 0.21, 6), 0.31, 0.91, 0.13, -0.1, 0, -0.14),
    xform(new THREE.CylinderGeometry(0.006, 0.008, 0.27, 6), 0.3, 0.94, 0.12, 0.02, 0, 0.22)
  ];
  easel.add(mergedMesh(brushGeos, new THREE.MeshStandardMaterial({ color: 0x8a5c30, roughness: 0.7 })));

  const paintState = { painting: false, progress: 0 };
  const paintCanvasEl = document.createElement('canvas');
  paintCanvasEl.width = paintCanvasEl.height = 256;
  const pg = paintCanvasEl.getContext('2d');
  pg.fillStyle = '#0c0a09';
  pg.fillRect(0, 0, 256, 256);
  const paintTex = new THREE.CanvasTexture(paintCanvasEl);
  const canvasMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.2, 0.04),
    new THREE.MeshStandardMaterial({ map: paintTex, roughness: 0.85, emissive: 0xffffff, emissiveMap: paintTex, emissiveIntensity: 0.12 })
  );
  canvasMesh.position.set(0, 1.35, 0.06);
  canvasMesh.rotation.x = -0.08;
  easel.add(canvasMesh);
  easel.position.set(-4.6, 0, -4.6);
  easel.rotation.y = 0.85;
  group.add(easel);
  updaters.push((dt) => {
    if (!paintState.painting) return;
    paintState.progress += dt;
    // 黑底上长出浓稠的原创抽象形体（每帧几笔）
    for (let i = 0; i < 3; i++) {
      const a = paintState.progress * 0.9 + i;
      const x = 128 + Math.cos(a * 2.3) * (30 + paintState.progress * 8);
      const y = 128 + Math.sin(a * 1.7) * (26 + paintState.progress * 7);
      pg.fillStyle = `rgba(${180 + Math.random() * 60},${170 + Math.random() * 40},${150 + Math.random() * 30},0.05)`;
      pg.beginPath();
      pg.arc(x % 256, y % 256, 5 + Math.random() * 14, 0, 7);
      pg.fill();
    }
    paintTex.needsUpdate = true;
    if (paintState.progress > 9) paintState.painting = false;
  });
  hotspots.add(canvasMesh, {
    hint: 'E — 画架上的画（未完成）',
    onActivate: () => {
      if (!paintState.painting) {
        paintState.painting = true;
        paintState.progress = 0;
        audio.sfx('curtain', 0.4);
        ui.caption('画开始自己生长。', 3000);
      }
    }
  });

  // ---------- v1.4 P3：颜料台（画架旁的小推台）----------
  // 台面/下层板/四腿 + 调色板（六坨顶点色颜料 + 可长出的新颜料）
  // + 调色刀组 ×3（铬刀身/木柄分材质合并）+ 颜料管 ×4（一支立着）+ 洗笔罐
  const cart = new THREE.Group();
  const cartTop = roundedBoxMesh(0.85, 0.05, 0.55, 0.015, caseWood);
  cartTop.position.y = 0.74;
  const cartShelf = roundedBoxMesh(0.78, 0.04, 0.48, 0.01, caseWood);
  cartShelf.position.y = 0.28;
  const cartLegGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.74, 8);
  const cartLegs = mergedMesh([
    xform(cartLegGeo, -0.38, 0.37, -0.22), xform(cartLegGeo, 0.38, 0.37, -0.22),
    xform(cartLegGeo, -0.38, 0.37, 0.22), xform(cartLegGeo, 0.38, 0.37, 0.22)
  ], caseWood);
  cartLegGeo.dispose();
  cart.add(cartTop, cartShelf, cartLegs);
  // 调色板（薄椭圆木板）
  const paletteGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.012, 20);
  paletteGeo.scale(1.25, 1, 0.85);
  const palette = new THREE.Mesh(paletteGeo, new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [96, 74, 44], planks: 1, size: 128 }), roughness: 0.6
  }));
  palette.position.set(-0.18, 0.775, -0.02);
  palette.rotation.y = 0.3;
  cart.add(palette);
  // 颜料坨（顶点色合并单 mesh：镉红/赭石/象牙/深褐/蓝黑/翠绿 + 颜料管口小帽）
  const daubGeos = [];
  const addDaub = (x, y, z, hex, r = 0.016) => {
    const dgeo = new THREE.SphereGeometry(r, 8, 6);
    dgeo.scale(1, 0.5, 1);
    const g2 = xform(dgeo, x, y, z);
    dgeo.dispose();
    const col = new THREE.Color(hex);
    const n = g2.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b;
    }
    g2.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    daubGeos.push(g2);
  };
  const daubCols = [0xb22218, 0xc08a2a, 0xe8e0cc, 0x4a3018, 0x1a2232, 0x1e5038];
  daubCols.forEach((hex, i) => {
    const a = 0.6 + (i / 6) * Math.PI * 1.5;
    addDaub(-0.18 + Math.cos(a) * 0.115, 0.787, -0.02 + Math.sin(a) * 0.08, hex);
  });
  // 调色刀组：铬刀身 + 木柄（两组材质各一合并）
  const bladeGeo = new THREE.BoxGeometry(0.028, 0.003, 0.1);
  const handleGeo = new THREE.CylinderGeometry(0.008, 0.01, 0.07, 8);
  cart.add(mergedMesh([
    xform(bladeGeo, 0.22, 0.77, -0.13, 0, 0.4, 0),
    xform(bladeGeo, 0.26, 0.77, -0.04, 0, 0.1, 0),
    xform(bladeGeo, 0.24, 0.77, 0.06, 0, -0.25, 0)
  ], M.chrome));
  cart.add(mergedMesh([
    xform(handleGeo, 0.28, 0.775, -0.155, Math.PI / 2, 0, -0.4),
    xform(handleGeo, 0.335, 0.775, -0.047, Math.PI / 2, 0, -0.1),
    xform(handleGeo, 0.295, 0.775, 0.078, Math.PI / 2, 0, 0.25)
  ], new THREE.MeshStandardMaterial({ color: 0x241708, roughness: 0.7 })));
  bladeGeo.dispose();
  handleGeo.dispose();
  // 颜料管 ×4（三躺一立；躺管带压瘪尾）+ 管口小色帽并入顶点色 mesh
  const tubeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.085, 10);
  const tailGeo = new THREE.BoxGeometry(0.03, 0.005, 0.015);
  cart.add(mergedMesh([
    xform(tubeGeo, 0.02, 0.782, 0.17, Math.PI / 2, 0, 0.3),
    xform(tailGeo, 0.035, 0.782, 0.215, 0, 0.3, 0),
    xform(tubeGeo, -0.08, 0.782, 0.19, Math.PI / 2, 0, -0.5),
    xform(tailGeo, -0.105, 0.782, 0.23, 0, -0.5, 0),
    xform(tubeGeo, 0.1, 0.782, 0.21, Math.PI / 2, 0, 0.9),
    xform(tailGeo, 0.06, 0.782, 0.24, 0, 0.9, 0),
    xform(tubeGeo, -0.32, 0.807, 0.19)
  ], M.chrome));
  tubeGeo.dispose();
  tailGeo.dispose();
  addDaub(0.006, 0.782, 0.129, 0xb22218, 0.011);
  addDaub(-0.067, 0.782, 0.152, 0x1e5038, 0.011);
  addDaub(0.126, 0.782, 0.194, 0x1a2232, 0.011);
  cart.add(mergedMesh(daubGeos, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.3, envMapIntensity: 0.9
  })));
  // 洗笔罐（玻璃 + 浑浊的水）
  const jar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.046, 0.14, 12),
    new THREE.MeshPhysicalMaterial({
      color: 0xcfe0e8, transparent: true, opacity: 0.22, roughness: 0.08, envMapIntensity: 1.4
    })
  );
  jar.position.set(-0.33, 0.84, -0.16);
  const murk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.042, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.4, transparent: true, opacity: 0.9 })
  );
  murk.position.set(-0.33, 0.818, -0.16);
  cart.add(jar, murk);
  // 新颜料（E → 在调色板中心长出一坨没干的颜色）
  const freshDaub = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4243c, roughness: 0.22 })
  );
  freshDaub.scale.set(0.001, 0.0005, 0.001);
  freshDaub.position.set(-0.18, 0.782, -0.02);
  cart.add(freshDaub);
  const freshState = { t: -1, idx: 0 };
  updaters.push((dt) => {
    if (freshState.t < 0) return;
    freshState.t = Math.min(1, freshState.t + dt * 2.4);
    const k = 1 - Math.pow(1 - freshState.t, 3);
    freshDaub.scale.set(k, k * 0.5, k);
  });
  cart.position.set(-5.8, 0, -5.45);
  cart.rotation.y = 0.5;
  group.add(cart);

  // v1.4 二遍：画角生活层——①靠墙斜倚的画布堆（两幅背面朝外：
  // 松木内框+十字撑+生亚麻布背；一幅小的正面朝外：近黑抽象、只一抹苍白）
  const stretcherMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [96, 74, 48], planks: 1, size: 128 }), roughness: 0.85
  });
  const linenTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#b6a888';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(88,76,54,0.28)';
    g.lineWidth = 1;
    for (let i = 0; i < s; i += 3) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke();
    }
    // 边角的钉痕与污渍
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(70,58,40,${0.1 + Math.random() * 0.2})`;
      g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 5, 1 + Math.random() * 3);
    }
  });
  const linenMat = new THREE.MeshStandardMaterial({ map: linenTex, roughness: 0.95 });
  const stackFrames = [];
  const stackBacks = [];
  // [宽, 高, z 位置, 斜倚角]（西墙 x=-8.25，顶靠墙底脚外移；第二幅更陡搭在第一幅上）
  for (const [cw, ch, cz, lean] of [[1.15, 1.45, -3.05, 0.2], [0.95, 1.25, -2.9, 0.34]]) {
    const cx = -8.23 + Math.sin(lean) * ch * 0.5;
    const bar = 0.05;
    const geos = [
      xform(new THREE.BoxGeometry(bar, ch, 0.04), 0, 0, 0),
      xform(new THREE.BoxGeometry(bar, ch, 0.04), 0, 0, cw - bar),
      xform(new THREE.BoxGeometry(bar, 0.04, cw - 2 * bar), 0, ch / 2 - 0.02, (cw - bar) / 2),
      xform(new THREE.BoxGeometry(bar, 0.04, cw - 2 * bar), 0, -ch / 2 + 0.02, (cw - bar) / 2),
      xform(new THREE.BoxGeometry(bar * 0.8, 0.04, cw - 2 * bar), 0, 0, (cw - bar) / 2)
    ];
    for (const gg of geos) {
      gg.rotateZ(lean);
      gg.translate(cx, ch * 0.5 * Math.cos(lean) + 0.01, cz);
    }
    stackFrames.push(...geos);
    const back = new THREE.PlaneGeometry(cw - 2 * bar, ch - 2 * bar);
    back.rotateY(Math.PI / 2);
    back.rotateZ(lean);
    back.translate(cx + Math.cos(lean) * 0.012, ch * 0.5 * Math.cos(lean) + 0.01, cz + (cw - bar) / 2);
    stackBacks.push(back);
  }
  group.add(mergedMesh(stackFrames, stretcherMat), mergedMesh(stackBacks, linenMat));
  const darkPaintTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#0a0709';
    g.fillRect(0, 0, s, s);
    // 只一抹苍白，像从黑里透出来的脸背影
    const grad = g.createRadialGradient(s * 0.42, s * 0.4, 4, s * 0.42, s * 0.4, 42);
    grad.addColorStop(0, 'rgba(206,196,182,0.5)');
    grad.addColorStop(0.6, 'rgba(120,108,100,0.18)');
    grad.addColorStop(1, 'rgba(10,7,9,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(s * 0.42, s * 0.44, 26, 40, -0.15, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(60,20,18,0.5)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(s * 0.2, s * 0.82);
    g.bezierCurveTo(s * 0.4, s * 0.74, s * 0.6, s * 0.86, s * 0.82, s * 0.78);
    g.stroke();
  });
  const frontCanvas = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.92),
    new THREE.MeshStandardMaterial({ map: darkPaintTex, roughness: 0.9 })
  );
  frontCanvas.rotation.order = 'ZYX';
  frontCanvas.rotation.set(0, Math.PI / 2, 0.3);
  frontCanvas.position.set(-8.08, 0.92 * 0.5 * Math.cos(0.3) + 0.01, -4.15);
  group.add(frontCanvas);
  // ② 颜料补给搁板（西墙高处：木板+双托座；三只玻璃罐插笔、两罐颜料粉、一只盖子虚着）
  const shelfY = 1.92;
  group.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.24, 0.04, 1.7), -8.12, shelfY, -4.35),
    xform(new THREE.BoxGeometry(0.2, 0.05, 0.05), -8.14, shelfY - 0.045, -3.75, 0, 0, 0),
    xform(new THREE.BoxGeometry(0.04, 0.24, 0.05), -8.22, shelfY - 0.13, -3.75),
    xform(new THREE.BoxGeometry(0.2, 0.05, 0.05), -8.14, shelfY - 0.045, -4.95),
    xform(new THREE.BoxGeometry(0.04, 0.24, 0.05), -8.22, shelfY - 0.13, -4.95)
  ], stretcherMat));
  const jarProfile = [
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.045, 0.004), new THREE.Vector2(0.05, 0.02),
    new THREE.Vector2(0.048, 0.13), new THREE.Vector2(0.04, 0.145)
  ];
  const jarGeos = [];
  const brushGeos2 = [];
  const jr = rng(31);
  for (const [jz, nb] of [[-3.95, 3], [-4.4, 2], [-4.8, 4]]) {
    jarGeos.push(xform(new THREE.LatheGeometry(jarProfile, 12), -8.1, shelfY + 0.02, jz));
    for (let b = 0; b < nb; b++) {
      brushGeos2.push(xform(
        new THREE.CylinderGeometry(0.006, 0.008, 0.26 + jr() * 0.08, 6),
        -8.1 + (jr() - 0.5) * 0.04, shelfY + 0.16, jz + (jr() - 0.5) * 0.04,
        (jr() - 0.5) * 0.5, 0, (jr() - 0.5) * 0.5
      ));
    }
  }
  group.add(
    mergedMesh(jarGeos, new THREE.MeshPhysicalMaterial({
      color: 0xd8e2dc, roughness: 0.1, transparent: true, opacity: 0.4,
      side: THREE.DoubleSide, envMapIntensity: 1.2
    })),
    mergedMesh(brushGeos2, new THREE.MeshStandardMaterial({ color: 0x7c5228, roughness: 0.75 }))
  );
  const canLabelTex = canvasTexture(64, (g, s) => {
    g.fillStyle = '#c9bfa4';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#3a2c1a';
    g.font = '700 11px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('PIGMENTO', s / 2, 26);
    g.fillStyle = '#7a1420';
    g.fillRect(s / 2 - 14, 36, 28, 12);
  });
  group.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.055, 0.055, 0.11, 12), -8.1, shelfY + 0.075, -5.05),
    xform(new THREE.CylinderGeometry(0.055, 0.055, 0.11, 12), -8.12, shelfY + 0.075, -3.68)
  ], new THREE.MeshStandardMaterial({ map: canLabelTex, roughness: 0.7, metalness: 0.25 })),
  mergedMesh([
    xform(new THREE.CylinderGeometry(0.057, 0.057, 0.012, 12), -8.1, shelfY + 0.136, -5.05),
    xform(new THREE.CylinderGeometry(0.057, 0.057, 0.012, 12), -8.09, shelfY + 0.142, -3.66, 0.16, 0, 0.1)
  ], new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(64, 110, 30), color: 0x8f9298, roughness: 0.4, metalness: 0.8
  })));
  // ③ 画架脚下的颜料滴溅贴花（透明平面；地板从「打扫过」变「用过」）
  const splatterTex = canvasTexture(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const r2 = rng(97);
    const cols = ['122,20,24', '30,44,80', '180,150,40', '22,20,18'];
    for (let i = 0; i < 46; i++) {
      const c = cols[(r2() * cols.length) | 0];
      g.fillStyle = `rgba(${c},${0.16 + r2() * 0.5})`;
      const rr = 1 + r2() * (r2() < 0.12 ? 9 : 3.5);
      g.beginPath();
      g.ellipse(s / 2 + (r2() - 0.5) * s * 0.86, s / 2 + (r2() - 0.5) * s * 0.86, rr, rr * (0.5 + r2() * 0.8), r2() * 3.2, 0, Math.PI * 2);
      g.fill();
    }
  });
  const splatter = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshStandardMaterial({
      map: splatterTex, transparent: true, roughness: 0.55,
      polygonOffset: true, polygonOffsetFactor: -1
    })
  );
  splatter.rotation.x = -Math.PI / 2;
  splatter.rotation.z = 0.7;
  splatter.position.set(-5.1, 0.006, -4.9);
  group.add(splatter);
  hotspots.add(palette, {
    hint: 'E — 调色板',
    onActivate: () => {
      freshState.t = 0;
      freshState.idx++;
      freshDaub.material.color.setHex([0xd4243c, 0xc08a2a, 0x1e5038, 0x1a2232][freshState.idx % 4]);
      freshDaub.scale.set(0.001, 0.0005, 0.001);
      audio.sfxAt('gurgle', -5.8, -5.45, 0.35, 3);
      ui.caption('颜料还没干。', 2800);
    }
  });

  // 收音机（交互⑥：天气播报——原创文本，抽象致敬他的每日天气）
  const WEATHER = [
    '洛杉矶。金色阳光，微风，华氏七十二度。',
    '今晨有雾，能见度低。',
    '阴，偶有小雨。去喝杯咖啡。'
  ];
  const radioState = { on: 0, idx: 0 };
  // 木壳电子管收音机 v2（格栅 + 布网 + 表盘 + 双旋钮）
  const radio = radioCabinet({ mats: M });
  const radioBody = radio.userData.body;
  // 木架
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.4), caseWood);
  shelf.position.set(1.8, 1.28, -6.28);
  radio.position.set(1.8, 1.305, -6.28);
  group.add(shelf, radio);
  updaters.push((dt, t) => {
    radio.userData.dialMat.emissiveIntensity = radioState.on ? 0.9 + Math.sin(t * 3) * 0.15 : 0.18;
    // 开机时指针缓慢搜台
    if (radioState.on) radio.userData.needle.position.x = 0.14 + Math.sin(t * 0.7) * 0.07;
  });
  hotspots.add(radioBody, {
    hint: 'E — 旧收音机（今日天气）',
    onActivate: () => {
      radioState.on = 1;
      audio.sfx('radio', 0.8);
      const special = chain.step === 2;
      if (special) chain.step = 3;
      later(() => {
        const text = special
          ? '插播：一条大鱼正经过本市上空。'
          : WEATHER[radioState.idx % WEATHER.length];
        radioState.idx++;
        ui.caption('📻 ' + text, 5200);
        if (special) {
          audio.sfx('lullaby', 0.7);
          hiddenGlow.intensity = 9;
          later(() => { hiddenGlow.intensity = 0; }, 7000);
        }
      }, 900);
    }
  });
  // 叙事链奖励：墙上暗画短暂亮起
  const hiddenPaintTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0a0708';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(242,233,220,0.65)';
    g.lineWidth = 3;
    // 一条极简的大鱼线稿
    g.beginPath();
    g.moveTo(40, 128);
    g.quadraticCurveTo(110, 70, 190, 120);
    g.quadraticCurveTo(120, 175, 40, 128);
    g.moveTo(190, 120);
    g.lineTo(225, 95);
    g.moveTo(190, 120);
    g.lineTo(225, 148);
    g.stroke();
  });
  const hiddenPaint = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshStandardMaterial({ map: hiddenPaintTex, roughness: 0.8, emissive: 0xffffff, emissiveMap: hiddenPaintTex, emissiveIntensity: 0.05 })
  );
  hiddenPaint.position.set(4.6, 2.5, -6.42);
  group.add(hiddenPaint);
  const hiddenGlow = new THREE.PointLight(0x9ecfff, 0, 7, 1.8);
  hiddenGlow.position.set(4.6, 2.5, -5.6);
  group.add(hiddenGlow);
  updaters.push(() => {
    hiddenPaint.material.emissiveIntensity = 0.05 + hiddenGlow.intensity * 0.1;
  });

  // ---------- 可拉的帘 + 冥想角（交互⑦⑧） ----------
  const curtainState = { open: 0, v: 0 };
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.6, 40, 5),
    new THREE.MeshStandardMaterial({ color: 0x5c1420, roughness: 0.92, side: THREE.DoubleSide })
  );
  {
    const cp = cloth.geometry.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      cp.setZ(i, Math.sin((cp.getX(i) / 3.4 + 0.5) * Math.PI * 9) * 0.1);
    }
    cloth.geometry.computeVertexNormals();
  }
  cloth.position.set(4.5, 1.8, -D / 2 + 0.06);
  group.add(cloth);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 3.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c1208, roughness: 0.5, metalness: 0.6 })
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(4.5, 3.7, -D / 2 + 0.06);
  group.add(rod);
  updaters.push((dt) => {
    curtainState.v += (curtainState.open - curtainState.v) * Math.min(1, dt * 2.4);
    cloth.scale.x = 1 - curtainState.v * 0.82;
    cloth.position.x = 4.5 - curtainState.v * 1.45;
  });
  hotspots.add(cloth, {
    hint: 'E — 拉开这道帘（后面有个角落）',
    onActivate: () => {
      curtainState.open = curtainState.open ? 0 : 1;
      audio.sfx('curtain');
      ui.caption(curtainState.open ? '帘子后面：一只坐垫，几支蜡烛。' : '帘子合上了。', 3000);
    }
  });

  // 冥想角 v2（v1.4 四遍）：草编方垫 + 真禅垫（zafu 车削鼓身 + 辐向褶裥 +
  // 顶部布扣）+ 蜡烛新月弧 ×5（高矮胖瘦不重样、黄铜滴盘、烛芯共享火苗材质）
  // + 香钵一只（细烟像一根悬着的线——只有深水序列外才看得清）
  const zabuTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#8a7448';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(58,46,26,0.5)';
    g.lineWidth = 2;
    for (let i = 0; i < s; i += 5) {
      g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke();
    }
    g.strokeStyle = 'rgba(120,100,60,0.4)';
    for (let i = 0; i < s; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke();
    }
  }, 2, 2);
  const zabuton = roundedBoxMesh(1.2, 0.05, 1.2, 0.02,
    new THREE.MeshStandardMaterial({ map: zabuTex, roughness: 0.95 }));
  zabuton.position.set(4.5, 0.025, -8.1);
  group.add(zabuton);
  const pleatTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#3c1420';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * s;
      const grad = g.createLinearGradient(x, 0, x + s / 8, 0);
      grad.addColorStop(0, 'rgba(14,4,8,0.55)');
      grad.addColorStop(0.45, 'rgba(94,40,56,0.28)');
      grad.addColorStop(1, 'rgba(14,4,8,0.55)');
      g.fillStyle = grad;
      g.fillRect(x, 0, s / 8, s);
    }
  }, 5, 1);
  const cushion = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.0, 0.008), new THREE.Vector2(0.4, 0.015), new THREE.Vector2(0.49, 0.1),
      new THREE.Vector2(0.47, 0.2), new THREE.Vector2(0.32, 0.265), new THREE.Vector2(0.06, 0.285),
      new THREE.Vector2(0.0, 0.285)
    ], 22),
    new THREE.MeshStandardMaterial({ map: pleatTex, roughness: 0.92 })
  );
  cushion.position.set(4.5, 0.05, -8.1);
  group.add(cushion);
  const cushionBtn = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c0a10, roughness: 0.8 })
  );
  cushionBtn.scale.y = 0.5;
  cushionBtn.position.set(4.5, 0.335, -8.1);
  group.add(cushionBtn);
  // 蜡烛新月弧：面向坐垫围合（高矮/粗细 seeded 不重样）
  const nr = rng(73);
  const candleGeos = [];
  const flameGeos = [];
  const trayGeos = [];
  const CANDLE_C = { x: 5.42, z: -8.52 };
  for (let i = 0; i < 5; i++) {
    const a = 2.1 + (i / 4) * 1.9; // 朝坐垫的反侧留口
    const cx = CANDLE_C.x + Math.cos(a) * 0.42;
    const cz = CANDLE_C.z + Math.sin(a) * 0.42;
    const h = 0.09 + nr() * 0.17;
    const r = 0.028 + nr() * 0.016;
    candleGeos.push(xform(new THREE.CylinderGeometry(r * 0.94, r, h, 10), cx, 0.02 + h / 2, cz));
    // 蜡泪：一侧挂一条细柱
    candleGeos.push(xform(
      new THREE.CylinderGeometry(0.006, 0.009, h * 0.55, 6),
      cx + Math.cos(a + 1.2) * r, 0.02 + h * 0.65, cz + Math.sin(a + 1.2) * r
    ));
    flameGeos.push(xform(new THREE.SphereGeometry(0.02, 8, 8), cx, 0.045 + h, cz));
    trayGeos.push(xform(new THREE.CylinderGeometry(r + 0.028, r + 0.034, 0.012, 12), cx, 0.026, cz));
  }
  group.add(
    mergedMesh(candleGeos, new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.75 })),
    mergedMesh(trayGeos, M.brass)
  );
  const flame = mergedMesh(flameGeos, new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0xffb45e, emissiveIntensity: 4
  }));
  group.add(flame);
  const candleLight = new THREE.PointLight(0xffb45e, 3.2, 6, 1.9);
  candleLight.position.set(CANDLE_C.x, 0.65, CANDLE_C.z);
  group.add(candleLight);
  // 深水预感：坐垫正上方一汪极淡的冷光（与蜡烛暖光对峙——潜下去之前的水面）
  const poolGlow = new THREE.PointLight(0x4a6a8a, 1.3, 4.5, 1.8);
  poolGlow.position.set(4.5, 2.6, -8.1);
  group.add(poolGlow);
  // 香钵：黑陶小碗 + 立香 + 一线细烟
  const incense = new THREE.Group();
  incense.add(new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0, 0.004), new THREE.Vector2(0.05, 0.008), new THREE.Vector2(0.062, 0.035),
      new THREE.Vector2(0.055, 0.05)
    ], 14),
    new THREE.MeshStandardMaterial({ color: 0x18130f, roughness: 0.55 })
  ));
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.24, 6),
    new THREE.MeshStandardMaterial({ color: 0x5c3a20, roughness: 0.9 })
  );
  stick.position.y = 0.15;
  stick.rotation.z = 0.07;
  incense.add(stick);
  incense.position.set(3.55, 0, -8.75);
  group.add(incense);
  const incenseWisp = smokeLayer(4, { x: 0.04, z: 0.04 }, {
    opacity: 0.12, size: 0.22, yBase: 0.3, ySpread: 0.55, color: 0xcfd4da
  });
  incenseWisp.position.set(3.56, 0, -8.75);
  group.add(incenseWisp);
  updaters.push(incenseWisp.userData.update);
  updaters.push((dt, t) => {
    flame.material.emissiveIntensity = 3.4 + Math.sin(t * 9.3) * 1 + Math.random() * 0.4;
    candleLight.intensity = 2.1 + Math.sin(t * 8.1) * 0.5;
  });

  // 深水序列：大鱼群（冥想时才可见）
  const fishGroup = new THREE.Group();
  fishGroup.visible = false;
  const fishes = [];
  for (let i = 0; i < 7; i++) {
    const geo = new THREE.CapsuleGeometry(0.09 + Math.random() * 0.12, 0.7 + Math.random() * 1.6, 4, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a1a2c, roughness: 0.3, metalness: 0.4,
      emissive: 0x3ec5ff, emissiveIntensity: 0.7, transparent: true, opacity: 0.85
    });
    const fish = new THREE.Mesh(geo, mat);
    fish.rotation.z = Math.PI / 2;
    fishGroup.add(fish);
    fishes.push({ fish, r: 2.5 + Math.random() * 3.5, h: 1.2 + Math.random() * 2.6, speed: 0.12 + Math.random() * 0.3, phase: Math.random() * 7 });
  }
  group.add(fishGroup);
  const meditation = { active: false, t: 0 };
  updaters.push((dt, t) => {
    if (!meditation.active) return;
    meditation.t += dt;
    fishGroup.position.set(player.x, 0, player.z);
    for (const f of fishes) {
      const a = t * f.speed + f.phase;
      f.fish.position.set(Math.cos(a) * f.r, f.h + Math.sin(t * 0.6 + f.phase) * 0.4, Math.sin(a) * f.r);
      f.fish.rotation.y = -a;
    }
  });
  hotspots.add(cushion, {
    hint: 'E — 坐下，闭眼（潜入深水）',
    onActivate: () => {
      if (meditation.active) return;
      meditation.active = true;
      meditation.t = 0;
      audio.sfx('om');
      audio.duck(0.4, 0.2, 3.0);
      engine.setLook({ saturation: 0.55, tint: 0x9ecfff, fogColor: 0x020610, fogDensity: 0.085, bg: 0x010409, exposure: 0.8, bloom: 1.2 });
      fishGroup.visible = true;
      ui.caption('「想抓大鱼，就得潜到更深的水里去。」', 4600);
      later(() => audio.sfx('om', 0.7), 5200);
      later(() => {
        meditation.active = false;
        fishGroup.visible = false;
        engine.setLook(meta.look);
        audio.sfx('chime', 0.5);
        ui.caption('你浮上来了。', 3000);
      }, 11500);
    }
  });

  // ---------- 软木留言板（交互⑨：留言墙强化） ----------
  const posts = (store ? store.list() : []).slice(0, 4);
  const corkTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#4a3520';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${60 + Math.random() * 40},${44 + Math.random() * 26},${20 + Math.random() * 16},0.5)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    g.strokeStyle = '#241708';
    g.lineWidth = 14;
    g.strokeRect(7, 7, s - 14, s - 14);
    // 钉上访客留言（无留言时是他风格的提示条）
    const notes = posts.length
      ? posts.map((p) => ({ who: p.name, text: p.text.slice(0, 26) + (p.text.length > 26 ? '…' : '') }))
      : [{ who: '馆方', text: '这块板子留给你。' }];
    const colors = ['#f2e9dc', '#ffe9b8', '#d8ecff', '#ffd8e2'];
    notes.forEach((n, i) => {
      const nx = 48 + (i % 2) * 230;
      const ny = 56 + Math.floor(i / 2) * 210 + (i % 2) * 22;
      g.save();
      g.translate(nx + 95, ny + 80);
      g.rotate((Math.random() - 0.5) * 0.14);
      g.fillStyle = colors[i % colors.length];
      g.fillRect(-95, -80, 190, 160);
      g.fillStyle = '#d4243c';
      g.beginPath();
      g.arc(0, -70, 7, 0, 7);
      g.fill();
      g.fillStyle = '#1c150e';
      g.font = '22px "Songti SC","SimSun",serif';
      g.textAlign = 'left';
      const line1 = n.text.slice(0, 9);
      const line2 = n.text.slice(9, 18);
      const line3 = n.text.slice(18);
      g.fillText(line1, -80, -28);
      if (line2) g.fillText(line2, -80, 4);
      if (line3) g.fillText(line3, -80, 36);
      g.font = '18px "Courier New",monospace';
      g.fillStyle = 'rgba(28,21,14,0.6)';
      g.fillText('— ' + n.who.slice(0, 10), -80, 66);
      g.restore();
    });
  });
  const cork = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.4, 0.06),
    new THREE.MeshStandardMaterial({ map: corkTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: corkTex, emissiveIntensity: 0.16 })
  );
  cork.position.set(W / 2 - 0.06, 2.2, 1.6);
  cork.rotation.y = -Math.PI / 2;
  group.add(cork);
  const corkSpot = new THREE.PointLight(0xffe6c0, 2.4, 5, 2);
  corkSpot.position.set(W / 2 - 1.4, 3.2, 1.6);
  group.add(corkSpot);
  hotspots.add(cork, {
    hint: 'E — 软木板：访客们留下的话（点击写一张）',
    onActivate: () => ui.openGuestbook()
  });

  // v1.4 六遍：导演椅（窗前）——面朝雨窗摆着，椅背朝屋里。
  // 经典折叠 X 架：前后剪刀腿 + 侧滑木 + 扶手 + 帆布座/背；
  // E → 椅子轻轻摇一下 + creak +「椅背上没有名字。」
  const dirChair = new THREE.Group();
  const dcWood = woodPbr({ base: [30, 19, 11], planks: 1, size: 128, seed: 53, env: 0.7 });
  const dcLeg = new THREE.BoxGeometry(0.045, 0.95, 0.022);
  dirChair.add(mergedMesh([
    // 前后两面剪刀腿（X 在立面上）
    ...[0.2, -0.2].flatMap((z) => [
      xform(dcLeg, 0, 0.35, z, 0, 0, 0.5),
      xform(dcLeg, 0, 0.35, z, 0, 0, -0.5)
    ]),
    // 侧滑木（左右各一条，接住前后脚）
    xform(new THREE.BoxGeometry(0.05, 0.03, 0.52), -0.215, 0.018, 0),
    xform(new THREE.BoxGeometry(0.05, 0.03, 0.52), 0.215, 0.018, 0),
    // 扶手 + 靠背立柱
    xform(new THREE.BoxGeometry(0.055, 0.022, 0.58), -0.24, 0.68, -0.02),
    xform(new THREE.BoxGeometry(0.055, 0.022, 0.58), 0.24, 0.68, -0.02),
    xform(new THREE.BoxGeometry(0.042, 0.4, 0.032), -0.24, 0.86, -0.24),
    xform(new THREE.BoxGeometry(0.042, 0.4, 0.032), 0.24, 0.86, -0.24)
  ], dcWood));
  const dcCanvas = fabricMat('#38321f', '#2c281a', { repX: 3, repY: 3, sheen: 0.22, color: 0xb8b09a });
  const dcBack = mergedMesh([
    xform(new THREE.BoxGeometry(0.5, 0.016, 0.42), 0, 0.487, -0.01),
    xform(new THREE.BoxGeometry(0.55, 0.26, 0.016), 0, 0.94, -0.245)
  ], dcCanvas);
  dirChair.add(dcBack);
  dirChair.position.set(6.2, 0, -1.6);
  dirChair.rotation.y = 2.3; // 面朝雨窗（东墙 z=-3.4），椅背给屋里
  group.add(dirChair);
  // 窗口冷光洒过来一点（月光落在椅背上——暗角里轮廓可读）
  const dcSpill = new THREE.PointLight(0x9fb4d0, 1.1, 4.5, 2);
  dcSpill.position.set(7.3, 1.8, -2.7);
  group.add(dcSpill);
  const dcState = { t: -1 };
  updaters.push((dt) => {
    if (dcState.t < 0) return;
    dcState.t += dt;
    const decay = Math.max(0, 1 - dcState.t * 0.8);
    if (decay <= 0) { dcState.t = -1; dirChair.rotation.x = 0; return; }
    dirChair.rotation.x = Math.sin(dcState.t * 7) * 0.024 * decay;
  });
  hotspots.add(dcBack, {
    hint: 'E — 导演椅',
    onActivate: () => {
      if (dcState.t < 0) dcState.t = 0;
      audio.sfxAt('creak', 6.2, -1.6, 0.5, 3.5);
      ui.caption('椅背上没有名字。', 4200);
    }
  });

  // ---------- 彩蛋：收音机自己醒来 ----------
  // 绕到工作桌与画架背后的死角（没人有理由站在那里）。
  let eggTimers = [];
  const radioEgg = () => {
    for (const id of eggTimers) clearTimeout(id);
    eggTimers = [];
    audio.duck(1.2, 0.04, 2.2);
    const prevLamp = lampState.on;
    lampState.on = 0;
    eggTimers.push(setTimeout(() => {
      radioState.on = 1;
      audio.sfx('radio', 1);
      audio.sfx('whisper', 0.8);
      ui.caption('它播的不是天气。是一个名字。你的。', 5200);
    }, 1000));
    eggTimers.push(setTimeout(() => {
      lampState.on = prevLamp;
      radioState.on = 0;
      audio.sfx('lampon', 0.5);
    }, 6400));
  };
  const radioTrig = zoneTrigger({ x: -7.0, z: -5.2, r: 1.35 }, radioEgg, { cooldown: 45 });
  updaters.push((dt) => radioTrig.update(player, dt));

  // ---------- 引语立牌（全厅仅一座，走近才显影） ----------
  const q1 = quoteStand(quoteById('you'), '#ffb25e');
  q1.position.set(2.2, 0, -5.6);
  q1.rotation.y = 0.35;
  group.add(q1);
  updaters.push(quoteStandUpdater(q1, player, ui, {
    narration, docent: DOCENT.you
  }));
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  // ---------- 氛围 ----------
  const haze = smokeLayer(46, { x: W, z: D }, { opacity: 0.04, size: 8, yBase: 0.5, ySpread: 2, color: 0xd8c8b0 });
  group.add(haze);
  updaters.push(haze.userData.update);
  const dust = dustField(140, { x: W, y: H, z: D }, { opacity: 0.35, size: 0.045, color: 0xffe9c8 });
  group.add(dust);
  updaters.push(dust.userData.update);
  group.add(new THREE.AmbientLight(0x2a1c12, 1.1));

  // 回大厅
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, D / 2 - 0.55);
  back.rotation.y = Math.PI;
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  // 边界：主房间 + （帘开着才可进的）冥想角
  const clamp = (p) => {
    const inMain = p.x >= MAIN.minX && p.x <= MAIN.maxX && p.z >= MAIN.minZ && p.z <= MAIN.maxZ;
    const alcoveOpen = curtainState.v > 0.5;
    const inAlcove = alcoveOpen && p.x >= ALCOVE.minX && p.x <= ALCOVE.maxX && p.z >= ALCOVE.minZ && p.z <= ALCOVE.maxZ;
    if (inMain || inAlcove) return;
    const rects = alcoveOpen ? [MAIN, ALCOVE] : [MAIN];
    let best = null;
    let bestD = Infinity;
    for (const r of rects) {
      const cx = Math.max(r.minX, Math.min(r.maxX, p.x));
      const cz = Math.max(r.minZ, Math.min(r.maxZ, p.z));
      const d = (cx - p.x) ** 2 + (cz - p.z) ** 2;
      if (d < bestD) { bestD = d; best = { cx, cz }; }
    }
    if (best) { p.x = best.cx; p.z = best.cz; }
  };

  return {
    group,
    spawn: { x: 0, z: 4.4, yaw: 0 },
    bounds: clamp,
    // 脚步材质分区：圆毯上=绒面；其余=木地板
    surfaceAt: (x, z) => (Math.hypot(x + 1.5, z + 0.5) <= 2.6 ? 'carpet' : 'wood'),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'radio-wakes': radioTrig },
    onLeave: () => {
      for (const id of timers) clearTimeout(id);
      for (const id of eggTimers) clearTimeout(id);
      engine.setLook(meta.look);
    }
  };
}
