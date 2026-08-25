// ============================================================
// 《穆赫兰道》展厅 —— NIGHT ROAD & THE ILLUSION THEATER
// 夜路 + 路灯 + 剧场 + 蓝色立方体 (梦境反转交互)
// 彩蛋：绕到剧场后面的人，会遇到那个东西。（WINKIES 致敬，原创程序化惊吓）
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, curtain, neonSign, micStand, doorway,
  smokeLayer, dustField, lightCone, standPlaque, quotePlaque, vitrine,
  darkFigure, zoneTrigger
} from './kit.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'mulholland',
  name: 'MULHOLLAND DR. · 梦境错位 (2001)',
  ambience: 'mulholland',
  narration: 'mulholland',
  look: { saturation: 0.96, tint: 0xf5eee6, fogColor: 0x0a0705, fogDensity: 0.04, bg: 0x030204, exposure: 1.0, bloom: 0.9 }
};

// 场地: 夜路区 + 剧场内部 + 右侧暗巷 + 剧场背后的空地（彩蛋区）
const ROAD = { minX: -4.6, maxX: 4.6, minZ: -13.6, maxZ: 19 };
const ROOM = { minX: -7.2, maxX: 7.2, minZ: -25.6, maxZ: -14.2 };
const DOOR = { minX: -1.35, maxX: 1.35, minZ: -14.9, maxZ: -13.2 };
const SHOULDER = { minX: 4.6, maxX: 11.0, minZ: 6.5, maxZ: 12.5 };  // 路肩缺口
const ALLEY = { minX: 8.4, maxX: 11.0, minZ: -31.5, maxZ: 6.5 };    // 暗巷
const BACKLOT = { minX: -10.5, maxX: 11.0, minZ: -33.0, maxZ: -27.6 }; // 背后空地

