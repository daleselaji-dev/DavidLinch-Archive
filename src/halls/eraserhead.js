// ============================================================
// 《橡皮头》展厅 —— INDUSTRIAL LULLABY 工业摇篮曲
// 近单色的机器房 + 西侧锅炉房分区：
// 法兰管道 / 铆钉锅炉 / 检修步道 / 压力表 / 蒸汽 / 铁笼灯
// ============================================================
import * as THREE from 'three';
import {
  canvasTexture, noiseCanvasTexture, floorMesh, doorway,
  smokeLayer, dustField, quoteStand, quoteStandUpdater, vitrine, darkFigure,
  zoneTrigger, makeFlicker, multiRectBounds,
  mergedMesh, xform, roundedBoxMesh, roundedBoxGeo, brushedMetalTexture,
  concreteMat, brickMat, hangingBulb, rustMat, rng, woodMat, brassMat
} from './kit.js';
import { propMats, fireboxDoor, valveWheel, fuseBox, pipeRail } from './props.js';
import { quoteById, DOCENT } from '../data/essays.js';

export const meta = {
  id: 'eraserhead',
  name: 'ERASERHEAD · 工业摇篮曲 (1977)',
  ambience: 'eraserhead',
  narration: 'eraserhead',
  space: 'tiled',
  floorSfx: 'concrete',
  look: {
    saturation: 0.09, tint: 0xe9edf2, fogColor: 0x050507, fogDensity: 0.052,
    bg: 0x030304, exposure: 0.88, bloom: 0.62,
    // v1.4 P4/P5：单色厅——冷灰暗部微抬 + 冷高光，halation 收敛（工业白光的乳晕）
    halation: 0.1,
    grade: { lift: [0.01, 0.011, 0.014], gamma: [1.02, 1.02, 1.02], gain: [0.98, 1.0, 1.03] },
    // v1.9 B1：工业厅呼吸最急最深（26s，±14%——像机器的喘息）
    fogPulse: { period: 26, depth: 0.14 }
  }
};

const S = 17; // 主房间边长
const MAIN = { minX: -S / 2 + 1.1, maxX: S / 2 - 1.1, minZ: -S / 2 + 1.6, maxZ: S / 2 - 1.4 };
const ANNEX = { minX: -S / 2 - 6.2, maxX: -S / 2 + 1.2, minZ: -2.6, maxZ: 2.6 }; // 锅炉房

