// ============================================================
// 《橡皮头》展厅 —— INDUSTRIAL LULLABY 工业摇篮曲
// 近单色的机器房 + 西侧锅炉房分区：
// 法兰管道 / 铆钉锅炉 / 检修步道 / 压力表 / 蒸汽 / 铁笼灯
// ============================================================
import * as THREE from 'three';
import {
  canvasTexture, noiseCanvasTexture, floorMesh, doorway,
  smokeLayer, dustField, quotePlaque, vitrine, darkFigure,
  zoneTrigger, makeFlicker, multiRectBounds,
  mergedMesh, xform, roundedBoxMesh, railing, brushedMetalTexture,
  concreteMat, brickMat, hangingBulb
} from './kit.js';
import { propMats, fireboxDoor, valveWheel, fuseBox } from './props.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'eraserhead',
  name: 'ERASERHEAD · 工业摇篮曲 (1977)',
  ambience: 'eraserhead',
  narration: 'eraserhead',
  space: 'tiled',
  floorSfx: 'concrete',
  look: { saturation: 0.09, tint: 0xe9edf2, fogColor: 0x050507, fogDensity: 0.052, bg: 0x030304, exposure: 0.88, bloom: 0.62 }
};

const S = 17; // 主房间边长
const MAIN = { minX: -S / 2 + 1.1, maxX: S / 2 - 1.1, minZ: -S / 2 + 1.6, maxZ: S / 2 - 1.4 };
const ANNEX = { minX: -S / 2 - 6.2, maxX: -S / 2 + 1.2, minZ: -2.6, maxZ: 2.6 }; // 锅炉房

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 污渍水泥地（v1.3 三通道：伸缩缝法线 + 污渍粗糙度）
  const M = propMats();
  const floorConcrete = concreteMat({ base: [40, 40, 42], seed: 13, repX: 3, repY: 3, env: 0.6 });
  group.add(floorMesh(S, S, floorConcrete));

  // 砖墙（v1.3 三通道：砖缝法线 + 逐砖粗糙度；西墙留出锅炉房门洞）
  const wallMat = brickMat({ tint: [36, 34, 38], seed: 11, repX: 4, repY: 2 });
  const H = 5.6;
  const mkWall = (w, h, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  mkWall(S, H, 0, -S / 2, 0);
  mkWall(S, H, 0, S / 2, Math.PI);
  mkWall(S, H, S / 2, 0, -Math.PI / 2);
  // 西墙两段 + 楣（门洞 z ∈ [-1.6, 1.6]）
  {
    const segLen = (S - 3.2) / 2;
    const a = new THREE.Mesh(new THREE.PlaneGeometry(segLen, H), wallMat);
    a.position.set(-S / 2, H / 2, -(1.6 + segLen / 2));
    a.rotation.y = Math.PI / 2;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(segLen, H), wallMat);
    b.position.set(-S / 2, H / 2, 1.6 + segLen / 2);
    b.rotation.y = Math.PI / 2;
    const lintel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, H - 3.1), wallMat);
    lintel.position.set(-S / 2, H - (H - 3.1) / 2, 0);
    lintel.rotation.y = Math.PI / 2;
    group.add(a, b, lintel);
  }
  const ceil = floorMesh(S, S, new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

  // 沿墙管道（法兰环合并成单 mesh）
  const pipeMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x4a4a50, roughness: 0.4, metalness: 0.88,
    bumpMap: noiseCanvasTexture(64, 128, 50, 6), bumpScale: 0.3, envMapIntensity: 1.0
  });
  const flangeGeos = [];
  const flangeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14);
  for (const [y, r] of [[1.2, 0.14], [1.7, 0.09], [4.6, 0.2]]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, S - 0.4, 14), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, y, -S / 2 + 0.35);
    group.add(pipe);
    const pipe2 = pipe.clone();
    pipe2.rotation.set(Math.PI / 2, 0, 0);
    pipe2.position.set(-S / 2 + 0.35, y + 0.3, 0);
    group.add(pipe2);
    // 沿管每 4m 一道法兰
    for (let x = -6; x <= 6; x += 4) {
      flangeGeos.push(xform(flangeGeo, x, y, -S / 2 + 0.35, 0, 0, Math.PI / 2, (r + 0.03) / 0.2));
      flangeGeos.push(xform(flangeGeo, -S / 2 + 0.35, y + 0.3, x, Math.PI / 2, 0, 0, (r + 0.03) / 0.2));
    }
  }
  flangeGeo.dispose();
  group.add(mergedMesh(flangeGeos, pipeMat));

  // 大机器 —— 圆角机体 + 铆钉 + 飞轮 + 活塞
  const machine = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(256, 92, 40), color: 0x303036, roughness: 0.5, metalness: 0.72, envMapIntensity: 0.8
  });
  const body = roundedBoxMesh(3.4, 2.2, 1.8, 0.12, bodyMat);
  body.position.y = 1.1;
  // 铆钉排（合并）
  const rivetGeo = new THREE.SphereGeometry(0.035, 6, 5);
  const rivetGeos = [];
  for (let i = 0; i < 10; i++) {
    rivetGeos.push(xform(rivetGeo, -1.5 + i * 0.33, 2.14, 0.91));
    rivetGeos.push(xform(rivetGeo, -1.5 + i * 0.33, 0.12, 0.91));
  }
  rivetGeo.dispose();
  machine.add(mergedMesh(rivetGeos, pipeMat));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.13, 12, 32), pipeMat);
  wheel.position.set(1.95, 1.35, 0);
  wheel.rotation.y = Math.PI / 2;
  const spokes = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.8, 8), pipeMat);
    sp.rotation.x = (i / 4) * Math.PI;
    spokes.add(sp);
  }
  spokes.position.copy(wheel.position);
  const piston = roundedBoxMesh(0.5, 0.7, 0.5, 0.06, pipeMat);
  piston.position.set(-1.2, 2.6, 0);
  machine.add(body, wheel, spokes, piston);
  machine.position.set(-4.6, 0, -4.9);
  machine.rotation.y = 0.5;
  group.add(machine);
  const machineState = { run: 1, angle: 0, phase: 0 };
  updaters.push((dt) => {
    machineState.angle += dt * 1.7 * machineState.run;
    machineState.phase += dt * 3.4 * machineState.run;
    wheel.rotation.z = machineState.angle;
    spokes.rotation.x = machineState.angle;
    piston.position.y = 2.6 + Math.sin(machineState.phase) * 0.32;
  });

  // 蒸汽（拉杆触发时喷发）
  const steam = smokeLayer(46, { x: 1.6, z: 1.6 }, { opacity: 0.05, size: 4.5, yBase: 0.4, ySpread: 2.6, color: 0xcfd4da });
  steam.position.set(-3.2, 0, -5.4);
  group.add(steam);
  updaters.push(steam.userData.update);
  let steamBurst = 0;
  updaters.push((dt) => {
    if (steamBurst > 0) steamBurst -= dt;
    steam.material.opacity = 0.05 + Math.max(0, Math.min(steamBurst, 1)) * 0.3;
  });

  // 拉杆热点（艺术二遍：铸铁台座车削 + 螺栓环 + 扇形限位板，去"方块底座"观感）
  const lever = roundedBoxMesh(0.1, 0.85, 0.1, 0.04,
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x555558, roughness: 0.3, metalness: 0.9, emissive: 0x888888, emissiveIntensity: 0.12 }));
  lever.position.set(-2.4, 1.1, -5.2);
  lever.rotation.z = -0.4;
  const leverBase = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.34, 0), new THREE.Vector2(0.32, 0.07), new THREE.Vector2(0.2, 0.13),
      new THREE.Vector2(0.16, 0.5), new THREE.Vector2(0.22, 0.62), new THREE.Vector2(0.2, 0.7),
      new THREE.Vector2(0.05, 0.72)
    ], 14),
    bodyMat
  );
  leverBase.position.set(-2.4, 0, -5.2);
  // 底座螺栓环
  const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 6);
  const boltGeos = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    boltGeos.push(xform(boltGeo, -2.4 + Math.cos(a) * 0.27, 0.045, -5.2 + Math.sin(a) * 0.27));
  }
  boltGeo.dispose();
  // 扇形限位板（拉杆行程的金属弧板）
  const quad = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.025, 6, 12, 1.0),
    pipeMat
  );
  quad.position.set(-2.4, 0.72, -5.2);
  quad.rotation.z = Math.PI / 2 - 0.5;
  group.add(lever, leverBase, mergedMesh(boltGeos, pipeMat), quad);
  hotspots.add(lever, {
    hint: 'E — 拉动阀门（这栋楼会回应）',
    onActivate: () => {
      steamBurst = 3.2;
      audio.sfx('clank');
      setTimeout(() => audio.sfx('steam'), 260);
      lever.rotation.z = lever.rotation.z < 0 ? 0.4 : -0.4;
    }
  });

  // 汽笛链 —— 北墙管道上垂下的链条；拉响 → 蒸汽 + 大机器猛冲一拍
  const chainRig = new THREE.Group();
  const linkGeo2 = new THREE.TorusGeometry(0.032, 0.008, 6, 10);
  const linkGeos2 = [];
  for (let i = 0; i < 46; i++) {
    linkGeos2.push(xform(linkGeo2, 0, -i * 0.054, 0, Math.PI / 2, (i % 2) * Math.PI / 2, 0));
  }
  linkGeo2.dispose();
  chainRig.add(mergedMesh(linkGeos2, pipeMat));
  const chainHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.22, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.7 })
  );
  chainHandle.rotation.z = Math.PI / 2;
  chainHandle.position.y = -2.52;
  chainRig.add(chainHandle);
  chainRig.position.set(-0.8, 4.5, -S / 2 + 0.42);
  group.add(chainRig);
  const whistle = { pull: 0 };
  updaters.push((dt) => {
    if (whistle.pull > 0) whistle.pull = Math.max(0, whistle.pull - dt * 2.4);
    chainRig.position.y = 4.5 - Math.sin(Math.min(1, whistle.pull) * Math.PI) * 0.16;
    machineState.run += (1 - machineState.run) * Math.min(1, dt * 0.8);
  });
  hotspots.add(chainHandle, {
    hint: 'E — 拉响汽笛链',
    onActivate: () => {
      whistle.pull = 1;
      steamBurst = 4.2;
      machineState.run = 2.4;
      audio.sfx('clank', 0.5);
      setTimeout(() => audio.sfxAt('steam', -3.2, -5.4, 1.0, 4), 180);
      setTimeout(() => audio.sfx('steamfar', 0.7), 900);
    }
  });

  // 裸吊灯 —— 推一下就荡起来，光影跟着晃
  const swingBulb = hangingBulb(0xffe2b8, 2.5);
  swingBulb.position.set(1.9, H, -3.1);
  group.add(swingBulb);
  const swing = { e: 0, t: 0 };
  updaters.push((dt) => {
    if (swing.e <= 0.004) return;
    swing.t += dt;
    swing.e *= Math.max(0, 1 - dt * 0.55);
    swingBulb.rotation.z = Math.sin(swing.t * 1.9) * 0.52 * swing.e;
    swingBulb.rotation.x = Math.sin(swing.t * 1.9 + 1.1) * 0.3 * swing.e;
  });
  hotspots.add(swingBulb.userData.bulb, {
    hint: 'E — 推一下吊灯',
    onActivate: () => {
      swing.e = 1;
      swing.t = 0;
      audio.sfx('creak', 0.4);
    }
  });

  // 暖气炉龛 —— 抽象的发光格栅
  const alcove = new THREE.Group();
  const frame = roundedBoxMesh(2.5, 2.1, 0.4, 0.08, bodyMat);
  frame.position.y = 1.05;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff6e8, emissiveIntensity: 1.6 })
  );
  glow.position.set(0, 1.05, 0.21);
  for (let i = 0; i < 6; i++) {
    const fin = roundedBoxMesh(0.09, 1.55, 0.1, 0.03, bodyMat);
    fin.position.set(-0.8 + i * 0.32, 1.05, 0.26);
    alcove.add(fin);
  }
  const alight = new THREE.PointLight(0xfff6e8, 5, 8, 1.8);
  alight.position.set(0, 1.2, 0.8);
  alcove.add(frame, glow, alight);
  alcove.position.set(5.2, 0, -S / 2 + 0.55);
  group.add(alcove);
  updaters.push((dt, t) => {
    const p = 1.3 + Math.sin(t * 0.8) * 0.35 + (Math.random() < 0.01 ? 1.2 : 0);
    glow.material.emissiveIntensity = p;
    alight.intensity = 3.5 + p * 1.4;
  });
  hotspots.add(glow, {
    hint: 'E — 凝视暖气炉的光',
    onActivate: () => {
      audio.sfx('lullaby', 0.5);
      ui.caption('光的后面还有一层光。', 3600);
    }
  });

  // 铁笼吊灯
  const cageLights = [];
  for (const [x, z, seed] of [[0, 0, 1], [4.5, 3.5, 7], [-4.5, 4, 13]]) {
    const cage = new THREE.Group();
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xf5f0e6, emissiveIntensity: 3 })
    );
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 1.6, 5),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
    );
    wire.position.y = 0.85;
    const cageMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 5),
      new THREE.MeshStandardMaterial({ color: 0x222222, wireframe: true })
    );
    const light = new THREE.PointLight(0xf5f0e6, 6, 12, 1.9);
    cage.add(bulb, wire, cageMesh, light);
    cage.position.set(x, H - 1.7, z);
    group.add(cage);
    cageLights.push({ light, bulb });
    updaters.push(makeFlicker(light, bulb.material, 6, seed));
  }

  // ============================================================
  // 锅炉房分区（西侧门洞进入）
  // ============================================================
  const boilerRoom = new THREE.Group();
  // 地面：钢格栅步道 + 水泥
  const annexFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 5.2), floorConcrete);
  annexFloor.rotation.x = -Math.PI / 2;
  annexFloor.position.set(-S / 2 - 2.6, 0.004, 0);
  boilerRoom.add(annexFloor);
  const gratingTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#17171a';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#3a3a40';
    g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo((i / 8) * s, 0); g.lineTo((i / 8) * s, s); g.stroke();
      g.beginPath(); g.moveTo(0, (i / 8) * s); g.lineTo(s, (i / 8) * s); g.stroke();
    }
  }, 2, 6);
  const catwalk = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.06, 5.0),
    new THREE.MeshStandardMaterial({ map: gratingTex, roughness: 0.5, metalness: 0.7 })
  );
  catwalk.position.set(-S / 2 - 1.6, 0.05, 0);
  boilerRoom.add(catwalk);
  const rail = railing(5.0, { height: 1.0, radius: 0.028, color: 0x2a2a30 });
  rail.material.map = brushedMetalTexture();
  rail.material.metalness = 0.85;
  rail.material.roughness = 0.4;
  rail.position.set(-S / 2 - 0.8, 0.08, 0);
  rail.rotation.y = Math.PI / 2;
  boilerRoom.add(rail);
  // 围墙
  const annexWallMat = wallMat;
  const aw1 = new THREE.Mesh(new THREE.PlaneGeometry(7.4, H), annexWallMat);
  aw1.position.set(-S / 2 - 2.6, H / 2, -2.6);
  const aw2 = new THREE.Mesh(new THREE.PlaneGeometry(7.4, H), annexWallMat);
  aw2.position.set(-S / 2 - 2.6, H / 2, 2.6);
  aw2.rotation.y = Math.PI;
  const aw3 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, H), annexWallMat);
  aw3.position.set(-S / 2 - 6.3, H / 2, 0);
  aw3.rotation.y = Math.PI / 2;
  const aCeil = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 5.2), new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.95 }));
  aCeil.rotation.x = Math.PI / 2;
  aCeil.position.set(-S / 2 - 2.6, H, 0);
  boilerRoom.add(aw1, aw2, aw3, aCeil);
  // 大锅炉：卧式圆筒 + 铆钉环带 + 端盖
  // 独有蒙皮：铆接钢板（纵向板缝 + 双排铆钉 + 油污流挂）—— 暗部也读得出体量
  const boilerMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, (g, s) => {
      g.fillStyle = '#454550';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(${20 + Math.random() * 40 | 0},${20 + Math.random() * 40 | 0},${26 + Math.random() * 40 | 0},0.18)`;
        g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 5, 1 + Math.random() * 3);
      }
      // 油污竖向流挂（沿 v 即罐长方向）
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * s;
        g.fillStyle = 'rgba(10,10,12,0.22)';
        g.fillRect(x, Math.random() * s * 0.4, 2 + Math.random() * 4, s * (0.3 + Math.random() * 0.5));
      }
      // 纵向板缝 ×3 + 双排铆钉
      for (const u of [0.17, 0.5, 0.83]) {
        const x = u * s;
        g.strokeStyle = 'rgba(12,12,14,0.9)';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke();
        g.fillStyle = '#5a5a64';
        for (let y = 8; y < s; y += 18) {
          g.beginPath(); g.arc(x - 7, y, 2.6, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(x + 7, y + 9, 2.6, 0, Math.PI * 2); g.fill();
        }
      }
    }, 2, 1),
    color: 0x8a8a92, roughness: 0.52, metalness: 0.5,
    bumpMap: noiseCanvasTexture(64, 128, 50, 6), bumpScale: 0.25, envMapIntensity: 1.3
  });
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 4.4, 22), boilerMat);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(-S / 2 - 4.6, 1.5, 0);
  const capGeos = [
    xform(new THREE.SphereGeometry(1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), -S / 2 - 4.6, 1.5, 2.2, Math.PI / 2, 0, 0),
    xform(new THREE.SphereGeometry(1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), -S / 2 - 4.6, 1.5, -2.2, -Math.PI / 2, 0, 0)
  ];
  boilerRoom.add(boiler, mergedMesh(capGeos, boilerMat));
  // 低位补光（入口侧洗亮罐腹与步道；冷白弱光不与余烬争色）
  const bellyFill = new THREE.PointLight(0xbfc8d4, 2.4, 6.5, 1.7);
  bellyFill.position.set(-S / 2 - 2.1, 1.15, 0);
  boilerRoom.add(bellyFill);
  const bandGeo = new THREE.TorusGeometry(1.17, 0.045, 8, 30);
  const bandGeos = [];
  for (const z of [-1.5, -0.5, 0.5, 1.5]) {
    bandGeos.push(xform(bandGeo, -S / 2 - 4.6, 1.5, z));
  }
  bandGeo.dispose();
  boilerRoom.add(mergedMesh(bandGeos, pipeMat));
  // 承托鞍座 ×2（浇筑墩 + 过顶钢箍）—— 罐体不再悬空
  const pierGeos = [];
  const strapGeos = [];
  for (const z of [-1.5, 1.5]) {
    pierGeos.push(xform(new THREE.BoxGeometry(1.9, 0.5, 0.55), -S / 2 - 4.6, 0.25, z));
    pierGeos.push(xform(new THREE.BoxGeometry(2.2, 0.12, 0.7), -S / 2 - 4.6, 0.06, z));
    strapGeos.push(xform(new THREE.TorusGeometry(1.19, 0.035, 6, 26, Math.PI), -S / 2 - 4.6, 1.5, z));
  }
  boilerRoom.add(mergedMesh(pierGeos, floorConcrete), mergedMesh(strapGeos, pipeMat));
  // 罐底余烬光带（炉膛漏光；随火光脉动）
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x140a06, emissive: 0xff6a24, emissiveIntensity: 1.2, roughness: 1
  });
  const ember = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.2), emberMat);
  ember.rotation.x = -Math.PI / 2;
  ember.position.set(-S / 2 - 4.6, 0.015, 0);
  boilerRoom.add(ember);
  // 灰坑箱（罐腹下取灰口；正面三道通风缝漏火光 —— 面向入口的暗部锚点）
  const ashBox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 1.9), pipeMat);
  ashBox.position.set(-S / 2 - 4.25, 0.36, 0);
  boilerRoom.add(ashBox);
  const ventGeos = [];
  for (const y of [0.2, 0.38, 0.56]) {
    ventGeos.push(xform(new THREE.PlaneGeometry(0.06, 1.5), -S / 2 - 3.815, y, 0, 0, Math.PI / 2, Math.PI / 2));
  }
  const ventMesh = mergedMesh(ventGeos, emberMat);
  boilerRoom.add(ventMesh);
  const emberLight = new THREE.PointLight(0xff5a1c, 2.5, 6, 1.6);
  emberLight.position.set(-S / 2 - 3.3, 0.4, 0);
  boilerRoom.add(emberLight);
  // 铰链炉门 v2（铆钉圈 + 观火窗 + 手轮锁；可开启）
  const firebox = fireboxDoor({ mats: M });
  firebox.position.set(-S / 2 - 4.96, 0.95, 2.28);
  boilerRoom.add(firebox);
  const furnaceLight = new THREE.PointLight(0xff7a2c, 6, 8, 1.8);
  furnaceLight.position.set(-S / 2 - 4.2, 1.0, 1.6);
  boilerRoom.add(furnaceLight);
  const fireboxState = { open: 0, target: 0 };
  updaters.push((dt, t) => {
    fireboxState.open += (fireboxState.target - fireboxState.open) * Math.min(1, dt * 3.5);
    firebox.userData.hinge.rotation.y = fireboxState.open * 1.9;
    const f = 1.6 + Math.sin(t * 3.7) * 0.5 + Math.random() * 0.3;
    firebox.userData.portMat.emissiveIntensity = f * (1 + fireboxState.open * 1.2);
    furnaceLight.intensity = (3 + f * 1.6) * (1 + fireboxState.open * 2.2);
    emberMat.emissiveIntensity = 0.7 + f * 0.45;
    emberLight.intensity = 2.0 + f * 1.1 + fireboxState.open * 1.5;
  });
  hotspots.add(firebox.userData.wheel, {
    hint: 'E — 转动炉门手轮',
    onActivate: () => {
      fireboxState.target = fireboxState.target > 0.5 ? 0 : 1;
      audio.sfx('clank', 0.9);
      if (fireboxState.target) {
        setTimeout(() => audio.sfx('steam', 0.6), 350);
        ui.caption('炉膛里的光在呼吸。', 3600);
      }
    }
  });

  // 手轮阀（步道旁；转动 → 压力表乱跳 + 蒸汽）
  const valve = valveWheel({ mats: M });
  valve.position.set(-S / 2 - 1.7, 0.08, 1.9);
  boilerRoom.add(valve);
  const valveState = { spin: 0 };
  updaters.push((dt) => {
    if (valveState.spin > 0) {
      valveState.spin -= dt;
      valve.userData.wheel.rotation.y += dt * 7;
    }
  });

  // 闸刀配电箱（合闸/断闸 → 铁笼灯全场明灭）
  const fusebox = fuseBox({ mats: M });
  fusebox.position.set(-S / 2 - 2.4, 1.7, -2.5);
  boilerRoom.add(fusebox);
  // 压力表 ×3（表盘 + 指针）
  const gaugeNeedles = [];
  for (const [z, seed] of [[-1.4, 1], [0, 4], [1.4, 7]]) {
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.05, 18),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(64, (g, s) => {
          g.fillStyle = '#d8d2c4';
          g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 2, 0, 7); g.fill();
          g.strokeStyle = '#222';
          for (let i = 0; i < 9; i++) {
            const a = -Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
            g.beginPath();
            g.moveTo(s / 2 + Math.cos(a) * (s / 2 - 8), s / 2 + Math.sin(a) * (s / 2 - 8));
            g.lineTo(s / 2 + Math.cos(a) * (s / 2 - 14), s / 2 + Math.sin(a) * (s / 2 - 14));
            g.stroke();
          }
        }),
        roughness: 0.4
      })
    );
    dial.rotation.z = Math.PI / 2;
    dial.position.set(-S / 2 - 3.42, 2.2, z);
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.12, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x8f0e1e })
    );
    needle.position.set(-S / 2 - 3.38, 2.2, z);
    boilerRoom.add(dial, needle);
    gaugeNeedles.push({ needle, seed });
  }
  const pressure = { surge: 0 };
  updaters.push((dt, t) => {
    if (pressure.surge > 0) pressure.surge -= dt;
    const s2 = Math.max(0, Math.min(pressure.surge, 1));
    for (const { needle, seed } of gaugeNeedles) {
      needle.rotation.x = Math.sin(t * 0.7 + seed) * 0.8 + Math.sin(t * 5.3 + seed * 2) * 0.1 +
        s2 * Math.sin(t * 21 + seed * 3) * 0.7;
    }
  });
  // 锅炉房蒸汽与灯
  const boilerSteam = smokeLayer(30, { x: 5, z: 4 }, { opacity: 0.07, size: 5, yBase: 0.4, ySpread: 3, color: 0xb8bcc4 });
  boilerSteam.position.set(-S / 2 - 3, 0, 0);
  boilerRoom.add(boilerSteam);
  updaters.push(boilerSteam.userData.update);
  updaters.push(() => {
    boilerSteam.material.opacity = 0.07 + Math.max(0, Math.min(pressure.surge, 1)) * 0.22;
  });
  // 手轮阀交互：压力表狂跳 + 蒸汽增压
  hotspots.add(valve.userData.wheel.children[0], {
    hint: 'E — 转动阀轮',
    onActivate: () => {
      valveState.spin = 2.6;
      pressure.surge = 4.0;
      audio.sfx('clank', 0.7);
      setTimeout(() => audio.sfx('steam', 0.9), 300);
      ui.caption('压力去了别的地方。', 3600);
    }
  });
  // 配电箱交互：断闸 → 铁笼灯熄灭数秒
  const fuseState = { cut: 0 };
  updaters.push((dt) => {
    if (fuseState.cut > 0) {
      fuseState.cut -= dt;
      for (const c of cageLights) {
        c.light.intensity = 0.15;
        c.bulb.material.emissiveIntensity = 0.06;
      }
      if (fuseState.cut <= 0) audio.sfx('fluor', 0.7);
    }
  });
  const midLever = fusebox.userData.levers[1];
  hotspots.add(midLever.children[0], {
    hint: 'E — 扳动闸刀',
    onActivate: () => {
      const cutting = fuseState.cut <= 0;
      fuseState.cut = cutting ? 5 : 0.01;
      midLever.rotation.z = cutting ? -0.5 : 0.5;
      fusebox.userData.levers.forEach((lv, i) => { if (i !== 1) lv.rotation.z = cutting ? -0.5 : 0.5; });
      audio.sfx('switch', 0.9);
      if (cutting) ui.caption('整层楼安静了一档。', 3600);
    }
  });
  const annexLamp = new THREE.PointLight(0xf5f0e6, 6.5, 10, 1.9);
  annexLamp.position.set(-S / 2 - 2.2, H - 1.4, 0);
  boilerRoom.add(annexLamp);
  updaters.push(makeFlicker(annexLamp, null, 5, 21));
  group.add(boilerRoom);

  // ---------- 彩蛋：暖气炉里的小舞台 ----------
  const stageGlow = new THREE.PointLight(0xfff9ec, 0, 12, 1.6);
  stageGlow.position.set(5.2, 1.2, -S / 2 + 1.4);
  group.add(stageGlow);
  const tinyFigure = darkFigure(0.5);
  tinyFigure.position.set(5.2, 0.35, -S / 2 + 0.85);
  tinyFigure.visible = false;
  group.add(tinyFigure);
  const blackout = { v: 0 };
  updaters.push((dt, t) => {
    if (blackout.v > 0) {
      for (const c of cageLights) {
        c.light.intensity *= (1 - blackout.v);
        c.bulb.material.emissiveIntensity *= (1 - blackout.v);
      }
    }
    if (tinyFigure.visible) {
      tinyFigure.rotation.z = Math.sin(t * 2.1) * 0.28;
      tinyFigure.position.y = 0.35 + Math.sin(t * 4.2) * 0.02;
    }
  });
  let stageTimers = [];
  const radiatorEgg = () => {
    for (const id of stageTimers) clearTimeout(id);
    stageTimers = [];
    blackout.v = 1;
    machineState.run = 0;
    audio.duck(1.2, 0.04, 2.4);
    stageTimers.push(setTimeout(() => {
      stageGlow.intensity = 14;
      tinyFigure.visible = true;
      audio.sfx('lullaby', 0.8);
      ui.caption('机器停了。那支歌不是唱给你听的。', 5200);
    }, 1100));
    stageTimers.push(setTimeout(() => {
      stageGlow.intensity = 0;
      tinyFigure.visible = false;
      blackout.v = 0;
      machineState.run = 1;
      audio.sfx('clank', 0.7);
    }, 6200));
  };
  const radiatorTrig = zoneTrigger({ x: -6.4, z: -6.2, r: 1.8 }, radiatorEgg, { cooldown: 45 });
  updaters.push((dt) => radiatorTrig.update(player, dt));

  // ---------- 展柜：一支铅笔（片名的由来） ----------
  const pencilCase = vitrine('一支铅笔', 'WHY THE TITLE', '#9fb4c7');
  pencilCase.position.set(3.2, 0, 5.0);
  pencilCase.rotation.y = -2.4;
  group.add(pencilCase);
  const pencil = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.6 })
  );
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.06, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8 })
  );
  tip.position.y = -0.28;
  tip.rotation.x = Math.PI;
  const eraser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.05, 8),
    new THREE.MeshStandardMaterial({ color: 0xd88a94, roughness: 0.9 })
  );
  eraser.position.y = 0.275;
  pencil.add(shaft, tip, eraser);
  pencil.rotation.z = 0.5;
  pencil.position.y = 0.1;
  pencilCase.userData.slot.add(pencil);
  updaters.push((dt, t) => { pencil.rotation.y = t * 0.5; });
  hotspots.add(pencilCase.userData.label, {
    hint: 'E — 为什么叫「橡皮头」',
    onActivate: () => {
      audio.sfx('chime');
      ui.caption('擦掉之后，纸上剩下什么？', 4200);
    }
  });

  // 引语展签（本厅唯一文字展签：费城）
  const q1 = quotePlaque(quoteById('philly'), '#9fb4c7');
  q1.position.set(-5.6, 0, 2.2);
  q1.rotation.y = 1.35;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  // 影片档案入口：机器旁的黄铜小铭牌
  const filmTagTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#5c4a30';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,240,210,0.9)';
    g.textAlign = 'center';
    g.font = '400 26px Georgia, serif';
    g.fillText('ERASERHEAD', s / 2, s / 2 - 6);
    g.font = '20px "Courier New", monospace';
    g.fillText('1977', s / 2, s / 2 + 26);
  });
  const filmTag = roundedBoxMesh(0.42, 0.24, 0.025, 0.01,
    new THREE.MeshStandardMaterial({
      map: filmTagTex, roughness: 0.3, metalness: 0.8,
      emissive: 0xffe6b8, emissiveMap: filmTagTex, emissiveIntensity: 0.12
    }));
  filmTag.position.set(-3.1, 1.15, -4.1);
  filmTag.rotation.y = 0.5;
  group.add(filmTag);
  hotspots.add(filmTag, {
    hint: 'E — 《橡皮头》档案',
    onActivate: () => ui.showFilm('eraserhead')
  });

  // 回大厅
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, S / 2 - 0.55);
  back.rotation.y = Math.PI;
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  // 氛围
  const haze = smokeLayer(60, { x: S, z: S }, { opacity: 0.06, size: 9, yBase: 0.5, ySpread: 2.4, color: 0xb9bec4 });
  group.add(haze);
  updaters.push(haze.userData.update);
  const dust = dustField(160, { x: S, y: H, z: S }, { opacity: 0.3, size: 0.045, color: 0xd8dce0 });
  group.add(dust);
  updaters.push(dust.userData.update);
  group.add(new THREE.AmbientLight(0x18181c, 0.55));

  return {
    group,
    spawn: { x: 0, z: 6.4, yaw: 0 },
    bounds: multiRectBounds([MAIN, ANNEX]),
    // 脚步材质分区：锅炉房检修步道=钢格栅；其余=水泥
    surfaceAt: (x, z) => (x >= -S / 2 - 2.4 && x <= -S / 2 - 0.8 && z >= -2.5 && z <= 2.5 ? 'metal' : 'concrete'),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'radiator-stage': radiatorTrig }
  };
}
