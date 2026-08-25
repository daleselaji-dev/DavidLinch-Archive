// ============================================================
// 总览大厅 —— THE VELVET FOYER 天鹅绒大厅
// 红天鹅绒环形围合（带帷头层）+ 黑白折线地板 + 鎏金地圈 +
// 立柱环 + 六扇门 + 中央纪念台。文字极少：一块引语展签。
// ============================================================
import * as THREE from 'three';
import {
  PALETTE, chevronTexture, curtainRing, floorMesh, neonSign, doorway,
  smokeLayer, dustField, lightCone, hangingBulb, makeFlicker,
  quotePlaque, vitrine, zoneTrigger, circleBounds,
  column, mergedMesh, xform, brushedMetalTexture
} from './kit.js';
import { quoteById } from '../data/essays.js';

export const meta = {
  id: 'lobby',
  name: 'THE VELVET FOYER · 天鹅绒大厅',
  ambience: 'lobby',
  narration: 'lobby',
  look: { saturation: 1.04, tint: 0xfff4ee, fogColor: 0x0a0406, fogDensity: 0.05, bg: 0x080304, exposure: 1.05, bloom: 0.9 }
};

const R = 14.5;

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 地板 —— 黑白折线 + 鎏金环形镶边
  const floorMat = new THREE.MeshStandardMaterial({
    map: chevronTexture('#0b0b0d', '#ded7c8', 7),
    roughness: 0.32, metalness: 0.12, envMapIntensity: 0.9
  });
  const floor = floorMesh(R * 2.4, R * 2.4, floorMat);
  group.add(floor);
  const goldMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.3, metalness: 0.95, envMapIntensity: 1.3
  });
  const ringOuter = new THREE.Mesh(new THREE.RingGeometry(R - 3.4, R - 3.15, 72), goldMat);
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.y = 0.006;
  const ringInner = new THREE.Mesh(new THREE.RingGeometry(2.85, 3.02, 56), goldMat);
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.y = 0.006;
  group.add(ringOuter, ringInner);

  // 帷幕环形墙 + 帷头层 + 深色天花与线脚
  group.add(curtainRing(R, 8.4, PALETTE.velvet, 26));
  const valance = curtainRing(R - 0.12, 1.35, 0xa8142a, 30);
  valance.position.y = 7.25;
  group.add(valance);
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.25, 40),
    new THREE.MeshStandardMaterial({ color: 0x080405, roughness: 0.95 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 8.4;
  group.add(ceil);
  // 天花中央线脚（环形叠级）
  const rosette = mergedMesh([
    xform(new THREE.TorusGeometry(3.2, 0.09, 10, 48), 0, 8.3, 0, Math.PI / 2, 0, 0),
    xform(new THREE.TorusGeometry(2.2, 0.07, 10, 40), 0, 8.24, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.5, 0.65, 0.3, 20), 0, 8.24, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x1c0e12, roughness: 0.5, metalness: 0.4, envMapIntensity: 0.8 }));
  group.add(rosette);

  // 立柱环（门与门之间）
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + Math.PI / 6 + (k * Math.PI) / 3;
    const col = column(8.4, 0.3, 0x1a1013);
    col.position.set(Math.cos(a) * (R - 0.9), 0, Math.sin(a) * (R - 0.9));
    group.add(col);
  }

  // 中央纪念台（叠级 + 鎏金沿）
  const daisMat = new THREE.MeshStandardMaterial({ color: 0x140b0e, roughness: 0.35, metalness: 0.3, envMapIntensity: 0.8 });
  const dais = mergedMesh([
    xform(new THREE.CylinderGeometry(2.7, 2.85, 0.12, 48), 0, 0.06, 0),
    xform(new THREE.CylinderGeometry(2.45, 2.6, 0.12, 48), 0, 0.18, 0)
  ], daisMat);
  group.add(dais);
  const daisTrim = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.025, 8, 56), goldMat);
  daisTrim.rotation.x = Math.PI / 2;
  daisTrim.position.y = 0.24;
  group.add(daisTrim);

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
  stele.position.y = 1.29;
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

  // 六扇门
  const doors = [
    { id: 'archive', label: 'THE ARCHIVE', labelZh: '档 案 长 廊', color: '#c9a35c', angle: -Math.PI / 2 },
    { id: 'eraserhead', label: 'ERASERHEAD', labelZh: '橡 皮 头 · 1977', color: '#b8c4cf', angle: -Math.PI / 2 + (Math.PI * 2) / 6 },
    { id: 'bluevelvet', label: 'BLUE VELVET', labelZh: '蓝 丝 绒 · 1986', color: '#4f74ff', angle: -Math.PI / 2 + (Math.PI * 4) / 6 },
    { id: 'studio', label: 'HIS ROOM', labelZh: '林 奇 的 房 间', color: '#ffb25e', angle: -Math.PI / 2 + (Math.PI * 6) / 6 },
    { id: 'twinpeaks', label: 'TWIN PEAKS', labelZh: '双 峰 · 1990', color: '#3fae6a', angle: -Math.PI / 2 + (Math.PI * 8) / 6 },
    { id: 'mulholland', label: 'MULHOLLAND DR.', labelZh: '穆 赫 兰 道 · 2001', color: '#3ec5ff', angle: -Math.PI / 2 + (Math.PI * 10) / 6 }
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

  // 吊灯环 + 电灯颤动
  const bulbs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const bulb = hangingBulb(0xffd9b0, 2.6);
    bulb.position.set(Math.cos(a) * 7.4, 8.4, Math.sin(a) * 7.4);
    group.add(bulb);
    bulbs.push(bulb);
    updaters.push(makeFlicker(bulb.userData.light, bulb.userData.bulb.material, 5, i * 3.1));
  }

  // ---------- 彩蛋：帷幕后的窃语 ----------
  const eggLight = new THREE.PointLight(0xd4243c, 0, 18, 1.5);
  eggLight.position.set(0, 2.4, -R + 1.2);
  group.add(eggLight);
  const blackout = { v: 0 };
  updaters.push(() => {
    if (blackout.v > 0) {
      for (const b of bulbs) {
        b.userData.light.intensity *= (1 - blackout.v);
        b.userData.bulb.material.emissiveIntensity *= (1 - blackout.v);
      }
    }
  });
  let eggTimers = [];
  const whisperEgg = () => {
    for (const id of eggTimers) clearTimeout(id);
    eggTimers = [];
    blackout.v = 1;
    audio.duck(1.4, 0.03, 2.2);
    audio.sfx('whisper', 0.9);
    eggTimers.push(setTimeout(() => {
      eggLight.intensity = 26;
      audio.sfx('thud', 0.8);
    }, 900));
    eggTimers.push(setTimeout(() => {
      ui.caption('帷幕在你背后合拢了一次。', 4600);
    }, 1500));
    eggTimers.push(setTimeout(() => {
      blackout.v = 0;
      eggLight.intensity = 0;
      audio.sfx('chime', 0.4);
    }, 3400));
  };
  const whisperTrig = zoneTrigger({ x: 0, z: -10.6, r: 2.4 }, whisperEgg, { cooldown: 40 });
  updaters.push((dt) => whisperTrig.update(player, dt));

  // 展柜：一卷空白胶片
  const reelCase = vitrine('空白胶片', 'THE UNMADE FILM', '#c9a35c');
  reelCase.position.set(-3.8, 0, 3.0);
  reelCase.rotation.y = 0.9;
  group.add(reelCase);
  const reelMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a8f96, roughness: 0.25, metalness: 0.9, envMapIntensity: 1.3
  });
  const reel = new THREE.Group();
  const reelDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 28), reelMat);
  reelDisc.rotation.x = Math.PI / 2;
  const reelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), reelMat);
  reelHub.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 14), reelMat);
    const a = (i / 4) * Math.PI * 2;
    hole.position.set(Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0);
    reel.add(hole);
  }
  reel.add(reelDisc, reelHub);
  reel.position.y = 0.12;
  reelCase.userData.slot.add(reel);
  updaters.push((dt, t) => { reel.rotation.z = t * 0.4; });
  hotspots.add(reelCase.userData.label, {
    hint: 'E — 那部没来得及拍的电影',
    onActivate: () => {
      audio.sfx('chime');
      ui.caption('一卷空白胶片。深水里还有没捞上来的鱼。', 4600);
    }
  });

  // 引语展签（本厅唯一文字展签）
  const q1 = quotePlaque(quoteById('meaning'), '#c9a35c');
  q1.position.set(-4.4, 0, -2.4);
  q1.rotation.y = 1.9;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

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
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'curtain-whisper': whisperTrig }
  };
}