function multiRectClamp(rects) {
  const inside = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  return (p) => {
    for (const r of rects) if (inside(r, p.x, p.z)) return;
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
}

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player, teleport } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // ---------- 夜路 ----------
  const roadTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#131317';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${20 + Math.random() * 30},${20 + Math.random() * 30},${24 + Math.random() * 30},0.35)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    // 黄色中线虚线
    g.fillStyle = '#c9a24a';
    g.fillRect(s / 2 - 5, 10, 10, s / 2 - 30);
  }, 1, 10);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 38),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.65, metalness: 0.1 })
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

  // 路灯（一盏坏了，嗡嗡作响地闪）
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.5, metalness: 0.7 });
  const lampData = [];
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = 14 - i * 6.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8), poleMat);
    pole.position.set(side * 3.9, 2.3, z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), poleMat);
    arm.position.set(side * 3.35, 4.55, z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a8, emissiveIntensity: 3 })
    );
    bulb.position.set(side * 2.9, 4.48, z);
    const light = new THREE.PointLight(0xffd9a8, 7, 13, 1.6);
    light.position.set(side * 2.9, 4.4, z);
    const cone = lightCone(0.3, 2.1, 4.3, 0xffd9a8, 0.05);
    cone.position.set(side * 2.9, 2.3, z);
    group.add(pole, arm, bulb, light, cone);
    lampData.push({ bulb, light, cone, broken: i === 2 });
  }
  updaters.push((dt, t) => {
    for (const [i, L] of lampData.entries()) {
      let f = 1;
      if (L.broken) {
        f = Math.sin(t * 23 + i) * Math.sin(t * 7.7) > 0.2 ? (Math.random() < 0.08 ? 0.05 : 0.9) : 0.12;
      }
      L.light.intensity = 7 * f;
      L.bulb.material.emissiveIntensity = 3 * f;
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
  const roadSign = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 2.6, 0.06),
    new THREE.MeshStandardMaterial({ map: signTex, transparent: true, roughness: 0.5, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.25 })
  );
  roadSign.position.set(-3.6, 2.1, 12);
  roadSign.rotation.y = 0.9;
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 8), poleMat);
  signPole.position.set(-3.6, 1.2, 12);
  group.add(roadSign, signPole);
  hotspots.add(roadSign, {
    hint: 'E — 《穆赫兰道》档案',
    onActivate: () => ui.showFilm('mulholland-drive')
  });

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

  // ---------- 剧场外壳（侧墙/后墙——暗巷贴着它走） ----------
  const shellTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#191216';
    g.fillRect(0, 0, s, s);
    const bh = s / 12;
    for (let r = 0; r < 12; r++) {
      for (let c = -1; c < 7; c++) {
        const off = r % 2 ? s / 12 : 0;
        g.fillStyle = `rgb(${24 + Math.random() * 12},${18 + Math.random() * 8},${22 + Math.random() * 10})`;
        g.fillRect(c * (s / 6) + off + 1, r * bh + 1, s / 6 - 2, bh - 2);
      }
    }
  }, 5, 3);
  const shellMat = new THREE.MeshStandardMaterial({ map: shellTex, roughness: 0.9, bumpMap: shellTex, bumpScale: 0.35 });
  const mkShell = (w, h, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shellMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  mkShell(13.2, 8.2, 8.05, -20.2, -Math.PI / 2);  // 右侧外墙（暗巷内壁）
  mkShell(13.2, 8.2, -8.05, -20.2, Math.PI / 2);  // 左侧外墙
  mkShell(16.4, 8.2, 0, -26.6, Math.PI);          // 剧场后墙（空地内壁）

  // 空地围墙（挡住世界尽头）
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x0c0a10, roughness: 0.95 });
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.2), fenceMat);
  fence.position.set(0, 1.6, -33.6);
  group.add(fence);
  const fenceR = new THREE.Mesh(new THREE.PlaneGeometry(42, 3.2), fenceMat);
  fenceR.position.set(11.6, 1.6, -13);
  fenceR.rotation.y = -Math.PI / 2;
  group.add(fenceR);

  // ---------- 暗巷与背后空地（彩蛋区） ----------
  // 巷口一盏将熄的壁灯
  const alleyLamp = new THREE.PointLight(0xffc98a, 3.5, 9, 1.8);
  alleyLamp.position.set(9.6, 3.4, -6);
  const alleyBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc98a, emissiveIntensity: 2.4 })
  );
  alleyBulb.position.copy(alleyLamp.position);
  group.add(alleyLamp, alleyBulb);
  updaters.push((dt, t) => {
    const f = Math.sin(t * 19) * Math.sin(t * 6.3) > 0.55 ? 0.12 : 1;
    alleyLamp.intensity = 3.5 * f;
    alleyBulb.material.emissiveIntensity = 2.4 * f;
  });

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

  // 大垃圾箱（那个东西住在它后面）
  const dumpMat = new THREE.MeshStandardMaterial({ color: 0x14231c, roughness: 0.8, metalness: 0.4 });
  const dumpster = new THREE.Group();
  const dumpBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.35, 1.3), dumpMat);
  dumpBody.position.y = 0.75;
  const dumpLid = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.1, 1.36), dumpMat);
  dumpLid.position.set(0, 1.47, -0.1);
  dumpLid.rotation.x = -0.18;
  dumpster.add(dumpBody, dumpLid);
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

  // 巷内电话亭（不通向任何地方的电话）
  const boothMat = new THREE.MeshStandardMaterial({ color: 0x101a24, roughness: 0.5, metalness: 0.5 });
  const booth = new THREE.Group();
  const boothBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.3, 0.9), boothMat);
  boothBody.position.y = 1.15;
  const boothGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x88c8ff, emissiveIntensity: 0.8 })
  );
  boothGlow.position.set(0, 1.9, 0.46);
  booth.add(boothBody, boothGlow);
  booth.position.set(10.2, 0, -18);
  booth.rotation.y = -Math.PI / 2;
  group.add(booth);
  hotspots.add(boothGlow, {
    hint: 'E — 听筒还挂着微温',
    onActivate: () => {
      audio.sfx('radio', 0.6);
      ui.caption('电话没有拨号音。只有很远的地方，有人在慢慢地呼吸。', 5200);
    }
  });

  // ---------- 惊吓彩蛋：THE THING BEHIND ----------
  const figure = darkFigure(2.3);
  figure.visible = false;
  group.add(figure);
  const scare = { phase: 0, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };

  const doScare = () => {
    if (scare.phase !== 0) return;
    scare.phase = 1;
    scare.t = 0;
    // 世界的声音被抽走；后门灯熄灭
    audio.duck(1.6, 0.02, 3.2);
    backLampState.on = 0;
    later(() => audio.sfx('heartbeat', 0.9), 220);
    later(() => {
      // 形体从垃圾箱后面扑出——滑向玩家面前 1.1 米处
      scare.phase = 2;
      scare.t = 0;
      scare.from.set(dumpster.position.x + 0.6, 0, dumpster.position.z - 0.4);
      const dir = new THREE.Vector3(player.x - scare.from.x, 0, player.z - scare.from.z).normalize();
      scare.to.set(player.x - dir.x * 1.1, 0, player.z - dir.z * 1.1);
      figure.position.copy(scare.from);
      figure.visible = true;
      audio.sfx('scare');
      engine.shock(1, 0.9, 0x1a0000);
    }, 1500);
    later(() => {
      // 黑幕 + 空间错位：醒来时你已回到巷口
      figure.visible = false;
      ui.fade(true);
    }, 2350);
    later(() => {
      teleport(9.7, 9.5, Math.PI); // 巷口，背对来路
      ui.fade(false);
      backLampState.on = 1;
      audio.sfx('whisper', 0.7);
      ui.caption('你梦见过这个地方。现在，它也梦见了你。', 6000);
      scare.phase = 0; // 允许再次触发（zoneTrigger 冷却控制频率）
    }, 3100);
  };
  updaters.push((dt) => {
    if (scare.phase === 2) {
      scare.t += dt;
      const k = Math.min(1, scare.t / 0.26); // 0.26s 内扑到面前
      figure.position.lerpVectors(scare.from, scare.to, k * k);
      figure.lookAt(player.x, 1.4, player.z);
      figure.rotation.z = Math.sin(scare.t * 60) * 0.1; // 高频痉挛
    }
  });
  const scareTrig = zoneTrigger({ x: 2.0, z: -30.3, r: 3.4 }, doScare, { cooldown: 45 });
  updaters.push((dt) => scareTrig.update(player, dt));

  // 空地上唯一的提示——半掩的粉笔字
  const chalkTex = canvasTexture(256, (g, s) => {
    g.fillStyle = 'rgba(0,0,0,0)';
    g.clearRect(0, 0, s, s);
    g.fillStyle = 'rgba(220,220,230,0.5)';
    g.font = 'italic 44px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('he\u2019s the one', s / 2, s / 2 - 12);
    g.font = 'italic 30px "Songti SC","SimSun",serif';
    g.fillText('就 是 他', s / 2, s / 2 + 40);
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
  const cw = [
    { w: 15, x: 0, z: -6, ry: 0 },
    { w: 12, x: -7.5, z: 0, ry: Math.PI / 2 },
    { w: 12, x: 7.5, z: 0, ry: -Math.PI / 2 },
    { w: 15, x: 0, z: 6, ry: Math.PI }
  ];
  for (const c of cw) {
    const m = curtain(c.w, 6.4, PALETTE.velvet, Math.round(c.w * 0.65));
    m.position.set(c.x, 3.2, c.z);
    m.rotation.y = c.ry;
    inner.add(m);
  }
  const innerCeil = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 12),
    new THREE.MeshStandardMaterial({ color: 0x08050a, roughness: 0.95 })
  );
  innerCeil.rotation.x = Math.PI / 2;
  innerCeil.position.y = 6.4;
  inner.add(innerCeil);
  // 舞台 + 话筒
  const stage = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.6, 3),
    new THREE.MeshStandardMaterial({ color: 0x140d11, roughness: 0.35, metalness: 0.2 })
  );
  stage.position.set(0, 0.3, -4.2);
  const mic = micStand();
  mic.position.set(-1.6, 0.6, -4.2);
  inner.add(stage, mic);
  const stageSpot = new THREE.SpotLight(0xffeedd, 46, 15, 0.3, 0.55, 1.4);
  stageSpot.position.set(0, 6.2, -1.8);
  stageSpot.target.position.set(-1.6, 0.7, -4.2);
  inner.add(stageSpot, stageSpot.target);
  const stageCone = lightCone(0.35, 1.5, 5.4, 0xffeedd, 0.06);
  stageCone.position.set(-1.6, 3.2, -4.2);
  inner.add(stageCone);
  hotspots.add(mic.children[2], {
    hint: 'E — 没有乐队，一切都是录音',
    onActivate: () => {
      audio.sfx('swell');
      ui.caption('台上空无一人，音乐却还在继续。你为什么会流泪？', 5200);
    }
  });

  // 排椅
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x3d0a14, roughness: 0.8 });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.55), seatMat);
      seat.position.set(-2.2 + c * 0.86, 0.25, -0.6 + r * 1.05);
      const backR = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.12), seatMat);
      backR.position.set(-2.2 + c * 0.86, 0.72, -0.32 + r * 1.05);
      inner.add(seat, backR);
    }
  }

  // 蓝色立方体 —— 梦境反转
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.15, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.3, metalness: 0.4 })
  );
  pedestal.position.set(2.6, 0.58, -4.1);
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x0a1a44, roughness: 0.15, metalness: 0.2,
      emissive: 0x2244ff, emissiveIntensity: 0.9, envMapIntensity: 1.6
    })
  );
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
      ui.caption('梦翻了个面。醒来的代价，是记起一切。', 5000);
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
      ui.caption('展签：一把不属于任何一扇门的钥匙。等它被使用的那天，梦就结束了。', 5600);
    }
  });

  // 引语展签（林奇原话）
  const q1 = quotePlaque(quoteById('sense'), '#3ec5ff');
  q1.position.set(-3.9, 0, -11.6);
  q1.rotation.y = 0.55;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showEssay('dream')
  });

  // 展签：梦逻辑
  const s1 = standPlaque('梦的逻辑', 'DREAM NARRATIVE', '#3ec5ff');
  s1.position.set(3.4, 0, -11.4);
  s1.rotation.y = -0.6;
  group.add(s1);
  hotspots.add(s1.userData.board, {
    hint: 'E — 阅读《讲不通，但成立》',
    onActivate: () => ui.showEssay('dream')
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

  // 回大厅之门（夜路起点）
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, 17.8);
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  group.add(new THREE.AmbientLight(0x141228, 1.15));

  return {
    group,
    spawn: { x: 0, z: 15.5, yaw: 0 },
    bounds: multiRectClamp([ROAD, ROOM, DOOR, SHOULDER, ALLEY, BACKLOT]),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'winkies-scare': scareTrig },
    onLeave: () => {
      engine.lynchPass.uniforms.uInvert.value = 0;
      for (const id of timers) clearTimeout(id);
    }
  };
}
