// ============================================================
// 《穆赫兰道》展厅 —— NIGHT ROAD & THE ILLUSION THEATER
// 夜路 + 路灯 + 剧场 + 蓝色立方体 (梦境反转交互)
// 彩蛋：绕到剧场后面的人，会遇到那个东西。（原创程序化惊吓，
// 无镜头复刻、无对白引用）
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, curtain, curtainWithValance, neonSign, micStand, doorway,
  smokeLayer, dustField, lightCone, quotePlaque, vitrine,
  darkFigure, zoneTrigger, multiRectBounds,
  mergedMesh, xform, roundedBoxMesh, brushedMetalTexture, velvetMaterial,
  asphaltMat, woodMat
} from './kit.js';
import { propMats, theaterSeats, phoneBooth, streetLampV2 } from './props.js';
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

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player, teleport } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // ---------- 夜路（v1.3 三通道：湿沥青 + 骨料法线 + 虚线中线） ----------
  const M = propMats();
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 38),
    asphaltMat({ seed: 27, repX: 1, repY: 10, wet: 0.65 })
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

  // 路灯 v2（凹槽柱 + 泪滴灯头；一盏坏了，嗡嗡作响地闪）
  const lampData = [];
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = 14 - i * 6.5;
    const lamp = streetLampV2({ mats: M });
    lamp.position.set(side * 3.9, 0, z);
    lamp.rotation.y = side < 0 ? 0 : Math.PI; // 灯头朝向路面
    group.add(lamp);
    const headWorldX = side * (3.9 - lamp.userData.headX);
    const cone = lightCone(0.3, 2.1, 4.3, 0xffd9a8, 0.05);
    cone.position.set(headWorldX, 2.15, z);
    group.add(cone);
    lampData.push({ bulbMat: lamp.userData.bulbMat, light: lamp.userData.light, cone, broken: i === 2 });
  }
  updaters.push((dt, t) => {
    for (const [i, L] of lampData.entries()) {
      let f = 1;
      if (L.broken) {
        f = Math.sin(t * 23 + i) * Math.sin(t * 7.7) > 0.2 ? (Math.random() < 0.08 ? 0.05 : 0.9) : 0.12;
      }
      L.light.intensity = 7 * f;
      L.bulbMat.emissiveIntensity = 3 * f;
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
  const roadSign = roundedBoxMesh(2.6, 2.6, 0.07, 0.02,
    new THREE.MeshStandardMaterial({ map: signTex, transparent: true, roughness: 0.5, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.25 }));
  roadSign.position.set(-3.6, 2.1, 12);
  roadSign.rotation.y = 0.9;
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 10), M.iron);
  signPole.position.set(-3.6, 1.2, 12);
  group.add(roadSign, signPole);
  hotspots.add(roadSign, {
    hint: 'E — 《穆赫兰道》档案',
    onActivate: () => ui.showFilm('mulholland-drive')
  });

  // 路肩护栏（白色立柱 + 波形护板，合并单 mesh）
  const guardGeos = [];
  const guardPostGeo = new THREE.BoxGeometry(0.12, 0.75, 0.1);
  const guardBandGeo = new THREE.BoxGeometry(0.05, 0.34, 6.2);
  for (let i = 0; i < 5; i++) {
    guardGeos.push(xform(guardPostGeo, -4.35, 0.375, 14 - i * 1.55));
  }
  guardGeos.push(xform(guardBandGeo, -4.32, 0.62, 10.9, 0, 0, 0));
  guardPostGeo.dispose();
  guardBandGeo.dispose();
  group.add(mergedMesh(guardGeos, new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(256, 150, 40), color: 0x9aa0a8, roughness: 0.45, metalness: 0.7, envMapIntensity: 0.9
  })));

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
  // 招牌追逐灯泡链（合并单 mesh，整体呼吸闪烁）
  const chaseGeos = [];
  const chaseGeo = new THREE.SphereGeometry(0.05, 8, 6);
  for (let i = 0; i < 14; i++) {
    chaseGeos.push(xform(chaseGeo, -3.2 + i * 0.49, 8.95, -13.55));
  }
  for (let i = 0; i < 14; i++) {
    chaseGeos.push(xform(chaseGeo, -3.2 + i * 0.49, 7.05, -13.55));
  }
  chaseGeo.dispose();
  const chaseBulbs = mergedMesh(chaseGeos, new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0xffd9a8, emissiveIntensity: 2.2, toneMapped: true
  }));
  group.add(chaseBulbs);
  updaters.push((dt, t) => {
    chaseBulbs.material.emissiveIntensity = 1.6 + (Math.sin(t * 7) * 0.5 + 0.5) * 1.4;
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

  // 大垃圾箱（那个东西住在它后面）——艺术二遍：
  // 斜口箱体 + 竖向压筋 + 双开盖微错位 + 侧袋钩 + 脚轮，惊吓闪光时剪影可信
  const dumpMat = new THREE.MeshStandardMaterial({ color: 0x14231c, roughness: 0.8, metalness: 0.4 });
  const dumpster = new THREE.Group();
  const dumpBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.25, 1.3), dumpMat);
  dumpBody.position.y = 0.78;
  // 上沿外翻边
  const dumpRim = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.07, 1.42), dumpMat);
  dumpRim.position.y = 1.42;
  // 竖向压筋（前后面各 5 道，合并）
  const ribGeo = new THREE.BoxGeometry(0.07, 1.1, 0.04);
  const ribGeos = [];
  for (let i = 0; i < 5; i++) {
    const x = -1.0 + i * 0.5;
    ribGeos.push(xform(ribGeo, x, 0.76, 0.66));
    ribGeos.push(xform(ribGeo, x, 0.76, -0.66));
  }
  ribGeo.dispose();
  // 双开盖（微错位开角）+ 管状把手
  const lidGeo = new THREE.BoxGeometry(1.3, 0.07, 1.36);
  const lidL = new THREE.Mesh(lidGeo, dumpMat);
  lidL.position.set(-0.66, 1.5, -0.08);
  lidL.rotation.x = -0.14;
  const lidR = new THREE.Mesh(lidGeo, dumpMat);
  lidR.position.set(0.66, 1.53, -0.14);
  lidR.rotation.x = -0.3;
  const handleGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8);
  const handles = mergedMesh([
    xform(handleGeo, -0.66, 1.56, 0.55, 0, 0, Math.PI / 2),
    xform(handleGeo, 0.66, 1.63, 0.5, 0, 0, Math.PI / 2)
  ], dumpMat);
  handleGeo.dispose();
  // 脚轮 ×4
  const wheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10);
  const wheels = mergedMesh([
    xform(wheelGeo, -1.1, 0.09, 0.5, Math.PI / 2, 0, 0),
    xform(wheelGeo, 1.1, 0.09, 0.5, Math.PI / 2, 0, 0),
    xform(wheelGeo, -1.1, 0.09, -0.5, Math.PI / 2, 0, 0),
    xform(wheelGeo, 1.1, 0.09, -0.5, Math.PI / 2, 0, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.6, metalness: 0.3 }));
  wheelGeo.dispose();
  dumpster.add(dumpBody, dumpRim, mergedMesh(ribGeos, dumpMat), lidL, lidR, handles, wheels);
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

  // 巷内电话亭 v2（立柱框架 + 玻璃 + 折门 + 螺旋话线；不通向任何地方）
  const booth = phoneBooth({ mats: M });
  booth.position.set(10.2, 0, -18);
  booth.rotation.y = -Math.PI / 2;
  group.add(booth);
  const boothState = { open: 0, target: 0 };
  updaters.push((dt, t) => {
    boothState.open += (boothState.target - boothState.open) * Math.min(1, dt * 4);
    booth.userData.door.rotation.y = boothState.open * -1.15;
    booth.userData.topSignMat.emissiveIntensity =
      0.9 * (Math.sin(t * 15.3) > 0.92 ? 0.3 : 1);
  });
  hotspots.add(booth.userData.door.children[0].children[0], {
    hint: 'E — 折门',
    onActivate: () => {
      boothState.target = boothState.target > 0.5 ? 0 : 1;
      audio.sfx('clank', 0.4);
    }
  });
  hotspots.add(booth.userData.handset, {
    hint: 'E — 听筒还挂着微温',
    onActivate: () => {
      audio.sfx('radio', 0.6);
      ui.caption('没有拨号音。只有呼吸。', 3600);
    }
  });
  // 转盘拨号 —— 顺时针转到底，再嗒嗒嗒弹回
  const dialState = { t: 0 };
  updaters.push((dt) => {
    if (dialState.t <= 0) return;
    dialState.t = Math.max(0, dialState.t - dt);
    const k = dialState.t > 0.6 ? (1.2 - dialState.t) / 0.6 : dialState.t / 0.6;
    booth.userData.dial.rotation.z = -k * 2.4;
  });
  hotspots.add(booth.userData.dialDisc, {
    hint: 'E — 转一格拨号盘',
    onActivate: () => {
      dialState.t = 1.2;
      audio.sfx('clank', 0.22);
      later(() => audio.sfxAt('ratchet', 10.2, -18, 0.85), 580);
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
      ui.caption('你梦见过这个地方。现在，它也梦见了你。', 5200);
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

  // 空地上唯一的提示——半掩的粉笔螺旋（原创图形，无文字、无对白引用）
  const chalkTex = canvasTexture(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.strokeStyle = 'rgba(220,220,230,0.5)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    // 向内收紧的粉笔螺旋，末端一个被划掉的小圆
    g.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.08) {
      const r = 100 - a * 4.2;
      const x = s / 2 + Math.cos(a) * r;
      const y = s / 2 + Math.sin(a) * r * 0.92;
      if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.beginPath();
    g.arc(s / 2, s / 2, 9, 0, 7);
    g.stroke();
    g.beginPath();
    g.moveTo(s / 2 - 15, s / 2 - 13);
    g.lineTo(s / 2 + 15, s / 2 + 13);
    g.stroke();
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
  const innerVelvet = velvetMaterial(PALETTE.velvet);
  const cw = [
    { w: 15, x: 0, z: -6, ry: 0 },
    { w: 12, x: -7.5, z: 0, ry: Math.PI / 2 },
    { w: 12, x: 7.5, z: 0, ry: -Math.PI / 2 },
    { w: 15, x: 0, z: 6, ry: Math.PI }
  ];
  for (const c of cw) {
    const m = curtain(c.w, 6.4, PALETTE.velvet, Math.round(c.w * 0.65), innerVelvet);
    m.position.set(c.x, 3.2, c.z);
    m.rotation.y = c.ry;
    inner.add(m);
  }
  // 台口大幕（帷头层，比裸墙幕更有剧场感）
  const proscenium = curtainWithValance(9.2, 5.6, 0xa8142a, 8);
  proscenium.position.set(0, 0, -5.75);
  inner.add(proscenium);
  const innerCeil = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 12),
    new THREE.MeshStandardMaterial({ color: 0x08050a, roughness: 0.95 })
  );
  innerCeil.rotation.x = Math.PI / 2;
  innerCeil.position.y = 6.4;
  inner.add(innerCeil);
  // 舞台（深色蜡面台板 + 黄铜包边）+ 话筒
  const stage = roundedBoxMesh(8, 0.6, 3, 0.06,
    woodMat({ base: [22, 13, 16], planks: 6, size: 256, seed: 28, gloss: 0.8, env: 0.8 }));
  stage.position.set(0, 0.3, -4.2);
  const stageTrim = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.3, metalness: 0.95 })
  );
  stageTrim.position.set(0, 0.61, -2.72);
  const mic = micStand();
  mic.position.set(-1.6, 0.6, -4.2);
  inner.add(stage, stageTrim, mic);
  const stageSpot = new THREE.SpotLight(0xffeedd, 46, 15, 0.3, 0.55, 1.4);
  stageSpot.position.set(0, 6.2, -1.8);
  stageSpot.target.position.set(-1.6, 0.7, -4.2);
  inner.add(stageSpot, stageSpot.target);
  const stageCone = lightCone(0.35, 1.5, 5.4, 0xffeedd, 0.06);
  stageCone.position.set(-1.6, 3.2, -4.2);
  inner.add(stageCone);
  hotspots.add(mic.children[3], {
    hint: 'E — 没有乐队，一切都是录音',
    onActivate: () => {
      audio.sfx('swell');
      ui.caption('台上空无一人，音乐还在继续。', 4200);
    }
  });

  // 折座排椅 v2（铸铁端架 + 皮面翻座 + 排灯；一把翻起的椅子可以坐下）
  const seats = theaterSeats({ rows: 3, cols: 6, dx: 0.86, dz: 1.05, mats: M });
  seats.position.set(0, 0, -0.6);
  inner.add(seats);
  const special = seats.userData.specialSeat;
  const sitState = { down: 0, target: 0 };
  updaters.push((dt) => {
    sitState.down += (sitState.target - sitState.down) * Math.min(1, dt * 5);
    if (special) special.userData.seat.rotation.x = -1.25 + sitState.down * 1.18;
  });
  if (special) {
    hotspots.add(special.userData.seat, {
      hint: 'E — 放下这把椅子',
      onActivate: () => {
        const down = sitState.target < 0.5;
        sitState.target = down ? 1 : 0;
        audio.sfx('creak', 0.5);
        setTimeout(() => audio.sfx('thud', 0.4), 260);
        if (down) {
          // 连锁反应：台口灯亮起一拍，仿佛等你入座已久
          stageSpot.intensity = 90;
          audio.sfx('swell', 0.7);
          setTimeout(() => { stageSpot.intensity = 46; }, 2600);
          ui.caption('这个位子一直空着。', 3600);
        }
      }
    });
  }

  // 走道排灯闸 —— 墙上的黄铜拨杆，熄掉排椅侧的小灯珠
  const aisleBox = roundedBoxMesh(0.14, 0.22, 0.07, 0.015,
    new THREE.MeshStandardMaterial({ color: 0x1a1418, roughness: 0.5, metalness: 0.5 }));
  aisleBox.position.set(7.15, 1.05, 1.8);
  aisleBox.rotation.y = -Math.PI / 2;
  const aisleLever = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.022, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a6c3c, roughness: 0.3, metalness: 0.9 })
  );
  aisleLever.position.set(7.1, 1.05, 1.8);
  aisleLever.rotation.z = 0.5;
  inner.add(aisleBox, aisleLever);
  const aisleWash = new THREE.PointLight(0xffca7a, 2.2, 8, 2);
  aisleWash.position.set(0, 1.4, 0.5);
  inner.add(aisleWash);
  const aisleState = { on: 1 };
  updaters.push((dt) => {
    const target = aisleState.on;
    seats.userData.domeMat.emissiveIntensity += (target * 1.8 - seats.userData.domeMat.emissiveIntensity) * Math.min(1, dt * 8);
    aisleWash.intensity += (target * 2.2 - aisleWash.intensity) * Math.min(1, dt * 8);
    aisleLever.rotation.z += ((aisleState.on ? 0.5 : -0.5) - aisleLever.rotation.z) * Math.min(1, dt * 10);
  });
  hotspots.add(aisleLever, {
    hint: 'E — 走道排灯',
    onActivate: () => {
      aisleState.on = aisleState.on ? 0 : 1;
      audio.sfx('switch', 0.55);
      audio.sfx(aisleState.on ? 'lampon' : 'lampoff', 0.3);
    }
  });

  // 蓝色立方体 —— 梦境反转
  const pedestal = roundedBoxMesh(0.6, 1.15, 0.6, 0.04,
    new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.3, metalness: 0.4 }));
  pedestal.position.set(2.6, 0.58, -4.1);
  const cube = roundedBoxMesh(0.42, 0.42, 0.42, 0.03,
    new THREE.MeshPhysicalMaterial({
      color: 0x0a1a44, roughness: 0.12, metalness: 0.2,
      emissive: 0x2244ff, emissiveIntensity: 0.9, envMapIntensity: 1.6,
      clearcoat: 0.6, clearcoatRoughness: 0.2
    }));
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
      ui.caption('梦翻了个面。', 3200);
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
      ui.caption('一把不属于任何门的钥匙。', 3600);
    }
  });

  // 引语展签（本厅唯一文字展签）
  const q1 = quotePlaque(quoteById('sense'), '#3ec5ff');
  q1.position.set(-3.9, 0, -11.6);
  q1.rotation.y = 0.55;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
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
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  group.add(new THREE.AmbientLight(0x141228, 1.15));

  return {
    group,
    spawn: { x: 0, z: 15.5, yaw: 0 },
    bounds: multiRectBounds([ROAD, ROOM, DOOR, SHOULDER, ALLEY, BACKLOT]),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'backlot-scare': scareTrig },
    onLeave: () => {
      engine.lynchPass.uniforms.uInvert.value = 0;
      for (const id of timers) clearTimeout(id);
    }
  };
}
