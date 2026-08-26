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
  woodMat, fabricMat, marbleMat, roundedBoxGeo, lightCone
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
    grade: { lift: [0.006, 0.01, 0.016], gamma: [0.99, 1.0, 1.02], gain: [0.97, 1.0, 1.04] }
  }
};

const W = 9;
const L = 48;
// 主廊 + 西侧摘录墙壁龛
const HALL = { minX: -W / 2 + 1, maxX: W / 2 - 1, minZ: -L / 2 + 1.9, maxZ: L / 2 - 1.6 };
const NICHE = { minX: -W / 2 - 3.4, maxX: -W / 2 + 1.2, minZ: -2.4, maxZ: 2.4 };

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player } = ctx;
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
  const catalogs = [
    { x: W / 2 - 0.55, z: -2.2, ry: -Math.PI / 2 },
    { x: -W / 2 + 0.55, z: 13.6, ry: Math.PI / 2 }
  ].map(({ x, z, ry }) => {
    const cab = cardCatalog({ cols: 4, rows: 5, mats: M });
    cab.position.set(x, 0, z);
    cab.rotation.y = ry;
    group.add(cab);
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
      flame.material.emissiveIntensity = 4.2 + Math.sin(t * 9 + i * 2.4) * 1.1 + Math.random() * 0.5;
    });
  }
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
  group.add(new THREE.AmbientLight(0x1c2026, 1.1));

  return {
    group,
    spawn: { x: 0, z: L / 2 - 4, yaw: 0 },
    bounds: multiRectBounds([HALL, NICHE]),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'ghost-plaque': ghostTrig }
  };
}
