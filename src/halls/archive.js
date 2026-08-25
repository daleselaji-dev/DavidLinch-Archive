// ============================================================
// 档案长廊 —— THE ARCHIVE 年表展厅
// 荧光灯长廊 + 按年代排列的作品灯牌 + 尽头纪念墙
// ============================================================
import * as THREE from 'three';
import { filmsSorted } from '../data/filmography.js';
import { quoteById } from '../data/essays.js';
import {
  canvasTexture, noiseCanvasTexture, floorMesh, doorway, archivePlaque,
  smokeLayer, dustField, standPlaque, quotePlaque, zoneTrigger, rectBounds
} from './kit.js';

export const meta = {
  id: 'archive',
  name: 'THE ARCHIVE · 档案长廊',
  ambience: 'archive',
  narration: 'archive',
  look: { saturation: 0.82, tint: 0xe8f0ff, fogColor: 0x05060a, fogDensity: 0.055, bg: 0x030407, exposure: 1.0, bloom: 0.75 }
};

const W = 9;
const L = 48;

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 地板: 深色拼木
  const floorTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#171310';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(${30 + Math.random() * 24}, ${22 + Math.random() * 16}, ${16 + Math.random() * 10}, 1)`;
      g.fillRect(0, i * (s / 8), s, s / 8 - 3);
    }
  }, 4, 22);
  group.add(floorMesh(W, L, new THREE.MeshStandardMaterial({
    map: floorTex, roughness: 0.4, metalness: 0.08, envMapIntensity: 0.7
  })));

  // 墙与天花
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x14100f, roughness: 0.85, bumpMap: noiseCanvasTexture(128, 128, 40, 8), bumpScale: 0.4
  });
  const mkWall = (w, h, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = ry;
    group.add(m);
  };
  mkWall(L, 5.4, -W / 2, 0, Math.PI / 2);
  mkWall(L, 5.4, W / 2, 0, -Math.PI / 2);
  mkWall(W, 5.4, 0, -L / 2, 0);
  mkWall(W, 5.4, 0, L / 2, Math.PI);
  const ceil = floorMesh(W, L, new THREE.MeshStandardMaterial({ color: 0x0b0809, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5.4;
  group.add(ceil);

  // 荧光灯管（顺序闪烁；彩蛋时逐管熄灭）
  const tubes = [];
  for (let i = 0; i < 7; i++) {
    const z = -L / 2 + 6 + i * 6;
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.06, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xdfe8ff, emissiveIntensity: 2.6, toneMapped: true })
    );
    tube.position.set(0, 5.32, z);
    const lp = new THREE.PointLight(0xdfe8ff, 9, 12, 1.7);
    lp.position.set(0, 4.9, z);
    group.add(tube, lp);
    tubes.push({ tube, lp, seed: i * 7.3, dead: 0 });
  }
  updaters.push((dt, t) => {
    for (const { tube, lp, seed, dead } of tubes) {
      const n = Math.sin(t * 11 + seed) * Math.sin(t * 4.7 + seed * 2.1);
      const f = (n > 0.93 ? 0.15 : 1) * (1 - dead);
      tube.material.emissiveIntensity = 2.6 * Math.max(0.02, f);
      lp.intensity = 9 * f;
    }
  });

  // 作品灯牌 —— 按年代沿两壁排布
  const films = filmsSorted();
  films.forEach((film, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -L / 2 + 7 + Math.floor(i / 2) * 5.6;
    const plaque = archivePlaque(film);
    plaque.position.set(side * (W / 2 - 0.28), 2.05, z);
    plaque.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(plaque);
    hotspots.add(plaque, {
      hint: `E — ${film.titleZh}（${film.year}）`,
      onActivate: () => ui.showFilm(film.id)
    });
    // 灯牌射灯
    const spot = new THREE.PointLight(0xfff0dd, 2.2, 4.5, 2);
    spot.position.set(side * (W / 2 - 1.1), 3.3, z);
    group.add(spot);
  });

  // 尽头纪念墙
  const wallTex = canvasTexture(1024, (g, s) => {
    g.fillStyle = '#0c0709';
    g.fillRect(0, 0, s, s);
    g.textAlign = 'center';
    g.fillStyle = '#f2e9dc';
    g.font = '400 96px Georgia, serif';
    g.fillText('DAVID LYNCH', s / 2, 300);
    g.fillStyle = '#c9a35c';
    g.font = '54px Georgia, serif';
    g.fillText('1946 — 2025', s / 2, 400);
    g.fillStyle = 'rgba(242,233,220,0.75)';
    g.font = '44px "Songti SC","SimSun",serif';
    g.fillText('愿 你 在 更 深 的 水 里', s / 2, 540);
    g.fillText('捕 到 最 大 的 鱼', s / 2, 620);
    g.strokeStyle = 'rgba(212,36,60,0.8)';
    g.lineWidth = 5;
    g.strokeRect(70, 130, s - 140, s - 300);
  });
  const memorial = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshStandardMaterial({
      map: wallTex, roughness: 0.6,
      emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 0.42
    })
  );
  memorial.position.set(0, 3, -L / 2 + 0.12);
  group.add(memorial);
  hotspots.add(memorial, {
    hint: 'E — 生平与荣誉',
    onActivate: () => ui.showArtist()
  });

  // 纪念墙前的"烛火"排
  for (let i = 0; i < 7; i++) {
    const x = -1.8 + i * 0.6;
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.8 })
    );
    candle.position.set(x, 0.6, -L / 2 + 1.3);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb45e, emissiveIntensity: 5 })
    );
    flame.position.set(x, 0.78, -L / 2 + 1.3);
    group.add(candle, flame);
    updaters.push((dt, t) => {
      flame.material.emissiveIntensity = 4.2 + Math.sin(t * 9 + i * 2.4) * 1.1 + Math.random() * 0.5;
    });
  }
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.46, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x120b0d, roughness: 0.5 })
  );
  table.position.set(0, 0.23, -L / 2 + 1.3);
  const memLight = new THREE.PointLight(0xffb45e, 7, 10, 1.8);
  memLight.position.set(0, 1.6, -L / 2 + 2);
  group.add(table, memLight);

  // 展签：数字转向
  const stand = standPlaque('轻的机器', 'THE DIGITAL TURN', '#3ec5ff');
  stand.position.set(2.6, 0, -L / 2 + 6);
  stand.rotation.y = -0.7;
  group.add(stand);
  hotspots.add(stand.userData.board, {
    hint: 'E — 阅读《轻的机器》',
    onActivate: () => ui.showEssay('digital')
  });

  // 引语展签（林奇原话）
  const q1 = quotePlaque(quoteById('voice'), '#c9a35c');
  q1.position.set(-2.8, 0, -L / 2 + 9);
  q1.rotation.y = 0.8;
  group.add(q1);
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showEssay('method')
  });

  // ---------- 彩蛋：不在年表上的心跳 ----------
  // 走到纪念墙跟前的人，会看见身后出现一块不存在的年代灯牌。
  const ghostTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#0c0709';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#d4243c';
    g.font = '400 120px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('20\u25a1\u25a1', s / 2, 168);
    g.fillStyle = '#f2e9dc';
    g.font = '400 44px Georgia, serif';
    g.fillText('THE UNSEEN ONE', s / 2, 268, s - 60);
    g.font = '36px "Songti SC","SimSun",serif';
    g.fillStyle = 'rgba(242,233,220,0.85)';
    g.fillText('未 被 看 见 的 那 部', s / 2, 336, s - 60);
    g.strokeStyle = '#d4243c';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(90, 388); g.lineTo(s - 90, 388);
    g.stroke();
    g.fillStyle = 'rgba(242,233,220,0.45)';
    g.font = '26px "Courier New", monospace';
    g.fillText('NOT IN THE TIMELINE', s / 2, 440);
  });
  const ghostPlaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 0.08),
    new THREE.MeshStandardMaterial({
      map: ghostTex, roughness: 0.55,
      emissive: 0xffffff, emissiveMap: ghostTex, emissiveIntensity: 0.7
    })
  );
  // 挂在走廊中段、平时没有灯牌的一段空墙上
  ghostPlaque.position.set(-(W / 2 - 0.28), 2.05, 8.2);
  ghostPlaque.rotation.y = Math.PI / 2;
  ghostPlaque.visible = false;
  group.add(ghostPlaque);

  let ghostTimers = [];
  const ghostState = { active: false };
  const showGhost = () => {
    if (ghostState.active) return;
    ghostState.active = true;
    for (const id of ghostTimers) clearTimeout(id);
    ghostTimers = [];
    audio.duck(1.0, 0.05, 2.0);
    // 灯管从远到近逐管熄灭
    tubes.forEach((tb, i) => {
      ghostTimers.push(setTimeout(() => {
        tb.dead = 1;
        audio.sfx('fluor', 0.5);
      }, i * 190));
    });
    ghostTimers.push(setTimeout(() => {
      ghostPlaque.visible = true;
      audio.sfx('whisper', 0.8);
      ui.caption('身后的墙上，多了一块灯牌。刚才那里什么都没有。', 5600);
    }, 1500));
    // 灯管逐一回魂
    tubes.forEach((tb, i) => {
      ghostTimers.push(setTimeout(() => { tb.dead = 0; }, 3400 + i * 160));
    });
  };
  const ghostTrig = zoneTrigger({ x: 0, z: -L / 2 + 3.2, r: 2.6 }, showGhost, { cooldown: 50 });
  updaters.push((dt) => ghostTrig.update(player, dt));
  // 第二段：走近它，它就熄灭消失
  const vanishTrig = zoneTrigger({ x: -(W / 2 - 1.6), z: 8.2, r: 2.2 }, () => {
    if (!ghostPlaque.visible) return;
    ghostPlaque.visible = false;
    ghostState.active = false;
    audio.sfx('fluor', 0.9);
    audio.sfx('thud', 0.5);
    ui.caption('灯牌熄灭了。年表恢复了整齐。有些作品只放映给黑暗看。', 6000);
  }, { cooldown: 8 });
  updaters.push((dt) => vanishTrig.update(player, dt));

  // 回大厅之门
  const back = doorway({ label: 'THE FOYER', labelZh: '回 大 厅', color: '#d4243c', height: 3.2 });
  back.position.set(0, 0, L / 2 - 0.6);
  back.rotation.y = Math.PI;
  group.add(back);
  updaters.push(back.userData.update);
  hotspots.add(back.userData.portal, { hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  // 氛围
  const smoke = smokeLayer(46, { x: W, z: L }, { opacity: 0.03, size: 7, yBase: 0.2, ySpread: 1 });
  group.add(smoke);
  updaters.push(smoke.userData.update);
  const dust = dustField(200, { x: W, y: 5, z: L }, { opacity: 0.32, size: 0.04 });
  group.add(dust);
  updaters.push(dust.userData.update);
  group.add(new THREE.AmbientLight(0x1c2026, 1.1));

  return {
    group,
    spawn: { x: 0, z: L / 2 - 4, yaw: 0 },
    bounds: rectBounds(-W / 2 + 1, W / 2 - 1, -L / 2 + 1.9, L / 2 - 1.6),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'ghost-plaque': ghostTrig }
  };
}
