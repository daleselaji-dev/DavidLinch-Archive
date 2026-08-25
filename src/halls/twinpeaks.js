// ============================================================
// 《双峰》展厅 —— THE DARK PINES 黑松林
// 夜之松林 + 地表雾 + 萤火 + 林中独立的红帷幕之门
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, chevronTexture, curtain, neonSign,
  smokeLayer, dustField, standPlaque, quotePlaque, vitrine,
  zoneTrigger, circleBounds, pineGeometryMaterial
} from './kit.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'twinpeaks',
  name: 'TWIN PEAKS · 黑松林 (1990)',
  ambience: 'twinpeaks',
  narration: 'twinpeaks',
  look: { saturation: 0.82, tint: 0xdcecdf, fogColor: 0x030805, fogDensity: 0.035, bg: 0x02040a, exposure: 0.95, bloom: 0.8 }
};

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player, teleport } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // 林地
  const groundTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#0a0f08';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${8 + Math.random() * 24},${14 + Math.random() * 26},${8 + Math.random() * 16},0.5)`;
      g.beginPath();
      g.arc(Math.random() * s, Math.random() * s, Math.random() * 12, 0, 7);
      g.fill();
    }
  }, 8, 8);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(46, 48),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // 星空 + 月亮
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = Math.random() * Math.PI * 2;
    const el = Math.random() * Math.PI * 0.46 + 0.06;
    const r = 150;
    starPos[i * 3] = Math.cos(a) * Math.cos(el) * r;
    starPos[i * 3 + 1] = Math.sin(el) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xcfe0ff, size: 0.55, transparent: true, opacity: 0.8, fog: false
  }));
  group.add(stars);
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(7, 30),
    new THREE.MeshBasicMaterial({ color: 0xe8ecf5, fog: false, toneMapped: false })
  );
  moon.position.set(-60, 52, -110);
  moon.lookAt(0, 1.7, 0);
  group.add(moon);
  const moonLight = new THREE.DirectionalLight(0x8ea6c9, 0.55);
  moonLight.position.set(-30, 50, -60);
  group.add(moonLight);

  // 松林（实例化）
  const { geo: pineGeo, mat: pineMat } = pineGeometryMaterial();
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.6, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x140f0a, roughness: 0.95 });
  const COUNT = 300;
  const pines = new THREE.InstancedMesh(pineGeo, pineMat, COUNT);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, COUNT);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < COUNT && guard++ < 4000) {
    const a = Math.random() * Math.PI * 2;
    const r = 11 + Math.pow(Math.random(), 0.7) * 33;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const s = 0.8 + Math.random() * 2.4;
    dummy.position.set(x, 1.3 * s + 0.9, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    pines.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 0.8;
    dummy.scale.set(s, 1, s);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  group.add(pines, trunks);

  // 林中红帷幕之门（回到大厅的通道）
  const gate = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 36),
    new THREE.MeshStandardMaterial({ map: chevronTexture('#0b0b0d', '#ded7c8', 4), roughness: 0.35, metalness: 0.1 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  const curtainL = curtain(1.6, 3.6, PALETTE.velvet, 3);
  curtainL.position.set(-0.85, 1.8, 0);
  const curtainR = curtain(1.6, 3.6, PALETTE.velvet, 3);
  curtainR.position.set(0.85, 1.8, 0);
  const lintelC = curtain(3.6, 0.9, PALETTE.velvet, 6);
  lintelC.position.set(0, 3.55, 0);
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 3.4),
    new THREE.MeshStandardMaterial({
      color: 0x050203, emissive: 0xd4243c, emissiveIntensity: 0.5, side: THREE.DoubleSide
    })
  );
  glowPlane.position.set(0, 1.75, -0.06);
  const gateLight = new THREE.PointLight(0xd4243c, 16, 15, 1.7);
  gateLight.position.set(0, 2.2, 1.2);
  gate.add(pad, curtainL, curtainR, lintelC, glowPlane, gateLight);
  gate.position.set(0, 0, -6);
  group.add(gate);
  updaters.push((dt, t) => {
    glowPlane.material.emissiveIntensity = 0.42 + Math.sin(t * 1.3) * 0.18;
    gateLight.intensity = 14 + Math.sin(t * 1.3) * 4;
  });
  hotspots.add(glowPlane, {
    hint: 'E — 掀开帷幕，回到大厅',
    onActivate: () => goTo('lobby')
  });

  // 帷幕侧的剧集档案热点
  const gatePlaque = standPlaque('林中帷幕', 'TWIN PEAKS · 1990–2017', '#3fae6a');
  gatePlaque.position.set(3.2, 0, -4.4);
  gatePlaque.rotation.y = -2.4;
  group.add(gatePlaque);
  hotspots.add(gatePlaque.userData.board, {
    hint: 'E — 《双峰》剧集档案',
    onActivate: () => ui.showFilm('twin-peaks')
  });

  // 木牌 —— 回归季档案
  const signTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#241708';
    g.fillRect(0, 40, s, s - 160);
    g.strokeStyle = '#0d0803';
    g.lineWidth = 14;
    g.strokeRect(7, 47, s - 14, s - 174);
    g.fillStyle = '#e8dcc2';
    g.textAlign = 'center';
    g.font = '400 64px Georgia, serif';
    g.fillText('THE DARK PINES', s / 2, 170);
    g.font = '44px "Songti SC","SimSun",serif';
    g.fillText('黑 松 林 保 护 区', s / 2, 250);
    g.font = '26px "Courier New", monospace';
    g.fillStyle = '#b8a781';
    g.fillText('the owls · the wind · the return', s / 2, 320);
  });
  const woodSign = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.7, 0.1),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.12 })
  );
  woodSign.position.set(-3.4, 1.6, 4.2);
  woodSign.rotation.y = 0.6;
  const signPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 1.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1108, roughness: 0.95 })
  );
  signPost.position.set(-3.4, 0.75, 4.2);
  group.add(woodSign, signPost);
  hotspots.add(woodSign, {
    hint: 'E — 《双峰：回归》档案',
    onActivate: () => ui.showFilm('twin-peaks-return')
  });

  // 树桩上的热咖啡
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 0.7, 12),
    new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.95 })
  );
  stump.position.set(3.8, 0.35, 3.2);
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.07, 0.14, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.4 })
  );
  cup.position.set(3.8, 0.77, 3.2);
  group.add(stump, cup);
  const cupSteam = smokeLayer(6, { x: 0.1, z: 0.1 }, { opacity: 0.06, size: 0.5, yBase: 0.9, ySpread: 0.5, color: 0xffffff });
  cupSteam.position.set(3.8, 0, 3.2);
  group.add(cupSteam);
  updaters.push(cupSteam.userData.update);
  hotspots.add(cup, {
    hint: 'E — 一杯还冒着热气的咖啡',
    onActivate: () => {
      audio.sfx('sip');
      ui.caption('热咖啡。永远趁热。这是这片林子唯一确定的事。', 4600);
    }
  });

  // 地表雾 + 萤火（彩蛋发生时会凝固在半空）
  const fogLayer = smokeLayer(110, { x: 60, z: 60 }, { opacity: 0.045, size: 17, yBase: 0.25, ySpread: 1.2, color: 0x8da4ad });
  group.add(fogLayer);
  updaters.push(fogLayer.userData.update);
  const fireflies = dustField(90, { x: 40, y: 3, z: 40 }, { color: 0xbfffa8, size: 0.09, opacity: 0.8 });
  group.add(fireflies);
  const freeze = { on: false };
  updaters.push((dt, t) => { if (!freeze.on) fireflies.userData.update(dt, t); });

  // ---------- 彩蛋：环形石阵（走进去的人会被移动） ----------
  // 深入林子背面——帷幕之门的正对侧，藏着一圈立石与一汪黑水。
  const grove = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.9 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const h = 0.8 + Math.random() * 0.7;
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, 0.32), stoneMat);
    stone.position.set(Math.cos(a) * 2.4, h / 2, Math.sin(a) * 2.4);
    stone.rotation.y = a + Math.random() * 0.5;
    stone.rotation.z = (Math.random() - 0.5) * 0.16;
    grove.add(stone);
  }
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 28),
    new THREE.MeshStandardMaterial({ color: 0x02030a, roughness: 0.06, metalness: 0.9, envMapIntensity: 1.8 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.015;
  grove.add(pool);
  grove.position.set(15, 0, 11);
  group.add(grove);

  const groveEgg = () => {
    freeze.on = true;           // 萤火凝固
    audio.duck(2.2, 0.02, 3.0); // 风声被抽走
    audio.sfx('stonechime', 0.9);
    later(() => {
      glowPlane.material.emissiveIntensity = 2.6; // 远处的帷幕之门骤亮
      gateLight.intensity = 60;
    }, 900);
    later(() => ui.fade(true), 1700);
    later(() => {
      // 空间错位：你没有走向帷幕，是帷幕走向了你
      teleport(0, -3.4, 0); // 直接站在帷幕之门前，面对它
      ui.fade(false);
      freeze.on = false;
      glowPlane.material.emissiveIntensity = 0.5;
      gateLight.intensity = 16;
      audio.sfx('owl', 0.8);
      ui.caption('你没有走向帷幕。是帷幕走向了你。石阵还留在原地，替你数着秒。', 6600);
    }, 2400);
  };
  const groveTrig = zoneTrigger({ x: 15, z: 11, r: 2.1 }, groveEgg, { cooldown: 60 });
  updaters.push((dt) => groveTrig.update(player, dt));

  // ---------- 博物馆化：引语展签 + 展柜 ----------
  const q1 = quotePlaque(quoteById('darkness'), '#3fae6a');
  q1.position.set(-4.6, 0, 8.4);
  q1.rotation.y = 0.9;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showEssay('velvet')
  });
  // 展柜：一段圆木（小镇的沉默证人；原创抽象，不含角色形象）
  const logCase = vitrine('一段圆木', 'THE SILENT WITNESS', '#3fae6a');
  logCase.position.set(-6.2, 0, 1.8);
  logCase.rotation.y = 1.2;
  group.add(logCase);
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.12, 0.42, 12),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(128, (g, s) => {
        g.fillStyle = '#3a2814';
        g.fillRect(0, 0, s, s);
        for (let i = 0; i < 20; i++) {
          g.strokeStyle = `rgba(${20 + Math.random() * 30},${14 + Math.random() * 20},8,0.6)`;
          g.beginPath();
          g.moveTo(0, Math.random() * s);
          g.lineTo(s, Math.random() * s);
          g.stroke();
        }
      }),
      roughness: 0.95
    })
  );
  log.rotation.z = Math.PI / 2;
  log.position.y = 0.12;
  logCase.userData.slot.add(log);
  hotspots.add(logCase.userData.label, {
    hint: 'E — 它看见了一切',
    onActivate: () => {
      audio.sfx('owl', 0.6);
      ui.caption('展签：这段木头什么都看见了，但它只对愿意弯下腰的人开口。今晚它选择沉默。', 6200);
    }
  });

  // 掠过夜空的猫头鹰剪影
  const owls = [];
  for (let i = 0; i < 2; i++) {
    const owl = new THREE.Group();
    const bodyM = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bodyM);
    body.scale.set(1, 0.55, 1.7);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 0.7), bodyM);
    wingL.position.x = -1.2;
    const wingR = wingL.clone();
    wingR.position.x = 1.2;
    owl.add(body, wingL, wingR);
    group.add(owl);
    owls.push({ owl, wingL, wingR, phase: i * 3.1, r: 26 + i * 9, h: 17 + i * 6, speed: 0.09 + i * 0.03 });
  }
  updaters.push((dt, t) => {
    for (const o of owls) {
      const a = t * o.speed + o.phase;
      o.owl.position.set(Math.cos(a) * o.r, o.h + Math.sin(t * 0.5 + o.phase) * 1.6, Math.sin(a) * o.r);
      o.owl.rotation.y = -a - Math.PI / 2;
      o.wingL.rotation.z = Math.sin(t * 5 + o.phase) * 0.5;
      o.wingR.rotation.z = -Math.sin(t * 5 + o.phase) * 0.5;
    }
  });

  // 远处林间的一盏神秘路灯
  const lamp = neonSign('···', { color: '#ffd9b0', size: 0.3 });
  lamp.position.set(-11, 3.4, -12);
  group.add(lamp);
  updaters.push((dt, t) => lamp.userData.flicker(t, 5.5));

  group.add(new THREE.AmbientLight(0x18222a, 0.9));

  return {
    group,
    spawn: { x: 0, z: 7.5, yaw: 0 },
    bounds: circleBounds(24),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'stone-circle': groveTrig },
    onLeave: () => { for (const id of timers) clearTimeout(id); }
  };
}
