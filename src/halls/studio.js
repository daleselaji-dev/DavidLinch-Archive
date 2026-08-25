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
  canvasTexture, floorMesh, doorway, smokeLayer, dustField,
  quotePlaque, zoneTrigger,
  mergedMesh, xform, roundedBoxMesh, woodTexture, weaveTexture, brushedMetalTexture, armchair
} from './kit.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'studio',
  name: 'HIS ROOM · 林奇的房间',
  ambience: 'studio',
  narration: 'studio',
  look: { saturation: 1.02, tint: 0xffeeda, fogColor: 0x0d0806, fogDensity: 0.042, bg: 0x070403, exposure: 1.05, bloom: 0.75 }
};

const W = 16.5;
const D = 13;
// 主房间 + 帘后的冥想角
const MAIN = { minX: -W / 2 + 0.9, maxX: W / 2 - 0.9, minZ: -D / 2 + 0.9, maxZ: D / 2 - 1.3 };
const ALCOVE = { minX: 2.7, maxX: 6.3, minZ: -9.2, maxZ: -D / 2 + 0.9 };

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player, store } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // ---------- 房间外壳 ----------
  // 拼木地板
  const floorTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#191007';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      const v = Math.random() * 10;
      g.fillStyle = `rgb(${42 + v},${28 + v * 0.65},${14 + v * 0.4})`;
      g.fillRect(0, i * (s / 8), s, s / 8 - 2);
    }
    // 木纹细线
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = 'rgba(12,8,4,0.35)';
      g.beginPath();
      const y = Math.random() * s;
      g.moveTo(0, y);
      g.lineTo(s, y + (Math.random() - 0.5) * 6);
      g.stroke();
    }
  }, 5, 4);
  group.add(floorMesh(W, D, new THREE.MeshStandardMaterial({
    map: floorTex, roughness: 0.45, metalness: 0.06, envMapIntensity: 0.7
  })));

  // 深色木墙板
  const wallTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#171009';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 6; i++) {
      const v = Math.random() * 8;
      g.fillStyle = `rgb(${32 + v},${22 + v * 0.6},${11 + v * 0.35})`;
      g.fillRect(i * (s / 6), 0, s / 6 - 3, s);
    }
  }, 4, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, bumpMap: wallTex, bumpScale: 0.3 });
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
  const ceil = floorMesh(W, D, new THREE.MeshStandardMaterial({ color: 0x0d0906, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

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
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [44, 28, 15], planks: 2, size: 256 }), roughness: 0.55
  });
  const desk = new THREE.Group();
  const deskTop = roundedBoxMesh(3.4, 0.09, 1.3, 0.03, woodMat);
  deskTop.position.y = 0.86;
  const legGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.86, 10);
  const deskLegs = mergedMesh([
    xform(legGeo, -1.55, 0.43, -0.5), xform(legGeo, 1.55, 0.43, -0.5),
    xform(legGeo, -1.55, 0.43, 0.5), xform(legGeo, 1.55, 0.43, 0.5)
  ], woodMat);
  legGeo.dispose();
  desk.add(deskTop, deskLegs);
  desk.position.set(-6.4, 0, -1.4);
  desk.rotation.y = Math.PI / 2;
  group.add(desk);

  // 地毯（编织纹 + sheen）
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 34),
    new THREE.MeshPhysicalMaterial({
      map: weaveTexture('#2a1410', '#3a1c16'), roughness: 0.95,
      sheen: 0.5, sheenColor: new THREE.Color(0xb08060), sheenRoughness: 0.7
    })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-1.5, 0.012, -0.5);
  group.add(rug);

  // 读书角：扶手椅 + 书架（合并的书脊）
  const chair = armchair(0x2c1a10);
  chair.position.set(-3.2, 0, 2.6);
  chair.rotation.y = -0.7;
  group.add(chair);
  const shelfUnit = new THREE.Group();
  const shelfFrame = roundedBoxMesh(1.7, 2.5, 0.34, 0.03, woodMat);
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

  // 窗（百叶 + 夜光，东墙）
  const windowGroup = new THREE.Group();
  const winFrame = roundedBoxMesh(0.1, 1.7, 1.5, 0.02, woodMat);
  winFrame.position.set(W / 2 - 0.05, 2.1, -3.4);
  const winGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x060a12, emissive: 0x8ea6c9, emissiveIntensity: 0.5 })
  );
  winGlow.position.set(W / 2 - 0.11, 2.1, -3.4);
  winGlow.rotation.y = -Math.PI / 2;
  const slatGeos = [];
  const slatGeo = new THREE.BoxGeometry(0.02, 0.06, 1.32);
  for (let i = 0; i < 12; i++) {
    slatGeos.push(xform(slatGeo, 0, i * 0.125, 0, 0.5, 0, 0));
  }
  slatGeo.dispose();
  const blinds = mergedMesh(slatGeos, new THREE.MeshStandardMaterial({ color: 0x201812, roughness: 0.7 }));
  blinds.position.set(W / 2 - 0.16, 1.4, -3.4);
  const moonSliver = new THREE.PointLight(0x8ea6c9, 2.4, 7, 1.9);
  moonSliver.position.set(W / 2 - 0.8, 2.1, -3.4);
  windowGroup.add(winFrame, winGlow, blinds, moonSliver);
  group.add(windowGroup);

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

  // 台灯（可开关 — 交互①）
  const lampState = { on: 1 };
  const lampArmMat = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.4, metalness: 0.8 });
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 14), lampArmMat);
  lampBase.position.set(-6.7, 0.93, -2.3);
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), lampArmMat);
  lampArm.position.set(-6.7, 1.2, -2.3);
  lampArm.rotation.z = 0.4;
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.2, 14, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1c4232, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide })
  );
  lampShade.position.set(-6.58, 1.44, -2.3);
  lampShade.rotation.z = 0.5;
  const lampBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a0, emissiveIntensity: 3 })
  );
  lampBulb.position.set(-6.52, 1.38, -2.3);
  const lampLight = new THREE.PointLight(0xffd9a0, 5, 8, 1.8);
  lampLight.position.set(-6.4, 1.42, -2.3);
  group.add(lampBase, lampArm, lampShade, lampBulb, lampLight);
  updaters.push((dt, t) => {
    const f = (1 + Math.sin(t * 7.2) * 0.05) * lampState.on;
    lampLight.intensity = 5 * f;
    lampBulb.material.emissiveIntensity = 3 * Math.max(0.03, f);
  });
  hotspots.add(lampShade, {
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
      audio.sfx(ceilState.on ? 'lampon' : 'lampoff');
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

  // 收音机（交互⑥：天气播报——原创文本，抽象致敬他的每日天气）
  const WEATHER = [
    '洛杉矶。金色阳光，微风，华氏七十二度。',
    '今晨有雾，能见度低。',
    '阴，偶有小雨。去喝杯咖啡。'
  ];
  const radioState = { on: 0, idx: 0 };
  const radio = new THREE.Group();
  const radioBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.36, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.55 })
  );
  radioBody.position.y = 0.18;
  const dial = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xffc264, emissiveIntensity: 0.25 })
  );
  dial.position.set(0, 0.22, 0.125);
  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10),
    new THREE.MeshStandardMaterial({ color: 0xc9a35c, roughness: 0.3, metalness: 0.7 })
  );
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.2, 0.1, 0.13);
  radio.add(radioBody, dial, knob);
  // 木架
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.4), woodMat);
  shelf.position.set(1.8, 1.28, -6.28);
  radio.position.set(1.8, 1.31, -6.28);
  group.add(shelf, radio);
  updaters.push((dt, t) => {
    dial.material.emissiveIntensity = radioState.on ? 0.9 + Math.sin(t * 3) * 0.15 : 0.18;
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
      ui.caption(curtainState.open ? '帘子后面：一只坐垫，一支蜡烛。' : '帘子合上了。', 3000);
    }
  });

  // 冥想坐垫 + 蜡烛
  const cushion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.5, 0.18, 18),
    new THREE.MeshStandardMaterial({ color: 0x3c1420, roughness: 0.9 })
  );
  cushion.position.set(4.5, 0.09, -8.1);
  group.add(cushion);
  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.8 })
  );
  candle.position.set(5.5, 0.11, -8.6);
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb45e, emissiveIntensity: 4 })
  );
  flame.position.set(5.5, 0.26, -8.6);
  const candleLight = new THREE.PointLight(0xffb45e, 2.4, 5, 2);
  candleLight.position.set(5.5, 0.5, -8.6);
  group.add(candle, flame, candleLight);
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
      ui.caption('📻 它播的不是天气。是一个名字。你的。', 5200);
    }, 1000));
    eggTimers.push(setTimeout(() => {
      lampState.on = prevLamp;
      radioState.on = 0;
      audio.sfx('lampon', 0.5);
    }, 6400));
  };
  const radioTrig = zoneTrigger({ x: -7.0, z: -5.2, r: 1.35 }, radioEgg, { cooldown: 45 });
  updaters.push((dt) => radioTrig.update(player, dt));

  // ---------- 展签（全厅仅一块，短原话） ----------
  const q1 = quotePlaque(quoteById('you'), '#ffb25e');
  q1.position.set(2.2, 0, -5.6);
  q1.rotation.y = 0.35;
  group.add(q1);
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
  hotspots.add(back.userData.portal, { hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

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
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'radio-wakes': radioTrig },
    onLeave: () => {
      for (const id of timers) clearTimeout(id);
      for (const id of eggTimers) clearTimeout(id);
      engine.setLook(meta.look);
    }
  };
}
