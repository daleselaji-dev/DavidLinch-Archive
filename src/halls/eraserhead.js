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
  mergedMesh, xform, roundedBoxMesh, railing, brushedMetalTexture
} from './kit.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'eraserhead',
  name: 'ERASERHEAD · 工业摇篮曲 (1977)',
  ambience: 'eraserhead',
  narration: 'eraserhead',
  look: { saturation: 0.09, tint: 0xe9edf2, fogColor: 0x050507, fogDensity: 0.052, bg: 0x030304, exposure: 0.88, bloom: 0.62 }
};

const S = 17; // 主房间边长
const MAIN = { minX: -S / 2 + 1.1, maxX: S / 2 - 1.1, minZ: -S / 2 + 1.6, maxZ: S / 2 - 1.4 };
const ANNEX = { minX: -S / 2 - 6.2, maxX: -S / 2 + 1.2, minZ: -2.6, maxZ: 2.6 }; // 锅炉房

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 污渍水泥地
  const floorTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#2a2a2c';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${Math.random() > 0.5 ? 12 : 60},${Math.random() > 0.5 ? 12 : 60},${Math.random() > 0.5 ? 14 : 62},${Math.random() * 0.28})`;
      g.beginPath();
      g.arc(Math.random() * s, Math.random() * s, Math.random() * 46, 0, 7);
      g.fill();
    }
    // 伸缩缝
    g.strokeStyle = 'rgba(8,8,10,0.7)';
    g.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      g.beginPath(); g.moveTo((i / 4) * s, 0); g.lineTo((i / 4) * s, s); g.stroke();
      g.beginPath(); g.moveTo(0, (i / 4) * s); g.lineTo(s, (i / 4) * s); g.stroke();
    }
  }, 3, 3);
  group.add(floorMesh(S, S, new THREE.MeshStandardMaterial({
    map: floorTex, roughness: 0.55, metalness: 0.2, envMapIntensity: 0.6
  })));

  // 砖墙（西墙留出锅炉房门洞）
  const brickTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#1d1d1f';
    g.fillRect(0, 0, s, s);
    const bh = s / 10;
    const bw = s / 5;
    for (let r = 0; r < 10; r++) {
      for (let c = -1; c < 6; c++) {
        const off = r % 2 ? bw / 2 : 0;
        g.fillStyle = `rgb(${34 + Math.random() * 16},${34 + Math.random() * 14},${36 + Math.random() * 14})`;
        g.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  }, 4, 2);
  const wallMat = new THREE.MeshStandardMaterial({
    map: brickTex, roughness: 0.9, bumpMap: brickTex, bumpScale: 0.5
  });
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

  // 拉杆热点
  const lever = roundedBoxMesh(0.1, 0.85, 0.1, 0.04,
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x555558, roughness: 0.3, metalness: 0.9, emissive: 0x888888, emissiveIntensity: 0.12 }));
  lever.position.set(-2.4, 1.1, -5.2);
  lever.rotation.z = -0.4;
  const leverBase = roundedBoxMesh(0.5, 0.7, 0.5, 0.06, bodyMat);
  leverBase.position.set(-2.4, 0.35, -5.2);
  group.add(lever, leverBase);
  hotspots.add(lever, {
    hint: 'E — 拉动阀门（这栋楼会回应）',
    onActivate: () => {
      steamBurst = 3.2;
      audio.sfx('clank');
      setTimeout(() => audio.sfx('steam'), 260);
      lever.rotation.z = lever.rotation.z < 0 ? 0.4 : -0.4;
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
  const annexFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 5.2),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.2 })
  );
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
  const annexWallMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9, bumpMap: brickTex, bumpScale: 0.5 });
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
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 4.4, 22), bodyMat);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(-S / 2 - 4.6, 1.5, 0);
  const capGeos = [
    xform(new THREE.SphereGeometry(1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), -S / 2 - 4.6, 1.5, 2.2, Math.PI / 2, 0, 0),
    xform(new THREE.SphereGeometry(1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), -S / 2 - 4.6, 1.5, -2.2, -Math.PI / 2, 0, 0)
  ];
  boilerRoom.add(boiler, mergedMesh(capGeos, bodyMat));
  const bandGeo = new THREE.TorusGeometry(1.17, 0.045, 8, 30);
  const bandGeos = [];
  for (const z of [-1.5, -0.5, 0.5, 1.5]) {
    bandGeos.push(xform(bandGeo, -S / 2 - 4.6, 1.5, z));
  }
  bandGeo.dispose();
  boilerRoom.add(mergedMesh(bandGeos, pipeMat));
  // 炉口辉光
  const furnaceGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 20),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff7a2c, emissiveIntensity: 2.2 })
  );
  furnaceGlow.position.set(-S / 2 - 4.6, 0.9, 2.21);
  const furnaceLight = new THREE.PointLight(0xff7a2c, 6, 8, 1.8);
  furnaceLight.position.set(-S / 2 - 4.2, 1.0, 1.6);
  boilerRoom.add(furnaceGlow, furnaceLight);
  updaters.push((dt, t) => {
    const f = 1.6 + Math.sin(t * 3.7) * 0.5 + Math.random() * 0.3;
    furnaceGlow.material.emissiveIntensity = f;
    furnaceLight.intensity = 3 + f * 1.6;
  });
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
  updaters.push((dt, t) => {
    for (const { needle, seed } of gaugeNeedles) {
      needle.rotation.x = Math.sin(t * 0.7 + seed) * 0.8 + Math.sin(t * 5.3 + seed * 2) * 0.1;
    }
  });
  // 锅炉房蒸汽与灯
  const boilerSteam = smokeLayer(30, { x: 5, z: 4 }, { opacity: 0.07, size: 5, yBase: 0.4, ySpread: 3, color: 0xb8bcc4 });
  boilerSteam.position.set(-S / 2 - 3, 0, 0);
  boilerRoom.add(boilerSteam);
  updaters.push(boilerSteam.userData.update);
  const annexLamp = new THREE.PointLight(0xf5f0e6, 5, 10, 1.9);
  annexLamp.position.set(-S / 2 - 3, H - 1.4, 0);
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
  hotspots.add(back.userData.portal, { hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

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
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'radiator-stage': radiatorTrig }
  };
}
