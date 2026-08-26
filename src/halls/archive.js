// ============================================================
// 档案长廊 —— THE ARCHIVE 年表展厅
// 荧光灯长廊 + 按年代排列的作品灯牌 + 中段原话摘录墙壁龛 +
// 尽头纪念墙。解读文字为零：只有事实与他自己的话。
// ============================================================
import * as THREE from 'three';
import { filmsSorted } from '../data/filmography.js';
import { QUOTES } from '../data/essays.js';
import {
  canvasTexture, noiseCanvasTexture, floorMesh, doorway, archivePlaque,
  smokeLayer, dustField, zoneTrigger, multiRectBounds,
  mergedMesh, xform, roundedBoxMesh, woodTexture,
  woodMat, fabricMat, marbleMat, roundedBoxGeo, lightCone, rng
} from './kit.js';
import {
  propMats, fluorescentFixture, cardCatalog, filmProjector, bankersLamp, stanchionRope
} from './props.js';

export const meta = {
  id: 'archive',
  name: 'THE ARCHIVE · 档案长廊',
  ambience: 'archive',
  narration: 'archive',
  space: 'hall',
  floorSfx: 'wood',
  look: {
    saturation: 0.82, tint: 0xe8f0ff, fogColor: 0x05060a, fogDensity: 0.055,
    bg: 0x030407, exposure: 1.0, bloom: 0.75,
    // v1.4 P4/P5：档案荧光冷分级——青蓝暗部微抬 + 冷高光，halation 给灯管一点乳晕
    halation: 0.12,
    grade: { lift: [0.006, 0.01, 0.016], gamma: [0.99, 1.0, 1.02], gain: [0.97, 1.0, 1.04] },
    // v1.9 B1：长廊的雾慢而稳（40s，±8%——档案的呼吸）
    fogPulse: { period: 40, depth: 0.08 }
  }
};