export function build(ctx) {
  const { hotspots, ui, goTo, audio, player } = ctx;
  const group = new THREE.Group();
  const updaters = [];

  // 污渍水泥地（v1.3 三通道：伸缩缝法线 + 污渍粗糙度）
  const M = propMats();
  const floorConcrete = concreteMat({ base: [40, 40, 42], seed: 13, repX: 3, repY: 3, env: 0.6 });
  group.add(floorMesh(S, S, floorConcrete));

  // ---------- 地面细节：铸铁地漏 + 油渍（大片水泥不能是干净的一整块） ----------
  const drain = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.55, metalness: 0.7 });
  const drainRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 28), ironMat);
  drainRing.rotation.x = -Math.PI / 2;
  drainRing.position.y = 0.012;
  drain.add(drainRing);
  // 平行格栅条（弦长随位置收短，嵌进外环）
  const drainBars = [];
  for (let i = -3; i <= 3; i++) {
    const half = Math.sqrt(Math.max(0.3 ** 2 - (i * 0.085) ** 2, 0.015));
    drainBars.push(xform(new THREE.BoxGeometry(0.045, 0.02, half * 2), i * 0.085, 0.01, 0));
  }
  drain.add(mergedMesh(drainBars, ironMat));
  // 格栅缝下的黑
  const drainPit = new THREE.Mesh(new THREE.CircleGeometry(0.31, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000 }));
  drainPit.rotation.x = -Math.PI / 2;
  drainPit.position.y = 0.004;
  drain.add(drainPit);
  // 周围一圈洇湿渍（径向渐变 alpha，低粗糙度＝湿反光）
  const wetTex = canvasTexture(128, (g, s) => {
    const rg = g.createRadialGradient(s / 2, s / 2, s * 0.08, s / 2, s / 2, s * 0.5);
    rg.addColorStop(0, 'rgba(8,10,12,0.8)');
    rg.addColorStop(0.55, 'rgba(10,12,14,0.42)');
    rg.addColorStop(1, 'rgba(10,12,14,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
  });
  const wetRing = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 26),
    new THREE.MeshStandardMaterial({
      map: wetTex, transparent: true, depthWrite: false,
      roughness: 0.14, envMapIntensity: 1.2,
      polygonOffset: true, polygonOffsetFactor: -1
    })
  );
  wetRing.rotation.x = -Math.PI / 2;
  wetRing.position.y = 0.006;
  drain.add(wetRing);
  drain.position.set(1.4, 0, 1.2);
  group.add(drain);
  hotspots.add(drainRing, {
    hint: 'E — 地漏',
    onActivate: () => {
      audio.sfxAt('gurgle', 1.4, 1.2, 0.85, 4);
      ui.caption('楼下还有楼下。', 3600);
    }
  });
  // 油渍两片（可复现随机泼溅轮廓；比水渍更黑更油亮）
  const stainMesh = (seed, radius) => {
    const r = rng(seed);
    const tex = canvasTexture(128, (g, s) => {
      g.fillStyle = 'rgba(0,0,0,0)';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2;
        const d = r() * s * 0.3;
        const br = s * (0.05 + r() * 0.16);
        const rg = g.createRadialGradient(
          s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, br * 0.2,
          s / 2 + Math.cos(a) * d, s / 2 + Math.sin(a) * d, br
        );
        rg.addColorStop(0, 'rgba(6,7,8,0.72)');
        rg.addColorStop(1, 'rgba(6,7,8,0)');
        g.fillStyle = rg;
        g.fillRect(0, 0, s, s);
      }
    });
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 22),
      new THREE.MeshStandardMaterial({
        map: tex, transparent: true, depthWrite: false,
        roughness: 0.22, envMapIntensity: 0.9,
        polygonOffset: true, polygonOffsetFactor: -1
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.007;
    return m;
  };
  const stainA = stainMesh(41, 1.35);
  stainA.position.set(-2.9, 0.007, -3.2); // 大机器脚下渗出
  const stainB = stainMesh(87, 0.95);
  stainB.position.set(3.4, 0.007, -5.0);  // 北墙管道下方滴痕
  group.add(stainA, stainB);

  // 砖墙（v1.3 三通道：砖缝法线 + 逐砖粗糙度；西墙留出锅炉房门洞）
  const wallMat = brickMat({ tint: [36, 34, 38], seed: 11, repX: 4, repY: 2 });
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

  // v1.4 二遍：天花滴水两处——水珠在管底积大 → 坠落 → 触地涟漪一圈 + drip 声。
  // 一处正对地漏（工厂在自己漏水），一处落在东南角自己洇出的湿渍上
  const dripMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fb2c0, roughness: 0.05, transparent: true, opacity: 0.75, envMapIntensity: 1.5
  });
  const mkWet = (r2, x, z) => {
    const wet = new THREE.Mesh(
      new THREE.CircleGeometry(r2, 22),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(64, (g, s) => {
          const rg2 = g.createRadialGradient(s / 2, s / 2, s * 0.06, s / 2, s / 2, s * 0.5);
          rg2.addColorStop(0, 'rgba(8,10,12,0.7)');
          rg2.addColorStop(1, 'rgba(10,12,14,0)');
          g.fillStyle = rg2;
          g.fillRect(0, 0, s, s);
        }),
        transparent: true, depthWrite: false, roughness: 0.13, envMapIntensity: 1.2,
        polygonOffset: true, polygonOffsetFactor: -1
      })
    );
    wet.rotation.x = -Math.PI / 2;
    wet.position.set(x, 0.007, z);
    group.add(wet);
  };
  mkWet(0.6, 5.6, 5.4);
  const drips = [
    { x: 1.4, z: 1.2, y0: H - 0.35, phase: 0.6, period: 4.1 },
    { x: 5.6, z: 5.4, y0: H - 0.35, phase: 2.3, period: 5.7 }
  ].map((d) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), dripMat);
    drop.visible = false;
    group.add(drop);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.62, 20),
      new THREE.MeshBasicMaterial({ color: 0x7e929f, transparent: true, opacity: 0, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(d.x, 0.012, d.z);
    ring.scale.setScalar(0.06);
    group.add(ring);
    return { ...d, drop, ring, ripple: -1 };
  });
  updaters.push((dt) => {
    for (const d of drips) {
      d.phase += dt;
      const hang = d.period - Math.sqrt(2 * (d.y0 - 0.02) / 9.8) - 0.9;
      if (d.phase < hang) {
        // 悬珠积大（略拉长成泪滴）
        d.drop.visible = true;
        const k = d.phase / hang;
        d.drop.scale.set(0.45 + k * 0.55, (0.45 + k * 0.55) * 1.55, 0.45 + k * 0.55);
        d.drop.position.set(d.x, d.y0 - 0.015, d.z);
      } else if (d.ripple < 0) {
        const tf = d.phase - hang;
        const y = d.y0 - 4.9 * tf * tf;
        if (y <= 0.03) {
          d.ripple = 0;
          d.drop.visible = false;
          audio.sfxAt('drip', d.x, d.z, 0.55, 5);
        } else {
          d.drop.scale.set(0.9, 1.7, 0.9);
          d.drop.position.set(d.x, y, d.z);
        }
      }
      if (d.ripple >= 0) {
        d.ripple += dt;
        const k = d.ripple / 0.9;
        if (k >= 1) {
          d.ripple = -1;
          d.phase = 0;
        } else {
          d.ring.scale.setScalar(0.06 + k * 1.05);
          d.ring.material.opacity = 0.42 * (1 - k);
        }
      }
    }
  });

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

  // 管线阀牌（v1.9 件 2）：y1.7 管上五枚黄铜圆牌挂链垂下——钢印编号
  // 7 / 12 / 19 / 4，第四枚是空白的。牌子跟着这栋楼的震动常年微晃。
  // E 空白那枚 → 五枚连锁摆起来 + 号牌串响 +「没编号的这一路，还热着。」
  const TAG_Y = 1.7;
  const TAG_Z = -S / 2 + 0.35;
  const tagDefs = [
    { x: 0.8, num: '7' }, { x: 1.6, num: '12' }, { x: 2.5, num: '19' },
    { x: 3.3, num: '' }, { x: 4.2, num: '4' }
  ];
  const tagStates = [];
  let blankDisc = null;
  for (let ti = 0; ti < tagDefs.length; ti++) {
    const { x, num } = tagDefs[ti];
    const tag = new THREE.Group();
    // 挂环绕管 + 三节小链（相对枢轴 = 管轴心）
    tag.add(mergedMesh([
      xform(new THREE.TorusGeometry(0.105, 0.006, 6, 14), 0, 0, 0, 0, Math.PI / 2, 0),
      xform(new THREE.TorusGeometry(0.016, 0.0045, 6, 10), 0, -0.118, 0, Math.PI / 2, 0, 0),
      xform(new THREE.TorusGeometry(0.016, 0.0045, 6, 10), 0, -0.144, 0, 0, Math.PI / 2, 0),
      xform(new THREE.TorusGeometry(0.016, 0.0045, 6, 10), 0, -0.17, 0, Math.PI / 2, 0, 0)
    ], pipeMat));
    const tagTex = canvasTexture(64, (g, s) => {
      const r = rng(ti * 7 + 3);
      g.fillStyle = '#cabf9e';
      g.fillRect(0, 0, s, s);
      // 边缘氧化黯圈 + 划痕
      g.strokeStyle = 'rgba(70,54,26,0.45)';
      g.lineWidth = 5;
      g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(60,48,26,0.3)';
      g.lineWidth = 0.7;
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.moveTo(r() * s, r() * s);
        g.lineTo(r() * s, r() * s);
        g.stroke();
      }
      // 穿链孔
      g.fillStyle = 'rgba(20,16,10,0.9)';
      g.beginPath(); g.arc(s / 2, 10, 3.4, 0, 7); g.fill();
      // 钢印编号（空白牌只留一块更深的氧化云——像被摘掉过什么）
      if (num) {
        g.fillStyle = 'rgba(44,34,16,0.88)';
        g.font = 'bold 26px monospace';
        g.textAlign = 'center';
        g.fillText(num, s / 2, s / 2 + 12);
      } else {
        const grad = g.createRadialGradient(s / 2, s / 2 + 6, 2, s / 2, s / 2 + 6, 16);
        grad.addColorStop(0, 'rgba(84,64,30,0.5)');
        grad.addColorStop(1, 'rgba(84,64,30,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, s, s);
      }
    });
    // 圆柱端盖 UV 与竖挂朝向差 90°——旋转贴图对正钢印
    tagTex.center.set(0.5, 0.5);
    tagTex.rotation = Math.PI / 2;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.006, 16),
      new THREE.MeshStandardMaterial({
        map: tagTex, color: num ? 0xc9ae6a : 0xa08648, roughness: 0.38, metalness: 0.85, envMapIntensity: 1.1
      })
    );
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, -0.225, 0);
    tag.add(disc);
    if (!num) blankDisc = disc;
    tag.position.set(x, TAG_Y, TAG_Z);
    group.add(tag);
    tagStates.push({ tag, phase: ti * 1.7, rate: 1.05 + ti * 0.14, jolt: 0 });
  }
  updaters.push((dt, t) => {
    for (const ts of tagStates) {
      if (ts.jolt > 0) ts.jolt = Math.max(0, ts.jolt - dt * 0.55);
      // 常年微晃（机器震动传上来）+ 触发时的连锁大摆（衰减正弦）
      ts.tag.rotation.x = Math.sin(t * ts.rate + ts.phase) * 0.035 +
        ts.jolt * Math.sin((1 - ts.jolt) * 14 + ts.phase) * 0.55 * ts.jolt;
    }
  });
  hotspots.add(blankDisc, {
    hint: 'E — 空白的阀牌',
    onActivate: () => {
      for (let i = 0; i < tagStates.length; i++) {
        setTimeout(() => { tagStates[i].jolt = 1; }, Math.abs(i - 3) * 90);
      }
      audio.sfxAt('jostle', 3.3, TAG_Z, 0.55, 3);
      setTimeout(() => ui.caption('没编号的这一路，还热着。', 3600), 800);
    }
  });

  // 大机器 v2 —— 真曲柄连杆机构（v1.4 P3 英雄资产）：
  // 飞轮（轮辋+六辐+轮毂+曲柄销+扇形配重）→ 连杆 → 十字头（双导轨）→ 活塞杆
  // → 立式汽缸（法兰/缸盖螺栓/填料函，铸铁立柱承托）；
  // 顶置天轴皮带把"动力从天花板传下来"——传动链每一环都可读（装配感）
  const machine = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(256, 92, 40), color: 0x303036, roughness: 0.5, metalness: 0.72, envMapIntensity: 0.8
  });
  const body = roundedBoxMesh(3.4, 2.2, 1.8, 0.12, bodyMat);
  body.position.y = 1.24;
  // 锈蚀底橇：机器坐在槽钢框上（rustSet 五通道），不再直接长在地里
  const skidMat = rustMat({ seed: 77, rust: 0.62, repX: 2, repY: 1 });
  machine.add(mergedMesh([
    xform(new THREE.BoxGeometry(4.0, 0.18, 0.34), 0, 0.09, 0.75),
    xform(new THREE.BoxGeometry(4.0, 0.18, 0.34), 0, 0.09, -0.75),
    xform(new THREE.BoxGeometry(0.34, 0.18, 1.32), -1.8, 0.09, 0),
    xform(new THREE.BoxGeometry(0.34, 0.18, 1.32), 1.8, 0.09, 0)
  ], skidMat));
  // 地脚螺栓板 ×4（每块两颗六角头）
  const padGeos = [];
  for (const [px, pz] of [[-1.9, 0.75], [1.9, 0.75], [-1.9, -0.75], [1.9, -0.75]]) {
    padGeos.push(xform(new THREE.BoxGeometry(0.3, 0.05, 0.44), px, 0.025, pz));
    padGeos.push(xform(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 6), px, 0.06, pz - 0.14));
    padGeos.push(xform(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 6), px, 0.06, pz + 0.14));
  }
  machine.add(mergedMesh(padGeos, pipeMat));
  // 铆钉排（合并）
  const rivetGeo = new THREE.SphereGeometry(0.035, 6, 5);
  const rivetGeos = [];
  for (let i = 0; i < 10; i++) {
    rivetGeos.push(xform(rivetGeo, -1.5 + i * 0.33, 2.28, 0.91));
    rivetGeos.push(xform(rivetGeo, -1.5 + i * 0.33, 0.26, 0.91));
  }
  rivetGeo.dispose();
  machine.add(mergedMesh(rivetGeos, pipeMat));
  // ---- 飞轮 v2（整组绕轴自转；曲柄销带出连杆） ----
  const flyGroup = new THREE.Group();
  flyGroup.position.set(1.95, 1.35, 0);
  flyGroup.rotation.y = Math.PI / 2;
  const wheelSpin = new THREE.Group();
  const flyGeos = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    flyGeos.push(xform(new THREE.CylinderGeometry(0.042, 0.058, 0.84, 8),
      Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0, 0, 0, a - Math.PI / 2));
  }
  flyGeos.push(xform(new THREE.TorusGeometry(0.95, 0.13, 12, 36), 0, 0, 0));
  flyGeos.push(xform(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14), 0, 0, 0.1, Math.PI / 2, 0, 0));
  // 扇形配重（曲柄销对侧的月牙铁——真机器为平衡往复质量都长这个）
  flyGeos.push(xform(new THREE.TorusGeometry(0.62, 0.095, 8, 14, 1.5), 0, 0, 0.02, 0, 0, Math.PI - 0.75));
  // 曲柄销 + 销座
  flyGeos.push(xform(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), 0.42, 0, 0.06, Math.PI / 2, 0, 0));
  flyGeos.push(xform(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 10), 0.42, 0, 0.18, Math.PI / 2, 0, 0));
  // 皮带轮（与飞轮同轴同转）+ 双侧挡边
  flyGeos.push(xform(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 18), 0, 0, 0.34, Math.PI / 2, 0, 0));
  flyGeos.push(xform(new THREE.CylinderGeometry(0.335, 0.335, 0.02, 18), 0, 0, 0.3, Math.PI / 2, 0, 0));
  flyGeos.push(xform(new THREE.CylinderGeometry(0.335, 0.335, 0.02, 18), 0, 0, 0.38, Math.PI / 2, 0, 0));
  wheelSpin.add(mergedMesh(flyGeos, pipeMat));
  flyGroup.add(wheelSpin);
  machine.add(flyGroup);
  // ---- 十字头 + 活塞杆（沿导轨往复） ----
  const crosshead = new THREE.Group();
  crosshead.add(mergedMesh([
    roundedBoxGeo(0.2, 0.26, 0.13, 0.03),
    xform(new THREE.CylinderGeometry(0.032, 0.032, 1.25, 10), 0, 0.66, 0)
  ], pipeMat));
  crosshead.position.x = 2.13;
  machine.add(crosshead);
  // ---- 连杆（小端挂十字头销，大端追曲柄销摆动） ----
  const rodPivot = new THREE.Group();
  rodPivot.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.034, 0.05, 1.0, 10), 0, -0.5, 0),
    xform(new THREE.CylinderGeometry(0.078, 0.078, 0.1, 12), 0, -1.0, 0, Math.PI / 2, 0, 0),
    xform(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 10), 0, 0, 0, Math.PI / 2, 0, 0)
  ], pipeMat));
  rodPivot.position.x = 2.13;
  machine.add(rodPivot);
  // ---- 导轨 + 铸铁立柱 + 立式汽缸（静件合并单 mesh） ----
  machine.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.024, 0.024, 1.24, 8), 2.13, 2.36, 0.15),
    xform(new THREE.CylinderGeometry(0.024, 0.024, 1.24, 8), 2.13, 2.36, -0.15),
    xform(new THREE.BoxGeometry(0.62, 0.07, 0.42), 2.42, 1.72, 0),
    xform(new THREE.BoxGeometry(0.62, 0.07, 0.42), 2.42, 2.98, 0),
    xform(roundedBoxGeo(0.26, 3.05, 0.34, 0.05), 2.62, 1.53, 0),
    xform(new THREE.BoxGeometry(0.46, 0.1, 0.52), 2.62, 0.05, 0),
    xform(new THREE.BoxGeometry(0.62, 0.14, 0.3), 2.38, 3.06, 0),
    // 立式汽缸：底法兰 / 缸体 / 顶盖 / 填料函
    xform(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), 2.13, 3.16, 0),
    xform(new THREE.CylinderGeometry(0.24, 0.24, 1.2, 16), 2.13, 3.78, 0),
    xform(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), 2.13, 4.42, 0),
    xform(new THREE.CylinderGeometry(0.085, 0.085, 0.22, 10), 2.13, 3.05, 0),
    // 顶盖螺栓 ×6
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return xform(new THREE.CylinderGeometry(0.024, 0.024, 0.07, 6),
        2.13 + Math.cos(a) * 0.26, 4.5, Math.sin(a) * 0.26);
    })
  ], bodyMat));
  // ---- 顶置天轴皮带传动：吊架/天轴/从动轮（静）+ 皮带 + 接缝块（巡回的运动锚点） ----
  machine.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 10), 2.25, 5.15, 0, 0, 0, Math.PI / 2),
    xform(new THREE.BoxGeometry(0.07, 0.45, 0.07), 1.55, 5.38, 0),
    xform(new THREE.BoxGeometry(0.07, 0.45, 0.07), 2.95, 5.38, 0),
    xform(new THREE.BoxGeometry(0.2, 0.05, 0.2), 1.55, 5.58, 0),
    xform(new THREE.BoxGeometry(0.2, 0.05, 0.2), 2.95, 5.58, 0),
    xform(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 18), 2.29, 5.15, 0, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.335, 0.335, 0.02, 18), 2.235, 5.15, 0, 0, 0, Math.PI / 2),
    xform(new THREE.CylinderGeometry(0.335, 0.335, 0.02, 18), 2.345, 5.15, 0, 0, 0, Math.PI / 2)
  ], pipeMat));
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 0.92, metalness: 0.05 });
  const wrapTop = new THREE.TorusGeometry(0.3, 0.028, 5, 18, Math.PI);
  wrapTop.scale(1, 1, 2.2);
  const wrapBot = new THREE.TorusGeometry(0.3, 0.028, 5, 18, Math.PI);
  wrapBot.scale(1, 1, 2.2);
  machine.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.1, 3.8, 0.024), 2.29, 3.25, 0.3),
    xform(new THREE.BoxGeometry(0.1, 3.8, 0.024), 2.29, 3.25, -0.3),
    xform(wrapTop, 2.29, 5.15, 0, 0, Math.PI / 2, 0),
    xform(wrapBot, 2.29, 1.35, 0, 0, Math.PI / 2, Math.PI)
  ], beltMat));
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.032), pipeMat);
  machine.add(seam);
  // ---- 飞轮护栏（半圈弯管 + 双立柱；可敲——机器会打个嗝） ----
  const guard = mergedMesh([
    xform(new THREE.TorusGeometry(1.24, 0.028, 6, 24, Math.PI + 0.4), 1.95, 1.35, 0, 0, Math.PI / 2, -0.2),
    xform(new THREE.CylinderGeometry(0.028, 0.028, 1.12, 8), 1.95, 0.56, 1.216),
    xform(new THREE.CylinderGeometry(0.028, 0.028, 1.12, 8), 1.95, 0.56, -1.216)
  ], pipeMat);
  machine.add(guard);
  machine.add(body);
  machine.position.set(-4.6, 0, -4.9);
  machine.rotation.y = 0.5;
  group.add(machine);
  // 曲柄连杆运动学：R=曲柄半径，L=连杆长；十字头 y = pinY + √(L²−pinZ²)
  const machineState = { run: 1, angle: 0 };
  const CRANK_R = 0.42;
  const ROD_L = 1.0;
  let seamD = 0;
  const beltPath = (d) => {
    const runL = 3.8;
    const r = 0.3;
    const P = 2 * runL + 2 * Math.PI * r;
    d = ((d % P) + P) % P;
    if (d < runL) return [1.35 + d, 0.3];
    d -= runL;
    if (d < Math.PI * r) return [5.15 + Math.sin(d / r) * r, Math.cos(d / r) * 0.3];
    d -= Math.PI * r;
    if (d < runL) return [5.15 - d, -0.3];
    d -= runL;
    return [1.35 - Math.sin(d / r) * r, -Math.cos(d / r) * 0.3];
  };
  updaters.push((dt) => {
    machineState.angle += dt * 1.7 * machineState.run;
    const th = machineState.angle;
    wheelSpin.rotation.z = th;
    const pinY = 1.35 + Math.sin(th) * CRANK_R;
    const pinZ = -Math.cos(th) * CRANK_R;
    const slide = Math.sqrt(ROD_L * ROD_L - pinZ * pinZ);
    crosshead.position.y = pinY + slide;
    rodPivot.position.y = pinY + slide;
    rodPivot.rotation.x = Math.atan2(-pinZ, slide);
    seamD += dt * 1.7 * machineState.run * 0.3;
    const [sy, sz] = beltPath(seamD);
    seam.position.set(2.29, sy, sz);
  });
  hotspots.add(guard, {
    hint: 'E — 敲敲飞轮护栏',
    onActivate: () => {
      audio.sfxAt('clank', -2.9, -5.9, 0.8, 3);
      machineState.run = 0.35; // 打个嗝，随后被恢复更新器拉回 1
      setTimeout(() => audio.sfxAt('creak', -2.9, -5.9, 0.35, 3), 340);
      ui.caption('它听见了，但它不打算停。', 3400);
    }
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

  // 拉杆热点（艺术二遍：铸铁台座车削 + 螺栓环 + 扇形限位板，去"方块底座"观感）
  const lever = roundedBoxMesh(0.1, 0.85, 0.1, 0.04,
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x555558, roughness: 0.3, metalness: 0.9, emissive: 0x888888, emissiveIntensity: 0.12 }));
  lever.position.set(-2.4, 1.1, -5.2);
  lever.rotation.z = -0.4;
  const leverBase = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.34, 0), new THREE.Vector2(0.32, 0.07), new THREE.Vector2(0.2, 0.13),
      new THREE.Vector2(0.16, 0.5), new THREE.Vector2(0.22, 0.62), new THREE.Vector2(0.2, 0.7),
      new THREE.Vector2(0.05, 0.72)
    ], 14),
    bodyMat
  );
  leverBase.position.set(-2.4, 0, -5.2);
  // 底座螺栓环
  const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 6);
  const boltGeos = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    boltGeos.push(xform(boltGeo, -2.4 + Math.cos(a) * 0.27, 0.045, -5.2 + Math.sin(a) * 0.27));
  }
  boltGeo.dispose();
  // 扇形限位板（拉杆行程的金属弧板）
  const quad = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.025, 6, 12, 1.0),
    pipeMat
  );
  quad.position.set(-2.4, 0.72, -5.2);
  quad.rotation.z = Math.PI / 2 - 0.5;
  group.add(lever, leverBase, mergedMesh(boltGeos, pipeMat), quad);
  hotspots.add(lever, {
    hint: 'E — 拉动阀门（这栋楼会回应）',
    onActivate: () => {
      steamBurst = 3.2;
      audio.sfx('clank');
      setTimeout(() => audio.sfx('steam'), 260);
      lever.rotation.z = lever.rotation.z < 0 ? 0.4 : -0.4;
    }
  });

  // 汽笛链 —— 北墙管道上垂下的链条；拉响 → 蒸汽 + 大机器猛冲一拍
  const chainRig = new THREE.Group();
  const linkGeo2 = new THREE.TorusGeometry(0.032, 0.008, 6, 10);
  const linkGeos2 = [];
  for (let i = 0; i < 46; i++) {
    linkGeos2.push(xform(linkGeo2, 0, -i * 0.054, 0, Math.PI / 2, (i % 2) * Math.PI / 2, 0));
  }
  linkGeo2.dispose();
  chainRig.add(mergedMesh(linkGeos2, pipeMat));
  const chainHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.22, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.7 })
  );
  chainHandle.rotation.z = Math.PI / 2;
  chainHandle.position.y = -2.52;
  chainRig.add(chainHandle);
  chainRig.position.set(-0.8, 4.5, -S / 2 + 0.42);
  group.add(chainRig);
  const whistle = { pull: 0 };
  updaters.push((dt) => {
    if (whistle.pull > 0) whistle.pull = Math.max(0, whistle.pull - dt * 2.4);
    chainRig.position.y = 4.5 - Math.sin(Math.min(1, whistle.pull) * Math.PI) * 0.16;
    machineState.run += (1 - machineState.run) * Math.min(1, dt * 0.8);
  });
  hotspots.add(chainHandle, {
    hint: 'E — 拉响汽笛链',
    onActivate: () => {
      whistle.pull = 1;
      steamBurst = 4.2;
      machineState.run = 2.4;
      audio.sfx('clank', 0.5);
      setTimeout(() => audio.sfxAt('steam', -3.2, -5.4, 1.0, 4), 180);
      setTimeout(() => audio.sfx('steamfar', 0.7), 900);
    }
  });

  // 漏汽接头 —— 北墙低管一段旧布缠补丁，咝咝往外漏白汽；拧紧只安静五秒
  const leakWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.34, 12),
    new THREE.MeshStandardMaterial({
      color: 0x56504a, roughness: 0.96,
      bumpMap: noiseCanvasTexture(64, 120, 60, 6), bumpScale: 0.5
    })
  );
  leakWrap.rotation.z = Math.PI / 2;
  leakWrap.position.set(3.6, 1.7, -S / 2 + 0.35);
  group.add(leakWrap);
  const bindGeo = new THREE.TorusGeometry(0.125, 0.012, 6, 14);
  group.add(mergedMesh([
    xform(bindGeo, 3.48, 1.7, -S / 2 + 0.35, 0, Math.PI / 2, 0),
    xform(bindGeo, 3.74, 1.7, -S / 2 + 0.35, 0, Math.PI / 2, 0)
  ], pipeMat));
  bindGeo.dispose();
  const leakSteam = smokeLayer(10, { x: 0.4, z: 0.4 }, {
    opacity: 0.12, size: 1.1, yBase: 0.05, ySpread: 1.0, color: 0xd8dde2
  });
  leakSteam.position.set(3.6, 1.8, -S / 2 + 0.5);
  group.add(leakSteam);
  updaters.push(leakSteam.userData.update);
  const leak = { calm: 0, puff: 0 };
  updaters.push((dt, t) => {
    if (leak.calm > 0) leak.calm -= dt;
    if (leak.puff > 0) leak.puff -= dt;
    const base = leak.calm > 0 ? 0.015 : 0.11 + Math.sin(t * 2.3) * 0.03;
    leakSteam.material.opacity = base + Math.max(0, Math.min(leak.puff, 1)) * 0.26;
  });
  hotspots.add(leakWrap, {
    hint: 'E — 拧紧漏汽的接头',
    onActivate: () => {
      leak.calm = 5;
      leak.puff = 0;
      audio.sfxAt('creak', 3.6, -S / 2 + 0.35, 0.7);
      audio.sfx('switch', 0.3);
      ui.caption('安静了。数到五。', 2600);
      setTimeout(() => {
        leak.puff = 2.4;
        audio.sfxAt('steam', 3.6, -S / 2 + 0.35, 0.75, 3);
      }, 5200);
    }
  });

  // 裸吊灯 —— 推一下就荡起来，光影跟着晃
  const swingBulb = hangingBulb(0xffe2b8, 2.5);
  swingBulb.position.set(1.9, H, -3.1);
  group.add(swingBulb);
  const swing = { e: 0, t: 0 };
  updaters.push((dt) => {
    if (swing.e <= 0.004) return;
    swing.t += dt;
    swing.e *= Math.max(0, 1 - dt * 0.55);
    swingBulb.rotation.z = Math.sin(swing.t * 1.9) * 0.52 * swing.e;
    swingBulb.rotation.x = Math.sin(swing.t * 1.9 + 1.1) * 0.3 * swing.e;
  });
  hotspots.add(swingBulb.userData.bulb, {
    hint: 'E — 推一下吊灯',
    onActivate: () => {
      swing.e = 1;
      swing.t = 0;
      audio.sfx('creak', 0.4);
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
  const annexFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 5.2), floorConcrete);
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
  // 管式扶手 v2（立杆球接头 + 地法兰 + 双横管——不再借用木栏杆轮廓）
  const rail = pipeRail(5.0, { mats: M });
  rail.position.set(-S / 2 - 0.8, 0.08, 0);
  rail.rotation.y = Math.PI / 2;
  boilerRoom.add(rail);
  // 围墙
  const annexWallMat = wallMat;
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
  // 独有蒙皮：铆接钢板（纵向板缝 + 双排铆钉 + 油污流挂）—— 暗部也读得出体量
  const boilerMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, (g, s) => {
      g.fillStyle = '#454550';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(${20 + Math.random() * 40 | 0},${20 + Math.random() * 40 | 0},${26 + Math.random() * 40 | 0},0.18)`;
        g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 5, 1 + Math.random() * 3);
      }
      // 油污竖向流挂（沿 v 即罐长方向）
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * s;
        g.fillStyle = 'rgba(10,10,12,0.22)';
        g.fillRect(x, Math.random() * s * 0.4, 2 + Math.random() * 4, s * (0.3 + Math.random() * 0.5));
      }
      // 纵向板缝 ×3 + 双排铆钉
      for (const u of [0.17, 0.5, 0.83]) {
        const x = u * s;
        g.strokeStyle = 'rgba(12,12,14,0.9)';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke();
        g.fillStyle = '#5a5a64';
        for (let y = 8; y < s; y += 18) {
          g.beginPath(); g.arc(x - 7, y, 2.6, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(x + 7, y + 9, 2.6, 0, Math.PI * 2); g.fill();
        }
      }
    }, 2, 1),
    color: 0x8a8a92, roughness: 0.52, metalness: 0.5,
    bumpMap: noiseCanvasTexture(64, 128, 50, 6), bumpScale: 0.25, envMapIntensity: 1.3
  });
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 4.4, 22), boilerMat);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(-S / 2 - 4.6, 1.5, 0);
  const capGeos = [
    xform(new THREE.SphereGeometry(1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), -S / 2 - 4.6, 1.5, 2.2, Math.PI / 2, 0, 0),
    xform(new THREE.SphereGeometry(1.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), -S / 2 - 4.6, 1.5, -2.2, -Math.PI / 2, 0, 0)
  ];
  boilerRoom.add(boiler, mergedMesh(capGeos, boilerMat));
  // 低位补光（入口侧洗亮罐腹与步道；冷白弱光不与余烬争色）
  const bellyFill = new THREE.PointLight(0xbfc8d4, 2.4, 6.5, 1.7);
  bellyFill.position.set(-S / 2 - 2.1, 1.15, 0);
  boilerRoom.add(bellyFill);
  const bandGeo = new THREE.TorusGeometry(1.17, 0.045, 8, 30);
  const bandGeos = [];
  for (const z of [-1.5, -0.5, 0.5, 1.5]) {
    bandGeos.push(xform(bandGeo, -S / 2 - 4.6, 1.5, z));
  }
  bandGeo.dispose();
  boilerRoom.add(mergedMesh(bandGeos, pipeMat));
  // 承托鞍座 ×2（浇筑墩 + 过顶钢箍）—— 罐体不再悬空
  const pierGeos = [];
  const strapGeos = [];
  for (const z of [-1.5, 1.5]) {
    pierGeos.push(xform(new THREE.BoxGeometry(1.9, 0.5, 0.55), -S / 2 - 4.6, 0.25, z));
    pierGeos.push(xform(new THREE.BoxGeometry(2.2, 0.12, 0.7), -S / 2 - 4.6, 0.06, z));
    strapGeos.push(xform(new THREE.TorusGeometry(1.19, 0.035, 6, 26, Math.PI), -S / 2 - 4.6, 1.5, z));
  }
  boilerRoom.add(mergedMesh(pierGeos, floorConcrete), mergedMesh(strapGeos, pipeMat));
  // 罐底余烬光带（炉膛漏光；随火光脉动）
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x140a06, emissive: 0xff6a24, emissiveIntensity: 1.2, roughness: 1
  });
  const ember = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.2), emberMat);
  ember.rotation.x = -Math.PI / 2;
  ember.position.set(-S / 2 - 4.6, 0.015, 0);
  boilerRoom.add(ember);
  // 灰坑箱（罐腹下取灰口；正面三道通风缝漏火光 —— 面向入口的暗部锚点）
  const ashBox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 1.9), pipeMat);
  ashBox.position.set(-S / 2 - 4.25, 0.36, 0);
  boilerRoom.add(ashBox);
  const ventGeos = [];
  for (const y of [0.2, 0.38, 0.56]) {
    ventGeos.push(xform(new THREE.PlaneGeometry(0.06, 1.5), -S / 2 - 3.815, y, 0, 0, Math.PI / 2, Math.PI / 2));
  }
  const ventMesh = mergedMesh(ventGeos, emberMat);
  boilerRoom.add(ventMesh);
  const emberLight = new THREE.PointLight(0xff5a1c, 2.5, 6, 1.6);
  emberLight.position.set(-S / 2 - 3.3, 0.4, 0);
  boilerRoom.add(emberLight);
  // 铰链炉门 v2（铆钉圈 + 观火窗 + 手轮锁；可开启）
  const firebox = fireboxDoor({ mats: M });
  firebox.position.set(-S / 2 - 4.96, 0.95, 2.28);
  boilerRoom.add(firebox);
  const furnaceLight = new THREE.PointLight(0xff7a2c, 6, 8, 1.8);
  furnaceLight.position.set(-S / 2 - 4.2, 1.0, 1.6);
  boilerRoom.add(furnaceLight);
  const fireboxState = { open: 0, target: 0 };
  updaters.push((dt, t) => {
    fireboxState.open += (fireboxState.target - fireboxState.open) * Math.min(1, dt * 3.5);
    firebox.userData.hinge.rotation.y = fireboxState.open * 1.9;
    const f = 1.6 + Math.sin(t * 3.7) * 0.5 + Math.random() * 0.3;
    firebox.userData.portMat.emissiveIntensity = f * (1 + fireboxState.open * 1.2);
    furnaceLight.intensity = (3 + f * 1.6) * (1 + fireboxState.open * 2.2);
    emberMat.emissiveIntensity = 0.7 + f * 0.45;
    emberLight.intensity = 2.0 + f * 1.1 + fireboxState.open * 1.5;
  });
  hotspots.add(firebox.userData.wheel, {
    hint: 'E — 转动炉门手轮',
    onActivate: () => {
      fireboxState.target = fireboxState.target > 0.5 ? 0 : 1;
      audio.sfx('clank', 0.9);
      if (fireboxState.target) {
        setTimeout(() => audio.sfx('steam', 0.6), 350);
        ui.caption('炉膛里的光在呼吸。', 3600);
      }
    }
  });

  // 手轮阀（步道旁；转动 → 压力表乱跳 + 蒸汽）
  const valve = valveWheel({ mats: M });
  valve.position.set(-S / 2 - 1.7, 0.08, 1.9);
  boilerRoom.add(valve);
  const valveState = { spin: 0 };
  updaters.push((dt) => {
    if (valveState.spin > 0) {
      valveState.spin -= dt;
      valve.userData.wheel.rotation.y += dt * 7;
    }
  });

  // 闸刀配电箱（合闸/断闸 → 铁笼灯全场明灭）
  const fusebox = fuseBox({ mats: M });
  fusebox.position.set(-S / 2 - 2.4, 1.7, -2.5);
  boilerRoom.add(fusebox);
  // 压力表组 v2（v1.9 件 1）：珐琅表盘 + 黄铜表圈 + 玻璃罩 + 剑形指针带尾配重
  // + 取压短管从罐皮接出（截止旋塞 + 猪尾缓冲弯）——三块表第一次真正
  // 接在锅炉上。E 中间那块 → 指针猛一格再弹回：表针不同意。
  const gaugeNeedles = [];
  const gaugeIronGeos = [];
  const gaugeBrassGeos = [];
  const gaugeGlassGeos = [];
  const GX = -S / 2 - 3.42; // 表盘面基准 x
  const needleMat = new THREE.MeshStandardMaterial({ color: 0x8f0e1e, roughness: 0.35, metalness: 0.4 });
  let midDial = null;
  for (const [z, seed] of [[-1.4, 1], [0, 4], [1.4, 7]]) {
    // 珐琅盘面：老化白瓷 + 主/副刻度 + 数字圈 + 红区楔 + 一道发丝裂纹
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.014, 22),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(128, (g, s) => {
          const r = rng(seed * 13 + 5);
          g.fillStyle = '#e8e2d2';
          g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, 7); g.fill();
          // 珐琅老化：边缘茶渍云 + 狐斑点
          for (let i = 0; i < 8; i++) {
            const a = r() * Math.PI * 2;
            const rr = s * (0.34 + r() * 0.13);
            const grad = g.createRadialGradient(s / 2 + Math.cos(a) * rr, s / 2 + Math.sin(a) * rr, 0,
              s / 2 + Math.cos(a) * rr, s / 2 + Math.sin(a) * rr, 6 + r() * 9);
            grad.addColorStop(0, 'rgba(150,128,92,0.16)');
            grad.addColorStop(1, 'rgba(150,128,92,0)');
            g.fillStyle = grad;
            g.fillRect(0, 0, s, s);
          }
          // 红区楔（超压末段）
          g.fillStyle = 'rgba(140,22,26,0.8)';
          g.beginPath();
          g.moveTo(s / 2, s / 2);
          g.arc(s / 2, s / 2, s / 2 - 7, Math.PI * 0.52, Math.PI * 0.75);
          g.closePath(); g.fill();
          g.fillStyle = '#e8e2d2';
          g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 17, 0, 7); g.fill();
          // 主刻度 9 + 副刻度 + 数字
          g.strokeStyle = '#2a2620';
          g.fillStyle = '#2a2620';
          g.font = 'bold 9px monospace';
          g.textAlign = 'center';
          for (let i = 0; i < 33; i++) {
            const a = Math.PI * 0.75 + (i / 32) * Math.PI * 1.5;
            const major = i % 4 === 0;
            g.lineWidth = major ? 2 : 0.8;
            g.beginPath();
            g.moveTo(s / 2 + Math.cos(a) * (s / 2 - 7), s / 2 + Math.sin(a) * (s / 2 - 7));
            g.lineTo(s / 2 + Math.cos(a) * (s / 2 - (major ? 15 : 11)), s / 2 + Math.sin(a) * (s / 2 - (major ? 15 : 11)));
            g.stroke();
            if (major) {
              g.fillText(String((i / 4) * 4),
                s / 2 + Math.cos(a) * (s / 2 - 23), s / 2 + Math.sin(a) * (s / 2 - 23) + 3);
            }
          }
          // 中心毂圈 + 厂标弧点
          g.lineWidth = 1;
          g.beginPath(); g.arc(s / 2, s / 2, 5, 0, 7); g.stroke();
          for (let i = 0; i < 5; i++) {
            g.fillRect(s / 2 - 8 + i * 4, s * 0.68, 1.6, 1.6);
          }
          // 一道发丝裂纹（从边缘游进来）
          g.strokeStyle = 'rgba(90,80,66,0.5)';
          g.lineWidth = 0.7;
          g.beginPath();
          let cx = s * (0.1 + r() * 0.15);
          let cy = s * (0.24 + r() * 0.2);
          g.moveTo(cx, cy);
          for (let i = 0; i < 4; i++) {
            cx += 6 + r() * 8;
            cy += (r() - 0.4) * 10;
            g.lineTo(cx, cy);
          }
          g.stroke();
        }),
        roughness: 0.32
      })
    );
    dial.rotation.z = Math.PI / 2;
    dial.position.set(GX, 2.2, z);
    if (z === 0) midDial = dial;
    // 铁壳 + 罐皮接管（截止旋塞体 + 手柄）+ 猪尾缓冲弯
    gaugeIronGeos.push(
      xform(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 18), GX - 0.045, 2.2, z, 0, 0, Math.PI / 2),
      xform(new THREE.CylinderGeometry(0.19, 0.19, 0.016, 18), GX - 0.085, 2.2, z, 0, 0, Math.PI / 2),
      xform(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 10), GX - 0.38, 2.2, z, 0, 0, Math.PI / 2)
    );
    gaugeBrassGeos.push(
      // 表圈
      xform(new THREE.TorusGeometry(0.152, 0.016, 8, 26), GX + 0.012, 2.2, z, 0, Math.PI / 2, 0),
      // 截止旋塞：塞体 + 斜向小手柄
      xform(new THREE.CylinderGeometry(0.034, 0.034, 0.06, 10), GX - 0.42, 2.2, z, 0, 0, Math.PI / 2),
      xform(new THREE.BoxGeometry(0.012, 0.06, 0.014), GX - 0.42, 2.245, z, 0.35, 0, 0),
      // 猪尾缓冲弯（XY 面 4/5 圈，垂在接管下方）
      xform(new THREE.TorusGeometry(0.046, 0.0135, 8, 16, Math.PI * 1.65), GX - 0.22, 2.14, z, Math.PI * 0.6, 0, 0)
    );
    // 玻璃罩（压扁球面——先压扁再挪位，顺序反了会把位置一起缩掉）
    const glassGeo = new THREE.SphereGeometry(0.15, 16, 10);
    glassGeo.scale(0.32, 1, 1);
    gaugeGlassGeos.push(xform(glassGeo, GX + 0.02, 2.2, z));
    // 剑形指针：渐细刃 + 尾配重 + 毂（枢轴在盘心，绕 x 扫盘面）
    const needle = mergedMesh([
      xform(new THREE.BoxGeometry(0.011, 0.125, 0.007), 0, 0.055, 0),
      xform(new THREE.BoxGeometry(0.007, 0.05, 0.007), 0, 0.028, 0, 0, 0, 0.32),
      xform(new THREE.BoxGeometry(0.016, 0.038, 0.008), 0, -0.03, 0),
      xform(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 10), 0, 0, 0, 0, 0, Math.PI / 2)
    ], needleMat);
    needle.position.set(GX + 0.012, 2.2, z);
    boilerRoom.add(dial, needle);
    gaugeNeedles.push({ needle, seed, kick: 0 });
  }
  const gaugeCaseMat = new THREE.MeshStandardMaterial({ color: 0x26262b, roughness: 0.5, metalness: 0.7 });
  boilerRoom.add(mergedMesh(gaugeIronGeos, gaugeCaseMat));
  boilerRoom.add(mergedMesh(gaugeBrassGeos, M.brass));
  boilerRoom.add(mergedMesh(gaugeGlassGeos, new THREE.MeshStandardMaterial({
    color: 0xcfe0ea, transparent: true, opacity: 0.13, roughness: 0.08, metalness: 0.2, depthWrite: false
  })));
  const pressure = { surge: 0 };
  updaters.push((dt, t) => {
    if (pressure.surge > 0) pressure.surge -= dt;
    const s2 = Math.max(0, Math.min(pressure.surge, 1));
    for (const gn of gaugeNeedles) {
      if (gn.kick > 0) gn.kick = Math.max(0, gn.kick - dt * 2.4);
      gn.needle.rotation.x = Math.sin(t * 0.7 + gn.seed) * 0.8 + Math.sin(t * 5.3 + gn.seed * 2) * 0.1 +
        s2 * Math.sin(t * 21 + gn.seed * 3) * 0.7 +
        gn.kick * Math.sin(gn.kick * 14) * 0.9;
    }
  });
  hotspots.add(midDial, {
    hint: 'E — 敲敲表盘',
    onActivate: () => {
      gaugeNeedles[1].kick = 1;
      audio.sfxAt('porcelain', GX, 0, 0.4, 3);
      setTimeout(() => ui.caption('表针不同意。', 3000), 700);
    }
  });
  // 锅炉房蒸汽与灯
  const boilerSteam = smokeLayer(30, { x: 5, z: 4 }, { opacity: 0.07, size: 5, yBase: 0.4, ySpread: 3, color: 0xb8bcc4 });
  boilerSteam.position.set(-S / 2 - 3, 0, 0);
  boilerRoom.add(boilerSteam);
  updaters.push(boilerSteam.userData.update);
  updaters.push(() => {
    boilerSteam.material.opacity = 0.07 + Math.max(0, Math.min(pressure.surge, 1)) * 0.22;
  });
  // 手轮阀交互：压力表狂跳 + 蒸汽增压
  hotspots.add(valve.userData.wheel.children[0], {
    hint: 'E — 转动阀轮',
    onActivate: () => {
      valveState.spin = 2.6;
      pressure.surge = 4.0;
      audio.sfx('clank', 0.7);
      setTimeout(() => audio.sfx('steam', 0.9), 300);
      ui.caption('压力去了别的地方。', 3600);
    }
  });
  // 配电箱交互：断闸 → 铁笼灯熄灭数秒
  const fuseState = { cut: 0 };
  updaters.push((dt) => {
    if (fuseState.cut > 0) {
      fuseState.cut -= dt;
      for (const c of cageLights) {
        c.light.intensity = 0.15;
        c.bulb.material.emissiveIntensity = 0.06;
      }
      if (fuseState.cut <= 0) audio.sfx('fluor', 0.7);
    }
  });
  const midLever = fusebox.userData.levers[1];
  hotspots.add(midLever.children[0], {
    hint: 'E — 扳动闸刀',
    onActivate: () => {
      const cutting = fuseState.cut <= 0;
      fuseState.cut = cutting ? 5 : 0.01;
      midLever.rotation.z = cutting ? -0.5 : 0.5;
      fusebox.userData.levers.forEach((lv, i) => { if (i !== 1) lv.rotation.z = cutting ? -0.5 : 0.5; });
      audio.sfx('switch', 0.9);
      if (cutting) ui.caption('整层楼安静了一档。', 3600);
    }
  });
  const annexLamp = new THREE.PointLight(0xf5f0e6, 6.5, 10, 1.9);
  annexLamp.position.set(-S / 2 - 2.2, H - 1.4, 0);
  boilerRoom.add(annexLamp);
  updaters.push(makeFlicker(annexLamp, null, 5, 21));

  // ---------- 煤角（v1.4 四遍）：炉子烧了五十年，煤终于进了场 ----------
  // 北墙投煤口 + 斜溜槽 → 锅炉腹侧煤堆（flatShading 晶面在余烬光里发亮）
  // + 插着的铁锹；E → 锹柄晃 + 两块煤滚落 + 炉膛应了一口亮（连锁）
  const COAL_X = -S / 2 - 3.2;
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0d, roughness: 0.32, metalness: 0.55,
    flatShading: true, envMapIntensity: 1.8
  });
  const cr = rng(53);
  const pileGeo = new THREE.IcosahedronGeometry(0.75, 1);
  {
    const pp = pileGeo.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const k = 1 + (cr() - 0.5) * 0.5;
      pp.setXYZ(i, pp.getX(i) * k, Math.max(0.02, pp.getY(i) * k * 0.55 + 0.12), pp.getZ(i) * k);
    }
    pileGeo.computeVertexNormals();
  }
  const pile = new THREE.Mesh(pileGeo, coalMat);
  pile.position.set(COAL_X, 0, -1.85);
  boilerRoom.add(pile);
  // 散落煤块（seeded，堆脚一圈）
  const lumpGeos = [];
  for (let i = 0; i < 7; i++) {
    const a = cr() * Math.PI * 2;
    const r = 0.8 + cr() * 0.45;
    lumpGeos.push(xform(
      new THREE.IcosahedronGeometry(0.05 + cr() * 0.06, 0),
      COAL_X + Math.cos(a) * r, 0.05, -1.85 + Math.sin(a) * r * 0.7,
      cr() * 3, cr() * 3, 0
    ));
  }
  boilerRoom.add(mergedMesh(lumpGeos, coalMat));
  // 投煤口 + 斜溜槽（锈蚀 U 槽：底板 + 双侧翼 + 单撑）
  const chuteRust = rustMat({ seed: 21, rust: 0.82, repX: 1, repY: 2 });
  chuteRust.color = new THREE.Color(0x8a8378); // 冷灯下压暗——重铁不该反纸白
  const hatchGeos = [
    xform(new THREE.BoxGeometry(0.62, 0.62, 0.07), COAL_X, 2.42, -2.56),
    xform(new THREE.BoxGeometry(0.5, 0.5, 0.03), COAL_X, 2.6, -2.49, -0.35, 0, 0) // 虚掩的翻板
  ];
  const chuteGeos = [
    xform(new THREE.BoxGeometry(0.5, 0.03, 1.55), 0, 0, 0),
    xform(new THREE.BoxGeometry(0.03, 0.16, 1.55), -0.25, 0.08, 0),
    xform(new THREE.BoxGeometry(0.03, 0.16, 1.55), 0.25, 0.08, 0)
  ];
  for (const gg of chuteGeos) {
    gg.rotateX(1.12);
    gg.translate(COAL_X, 1.62, -2.2);
  }
  chuteGeos.push(xform(new THREE.BoxGeometry(0.05, 0.9, 0.05), COAL_X - 0.2, 0.85, -2.35));
  boilerRoom.add(mergedMesh([...hatchGeos, ...chuteGeos], chuteRust));
  // 铁锹：插进堆里，锹柄斜向步道
  const shovel = new THREE.Group();
  const shovelBlade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.03), M.iron);
  shovelBlade.position.y = 0.13;
  const shovelShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 1.15, 8), M.darkWood);
  shovelShaft.position.y = 0.7;
  const shovelGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), M.darkWood);
  shovelGrip.rotation.x = Math.PI / 2;
  shovelGrip.position.y = 1.27;
  shovel.add(shovelBlade, shovelShaft, shovelGrip);
  shovel.position.set(COAL_X + 0.55, 0.3, -1.6);
  shovel.rotation.z = -0.42;
  shovel.rotation.x = 0.1;
  boilerRoom.add(shovel);
  // 滚落煤块两粒（平时藏着；激活时从堆顶滚到堆脚）
  const rollers = [0, 1].map((i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 - i * 0.015, 0), coalMat);
    m.visible = false;
    boilerRoom.add(m);
    return m;
  });
  const coal = { flare: 0, wobble: 0, roll: -1 };
  updaters.push((dt, t) => {
    if (coal.flare > 0) {
      // 连锁：炉膛/余烬应一口亮——写在炉火更新器之后，做加法不覆盖
      furnaceLight.intensity += coal.flare * 4;
      emberMat.emissiveIntensity += coal.flare * 0.7;
      emberLight.intensity += coal.flare * 1.4;
      coal.flare = Math.max(0, coal.flare - dt * 0.55);
    }
    if (coal.wobble > 0) {
      coal.wobble -= dt;
      shovel.rotation.z = -0.42 + Math.sin(t * 26) * 0.07 * Math.max(0, coal.wobble);
    }
    if (coal.roll >= 0) {
      coal.roll += dt;
      const k = Math.min(1, coal.roll / 0.85);
      const ease = 1 - (1 - k) * (1 - k);
      rollers.forEach((m, i) => {
        const dir = i === 0 ? 0.72 : 0.46; // 滚不到步道格栅上

        m.visible = true;
        m.position.set(
          COAL_X + 0.15 + ease * 0.85 * dir,
          Math.max(0.05, 0.82 - ease * 0.77 + Math.abs(Math.sin(k * Math.PI * 2.2)) * 0.05 * (1 - k)),
          -1.85 + ease * (i === 0 ? 0.5 : -0.4)
        );
        m.rotation.x += dt * 9 * (1 - k * 0.6);
        m.rotation.z += dt * 7 * (1 - k * 0.6);
      });
      if (k >= 1) coal.roll = -1;
    }
  });
  hotspots.add(shovelShaft, {
    hint: 'E — 插在煤堆里的铁锹',
    onActivate: () => {
      coal.wobble = 0.8;
      coal.roll = 0;
      coal.flare = 1;
      audio.sfxAt('coalrattle', COAL_X, -1.85, 0.6, 5);
      ui.caption('炉子还记得煤的味道。', 3600);
    }
  });
  group.add(boilerRoom);

  // ---------- 泄压总管 —— 东墙的锈蚀集汽包（v1.4 P2 rustSet 五通道） ----------
  // 卧式总管 + 三根立管肘弯进砖墙 + 青铜泄压手轮 + 地面滴水盘；
  // 转动手轮 → 本厅喷汽 + 大机器泄气减速 + 隔壁锅炉房三块压力表狂跳（跨房连锁）
  const manifold = new THREE.Group();
  const maniRust = rustMat({ seed: 63, rust: 0.7, repX: 2, repY: 1 });
  const header = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.5, 16), maniRust);
  header.rotation.x = Math.PI / 2;
  manifold.add(header);
  const riserGeos = [];
  for (const rz of [-0.85, 0, 0.85]) {
    riserGeos.push(xform(new THREE.CylinderGeometry(0.075, 0.075, 1.15, 12), 0, 0.65, rz));
    riserGeos.push(xform(new THREE.TorusGeometry(0.14, 0.075, 8, 8, Math.PI / 2), 0.14, 1.225, rz, 0, 0, Math.PI / 2));
    riserGeos.push(xform(new THREE.CylinderGeometry(0.075, 0.075, 0.35, 12), 0.31, 1.365, rz, 0, 0, Math.PI / 2));
    riserGeos.push(xform(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 12), 0, 0.35, rz));
  }
  // 墙装抱箍 ×2：半环箍带 + 双横撑到砖墙（总管不再悬浮）
  for (const bz of [-0.55, 0.55]) {
    riserGeos.push(xform(new THREE.TorusGeometry(0.175, 0.022, 6, 14, Math.PI), 0, 0, bz, 0, 0, Math.PI / 2));
    riserGeos.push(xform(new THREE.BoxGeometry(0.3, 0.055, 0.055), 0.15, 0.175, bz));
    riserGeos.push(xform(new THREE.BoxGeometry(0.3, 0.055, 0.055), 0.15, -0.175, bz));
  }
  manifold.add(mergedMesh(riserGeos, maniRust));
  const reliefBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 12), pipeMat);
  reliefBody.rotation.z = Math.PI / 2;
  reliefBody.position.set(-0.24, 0, 0.4);
  manifold.add(reliefBody);
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x7a5a30, roughness: 0.4, metalness: 0.9, envMapIntensity: 1.1
  });
  const hwGeos = [xform(new THREE.TorusGeometry(0.13, 0.02, 8, 20), 0, 0, 0, 0, Math.PI / 2, 0)];
  for (let i = 0; i < 3; i++) {
    hwGeos.push(xform(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), 0, 0, 0, (i / 3) * Math.PI, 0, 0));
  }
  hwGeos.push(xform(new THREE.SphereGeometry(0.035, 8, 6), 0, 0, 0));
  hwGeos.push(xform(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), 0.07, 0, 0, 0, 0, Math.PI / 2));
  const handwheel = mergedMesh(hwGeos, bronzeMat);
  handwheel.position.set(-0.44, 0, 0.4);
  manifold.add(handwheel);
  manifold.position.set(S / 2 - 0.35, 1.15, 1.7);
  group.add(manifold);
  const panBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.09, 0.6), maniRust);
  panBox.position.set(S / 2 - 0.55, 0.045, 1.7);
  const panWater = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x0a0c0d, roughness: 0.07, metalness: 0.1, envMapIntensity: 1.5 })
  );
  panWater.rotation.x = -Math.PI / 2;
  panWater.position.set(S / 2 - 0.55, 0.092, 1.7);
  group.add(panBox, panWater);
  const ventSteam = smokeLayer(10, { x: 0.5, z: 0.9 }, {
    opacity: 0, size: 1.3, yBase: 0.1, ySpread: 1.6, color: 0xdde2e6
  });
  ventSteam.position.set(S / 2 - 0.75, 1.2, 1.7);
  group.add(ventSteam);
  updaters.push(ventSteam.userData.update);
  const vent = { v: 0 };
  updaters.push((dt) => {
    if (vent.v > 0) {
      vent.v -= dt;
      handwheel.rotation.x += dt * 6;
    }
    ventSteam.material.opacity = Math.max(0, Math.min(vent.v, 1)) * 0.3;
  });
  hotspots.add(handwheel, {
    hint: 'E — 泄压手轮',
    onActivate: () => {
      vent.v = 3.6;
      pressure.surge = 4.0; // 连锁：锅炉房三块压力表同时狂跳
      machineState.run = 0.5; // 大机器泄了口气，再自己缓过来
      audio.sfxAt('clank', S / 2 - 0.4, 1.7, 0.7, 3);
      setTimeout(() => audio.sfxAt('steam', S / 2 - 0.6, 1.7, 0.95, 4), 240);
      setTimeout(() => audio.sfx('steamfar', 0.5), 1400);
      ui.caption('这栋楼松了一口气。隔壁的表都知道了。', 4200);
    }
  });

  // v1.4 六遍：打卡钟 + 工卡架（东墙）——工厂给时间盖章的地方。
  // 橡木钟壳 + 奶面表盘（停摆）+ 黄铜压杆；E → 压杆砸下 + stamp 一拍 +
  // 卡片弹一下 + 工作灯眨一次 +「卡上打的都是同一分钟。」
  const punch = new THREE.Group();
  punch.position.set(S / 2, 0, -3.05);
  const oakMat = woodMat({ base: [34, 22, 13], planks: 1, size: 128, seed: 47, env: 0.7 });
  const punchCase = roundedBoxMesh(0.2, 0.88, 0.46, 0.03, oakMat);
  punchCase.position.set(-0.12, 1.5, 0);
  punch.add(punchCase);
  // 表盘：奶面 + 60 刻度（无字），指针另做三维件
  const dialTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#ddd6c2';
    g.fillRect(0, 0, s, s);
    const c = s / 2;
    const fox = rng(48);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(120,100,66,${0.05 + fox() * 0.08})`;
      g.beginPath();
      g.arc(fox() * s, fox() * s, 2 + fox() * 8, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#26221a';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      g.lineWidth = major ? 4 : 1.6;
      const r0 = major ? s * 0.36 : s * 0.4;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      g.lineTo(c + Math.cos(a) * s * 0.44, c + Math.sin(a) * s * 0.44);
      g.stroke();
    }
    g.lineWidth = 5;
    g.beginPath();
    g.arc(c, c, s * 0.465, 0, Math.PI * 2);
    g.stroke();
  });
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.04, 26),
    new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.5 }));
  dial.rotation.z = Math.PI / 2;
  dial.position.set(-0.225, 1.72, 0);
  punch.add(dial);
  const punchBrass = brassMat({ seed: 49 });
  // 表圈 + 卡槽唇边（黄铜静件合并）
  punch.add(mergedMesh([
    xform(new THREE.TorusGeometry(0.157, 0.016, 8, 30), -0.246, 1.72, 0, 0, Math.PI / 2, 0),
    xform(new THREE.BoxGeometry(0.03, 0.024, 0.17), -0.222, 1.21, 0)
  ], punchBrass));
  // 指针：分针停在 6、时针停在 6 与 7 之间——6:30，换班的那一分钟
  const minGeo = new THREE.BoxGeometry(0.008, 0.118, 0.013);
  minGeo.translate(0, -0.052, 0);
  const hrGeo = new THREE.BoxGeometry(0.008, 0.082, 0.017);
  hrGeo.translate(0, -0.036, 0);
  punch.add(mergedMesh([
    xform(minGeo, -0.252, 1.72, 0),
    xform(hrGeo, -0.252, 1.72, 0, 0.26, 0, 0),
    xform(new THREE.SphereGeometry(0.014, 8, 6), -0.252, 1.72, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4, metalness: 0.6 })));
  // 插着的工卡（打过的那张还立在槽里）
  const punchCard = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.15, 0.095),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.85 }));
  punchCard.rotation.x = 0.05;
  punchCard.position.set(-0.235, 1.3, 0);
  punch.add(punchCard);
  // 侧压杆（黄铜臂 + 木球柄，绕安装点下砸）
  const bkArm = new THREE.Group();
  bkArm.position.set(-0.2, 1.5, 0.255);
  bkArm.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.013, 0.013, 0.2, 8), -0.1, 0, 0, 0, 0, Math.PI / 2),
    xform(new THREE.SphereGeometry(0.021, 8, 6), 0, 0, 0)
  ], punchBrass));
  const bkKnob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), oakMat);
  bkKnob.position.set(-0.2, 0, 0);
  bkArm.add(bkKnob);
  punch.add(bkArm);
  // 工卡架：木背板 + 锡皮口袋 2×4 + 五张高矮不齐的卡
  const rackBoard = roundedBoxMesh(0.035, 0.62, 0.5, 0.012, oakMat);
  rackBoard.position.set(-0.1, 1.5, 0.72);
  punch.add(rackBoard);
  const pocketGeos = [];
  const cardGeos = [];
  const cardRng = rng(51);
  let slot = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const py = 1.28 + row * 0.15;
      const pz = 0.72 + (col === 0 ? -0.11 : 0.11);
      pocketGeos.push(xform(new THREE.BoxGeometry(0.012, 0.07, 0.16), -0.135, py, pz));
      if ([0, 2, 3, 5, 6].includes(slot)) {
        cardGeos.push(xform(new THREE.BoxGeometry(0.009, 0.12, 0.14),
          -0.128, py + 0.035 + cardRng() * 0.014, pz, (cardRng() - 0.5) * 0.1, 0, 0));
      }
      slot += 1;
    }
  }
  punch.add(mergedMesh(pocketGeos, new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(3), color: 0x9aa0a6, roughness: 0.42, metalness: 0.85
  })));
  punch.add(mergedMesh(cardGeos, new THREE.MeshStandardMaterial({ color: 0xcfc9b6, roughness: 0.88 })));
  // 锡罩工作灯（钟与卡架之间的一小汪光——东墙原本没灯）
  punch.add(mergedMesh([
    xform(new THREE.ConeGeometry(0.11, 0.09, 12, 1, true), -0.3, 2.42, 0.36),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), -0.13, 2.5, 0.36, 0, 0, 0.5)
  ], pipeMat));
  const punchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xf0ead8, emissiveIntensity: 2.6 }));
  punchBulb.position.set(-0.3, 2.4, 0.36);
  punch.add(punchBulb);
  const punchLamp = new THREE.PointLight(0xe8e0cc, 1.9, 4.2, 1.8);
  punchLamp.position.set(-0.34, 2.32, 0.36);
  punch.add(punchLamp);
  group.add(punch);
  const punchState = { t: -1 };
  updaters.push((dt) => {
    if (punchState.t < 0) return;
    punchState.t += dt;
    const u = punchState.t;
    if (u >= 1.0) {
      punchState.t = -1;
      bkArm.rotation.z = 0;
      punchCard.position.y = 1.3;
      punchLamp.intensity = 1.9;
      return;
    }
    // 0–0.14s 砸下 → 0.14–0.5s 弹回带余振；卡片在击点跳 2cm 落回
    bkArm.rotation.z = u < 0.14
      ? -(u / 0.14) * 0.5
      : -0.5 * Math.exp(-(u - 0.14) * 7) * Math.cos((u - 0.14) * 22);
    const cu = Math.max(0, u - 0.12);
    punchCard.position.y = 1.3 + Math.max(0, Math.sin(Math.min(1, cu / 0.34) * Math.PI)) * 0.022;
    punchLamp.intensity = 1.9 * (u > 0.1 && u < 0.24 ? 0.35 : 1);
  });
  hotspots.add(bkKnob, {
    hint: 'E — 打卡钟',
    onActivate: () => {
      if (punchState.t < 0) punchState.t = 0;
      audio.sfxAt('stamp', S / 2 - 0.3, -3.05, 0.8, 3.5);
      setTimeout(() => audio.sfxAt('ratchet', S / 2 - 0.3, -3.05, 0.3, 3), 340);
      ui.caption('卡上打的都是同一分钟。', 4200);
    }
  });

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
    // v1.6 声先于影：歌先从黑里传出来，隔一拍台口才亮
    stageTimers.push(setTimeout(() => {
      audio.sfx('lullaby', 0.8);
    }, 600));
    stageTimers.push(setTimeout(() => {
      stageGlow.intensity = 14;
      tinyFigure.visible = true;
      ui.caption('机器停了。那支歌不是唱给你听的。', 5200);
    }, 1600));
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

  // 引语立牌（本厅唯一文字件：费城，走近才显影）
  const q1 = quoteStand(quoteById('philly'), '#9fb4c7');
  q1.position.set(-5.6, 0, 2.2);
  q1.rotation.y = 1.35;
  group.add(q1);
  updaters.push(quoteStandUpdater(q1, player, ui, {
    narration: ctx.narration, docent: DOCENT.philly
  }));
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
  hotspots.add(back.userData.portal, { nav: true, hint: 'E — 回到天鹅绒大厅', onActivate: () => goTo('lobby') });

  // v1.4 五遍：总闸刀开关（西墙门洞右肩）——石板配电板 + 双颚黄铜夹 +
  // 胶木柄刀闸 + 瓷瓶/布线进墙。E → 拉闸：全屋电灯塌下去只剩炉火，
  // 机器拖慢喘一口……两秒后闸刀自己弹回、灯涌回来——它不让你关
  const bk = new THREE.Group();
  bk.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.045),
    new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.55 })));
  // 支架双臂跨过沿墙管排（板装在管架前——不然刀闸埋在管子后面）
  bk.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.05, 0.05, 0.52), -0.16, -0.02, -0.28),
    xform(new THREE.BoxGeometry(0.05, 0.05, 0.52), 0.16, -0.02, -0.28),
    xform(new THREE.BoxGeometry(0.09, 0.2, 0.03), -0.16, -0.02, -0.53),
    xform(new THREE.BoxGeometry(0.09, 0.2, 0.03), 0.16, -0.02, -0.53)
  ], new THREE.MeshStandardMaterial({ color: 0x232428, roughness: 0.5, metalness: 0.6 })));
  bk.add(mergedMesh([
    ...[[-0.21, 0.32], [0.21, 0.32], [-0.21, -0.32], [0.21, -0.32]].map(([bx, by]) =>
      xform(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8), bx, by, 0.024, Math.PI / 2, 0, 0)),
    // 双颚夹（上端）+ 铰座（下端）
    xform(new THREE.BoxGeometry(0.05, 0.07, 0.03), -0.08, 0.22, 0.045),
    xform(new THREE.BoxGeometry(0.05, 0.07, 0.03), 0.08, 0.22, 0.045),
    xform(new THREE.BoxGeometry(0.06, 0.05, 0.04), -0.08, -0.14, 0.045),
    xform(new THREE.BoxGeometry(0.06, 0.05, 0.04), 0.08, -0.14, 0.045)
  ], M.brass));
  // 瓷瓶一对 + 布线进墙（顶部圆管导管）
  bk.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.02, 0.028, 0.05, 10), -0.08, 0.31, 0.04),
    xform(new THREE.CylinderGeometry(0.02, 0.028, 0.05, 10), 0.08, 0.31, 0.04),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), -0.08, 0.48, 0.028),
    xform(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), 0.08, 0.48, 0.028)
  ], new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.35, envMapIntensity: 0.9 })));
  // 刀闸（铰在下端，双刀 + 胶木横柄）
  const leverPivot = new THREE.Group();
  leverPivot.position.set(0, -0.14, 0.055);
  const bkLever = mergedMesh([
    xform(new THREE.BoxGeometry(0.022, 0.38, 0.012), -0.08, 0.19, 0),
    xform(new THREE.BoxGeometry(0.022, 0.38, 0.012), 0.08, 0.19, 0),
    xform(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 10), 0, 0.36, 0.02, 0, 0, Math.PI / 2)
  ], new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.4, metalness: 0.3 }));
  leverPivot.add(bkLever);
  bk.add(leverPivot);
  // 红色带电指示灯（拉闸时熄灭）+ 板上方一盏小工作灯（同受总闸管辖）
  const pilotMat = new THREE.MeshStandardMaterial({ color: 0x2a0806, emissive: 0xff2a1a, emissiveIntensity: 2.4 });
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), pilotMat);
  pilot.position.set(0, 0.13, 0.05);
  bk.add(pilot);
  const pilotGlow = new THREE.PointLight(0xff3020, 0.7, 1.4, 2);
  pilotGlow.position.set(0, 0.13, 0.12);
  bk.add(pilotGlow);
  const bkWork = new THREE.PointLight(0xffd9a8, 2.0, 3.8, 1.8);
  bkWork.position.set(0, 0.3, 0.85);
  bk.add(bkWork);
  bk.position.set(-S / 2 + 0.56, 1.55, 2.9);
  bk.rotation.y = Math.PI / 2;
  group.add(bk);
  const breakerState = { t: -1, dim: 1 };
  updaters.push((dt) => {
    let target = 1;
    if (breakerState.t >= 0) {
      breakerState.t += dt;
      const u = breakerState.t;
      if (u < 0.22) leverPivot.rotation.x = -(u / 0.22) * 1.3;
      else if (u < 2.6) leverPivot.rotation.x = -1.3;
      else if (u < 2.7) leverPivot.rotation.x = -1.3 + ((u - 2.6) / 0.1) * 1.3;
      else leverPivot.rotation.x = 0;
      target = u > 0.18 && u < 2.62 ? 0.05 : 1;
      if (u > 3.8) breakerState.t = -1;
    }
    breakerState.dim += (target - breakerState.dim) * Math.min(1, dt * (target < breakerState.dim ? 11 : 7));
    if (breakerState.dim < 0.999) {
      const d2 = breakerState.dim;
      // 逐帧重设型的灯：乘法压暗（各自更新器已在本帧先行写入基线）
      for (const c of cageLights) {
        c.light.intensity *= d2;
        c.bulb.material.emissiveIntensity *= d2;
      }
      annexLamp.intensity *= d2;
      alight.intensity *= d2;
      bellyFill.intensity = 2.4 * d2; // 静态灯：绝对赋值
      bkWork.intensity = 2.0 * d2;
      pilotGlow.intensity = 0.7 * d2;
      pilotMat.emissiveIntensity = 2.4 * d2;
    }
  });
  hotspots.add(bkLever, {
    hint: 'E — 总闸',
    onActivate: () => {
      if (breakerState.t >= 0) return;
      breakerState.t = 0;
      machineState.run = 0.22; // 电走了，机器拖慢喘一口（恢复更新器会拉回）
      audio.sfxAt('switch', -S / 2, 2.9, 0.8, 4);
      setTimeout(() => audio.sfx('lampoff', 0.5), 220);
      setTimeout(() => audio.sfx('heartbeat', 0.25), 1200); // 黑里只剩炉火和它
      setTimeout(() => {
        audio.sfxAt('clank', -S / 2, 2.9, 0.7, 4);
        audio.sfx('lampon', 0.45);
      }, 2620);
      setTimeout(() => ui.caption('它不让你关。', 3800), 2900);
    }
  });

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
    // 脚步材质分区：锅炉房检修步道=钢格栅；其余=水泥
    surfaceAt: (x, z) => (x >= -S / 2 - 2.4 && x <= -S / 2 - 0.8 && z >= -2.5 && z <= 2.5 ? 'metal' : 'concrete'),
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'radiator-stage': radiatorTrig }
  };
}
