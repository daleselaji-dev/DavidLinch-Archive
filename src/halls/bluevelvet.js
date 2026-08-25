// ============================================================
// 《蓝丝绒》展厅 —— THE BLUE ROOM 夜总会
// 蓝天鹅绒舞台 + 孤独的话筒 + 桌灯烛光 + 香烟薄雾
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, canvasTexture, floorMesh, doorway, curtain, neonSign, micStand,
  smokeLayer, dustField, lightCone, standPlaque, rectBounds
} from './kit.js';

export const meta = {
  id: 'bluevelvet',
  name: 'BLUE VELVET · 蓝色房间 (1986)',
  ambience: 'bluevelvet',
  narration: 'bluevelvet',
  look: { saturation: 0.92, tint: 0xdfe6ff, fogColor: 0x030409, fogDensity: 0.05, bg: 0x02030a, exposure: 1.0, bloom: 0.95 }
};

const W = 19;
const D = 15;

export function build(ctx) {
  const { hotspots, ui, goTo, audio } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 深色木地板
  const floorTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#100c0e';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = `rgba(${26 + Math.random() * 14},${16 + Math.random() * 10},${18 + Math.random() * 10},1)`;
      g.fillRect(i * (s / 10), 0, s / 10 - 2, s);
    }
  }, 6, 6);
  group.add(floorMesh(W, D, new THREE.MeshStandardMaterial({
    map: floorTex, roughness: 0.3, metalness: 0.15, envMapIntensity: 0.9
  })));

  // 四周深蓝帷幕墙
  const H = 6;
  const wallCurtains = [
    { w: W, x: 0, z: -D / 2, ry: 0 },
    { w: W, x: 0, z: D / 2, ry: Math.PI },
    { w: D, x: -W / 2, z: 0, ry: Math.PI / 2 },
    { w: D, x: W / 2, z: 0, ry: -Math.PI / 2 }
  ];
  for (const c of wallCurtains) {
    const m = curtain(c.w, H, 0x101c40, Math.round(c.w * 0.7));
    m.position.set(c.x, H / 2, c.z);
    m.rotation.y = c.ry;
    group.add(m);
  }
  const ceil = floorMesh(W, D, new THREE.MeshStandardMaterial({ color: 0x07070c, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

  // 舞台
  const stage = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.55, 3.6),
    new THREE.MeshStandardMaterial({ color: 0x120d10, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.8 })
  );
  stage.position.set(0, 0.275, -D / 2 + 2.3);
  group.add(stage);

  // 舞台后幕 —— 更亮的蓝天鹅绒
  const backdrop = curtain(9.4, 5.2, 0x1a2c66, 8);
  backdrop.position.set(0, 3.1, -D / 2 + 0.5);
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

  // 话筒热点 —— 影片档案
  const micHot = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0, emissive: 0x4f74ff, emissiveIntensity: 0 })
  );
  micHot.position.set(0, 1.9, -D / 2 + 2.3);
  group.add(micHot);
  hotspots.add(micHot, {
    hint: 'E — 空舞台，等一位歌者（《蓝丝绒》档案）',
    onActivate: () => ui.showFilm('blue-velvet')
  });

  // 霓虹招牌
  const sign = neonSign('THE BLUE ROOM', { color: '#4f74ff', size: 0.72 });
  sign.position.set(0, 5.35, -D / 2 + 1.1);
  group.add(sign);
  updaters.push((dt, t) => sign.userData.flicker(t, 11));

  // 观众席小圆桌 + 桌灯
  const lamps = [];
  const tablePos = [[-3.4, 1.2], [3.2, 0.8], [-1.2, 3.4], [2.6, 3.8], [-4.6, 4.4], [0.6, 5.8]];
  for (const [x, z] of tablePos) {
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.52, 0.05, 18),
      new THREE.MeshStandardMaterial({ color: 0x17090d, roughness: 0.4 })
    );
    table.position.set(x, 0.78, z);
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.22, 0.78, 10),
      new THREE.MeshStandardMaterial({ color: 0x0c0608, roughness: 0.5 })
    );
    leg.position.set(x, 0.39, z);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.18, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x8f0e1e, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xff5e3c, emissiveIntensity: 0.25 })
    );
    shade.position.set(x, 1.02, z);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc48a, emissiveIntensity: 3.4 })
    );
    glow.position.set(x, 0.96, z);
    const light = new THREE.PointLight(0xff9e5e, 2.6, 5, 2);
    light.position.set(x, 1.1, z);
    group.add(table, leg, shade, glow, light);
    lamps.push({ light, glow });

    // 桌面升起的细烟
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
      ui.caption(toBlue ? '灯灭了。蓝色接管了房间。' : '暖光回来了。假装什么都没发生。', 4000);
    }
  });
  updaters.push((dt) => {
    blueWash.intensity += ((dimState.blue * 26) - blueWash.intensity) * Math.min(1, dt * 2.2);
  });

  // 展签：帷幕意象
  const s1 = standPlaque('红色天鹅绒', 'THE CURTAIN MOTIF', '#4f74ff');
  s1.position.set(5.6, 0, 2.6);
  s1.rotation.y = -1.1;
  group.add(s1);
  hotspots.add(s1.userData.board, {
    hint: 'E — 阅读《红色天鹅绒：帷幕意象》',
    onActivate: () => ui.showEssay('velvet')
  });

  // 回大厅
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, D / 2 - 0.55);
  back.rotation.y = Math.PI;
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

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
    update: (dt, t) => { for (const u of updaters) u(dt, t); }
  };
}
