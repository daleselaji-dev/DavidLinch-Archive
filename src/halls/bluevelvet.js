// ============================================================
// 《蓝丝绒》展厅 —— THE BLUE ROOM 夜总会
// 蓝天鹅绒舞台（帷头层 + 台口脚灯 + 踏步）+ 桌灯烛光 +
// 吧台一角（背光酒瓶墙 + 吧凳 + 黄铜脚踏）+ 香烟薄雾
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, floorMesh, doorway, curtain, curtainWithValance,
  neonSign, micStand, smokeLayer, dustField, lightCone, quotePlaque, vitrine,
  velvetMaterial, zoneTrigger, rectBounds,
  mergedMesh, xform, roundedBoxMesh, woodTexture, brushedMetalTexture, weaveTexture,
  woodMat, fabricMat
} from './kit.js';
import { propMats, jukebox, beerTaps, cashRegister } from './props.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'bluevelvet',
  name: 'BLUE VELVET · 蓝色房间 (1986)',
  ambience: 'bluevelvet',
  narration: 'bluevelvet',
  space: 'room',
  floorSfx: 'wood',
  look: { saturation: 0.92, tint: 0xdfe6ff, fogColor: 0x030409, fogDensity: 0.05, bg: 0x02030a, exposure: 1.0, bloom: 0.95 }
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
  const cone = lightCone(0.35, 1.7, 5.2, 0xdfe6ff, 0.07);
  cone.position.set(0, 3.1, -D / 2 + 2.3);
  group.add(cone);

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
  // 背柜 + 酒瓶墙（发光轮廓，合并两组）
  const backbar = roundedBoxMesh(0.34, 2.6, 6.4, 0.04,
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: [20, 12, 14], planks: 3, vertical: true, size: 256 }), roughness: 0.6 }));
  backbar.position.set(-W / 2 + 0.4, 1.3, 0.8);
  bar.add(backbar);
  const shelfGeos = [
    xform(new THREE.BoxGeometry(0.3, 0.03, 6.0), -W / 2 + 0.42, 1.5, 0.8),
    xform(new THREE.BoxGeometry(0.3, 0.03, 6.0), -W / 2 + 0.42, 2.1, 0.8)
  ];
  bar.add(mergedMesh(shelfGeos, brassMat));
  const bottleGeos = [];
  for (let shelf = 0; shelf < 2; shelf++) {
    for (let i = 0; i < 12; i++) {
      const bh = 0.26 + Math.random() * 0.16;
      const geo = new THREE.CylinderGeometry(0.035, 0.045, bh, 8);
      bottleGeos.push(xform(geo, -W / 2 + 0.42, 1.52 + shelf * 0.6 + bh / 2, -1.9 + i * 0.46 + Math.random() * 0.05));
      geo.dispose();
      const neck = new THREE.CylinderGeometry(0.012, 0.02, 0.1, 6);
      bottleGeos.push(xform(neck, -W / 2 + 0.42, 1.52 + shelf * 0.6 + bh + 0.05, -1.9 + i * 0.46));
      neck.dispose();
    }
  }
  const bottles = mergedMesh(bottleGeos, new THREE.MeshPhysicalMaterial({
    color: 0x1a3a55, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82,
    emissive: 0x2a5a88, emissiveIntensity: 0.5, envMapIntensity: 1.5
  }));
  bar.add(bottles);
  // 背光条
  const barGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x0a0a12, emissive: 0x3ec5ff, emissiveIntensity: 0.55 })
  );
  barGlow.position.set(-W / 2 + 0.28, 1.9, 0.8);
  barGlow.rotation.y = Math.PI / 2;
  bar.add(barGlow);
  const barLight = new THREE.PointLight(0x66aaff, 4, 8, 1.8);
  barLight.position.set(-W / 2 + 1.4, 2.1, 0.8);
  bar.add(barLight);
  updaters.push((dt, t) => {
    barGlow.material.emissiveIntensity = 0.5 + Math.sin(t * 1.9) * 0.12;
    bottles.material.emissiveIntensity = 0.42 + Math.sin(t * 1.9 + 1) * 0.14;
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
      if (jukeState.on) ui.caption('隔壁房间的乐队醒了。', 3600);
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
    }
  });

  // ---------- 彩蛋：衣柜的暗侧 ----------
  const closetMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [26, 18, 12], planks: 2, vertical: true, size: 256 }), roughness: 0.8
  });
  const closet = new THREE.Group();
  const closetBody = roundedBoxMesh(1.3, 2.4, 0.7, 0.04, closetMat);
  closetBody.position.y = 1.2;
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