const W = 9;
const L = 48;
// 主廊 + 西侧摘录墙壁龛
const HALL = { minX: -W / 2 + 1, maxX: W / 2 - 1, minZ: -L / 2 + 1.9, maxZ: L / 2 - 1.6 };
const NICHE = { minX: -W / 2 - 3.4, maxX: -W / 2 + 1.2, minZ: -2.4, maxZ: 2.4 };

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 地板: 深色拼木（v1.3 三通道：板缝法线 + 磨损粗糙度）+ 中央红毯
  const M = propMats();
  group.add(floorMesh(W, L, woodMat({
    base: [30, 22, 14], planks: 9, size: 512, seed: 12, repX: 1, repY: 5,
    worn: 0.7, gloss: 0.55, env: 0.8
  })));
  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, L - 6),
    fabricMat('#240a10', '#3a1018', { seed: 15, repX: 3, repY: 26, sheenColor: 0xaa4a5a })
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.y = 0.012;
  group.add(runner);

  // 墙与护墙板
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x14100f, roughness: 0.85, bumpMap: noiseCanvasTexture(128, 128, 40, 8), bumpScale: 0.4
  });
  const mkWall = (w, h, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  // 西墙留出壁龛口
  {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(L / 2 - 2.5, 5.4), wallMat);
    a.position.set(-W / 2, 2.7, -(L / 2 + 2.5) / 2);
    a.rotation.y = Math.PI / 2;
    group.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(L / 2 - 2.5, 5.4), wallMat);
    b.position.set(-W / 2, 2.7, (L / 2 + 2.5) / 2);
    b.rotation.y = Math.PI / 2;
    group.add(b);
    const lintel = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), wallMat);
    lintel.position.set(-W / 2, 4.6, 0);
    lintel.rotation.y = Math.PI / 2;
    group.add(lintel);
  }
  mkWall(L, 5.4, W / 2, 0, -Math.PI / 2);
  mkWall(W, 5.4, 0, -L / 2, 0);
  mkWall(W, 5.4, 0, L / 2, Math.PI);
  const ceil = floorMesh(W, L, new THREE.MeshStandardMaterial({ color: 0x0b0809, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5.4;
  group.add(ceil);
  // 顶梁（合并单 mesh）
  const beamGeos = [];
  const beamGeo = new THREE.BoxGeometry(W, 0.28, 0.34);
  for (let i = 0; i < 8; i++) {
    beamGeos.push(xform(beamGeo, 0, 5.26, -L / 2 + 3 + i * 6));
  }
  beamGeo.dispose();
  group.add(mergedMesh(beamGeos, new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [22, 15, 9], planks: 1, size: 128 }), roughness: 0.8
  })));
  // 护墙线脚（两侧长条）
  const dadoGeos = [
    xform(new THREE.BoxGeometry(0.06, 0.12, L - 1), -W / 2 + 0.05, 1.15, 0),
    xform(new THREE.BoxGeometry(0.06, 0.12, L - 1), W / 2 - 0.05, 1.15, 0)
  ];
  group.add(mergedMesh(dadoGeos, new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.6 })));

  // v1.4 四遍：跨廊分隔拱两道（z=±12.6，避开灯具/顶梁/展牌）——
  // 48 米长廊被切成三进，纵深终于可读：壁柱 + 柱帽 + 过梁 + 黄铜细线 +
  // 居中垂挂的双面小铜牌（菱形 + 双线框，克制不添字）
  const archWoodMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [26, 18, 11], planks: 1, size: 128 }), roughness: 0.7
  });
  const archFrameGeos = [];
  const archBrassGeos = [];
  for (const az of [-12.6, 12.6]) {
    for (const sx of [-1, 1]) {
      archFrameGeos.push(xform(new THREE.BoxGeometry(0.26, 3.7, 0.34), sx * (W / 2 - 0.14), 1.85, az));
      archFrameGeos.push(xform(new THREE.BoxGeometry(0.36, 0.2, 0.44), sx * (W / 2 - 0.15), 3.8, az));
      archFrameGeos.push(xform(new THREE.BoxGeometry(0.34, 0.12, 0.42), sx * (W / 2 - 0.15), 0.06, az));
    }
    archFrameGeos.push(xform(new THREE.BoxGeometry(W, 0.55, 0.3), 0, 4.17, az));
    archBrassGeos.push(xform(new THREE.BoxGeometry(W - 0.4, 0.05, 0.34), 0, 3.87, az));
    archBrassGeos.push(xform(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), -0.12, 3.72, az));
    archBrassGeos.push(xform(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), 0.12, 3.72, az));
  }
  group.add(mergedMesh(archFrameGeos, archWoodMat), mergedMesh(archBrassGeos, M.brass));
  const archPlateTex = canvasTexture(64, (g, s) => {
    g.fillStyle = '#211508';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#c9a24e';
    g.lineWidth = 2.5;
    g.strokeRect(6, 14, s - 12, s - 28);
    g.lineWidth = 1.2;
    g.strokeRect(11, 19, s - 22, s - 38);
    g.save();
    g.translate(s / 2, s / 2);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#c9a24e';
    g.fillRect(-4.5, -4.5, 9, 9);
    g.restore();
  });
  group.add(mergedMesh(
    [-12.6, 12.6].map((az) => xform(new THREE.BoxGeometry(0.52, 0.24, 0.025), 0, 3.44, az)),
    new THREE.MeshStandardMaterial({ map: archPlateTex, roughness: 0.5, metalness: 0.35 })
  ));

  // 荧光灯具 v2（折板反光罩 + 双管 + 吊杆；顺序闪烁；彩蛋时逐管熄灭）
  const tubes = [];
  for (let i = 0; i < 7; i++) {
    const z = -L / 2 + 6 + i * 6;
    const fixture = fluorescentFixture({ len: 2.8, mats: M });
    fixture.position.set(0, 4.73, z);
    const lp = new THREE.PointLight(0xdfe8ff, 9, 12, 1.7);
    lp.position.set(0, 4.5, z);
    group.add(fixture, lp);
    tubes.push({ mat: fixture.userData.tubeMat, lp, seed: i * 7.3, dead: 0 });
  }
  updaters.push((dt, t) => {
    for (const { mat, lp, seed, dead } of tubes) {
      const n = Math.sin(t * 11 + seed) * Math.sin(t * 4.7 + seed * 2.1);
      const f = (n > 0.93 ? 0.15 : 1) * (1 - dead);
      mat.emissiveIntensity = 2.6 * Math.max(0.02, f);
      lp.intensity = 9 * f;
    }
  });

  // 廊灯检修牌（v1.9 件 2）：第五盏荧光灯（z=6）末端垂一条黄铜珠链，
  // 链尾一枚检修吊牌——格线排得整整齐齐，签名栏全是空的。
  // E → 拉一下：这盏灯咽一口气熄了，一秒后自己亮回来。牌子荡很久。
  const svcRig = new THREE.Group(); // 枢轴在灯具末端（摆动即真实钟摆）
  {
    const beadGeos = [xform(new THREE.CylinderGeometry(0.0022, 0.0022, 1.86, 5), 0, -0.93, 0)];
    for (let i = 0; i < 22; i++) {
      beadGeos.push(xform(new THREE.SphereGeometry(0.0058, 6, 5), 0, -0.045 - i * 0.083, 0));
    }
    svcRig.add(mergedMesh(beadGeos, M.brass));
    const tagTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#d8cdb2';
      g.fillRect(0, 0, s, s);
      // 卡沿磨圆的脏边
      g.strokeStyle = 'rgba(96,80,58,0.5)';
      g.lineWidth = 6;
      g.strokeRect(1, 1, s - 2, s - 2);
      // 表格：日期列 + 签名列（全部空着）
      g.strokeStyle = 'rgba(70,58,42,0.65)';
      g.lineWidth = 1;
      for (let y = 30; y < s - 10; y += 12) {
        g.beginPath(); g.moveTo(10, y); g.lineTo(s - 10, y); g.stroke();
      }
      g.beginPath(); g.moveTo(s * 0.44, 22); g.lineTo(s * 0.44, s - 12); g.stroke();
      // 表头两短杠（不写字，克制）
      g.fillStyle = 'rgba(70,58,42,0.75)';
      g.fillRect(16, 18, s * 0.2, 3);
      g.fillRect(s * 0.5, 18, s * 0.26, 3);
      // 日期列里三行潦草短划（有人来过，只是没签名）
      const r = rng(59);
      g.strokeStyle = 'rgba(52,44,34,0.6)';
      for (const row of [0, 1, 2]) {
        g.lineWidth = 1.4;
        g.beginPath();
        let px = 14;
        const py = 37 + row * 12;
        g.moveTo(px, py);
        for (let i = 0; i < 5; i++) {
          px += 4 + r() * 5;
          g.lineTo(px, py - 2 + r() * 4);
        }
        g.stroke();
      }
      // 铆孔铜圈
      g.fillStyle = 'rgba(30,24,16,0.9)';
      g.beginPath(); g.arc(s / 2, 10, 4.5, 0, 7); g.fill();
      g.strokeStyle = 'rgba(150,120,60,0.9)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(s / 2, 10, 6, 0, 7); g.stroke();
    });
    const svcTag = new THREE.Mesh(
      roundedBoxGeo(0.085, 0.128, 0.004, 0.006, 2),
      new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.85 })
    );
    svcTag.position.set(0, -1.93, 0);
    svcTag.rotation.y = 0.2;
    svcRig.add(svcTag);
    svcRig.position.set(0.16, 4.6, 7.15);
    group.add(svcRig);
    const svcState = { pullT: -1, amp: 0 };
    updaters.push((dt, t) => {
      if (svcState.amp > 0.001) svcState.amp *= Math.pow(0.5, dt / 2.2); // 半衰期 2.2s 的真实晃荡
      svcRig.rotation.x = Math.sin(t * 1.1) * 0.012 + Math.sin(t * 3.4) * svcState.amp;
      svcRig.rotation.z = Math.sin(t * 0.9 + 2) * 0.01 + Math.cos(t * 3.1) * svcState.amp * 0.6;
      if (svcState.pullT < 0) return;
      svcState.pullT += dt;
      if (svcState.pullT > 1.0 && tubes[4].dead === 1) {
        tubes[4].dead = 0; // 一秒后自己亮回来
        audio.sfx('fluor', 0.55);
      }
      if (svcState.pullT > 1.2) svcState.pullT = -1;
    });
    hotspots.add(svcTag, {
      hint: 'E — 检修吊牌',
      onActivate: () => {
        if (svcState.pullT >= 0) return;
        svcState.pullT = 0;
        svcState.amp = 0.14;
        tubes[4].dead = 1;
        audio.sfxAt('switch', 0.16, 7.15, 0.4, 3);
        audio.sfx('fluor', 0.4);
        setTimeout(() => ui.caption('上次检修没有签名。', 3400), 1500);
      }
    });
  }

  // 作品灯牌 —— 按年代沿两壁排布（事实性档案）
  const films = filmsSorted();
  films.forEach((film, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -L / 2 + 7 + Math.floor(i / 2) * 5.6;
    const plaque = archivePlaque(film);
    plaque.position.set(side * (W / 2 - 0.28), 2.05, z);
    plaque.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(plaque);
    hotspots.add(plaque, {
      hint: `E — ${film.titleZh}（${film.year}）`,
      onActivate: () => ui.showFilm(film.id)
    });
    const spot = new THREE.PointLight(0xfff0dd, 2.2, 4.5, 2);
    spot.position.set(side * (W / 2 - 1.1), 3.3, z);
    group.add(spot);
  });

  // 卡片目录柜 ×2（黄铜拉手 + 标签框；各有一只可拉的抽屉）
  // v1.4 §3.1：抽屉里塞进一沓索引卡（卡沿纹理），拉开时能看见"卡片都空着"
  const cardWadTex = canvasTexture(64, (g, s) => {
    g.fillStyle = '#cfc5aa';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(90,78,58,0.6)';
    g.lineWidth = 1;
    for (let y = 2; y < s; y += 3) {
      g.beginPath(); g.moveTo(0, y + (Math.random() - 0.5) * 1.2); g.lineTo(s, y + (Math.random() - 0.5) * 1.2); g.stroke();
    }
  });
  const catalogs = [
    { x: W / 2 - 0.55, z: -2.2, ry: -Math.PI / 2 },
    { x: -W / 2 + 0.55, z: 13.6, ry: Math.PI / 2 }
  ].map(({ x, z, ry }) => {
    const cab = cardCatalog({ cols: 4, rows: 5, mats: M });
    cab.position.set(x, 0, z);
    cab.rotation.y = ry;
    group.add(cab);
    const wad = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.07, 0.2),
      new THREE.MeshStandardMaterial({ map: cardWadTex, roughness: 0.92 })
    );
    wad.rotation.y = 0.04;
    wad.position.y = 0.015;
    cab.userData.drawer.add(wad);
    const state = { open: 0, target: 0 };
    const closedZ = cab.userData.drawer.position.z;
    updaters.push((dt) => {
      state.open += (state.target - state.open) * Math.min(1, dt * 6);
      cab.userData.drawer.position.z = closedZ + state.open * 0.26;
    });
    hotspots.add(cab.userData.drawerFace, {
      hint: 'E — 拉开抽屉',
      onActivate: () => {
        state.target = state.target > 0.5 ? 0 : 1;
        audio.sfx(state.target ? 'page' : 'thud', 0.55);
        if (state.target) ui.caption('卡片都空着。', 3200);
      }
    });
    return cab;
  });
  void catalogs;

  // v1.4 三遍：停摆的站钟（西墙高处）——黄铜圈 + 奶面刻度盘（狐斑老化）+
  // 真三维指针（秒针垂死在 6 点位）；E → 分针挣一下又垂回去（棘轮声）
  const clockFaceTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#e6ddc6';
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const len = i % 5 === 0 ? 14 : 6;
      g.strokeStyle = '#2a2118';
      g.lineWidth = i % 5 === 0 ? 3 : 1.5;
      g.beginPath();
      g.moveTo(s / 2 + Math.cos(a) * (s / 2 - 10), s / 2 + Math.sin(a) * (s / 2 - 10));
      g.lineTo(s / 2 + Math.cos(a) * (s / 2 - 10 - len), s / 2 + Math.sin(a) * (s / 2 - 10 - len));
      g.stroke();
    }
    g.fillStyle = '#2a2118';
    g.font = '700 30px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      g.fillText(String(h), s / 2 + Math.cos(a) * (s / 2 - 42), s / 2 + Math.sin(a) * (s / 2 - 42));
    }
    const fr = rng(23);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(150,120,70,${0.05 + fr() * 0.1})`;
      g.beginPath();
      g.arc(fr() * s, fr() * s, 3 + fr() * 8, 0, Math.PI * 2);
      g.fill();
    }
  });
  const clock = new THREE.Group();
  const caseGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 28);
  caseGeo.rotateX(Math.PI / 2);
  clock.add(new THREE.Mesh(caseGeo, new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.6 })));
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.028, 10, 30), M.brass);
  bezel.position.z = 0.045;
  clock.add(bezel);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.385, 28),
    new THREE.MeshStandardMaterial({ map: clockFaceTex, roughness: 0.7 })
  );
  face.position.z = 0.047;
  clock.add(face);
  // 指针：绕根部转（几何先平移再挂 pivot）；时针指向 2:47 的 2.78h，分针 47 分
  const mkHand = (len, w, colorHex) => {
    const geo = new THREE.BoxGeometry(w, len, 0.008);
    geo.translate(0, len / 2 - 0.03, 0);
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 }));
  };
  const hourHand = mkHand(0.2, 0.024, 0x1a140e);
  hourHand.rotation.z = -((2.78 / 12) * Math.PI * 2);
  hourHand.position.z = 0.052;
  const minHand = mkHand(0.31, 0.016, 0x1a140e);
  const MIN_REST = -((47 / 60) * Math.PI * 2);
  minHand.rotation.z = MIN_REST;
  minHand.position.z = 0.058;
  const secHand = mkHand(0.33, 0.007, 0x6e1210);
  secHand.rotation.z = Math.PI; // 垂死在 6 点位
  secHand.position.z = 0.063;
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.brass);
  pin.position.z = 0.062;
  clock.add(hourHand, minHand, secHand, pin);
  clock.position.set(-W / 2 + 0.06, 3.15, 8.6);
  clock.rotation.y = Math.PI / 2;
  group.add(clock);
  const clockState = { t: -1 };
  updaters.push((dt) => {
    if (clockState.t < 0) return;
    clockState.t += dt;
    const k = clockState.t;
    if (k >= 1.6) { clockState.t = -1; minHand.rotation.z = MIN_REST; return; }
    // 挣扎曲线：0.35s 内向前抢 4 分钟，随后过阻尼垂回
    const fwd = k < 0.35 ? Math.sin((k / 0.35) * Math.PI * 0.5) : Math.exp(-(k - 0.35) * 3.4) * (1 + Math.sin((k - 0.35) * 26) * 0.12);
    minHand.rotation.z = MIN_REST - fwd * ((4 / 60) * Math.PI * 2);
  });
  hotspots.add(face, {
    hint: 'E — 停摆的钟',
    onActivate: () => {
      if (clockState.t < 0) clockState.t = 0;
      audio.sfxAt('ratchet', -W / 2, 8.6, 0.45, 3);
      ui.caption('它不是坏了。它只是不同意。', 3600);
    }
  });

  // ---------- 档案盒堆（v1.4 §3.1）：牛皮纸档案盒三摞 + 标签图集 + 一只虚掩的盖 ----------
  const kraftMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(128, (g, s) => {
      g.fillStyle = '#6b5738';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 500; i++) {
        g.fillStyle = `rgba(${40 + Math.random() * 40 | 0},${32 + Math.random() * 32 | 0},${18 + Math.random() * 20 | 0},0.16)`;
        g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 1 + Math.random() * 2);
      }
      // 四边压深（盒沿包边观感）
      g.strokeStyle = 'rgba(30,22,12,0.55)';
      g.lineWidth = 6;
      g.strokeRect(3, 3, s - 6, s - 6);
    }),
    roughness: 0.94
  });
  const boxR = rng(83);
  const boxGeos = [];
  const lidAnchor = { x: 0, y: 0, z: 0 };
  const stacks = [
    { x: W / 2 - 0.62, z: 0.85, n: 5, ry: 0.06 },
    { x: W / 2 - 0.58, z: 1.62, n: 3, ry: -0.1 },
    { x: -W / 2 + 0.62, z: 12.3, n: 4, ry: 0.12 }
  ];
  for (const [si, st] of stacks.entries()) {
    for (let i = 0; i < st.n; i++) {
      const jx = (boxR() - 0.5) * 0.05;
      const jz = (boxR() - 0.5) * 0.05;
      const jr = st.ry + (boxR() - 0.5) * 0.14;
      const y = 0.075 + i * 0.15;
      boxGeos.push(xform(roundedBoxGeo(0.44, 0.145, 0.34, 0.012, 2), st.x + jx, y, st.z + jz, 0, jr, 0));
      if (si === 0 && i === st.n - 1) {
        lidAnchor.x = st.x + jx;
        lidAnchor.y = y + 0.0725;
        lidAnchor.z = st.z + jz;
      }
    }
  }
  group.add(mergedMesh(boxGeos, kraftMat));
  // 标签图集：一张 256 画布 4×2 格，各标签编号栏留空
  const labelAtlas = canvasTexture(256, (g, s) => {
    const r2 = rng(19);
    for (let k = 0; k < 8; k++) {
      const cx = (k % 4) * 64;
      const cy = Math.floor(k / 4) * 128;
      g.fillStyle = '#ddd2b4';
      g.fillRect(cx + 6, cy + 34, 52, 60);
      g.strokeStyle = 'rgba(90,20,26,0.85)';
      g.lineWidth = 2;
      g.strokeRect(cx + 9, cy + 37, 46, 54);
      g.fillStyle = 'rgba(40,32,22,0.9)';
      g.font = '10px "Courier New", monospace';
      g.textAlign = 'center';
      g.fillText('ARCHIVO', cx + 32, cy + 52);
      g.strokeStyle = 'rgba(40,32,22,0.6)';
      g.lineWidth = 1;
      for (let y2 = 0; y2 < 3; y2++) {
        g.beginPath();
        g.moveTo(cx + 14, cy + 64 + y2 * 10);
        g.lineTo(cx + 50, cy + 64 + y2 * 10);
        g.stroke();
      }
      if (r2() < 0.4) {
        g.fillStyle = 'rgba(90,20,26,0.7)';
        g.font = '9px "Courier New", monospace';
        g.fillText('N\u00b0 \u25a1\u25a1\u25a1', cx + 32, cy + 62);
      }
    }
  });
  const labelGeos = [];
  const labelUV = (geo, k) => {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, ((k % 4) + uv.getX(i)) / 4, 1 - (Math.floor(k / 4) + (1 - uv.getY(i))) / 2);
    }
    return geo;
  };
  let li = 0;
  for (const st of stacks) {
    const facing = st.x > 0 ? -1 : 1; // 标签面朝走廊
    for (let i = 0; i < st.n; i += 2) {
      const gplane = labelUV(new THREE.PlaneGeometry(0.11, 0.115), li % 8);
      labelGeos.push(xform(gplane, st.x + facing * 0.228, 0.08 + i * 0.15, st.z, 0, facing > 0 ? Math.PI / 2 : -Math.PI / 2, 0));
      li += 1;
    }
  }
  group.add(mergedMesh(labelGeos, new THREE.MeshStandardMaterial({
    map: labelAtlas, transparent: true, roughness: 0.9,
    polygonOffset: true, polygonOffsetFactor: -1
  })));
  // 顶盒的盖子虚掩着：E → 盖子再滑开一点，里面飘出一点灰（尘埃小场 + page 声）
  const lid = new THREE.Mesh(roundedBoxGeo(0.46, 0.03, 0.36, 0.01, 2), kraftMat);
  lid.position.set(lidAnchor.x, lidAnchor.y + 0.015, lidAnchor.z);
  lid.rotation.set(0.02, 0.18, -0.015);
  group.add(lid);
  const lidDust = dustField(14, { x: 0.5, y: 0.5, z: 0.5 }, { opacity: 0, size: 0.03, color: 0xd8ccb0 });
  lidDust.position.set(lidAnchor.x, lidAnchor.y + 0.3, lidAnchor.z);
  group.add(lidDust);
  updaters.push(lidDust.userData.update);
  const lidState = { open: false, k: 0, dust: 0 };
  updaters.push((dt) => {
    lidState.k += ((lidState.open ? 1 : 0) - lidState.k) * Math.min(1, dt * 5);
    lid.rotation.y = 0.18 + lidState.k * 0.4;
    lid.position.x = lidAnchor.x - lidState.k * 0.09;
    lid.position.y = lidAnchor.y + 0.015 + lidState.k * 0.012;
    if (lidState.dust > 0) lidState.dust -= dt;
    lidDust.material.opacity = Math.max(0, Math.min(lidState.dust, 1)) * 0.4;
  });
  hotspots.add(lid, {
    hint: 'E — 虚掩的盒盖',
    onActivate: () => {
      lidState.open = !lidState.open;
      if (lidState.open) lidState.dust = 2.2;
      audio.sfxAt('page', lidAnchor.x, lidAnchor.z, 0.5, 3);
      if (lidState.open) ui.caption('编号栏是空的。里面也是。', 3400);
    }
  });

  // 护墙板（壁板矩形阵列，合并单 mesh）
  const wainGeos = [];
  const panelGeo = roundedBoxGeo(0.02, 0.72, 1.5, 0.008, 2);
  for (let i = 0; i < 12; i++) {
    const z = -L / 2 + 3.4 + i * 3.6;
    wainGeos.push(xform(panelGeo, -W / 2 + 0.04, 0.62, z));
    wainGeos.push(xform(panelGeo, W / 2 - 0.04, 0.62, z));
  }
  panelGeo.dispose();
  group.add(mergedMesh(wainGeos, woodMat({
    base: [26, 17, 11], planks: 1, size: 256, seed: 18, gloss: 0.5, env: 0.6
  })));

  // 长凳 ×2（艺术二遍：车削木腿 + 滚边软座 + 横枨，去"圆角盒子"观感）
  const benchLegGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.05, 0), new THREE.Vector2(0.042, 0.02), new THREE.Vector2(0.024, 0.06),
    new THREE.Vector2(0.038, 0.18), new THREE.Vector2(0.022, 0.3), new THREE.Vector2(0.04, 0.4),
    new THREE.Vector2(0.034, 0.44)
  ], 12);
  const benchFabric = fabricMat('#1a1216', '#241a20', { seed: 19, repX: 2, repY: 8, sheenColor: 0x907080 });
  for (const z of [-9, 9]) {
    const bench = new THREE.Group();
    // 座垫（微鼓）+ 四周滚边（torus 局部近似：两条长边圆管）
    const seat = roundedBoxMesh(0.6, 0.13, 2.36, 0.055, benchFabric);
    seat.position.y = 0.51;
    const pipeGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.34, 8);
    const piping = mergedMesh([
      xform(pipeGeo, -0.29, 0.462, 0, Math.PI / 2, 0, 0),
      xform(pipeGeo, 0.29, 0.462, 0, Math.PI / 2, 0, 0)
    ], benchFabric);
    pipeGeo.dispose();
    // 木框沿 + 车削腿 + 横枨
    const frame = roundedBoxMesh(0.64, 0.06, 2.4, 0.015,
      woodMat({ base: [26, 17, 11], planks: 1, size: 256, seed: 33, gloss: 0.5 }));
    frame.position.y = 0.42;
    const legs = mergedMesh([
      xform(benchLegGeo, -0.22, 0, -1.02), xform(benchLegGeo, 0.22, 0, -1.02),
      xform(benchLegGeo, -0.22, 0, 1.02), xform(benchLegGeo, 0.22, 0, 1.02)
    ], new THREE.MeshStandardMaterial({ color: 0x1c1008, roughness: 0.5, metalness: 0.15 }));
    const stretcherGeo = new THREE.CylinderGeometry(0.016, 0.016, 2.0, 8);
    const stretchers = mergedMesh([
      xform(stretcherGeo, -0.22, 0.14, 0, Math.PI / 2, 0, 0),
      xform(stretcherGeo, 0.22, 0.14, 0, Math.PI / 2, 0, 0)
    ], new THREE.MeshStandardMaterial({ color: 0x1c1008, roughness: 0.5, metalness: 0.15 }));
    stretcherGeo.dispose();
    bench.add(seat, piping, frame, legs, stretchers);
    bench.position.set(2.9, 0, z);
    group.add(bench);
  }
  benchLegGeo.dispose();

  // ---------- 还书推车（v1.9 抛光第 5 遍）----------
  // 东墙两块展牌之间靠着一辆钢管书车：上层一排布面书脊斜靠成一列、
  // 末一本还没躺稳，下层三本平摞。E → 车往前溜一小段、斜着的那本
  // 顺势倒平（ladderroll 轮鸣 + thud 落书）。书都在，人不在。
  {
    const cart = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x2a3230, roughness: 0.45, metalness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.92, 8);
    const shelfGeo = roundedBoxGeo(0.82, 0.02, 0.38, 0.006, 2);
    const lipGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.82, 6);
    const frame = mergedMesh([
      // 四立柱 + 上下两层板 + 层板前后防滑落细杆 + 顶端推手横杆
      xform(postGeo, -0.41, 0.46, -0.19), xform(postGeo, 0.41, 0.46, -0.19),
      xform(postGeo, -0.41, 0.46, 0.19), xform(postGeo, 0.41, 0.46, 0.19),
      xform(shelfGeo, 0, 0.2, 0), xform(shelfGeo, 0, 0.58, 0),
      xform(lipGeo, 0, 0.66, -0.19, 0, 0, Math.PI / 2),
      xform(lipGeo, 0, 0.66, 0.19, 0, 0, Math.PI / 2),
      xform(new THREE.CylinderGeometry(0.011, 0.011, 0.44, 8), -0.41, 0.93, 0, Math.PI / 2, 0, 0),
      xform(new THREE.CylinderGeometry(0.011, 0.011, 0.44, 8), 0.41, 0.93, 0, Math.PI / 2, 0, 0)
    ], steelMat);
    // 四只脚轮（叉架 + 轮），一只歪着——被推过的车
    const castGeos = [];
    const wheelGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.024, 10);
    const forkGeo = new THREE.BoxGeometry(0.03, 0.06, 0.05);
    for (const [cx, cz, ry] of [[-0.38, -0.16, 0], [0.38, -0.16, 0], [-0.38, 0.16, 0], [0.38, 0.16, 0.7]]) {
      castGeos.push(xform(forkGeo, cx, 0.07, cz, 0, ry, 0));
      castGeos.push(xform(wheelGeo, cx, 0.036, cz, Math.PI / 2, ry, 0));
    }
    cart.add(frame, mergedMesh(castGeos, new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.8 })));
    // 上层书列：布面精装 9 本，色布随机但压暗（图书馆布纹的沉色），
    // 高矮参差、整列向末端渐斜——最后一本单独出来（等着被放倒）
    const bookRng = rng(83);
    const clothColors = [0x54382e, 0x35472e, 0x32405a, 0x50482a, 0x463042];
    const bookGeos = [];
    let bx = -0.36;
    for (let i = 0; i < 9; i++) {
      const h = 0.16 + bookRng() * 0.05;
      const th = 0.028 + bookRng() * 0.014;
      const lean = i > 5 ? (i - 5) * 0.09 : 0;
      bookGeos.push({
        geo: xform(new THREE.BoxGeometry(th, h, 0.24 + bookRng() * 0.04),
          bx + Math.sin(lean) * h * 0.5, 0.59 + Math.cos(lean) * h * 0.5, 0, 0, 0, -lean),
        color: clothColors[Math.floor(bookRng() * clothColors.length)]
      });
      bx += th + 0.004;
    }
    // 逐本上色：合并为单 mesh 前用顶点色（同一布纹材质，色布不重样）
    const bookMat = new THREE.MeshStandardMaterial({ roughness: 0.88, vertexColors: true });
    const coloredGeos = bookGeos.map(({ geo, color }) => {
      const c = new THREE.Color(color);
      const n = geo.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return geo;
    });
    cart.add(mergedMesh(coloredGeos, bookMat));
    // 下层平摞三本 + 一张借书单从中间那本探出一角
    const flatMat = new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.9 });
    cart.add(mergedMesh([
      xform(new THREE.BoxGeometry(0.3, 0.03, 0.22), -0.18, 0.225, 0, 0, 0.06, 0),
      xform(new THREE.BoxGeometry(0.28, 0.026, 0.2), -0.18, 0.253, 0, 0, -0.04, 0),
      xform(new THREE.BoxGeometry(0.31, 0.032, 0.23), -0.18, 0.282, 0, 0, 0.1, 0)
    ], flatMat));
    const slip = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xd8cfba, roughness: 0.95, side: THREE.DoubleSide }));
    slip.rotation.set(-Math.PI / 2 + 0.12, 0, 0.3);
    slip.position.set(-0.05, 0.268, 0.13);
    cart.add(slip);
    // 末端那本：单独 mesh（放倒动画），枢轴在书脚外沿
    const lastPivot = new THREE.Group();
    lastPivot.position.set(bx + 0.05, 0.59, 0);
    const lastBook = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.19, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x5c2a2e, roughness: 0.88 }));
    lastBook.position.set(-0.016, 0.095, 0);
    lastPivot.add(lastBook);
    lastPivot.rotation.z = -0.42; // 斜靠在书列末端
    cart.add(lastPivot);
    cart.position.set(3.72, 0, -2.8);
    cart.rotation.y = Math.PI / 2 + 0.1; // 长轴顺墙、书脊朝走廊；没停正——推它的人走得急
    group.add(cart);
    // E → 车溜走 9cm + 斜书倒平：轮鸣与落书两声、一条字幕
    const cartAnim = { t: -1, done: false, z0: cart.position.z };
    updaters.push((dt) => {
      if (cartAnim.t < 0) return;
      cartAnim.t += dt;
      const k = Math.min(1, cartAnim.t / 0.9);
      const ease = 1 - (1 - k) * (1 - k);
      cart.position.z = cartAnim.z0 - ease * 0.09;
      // 斜书 0.25s 后开始倒：越过支点加速砸平（-0.42 → -π/2）
      const bk = Math.min(1, Math.max(0, (cartAnim.t - 0.25) / 0.45));
      lastPivot.rotation.z = -0.42 - bk * bk * (Math.PI / 2 - 0.42);
      if (cartAnim.t > 1.4) cartAnim.t = -1;
    });
    hotspots.add(frame, {
      hint: 'E — 还书推车',
      onActivate: () => {
        audio.sfx('ladderroll', 0.4);
        if (!cartAnim.done) {
          cartAnim.done = true;
          cartAnim.t = 0;
          setTimeout(() => audio.sfx('thud', 0.5), 620);
          ui.caption('书都还回来了。借书的人没有。', 4200);
        } else if (cart.position.z > -3.07) {
          // 再推还会溜，但最多三小段——车轮下有东西垫着（也不告诉你是什么）
          cartAnim.z0 = cart.position.z;
          cartAnim.t = 0;
          ui.caption('轮子记得路。', 3200);
        }
      }
    });
  }

  // ---------- 阅览桌 + 银行家台灯（拉链开灯：绿玻璃照亮一小片桌面） ----------
  const readTable = new THREE.Group();
  const tableWood = woodMat({ base: [28, 18, 11], planks: 2, size: 256, seed: 57, gloss: 0.6, env: 0.7 });
  const tableTop = roundedBoxMesh(1.5, 0.05, 0.78, 0.015, tableWood);
  tableTop.position.y = 0.755;
  // 桌沿收边条 + 束腰裙板
  const tableLegGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.045, 0), new THREE.Vector2(0.036, 0.03), new THREE.Vector2(0.02, 0.1),
    new THREE.Vector2(0.034, 0.3), new THREE.Vector2(0.02, 0.52), new THREE.Vector2(0.038, 0.66),
    new THREE.Vector2(0.03, 0.73)
  ], 12);
  const tableDarkGeos = [
    xform(new THREE.BoxGeometry(1.56, 0.025, 0.84), 0, 0.725, 0),               // 沿下收边
    xform(new THREE.BoxGeometry(1.34, 0.1, 0.02), 0, 0.66, 0.36),               // 前裙板
    xform(new THREE.BoxGeometry(1.34, 0.1, 0.02), 0, 0.66, -0.36),              // 后裙板
    xform(new THREE.BoxGeometry(0.02, 0.1, 0.62), -0.66, 0.66, 0),
    xform(new THREE.BoxGeometry(0.02, 0.1, 0.62), 0.66, 0.66, 0),
    xform(tableLegGeo, -0.64, 0, -0.32), xform(tableLegGeo, 0.64, 0, -0.32),
    xform(tableLegGeo, -0.64, 0, 0.32), xform(tableLegGeo, 0.64, 0, 0.32),
    // H 枨
    xform(new THREE.CylinderGeometry(0.016, 0.016, 0.6, 8), -0.64, 0.2, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.016, 0.016, 0.6, 8), 0.64, 0.2, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 1.26, 8), 0, 0.2, 0, 0, 0, Math.PI / 2)
  ];
  tableLegGeo.dispose();
  readTable.add(tableTop, mergedMesh(tableDarkGeos,
    new THREE.MeshStandardMaterial({ color: 0x1c1008, roughness: 0.5, metalness: 0.15 })));
  const lamp = bankersLamp({ mats: M });
  lamp.position.set(-0.3, 0.78, -0.12);
  lamp.rotation.y = Math.PI; // 罩口朝廊道（读者站的一侧）
  readTable.add(lamp);
  readTable.position.set(-2.85, 0, -14);
  readTable.rotation.y = -0.16;
  group.add(readTable);
  const lampPool = new THREE.PointLight(0x9fdba8, 0, 2.6, 2.2);
  lampPool.position.set(-3.1, 1.15, -14.1);
  group.add(lampPool);
  const lampState = { on: false, v: 0, jiggle: -1 };
  updaters.push((dt, t) => {
    lampState.v += ((lampState.on ? 1 : 0) - lampState.v) * Math.min(1, dt * 7);
    const v = lampState.v;
    lamp.userData.shadeMat.emissiveIntensity = 0.06 + v * 1.35;
    lamp.userData.bulbMat.emissiveIntensity = 0.1 + v * 3.2;
    lampPool.intensity = v * 3.4;
    if (lampState.jiggle >= 0) {
      lampState.jiggle += dt;
      lamp.userData.chain.rotation.x = Math.sin(lampState.jiggle * 26) * 0.5 *
        Math.max(0, 1 - lampState.jiggle * 1.6);
      if (lampState.jiggle > 0.8) { lamp.userData.chain.rotation.x = 0; lampState.jiggle = -1; }
    }
  });
  hotspots.add(lamp.userData.hitbox, {
    hint: 'E — 台灯拉链',
    onActivate: () => {
      lampState.on = !lampState.on;
      lampState.jiggle = 0;
      audio.sfxAt('switch', -2.85, -14, 0.32, 3);
    }
  });
  // v1.4 P3/P6：借书日期章 + 印台 + 借书卡（E → 章落下盖一记，卡上浮出空白日期）
  const stamp = new THREE.Group();
  const stampKnob = new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.014, 0.002), new THREE.Vector2(0.018, 0.05),
    new THREE.Vector2(0.008, 0.075), new THREE.Vector2(0.026, 0.1), new THREE.Vector2(0.03, 0.13),
    new THREE.Vector2(0.012, 0.145), new THREE.Vector2(0.001, 0.148)
  ], 12);
  stamp.add(mergedMesh([xform(stampKnob, 0, 0.03, 0)],
    woodMat({ base: [46, 26, 14], planks: 1, size: 128, seed: 61, gloss: 0.6 })));
  stamp.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.085, 0.018, 0.05), 0, 0.021, 0),
    xform(new THREE.BoxGeometry(0.07, 0.012, 0.04), 0, 0.006, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.4, metalness: 0.8 })));
  stamp.position.set(0.34, 0.78, 0.1);
  stamp.rotation.y = 0.4;
  readTable.add(stamp);
  const inkPad = mergedMesh([
    xform(roundedBoxGeo(0.13, 0.018, 0.095, 0.006, 2), 0, 0.009, 0),
    xform(new THREE.BoxGeometry(0.115, 0.008, 0.08), 0, 0.021, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x30080e, roughness: 0.9 }));
  inkPad.position.set(0.54, 0.78, -0.13);
  inkPad.rotation.y = -0.3;
  readTable.add(inkPad);
  const mkCardTex = (stamped) => canvasTexture(64, (g, s) => {
    g.fillStyle = '#e6ddc6';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(70,58,44,0.55)';
    g.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      g.beginPath(); g.moveTo(6, 10 + i * 8); g.lineTo(s - 6, 10 + i * 8); g.stroke();
    }
    g.fillStyle = 'rgba(70,58,44,0.8)';
    g.font = '7px "Courier New", monospace';
    g.fillText('DATE DUE', 6, 9);
    if (stamped) {
      g.save();
      g.translate(s / 2, s / 2 + 4);
      g.rotate(-0.12);
      g.fillStyle = 'rgba(170,22,34,0.85)';
      g.font = '700 11px "Courier New", monospace';
      g.textAlign = 'center';
      g.fillText('\u25a1\u25a1 \u00b7 \u25a1\u25a1', 0, 0);
      g.strokeStyle = 'rgba(170,22,34,0.7)';
      g.strokeRect(-22, -11, 44, 16);
      g.restore();
    }
  });
  const cardBlank = mkCardTex(false);
  const cardStamped = mkCardTex(true);
  const cardMat = new THREE.MeshStandardMaterial({ map: cardBlank, roughness: 0.9 });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), cardMat);
  card.rotation.x = -Math.PI / 2;
  card.rotation.z = 0.18;
  card.position.set(0.33, 0.784, 0.1);
  readTable.add(card);
  const stampState = { t: -1, inked: false };
  updaters.push((dt) => {
    if (stampState.t < 0) return;
    stampState.t += dt;
    // 抬起 → 砸下 → 回弹的一拍（0.55s）
    const k = stampState.t / 0.55;
    if (k >= 1) { stamp.position.y = 0.78; stampState.t = -1; return; }
    const lift = Math.sin(Math.min(k * 2.2, 1) * Math.PI) * 0.09;
    const slam = k > 0.62 ? Math.sin((k - 0.62) / 0.38 * Math.PI) * 0.012 : 0;
    stamp.position.y = 0.78 + lift - slam;
    if (!stampState.inked && k > 0.62) {
      stampState.inked = true;
      cardMat.map = cardStamped;
      cardMat.needsUpdate = true;
    }
  });
  hotspots.add(stamp, {
    hint: 'E — 借书日期章',
    onActivate: () => {
      if (stampState.t >= 0) return;
      stampState.t = 0;
      stampState.inked = false;
      cardMat.map = cardBlank;
      cardMat.needsUpdate = true;
      audio.sfxAt('stamp', -2.5, -14, 0.8, 2.5); // 音色自带抬起→闷压时间线
      ui.caption('盖下去的日期是空白的。', 3400);
    }
  });

  // ---------- 阅览桌文具组 v2（v1.9 件 1）：卡片盒 + 放大镜 + 玻璃镇纸 ----------
  // 桌子由「一盏灯一枚章」变成有人常年伏案的位置。
  // 卡片盒：木壳 + 黄铜包边 + 标签框，盒里卡片挤到只剩一指空隙，
  // 三张没归位的斜插着，一枚分隔舌片翘出来。
  const boxWood = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [34, 21, 12], planks: 1, size: 128 }), roughness: 0.55
  });
  const cardBox = new THREE.Group();
  cardBox.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.24, 0.012, 0.16), 0, 0.006, 0),
    xform(new THREE.BoxGeometry(0.24, 0.1, 0.012), 0, 0.05, -0.074),
    xform(new THREE.BoxGeometry(0.24, 0.1, 0.012), 0, 0.05, 0.074),
    xform(new THREE.BoxGeometry(0.012, 0.1, 0.16), -0.114, 0.05, 0),
    xform(new THREE.BoxGeometry(0.012, 0.1, 0.16), 0.114, 0.05, 0)
  ], boxWood));
  cardBox.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.244, 0.014, 0.02), 0, 0.096, -0.07),
    xform(new THREE.BoxGeometry(0.244, 0.014, 0.02), 0, 0.096, 0.07),
    // 正面标签框（空的——本该写着这一盒是什么）
    xform(new THREE.BoxGeometry(0.07, 0.05, 0.004), 0, 0.055, 0.082)
  ], M.brass));
  const cardBlockMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(64, (g, s) => {
      g.fillStyle = '#ddd2b8';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(90,76,56,0.5)';
      g.lineWidth = 1;
      const r = rng(31);
      for (let x = 2; x < s; x += 2 + r() * 2) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 3, s); g.stroke();
      }
    }), roughness: 0.9
  });
  const cardBlock = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.075, 0.13), cardBlockMat);
  cardBlock.position.y = 0.05;
  cardBox.add(cardBlock);
  const loose = mergedMesh([
    xform(new THREE.BoxGeometry(0.002, 0.1, 0.125), -0.055, 0.06, 0, 0, 0, 0.22),
    xform(new THREE.BoxGeometry(0.002, 0.1, 0.125), 0.02, 0.062, 0, 0, 0, -0.14),
    xform(new THREE.BoxGeometry(0.002, 0.098, 0.125), 0.07, 0.058, 0, 0, 0, 0.09),
    // 分隔舌片（深色，翘出来一角）
    xform(new THREE.BoxGeometry(0.003, 0.105, 0.05), -0.02, 0.064, -0.035, 0, 0, -0.05)
  ], new THREE.MeshStandardMaterial({ color: 0xcfc0a0, roughness: 0.92, side: THREE.DoubleSide }));
  cardBox.add(loose);
  cardBox.position.set(-0.62, 0.78, 0.12);
  cardBox.rotation.y = 0.18;
  readTable.add(cardBox);
  // 放大镜：黄铜圈 + 玻璃片 + 车削木柄，镜面平躺在桌上
  const magnifier = new THREE.Group();
  magnifier.add(mergedMesh([
    xform(new THREE.TorusGeometry(0.055, 0.008, 8, 26), 0, 0.012, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.012, 0.009, 0.035, 8), 0, 0.011, 0.072, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.007, 0.007, 0.014, 8), 0, 0.011, 0.2, Math.PI / 2, 0, 0)
  ], M.brass));
  const magHandle = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.008, 0), new THREE.Vector2(0.0125, 0.03), new THREE.Vector2(0.0135, 0.06),
      new THREE.Vector2(0.011, 0.09), new THREE.Vector2(0.0075, 0.105)
    ], 12), M.darkWood
  );
  magHandle.rotation.x = -Math.PI / 2;
  magHandle.position.set(0, 0.011, 0.088);
  magnifier.add(magHandle);
  const magLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.006, 22),
    new THREE.MeshStandardMaterial({
      color: 0xd8e4dc, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1,
      emissive: 0x9fdba8, emissiveIntensity: 0, depthWrite: false
    })
  );
  magLens.position.y = 0.012;
  magnifier.add(magLens);
  magnifier.position.set(0.04, 0.782, 0.27);
  magnifier.rotation.y = -0.62;
  readTable.add(magnifier);
  const magState = { t: -1 };
  updaters.push((dt) => {
    if (magState.t < 0) return;
    magState.t += dt;
    const u = magState.t;
    if (u > 2.2) { magState.t = -1; magLens.material.emissiveIntensity = 0; magnifier.rotation.x = 0; return; }
    // 镜片接住台灯的绿：一口亮起缓落 + 镜身晃两下摆平
    magLens.material.emissiveIntensity = Math.sin(Math.min(1, u / 1.6) * Math.PI) * 1.4;
    magnifier.rotation.x = Math.sin(u * 16) * 0.05 * Math.max(0, 1 - u / 0.8);
  });
  hotspots.add(magLens, {
    hint: 'E — 放大镜',
    onActivate: () => {
      if (magState.t >= 0) return;
      magState.t = 0;
      audio.sfxAt('iceclink', -2.8, -13.7, 0.35, 3);
      setTimeout(() => ui.caption('镜片是热的。', 3000), 700);
    }
  });
  // 玻璃镇纸：绒毡底座 + 玻璃穹顶，里面悬着一粒烟色的泪滴
  const pwFelt = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.052, 0.01, 18),
    new THREE.MeshStandardMaterial({ color: 0x3a1418, roughness: 0.95 }));
  pwFelt.position.set(0.62, 0.785, 0.2);
  const pwDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.046, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xcfdce4, transparent: true, opacity: 0.3, roughness: 0.04, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.08
    })
  );
  pwDome.position.set(0.62, 0.79, 0.2);
  const pwSeed = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.3 }));
  pwSeed.scale.set(0.7, 1.25, 0.7);
  pwSeed.position.set(0.62, 0.812, 0.2);
  readTable.add(pwFelt, pwDome, pwSeed);

  // ---------- 16mm 放映机展台（对东墙投一方无声的白） ----------
  const projector = filmProjector({ mats: M });
  projector.position.set(-2.4, 0, 8.2);
  projector.rotation.y = Math.PI / 2; // 镜头指 +X（东墙）
  group.add(projector);
  // 光锥（镜头 → 东墙）+ 墙上抖动的空白画格
  const beam = lightCone(0.06, 0.9, 6.3, 0xfff2d8, 0.05);
  beam.rotation.z = -Math.PI / 2 + 0.04;
  beam.position.set(1.2, 1.23, 8.2);
  beam.visible = false;
  group.add(beam);
  const frameTex = canvasTexture(256, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s * 0.72);
    grad.addColorStop(0, 'rgba(255,246,228,0.95)');
    grad.addColorStop(0.75, 'rgba(240,228,204,0.55)');
    grad.addColorStop(1, 'rgba(200,190,170,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    // 片门刮痕
    g.strokeStyle = 'rgba(120,110,95,0.25)';
    for (let i = 0; i < 5; i++) {
      g.lineWidth = 1 + (i % 2);
      const x = s * (0.15 + i * 0.18);
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, s); g.stroke();
    }
  });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 1.5),
    new THREE.MeshBasicMaterial({
      map: frameTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  screen.position.set(W / 2 - 0.04, 1.5, 8.2);
  screen.rotation.y = -Math.PI / 2;
  group.add(screen);
  const projLight = new THREE.PointLight(0xfff2d8, 0, 5.5, 1.8);
  projLight.position.set(W / 2 - 1.2, 1.6, 8.2);
  group.add(projLight);
  const projState = { on: false, v: 0 };
  updaters.push((dt, t) => {
    projState.v += ((projState.on ? 1 : 0) - projState.v) * Math.min(1, dt * 4);
    const v = projState.v;
    if (v < 0.01) { beam.visible = false; screen.material.opacity = 0; projLight.intensity = 0; return; }
    beam.visible = true;
    // 24 格快门颤 + 偶发跳帧
    const flick = 0.82 + Math.sin(t * 46) * 0.1 + (Math.sin(t * 3.1) > 0.96 ? -0.3 : 0);
    beam.material.opacity = 0.05 * v * flick;
    screen.material.opacity = 0.85 * v * flick;
    screen.position.y = 1.5 + Math.sin(t * 24) * 0.006 * v; // 片门抖动
    projLight.intensity = 5.5 * v * flick;
    projector.userData.lensMat.emissiveIntensity = 2.4 * v * flick;
    projector.userData.reelF.rotation.x -= dt * 5.6 * v;
    projector.userData.reelR.rotation.x -= dt * 6.4 * v;
  });
  hotspots.add(projector.userData.hitbox, {
    hint: 'E — 放映机',
    onActivate: () => {
      projState.on = !projState.on;
      audio.sfxAt(projState.on ? 'projector' : 'switch', -2.0, 8.2, 0.7);
      if (projState.on) ui.caption('每秒二十四格的空白。', 3600);
    }
  });

  // ---------- 滚动图书梯（v1.4 P3 新件）：黄铜墙轨 + 双弦梯 + 挂钩 + 胶轮 ----------
  // E → 沿墙轨滚去另一端（轮子转、黄铜钩磨轨、木身吱呀）
  group.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.022, 0.022, 4.2, 10), W / 2 - 0.16, 4.35, 2.4, Math.PI / 2, 0, 0),
    xform(new THREE.BoxGeometry(0.1, 0.05, 0.05), W / 2 - 0.1, 4.35, 0.6),
    xform(new THREE.BoxGeometry(0.1, 0.05, 0.05), W / 2 - 0.1, 4.35, 2.4),
    xform(new THREE.BoxGeometry(0.1, 0.05, 0.05), W / 2 - 0.1, 4.35, 4.2)
  ], M.brass));
  const ladder = new THREE.Group();
  const ladderWood = woodMat({ base: [34, 22, 13], planks: 1, size: 256, seed: 44, gloss: 0.45 });
  const stringerGeo = roundedBoxGeo(0.035, 4.55, 0.09, 0.012, 2);
  const ladderGeos = [
    xform(stringerGeo, -0.26, 2.275, 0),
    xform(stringerGeo, 0.26, 2.275, 0)
  ];
  for (let i = 0; i < 11; i++) {
    ladderGeos.push(xform(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 8), 0, 0.35 + i * 0.39, 0, 0, 0, Math.PI / 2));
  }
  ladder.add(mergedMesh(ladderGeos, ladderWood));
  // 顶端黄铜挂钩 ×2（扣住墙轨）+ 底端轮叉
  ladder.add(mergedMesh([
    xform(new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI * 1.2), -0.26, 4.52, 0.02, -0.3, Math.PI / 2, 0),
    xform(new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI * 1.2), 0.26, 4.52, 0.02, -0.3, Math.PI / 2, 0),
    xform(new THREE.BoxGeometry(0.05, 0.12, 0.02), -0.26, 0.1, 0.045),
    xform(new THREE.BoxGeometry(0.05, 0.12, 0.02), 0.26, 0.1, 0.045)
  ], M.brass));
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.85 });
  const wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), wheelMat);
  wheelL.rotation.z = Math.PI / 2;
  wheelL.position.set(-0.26, 0.05, 0.06);
  const wheelR = wheelL.clone();
  wheelR.position.x = 0.26;
  ladder.add(wheelL, wheelR);
  ladder.position.set(W / 2 - 1.12, 0, 2.4);
  ladder.rotation.z = -0.21;
  group.add(ladder);
  const ladderState = { z: 2.4, target: 3.5 };
  updaters.push((dt) => {
    const dz = (ladderState.target - ladderState.z) * Math.min(1, dt * 2.2);
    ladderState.z += dz;
    ladder.position.z = ladderState.z;
    wheelL.rotation.x += dz / 0.05;
    wheelR.rotation.x += dz / 0.05;
  });
  hotspots.add(ladder.children[0], {
    hint: 'E — 推一把图书梯',
    onActivate: () => {
      ladderState.target = ladderState.target > 2.4 ? 1.3 : 3.5;
      audio.sfxAt('ladderroll', W / 2 - 1, ladderState.z, 0.8, 4);
      setTimeout(() => audio.sfxAt('thud', W / 2 - 1, ladderState.target, 0.28, 3), 950);
      ui.caption('最上面一格，谁也够不着。', 3200);
    }
  });

  // ---------- 气送管站（v1.4 五遍）：黄铜立管进天花 + 铁站体 + 翻盖口 + 铜舱 ----------
  // E → 舱滑进站口、盖合上、whoosh 吸走 → 远处闷响 → 几秒后叮一声，
  // 盖翻开，一支舱掉回托盘——皮箍在另一头（回来的不是你送上去的那支）
  const pn = new THREE.Group();
  // 立管（r0.055 到顶）+ 天花法兰 + 墙装抱箍 ×2
  pn.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.055, 0.055, 3.9, 12), 0, 3.45, 0),
    xform(new THREE.CylinderGeometry(0.09, 0.075, 0.06, 12), 0, 5.37, 0),
    xform(new THREE.TorusGeometry(0.062, 0.014, 6, 12), 0, 2.4, 0, Math.PI / 2, 0, 0),
    xform(new THREE.TorusGeometry(0.062, 0.014, 6, 12), 0, 4.3, 0, Math.PI / 2, 0, 0),
    xform(new THREE.BoxGeometry(0.05, 0.04, 0.1), 0, 2.4, -0.09),
    xform(new THREE.BoxGeometry(0.05, 0.04, 0.1), 0, 4.3, -0.09)
  ], M.brass));
  // 站体（铁）：外壳 + 凹入的暗口 + 托盘沿
  pn.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.3, 0.46, 0.22), 0, 1.28, 0.02),
    xform(new THREE.BoxGeometry(0.34, 0.06, 0.26), 0, 1.54, 0.02),
    xform(new THREE.BoxGeometry(0.34, 0.06, 0.26), 0, 1.02, 0.02),
    // 托盘（斜向外的接舱槽）
    xform(new THREE.BoxGeometry(0.2, 0.03, 0.18), 0, 0.96, 0.19, 0.28, 0, 0),
    xform(new THREE.BoxGeometry(0.03, 0.06, 0.18), -0.1, 1.0, 0.19, 0.28, 0, 0),
    xform(new THREE.BoxGeometry(0.03, 0.06, 0.18), 0.1, 1.0, 0.19, 0.28, 0, 0)
  ], M.iron));
  const pnMouth = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 1 }));
  pnMouth.position.set(0, 1.28, 0.134);
  pn.add(pnMouth);
  // 翻盖（顶铰链）：开 = 垂下 0.95 rad
  const pnFlapPivot = new THREE.Group();
  pnFlapPivot.position.set(0, 1.39, 0.14);
  const pnFlap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.012), M.brass);
  pnFlap.position.y = -0.11;
  pnFlapPivot.add(pnFlap);
  pnFlapPivot.rotation.x = 0.95;
  pn.add(pnFlapPivot);
  // 铜舱（圆柱 + 双球端帽 + 一端皮箍）
  const pnCapsule = mergedMesh([
    xform(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), 0, 0, 0),
    xform(new THREE.SphereGeometry(0.04, 12, 8), 0, 0.06, 0),
    xform(new THREE.SphereGeometry(0.04, 12, 8), 0, -0.06, 0)
  ], M.brass);
  const pnBand = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 0.8 }));
  pnBand.position.y = 0.045;
  pnCapsule.add(pnBand);
  const pnHome = new THREE.Vector3(0, 1.02, 0.24);
  pnCapsule.position.copy(pnHome);
  pnCapsule.rotation.set(Math.PI / 2 - 0.28, 0, 0);
  pn.add(pnCapsule);
  // 站体上方一盏小暖光：黄铜立管在冷荧光廊里有了一条自己的金线
  const pnGlow = new THREE.PointLight(0xffdfae, 2.2, 3.6, 1.8);
  pnGlow.position.set(0, 2.0, 0.5);
  pn.add(pnGlow);
  pn.position.set(W / 2 - 0.02, 0, 14.7);
  pn.rotation.y = -Math.PI / 2;
  group.add(pn);
  const pnState = { t: -1 };
  updaters.push((dt) => {
    if (pnState.t < 0) return;
    pnState.t += dt;
    const u = pnState.t;
    if (u < 0.45) {
      // 舱滑进站口 + 盖随行合上
      const k = u / 0.45;
      pnCapsule.position.lerpVectors(pnHome, new THREE.Vector3(0, 1.28, 0.1), k);
      pnCapsule.rotation.x = (Math.PI / 2 - 0.28) * (1 - k);
      pnFlapPivot.rotation.x = 0.95 * (1 - k);
    } else if (u < 4.1) {
      pnCapsule.visible = false;
      pnFlapPivot.rotation.x = 0;
    } else if (u < 4.75) {
      // 盖翻开 + 舱掉回托盘（重力 + 一次小弹）
      const k = (u - 4.1) / 0.65;
      pnFlapPivot.rotation.x = 0.95 * Math.min(1, k * 2.2);
      pnCapsule.visible = true;
      const fall = Math.min(1, k * 1.25);
      const y = 1.28 - (1.28 - 1.02) * fall * fall + (k > 0.82 ? Math.sin((k - 0.82) * 17) * 0.012 : 0);
      pnCapsule.position.set(0, y, 0.1 + 0.14 * fall);
      pnCapsule.rotation.x = (Math.PI / 2 - 0.28) * fall;
      pnCapsule.rotation.z = Math.PI; // 皮箍翻到另一头
    } else if (u > 5.4) {
      pnState.t = -1;
      pnCapsule.position.copy(pnHome);
      pnCapsule.rotation.set(Math.PI / 2 - 0.28, 0, Math.PI);
    }
  });
  hotspots.add(pnCapsule, {
    hint: 'E — 气送管',
    onActivate: () => {
      if (pnState.t >= 0) return;
      pnState.t = 0;
      const px = W / 2 - 0.02;
      audio.sfxAt('click', px, 14.7, 0.4, 3);
      setTimeout(() => audio.sfxAt('whoosh', px, 14.7, 0.7, 5), 500);
      setTimeout(() => audio.sfx('thud', 0.16), 1500);   // 远在天花之上的落定
      setTimeout(() => audio.sfxAt('chime', px, 14.7, 0.3, 4), 4000);
      setTimeout(() => audio.sfxAt('thud', px, 14.7, 0.3, 3), 4600);
      setTimeout(() => ui.caption('回来的不是你送上去的那支。', 4200), 4800);
    }
  });

  // ---------- 西侧壁龛：原话摘录墙（他自己的话，唯一的字） ----------
  const niche = new THREE.Group();
  const nicheWallMat = new THREE.MeshStandardMaterial({ color: 0x100c0e, roughness: 0.9 });
  const nw1 = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 5.4), nicheWallMat);
  nw1.position.set(-W / 2 - 3.5, 2.7, 0);
  nw1.rotation.y = Math.PI / 2;
  const nw2 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.4), nicheWallMat);
  nw2.position.set(-W / 2 - 1.7, 2.7, -2.5);
  const nw3 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.4), nicheWallMat);
  nw3.position.set(-W / 2 - 1.7, 2.7, 2.5);
  nw3.rotation.y = Math.PI;
  const nFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5), new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [24, 17, 11], planks: 5, size: 256 }), roughness: 0.5
  }));
  nFloor.rotation.x = -Math.PI / 2;
  nFloor.position.set(-W / 2 - 1.7, 0.008, 0);
  const nCeil = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5), new THREE.MeshStandardMaterial({ color: 0x0b0809, roughness: 0.95 }));
  nCeil.rotation.x = Math.PI / 2;
  nCeil.position.set(-W / 2 - 1.7, 5.4, 0);
  niche.add(nw1, nw2, nw3, nFloor, nCeil);
  // 摘录墙本体：他的三句原话（英文排印）
  const pick = [QUOTES[0], QUOTES[1], QUOTES[9]];
  const quoteWallTex = canvasTexture(1024, (g, s) => {
    g.fillStyle = '#0d0a0c';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(201,163,92,0.5)';
    g.lineWidth = 3;
    g.strokeRect(40, 40, s - 80, s - 80);
    g.textAlign = 'left';
    let y = 170;
    for (const q of pick) {
      g.fillStyle = '#c9a35c';
      g.font = '400 90px Georgia, serif';
      g.fillText('\u201c', 80, y);
      g.fillStyle = 'rgba(242,233,220,0.92)';
      g.font = 'italic 44px Georgia, serif';
      const words = q.en.split(' ');
      let line = '';
      for (const w of words) {
        if (g.measureText(line + w).width > s - 260) {
          g.fillText(line, 150, y);
          y += 62;
          line = w + ' ';
        } else line += w + ' ';
      }
      g.fillText(line, 150, y);
      y += 110;
    }
    g.fillStyle = 'rgba(201,163,92,0.8)';
    g.font = '30px "Courier New", monospace';
    g.textAlign = 'right';
    g.fillText('— DAVID LYNCH', s - 90, s - 80);
  });
  const quoteWall = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshStandardMaterial({
      map: quoteWallTex, roughness: 0.7,
      emissive: 0xf2e9dc, emissiveMap: quoteWallTex, emissiveIntensity: 0.35
    })
  );
  quoteWall.position.set(-W / 2 - 3.42, 2.6, 0);
  quoteWall.rotation.y = Math.PI / 2;
  niche.add(quoteWall);
  hotspots.add(quoteWall, {
    hint: 'E — 他自己的话（摘录墙）',
    onActivate: () => ui.showQuotes()
  });
  const nicheLight = new THREE.PointLight(0xffe6c0, 5, 8, 1.8);
  nicheLight.position.set(-W / 2 - 1.6, 3.6, 0);
  niche.add(nicheLight);
  group.add(niche);

  // 尽头纪念墙
  const wallTex = canvasTexture(1024, (g, s) => {
    g.fillStyle = '#0c0709';
    g.fillRect(0, 0, s, s);
    g.textAlign = 'center';
    g.fillStyle = '#f2e9dc';
    g.font = '400 96px Georgia, serif';
    g.fillText('DAVID LYNCH', s / 2, 340);
    g.fillStyle = '#c9a35c';
    g.font = '54px Georgia, serif';
    g.fillText('1946 — 2025', s / 2, 450);
    g.strokeStyle = 'rgba(212,36,60,0.8)';
    g.lineWidth = 5;
    g.strokeRect(70, 170, s - 140, s - 380);
  });
  const memorial = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshStandardMaterial({
      map: wallTex, roughness: 0.6,
      emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 0.42
    })
  );
  memorial.position.set(0, 3, -L / 2 + 0.12);
  group.add(memorial);
  hotspots.add(memorial, {
    hint: 'E — 生平与荣誉',
    onActivate: () => ui.showArtist()
  });
  // v1.4 P3 纪念墙 v2：五通道脉络大理石门套——双壁柱（础/身/顶帽）+ 过梁横楣 +
  // 整块大理石台基踏步；烛台桌整个抬上台基；前场一对黄铜绒绳（瞻仰的距离感）
  const memMarble = marbleMat({ seed: 27, repX: 1, repY: 2, veinA: [70, 74, 88] });
  group.add(mergedMesh([
    // 台基踏步（贯通整面墙前）
    xform(new THREE.BoxGeometry(8.2, 0.14, 1.9), 0, 0.07, -L / 2 + 1.0),
    xform(new THREE.BoxGeometry(8.6, 0.06, 2.2), 0, 0.03, -L / 2 + 1.12),
    // 壁柱 ×2：柱础 / 柱身 / 顶帽
    xform(new THREE.BoxGeometry(0.66, 0.5, 0.5), -3.62, 0.39, -L / 2 + 0.3),
    xform(new THREE.BoxGeometry(0.66, 0.5, 0.5), 3.62, 0.39, -L / 2 + 0.3),
    xform(roundedBoxGeo(0.52, 4.3, 0.38, 0.04), -3.62, 2.75, -L / 2 + 0.26),
    xform(roundedBoxGeo(0.52, 4.3, 0.38, 0.04), 3.62, 2.75, -L / 2 + 0.26),
    xform(new THREE.BoxGeometry(0.66, 0.22, 0.5), -3.62, 5.0, -L / 2 + 0.3),
    xform(new THREE.BoxGeometry(0.66, 0.22, 0.5), 3.62, 5.0, -L / 2 + 0.3),
    // 过梁横楣（压在双柱顶上）
    xform(new THREE.BoxGeometry(8.0, 0.42, 0.46), 0, 5.32, -L / 2 + 0.3)
  ], memMarble));
  for (const sx of [-1, 1]) {
    const rope = stanchionRope({ span: 2.0, mats: M });
    rope.position.set(sx * 1.45, 0, -L / 2 + 2.5);
    group.add(rope);
  }

  // 纪念墙前的"烛火"排（v1.4：整桌抬上大理石台基）
  // v1.9 抛光第 7 遍：静默区烛火响应——人一走进围栏，火苗齐齐抬头一拍
  const hushFlare = { v: 0 };
  for (let i = 0; i < 7; i++) {
    const x = -1.8 + i * 0.6;
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.8 })
    );
    candle.position.set(x, 0.74, -L / 2 + 1.3);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb45e, emissiveIntensity: 5 })
    );
    flame.position.set(x, 0.92, -L / 2 + 1.3);
    group.add(candle, flame);
    updaters.push((dt, t) => {
      flame.material.emissiveIntensity =
        4.2 + Math.sin(t * 9 + i * 2.4) * 1.1 + Math.random() * 0.5 + hushFlare.v * 2.6;
      flame.scale.y = 1 + hushFlare.v * 0.5;
    });
  }
  // ---------- 静默区（v1.9 抛光第 7 遍）----------
  // 走进纪念墙的围栏，整馆的声音自己退下去——底噪/荧光嗡鸣都按到
  // 只剩一线，耳边只有你自己。烛火在你进来那一拍齐齐抬头。
  // 退出围栏，声音像潮水一样漫回来。这里不需要一个字的说明。
  const hush = { in: false, t: 0, said: false };
  updaters.push((dt) => {
    const dx = player.x;
    const dz = player.z + 21.9;
    const inNow = dx * dx + dz * dz < 1.7 * 1.7;
    if (inNow) {
      hush.t -= dt;
      if (hush.t <= 0) {
        audio.duck(1.1, 0.07, 1.3); // 连续续杯保持静默，离开后 1.3s 自然涨回
        hush.t = 1.0;
      }
      if (!hush.in) {
        hushFlare.v = 1;
        if (!hush.said) {
          hush.said = true;
          setTimeout(() => ui.caption('长廊在这里屏住呼吸。', 3600), 700);
        }
      }
    } else {
      hush.t = 0;
    }
    hush.in = inNow;
    if (hushFlare.v > 0) hushFlare.v = Math.max(0, hushFlare.v - dt * 0.7);
  });
  const table = roundedBoxMesh(5, 0.46, 0.7, 0.04,
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: [20, 12, 8], planks: 2, size: 128 }), roughness: 0.5 }));
  table.position.set(0, 0.37, -L / 2 + 1.3);
  const memLight = new THREE.PointLight(0xffb45e, 7, 10, 1.8);
  memLight.position.set(0, 1.6, -L / 2 + 2);
  group.add(table, memLight);

  // ---------- 彩蛋：不在年表上的心跳 ----------
  const ghostTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#0c0709';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#d4243c';
    g.font = '400 120px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('20\u25a1\u25a1', s / 2, 168);
    g.fillStyle = '#f2e9dc';
    g.font = '400 44px Georgia, serif';
    g.fillText('THE UNSEEN ONE', s / 2, 268, s - 60);
    g.strokeStyle = '#d4243c';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(90, 388); g.lineTo(s - 90, 388);
    g.stroke();
    g.fillStyle = 'rgba(242,233,220,0.45)';
    g.font = '26px "Courier New", monospace';
    g.fillText('NOT IN THE TIMELINE', s / 2, 440);
  });
  const ghostPlaque = roundedBoxMesh(1.5, 1.5, 0.09, 0.03,
    new THREE.MeshStandardMaterial({
      map: ghostTex, roughness: 0.55,
      emissive: 0xffffff, emissiveMap: ghostTex, emissiveIntensity: 0.7
    }));
  ghostPlaque.position.set(-(W / 2 - 0.28), 2.05, 8.2);
  ghostPlaque.rotation.y = Math.PI / 2;
  ghostPlaque.visible = false;
  group.add(ghostPlaque);

  let ghostTimers = [];
  const ghostState = { active: false };
  const showGhost = () => {
    if (ghostState.active) return;
    ghostState.active = true;
    for (const id of ghostTimers) clearTimeout(id);
    ghostTimers = [];
    audio.duck(1.0, 0.05, 2.0);
    tubes.forEach((tb, i) => {
      ghostTimers.push(setTimeout(() => {
        tb.dead = 1;
        audio.sfx('fluor', 0.5);
      }, i * 190));
    });
    ghostTimers.push(setTimeout(() => {
      ghostPlaque.visible = true;
      audio.sfx('whisper', 0.8);
      ui.caption('身后的墙上，多了一块灯牌。', 4600);
    }, 1500));
    tubes.forEach((tb, i) => {
      ghostTimers.push(setTimeout(() => { tb.dead = 0; }, 3400 + i * 160));
    });
  };
  const ghostTrig = zoneTrigger({ x: 0, z: -L / 2 + 3.2, r: 2.6 }, showGhost, { cooldown: 50 });
  updaters.push((dt) => ghostTrig.update(player, dt));
  const vanishTrig = zoneTrigger({ x: -(W / 2 - 1.6), z: 8.2, r: 2.2 }, () => {
    if (!ghostPlaque.visible) return;
    ghostPlaque.visible = false;
    ghostState.active = false;
    audio.sfx('fluor', 0.9);
    audio.sfx('thud', 0.5);
    ui.caption('灯牌熄灭了。年表恢复了整齐。', 4600);
  }, { cooldown: 8 });
  updaters.push((dt) => vanishTrig.update(player, dt));

  // 回大厅之门
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, L / 2 - 0.6);
  back.rotation.y = Math.PI;
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  // 氛围
  const smoke = smokeLayer(46, { x: W, z: L }, { opacity: 0.03, size: 7, yBase: 0.2, ySpread: 1 });
  group.add(smoke);
  updaters.push(smoke.userData.update);
  const dust = dustField(200, { x: W, y: 5, z: L }, { opacity: 0.32, size: 0.04 });
  group.add(dust);
  updaters.push(dust.userData.update);
  // v1.10 C3：长廊的灰随馆的呼吸同拍起伏（40s 一息，档案厅呼吸最浅）
  updaters.push(() => {
    dust.material.opacity = 0.32 * (1 + engine.breath * 0.24);
    smoke.material.opacity = 0.03 * (1 + engine.breath * 0.16);
  });
  group.add(new THREE.AmbientLight(0x1c2026, 1.1));

  return {
    group,
    spawn: { x: 0, z: L / 2 - 4, yaw: 0 },
    bounds: multiRectBounds([HALL, NICHE]),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'ghost-plaque': ghostTrig }
  };
}
