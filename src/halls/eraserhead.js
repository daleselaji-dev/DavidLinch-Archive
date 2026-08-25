// ============================================================
// 《橡皮头》展厅 —— INDUSTRIAL LULLABY 工业摇篮曲
// 近单色的机器房: 管道 / 蒸汽 / 铁笼灯 / 会呼吸的机器
// ============================================================
import * as THREE from 'three';
import {
  canvasTexture, noiseCanvasTexture, floorMesh, doorway,
  smokeLayer, dustField, standPlaque, quotePlaque, vitrine, darkFigure,
  zoneTrigger, makeFlicker, rectBounds
} from './kit.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'eraserhead',
  name: 'ERASERHEAD · 工业摇篮曲 (1977)',
  ambience: 'eraserhead',
  narration: 'eraserhead',
  look: { saturation: 0.09, tint: 0xe9edf2, fogColor: 0x050507, fogDensity: 0.052, bg: 0x030304, exposure: 0.88, bloom: 0.62 }
};

const S = 17; // 房间边长

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
  }, 3, 3);
  group.add(floorMesh(S, S, new THREE.MeshStandardMaterial({
    map: floorTex, roughness: 0.55, metalness: 0.2, envMapIntensity: 0.6
  })));

  // 砖墙
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
  const walls = [
    [S, H, 0, -S / 2, 0], [S, H, 0, S / 2, Math.PI],
    [S, H, -S / 2, 0, Math.PI / 2], [S, H, S / 2, 0, -Math.PI / 2]
  ];
  for (const [w, h, x, z, ry] of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  }
  const ceil = floorMesh(S, S, new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

  // 沿墙管道
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a3e, roughness: 0.42, metalness: 0.85,
    bumpMap: noiseCanvasTexture(64, 128, 50, 6), bumpScale: 0.3, envMapIntensity: 1.0
  });
  for (const [y, r] of [[1.2, 0.14], [1.7, 0.09], [4.6, 0.2]]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, S - 0.4, 12), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, y, -S / 2 + 0.35);
    group.add(pipe);
    const pipe2 = pipe.clone();
    pipe2.rotation.set(Math.PI / 2, 0, 0);
    pipe2.position.set(-S / 2 + 0.35, y + 0.3, 0);
    group.add(pipe2);
  }

  // 大机器 —— 飞轮 + 活塞
  const machine = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x26262a, roughness: 0.5, metalness: 0.7, envMapIntensity: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 1.8), bodyMat);
  body.position.y = 1.1;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.13, 10, 26), pipeMat);
  wheel.position.set(1.95, 1.35, 0);
  wheel.rotation.y = Math.PI / 2;
  const spokes = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), pipeMat);
    sp.rotation.x = (i / 4) * Math.PI;
    spokes.add(sp);
  }
  spokes.position.copy(wheel.position);
  const piston = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), pipeMat);
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
  const lever = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.85, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x555558, roughness: 0.3, metalness: 0.9, emissive: 0x888888, emissiveIntensity: 0.12 })
  );
  lever.position.set(-2.4, 1.1, -5.2);
  lever.rotation.z = -0.4;
  const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), bodyMat);
  leverBase.position.set(-2.4, 0.35, -5.2);
  group.add(lever, leverBase);
  hotspots.add(lever, {
    hint: 'E — 拉动阀门（这栋楼会回应）',
    onActivate: () => {
      steamBurst = 3.2;
      audio.sfx('clank');
      setTimeout(() => audio.sfx('steam'), 260);
      ui.caption('管道深处，有什么东西翻了个身。', 4200);
      lever.rotation.z = lever.rotation.z < 0 ? 0.4 : -0.4;
    }
  });

  // 暖气炉龛 —— 抽象的发光格栅
  const alcove = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.1, 0.4), bodyMat);
  frame.position.y = 1.05;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff6e8, emissiveIntensity: 1.6 })
  );
  glow.position.set(0, 1.05, 0.21);
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.55, 0.1), bodyMat);
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
    onActivate: () => ui.showEssay('industry')
  });

  // 铁笼吊灯
  const cageLights = [];
  for (const [x, z, seed] of [[0, 0, 1], [4.5, 3.5, 7], [-4.5, 4, 13]]) {
    const cage = new THREE.Group();
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xf5f0e6, emissiveIntensity: 3 })
    );
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
    );
    wire.position.y = 0.85;
    const cageMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x222222, wireframe: true })
    );
    const light = new THREE.PointLight(0xf5f0e6, 6, 12, 1.9);
    cage.add(bulb, wire, cageMesh, light);
    cage.position.set(x, H - 1.7, z);
    group.add(cage);
    cageLights.push({ light, bulb });
    updaters.push(makeFlicker(light, bulb.material, 6, seed));
  }

  // ---------- 彩蛋：暖气炉里的小舞台 ----------
  // 绕到大机器背后的死角，整个房间会为你熄灯——除了暖气炉。
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
      tinyFigure.rotation.z = Math.sin(t * 2.1) * 0.28; // 缓慢摇摆
      tinyFigure.position.y = 0.35 + Math.sin(t * 4.2) * 0.02;
    }
  });
  let stageTimers = [];
  const radiatorEgg = () => {
    for (const id of stageTimers) clearTimeout(id);
    stageTimers = [];
    blackout.v = 1;
    machineState.run = 0; // 机器停了——这比噪音更可怕
    audio.duck(1.2, 0.04, 2.4);
    stageTimers.push(setTimeout(() => {
      stageGlow.intensity = 14;
      tinyFigure.visible = true;
      audio.sfx('lullaby', 0.8);
      ui.caption('机器停了。暖气炉的深处亮起一盏小小的台口灯。那支歌不是唱给你听的。', 6600);
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

  // ---------- 博物馆化：展柜与引语 ----------
  // 展柜：一支铅笔——片名的由来（原创致敬，不含角色形象）
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
      ui.caption('展签：铅笔尾端的橡皮，能擦掉写错的字。这部电影问的是——擦掉之后，纸上留下的是什么？', 6600);
    }
  });

  // 引语展签（林奇原话：费城）
  const q1 = quotePlaque(quoteById('philly'), '#9fb4c7');
  q1.position.set(-5.6, 0, 2.2);
  q1.rotation.y = 1.35;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showEssay('industry')
  });

  // 展签
  const s1 = standPlaque('工业的摇篮曲', 'ERASERHEAD · 1977', '#9fb4c7');
  s1.position.set(2.4, 0, 1.8);
  s1.rotation.y = -2.2;
  group.add(s1);
  hotspots.add(s1.userData.board, {
    hint: 'E — 《橡皮头》档案',
    onActivate: () => ui.showFilm('eraserhead')
  });
  const s2 = standPlaque('房间的嗡鸣', 'SOUND DESIGN', '#9fb4c7');
  s2.position.set(-1.6, 0, 3.4);
  s2.rotation.y = 2.6;
  group.add(s2);
  hotspots.add(s2.userData.board, {
    hint: 'E — 阅读《房间的嗡鸣：声音设计》',
    onActivate: () => ui.showEssay('sound')
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
    bounds: rectBounds(-S / 2 + 1.1, S / 2 - 1.1, -S / 2 + 1.6, S / 2 - 1.4),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'radiator-stage': radiatorTrig }
  };
}
