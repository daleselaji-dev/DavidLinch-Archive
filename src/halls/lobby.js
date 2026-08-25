// ============================================================
// 总览大厅 —— THE VELVET FOYER 天鹅绒大厅
// 红天鹅绒环形围合 + 黑白折线地板 + 五扇门 + 中央纪念台
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, chevronTexture, curtainRing, floorMesh, neonSign, doorway,
  smokeLayer, dustField, lightCone, hangingBulb, makeFlicker, standPlaque, circleBounds
} from './kit.js';

export const meta = {
  id: 'lobby',
  name: 'THE VELVET FOYER · 天鹅绒大厅',
  ambience: 'lobby',
  narration: 'lobby',
  look: { saturation: 1.04, tint: 0xfff4ee, fogColor: 0x0a0406, fogDensity: 0.05, bg: 0x080304, exposure: 1.05, bloom: 0.9 }
};

const R = 14.5;

export function build(ctx) {
  const { hotspots, ui, goTo } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 地板 —— 黑白折线
  const floorMat = new THREE.MeshStandardMaterial({
    map: chevronTexture('#0b0b0d', '#ded7c8', 7),
    roughness: 0.32, metalness: 0.12, envMapIntensity: 0.9
  });
  const floor = floorMesh(R * 2.4, R * 2.4, floorMat);
  group.add(floor);

  // 帷幕环形墙 + 深色天花
  group.add(curtainRing(R, 8.4, PALETTE.velvet, 26));
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.25, 40),
    new THREE.MeshStandardMaterial({ color: 0x080405, roughness: 0.95 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 8.4;
  group.add(ceil);

  // 中央纪念台
  const dais = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.7, 0.22, 42),
    new THREE.MeshStandardMaterial({ color: 0x140b0e, roughness: 0.35, metalness: 0.3, envMapIntensity: 0.8 })
  );
  dais.position.y = 0.11;
  group.add(dais);

  const cone = lightCone(0.7, 3.1, 7.6, 0xf2e9dc, 0.055);
  cone.position.y = 4.2;
  group.add(cone);

  // 中央碑石（关于林奇 热点）
  const stele = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.9, 0.32),
    new THREE.MeshStandardMaterial({
      color: 0x191013, roughness: 0.25, metalness: 0.45,
      emissive: PALETTE.ivory, emissiveIntensity: 0.06, envMapIntensity: 1.1
    })
  );
  stele.position.y = 1.17;
  group.add(stele);
  hotspots.add(stele, {
    hint: 'E — 关于大卫·林奇（1946–2025）',
    onActivate: () => ui.showArtist()
  });

  // 悬浮标题霓虹
  const title = neonSign('SMOKE & VELVET', { color: '#d4243c', size: 1.15 });
  title.position.set(0, 6.7, 0);
  group.add(title);
  const sub = neonSign('DAVID LYNCH · 1946 — 2025', { color: '#3ec5ff', size: 0.4 });
  sub.position.set(0, 5.85, 0);
  group.add(sub);
  updaters.push((dt, t) => {
    title.rotation.y = t * 0.12;
    sub.rotation.y = t * 0.12;
    title.userData.flicker(t, 3);
  });

  // 五扇门
  const doors = [
    { id: 'archive', label: 'THE ARCHIVE', labelZh: '档 案 长 廊', color: '#c9a35c', angle: -Math.PI / 2 },
    { id: 'eraserhead', label: 'ERASERHEAD', labelZh: '橡 皮 头 · 1977', color: '#b8c4cf', angle: -Math.PI / 2 + (Math.PI * 2) / 5 },
    { id: 'bluevelvet', label: 'BLUE VELVET', labelZh: '蓝 丝 绒 · 1986', color: '#4f74ff', angle: -Math.PI / 2 + (Math.PI * 4) / 5 },
    { id: 'twinpeaks', label: 'TWIN PEAKS', labelZh: '双 峰 · 1990', color: '#3fae6a', angle: -Math.PI / 2 + (Math.PI * 6) / 5 },
    { id: 'mulholland', label: 'MULHOLLAND DR.', labelZh: '穆 赫 兰 道 · 2001', color: '#3ec5ff', angle: -Math.PI / 2 + (Math.PI * 8) / 5 }
  ];
  for (const d of doors) {
    const door = doorway({ label: d.label, labelZh: d.labelZh, color: d.color });
    const x = Math.cos(d.angle) * (R - 2.1);
    const z = Math.sin(d.angle) * (R - 2.1);
    door.position.set(x, 0, z);
    door.lookAt(0, 0, 0);
    group.add(door);
    updaters.push(door.userData.update);
    hotspots.add(door.userData.portal, {
      hint: `E — 进入 ${d.labelZh.replace(/\s/g, '')}`,
      onActivate: () => goTo(d.id)
    });
  }

  // 展签：创作方法
  const stand = standPlaque('捕捉大鱼', 'THE ART OF METHOD', '#c9a35c');
  stand.position.set(3.6, 0, 2.6);
  stand.rotation.y = -0.8;
  group.add(stand);
  hotspots.add(stand.userData.board, {
    hint: 'E — 阅读《捕捉大鱼：林奇的创作方法》',
    onActivate: () => ui.showEssay('method')
  });

  // 吊灯环 + 电灯颤动
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const bulb = hangingBulb(0xffd9b0, 2.6);
    bulb.position.set(Math.cos(a) * 7.4, 8.4, Math.sin(a) * 7.4);
    group.add(bulb);
    updaters.push(makeFlicker(bulb.userData.light, bulb.userData.bulb.material, 5, i * 3.1));
  }

  // 氛围: 地面烟雾 + 光尘
  const smoke = smokeLayer(70, { x: R * 2, z: R * 2 }, { opacity: 0.045, size: 10, yBase: 0.3, ySpread: 1.6 });
  group.add(smoke);
  updaters.push(smoke.userData.update);
  const dust = dustField(240, { x: R * 2, y: 7, z: R * 2 }, { opacity: 0.4 });
  group.add(dust);
  updaters.push(dust.userData.update);

  // 基础照明
  const amb = new THREE.AmbientLight(0x2a1214, 1.4);
  const center = new THREE.PointLight(0xffe4c8, 14, 26, 1.8);
  center.position.set(0, 6.9, 0);
  const rim = new THREE.PointLight(0x8f0e1e, 22, 40, 1.6);
  rim.position.set(0, 3.4, 0);
  group.add(amb, center, rim);

  return {
    group,
    spawn: { x: 0, z: 8.6, yaw: 0 },
    bounds: circleBounds(R - 2.4),
    update: (dt, t) => { for (const u of updaters) u(dt, t); }
  };
}
