// ============================================================
// 《双峰》展厅 —— THE DARK PINES 黑松林（v1.2 多分区可逛地图）
//   ① 林间空地：红帷幕之门（回大厅）+ 树桩咖啡 + 石阵彩蛋
//   ② 红房间氛围区：几何折线地板 + 红帷幕围合 + 扶手椅（原创抽象致敬）
//   ③ 小镇夜街：路灯 + 老轿车剪影 + DINER 柜台一角（樱桃派/咖啡壶）
//   ④ 瀑布眺望台：木栈台 + 瀑布 + 锯木厂剪影
// 分区之间由林间小径连接。全部原创程序化，无镜头复刻。
// ============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Blender 管线英雄松树（scripts/blender/gen_pine_tree.py 四拍精修产物，
// 脚本程序化生成非外来素材）。?inline data URI：electron sandbox 的
// file:// 页面 fetch 不了本地文件，data URI 两端通吃
import pineGlbUri from '../assets/pine_tree.glb?inline';
import {
  PALETTE, canvasTexture, curtain, curtainRing, neonSign,
  smokeLayer, dustField, quoteStand, quoteStandUpdater, velvetMaterial,
  zoneTrigger, zonesBounds, pineGeometryMaterial,
  roundedBoxMesh, mergedMesh, xform, rockMesh, rng,
  groundStrip, gravelTexture, woodTexture, brushedMetalTexture, lightCone,
  chevronMat, asphaltMat, waterMat, boomerangMat, ridgeRing, contactShadows
} from './kit.js';
import {
  propMats, sedanCar, streetLampV2, trafficLight, pieCase,
  counterClutter, ceilingFan, viewScope, clubChair, overlookRail
} from './props.js';
import { quoteById, DOCENT } from '../data/essays.js';

export const meta = {
  id: 'twinpeaks',
  name: 'TWIN PEAKS · 黑松林 (1990)',
  ambience: 'twinpeaks',
  narration: 'twinpeaks',
  space: 'outdoor',
  floorSfx: 'dirt',
  look: {
    saturation: 0.82, tint: 0xdcecdf, fogColor: 0x030805, fogDensity: 0.028,
    bg: 0x02040a, exposure: 0.95, bloom: 0.8,
    // v1.4：月夜冷分级——暗部青蓝、高光微收暖；halation 低（夜景只留窗光晕）
    halation: 0.11,
    grade: { lift: [0.0, 0.008, 0.016], gamma: [1.0, 1.01, 1.02], gain: [0.95, 1.0, 1.05] },
    // v1.9 B1：林间夜雾长息（38s，±10%）
    fogPulse: { period: 38, depth: 0.1 }
  }
};

// ---------- 可逛分区（union 边界） ----------
const ZONES = [
  { circle: { x: 0, z: 0, r: 9.6 } },                                   // 林间空地
  { rect: { minX: -15, maxX: -5, minZ: -8, maxZ: -3 } },                // 小径→红房间 ①
  { rect: { minX: -19, maxX: -13, minZ: -14, maxZ: -6 } },              // 小径→红房间 ②
  { circle: { x: -20, z: -16, r: 6.0 } },                               // 红房间
  { rect: { minX: 6, maxX: 17, minZ: -7, maxZ: -1 } },                  // 小径→夜街
  { rect: { minX: 16.5, maxX: 27.2, minZ: -17, maxZ: 3 } },             // 小镇夜街
  { rect: { minX: 26.4, maxX: 28.0, minZ: -8.8, maxZ: -7.0 } },         // diner 门洞
  { rect: { minX: 27.6, maxX: 31.6, minZ: -12, maxZ: -3.6 } },          // diner 柜台一角
  { rect: { minX: 5.5, maxX: 9.5, minZ: -23, maxZ: -5 } },              // 小径→瀑布
  { rect: { minX: 5, maxX: 17, minZ: -29, maxZ: -22.5 } },              // 瀑布眺望台
  { rect: { minX: 6.5, maxX: 16, minZ: 6, maxZ: 13 } }                  // 林中岔路（石阵）
];
const insideWalkable = (x, z, margin = 1.6) => {
  for (const zn of ZONES) {
    if (zn.circle) {
      const r = zn.circle.r + margin;
      if ((x - zn.circle.x) ** 2 + (z - zn.circle.z) ** 2 < r * r) return true;
    } else {
      const r = zn.rect;
      if (x > r.minX - margin && x < r.maxX + margin && z > r.minZ - margin && z < r.maxZ + margin) return true;
    }
  }
  return false;
};

export function build(ctx) {
  const { hotspots, ui, goTo, audio, engine, player, teleport } = ctx;
  const group = new THREE.Group();
  const updaters = [];
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  // ---------- 林地地面 ----------
  const groundTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#0a0f08';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 620; i++) {
      g.fillStyle = `rgba(${8 + Math.random() * 24},${14 + Math.random() * 26},${8 + Math.random() * 16},0.5)`;
      g.beginPath();
      g.arc(Math.random() * s, Math.random() * s, Math.random() * 12, 0, 7);
      g.fill();
    }
    // 针叶落层
    g.strokeStyle = 'rgba(30,40,22,0.5)';
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * s; const y = Math.random() * s; const a = Math.random() * 7;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.stroke();
    }
  }, 8, 8);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(56, 48),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // 林间小径（碎石条带把分区串成可逛地图）
  const pathMat = new THREE.MeshStandardMaterial({ map: gravelTexture(), roughness: 0.92 });
  for (const [x1, z1, x2, z2] of [
    [-5.5, -5.4, -14, -6.8],   // → 红房间
    [-14, -6.8, -18.4, -13],
    [6, -4, 16.5, -4.2],       // → 夜街
    [7.4, -6, 7.4, -22.8],     // → 瀑布
    [7.5, 6.5, 13, 10.5]       // → 石阵岔路
  ]) {
    group.add(groundStrip(x1, z1, x2, z2, 2.6, pathMat));
  }

  // ---------- 星空 + 月亮 ----------
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
  // v1.9 抛光第 1 遍：月亮 v2——纯色圆盘换「临边昏暗 + 月海斑」贴图盘，
  // 背后垫一圈叠加光晕：从贴纸变成会发潮气的夜空光源。
  const moonTex = canvasTexture(128, (g, s) => {
    const c = s / 2;
    g.clearRect(0, 0, s, s);
    const grad = g.createRadialGradient(c, c, s * 0.1, c, c, c - 1);
    grad.addColorStop(0, 'rgba(246,244,232,1)');
    grad.addColorStop(0.8, 'rgba(228,232,238,0.96)');
    grad.addColorStop(1, 'rgba(192,203,220,0.8)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(c, c, c - 1, 0, 7); g.fill();
    const r = rng(64);
    g.fillStyle = 'rgba(148,156,176,0.2)';
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const rr = r() * s * 0.3;
      g.beginPath();
      g.ellipse(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 6 + r() * 13, 4 + r() * 9, r() * 3, 0, 7);
      g.fill();
    }
  });
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(7, 30),
    new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, fog: false, toneMapped: false })
  );
  moon.position.set(-60, 52, -110);
  moon.lookAt(0, 1.7, 0);
  group.add(moon);
  const haloTex = canvasTexture(128, (g, s) => {
    const c = s / 2;
    g.clearRect(0, 0, s, s);
    const grad = g.createRadialGradient(c, c, s * 0.16, c, c, c - 1);
    grad.addColorStop(0, 'rgba(186,204,232,0.34)');
    grad.addColorStop(0.45, 'rgba(150,172,205,0.12)');
    grad.addColorStop(1, 'rgba(150,172,205,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(17, 30),
    new THREE.MeshBasicMaterial({
      map: haloTex, transparent: true, blending: THREE.AdditiveBlending,
      fog: false, toneMapped: false, depthWrite: false
    })
  );
  moonHalo.position.set(-61.2, 53, -112.4); // 比月盘更远一步（透明排序垫底）
  moonHalo.lookAt(0, 1.7, 0);
  group.add(moonHalo);
  const moonLight = new THREE.DirectionalLight(0x8ea6c9, 0.55);
  moonLight.position.set(-30, 50, -60);
  group.add(moonLight);

  // v1.10 抛光 P10「远处的光」：偶尔一道流星——每 60–110s（seeded）
  // 在随机方位斜划 0.9s 就没了。抬头的人才看得见；没人抬头它也划。
  const meteorTex = canvasTexture(64, (g, s) => {
    g.clearRect(0, 0, s, s);
    const grad = g.createLinearGradient(0, 0, s, 0);
    grad.addColorStop(0, 'rgba(220,232,255,0)');
    grad.addColorStop(0.72, 'rgba(220,232,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
  const meteor = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 0.1),
    new THREE.MeshBasicMaterial({
      map: meteorTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide
    })
  );
  meteor.visible = false;
  group.add(meteor);
  const metRng = rng(83);
  const metState = { t: -1, next: 42, from: new THREE.Vector3(), dir: new THREE.Vector3() };
  updaters.push((dt) => {
    if (metState.t < 0) {
      metState.next -= dt;
      if (metState.next > 0) return;
      const az = metRng() * Math.PI * 2;
      const el = 0.55 + metRng() * 0.35;
      metState.from.set(Math.cos(az) * Math.cos(el) * 120, Math.sin(el) * 120, Math.sin(az) * Math.cos(el) * 120);
      const sgn = metRng() < 0.5 ? 1 : -1;
      metState.dir.set(-Math.sin(az) * sgn * 16, -7 - metRng() * 5, Math.cos(az) * sgn * 16);
      // 长轴沿运动方向、板面朝观察区（基向量一次算好）
      const xA = metState.dir.clone().normalize();
      const nA = metState.from.clone().normalize();
      const yA = new THREE.Vector3().crossVectors(nA, xA).normalize();
      const zA = new THREE.Vector3().crossVectors(xA, yA);
      meteor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
      meteor.visible = true;
      metState.t = 0;
      return;
    }
    metState.t += dt;
    const u = metState.t / 0.9;
    if (u >= 1) {
      metState.t = -1;
      metState.next = 60 + metRng() * 50;
      meteor.visible = false;
      meteor.material.opacity = 0;
      return;
    }
    meteor.position.copy(metState.from).addScaledVector(metState.dir, u);
    meteor.material.opacity = Math.sin(u * Math.PI) * 0.5;
  });

  // ---------- 远景三层（v1.4 P8）：松林(中景) → 山脊剪影两环 → 双峰主峰 ----------
  const ridgeFar = ridgeRing(122, { baseH: 9, amp: 26, segs: 72, color: 0x020409, seed: 71 });
  const ridgeNear = ridgeRing(90, { baseH: 5, amp: 15, segs: 64, color: 0x040a10, seed: 72 });
  group.add(ridgeFar, ridgeNear);
  // 月下并肩的两座主峰（本厅的名字）
  const peaks = mergedMesh([
    xform(new THREE.ConeGeometry(30, 52, 6), -52, 26, -100),
    xform(new THREE.ConeGeometry(23, 40, 6), -80, 20, -88)
  ], new THREE.MeshBasicMaterial({ color: 0x03060d, fog: false }));
  group.add(peaks);

  // ---------- 松林（实例化，避开可逛分区 + 视线走廊） ----------
  // v1.4 修正：树的散布是非种子随机——瀑布盆地里偶尔会长出一棵巨松
  // 把整面水幕挡死（撞见与否全凭运气）。眺望台的「望」必须成立：
  // 瀑布盆地与观景镜→锯木厂的视线走廊内不落树
  const TREE_EXCL = [
    { minX: 3.5, maxX: 20.5, minZ: -49, maxZ: -28.4 },
    { minX: 17, maxX: 36, minZ: -44, maxZ: -30 }
  ];
  const inTreeExcl = (x, z) =>
    TREE_EXCL.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  // v1.11 B1：pineGeometryMaterial 重做为 v2（枝轮参差下垂 + 树皮沟壑杆
  // + 断枝残桩）——杆几何 y∈[0,1] 归一，这里用 scale.y 接到冠底
  // （老版固定 1.6m 杆在大树上会与冠脱节露一段空档）。
  const { geo: pineGeo, mat: pineMat, trunkGeo, trunkMat } = pineGeometryMaterial();
  const COUNT = 340;
  // +1：孪生松 A/B 对照的运行时侧固定实例（见下——mesh 数零新增）
  const pines = new THREE.InstancedMesh(pineGeo, pineMat, COUNT + 1);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, COUNT + 1);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < COUNT && guard++ < 9000) {
    const a = Math.random() * Math.PI * 2;
    const r = 6 + Math.pow(Math.random(), 0.72) * 46;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const s = 0.8 + Math.random() * 2.4;
    // v1.11 B1 修正：退让边距随树体量走（大树站得更靠后）——
    // 老版一律 1.6m，贴路大树的冠垂到头部高度、走路一头扎进大面片里
    if (insideWalkable(x, z, 1.6 + s * 0.6) || inTreeExcl(x, z)) continue;
    dummy.position.set(x, 2.1 * s + 1.05, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    pines.setMatrixAt(placed, dummy.matrix);
    // 杆：贴地立起，顶端探进冠底 0.45m（冠底世界高 ≈ 0.55s+1.05）
    dummy.position.y = 0;
    dummy.scale.set(s * 1.05, 0.55 * s + 1.5, s * 1.05);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  // ---------- 孪生松（v1.14 门禁 67：Blender GLB 落厅 + A/B 对照） ----------
  // 林中岔路北缘外并肩两棵同高松（s=1.6 档，与 GLB 设计尺一致）：
  // 西边这棵是 DCC 管线松（gen_pine_tree.py 四拍精修 → GLB 经
  // GLTFLoader 进厅），东边那棵是运行时 kit.pineGeometryMaterial v3
  // 固定实例——站在石阵北望，同帧读两棵的差距。
  const AB_GLB = { x: 11.5, z: 15.6 };
  const AB_KIT = { x: 15.5, z: 15.8 };
  dummy.position.set(AB_KIT.x, 2.1 * 1.6 + 1.05, AB_KIT.z);
  dummy.scale.setScalar(1.6);
  dummy.rotation.y = 0.7;
  dummy.updateMatrix();
  pines.setMatrixAt(placed, dummy.matrix);
  dummy.position.y = 0;
  dummy.scale.set(1.6 * 1.05, 0.55 * 1.6 + 1.5, 1.6 * 1.05);
  dummy.updateMatrix();
  trunks.setMatrixAt(placed, dummy.matrix);
  placed++;
  pines.count = placed;
  trunks.count = placed;
  group.add(pines, trunks);
  // GLB 侧：材质克制按 STYLE_AUDIT v1.13 交接条目执行——哑光
  // roughness≥0.92 / envMapIntensity 0.25 / 零自发光 / metalness 0
  // （顶点色分层明暗是几何数据，保留）。摆动枢轴包住 GLB 根节点
  // （不碰导出器烘进根上的 Y-up 变换）。
  const pinePivot = new THREE.Group();
  pinePivot.position.set(AB_GLB.x, 0, AB_GLB.z);
  pinePivot.rotation.y = -0.35;
  group.add(pinePivot);
  const boughState = { t: -1 };
  const glbReady = new Promise((resolve) => {
    // electron sandbox 的 file:// 页面连 data: URI 的 fetch 都拦
    // （实测 TypeError: Failed to fetch）——绕开网络层：手动 base64
    // 解码成 ArrayBuffer 直接 parse
    const b64 = pineGlbUri.slice(pineGlbUri.indexOf(',') + 1);
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    new GLTFLoader().parse(buf.buffer, '', (gltf) => {
      gltf.scene.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material.roughness = Math.max(o.material.roughness ?? 1, 0.92);
          o.material.metalness = 0;
          o.material.envMapIntensity = 0.25;
          if (o.material.emissive) o.material.emissive.setScalar(0);
        }
      });
      pinePivot.add(gltf.scene);
      const trunkMesh = gltf.scene.getObjectByName('pineTrunk');
      if (trunkMesh) {
        // 零字幕交互（STYLE_AUDIT：新交互默认零字幕）：针叶簌簌即时、
        // 枝腰吱呀迟到一拍（错拍默认）——树不解释自己
        hotspots.add(trunkMesh, {
          hint: 'E — 孪生松',
          onActivate: () => {
            if (boughState.t >= 0) return;
            boughState.t = 0;
            audio.sfxAt('flutter', AB_GLB.x, AB_GLB.z, 0.5, 7);
            timers.push(setTimeout(() => audio.sfxAt('creak', AB_GLB.x, AB_GLB.z, 0.45, 9), 1300));
          }
        });
      }
      console.log('[sv] glb-landed twinpeaks pine');
      resolve(gltf.scene);
    }, (err) => {
      console.warn('[sv] glb-failed twinpeaks pine', err);
      resolve(null);
    });
  });
  updaters.push((dt) => {
    if (boughState.t < 0) return;
    boughState.t += dt;
    const u = boughState.t / 2.6;
    if (u >= 1) {
      boughState.t = -1;
      pinePivot.rotation.z = 0;
      pinePivot.rotation.x = 0;
      return;
    }
    const k = Math.sin(u * Math.PI * 3) * (1 - u) * 0.012;
    pinePivot.rotation.z = k;
    pinePivot.rotation.x = k * 0.6;
  });
  // 声先于形（STYLE_AUDIT 交接条目）：先给它一个远处的声音——
  // 每 40–75s 从孪生松方向传来一声枝腰吱呀，走近之前它已经在那里了
  const pineCreak = { next: 14 + Math.random() * 20 };
  updaters.push((dt) => {
    pineCreak.next -= dt;
    if (pineCreak.next <= 0) {
      pineCreak.next = 40 + Math.random() * 35;
      audio.sfxAt('creak', AB_GLB.x, AB_GLB.z, 0.32, 15);
    }
  });
  // v1.12 门禁 60：林地散布件——三根倒木（路侧可见、离步道 2.5m+ 不挡路）。
  // 每根：渐细主干斜卧微沉 + 厚端根盘（劈裂缘）+ 两根断枝残桩，
  // 复用树皮材质合并单 mesh（+1 mesh 零新材质）。
  const logR = rng(97);
  const logGeos = [];
  for (const [lx, lz, lyaw] of [[13.6, 16.8, 0.7], [2.6, -16.2, -0.9], [-9.2, -11.8, 2.3]]) {
    const len = 2.6 + logR() * 1.1;
    const rr = 0.13 + logR() * 0.05;
    const main = new THREE.CylinderGeometry(rr * 0.72, rr, len, 9, 1);
    main.rotateZ(Math.PI / 2); // 卧倒（沿 x）
    logGeos.push(xform(main, lx, rr * 0.62, lz, 0.04, lyaw, 0));
    // 厚端根盘：压扁的短锥（断根劈裂缘朝外）
    const root = new THREE.CylinderGeometry(rr * 2.1, rr * 1.5, 0.12, 9);
    root.rotateZ(Math.PI / 2);
    logGeos.push(xform(root,
      lx - Math.cos(lyaw) * (len / 2), rr * 1.15, lz + Math.sin(lyaw) * (len / 2),
      0.04, lyaw, 0.12));
    for (let bi = 0; bi < 2; bi++) { // 断枝残桩 ×2（朝上参差）
      const bl = 0.22 + logR() * 0.2;
      const stub = new THREE.CylinderGeometry(0.02, 0.038, bl, 5);
      stub.translate(0, bl / 2, 0);
      const along = (logR() - 0.5) * len * 0.6;
      logGeos.push(xform(stub,
        lx + Math.cos(lyaw) * along, rr * 1.1, lz - Math.sin(lyaw) * along,
        (logR() - 0.5) * 0.9, logR() * Math.PI, (logR() - 0.5) * 0.9));
    }
  }
  group.add(mergedMesh(logGeos, trunkMat));

  // ============================================================
  // ① 林间空地 —— 红帷幕之门
  // ============================================================
  const M = propMats();
  const gate = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 40),
    chevronMat('#0b0b0d', '#ded7c8', { repeat: 4, seed: 33 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  const gateMat = velvetMaterial(PALETTE.velvet);
  const curtainL = curtain(1.6, 3.6, PALETTE.velvet, 3, gateMat);
  curtainL.position.set(-0.85, 1.8, 0);
  const curtainR = curtain(1.6, 3.6, PALETTE.velvet, 3, gateMat);
  curtainR.position.set(0.85, 1.8, 0);
  // v1.12 D-14：楣幕顶缘收口——裸 curtain 的褶裥剖面在顶端直接断口，
  // 衬着夜空读成锯齿几何缺陷。加一根同料帘头卷（缝进顶边的卷边）
  // 并进楣幕单 mesh（tp 240 贴顶纪律，网格数守恒）
  const lintelSrc = curtain(3.6, 0.9, PALETTE.velvet, 6, gateMat);
  const lintelC = mergedMesh([
    xform(lintelSrc.geometry.clone(), 0, 0, 0),
    xform(new THREE.CapsuleGeometry(0.13, 3.42, 6, 12), 0, 0.46, 0.02, 0, 0, Math.PI / 2)
  ], gateMat);
  lintelSrc.geometry.dispose();
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
    nav: true,
    hint: 'E — 掀开帷幕，回到大厅',
    onActivate: () => goTo('lobby')
  });

  // 帷幕旁的黄铜档案铭牌（本厅唯一的档案入口，事实性文字）
  const brassTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#6b5232';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,240,210,0.9)';
    g.textAlign = 'center';
    g.font = '400 44px Georgia, serif';
    g.fillText('TWIN PEAKS', s / 2, s / 2 - 14);
    g.font = '28px "Courier New", monospace';
    g.fillText('1990 — 2017', s / 2, s / 2 + 36);
  });
  const brassPlate = roundedBoxMesh(0.62, 0.34, 0.03, 0.012,
    new THREE.MeshStandardMaterial({
      map: brassTex, roughness: 0.3, metalness: 0.85,
      emissive: 0xffe6b8, emissiveMap: brassTex, emissiveIntensity: 0.12
    }));
  const brassPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.045, 0.95, 10),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x584124, roughness: 0.4, metalness: 0.9 })
  );
  brassPost.position.set(2.9, 0.47, -4.5);
  brassPlate.position.set(2.9, 1.0, -4.5);
  brassPlate.rotation.set(-0.4, -2.4, 0);
  group.add(brassPost, brassPlate);
  hotspots.add(brassPlate, {
    hint: 'E — 《双峰》剧集档案',
    onActivate: () => ui.showFilm('twin-peaks')
  });

  // 树桩上的热咖啡
  // v1.11 B3：树桩 v2——侧面树皮沟壑、顶面年轮端面（偏心圈层 + 径向
  // 裂缝 + 边缘劈缺），CylinderGeometry 自带分组：侧/顶/底三材质单 mesh。
  const stumpRingTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#6b4d28';
    g.fillRect(0, 0, s, s);
    const cx = s * 0.46;
    const cy = s * 0.54; // 年轮偏心（树不是圆规画的）
    const r = rng(37);
    for (let i = 22; i >= 1; i--) {
      const rr = (i / 22) * s * 0.5 * (1 + (i % 3) * 0.012);
      g.fillStyle = i % 2
        ? `rgb(${96 + r() * 14 | 0},${70 + r() * 10 | 0},${40 + r() * 8 | 0})`
        : `rgb(${72 + r() * 10 | 0},${52 + r() * 8 | 0},${30 + r() * 6 | 0})`;
      g.beginPath();
      g.ellipse(cx, cy, rr, rr * 0.94, 0.15, 0, 7);
      g.fill();
    }
    g.strokeStyle = 'rgba(20,12,6,0.85)'; // 两道径向干裂
    g.lineWidth = 2.5;
    for (const a of [0.7, 3.6]) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * s * 0.52, cy + Math.sin(a) * s * 0.52);
      g.stroke();
    }
    g.fillStyle = 'rgba(30,18,9,0.9)'; // 边缘一口劈缺
    g.beginPath();
    g.ellipse(s * 0.88, s * 0.3, 13, 8, 0.6, 0, 7);
    g.fill();
  });
  const stumpBarkTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#241708';
    g.fillRect(0, 0, s, s);
    const r = rng(39);
    for (let i = 0; i < 36; i++) {
      const x = r() * s;
      g.fillStyle = `rgba(${52 + r() * 22 | 0},${34 + r() * 14 | 0},${18 + r() * 9 | 0},${0.5 + r() * 0.4})`;
      g.fillRect(x, 0, 2 + r() * 3, s);
    }
  }, 3, 1);
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 0.7, 16),
    [
      new THREE.MeshStandardMaterial({ map: stumpBarkTex, roughness: 0.95, bumpMap: stumpBarkTex, bumpScale: 0.5 }),
      new THREE.MeshStandardMaterial({ map: stumpRingTex, roughness: 0.85, bumpMap: stumpRingTex, bumpScale: 0.22 }),
      new THREE.MeshStandardMaterial({ color: 0x1a1108, roughness: 1 })
    ]
  );
  stump.position.set(3.8, 0.35, 3.2);
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.07, 0.14, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.35 })
  );
  cup.position.set(3.8, 0.77, 3.2);
  group.add(stump, cup);
  // v1.4 阶段 4：空地边缘的枯树桩鸮 —— 黑暗里两粒微光的眼睛；
  // E → 眼睛亮起、头无声地转过来对准你，一声近似翅膀的耳语（它先看见你的）
  const snag = new THREE.Group();
  // v1.11 B2：枯树桩 v2——不再是三根光滑圆柱。树皮沟壑贴图（map/bump
  // 同源，树洞暗斑直接画进贴图）；主干根部张开、顶端劈裂参差上刺
  // （断梢），主枝→次枝两级分枝层级。
  const snagBarkTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#181008';
    g.fillRect(0, 0, s, s);
    const r = rng(93);
    for (let i = 0; i < 40; i++) { // 竖向沟壑
      const x = r() * s;
      g.fillStyle = `rgba(${32 + r() * 22 | 0},${22 + r() * 14 | 0},${13 + r() * 9 | 0},${0.5 + r() * 0.4})`;
      g.fillRect(x, 0, 1 + r() * 3, s);
    }
    for (let i = 0; i < 40; i++) { // 横向皮鳞裂
      g.fillStyle = 'rgba(5,3,2,0.6)';
      g.fillRect(r() * s, r() * s, 2 + r() * 6, 1 + r() * 2);
    }
    // 树洞：一枚椭圆暗斑（洞缘略亮）
    g.fillStyle = 'rgba(46,32,18,0.9)';
    g.beginPath();
    g.ellipse(s * 0.32, s * 0.56, 9, 13, 0.2, 0, 7);
    g.fill();
    g.fillStyle = '#020101';
    g.beginPath();
    g.ellipse(s * 0.32, s * 0.56, 6.5, 10, 0.2, 0, 7);
    g.fill();
  });
  const barkMat = new THREE.MeshStandardMaterial({
    map: snagBarkTex, roughness: 0.95, bumpMap: snagBarkTex, bumpScale: 0.5
  });
  const snagTrunk = new THREE.CylinderGeometry(0.075, 0.16, 3.4, 10, 4, true);
  snagTrunk.translate(0, 1.7, 0);
  const sp = snagTrunk.attributes.position;
  for (let vi = 0; vi < sp.count; vi++) {
    const vx = sp.getX(vi);
    const vy = sp.getY(vi);
    const vz = sp.getZ(vi);
    const a = Math.atan2(vz, vx);
    const flare = 1 + Math.pow(Math.max(0, (0.6 - vy) / 0.6), 1.8) *
      (0.5 + 0.25 * Math.sin(a * 3 + 1.2) + 0.15 * Math.sin(a * 6 + 0.4));
    sp.setX(vi, vx * flare + Math.sin(vy * 1.1) * 0.03);
    sp.setZ(vi, vz * flare);
    if (vy > 3.2) { // 断梢：顶环角度函数参差（劈裂尖）
      sp.setY(vi, vy + 0.16 * Math.sin(a * 4 + 0.6) + 0.12 * Math.sin(a * 7 + 2.2));
    }
  }
  snagTrunk.computeVertexNormals();
  // 分枝层级：主枝两根（保持鸮的栖枝端点），各带一根次枝
  const snagGeos = [
    snagTrunk,
    xform(new THREE.CylinderGeometry(0.026, 0.048, 0.8, 7), 0.3, 2.9, 0.06, 0, 0, -1.15),
    xform(new THREE.ConeGeometry(0.013, 0.3, 5), 0.44, 3.16, 0.1, 0.5, 0, -0.5),
    xform(new THREE.CylinderGeometry(0.018, 0.036, 0.55, 7), -0.2, 2.45, -0.05, 0, 0, 1.05),
    xform(new THREE.ConeGeometry(0.011, 0.24, 5), -0.34, 2.62, -0.1, -0.4, 0, 0.9)
  ];
  snag.add(mergedMesh(snagGeos, barkMat));
  const owl = new THREE.Group();
  const owlBody = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0), new THREE.Vector2(0.09, 0.02), new THREE.Vector2(0.115, 0.12),
      new THREE.Vector2(0.095, 0.24), new THREE.Vector2(0.07, 0.3), new THREE.Vector2(0.075, 0.34),
      new THREE.Vector2(0.05, 0.38), new THREE.Vector2(0.001, 0.39)
    ], 12),
    new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.95 })
  );
  const tuftGeo = new THREE.ConeGeometry(0.018, 0.05, 6);
  owl.add(owlBody, mergedMesh([
    xform(tuftGeo, -0.045, 0.4, 0, 0, 0, 0.25),
    xform(tuftGeo, 0.045, 0.4, 0, 0, 0, -0.25)
  ], owlBody.material));
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x050403, emissive: 0xffb45e, emissiveIntensity: 1.15
  });
  const eyes = mergedMesh([
    xform(new THREE.SphereGeometry(0.02, 8, 6), -0.035, 0.315, 0.075),
    xform(new THREE.SphereGeometry(0.02, 8, 6), 0.035, 0.315, 0.075)
  ], eyeMat);
  owl.add(eyes);
  owl.position.set(0.62, 3.12, 0.12);
  owl.rotation.y = 0.5;
  snag.add(owl);
  snag.position.set(-6.3, 0, 5.7);
  group.add(snag);
  const owlState = { t: -1, blink: 0 };
  updaters.push((dt, t) => {
    // 偶发眨眼（微光一灭一亮）
    owlState.blink = Math.random() < dt * 0.12 ? 0.18 : Math.max(0, owlState.blink - dt);
    if (owlState.t < 0) {
      eyeMat.emissiveIntensity = owlState.blink > 0 ? 0.06 : 1.15 + Math.sin(t * 1.3) * 0.18;
      return;
    }
    owlState.t += dt;
    const k = owlState.t;
    if (k >= 3.2) { owlState.t = -1; return; }
    eyeMat.emissiveIntensity = 1.15 + Math.min(k * 6, 1) * 3.6 * Math.max(0, 1 - Math.max(0, k - 2.2));
    // 头（整只）无声转过来对准空地中心，再缓缓转回去
    const face = Math.atan2(6.3 - 0.62, -5.7 - 0.12);
    const aim = k < 2.2 ? face : 0.5;
    owl.rotation.y += (aim - owl.rotation.y) * Math.min(1, dt * (k < 0.6 ? 10 : 1.4));
  });
  hotspots.add(owlBody, {
    hint: 'E — 树梢上的一双眼睛',
    onActivate: () => {
      if (owlState.t < 0) owlState.t = 0;
      audio.sfxAt('flutter', -6.3, 5.7, 0.7, 5);
      setTimeout(() => audio.sfxAt('owl', -6.3, 5.7, 0.5, 6), 900);
      ui.caption('它先看见你的。', 3200);
    }
  });
  const cupSteam = smokeLayer(6, { x: 0.1, z: 0.1 }, { opacity: 0.06, size: 0.5, yBase: 0.9, ySpread: 0.5, color: 0xffffff });
  cupSteam.position.set(3.8, 0, 3.2);
  group.add(cupSteam);
  updaters.push(cupSteam.userData.update);
  hotspots.add(cup, {
    hint: 'E — 一杯还冒着热气的咖啡',
    onActivate: () => {
      audio.sfx('sip');
      ui.caption('热咖啡。趁热。', 3200);
    }
  });

  // v1.7 影片彩蛋：绒垫上供着一段原木——圆滑胶囊体 + 年轮端面
  // + 流苏绒垫（无角色形象，只有它本身）。E → 它轻轻晃一下，
  // 远处的鸮应了一声（它在听，也有话要转达）
  const logCushion = new THREE.Group();
  const cushion = roundedBoxMesh(0.62, 0.16, 0.46, 0.06,
    new THREE.MeshStandardMaterial({ color: 0x3a1020, roughness: 0.92 }));
  cushion.position.y = 0.1;
  const tasselGeo = new THREE.SphereGeometry(0.022, 8, 6);
  logCushion.add(cushion, mergedMesh([
    xform(tasselGeo, -0.31, 0.06, 0.23), xform(tasselGeo, 0.31, 0.06, 0.23),
    xform(tasselGeo, -0.31, 0.06, -0.23), xform(tasselGeo, 0.31, 0.06, -0.23)
  ], new THREE.MeshStandardMaterial({ color: 0x8a6c3c, roughness: 0.5, metalness: 0.6 })));
  const logPivot = new THREE.Group();
  const logBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.085, 0.34, 6, 18),
    new THREE.MeshStandardMaterial({
      map: woodTexture({ base: [52, 34, 18], planks: 1, size: 128 }), roughness: 0.9
    })
  );
  logBody.rotation.z = Math.PI / 2;
  // 年轮端面（一圈圈同心线）
  const ringTex = canvasTexture(64, (g, s) => {
    g.fillStyle = '#c9a878';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(90,58,30,0.55)';
    for (let r = 4; r < 30; r += 4.5) {
      g.lineWidth = 1 + (r % 9 < 4 ? 0.8 : 0);
      g.beginPath();
      g.arc(s / 2 + 2, s / 2 - 1, r, 0, Math.PI * 2);
      g.stroke();
    }
  });
  const ringFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.082, 20),
    new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.85 })
  );
  ringFace.position.x = 0.256;
  ringFace.rotation.y = Math.PI / 2;
  logPivot.add(logBody, ringFace);
  logPivot.position.y = 0.24;
  logCushion.add(logPivot);
  logCushion.position.set(5.4, 0, 0.9);
  logCushion.rotation.y = -0.5;
  group.add(logCushion);
  const logState = { t: -1 };
  updaters.push((dt) => {
    if (logState.t < 0) return;
    logState.t += dt;
    const u = logState.t;
    if (u > 2.6) { logState.t = -1; logPivot.rotation.x = 0; return; }
    logPivot.rotation.x = Math.sin(u * 7) * 0.09 * Math.exp(-u * 1.6);
  });
  hotspots.add(logBody, {
    hint: 'E — 绒垫上的一段原木',
    onActivate: () => {
      if (logState.t < 0) logState.t = 0;
      audio.sfxAt('creak', 5.4, 0.9, 0.3, 3);
      setTimeout(() => audio.sfxAt('owl', -6.3, 5.7, 0.4, 6), 1100);
      ui.caption('它在听。', 3200);
    }
  });

  // ============================================================
  // v1.9 二级细节·twinpeaks 件 2：柴堆与斧（锯木厂语言落到近景）——
  // 双立桩夹住三层劈柴（树皮筒身 + 年轮端面朝人）+ 砧木 +
  // 嵌在砧木里的斧（楔形头+微弯柄）。E → 顶上一根滚了半圈。
  // ============================================================
  const woodpile = new THREE.Group();
  {
    const barkMat = new THREE.MeshStandardMaterial({
      map: woodTexture({ base: [40, 26, 14], vary: 16, planks: 1, size: 128, seed: 91 }), roughness: 0.95
    });
    // 端面共用年轮贴图但整体压暗（夜林里不许发白）
    const cutMat = new THREE.MeshStandardMaterial({ map: ringTex, color: 0x8f7c60, roughness: 0.88 });
    const wpRng = rng(58);
    const barkGeos = [];
    const cutGeos = [];
    // 三层柴（4+3+2），轴向 X、端面朝东（面向空地中心）
    const layers = [[4, 0.105], [3, 0.215], [2, 0.325]];
    let topLog = null;
    for (const [li, [n, y]] of layers.entries()) {
      for (let i = 0; i < n; i++) {
        const r0 = 0.075 + wpRng() * 0.02;
        const len = 0.5 + wpRng() * 0.08;
        const z0 = (i - (n - 1) / 2) * 0.185 + (wpRng() - 0.5) * 0.02;
        const x0 = (wpRng() - 0.5) * 0.06;
        const bark = xform(new THREE.CylinderGeometry(r0, r0, len, 10, 1, true), x0, y, z0, 0, 0, Math.PI / 2);
        barkGeos.push(bark);
        cutGeos.push(xform(new THREE.CircleGeometry(r0 * 0.96, 12), x0 + len / 2 + 0.002, y, z0, 0, Math.PI / 2, 0));
        cutGeos.push(xform(new THREE.CircleGeometry(r0 * 0.96, 12), x0 - len / 2 - 0.002, y, z0, 0, -Math.PI / 2, 0));
        if (li === 2 && i === 0) topLog = { x: x0, y, z: z0, r: r0, len };
      }
    }
    // v1.15「先合并再新增」：砧木顶面（同 cutMat 的静件）并进端面
    // 合并组——twinpeaks 245/250 贴顶，新蛋的预算从合并里来
    cutGeos.push(xform(new THREE.CircleGeometry(0.165, 14), 0.02, 0.502, 0.95, -Math.PI / 2, 0, 0));
    woodpile.add(mergedMesh(barkGeos, barkMat), mergedMesh(cutGeos, cutMat));
    // 双立桩（防散）+ 砧木（前侧独立一墩）
    woodpile.add(mergedMesh([
      xform(new THREE.CylinderGeometry(0.03, 0.038, 0.62, 8), 0, 0.31, -0.46),
      xform(new THREE.CylinderGeometry(0.03, 0.038, 0.62, 8), 0, 0.31, 0.46),
      xform(new THREE.CylinderGeometry(0.17, 0.19, 0.5, 12), 0.02, 0.25, 0.95)
    ], barkMat));
    // 斧：楔形头（缩放盒）+ 刃口亮线 + 微斜木柄——嵌进砧木顶
    const axe = new THREE.Group();
    const axeHead = mergedMesh([
      xform(new THREE.BoxGeometry(0.05, 0.12, 0.16), 0, 0, 0),
      xform(new THREE.BoxGeometry(0.012, 0.1, 0.17), 0, -0.01, 0.01)
    ], new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(), color: 0x777d84, roughness: 0.4, metalness: 0.9
    }));
    axeHead.position.set(0, 0.05, 0);
    const axeHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.72, 8),
      new THREE.MeshStandardMaterial({
        map: woodTexture({ base: [70, 48, 26], planks: 1, size: 128, seed: 92 }), roughness: 0.7
      })
    );
    axeHandle.position.set(0, 0.3, -0.14);
    axeHandle.rotation.x = 0.42;
    axe.add(axeHead, axeHandle);
    axe.position.set(0.02, 0.52, 0.95);
    axe.rotation.set(-0.08, 0.5, 0.06);
    woodpile.add(axe);
    // 顶上那根：E → 滚小半圈又晃停（woodknock 三连磕）
    const rollPivot = new THREE.Group();
    rollPivot.position.set(topLog.x, topLog.y, topLog.z);
    const rollLog = new THREE.Mesh(new THREE.CylinderGeometry(topLog.r, topLog.r, topLog.len, 10, 1, true), barkMat);
    rollLog.rotation.z = Math.PI / 2;
    // v1.15「先合并再新增」：双端盖同料同枢轴——并单 mesh（−1）
    const rollCaps = mergedMesh([
      xform(new THREE.CircleGeometry(topLog.r * 0.96, 12), topLog.len / 2 + 0.002, 0, 0, 0, Math.PI / 2, 0),
      xform(new THREE.CircleGeometry(topLog.r * 0.96, 12), -topLog.len / 2 - 0.002, 0, 0, 0, -Math.PI / 2, 0)
    ], cutMat);
    rollPivot.add(rollLog, rollCaps);
    rollPivot.position.y += 0.11; // 顶层再叠一根（第 4 层单根，E 的主角）
    woodpile.add(rollPivot);
    const rollState = { t: -1 };
    updaters.push((dt) => {
      if (rollState.t < 0) return;
      rollState.t += dt;
      const u = rollState.t;
      if (u > 2.2) { rollState.t = -1; return; }
      // 前 0.5s 滚出小半圈 + 位移，之后原地晃停
      const k = Math.min(1, u / 0.5);
      rollPivot.rotation.x = k * 1.7 + Math.sin(Math.max(0, u - 0.5) * 9) * 0.06 * Math.exp(-(u - 0.5) * 2.4);
      rollPivot.position.z = topLog.z + k * 0.1;
    });
    hotspots.add(rollLog, {
      hint: 'E — 劈好的柴垛',
      onActivate: () => {
        if (rollState.t < 0) {
          rollState.t = 0;
          rollPivot.rotation.x = 0;
          rollPivot.position.z = topLog.z;
        }
        audio.sfxAt('woodknock', -7.2, 0.6, 0.7);
        ui.caption('柴是新劈的。斧口还没凉。', 3600);
      }
    });
  }
  woodpile.position.set(-7.2, 0, 0.6);
  woodpile.rotation.y = 0.35;
  group.add(woodpile);

  // v1.15 彩蛋三批（门禁 73）：柴堆脚边一颗松果——磕在垛上（woodknock
  // 轻声即时 + 小弹跳），2.2s 后林海极深处回两记 replytap（远声应答
  // 谱系：林子那头的应答与档案风道、锅炉房对讲管是同一副 D3-F3——
  // 每个厅的「另一边」都是同一个另一边）。可重复、无永久态、零字幕。
  const coneRng = rng(57);
  const pineGeos = [xform(new THREE.CylinderGeometry(0.008, 0.012, 0.03, 6), 0, 0.115, 0)];
  for (let ring = 0; ring < 4; ring++) {
    const ry = 0.022 + ring * 0.026;
    const rr = [0.034, 0.044, 0.042, 0.03][ring];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + ring * 0.5;
      pineGeos.push(xform(
        new THREE.BoxGeometry(0.024, 0.008, 0.036),
        Math.cos(a) * rr, ry, Math.sin(a) * rr,
        0.9 + (coneRng() - 0.5) * 0.3, -a + Math.PI / 2, 0
      ));
    }
  }
  const pinecone = mergedMesh(pineGeos, new THREE.MeshStandardMaterial({
    color: 0x4a3320, roughness: 0.95
  }));
  pinecone.position.set(-6.28, 0.012, 1.62);
  pinecone.rotation.set(0.24, 1.3, 0.1);
  group.add(pinecone);
  const coneState = { t: -1, wait: 0 };
  updaters.push((dt) => {
    if (coneState.t >= 0) { // 小弹跳（0.45s 抛物线 + 翻滚，落回原位）
      coneState.t += dt;
      const u = coneState.t / 0.45;
      if (u >= 1) {
        coneState.t = -1;
        pinecone.position.set(-6.28, 0.012, 1.62);
        pinecone.rotation.set(0.24, 1.3, 0.1);
      } else {
        pinecone.position.y = 0.012 + Math.sin(u * Math.PI) * 0.14;
        pinecone.rotation.x = 0.24 + u * 4.2;
      }
    }
    if (coneState.wait > 0) {
      coneState.wait -= dt;
      if (coneState.wait <= 0) audio.sfxAt('replytap', -20, -16, 0.5, 26);
    }
  });
  hotspots.add(pinecone, {
    hint: 'E — 一颗松果',
    onActivate: () => {
      if (coneState.t >= 0 || coneState.wait > 0) return;
      coneState.t = 0.001;
      audio.sfxAt('woodknock', -6.9, 1.3, 0.3, 3);
      coneState.wait = 2.2;
    }
  });

  // 本厅唯一引语立牌（走近才显影）
  const q1 = quoteStand(quoteById('darkness'), '#3fae6a');
  q1.position.set(-4.6, 0, 5.2);
  q1.rotation.y = 0.9;
  group.add(q1);
  updaters.push(quoteStandUpdater(q1, player, ui, {
    narration: ctx.narration, docent: DOCENT.darkness, docent2: DOCENT.darkness2
  }));
  hotspots.add(q1.userData.board, {
    hint: 'E — 他自己的话',
    onActivate: () => ui.showQuotes()
  });

  // 地表雾 + 萤火（v1.9 B2：林间地雾随呼吸相位起伏）
  const fogLayer = smokeLayer(120, { x: 70, z: 70 }, { opacity: 0.045, size: 17, yBase: 0.25, ySpread: 1.2, color: 0x8da4ad });
  group.add(fogLayer);
  updaters.push(fogLayer.userData.update);
  updaters.push(() => {
    fogLayer.material.opacity = 0.045 * (1 + engine.breath * 0.3);
  });
  // v1.4 六遍：萤火虫 v2——从「发光的灰」升级成真萤火：每只有自己的闪烁相位
  // （sin^8 尖脉冲、几秒一亮）+ 低空慢游走（不再像灰尘那样往下落）
  const ffCount = 44;
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(ffCount * 3);
  const ffSeed = [];
  const ffR = rng(97);
  for (let i = 0; i < ffCount; i++) {
    const a = ffR() * Math.PI * 2;
    const r = 3 + ffR() * 18;
    ffPos[i * 3] = Math.cos(a) * r;
    ffPos[i * 3 + 1] = 0.35 + ffR() * 1.4;
    ffPos[i * 3 + 2] = Math.sin(a) * r;
    ffSeed.push({
      w: 0.9 + ffR() * 1.6, p: ffR() * Math.PI * 2,
      vx: (ffR() - 0.5) * 0.3, vz: (ffR() - 0.5) * 0.3, vy: ffR() * Math.PI * 2
    });
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  ffGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ffCount * 3), 3));
  const ffTex = canvasTexture(32, (g, s) => {
    const rad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rad.addColorStop(0, 'rgba(255,255,255,1)');
    rad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, s, s);
  });
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({
    size: 0.14, transparent: true, vertexColors: true, map: ffTex,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  group.add(fireflies);
  const freeze = { on: false };
  updaters.push((dt, t) => {
    if (freeze.on) return;
    const p = ffGeo.attributes.position;
    const c = ffGeo.attributes.color;
    for (let i = 0; i < ffCount; i++) {
      const s2 = ffSeed[i];
      p.array[i * 3] += Math.sin(t * 0.23 + s2.p * 3) * s2.vx * dt;
      p.array[i * 3 + 1] += Math.sin(t * 0.5 + s2.vy) * dt * 0.06;
      p.array[i * 3 + 2] += Math.cos(t * 0.19 + s2.p * 2) * s2.vz * dt;
      const pulse = Math.max(0, Math.sin(t * s2.w + s2.p)) ** 8;
      let k2 = 0.06 + pulse * 0.94;
      // v1.9 抛光第 4 遍：萤火怕人——离玩家 3.2m 内按距离平方压暗，
      // 免得游到镜头跟前糊成一团绿斑（sizeAttenuation 下近点会撑得很大）
      const fdx = p.array[i * 3] - player.x;
      const fdz = p.array[i * 3 + 2] - player.z;
      const near = Math.min(1, (fdx * fdx + fdz * fdz) / 10.24);
      k2 *= near * near;
      c.array[i * 3] = 0.75 * k2;
      c.array[i * 3 + 1] = k2;
      c.array[i * 3 + 2] = 0.55 * k2;
    }
    p.needsUpdate = true;
    c.needsUpdate = true;
  });

  // ============================================================
  // ② 红房间氛围区（几何抽象：折线地板 + 红帷幕 + 扶手椅）
  // ============================================================
  const redRoom = new THREE.Group();
  redRoom.position.set(-20, 0, -16);
  const rrFloor = new THREE.Mesh(
    new THREE.CircleGeometry(6.0, 44),
    chevronMat('#0b0b0d', '#ded7c8', { repeat: 5, seed: 34 })
  );
  rrFloor.rotation.x = -Math.PI / 2;
  rrFloor.position.y = 0.015;
  redRoom.add(rrFloor);
  // 围合帷幕（朝小径方向留缺口）
  const entryA = Math.atan2(8, 6); // 指向小径
  const gapArc = 0.72;
  redRoom.add(curtainRing(5.7, 5.2, PALETTE.velvet, 16, Math.PI * 2 - gapArc, entryA + gapArc / 2));
  // 两把相对而坐的俱乐部椅（环抱弧背 + 通道软包 + 卷臂）
  const chairA = clubChair(0x2a0e16, { mats: M });
  chairA.position.set(-1.5, 0, 0.6);
  chairA.rotation.y = Math.PI / 2 + 0.25;
  const chairB = clubChair(0x120c16, { mats: M });
  chairB.position.set(1.6, 0, -0.5);
  chairB.rotation.y = -Math.PI / 2 - 0.2;
  redRoom.add(chairA, chairB);
  // 落地灯 v2（v1.9 二级细节·twinpeaks 件 1）——可开关，房间的两副面孔。
  // 车削黄铜灯身（三层踏座+束腰立杆+中膝球）+ 丝罩（织物微透光）+
  // 罩沿一圈流苏穗（22 支小锥错落）+ 顶针 finial + 黄铜拉链（开关时荡起来）
  const rrLamp = new THREE.Group();
  const rrBrass = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x6b5232, roughness: 0.35, metalness: 0.9, envMapIntensity: 1.1
  });
  rrLamp.add(new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.19, 0), new THREE.Vector2(0.17, 0.02), new THREE.Vector2(0.12, 0.05),
      new THREE.Vector2(0.1, 0.07), new THREE.Vector2(0.05, 0.1), new THREE.Vector2(0.02, 0.14),
      new THREE.Vector2(0.016, 0.8), new THREE.Vector2(0.045, 0.88), new THREE.Vector2(0.016, 0.96),
      new THREE.Vector2(0.014, 1.62), new THREE.Vector2(0.03, 1.66), new THREE.Vector2(0.012, 1.7)
    ], 18),
    rrBrass
  ));
  // v1.12 D-12：丝罩透光改竖向渐变（灯泡高度最亮、上下沿收暗）+
  // 绢面拼幅缝 8 道——此前 0.7 平铺整罩被 bloom 读成发光块，
  // 流苏穗全部淹没在辉光里（光克制审视项）
  const rrShadeGlowTex = canvasTexture(64, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#5a4830');
    grad.addColorStop(0.42, '#ffe2b0');
    grad.addColorStop(0.72, '#c9a878');
    grad.addColorStop(1, '#6e5638');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(60,44,24,0.55)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo((i / 8) * s, 0);
      g.lineTo((i / 8) * s, s);
      g.stroke();
    }
  });
  const rrShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.31, 0.3, 18, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xd8ccb2, roughness: 0.82, side: THREE.DoubleSide,
      emissive: 0xffffff, emissiveMap: rrShadeGlowTex, emissiveIntensity: 0.5
    })
  );
  rrShade.position.y = 1.78;
  rrLamp.add(rrShade);
  // 流苏穗圈：罩沿下 22 支收尖小锥（错落长短），跟一圈细束绳
  const rrFringeGeos = [xform(new THREE.TorusGeometry(0.312, 0.006, 6, 24), 0, 1.632, 0, Math.PI / 2, 0, 0)];
  const rrFrRng = rng(77);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    rrFringeGeos.push(xform(
      new THREE.LatheGeometry([
        new THREE.Vector2(0.007, 0), new THREE.Vector2(0.01, -0.02),
        new THREE.Vector2(0.006, -0.05 - rrFrRng() * 0.02), new THREE.Vector2(0.001, -0.062 - rrFrRng() * 0.02)
      ], 6),
      Math.cos(a) * 0.312, 1.63, Math.sin(a) * 0.312
    ));
  }
  const rrFringe = mergedMesh(rrFringeGeos, new THREE.MeshStandardMaterial({
    color: 0xc9b087, roughness: 0.7, metalness: 0.12
  }));
  rrLamp.add(rrFringe);
  // 顶针 + 拉链（链坠开关时荡）
  rrLamp.add(new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.02, 1.93), new THREE.Vector2(0.028, 1.96), new THREE.Vector2(0.008, 2.0),
      new THREE.Vector2(0.001, 2.02)
    ], 10),
    rrBrass
  ));
  const rrChain = new THREE.Group();
  rrChain.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.0035, 0.0035, 0.1, 6), 0, -0.05, 0),
    xform(new THREE.SphereGeometry(0.012, 8, 6), 0, -0.115, 0)
  ], rrBrass));
  rrChain.position.set(0.16, 1.66, 0.1);
  rrLamp.add(rrChain);
  rrLamp.position.set(0.2, 0, -2.2);
  redRoom.add(rrLamp);
  const rrLampLight = new THREE.PointLight(0xffd9a8, 7, 10, 1.7);
  rrLampLight.position.set(0.2, 1.7, -2.2);
  const rrRedWash = new THREE.PointLight(0xd4243c, 9, 13, 1.6);
  rrRedWash.position.set(0, 3.6, 0);
  redRoom.add(rrLampLight, rrRedWash);
  const rrState = { warm: 1, chain: 0 };
  updaters.push((dt, t) => {
    const f = 1 + Math.sin(t * 6.2) * 0.05;
    rrLampLight.intensity = 7 * f * rrState.warm;
    rrShade.material.emissiveIntensity = 0.7 * Math.max(rrState.warm, 0.04);
    rrRedWash.intensity = rrState.warm > 0.5 ? 9 : 20 + Math.sin(t * 2.1) * 5;
    // 拉链余荡（拉一下后指数衰减）+ 流苏永远差半拍跟着晃
    if (rrState.chain > 0) rrState.chain = Math.max(0, rrState.chain - dt * 0.55);
    rrChain.rotation.z = Math.sin(t * 9.2) * 0.5 * rrState.chain;
    rrChain.rotation.x = Math.sin(t * 7.7 + 0.6) * 0.35 * rrState.chain;
    rrFringe.rotation.y = Math.sin(t * 1.1) * 0.01 + Math.sin(t * 8.4 - 0.5) * 0.02 * rrState.chain;
  });
  hotspots.add(rrShade, {
    hint: 'E — 落地灯',
    onActivate: () => {
      rrState.warm = rrState.warm ? 0 : 1;
      rrState.chain = 1;
      audio.sfx(rrState.warm ? 'lampon' : 'lampoff');
    }
  });
  // 两椅之间的独脚小圆桌 + 一杯没主的咖啡
  const rrPedestal = new THREE.LatheGeometry([
    new THREE.Vector2(0.24, 0), new THREE.Vector2(0.22, 0.02), new THREE.Vector2(0.09, 0.06),
    new THREE.Vector2(0.045, 0.14), new THREE.Vector2(0.06, 0.3), new THREE.Vector2(0.04, 0.46),
    new THREE.Vector2(0.13, 0.58), new THREE.Vector2(0.14, 0.61)
  ], 16);
  const rrTableGeos = [
    xform(rrPedestal, 0.05, 0, 0.1),
    xform(new THREE.CylinderGeometry(0.31, 0.29, 0.03, 22), 0.05, 0.625, 0.1),
    xform(new THREE.TorusGeometry(0.3, 0.014, 6, 26), 0.05, 0.64, 0.1, Math.PI / 2, 0, 0)
  ];
  redRoom.add(mergedMesh(rrTableGeos, new THREE.MeshStandardMaterial({
    color: 0x120b0e, roughness: 0.3, metalness: 0.1, envMapIntensity: 1.3
  })));
  rrPedestal.dispose();
  const rrCupGeos = [
    xform(new THREE.CylinderGeometry(0.075, 0.09, 0.012, 14), 0.05, 0.648, 0.1),
    xform(new THREE.CylinderGeometry(0.046, 0.038, 0.07, 12), 0.05, 0.684, 0.1),
    xform(new THREE.TorusGeometry(0.03, 0.009, 6, 12), 0.105, 0.684, 0.1)
  ];
  const rrCup = mergedMesh(rrCupGeos, new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.28 }));
  redRoom.add(rrCup);
  const rrSteam = smokeLayer(4, { x: 0.1, z: 0.1 }, { opacity: 0, size: 0.26, yBase: 0, ySpread: 0.34, color: 0xd8dee4 });
  rrSteam.position.set(0.05, 0.72, 0.1);
  redRoom.add(rrSteam);
  updaters.push(rrSteam.userData.update);
  const rrCupState = { warm: 0 };
  updaters.push((dt) => {
    if (rrCupState.warm > 0) rrCupState.warm -= dt * 0.3;
    rrSteam.material.opacity = Math.max(0, Math.min(rrCupState.warm, 1)) * 0.32;
  });
  hotspots.add(rrCup, {
    hint: 'E — 桌上的咖啡',
    onActivate: () => {
      rrCupState.warm = 1.5;
      audio.sfxAt('sip', -19.95, -15.9, 0.6, 3);
      ui.caption('不知道是谁的。还热。', 3600);
    }
  });
  // ---------- v1.11 门禁 57：椅臂上的另一杯（不认重力的咖啡） ----------
  // 扶手椅臂上还搁着一杯——桌上那杯还热，这杯从来不冒气。
  // E → 杯身缓缓倾斜 30°，而**液面纹丝不动地跟着杯壁走**（它凝住了），
  // 停一拍，再自己缓缓立回来 + 一声逆放式音（reversecup）。
  // 杯体两材质合一 mesh（groups：瓷 + 咖啡面），碟静杯动。
  {
    const ARM_A = Math.PI - 1.06; // chairB 卷臂中段（迎小径入口的那只臂）
    const armX = Math.sin(ARM_A) * 0.395;
    const armZ = Math.cos(ARM_A) * 0.395;
    const fcGrp = new THREE.Group();
    fcGrp.position.set(armX, 0.598, armZ);
    chairB.add(fcGrp);
    const porcelain = new THREE.MeshStandardMaterial({
      color: 0xe8e2d5, roughness: 0.28, side: THREE.DoubleSide
    });
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.011, 14), porcelain);
    saucer.position.y = 0.0055;
    fcGrp.add(saucer);
    // 杯枢轴设在杯底缘（倾斜时像沿杯沿一点起翘，而非绕杯心打转）
    const cupPivot = new THREE.Group();
    cupPivot.position.set(0.03, 0.011, 0);
    fcGrp.add(cupPivot);
    const cupParts = mergeGeometries([
      xform(new THREE.CylinderGeometry(0.044, 0.036, 0.068, 14, 1, true), -0.03, 0.034, 0),
      xform(new THREE.CircleGeometry(0.0365, 14), -0.03, 0.004, 0, -Math.PI / 2, 0, 0),
      xform(new THREE.TorusGeometry(0.026, 0.0075, 6, 12), -0.082, 0.036, 0)
    ], false);
    // 凝固的咖啡面：亚光深棕圆片，贴在杯口下一点（跟杯走是全部戏眼）
    const solidCoffee = xform(new THREE.CircleGeometry(0.0405, 14), -0.03, 0.052, 0, -Math.PI / 2, 0, 0);
    const cupGeo = mergeGeometries([cupParts, solidCoffee], true);
    const cup = new THREE.Mesh(cupGeo, [
      porcelain,
      new THREE.MeshStandardMaterial({ color: 0x140b06, roughness: 0.55 })
    ]);
    cupPivot.add(cup);
    // 世界坐标（redRoom → world）：sfxAt 用
    const fcWorld = new THREE.Vector3();
    // v1.11 P18：每次立回，杯**放不回原来的朝向**——方位角悄悄多转
    // 3–7°（seeded，正负交替带偏置），杯柄慢慢指向别处；上限 ±20°
    // 不夸张。红房间的东西没有一件在你以为的原位上。零预算纯标量。
    const fcRng = rng(113);
    const fcState = { t: -1, yaw: 0 };
    updaters.push((dt) => {
      if (fcState.t < 0) return;
      fcState.t += dt;
      const u = fcState.t;
      let a;
      if (u < 0.9) a = (1 - Math.cos(Math.min(1, u / 0.9) * Math.PI)) / 2; // 缓起
      else if (u < 2.4) a = 1 + Math.sin((u - 0.9) * 11) * 0.012 * Math.exp(-(u - 0.9) * 2); // 定住微颤
      else if (u < 3.8) a = (1 + Math.cos(Math.min(1, (u - 2.4) / 1.4) * Math.PI)) / 2; // 缓缓立回
      else {
        a = 0;
        fcState.t = -1;
        const drift = (0.05 + fcRng() * 0.07) * (fcRng() < 0.42 ? -1 : 1);
        fcState.yaw = Math.max(-0.35, Math.min(0.35, fcState.yaw + drift));
        cupPivot.rotation.y = fcState.yaw;
      }
      cupPivot.rotation.z = -0.52 * a; // 30°——液面是杯的一部分，跟着走
    });
    hotspots.add(cup, {
      hint: 'E — 椅臂上的咖啡',
      onActivate: () => {
        if (fcState.t >= 0) return;
        fcState.t = 0;
        fcGrp.getWorldPosition(fcWorld);
        audio.sfxAt('reversecup', fcWorld.x, fcWorld.z, 0.55, 2.5);
        ui.caption('这一杯不会洒。', 3600);
      }
    });
  }
  // v1.9 抛光第 9 遍·幕后的怪谈：人在红房间里待着，每 55–100s
  // 有什么东西贴着帷幕外侧走过一段——布被从外面顶出一道人形的鼓，
  // 慢慢挪过去又平回去（同料绒布椭球从褶皱里长出来，抽象无面目）。
  // 只在你在场时发生：没人看，它不走。
  // 与幕布同料同色——读出来靠的是「平滑鼓面打断褶皱节奏」，不是换色
  const rrWalker = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 18), gateMat);
  rrWalker.scale.set(0.05, 0.85, 0.3);
  rrWalker.visible = false;
  redRoom.add(rrWalker);
  const rrWalk = { timer: 26 + Math.random() * 38, t: -1, phi0: 0, dir: 1, said: false };
  const RR_WALK_DUR = 5.2;
  updaters.push((dt) => {
    if (rrWalk.t < 0) {
      if (Math.hypot(player.x + 20, player.z + 16) > 5.6) return;
      rrWalk.timer -= dt;
      if (rrWalk.timer > 0) return;
      rrWalk.timer = 55 + Math.random() * 45;
      rrWalk.t = 0;
      rrWalk.dir = Math.random() < 0.5 ? -1 : 1;
      // 走段收在帷幕弧内（小径缺口两侧各留 0.35rad 安全边）
      const a0 = entryA + gapArc / 2;
      const span = Math.PI * 2 - gapArc;
      rrWalk.phi0 = a0 + 0.35 + Math.random() * (span - 0.7 - 1.5);
      if (rrWalk.dir < 0) rrWalk.phi0 += 1.5;
      rrWalker.visible = true;
      audio.sfxAt('tassel',
        -20 + Math.cos(rrWalk.phi0) * 5.45, -16 + Math.sin(rrWalk.phi0) * 5.45, 0.24, 6);
      if (!rrWalk.said) {
        rrWalk.said = true;
        ui.caption('有东西贴着布走。', 3800);
      }
      return;
    }
    const pPrev = rrWalk.t / RR_WALK_DUR;
    rrWalk.t += dt;
    const p = Math.min(1, rrWalk.t / RR_WALK_DUR);
    const phi = rrWalk.phi0 + rrWalk.dir * 1.5 * p;
    // 两端从布里长出来再沉回去；中途带一点走路的起伏
    const swell = Math.min(1, Math.min(p, 1 - p) * 5.5);
    rrWalker.position.set(
      Math.cos(phi) * 5.5, 1.0 + Math.sin(rrWalk.t * 5.8) * 0.04, Math.sin(phi) * 5.5);
    rrWalker.rotation.y = -phi;
    rrWalker.scale.set(0.05 + 0.21 * swell, 0.85, 0.3);
    if (pPrev < 0.48 && p >= 0.48) {
      audio.sfxAt('tassel', -20 + Math.cos(phi) * 5.45, -16 + Math.sin(phi) * 5.45, 0.2, 6);
    }
    if (p >= 1) { rrWalk.t = -1; rrWalker.visible = false; }
  });
  group.add(redRoom);

  // ============================================================
  // ③ 小镇夜街 + DINER 柜台一角
  // ============================================================
  const town = new THREE.Group();
  // 沥青街道（v1.3 三通道：雨后微湿 —— 车辙低粗糙度反光 + 骨料法线）
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 20),
    asphaltMat({ seed: 17, repX: 1, repY: 6, wet: 0.75 })
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(21.5, 0.015, -7);
  town.add(street);
  // 人行道
  const sidewalk = roundedBoxMesh(2.2, 0.12, 20, 0.03,
    new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.85 }));
  sidewalk.position.set(26.2, 0.06, -7);
  town.add(sidewalk);

  // 路灯 v2 ×2（凹槽柱 + 曲臂 + 泪滴灯头）
  const townLamps = [];
  for (const [x, z] of [[18.5, -1], [18.5, -12]]) {
    const lamp = streetLampV2({ mats: M });
    lamp.position.set(x, 0, z);
    town.add(lamp);
    const cone = lightCone(0.3, 2.1, 4.2, 0xffd9a8, 0.05);
    cone.position.set(x + lamp.userData.headX, 2.15, z);
    town.add(cone);
    townLamps.push({ bulbMat: lamp.userData.bulbMat, light: lamp.userData.light });
  }
  updaters.push((dt, t) => {
    for (const [i, L] of townLamps.entries()) {
      const f = Math.sin(t * 14 + i * 5) > 0.94 ? 0.3 : 1;
      L.light.intensity = 8 * f;
      L.bulbMat.emissiveIntensity = 3 * f;
    }
  });

  // 悬挂信号灯（吊索横跨街道；夜间闪黄模式，可用 E 换灯）
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 8.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 })
  );
  cable.rotation.z = Math.PI / 2;
  cable.position.set(21.9, 5.0, -4.2);
  town.add(cable);
  const signal = trafficLight({ mats: M });
  signal.position.set(21.5, 4.55, -4.2);
  signal.rotation.y = Math.PI / 2;
  town.add(signal);
  const sigState = { blink: true, t: 0, phase: 1 };
  updaters.push((dt) => {
    if (!sigState.blink) return;
    sigState.t += dt;
    // 深夜闪黄：亮 0.7s / 灭 0.7s
    const on = Math.floor(sigState.t / 0.7) % 2 === 0;
    signal.userData.lampMats.forEach((m, k) => {
      m.emissiveIntensity = k === 1 && on ? 2.2 : 0.12;
    });
    signal.userData.light.color.set(signal.userData.lampCols[1]);
    signal.userData.light.intensity = on ? 3 : 0.2;
  });
  hotspots.add(signal.userData.box, {
    hint: 'E — 信号灯',
    onActivate: () => {
      sigState.blink = false;
      sigState.phase = (sigState.phase + 1) % 3;
      signal.userData.setPhase(sigState.phase);
      signal.userData.light.intensity = 3;
      audio.sfxAt('switch', 21.5, -4.2, 0.8, 4);
      setTimeout(() => { sigState.blink = true; sigState.t = 0; }, 6000);
    }
  });

  // 40 年代轿车 v2（翼子板/镀铬格栅/白圈胎；车头灯可点亮）
  const car = sedanCar({ color: 0x11161c, mats: M });
  car.position.set(20.2, 0, -13.5);
  car.rotation.y = Math.PI / 2 + 0.06;
  town.add(car);
  const carState = { on: false };
  hotspots.add(car.userData.heads, {
    hint: 'E — 车头灯',
    onActivate: () => {
      carState.on = !carState.on;
      car.userData.setLights(carState.on);
      audio.sfx(carState.on ? 'click' : 'thud', 0.6);
      if (carState.on) ui.caption('灯光洗过湿路。', 3200);
    }
  });

  // v1.4 五遍：路口电话亭——铝框玻璃亭 + 半开折门（有人刚离开）+
  // TELEPHONE 灯带 + 内亮小灯；深夜偶尔响铃。E 接听 → 那头只有风。
  const booth2 = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: 0x7e848c, roughness: 0.42, metalness: 0.85, envMapIntensity: 1.1 });
  const bfGeos = [
    xform(new THREE.BoxGeometry(1.0, 0.09, 1.0), 0, 0.045, 0),
    xform(new THREE.BoxGeometry(1.06, 0.07, 1.06), 0, 2.34, 0),
    xform(new THREE.BoxGeometry(0.88, 0.06, 0.88), 0, 2.4, 0),
    // 三面踢脚金属板 + 中横档
    xform(new THREE.BoxGeometry(0.92, 0.34, 0.025), 0, 0.27, -0.45),
    xform(new THREE.BoxGeometry(0.025, 0.34, 0.92), -0.45, 0.27, 0),
    xform(new THREE.BoxGeometry(0.025, 0.34, 0.92), 0.45, 0.27, 0),
    xform(new THREE.BoxGeometry(0.92, 0.05, 0.05), 0, 0.87, -0.45),
    xform(new THREE.BoxGeometry(0.05, 0.05, 0.92), -0.45, 0.87, 0),
    xform(new THREE.BoxGeometry(0.05, 0.05, 0.92), 0.45, 0.87, 0),
    // 半开折门两扇的上下横档（35° 内折 + 回摆 18°）
    xform(new THREE.BoxGeometry(0.42, 0.05, 0.04), -0.248, 2.12, 0.34, 0, 0.611, 0),
    xform(new THREE.BoxGeometry(0.42, 0.05, 0.04), -0.248, 0.14, 0.34, 0, 0.611, 0),
    xform(new THREE.BoxGeometry(0.42, 0.05, 0.04), 0.124, 2.12, 0.284, 0, -0.314, 0),
    xform(new THREE.BoxGeometry(0.42, 0.05, 0.04), 0.124, 0.14, 0.284, 0, -0.314, 0)
  ];
  for (const [cx, cz] of [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]]) {
    bfGeos.push(xform(new THREE.BoxGeometry(0.075, 2.26, 0.075), cx, 1.18, cz));
  }
  booth2.add(mergedMesh(bfGeos, alu));
  const boothGlass = new THREE.MeshPhysicalMaterial({
    color: 0xcfe4ff, transparent: true, opacity: 0.15, roughness: 0.06,
    envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide
  });
  booth2.add(mergedMesh([
    xform(new THREE.PlaneGeometry(0.86, 1.6), 0, 1.24, -0.45),
    xform(new THREE.PlaneGeometry(0.86, 1.6), -0.45, 1.24, 0, 0, Math.PI / 2, 0),
    xform(new THREE.PlaneGeometry(0.86, 1.6), 0.45, 1.24, 0, 0, Math.PI / 2, 0),
    xform(new THREE.PlaneGeometry(0.4, 1.9), -0.248, 1.13, 0.34, 0, 0.611, 0),
    xform(new THREE.PlaneGeometry(0.4, 1.9), 0.124, 1.13, 0.284, 0, -0.314, 0)
  ], boothGlass));
  // TELEPHONE 灯带（四面同图；奶字微光）
  const telTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#101a26';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#efe6d0';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.scale(1, 5.2); // 带宽 0.98×0.18 纵压缩预补偿
    g.font = '600 30px Georgia, serif';
    g.fillText('T E L E P H O N E', s / 2, s / 2 / 5.2);
    g.restore();
  });
  const telMat = new THREE.MeshStandardMaterial({
    color: 0x0a1018, emissive: 0xffffff, emissiveMap: telTex, emissiveIntensity: 0.9
  });
  booth2.add(mergedMesh([
    xform(new THREE.PlaneGeometry(0.98, 0.18), 0, 2.16, 0.485),
    xform(new THREE.PlaneGeometry(0.98, 0.18), 0, 2.16, -0.485, 0, Math.PI, 0),
    xform(new THREE.PlaneGeometry(0.98, 0.18), -0.485, 2.16, 0, 0, -Math.PI / 2, 0),
    xform(new THREE.PlaneGeometry(0.98, 0.18), 0.485, 2.16, 0, 0, Math.PI / 2, 0)
  ], telMat));
  // 内侧话机（挂右侧板）：机身 + 投币面板 + 转盘 + 叉簧托
  const phoneBody = mergedMesh([
    xform(new THREE.BoxGeometry(0.07, 0.3, 0.18), 0.41, 1.42, 0),
    xform(new THREE.BoxGeometry(0.02, 0.1, 0.12), 0.365, 1.51, 0),
    xform(new THREE.CylinderGeometry(0.052, 0.052, 0.016, 18), 0.362, 1.38, 0, 0, 0, Math.PI / 2),
    xform(new THREE.BoxGeometry(0.03, 0.02, 0.08), 0.36, 1.6, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.4, metalness: 0.4, envMapIntensity: 1.2 }));
  booth2.add(phoneBody);
  // 听筒（可拿起）+ 垂软话绳
  const handset = mergedMesh([
    xform(new THREE.CylinderGeometry(0.028, 0.024, 0.045, 10), 0, 0.085, 0),
    xform(new THREE.CylinderGeometry(0.028, 0.024, 0.045, 10), 0, -0.085, 0),
    xform(new THREE.BoxGeometry(0.034, 0.13, 0.028), 0, 0, 0)
  ], new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.35 }));
  const handsetY0 = 1.6;
  handset.position.set(0.36, handsetY0, 0);
  booth2.add(handset);
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.4, 1.28, 0.02),
    new THREE.Vector3(0.36, 1.12, 0.06),
    new THREE.Vector3(0.38, 1.3, 0.03),
    new THREE.Vector3(0.37, 1.52, 0.01)
  ]);
  booth2.add(new THREE.Mesh(
    new THREE.TubeGeometry(cordCurve, 16, 0.0055, 5),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.8 })
  ));
  // 亭内小灯（暖白 + 老镇流器微颤）
  const boothBulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x241c10, emissive: 0xfff0c8, emissiveIntensity: 2.2 }));
  boothBulb.position.set(0, 2.24, 0);
  const boothLight = new THREE.PointLight(0xffedc2, 2.4, 4.5, 1.8);
  boothLight.position.set(0, 2.1, 0);
  booth2.add(boothBulb, boothLight);
  booth2.position.set(26.5, 0, 1.1);
  booth2.rotation.y = -Math.PI / 2;
  town.add(booth2);

  // ============================================================
  // v1.10 二级细节·twinpeaks 件 2：路边信箱排——夜街西口三只
  // 乡邮信箱（拱顶铁皮箱 + 木桩，高矮歪斜各不同）：中间那只
  // 门敞着、里面探出一封信；右边那只小旗立着。E（中箱）→ 门啪
  // 一声合上又自己弹开（永远关不上），半拍后邻箱小旗自己放平。
  // ============================================================
  {
    const mbRng = rng(67);
    const postMat = new THREE.MeshStandardMaterial({
      map: woodTexture({ base: [30, 20, 12], planks: 1, vertical: true, size: 128 }), roughness: 0.85
    });
    const galv = new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(128, 118, 40), color: 0x9aa0a4, roughness: 0.5, metalness: 0.75
    });
    const galvGreen = new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(128, 100, 36), color: 0x39544a, roughness: 0.62, metalness: 0.5
    });
    const galvRust = new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(128, 96, 44), color: 0x6e4a34, roughness: 0.78, metalness: 0.42
    });
    const mkBoxGeos = (mat) => [
      // 箱身下半 + 拱顶（整圆柱下半埋进箱身）+ 后封板
      new THREE.BoxGeometry(0.17, 0.13, 0.46),
      xform(new THREE.CylinderGeometry(0.085, 0.085, 0.46, 12), 0, 0.065, 0, Math.PI / 2, 0, 0),
      xform(new THREE.BoxGeometry(0.16, 0.2, 0.015), 0, 0.02, -0.225)
    ];
    const row = new THREE.Group();
    const boxes = [];
    const specs = [
      { x: 0, h: 1.06, tilt: 0.03, mat: galvGreen, open: false, flag: false },
      { x: 0.5, h: 1.12, tilt: -0.05, mat: galv, open: true, flag: false },
      { x: 1.0, h: 1.0, tilt: 0.07, mat: galvRust, open: false, flag: true }
    ];
    for (const sp of specs) {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, sp.h, 0.09), postMat);
      post.position.y = sp.h / 2;
      g.add(post);
      const body = new THREE.Group();
      body.add(mergedMesh(mkBoxGeos(), sp.mat));
      body.position.y = sp.h + 0.075;
      g.add(body);
      // 门（拱形前板，枢轴在下缘）
      const doorPivot = new THREE.Group();
      doorPivot.position.set(0, sp.h + 0.01, 0.23);
      doorPivot.add(mergedMesh([
        xform(new THREE.BoxGeometry(0.155, 0.125, 0.014), 0, 0.065, 0),
        xform(new THREE.CylinderGeometry(0.078, 0.078, 0.014, 12), 0, 0.13, 0, Math.PI / 2, 0, 0),
        // 门鼻小舌
        xform(new THREE.BoxGeometry(0.03, 0.03, 0.02), 0, 0.19, 0.004)
      ], sp.mat));
      doorPivot.rotation.x = sp.open ? 1.65 : 0.04;
      g.add(doorPivot);
      // 小旗（枢轴在箱侧）
      const flagPivot = new THREE.Group();
      flagPivot.position.set(0.095, sp.h + 0.1, 0.12);
      flagPivot.add(mergedMesh([
        xform(new THREE.BoxGeometry(0.012, 0.14, 0.02), 0, 0.07, 0),
        xform(new THREE.BoxGeometry(0.012, 0.06, 0.09), 0, 0.16, -0.03)
      ], new THREE.MeshStandardMaterial({ color: 0x8f0e1e, roughness: 0.6 })));
      flagPivot.rotation.x = sp.flag ? 0 : Math.PI / 2 - 0.12;
      g.add(flagPivot);
      // 敞着的那只：里面探出一封信（白纸微斜）
      if (sp.open) {
        const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.09),
          new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.7, side: THREE.DoubleSide }));
        letter.position.set(0.01, sp.h + 0.08, 0.19);
        letter.rotation.set(-0.5 + 0.18, 0.06, 0.05);
        g.add(letter);
        // v1.10 抛光 P9 微动：信角随夜风极缓翕动（0.5Hz 主拍 +
        // 1.7Hz 碎颤——信在等风，风在等人）
        updaters.push((dt, t) => {
          letter.rotation.z = 0.05 + Math.sin(t * 0.5) * 0.05 + Math.sin(t * 1.7 + 1.2) * 0.018;
        });
      }
      g.position.set(17.4 + (mbRng() - 0.5) * 0.06, 0, -0.6 - sp.x);
      g.rotation.y = Math.PI / 2 + sp.tilt; // 门朝街（+x）
      row.add(g);
      boxes.push({ g, doorPivot, flagPivot, sp });
    }
    town.add(row);
    // v1.10 抛光 P6：三根木桩脚下各一小摊接触阴影（月光下的草皮
    // 太平，桩子像插进图里——给它们各自压一摊影子）
    town.add(contactShadows([
      { x: 17.4, z: -0.6, r: 0.16 },
      { x: 17.4, z: -1.1, r: 0.16 },
      { x: 17.4, z: -1.6, r: 0.16 }
    ], 0.36));
    // v1.10 抛光 P4：桩脚草里两封没人捡的信——一封压着另一封的角，
    // 邮票格空着、地址栏只有横线（寄出它们的那年没有名字）。
    const envMat = new THREE.MeshStandardMaterial({
      map: canvasTexture(64, (g, s) => {
        g.fillStyle = '#d8d1bd';
        g.fillRect(0, 0, s, s);
        g.strokeStyle = 'rgba(120,110,88,0.8)';
        g.lineWidth = 1.5;
        g.strokeRect(s * 0.68, s * 0.08, s * 0.24, s * 0.28);
        for (const yy of [0.55, 0.7, 0.85]) {
          g.beginPath();
          g.moveTo(s * 0.14, s * yy);
          g.lineTo(s * 0.62, s * yy);
          g.stroke();
        }
      }), roughness: 0.85
    });
    for (const [ex, ez, spin, lift] of [[17.66, -0.82, 0.5, 0.008], [17.58, -0.9, -0.85, 0.014]]) {
      const env = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.1), envMat);
      env.rotation.set(-Math.PI / 2, 0, spin);
      env.position.set(ex, lift, ez);
      town.add(env);
    }
    // 中箱门永远关不上：E → 啪合 → 弹开两跳回到敞开；邻箱旗半拍后放平（连锁）
    const mbState = { t: -1, once: false, flagDropped: false };
    const midBox = boxes[1];
    const flagBox = boxes[2];
    updaters.push((dt) => {
      if (mbState.t < 0) return;
      mbState.t += dt;
      const u = mbState.t;
      if (u > 2.4) { mbState.t = -1; midBox.doorPivot.rotation.x = 1.65; return; }
      let ang;
      if (u < 0.18) ang = 1.65 - (u / 0.18) * 1.61;          // 啪一声合上
      else if (u < 0.5) ang = 0.04;                           // 停一拍（像是关住了）
      else if (u < 0.9) ang = 0.04 + ((u - 0.5) / 0.4) * 1.61; // 自己弹开
      else ang = 1.65 + Math.sin((u - 0.9) * 9) * 0.14 * Math.exp(-(u - 0.9) * 3); // 尾端两跳
      midBox.doorPivot.rotation.x = ang;
      // 邻箱小旗：0.7s 后自己放平（只放一次）
      if (u >= 0.7 && !mbState.flagDropped) {
        mbState.flagDropped = true;
        audio.sfxAt('creak', 17.4, -1.6, 0.3);
      }
      if (mbState.flagDropped) {
        const target = Math.PI / 2 - 0.12;
        flagBox.flagPivot.rotation.x += (target - flagBox.flagPivot.rotation.x) * Math.min(1, dt * 6);
      }
    });
    hotspots.add(midBox.doorPivot.children[0], {
      hint: 'E — 敞着的信箱',
      onActivate: () => {
        if (mbState.t >= 0) return;
        mbState.t = 0;
        audio.sfxAt('springdoor', 17.4, -1.1, 0.7);
        if (!mbState.once) {
          mbState.once = true;
          ui.caption('门关不上。信也没人取。', 3600);
        }
      }
    });
  }
  const ringState = { now: 0, nextRing: 24, ringUntil: -1, lift: -1 };
  updaters.push((dt, t) => {
    ringState.now = t;
    const flick = Math.sin(t * 17.3) > 0.965 ? 0.45 : 1;
    boothLight.intensity = 2.4 * flick;
    boothBulb.material.emissiveIntensity = 2.2 * flick;
    // 深夜偶尔响铃：一组三响，间隔 1.9s；window 内无人接就挂断
    if (t >= ringState.nextRing && ringState.ringUntil < t) {
      ringState.ringUntil = t + 5.6;
      for (let k = 0; k < 3; k++) later(() => {
        if (ringState.ringUntil > ringState.now) audio.sfxAt('phonering', 26.5, 1.1, 0.5, 10);
      }, k * 1900);
      ringState.nextRing = t + 45 + Math.random() * 50;
    }
    // 听筒起落动画（接起 0.35s → 停 2.2s → 放回）
    if (ringState.lift >= 0) {
      ringState.lift += dt;
      const u = ringState.lift;
      const up = u < 0.35 ? u / 0.35 : u > 2.55 ? Math.max(0, 1 - (u - 2.55) / 0.45) : 1;
      handset.position.x = 0.36 - up * 0.1;
      handset.position.y = handsetY0 + up * 0.1;
      handset.rotation.z = up * 0.55;
      if (u > 3.1) {
        ringState.lift = -1;
        handset.position.set(0.36, handsetY0, 0);
        handset.rotation.z = 0;
      }
    }
  });
  hotspots.add(phoneBody, {
    hint: 'E — 电话',
    onActivate: () => {
      if (ringState.lift >= 0) return;
      ringState.lift = 0;
      const wasRinging = ringState.ringUntil > ringState.now;
      ringState.ringUntil = -1; // 接起即停铃（未播的后续铃被 guard 掐掉）
      audio.sfxAt('click', 26.5, 1.1, 0.5, 4);
      if (wasRinging) {
        later(() => audio.sfx('breath', 0.4), 600);
        ui.caption('你接起来。那头只有风声。', 4200);
      } else {
        ui.caption('拨号音。整座镇都睡在线上。', 3600);
      }
    }
  });

  // DINER 外立面
  const facadeMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(256, (g, s) => {
      g.fillStyle = '#1b1410';
      g.fillRect(0, 0, s, s);
      const bh = s / 10;
      for (let r = 0; r < 10; r++) {
        for (let c = -1; c < 6; c++) {
          const off = r % 2 ? s / 12 : 0;
          g.fillStyle = `rgb(${34 + Math.random() * 12},${24 + Math.random() * 8},${16 + Math.random() * 8})`;
          g.fillRect(c * (s / 6) + off + 1, r * bh + 1, s / 6 - 2, bh - 2);
        }
      }
    }, 4, 2),
    roughness: 0.88
  });
  // 立面墙（门洞两侧 + 楣）
  const facade = new THREE.Group();
  const fw1 = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.6), facadeMat);
  fw1.position.set(27.3, 2.3, -11.9);
  fw1.rotation.y = -Math.PI / 2;
  const fw2 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), facadeMat);
  fw2.position.set(27.3, 2.3, -4.4);
  fw2.rotation.y = -Math.PI / 2;
  const fwTop = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), facadeMat);
  fwTop.position.set(27.3, 3.7, -7.9);
  fwTop.rotation.y = -Math.PI / 2;
  facade.add(fw1, fw2, fwTop);
  // 大玻璃窗（暖光溢出）—— 自发光贴图：中挺分格 + 半帘 + 柜台剪影，不再是一块平色
  const windowTex = canvasTexture(256, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#6a4a20');
    grad.addColorStop(0.45, '#c89050');
    grad.addColorStop(1, '#e8b068');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    // 玻璃内侧的模糊物影（吊灯球 + 柜台横带 + 人形暗柱）
    g.fillStyle = 'rgba(60,36,14,0.55)';
    g.fillRect(0, s * 0.72, s, s * 0.1);
    g.beginPath();
    g.arc(s * 0.3, s * 0.3, s * 0.055, 0, 7);
    g.arc(s * 0.72, s * 0.32, s * 0.05, 0, 7);
    g.fillStyle = 'rgba(255,238,200,0.8)';
    g.fill();
    g.fillStyle = 'rgba(50,30,12,0.4)';
    g.fillRect(s * 0.55, s * 0.4, s * 0.09, s * 0.34);
    // 半帘（下半格子布帘影）
    g.fillStyle = 'rgba(30,16,8,0.5)';
    for (let i = 0; i < 9; i++) {
      g.fillRect(i * (s / 9) + 2, s * 0.82, s / 9 - 4, s * 0.18);
    }
    // 中挺分格（一横两竖近黑条）
    g.fillStyle = '#0c0906';
    g.fillRect(0, s * 0.46, s, s * 0.035);
    g.fillRect(s * 0.32, 0, s * 0.022, s);
    g.fillRect(s * 0.66, 0, s * 0.022, s);
    g.strokeStyle = '#0c0906';
    g.lineWidth = 6;
    g.strokeRect(3, 3, s - 6, s - 6);
  });
  const windowGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.9),
    new THREE.MeshStandardMaterial({
      color: 0x0c0a06, emissive: 0xffffff, emissiveMap: windowTex, emissiveIntensity: 0.85
    })
  );
  windowGlow.position.set(27.24, 2.0, -10.6);
  windowGlow.rotation.y = -Math.PI / 2;
  facade.add(windowGlow);
  // 窗台板 + 滴水檐
  const trimGeos = [
    xform(new THREE.BoxGeometry(0.14, 0.08, 3.4), 27.2, 1.0, -10.6),
    xform(new THREE.BoxGeometry(0.1, 0.06, 3.36), 27.22, 3.0, -10.6)
  ];
  facade.add(mergedMesh(trimGeos, new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.8 })));
  const windowLight = new THREE.PointLight(0xffca7a, 6, 9, 1.8);
  windowLight.position.set(26.4, 2.0, -10.6);
  facade.add(windowLight);
  // 右半立面：拉了百叶的暗窗（打破整面空砖墙）
  const darkWinGeos = [
    xform(new THREE.BoxGeometry(0.06, 1.2, 0.08), 27.26, 2.0, -5.2),
    xform(new THREE.BoxGeometry(0.06, 1.2, 0.08), 27.26, 2.0, -3.6),
    xform(new THREE.BoxGeometry(0.06, 0.08, 1.68), 27.26, 2.62, -4.4),
    xform(new THREE.BoxGeometry(0.06, 0.08, 1.68), 27.26, 1.38, -4.4)
  ];
  facade.add(mergedMesh(darkWinGeos, new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.8 })));
  const darkSlatGeos = [];
  for (let i = 0; i < 8; i++) {
    darkSlatGeos.push(xform(new THREE.BoxGeometry(0.03, 0.02, 1.56), 27.28, 1.46 + i * 0.155, -4.4, 0, 0, -0.5));
  }
  facade.add(mergedMesh(darkSlatGeos, new THREE.MeshStandardMaterial({
    color: 0x3a3830, roughness: 0.75, emissive: 0x141a22, emissiveIntensity: 0.5
  })));
  const dinerSign = neonSign('DINER', { color: '#ff2e88', size: 0.72 });
  dinerSign.position.set(27.0, 5.2, -7.9);
  dinerSign.rotation.y = -Math.PI / 2;
  facade.add(dinerSign);
  updaters.push((dt, t) => dinerSign.userData.flicker(t, 4.4));
  town.add(facade);

  // diner 内部：柜台一角
  const dinerInner = new THREE.Group();
  const dFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 9),
    chevronMat('#101013', '#cfc7b8', { repeat: 3, seed: 35 })
  );
  dFloor.rotation.x = -Math.PI / 2;
  dFloor.position.set(29.6, 0.02, -7.8);
  dinerInner.add(dFloor);
  // 内墙
  const dWallMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [40, 26, 13], planks: 5, vertical: true, size: 256 }), roughness: 0.75
  });
  const dw1 = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), dWallMat);
  dw1.position.set(31.6, 1.8, -7.8);
  dw1.rotation.y = -Math.PI / 2;
  const dw2 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), dWallMat);
  dw2.position.set(29.6, 1.8, -12.2);
  const dw3 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), dWallMat);
  dw3.position.set(29.6, 1.8, -3.4);
  dw3.rotation.y = Math.PI;
  // v1.4 四遍：压花锡板吊顶（老 diner 标配）——方格浮雕 + 中心花 + 高光斑
  const tinTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#241c12';
    g.fillRect(0, 0, s, s);
    const cell = s / 4;
    for (let ry = 0; ry < 4; ry++) {
      for (let cx = 0; cx < 4; cx++) {
        const x = cx * cell;
        const y = ry * cell;
        g.strokeStyle = 'rgba(120,96,56,0.6)';
        g.lineWidth = 2;
        g.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
        g.strokeStyle = 'rgba(10,8,4,0.7)';
        g.strokeRect(x + 7, y + 7, cell - 14, cell - 14);
        g.fillStyle = 'rgba(140,112,64,0.5)';
        g.beginPath();
        g.arc(x + cell / 2, y + cell / 2, 4, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, 3, 6);
  const dCeil = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 9), new THREE.MeshStandardMaterial({
    map: tinTex, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.8
  }));
  dCeil.rotation.x = Math.PI / 2;
  dCeil.position.set(29.6, 3.6, -7.8);
  dinerInner.add(dw1, dw2, dw3, dCeil);
  // 护墙横档 + 踢脚线（拆掉「胶合板箱」的整面重复感）
  const dTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e1208, roughness: 0.6 });
  dinerInner.add(mergedMesh([
    xform(new THREE.BoxGeometry(0.05, 0.09, 9), 31.57, 1.32, -7.8),
    xform(new THREE.BoxGeometry(0.05, 0.14, 9), 31.58, 0.07, -7.8),
    xform(new THREE.BoxGeometry(4.6, 0.09, 0.05), 29.6, 1.32, -12.17),
    xform(new THREE.BoxGeometry(4.6, 0.14, 0.05), 29.6, 0.07, -12.18),
    xform(new THREE.BoxGeometry(4.6, 0.09, 0.05), 29.6, 1.32, -3.43),
    xform(new THREE.BoxGeometry(4.6, 0.14, 0.05), 29.6, 0.07, -3.42)
  ], dTrimMat));
  // 柜台吊灯一对（珐琅锥罩 + 吊杆 + 亮着的灯珠）——光终于有了来处
  const shadeGeos = [];
  const bulbGeos = [];
  for (const pz of [-6.3, -9.3]) {
    shadeGeos.push(xform(new THREE.CylinderGeometry(0.03, 0.26, 0.22, 14, 1, true), 30.4, 2.44, pz));
    shadeGeos.push(xform(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), 30.4, 3.05, pz));
    bulbGeos.push(xform(new THREE.SphereGeometry(0.045, 10, 8), 30.4, 2.38, pz));
  }
  dinerInner.add(mergedMesh(shadeGeos, new THREE.MeshStandardMaterial({
    color: 0x28401e, roughness: 0.35, metalness: 0.3, side: THREE.DoubleSide, envMapIntensity: 1.1
  })));
  const dinerBulbMat = new THREE.MeshStandardMaterial({
    color: 0x201408, emissive: 0xffd9a0, emissiveIntensity: 2.6
  });
  dinerInner.add(mergedMesh(bulbGeos, dinerBulbMat));
  const pendantA = new THREE.PointLight(0xffce8e, 3.4, 6, 1.8);
  pendantA.position.set(30.4, 2.3, -6.3);
  const pendantB = new THREE.PointLight(0xffce8e, 3.4, 6, 1.8);
  pendantB.position.set(30.4, 2.3, -9.3);
  dinerInner.add(pendantA, pendantB);
  updaters.push((dt, t) => {
    const w = 1 + Math.sin(t * 3.1) * 0.04 + Math.sin(t * 12.7) * 0.02;
    dinerBulbMat.emissiveIntensity = 2.6 * w;
    pendantA.intensity = 3.4 * w;
    pendantB.intensity = 3.4 * w;
  });
  // 东墙字排菜单板（黑底白字条：通用小食与价目，零商标）
  const menuBoardTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0c0c0e';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#3a3a40';
    g.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      g.beginPath(); g.moveTo(10, (i * s) / 5); g.lineTo(s - 10, (i * s) / 5); g.stroke();
    }
    g.fillStyle = '#e8e4da';
    g.textBaseline = 'middle';
    g.save();
    g.scale(1, 2.6); // 板面 2.2×0.85 的纵向预补偿
    g.font = '700 14px "Courier New", monospace'; // ×2.6 后 36px < 51px 行高，不串行
    const rows = [['CAFE', '25'], ['PIE', '60'], ['A LA MODE', '85'], ['HUEVOS', '95'], ['DONUT', '30']];
    rows.forEach(([name, price], i) => {
      const y = ((i + 0.5) * s) / 5 / 2.6;
      g.textAlign = 'left';
      g.fillText(name, 18, y);
      g.textAlign = 'right';
      g.fillText(price, s - 18, y);
    });
    g.restore();
  });
  const menuBoard = new THREE.Group();
  menuBoard.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.95, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.6 })
  ));
  const menuFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.85),
    new THREE.MeshStandardMaterial({
      map: menuBoardTex, roughness: 0.7,
      emissive: 0xffffff, emissiveMap: menuBoardTex, emissiveIntensity: 0.22
    })
  );
  menuFace.rotation.y = -Math.PI / 2;
  menuFace.position.x = -0.03;
  menuBoard.add(menuFace);
  menuBoard.position.set(31.55, 2.45, -7.8);
  dinerInner.add(menuBoard);
  // 柜台（v1.4 P2 欠账落地：五十年代 boomerang 层压板台面 + 金属包边踢脚）
  // v1.12 D-15 克制化：近白底 + clearcoat 0.65 + env 1.2 在双吊灯正下
  // 方整面镜面爆白（boomerang 纹样全部淹没）——底色压一档、蜡面收敛
  const counterTop = roundedBoxMesh(1.1, 0.1, 6.4, 0.04,
    boomerangMat({
      bg: [214, 203, 178], tones: ['#b8a682', '#8f2032', '#3a4652'],
      size: 512, seed: 37, repX: 2, repY: 6, clearcoat: 0.4, env: 0.7
    }));
  counterTop.position.set(30.7, 1.06, -7.8);
  const counterBody = roundedBoxMesh(0.95, 1.0, 6.3, 0.04,
    new THREE.MeshStandardMaterial({ color: 0x321820, roughness: 0.55 }));
  counterBody.position.set(30.72, 0.5, -7.8);
  const counterKick = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 6.3),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x9a9a9a, roughness: 0.25, metalness: 0.95 })
  );
  counterKick.position.set(30.22, 0.09, -7.8);
  dinerInner.add(counterTop, counterBody, counterKick);
  // 吧凳 ×3（红皮面 + 铬柱，合并成 2 个 mesh）
  const seatGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 20);
  const seatRimGeo = new THREE.TorusGeometry(0.26, 0.05, 10, 22);
  const seatGeos = [];
  const poleGeos = [];
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.72, 12);
  const footGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.05, 14);
  for (const z of [-10.0, -7.8, -5.6]) {
    seatGeos.push(xform(seatGeo, 29.7, 0.82, z));
    seatGeos.push(xform(seatRimGeo, 29.7, 0.78, z, Math.PI / 2, 0, 0));
    poleGeos.push(xform(poleGeo, 29.7, 0.4, z));
    poleGeos.push(xform(footGeo, 29.7, 0.03, z));
  }
  seatGeo.dispose(); seatRimGeo.dispose(); poleGeo.dispose(); footGeo.dispose();
  dinerInner.add(mergedMesh(seatGeos, new THREE.MeshPhysicalMaterial({
    color: 0x8f0e1e, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color(0xff8090), clearcoat: 0.5, clearcoatRoughness: 0.4
  })));
  dinerInner.add(mergedMesh(poleGeos, new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0xa8a8a8, roughness: 0.2, metalness: 0.95, envMapIntensity: 1.4
  })));
  // 樱桃派（玻璃罩 + 瓷盘）
  const pieGroup = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.03, 22),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.3 }));
  // v1.12 门禁 61（二级细节）：派从「圆柱上画格子」升级成**真格纹派**——
  // 酥皮壁（开口圆柱）+ 顶面暗樱桃填馅圆盘 + 格纹条真实几何（两向各 4 条，
  // 条与条之间露出发亮的馅）+ 一圈拇指捏花沿。顶点色分件上色：
  // 单材质单 mesh，零新增（罩下的英雄道具值得真几何）。
  const pieTint = (g, r, gg, b) => {
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = r; arr[i * 3 + 1] = gg; arr[i * 3 + 2] = b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  };
  // 顶点色走线性空间：sRGB 直觉值必须先转线性，否则渲染端整体提亮
  // 成灰粉（首拍病灶）。crust 烤透金褐 / fill 暗樱桃糖浆。
  // 注意亮度下限：转线性后漫反射若跌到 ~3%（如 0x7c3e11），宽镜面
  // 灰光会反客为主、把派「读灰」——中档暖褐才立得住色相
  const crustLin = new THREE.Color(0xb0641f).convertSRGBToLinear();
  const fillLin = new THREE.Color(0x5a1013).convertSRGBToLinear();
  const crustC = [crustLin.r, crustLin.g, crustLin.b];
  const fillC = [fillLin.r, fillLin.g, fillLin.b];
  const pieGeos = [
    // 酥皮壁（开口圆柱，顶径 0.18 底径 0.2）+ 底封片
    pieTint(xform(new THREE.CylinderGeometry(0.18, 0.2, 0.09, 20, 1, true), 0, 0.06, 0), ...crustC),
    pieTint(xform(new THREE.CircleGeometry(0.2, 20), 0, 0.016, 0, -Math.PI / 2, 0, 0), ...crustC),
    // 填馅面（微低于沿口——烤塌下去的那一点点）
    pieTint(xform(new THREE.CircleGeometry(0.175, 20), 0, 0.098, 0, -Math.PI / 2, 0, 0), ...fillC)
  ];
  // 格纹条：扁圆棍（capsule 压扁），两向各 4 条，端头顺沿口收进
  const lattRng = rng(47);
  const lattG = new THREE.CapsuleGeometry(0.019, 0.22, 3, 8);
  for (let i = 0; i < 4; i++) {
    const off = -0.105 + i * 0.07;
    const halfW = Math.sqrt(Math.max(0.02, 0.17 * 0.17 - off * off));
    const sL = halfW / 0.15;
    pieGeos.push(pieTint(xform(lattG, off, 0.106, 0, Math.PI / 2, 0, 0.04 + lattRng() * 0.05, sL), ...crustC));
    pieGeos.push(pieTint(xform(lattG, 0, 0.112, off, 0.04 + lattRng() * 0.05, 0, Math.PI / 2, sL), ...crustC));
  }
  lattG.dispose();
  // 拇指捏花沿：16 粒小球沿口一圈（错落深浅）
  const crimpG = new THREE.SphereGeometry(0.016, 8, 6);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pieGeos.push(pieTint(
      xform(crimpG, Math.cos(a) * 0.178, 0.102 + lattRng() * 0.006, Math.sin(a) * 0.178),
      crustC[0] * (0.9 + lattRng() * 0.2), crustC[1] * (0.9 + lattRng() * 0.2), crustC[2]));
  }
  crimpG.dispose();
  const pie = mergedMesh(pieGeos, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.66, // 压住宽镜面灰光，色相交给顶点色
    map: canvasTexture(64, (g, s) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, s, s);
      const pr = rng(48);
      for (let i = 0; i < 90; i++) { // 烤斑细噪（乘在顶点色上）
        g.fillStyle = `rgba(120,70,30,${0.05 + pr() * 0.1})`;
        const x = pr() * s, y = pr() * s;
        g.fillRect(x, y, 1 + pr() * 2, 1 + pr() * 2);
      }
    })
  }));
  // v1.12：罩子白纱收敛——env 反射 1.6→1.0、不透明度 0.14→0.11，
  // 罩下的派不再隔着一层奶（英雄道具优先于罩子的存在感）
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.11, roughness: 0.05, envMapIntensity: 1.0, depthWrite: false }));
  dome.position.y = 0.02;
  pieGroup.add(plate, pie, dome);
  pieGroup.position.set(30.7, 1.12, -9.2);
  dinerInner.add(pieGroup);
  // v1.5 减法：切好的一角派退场——罩下整派已把话说完，
  // 缺角是清单打卡式的重复注脚
  hotspots.add(dome, {
    hint: 'E — 玻璃罩下的樱桃派',
    onActivate: () => {
      audio.sfx('chime', 0.6);
      ui.caption('今天的派还没卖完。', 3200);
    }
  });
  // 咖啡壶（保温座 + 玻璃壶）
  const potBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 14),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x777777, roughness: 0.3, metalness: 0.9 }));
  potBase.position.set(30.7, 1.13, -6.4);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshPhysicalMaterial({ color: 0x2a1408, transparent: true, opacity: 0.7, roughness: 0.1, envMapIntensity: 1.4 }));
  pot.position.set(30.7, 1.16, -6.4);
  dinerInner.add(potBase, pot);
  // v1.10 抛光 P19「咖啡永远是热的」：壶口常年一缕蒸汽（几乎看不见），
  // 每 40–70s（seeded）保温座回滴一声 drip、蒸汽旺一口再落回去。
  // 没人续杯它也一直热着——这家店在等谁下夜班。
  const potSteam = smokeLayer(3, { x: 0.05, z: 0.05 }, {
    opacity: 0.11, size: 0.15, yBase: 0, ySpread: 0.36, color: 0xd8d0c4
  });
  potSteam.position.set(30.7, 1.28, -6.4);
  dinerInner.add(potSteam);
  updaters.push(potSteam.userData.update);
  const potRng = rng(89);
  const potState = { next: 26 + potRng() * 30, puff: 0 };
  updaters.push((dt) => {
    potState.next -= dt;
    if (potState.next <= 0) {
      potState.next = 40 + potRng() * 30;
      potState.puff = 1;
      audio.sfxAt('drip', 30.7, -6.4, 0.3, 4);
    }
    if (potState.puff > 0) potState.puff = Math.max(0, potState.puff - dt * 0.45);
    potSteam.material.opacity = 0.11 * (1 + potState.puff * 0.9);
  });
  hotspots.add(pot, {
    hint: 'E — 咖啡壶（续杯不要钱）',
    onActivate: () => {
      audio.sfx('sip');
      potState.puff = 1; // 连锁：倒过咖啡，蒸汽旺一口
      ui.caption('续了一杯。', 2600);
    }
  });
  // ---------- v1.16 彩蛋四批·温度（tp）：保温座 ----------
  // 壶是玻璃的、亮的；座是铁的、烫的——没人碰过它。掌心贴上去：
  // warmhum 极低软哼即刻浮起（温度用听的）；1.3s 游戏时钟错拍后
  // 蒸汽旺一大口 + 保温座回滴一声——这家店的热是从座上来的。
  // 贴顶厅纪律：零新增网格（热点落在既有 potBase 上）、零字幕
  // 零光源；可重复无锁存。与 P19「咖啡永远是热的」共用蒸汽通道。
  // v1.17 彩蛋五批·问第二遍（tp）：蒸汽旺过那口后的回声窗内
  // **再贴一次掌心**——座不哼、汽不旺，柜台那头的旋转派柜在同一拍
  // 悄悄转过一格（答与动作同拍，热跑错了电器）。贴顶厅纪律不破：
  // 零新增网格零音色（复用既有 pcaseState.spin 通道，不带 chime）。
  // v1.19 余温总账 9s：1.3 错拍即答，七件最快落定 → 窗 7.7s 全馆
  // 最长（座上的热本来就散得慢）。
  const warmState = { wait: -1, echo: 0 };
  updaters.push((dt) => {
    if (warmState.wait < 0) {
      if (warmState.echo > 0) warmState.echo -= dt;
      return;
    }
    warmState.wait -= dt;
    if (warmState.wait < 0) {
      potState.puff = 1.3;
      audio.sfxAt('drip', 30.7, -6.4, 0.34, 4);
      warmState.echo = 7.7; // 余温 9−1.3——那口汽还没散
    }
  });
  hotspots.add(potBase, {
    hint: 'E — 保温座',
    onActivate: () => {
      if (warmState.wait >= 0) return;
      if (warmState.echo > 0) {
        warmState.echo = 0;
        pcaseState.spin = 0.55; // 这回答的不是汽，是派柜
        return;
      }
      warmState.wait = 1.3;
      audio.sfxAt('warmhum', 30.7, -6.4, 0.65, 4);
    }
  });
  // 旋转派柜（三层瓷盘；E → 转架）
  const pcase = pieCase({ mats: M });
  pcase.position.set(30.7, 1.12, -10.4);
  dinerInner.add(pcase);
  const pcaseState = { spin: 0 };
  updaters.push((dt) => {
    pcase.userData.rack.rotation.y += dt * (0.15 + Math.max(0, Math.min(pcaseState.spin, 1)) * 2.4);
    if (pcaseState.spin > 0) pcaseState.spin -= dt;
  });
  hotspots.add(pcase.userData.glass, {
    hint: 'E — 转一转派柜',
    onActivate: () => {
      pcaseState.spin = 2.2;
      audio.sfx('chime', 0.5);
    }
  });

  // 柜台杂物组 v2（纸巾盒探纸/玻璃番茄酱+芥末/糖罐可见糖面/盐胡椒/吸管杯/帐篷菜单）
  const clutter = counterClutter({ mats: M });
  clutter.position.set(30.7, 1.11, -8.4);
  clutter.rotation.y = -Math.PI / 2;
  dinerInner.add(clutter);
  // 糖罐可摇：罐身晃两下、糖面沉一线（多摇会回弹——糖是有限的，好奇心不是）
  const sugarJar = clutter.userData.sugar;
  const sugarState = { shake: 0, level: 1 };
  updaters.push((dt, t) => {
    if (sugarState.shake > 0) {
      sugarState.shake -= dt;
      const k = Math.max(0, sugarState.shake);
      sugarJar.rotation.z = Math.sin(t * 34) * 0.16 * k;
      sugarJar.rotation.x = Math.cos(t * 27) * 0.1 * k;
    } else if (sugarJar.rotation.z !== 0) {
      sugarJar.rotation.set(0, 0, 0);
    }
    const targetY = 0.032 - (1 - sugarState.level) * 0.02;
    sugarJar.userData.core.position.y += (targetY - sugarJar.userData.core.position.y) * Math.min(1, dt * 4);
  });
  hotspots.add(sugarJar, {
    hint: 'E — 摇一摇糖罐',
    onActivate: () => {
      sugarState.shake = 0.55;
      sugarState.level = sugarState.level > 0.25 ? sugarState.level - 0.25 : 1;
      audio.sfxAt('jostle', 30.7, -8.4, 0.4, 3);
      if (sugarState.level === 1) ui.caption('糖又满了。没人看见它是怎么满的。', 3400);
    }
  });

  // 吊扇（拉链开关 → 转/停）
  const fan = ceilingFan({ mats: M });
  fan.position.set(29.6, 3.6, -7.8);
  dinerInner.add(fan);
  const fanState = { speed: 1 };
  updaters.push((dt) => {
    fan.userData.bladeHub.rotation.y += dt * fanState.speed * 3.4;
  });
  hotspots.add(fan.userData.pull, {
    hint: 'E — 吊扇拉链',
    onActivate: () => {
      fanState.speed = fanState.speed > 0.5 ? 0.05 : 1;
      audio.sfx('click', 0.7);
    }
  });

  // 柜台踏脚黄铜横杆（托架 ×3 + 端头圆帽）
  const railGeos = [
    xform(new THREE.CylinderGeometry(0.025, 0.025, 5.8, 10), 30.12, 0.28, -7.8, Math.PI / 2, 0, 0),
    xform(new THREE.SphereGeometry(0.034, 10, 8), 30.12, 0.28, -10.7),
    xform(new THREE.SphereGeometry(0.034, 10, 8), 30.12, 0.28, -4.9)
  ];
  for (const z of [-10.2, -7.8, -5.4]) {
    railGeos.push(xform(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), 30.2, 0.28, z, 0, 0, Math.PI / 2));
    railGeos.push(xform(new THREE.CylinderGeometry(0.04, 0.05, 0.02, 10), 30.27, 0.28, z, 0, 0, Math.PI / 2));
  }
  dinerInner.add(mergedMesh(railGeos, M.brass));

  // v1.4 阶段 4：柜台服务铃 —— 按一下没人应，派柜自己转了一圈（连锁）
  const dingBell = new THREE.Group();
  dingBell.add(mergedMesh([
    xform(new THREE.CylinderGeometry(0.07, 0.078, 0.018, 16), 0, 0.009, 0),
    xform(new THREE.SphereGeometry(0.058, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.02, 0)
  ], M.chrome));
  const dingBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), M.brass);
  dingBtn.position.y = 0.08;
  dingBell.add(dingBtn);
  dingBell.position.set(30.68, 1.13, -5.7);
  dinerInner.add(dingBell);
  const dingState = { t: -1 };
  updaters.push((dt) => {
    if (dingState.t < 0) return;
    dingState.t += dt;
    dingBtn.position.y = 0.08 - Math.max(0, Math.sin(Math.min(dingState.t * 12, Math.PI))) * 0.012;
    if (dingState.t > 0.3) dingState.t = -1;
  });
  hotspots.add(dingBell.children[0], {
    hint: 'E — 服务铃',
    onActivate: () => {
      dingState.t = 0;
      audio.sfxAt('bell', 30.68, -5.7, 0.55, 4);
      setTimeout(() => { pcaseState.spin = 1.3; }, 600);
      ui.caption('没有人应。派自己转了一圈。', 3400);
    }
  });

  // v1.13 彩蛋：柜台末座前一只倒扣的杯——餐馆的老规矩，杯口朝下
  // 是「不用给我倒」。E → 杯子自己抬起来欠一下身、看一眼碟子，
  // 又扣回去 + 瓷釉两磕 + 一次性短句。底下什么都没有，这就是答案。
  const flipCup = new THREE.Group();
  const flipChina = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.35 });
  const flipSaucer = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.05, 0.018, 16), flipChina);
  flipSaucer.position.y = 0.009;
  const flipLift = new THREE.Group(); // 只有杯抬，碟不动
  // 杯身 + 杯柄合并单 mesh（twinpeaks 贴顶纪律：能合的都合）
  const flipBody = mergedMesh([
    xform(new THREE.CylinderGeometry(0.042, 0.055, 0.075, 16), 0, 0.055, 0),
    xform(new THREE.TorusGeometry(0.02, 0.007, 6, 12), 0.06, 0.052, 0)
  ], flipChina);
  flipLift.add(flipBody);
  flipCup.add(flipSaucer, flipLift);
  flipCup.position.set(30.7, 1.12, -5.15);
  dinerInner.add(flipCup);
  const flipState = { t: -1, said: false };
  updaters.push((dt) => {
    if (flipState.t < 0) return;
    flipState.t += dt;
    const u = flipState.t / 1.7;
    if (u >= 1) {
      flipState.t = -1;
      flipLift.position.y = 0;
      flipLift.rotation.z = 0;
      return;
    }
    // 抬起（0–0.3）→ 悬着欠身（0.3–0.65）→ 扣回（0.65–1）
    const up = u < 0.3 ? u / 0.3 : u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
    flipLift.position.y = up * 0.05;
    flipLift.rotation.z = up * 0.14 * Math.sin(u * Math.PI * 2.2);
  });
  hotspots.add(flipBody, {
    hint: 'E — 一只倒扣的杯',
    onActivate: () => {
      if (flipState.t >= 0) return;
      flipState.t = 0;
      audio.sfxAt('porcelain', 30.7, -5.15, 0.45, 3);
      timers.push(setTimeout(() => audio.sfxAt('porcelain', 30.7, -5.15, 0.3, 3), 1500));
      if (!flipState.said) {
        flipState.said = true;
        ui.caption('下面什么也没有。', 3200);
      }
    }
  });

  // 靠窗卡座（对坐高背红皮长凳 + 铬柱层压桌 + 百叶暗窗 + 咖啡）
  const boothVinyl = new THREE.MeshPhysicalMaterial({
    color: 0x7e1220, roughness: 0.48, sheen: 0.6, sheenColor: new THREE.Color(0xff8090),
    clearcoat: 0.45, clearcoatRoughness: 0.45
  });
  const benchGeos = [];
  const plinthGeos = [];
  for (const [bx, dir] of [[27.95, 1], [29.15, -1]]) {
    plinthGeos.push(xform(new THREE.BoxGeometry(0.6, 0.26, 1.0), bx, 0.13, -3.95));
    benchGeos.push(xform(new THREE.BoxGeometry(0.58, 0.13, 1.0), bx + dir * 0.03, 0.33, -3.95));
    // 高背板：微后倾 + 三道竖向包槽
    benchGeos.push(xform(new THREE.BoxGeometry(0.11, 0.92, 1.0), bx - dir * 0.24, 0.86, -3.95, 0, 0, dir * 0.07));
    for (const bz of [-4.26, -3.95, -3.64]) {
      benchGeos.push(xform(new THREE.CylinderGeometry(0.145, 0.145, 0.82, 10), bx - dir * 0.17, 0.84, bz, 0, 0, dir * 0.07));
    }
  }
  dinerInner.add(mergedMesh(benchGeos, boothVinyl), mergedMesh(plinthGeos, M.darkWood));
  // 桌：boomerang 层压面（比柜台细一号的纹样）+ 铬包边 + 铬柱独脚
  const laminate = boomerangMat({
    bg: [222, 212, 189], tones: ['#a89467', '#7e1220', '#2e3a44'],
    size: 256, seed: 39, count: 24, repX: 1, repY: 2
  });
  const boothTable = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.045, 0.92), laminate);
  boothTable.position.set(28.55, 0.79, -3.98);
  const tableTrim = roundedBoxMesh(0.6, 0.03, 0.96, 0.012, M.chrome);
  tableTrim.position.set(28.55, 0.765, -3.98);
  const tableLegGeos = [
    xform(new THREE.CylinderGeometry(0.042, 0.042, 0.7, 12), 28.55, 0.4, -3.98),
    xform(new THREE.CylinderGeometry(0.16, 0.21, 0.035, 14), 28.55, 0.02, -3.98)
  ];
  dinerInner.add(boothTable, tableTrim, mergedMesh(tableLegGeos, M.chrome));
  // 咖啡两杯（瓷杯 + 环耳 + 碟）
  const chinaGeos = [];
  for (const [cx, cz] of [[28.46, -4.16], [28.65, -3.8]]) {
    chinaGeos.push(xform(new THREE.CylinderGeometry(0.075, 0.09, 0.012, 14), cx, 0.82, cz));
    chinaGeos.push(xform(new THREE.CylinderGeometry(0.046, 0.038, 0.07, 12), cx, 0.855, cz));
    chinaGeos.push(xform(new THREE.TorusGeometry(0.03, 0.009, 6, 12), cx + 0.055, 0.855, cz));
  }
  dinerInner.add(mergedMesh(chinaGeos, new THREE.MeshStandardMaterial({ color: 0xe8e2d5, roughness: 0.28 })));
  // 暗窗：木框 + 近黑玻璃 + 微光百叶
  const winFrameGeos = [
    xform(new THREE.BoxGeometry(1.34, 0.06, 0.05), 28.55, 2.16, -3.43),
    xform(new THREE.BoxGeometry(1.34, 0.06, 0.05), 28.55, 1.24, -3.43),
    xform(new THREE.BoxGeometry(0.06, 0.98, 0.05), 27.91, 1.7, -3.43),
    xform(new THREE.BoxGeometry(0.06, 0.98, 0.05), 29.19, 1.7, -3.43)
  ];
  dinerInner.add(mergedMesh(winFrameGeos, M.darkWood));
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.88),
    new THREE.MeshPhysicalMaterial({ color: 0x06090e, roughness: 0.08, envMapIntensity: 1.8, metalness: 0.1 }));
  winGlass.position.set(28.55, 1.7, -3.435);
  winGlass.rotation.y = Math.PI;
  dinerInner.add(winGlass);
  const slatGeos = [];
  for (let i = 0; i < 7; i++) {
    slatGeos.push(xform(new THREE.BoxGeometry(1.22, 0.018, 0.05), 28.55, 1.32 + i * 0.126, -3.45, -0.5, 0, 0));
  }
  dinerInner.add(mergedMesh(slatGeos, new THREE.MeshStandardMaterial({
    color: 0xb9b2a2, roughness: 0.7, emissive: 0x2a3038, emissiveIntensity: 0.5
  })));
  // 坐进卡座 → 皮面吱呀 + 咖啡蒸汽升腾
  const boothSteam = smokeLayer(6, { x: 0.16, z: 0.3 }, { opacity: 0.05, size: 0.32, yBase: 0, ySpread: 0.4, color: 0xd8dee4 });
  boothSteam.position.set(28.55, 0.9, -3.98);
  dinerInner.add(boothSteam);
  updaters.push(boothSteam.userData.update);
  const boothState = { warm: 0 };
  updaters.push((dt) => {
    if (boothState.warm > 0) boothState.warm -= dt * 0.25;
    boothSteam.material.opacity = 0.05 + Math.max(0, Math.min(boothState.warm, 1)) * 0.3;
  });
  hotspots.add(boothTable, {
    hint: 'E — 坐进卡座',
    onActivate: () => {
      boothState.warm = 1.6;
      audio.sfx('creak', 0.5);
      setTimeout(() => audio.sfx('sip', 0.7), 700);
      ui.caption('靠窗的位置一直空着。', 3200);
    }
  });

  // ============================================================
  // v1.10 二级细节·twinpeaks 件 1：卡座壁挂点唱盒——窗边墙上的
  // 铬壳翻牌选曲机（拱顶琥珀光带 + 曲目牌窗 + 翻页钮 + 投币口）。
  // E → 投币 + 曲目牌翻过去一页 + 光带亮一口——选中的那首不存在。
  // ============================================================
  {
    const wb = new THREE.Group();
    // 铬壳：主体圆角 + 拱顶
    wb.add(roundedBoxMesh(0.34, 0.26, 0.11, 0.02, M.chrome));
    // 拱顶：整圆柱（轴向进深），下半埋进壳体——省掉半圆片的朝向陷阱
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 18), M.chrome);
    dome.rotation.x = Math.PI / 2;
    dome.position.y = 0.13;
    wb.add(dome);
    // 拱顶琥珀光带（自发光，不加真光源）
    const amberArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.018, 8, 14, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x201408, emissive: 0xffb25e, emissiveIntensity: 1.6 })
    );
    amberArc.position.set(0, 0.13, 0.045);
    wb.add(amberArc);
    // 曲目牌窗：格线卡片（canvas），中缝一页可翻
    const cardTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#efe8d8';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = '#8a8272';
      g.lineWidth = 2;
      for (let i = 1; i < 6; i++) {
        g.beginPath();
        g.moveTo(10, i * (s / 6));
        g.lineTo(s - 10, i * (s / 6));
        g.stroke();
      }
      // 每行一段「曲名」示意横杠（不写真曲名——原创零版权）
      g.fillStyle = '#4a4438';
      const sr = rng(58);
      for (let i = 0; i < 6; i++) {
        g.fillRect(16, i * (s / 6) + 8, 30 + sr() * 55, 4);
        g.fillRect(s - 34, i * (s / 6) + 8, 18, 4);
      }
    });
    const cardWin = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.15),
      new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.6 }));
    cardWin.position.set(0, 0.015, 0.057);
    wb.add(cardWin);
    // 可翻的那页（枢轴在顶缘）
    const flipPivot = new THREE.Group();
    flipPivot.position.set(0, 0.09, 0.06);
    const flipPage = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.13),
      new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.6, side: THREE.DoubleSide }));
    flipPage.position.y = -0.065;
    flipPivot.add(flipPage);
    wb.add(flipPivot);
    // 双铬钮 + 投币口板
    wb.add(mergedMesh([
      xform(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 10), -0.11, -0.09, 0.06, Math.PI / 2, 0, 0),
      xform(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 10), 0.11, -0.09, 0.06, Math.PI / 2, 0, 0),
      xform(new THREE.BoxGeometry(0.06, 0.035, 0.012), 0, -0.09, 0.058),
      xform(new THREE.BoxGeometry(0.008, 0.022, 0.014), 0, -0.09, 0.062)
    ], M.brass));
    // v1.10 抛光 P4：找零口——壳底一只小找零杯（底板+前唇+双侧板，
    // 后壁借壳体），里面立着一枚没人拿的镍币（面朝外、往后靠着）。
    // 找零一直在，投币的人没再回来。
    wb.add(mergedMesh([
      xform(new THREE.BoxGeometry(0.085, 0.012, 0.042), 0, -0.148, 0.044),
      xform(new THREE.BoxGeometry(0.085, 0.03, 0.008), 0, -0.132, 0.062),
      xform(new THREE.BoxGeometry(0.008, 0.03, 0.038), -0.0435, -0.132, 0.044),
      xform(new THREE.BoxGeometry(0.008, 0.03, 0.038), 0.0435, -0.132, 0.044)
    ], M.chrome));
    const nickel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.0035, 14),
      new THREE.MeshStandardMaterial({
        map: brushedMetalTexture(64, 40, 18), color: 0xb9bcc0, roughness: 0.35, metalness: 0.9
      })
    );
    nickel.rotation.x = Math.PI / 2 - 0.18;
    nickel.position.set(0.014, -0.128, 0.05);
    wb.add(nickel);
    // 挂在窗右侧的墙面（高背旁、坐着伸手够得到的高度）
    wb.position.set(29.7, 1.35, -3.47);
    wb.rotation.y = Math.PI;
    dinerInner.add(wb);
    const wbState = { t: -1, once: false };
    updaters.push((dt) => {
      if (wbState.t < 0) return;
      wbState.t += dt;
      const u = wbState.t;
      if (u > 2.6) {
        wbState.t = -1;
        flipPivot.rotation.x = 0;
        amberArc.material.emissiveIntensity = 1.6;
        return;
      }
      // 翻页：0.5s 蓄力慢抬 → 摔过去 → 尾端两跳
      const flip = u < 0.5 ? (u / 0.5) * 0.5
        : u < 0.75 ? 0.5 + ((u - 0.5) / 0.25) * (Math.PI - 0.5)
        : Math.PI + Math.sin((u - 0.75) * 16) * 0.12 * Math.exp(-(u - 0.75) * 4);
      flipPivot.rotation.x = -flip;
      amberArc.material.emissiveIntensity = 1.6 + Math.sin(Math.min(u / 2.6, 1) * Math.PI) * 2.2;
    });
    hotspots.add(cardWin, {
      hint: 'E — 点唱盒',
      onActivate: () => {
        if (wbState.t >= 0) return;
        wbState.t = 0;
        audio.sfxAt('coin', 29.7, -3.47, 0.5);
        setTimeout(() => audio.sfxAt('wallbox', 29.7, -3.47, 0.8), 200);
        if (!wbState.once) {
          wbState.once = true;
          ui.caption('B7。歌单上没有这首歌。', 3600);
        }
      }
    });
  }

  // 吊灯 ×2
  for (const z of [-9.5, -6.1]) {
    const dl = new THREE.PointLight(0xffca7a, 4.5, 6, 1.8);
    dl.position.set(30.2, 3.2, z);
    dinerInner.add(dl);
  }
  town.add(dinerInner);
  group.add(town);

  // ============================================================
  // ④ 瀑布眺望台
  // ============================================================
  const overlook = new THREE.Group();
  // 木栈台
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.16, 6.5),
    new THREE.MeshStandardMaterial({ map: woodTexture({ base: [40, 26, 13], planks: 10 }), roughness: 0.8 })
  );
  deck.position.set(11, 0.08, -25.7);
  overlook.add(deck);
  // 风雨木栏杆 v2（方柱坡顶帽 + 宽手板 + 立缘中板 + 踢脚板——公园栈道做法）
  const rail1 = overlookRail(12);
  rail1.position.set(11, 0.16, -28.8);
  const rail2 = overlookRail(6.3);
  rail2.position.set(4.9, 0.16, -25.7);
  rail2.rotation.y = Math.PI / 2;
  const rail3 = overlookRail(6.3);
  rail3.position.set(17.1, 0.16, -25.7);
  rail3.rotation.y = Math.PI / 2;
  overlook.add(rail1, rail2, rail3);
  // 峡谷崖壁剪影（背景崖 z 向压扁——v1.3 它的前脸鼓到 -36，
  // 把水幕下半段整个吞掉；压扁后立在水幕正后方只当幕布）
  for (const [x, z, s, zs] of [[2, -40, 7, 1], [22, -42, 8, 1], [12, -49, 10, 0.55]]) {
    const cliff = rockMesh(s, 0x0a0e14);
    cliff.position.set(x, s * 0.35, z);
    cliff.scale.z = zs;
    overlook.add(cliff);
  }
  // 瀑布 v2：弧面双层水幕（圆柱扇面，水体有了横向鼓度）——
  // 水缕整周期正弦摆（上下无缝滚动）+ 短亮泡珠（滚动方向终于可见：向下）
  const fallsTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0c141c';
    g.fillRect(0, 0, s, s);
    const fr = rng(83);
    for (let i = 0; i < 110; i++) {
      const x0 = fr() * s;
      const w = 1 + fr() * 3;
      const amp = fr() * 3.5;
      const ph = fr() * Math.PI * 2;
      const per = 1 + ((fr() * 2) | 0);
      g.strokeStyle = `rgba(214,232,246,${0.1 + fr() * 0.38})`;
      g.lineWidth = w;
      g.beginPath();
      for (let y = 0; y <= s; y += 8) {
        const x = x0 + Math.sin((y / s) * Math.PI * 2 * per + ph) * amp;
        if (y === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 150; i++) {
      g.fillStyle = `rgba(232,244,252,${0.12 + fr() * 0.3})`;
      g.fillRect(fr() * s, fr() * s, 1.6, 5 + fr() * 18);
    }
  }, 1, 2);
  const FALL_R = 11;
  const FALL_ARC = 0.68;
  const falls = new THREE.Mesh(
    new THREE.CylinderGeometry(FALL_R, FALL_R, 15, 26, 1, true, -FALL_ARC / 2, FALL_ARC),
    new THREE.MeshBasicMaterial({ map: fallsTex, transparent: true, opacity: 0.85, toneMapped: false })
  );
  falls.position.set(12, 6.5, -41.5 - FALL_R);
  overlook.add(falls);
  // 前层水幕（慢速低透明，叠出水体厚度视差）
  const fallsTex2 = fallsTex.clone();
  fallsTex2.needsUpdate = true;
  const falls2 = new THREE.Mesh(
    new THREE.CylinderGeometry(FALL_R - 0.35, FALL_R - 0.35, 15, 26, 1, true, -FALL_ARC / 2, FALL_ARC),
    new THREE.MeshBasicMaterial({
      map: fallsTex2, transparent: true, opacity: 0.32, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  falls2.position.set(12, 6.4, -41.2 - (FALL_R - 0.35));
  overlook.add(falls2);
  // 岩鼻两处：崖体把水流顶开，下方接回流白瀑——双瀑名场面的抽象化
  const rejoinTex = canvasTexture(64, (g, s) => {
    g.clearRect(0, 0, s, s);
    const rr = rng(29);
    for (let i = 0; i < 12; i++) {
      const x = 6 + rr() * (s - 12);
      const grad = g.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, `rgba(232,244,250,${0.5 + rr() * 0.4})`);
      grad.addColorStop(0.55, 'rgba(232,244,250,0.25)');
      grad.addColorStop(1, 'rgba(232,244,250,0)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 1.5 + rr() * 2.5, s * (0.55 + rr() * 0.45));
    }
  });
  // v1.12 D-2（剪影级修正）：岩鼻近纯黑 0x07090d 在白瀑上远看读成
  // 「两团漂浮黑块」——提为湿岩冷灰（水雾里的石头本来就带天光）+
  // 回流白瀑加宽提亮，把岩鼻从视觉上「接回水里」
  const rejoinMat = new THREE.MeshBasicMaterial({
    map: rejoinTex, transparent: true, opacity: 0.74, toneMapped: false,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const rejoinGeos = [];
  // v1.12 D-9（眺望台正面复检三轮定案）：两颗中幅漂浮刺球从来不是
  // 「双瀑」的语言（D-2 提亮/白沫领/剪切线三方案都救不了错误的形与
  // 位）。正版语义重排：①**冠顶崖齿**——一块宽楔岩贴上缘正中把水口
  // 一分为二（上半没进崖冠线，只露下垂的齿尖）；②齿下**干影带**——
  // 被分开的水在齿后留下一条暗隙（渐隐面片压暗幕体）；③下方白瀑
  // **重新织合**（rejoin 流纹）+ 齿冠喷溅白。网格数守恒：两鼻→一齿
  // 一带（tp 240 贴顶纪律）
  const tooth = rockMesh(1.35, 0x0d1219);
  tooth.scale.set(1.5, 1.0, 0.5);
  tooth.position.set(12, 13.35, -41.3);
  overlook.add(tooth);
  const dryTex = canvasTexture(64, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, 'rgba(9,13,19,0.88)');
    grad.addColorStop(0.6, 'rgba(9,13,19,0.5)');
    grad.addColorStop(1, 'rgba(9,13,19,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
  const dryBand = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.6),
    new THREE.MeshBasicMaterial({ map: dryTex, transparent: true, depthWrite: false })
  );
  dryBand.position.set(12, 11.3, -41.05);
  overlook.add(dryBand);
  // 织合白瀑（干影带下端两股水重新拧成一股）+ 齿侧两道剪切亮缕 + 齿冠喷溅
  rejoinGeos.push(xform(new THREE.PlaneGeometry(2.3, 2.8), 12, 9.6, -41.02));
  rejoinGeos.push(xform(new THREE.PlaneGeometry(0.55, 2.4), 9.8, 12.7, -41.0));
  rejoinGeos.push(xform(new THREE.PlaneGeometry(0.55, 2.4), 14.2, 12.7, -41.0));
  rejoinGeos.push(xform(new THREE.PlaneGeometry(2.6, 0.9), 12, 13.9, -41.0));
  overlook.add(mergedMesh(rejoinGeos, rejoinMat));
  // 上缘白沿（水离崖那一线）+ 底部翻涌泡沫带
  const brink = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 0.55),
    new THREE.MeshBasicMaterial({
      color: 0xdfeef2, transparent: true, opacity: 0.42, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  brink.position.set(12, 13.85, -41.15);
  overlook.add(brink);
  const foamTex = canvasTexture(128, (g, s) => {
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 2 + Math.random() * 7;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(226,242,248,0.7)');
      grad.addColorStop(1, 'rgba(226,242,248,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
  });
  foamTex.repeat.set(4, 1);
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 1.2),
    new THREE.MeshBasicMaterial({
      map: foamTex, transparent: true, opacity: 0.5, toneMapped: false,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  foam.position.set(12, 0.72, -40.85);
  overlook.add(foam);
  // 潭中砾石两块 + 泡沫领圈（水绕石的白——潭面不再是干净的圆盘）
  const collarTex = foamTex.clone();
  collarTex.repeat.set(1, 1);
  collarTex.needsUpdate = true;
  const collarMat = new THREE.MeshBasicMaterial({
    map: collarTex, transparent: true, opacity: 0.45, toneMapped: false,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const collarGeos = [];
  for (const [bx, bz, bs] of [[9.2, -38.7, 1.0], [14.6, -37.5, 0.7]]) {
    const b = rockMesh(bs, 0x0b0f15);
    b.position.set(bx, bs * 0.18, bz);
    overlook.add(b);
    const ring = new THREE.RingGeometry(bs * 0.7, bs * 1.18, 18);
    ring.rotateX(-Math.PI / 2);
    collarGeos.push(xform(ring, bx, 0.035, bz));
  }
  overlook.add(mergedMesh(collarGeos, collarMat));
  // 撞击点雾柱：十字对板 + 呼吸胀缩（瀑底腾起的那口白汽）
  const sprayTex = canvasTexture(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    const sr = rng(47);
    for (let i = 0; i < 40; i++) {
      const x = sr() * s;
      const y = s * 0.25 + sr() * s * 0.75; // 下密上疏
      const r = 6 + sr() * 16;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(212,232,244,${0.16 + (y / s) * 0.2})`);
      grad.addColorStop(1, 'rgba(212,232,244,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
  });
  const sprayMat = new THREE.MeshBasicMaterial({
    map: sprayTex, transparent: true, opacity: 0.42, toneMapped: false,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const spray = mergedMesh([
    xform(new THREE.PlaneGeometry(4.4, 3.4), 0, 0, 0),
    xform(new THREE.PlaneGeometry(4.4, 3.4), 0, 0, 0, 0, Math.PI / 2, 0)
  ], sprayMat);
  spray.position.set(12, 2.0, -40.6);
  overlook.add(spray);
  // 月虹：平时不在——只有守望应答（水雾涨起）时才浮现的浅弧
  // 内紫→中青→外淡金的顶点色渐变，一张几何完成光谱
  const bowGeo = new THREE.RingGeometry(3.1, 3.9, 40, 1, Math.PI * 0.14, Math.PI * 0.72);
  const bowPos = bowGeo.attributes.position;
  const bowCol = new Float32Array(bowPos.count * 3);
  for (let i = 0; i < bowPos.count; i++) {
    const k = (Math.hypot(bowPos.getX(i), bowPos.getY(i)) - 3.1) / 0.8;
    const c = k < 0.5
      ? [0.55 - 0.1 * k * 2, 0.4 + 0.4 * k * 2, 0.9 + 0.05 * k * 2]
      : [0.45 + 0.5 * (k - 0.5) * 2, 0.8 + 0.05 * (k - 0.5) * 2, 0.95 - 0.35 * (k - 0.5) * 2];
    bowCol.set(c, i * 3);
  }
  bowGeo.setAttribute('color', new THREE.BufferAttribute(bowCol, 3));
  const moonbow = new THREE.Mesh(bowGeo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0, toneMapped: false,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  moonbow.position.set(12, 1.3, -37.6);
  moonbow.rotation.x = -0.1;
  overlook.add(moonbow);
  updaters.push((dt, t) => {
    // 滚动方向修正：offset.y += 才是纹样向下坠（v1.3 的条纹无纵向特征看不出方向）
    fallsTex.offset.y += dt * 0.34;
    fallsTex2.offset.y += dt * 0.21;
    foamTex.offset.x += dt * 0.05;
    brink.material.opacity = 0.4 + Math.sin(t * 7.3) * 0.07 + Math.sin(t * 16.7) * 0.05;
    foam.material.opacity = 0.45 + Math.sin(t * 4.9) * 0.1 + Math.sin(t * 11.3) * 0.06;
    rejoinMat.opacity = 0.55 + Math.sin(t * 9.1) * 0.12;
    collarMat.opacity = 0.4 + Math.sin(t * 3.7) * 0.1 + Math.sin(t * 8.9) * 0.05;
    spray.scale.y = 1 + Math.sin(t * 1.7) * 0.07;
    sprayMat.opacity = 0.38 + Math.sin(t * 2.3) * 0.08 + Math.sin(t * 5.1) * 0.05;
    sprayTex.offset.x += dt * 0.03;
  });
  // 瀑底水潭（v1.3 静水：微波纹法线缓慢流动）+ 水雾
  const plungeMat = waterMat(0x04121c, { seed: 31, repX: 3, repY: 3 });
  const plunge = new THREE.Mesh(new THREE.CircleGeometry(6, 26), plungeMat);
  plunge.rotation.x = -Math.PI / 2;
  plunge.position.set(12, 0.01, -38.5);
  overlook.add(plunge);
  updaters.push(plungeMat.userData.update);

  // 投币观景镜（可转动镜头对准瀑布/锯木厂）
  const scope = viewScope({ mats: M });
  scope.position.set(11, 0.16, -27.6);
  overlook.add(scope);
  const scopeState = { target: 0, yaw: 0.2 };
  const SCOPE_YAWS = [0.2, -0.55];
  updaters.push((dt) => {
    scopeState.yaw += (SCOPE_YAWS[scopeState.target] - scopeState.yaw) * Math.min(1, dt * 3);
    scope.userData.head.rotation.y = scopeState.yaw;
  });
  hotspots.add(scope.userData.scope, {
    hint: 'E — 转动观景镜',
    onActivate: () => {
      scopeState.target = (scopeState.target + 1) % 2;
      audio.sfx('creak', 0.55);
      ui.caption(scopeState.target === 0 ? '瀑布不停。' : '锯木厂睡着了。', 3000);
    }
  });
  const mist = smokeLayer(36, { x: 9, z: 5 }, { opacity: 0.08, size: 6, yBase: 0.5, ySpread: 3.5, color: 0xc8dce8 });
  mist.position.set(12, 0, -39);
  overlook.add(mist);
  updaters.push(mist.userData.update);

  // v1.14 彩蛋二批（门禁 69）：北栏杆手板上一枚硬币——弹起旋两圈
  // （coin 轻响即时），闷一拍，0.8s 后才听见它落定（woodknock 错拍——
  // 比物理该落的时刻晚半口气）。永久态：它落回来是**立着的**，从此
  // 立在手板上（发生过一次不可能的事）。零字幕。
  const railCoin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.0028, 16),
    new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(), color: 0xb9a26a, roughness: 0.38, metalness: 0.85, envMapIntensity: 0.9
    })
  );
  railCoin.position.set(9.2, 1.184, -28.8); // rail1 手板顶（0.16+1.0+0.0225+半厚）
  overlook.add(railCoin);
  const coinState = { t: -1, stood: false };
  updaters.push((dt) => {
    if (coinState.t < 0) return;
    coinState.t += dt;
    const u = coinState.t / 0.9;
    if (u >= 1) {
      coinState.t = -1;
      // 落定：立着（轴向水平），比躺着高出一枚半径
      railCoin.rotation.set(Math.PI / 2, 0, 0.35);
      railCoin.position.y = 1.2035;
      return;
    }
    railCoin.position.y = 1.184 + Math.sin(u * Math.PI) * 0.14; // 抛物线
    railCoin.rotation.x = u * Math.PI * 4.5;                    // 空中翻
  });
  hotspots.add(railCoin, {
    hint: 'E — 手板上的硬币',
    onActivate: () => {
      if (coinState.stood) {
        // 它立住了——立住的东西不再赌第二次（只轻轻一颤）
        audio.sfxAt('coin', 9.2, -28.8, 0.12, 3);
        return;
      }
      coinState.stood = true; // 永久：这一掷只有一次
      coinState.t = 0;
      audio.sfxAt('coin', 9.2, -28.8, 0.4, 4);
      // 错拍：0.8s 后才落定的那声木磕（你以为它掉下瀑布了）
      setTimeout(() => audio.sfxAt('woodknock', 9.2, -28.8, 0.3, 4), 1700);
    }
  });

  // 彩蛋：眺望台守望 —— 在栏杆前站定八秒不动，水雾与水幕会短暂应答
  const vigil = { t: 0, cool: 0, surge: -1 };
  const vigilFire = () => {
    vigil.cool = 90;
    vigil.surge = 0;
    audio.sfxAt('swell', 12, -38, 0.9, 15);
    ui.caption('白噪音里藏着一个音。', 4600);
  };
  const vigilTrig = {
    update(p, dt) {
      if (vigil.cool > 0) vigil.cool -= dt;
      const inZone = p.x >= 9 && p.x <= 14.5 && p.z >= -28.6 && p.z <= -25.4;
      vigil.t = inZone && vigil.cool <= 0 ? vigil.t + dt : 0;
      if (vigil.t > 8) { vigil.t = 0; vigilFire(); }
      if (vigil.surge >= 0) {
        vigil.surge += dt;
        const k = vigil.surge < 2.4 ? vigil.surge / 2.4 : Math.max(0, 1 - (vigil.surge - 2.4) / 3.6);
        mist.material.opacity = 0.08 + k * 0.16;
        falls2.material.opacity = 0.32 + k * 0.22;
        // 月虹只在水雾涨起时浮现——奖励站定八秒的人
        moonbow.material.opacity = k * 0.38;
        if (vigil.surge > 6) {
          vigil.surge = -1;
          moonbow.material.opacity = 0;
        }
      }
    },
    force() { vigilFire(); }
  };
  updaters.push((dt) => vigilTrig.update(player, dt));
  // 锯木厂剪影 v2（v1.12 D-18）——旧版三只平顶盒黑上加黑：夜空同为
  // 近黑，眺望台正望过去整厂读成一片虚无、只剩烟悬在半空。剪影级重做：
  // ①主棚双坡屋脊 + 披屋单坡（厂房轮廓线）②原木上料坡道 + 双支腿
  // （锯木厂最认得出的一笔）③锥形木屑焚炉（西北厂区的语言）+ 囱顶
  // 防火帽箍；④顶点色两粒**值夜窗**微暖光（睡着的厂留一盏灯——剪影
  // 有了自证，不与「锯木厂睡着了」抵触）。全并单 mesh 网格数守恒
  const millGeos = [
    xform(new THREE.BoxGeometry(10, 5, 6), 0, 2.5, 0),
    xform(new THREE.BoxGeometry(5, 3, 6.2), -5.5, 1.5, 0),
    xform(new THREE.CylinderGeometry(0.5, 0.7, 7, 10), 2.5, 6, 1)
  ];
  // 屋面三片单独收进「月色顶」组——比厂身抬半档的冷灰，衬崖影时
  // 轮廓线还在（月光落在坡屋面上的那点差别，剪影自证的第二笔）
  const millRoofGeos = [
    // 主棚双坡（两片斜板到脊，端面缺口衬黑天不可见）
    xform(new THREE.BoxGeometry(10.6, 0.18, 3.55), 0, 5.82, -1.62, -0.55, 0, 0),
    xform(new THREE.BoxGeometry(10.6, 0.18, 3.55), 0, 5.82, 1.62, 0.55, 0, 0),
    // 披屋单坡（向外倾）
    xform(new THREE.BoxGeometry(5.5, 0.14, 6.7), -5.6, 3.25, 0, 0, 0, 0.24)
  ];
  millGeos.push(
    // 原木上料坡道：从地面斜升到主棚檐口 + 双支腿
    xform(new THREE.BoxGeometry(8.2, 0.22, 1.1), 6.6, 2.6, 2.4, 0, 0, 0.56),
    xform(new THREE.BoxGeometry(0.22, 2.4, 0.22), 8.6, 1.2, 2.4),
    xform(new THREE.BoxGeometry(0.22, 3.6, 0.22), 6.4, 1.8, 2.4),
    // 锥形木屑焚炉 + 炉顶小帽
    xform(new THREE.ConeGeometry(2.3, 4.8, 12), -9.8, 2.4, 1.2),
    xform(new THREE.CylinderGeometry(0.5, 0.72, 0.5, 10), -9.8, 4.95, 1.2),
    // 囱顶防火帽箍
    xform(new THREE.CylinderGeometry(0.62, 0.56, 0.42, 10), 2.5, 9.4, 1)
  );
  // 值夜窗 ×2：主棚 +z 立面一大一小（面向眺望台的那一侧）
  const millWinGeos = [
    xform(new THREE.PlaneGeometry(0.55, 0.4), -1.4, 1.7, 3.02),
    xform(new THREE.PlaneGeometry(0.3, 0.34), 1.9, 2.1, 3.02)
  ];
  const millTint = (geo, color) => {
    const c = new THREE.Color(color);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const millMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const mill = mergedMesh([
    ...millGeos.map((g) => millTint(g, 0x05070c)),
    ...millRoofGeos.map((g) => millTint(g, 0x0c1220)),
    ...millWinGeos.map((g) => millTint(g, 0x9c6a34))
  ], millMat);
  mill.position.set(30, 0, -38);
  overlook.add(mill);
  const millSmoke = smokeLayer(16, { x: 2, z: 2 }, { opacity: 0.05, size: 5, yBase: 9.5, ySpread: 4, color: 0x8a8f96 });
  millSmoke.position.set(32.5, 0, -37);
  overlook.add(millSmoke);
  updaters.push(millSmoke.userData.update);
  group.add(overlook);

  // ============================================================
  // 彩蛋：环形石阵（空间错位）
  // ============================================================
  const grove = new THREE.Group();
  // v1.12 门禁 60-D：石阵从裸 BoxGeometry（黑方块 placeholder）重做为
  // **风化立石**——seeded 变形二十面体（横向捏窄成板状、竖向拉高、
  // 逐顶点噪声起皮）+ 微沉入土 + 各自歪斜；基部一圈碎石垫脚；
  // 直纹风化贴图（竖向淋痕 + 苔斑）map/bump 同源。合并单 mesh 零新增。
  const stoneR = rng(41);
  const stoneGeos = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const h = 0.8 + stoneR() * 0.7;
    const g = new THREE.IcosahedronGeometry(0.5, 1);
    const p = g.attributes.position;
    for (let vi = 0; vi < p.count; vi++) {
      const k = 1 + (stoneR() - 0.5) * 0.46;
      p.setXYZ(vi,
        p.getX(vi) * k * 0.5,
        p.getY(vi) * (h + (stoneR() - 0.5) * 0.12),
        p.getZ(vi) * k * 0.36);
    }
    g.computeVertexNormals();
    stoneGeos.push(xform(g,
      Math.cos(a) * 2.4, h * 0.42, Math.sin(a) * 2.4,
      (stoneR() - 0.5) * 0.18, a + stoneR() * 0.5, (stoneR() - 0.5) * 0.12
    ));
    for (let bi = 0; bi < 2; bi++) { // 基部碎石垫脚
      const pb = new THREE.IcosahedronGeometry(0.06 + stoneR() * 0.05, 0);
      stoneGeos.push(xform(pb,
        Math.cos(a) * 2.4 + (stoneR() - 0.5) * 0.5, 0.03,
        Math.sin(a) * 2.4 + (stoneR() - 0.5) * 0.5,
        stoneR() * 2, stoneR() * 2, 0));
    }
  }
  const stoneTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#171a20';
    g.fillRect(0, 0, s, s);
    const r = rng(43);
    for (let i = 0; i < 40; i++) { // 竖向淋痕
      const x = r() * s;
      g.fillStyle = `rgba(${8 + r() * 10 | 0},${9 + r() * 10 | 0},${12 + r() * 12 | 0},${0.3 + r() * 0.35})`;
      g.fillRect(x, r() * s * 0.4, 1 + r() * 2, s * (0.3 + r() * 0.6));
    }
    for (let i = 0; i < 26; i++) { // 苔斑（贴地一侧更密）
      const y = s * (0.55 + r() * 0.45);
      g.fillStyle = `rgba(${14 + r() * 12 | 0},${26 + r() * 18 | 0},${16 + r() * 10 | 0},${0.22 + r() * 0.3})`;
      g.beginPath();
      g.arc(r() * s, y, 1.5 + r() * 4, 0, Math.PI * 2);
      g.fill();
    }
  }, 1, 1);
  grove.add(mergedMesh(stoneGeos, new THREE.MeshStandardMaterial({
    color: 0xb8bcc4, map: stoneTex, roughness: 0.95,
    bumpMap: stoneTex, bumpScale: 0.55
  })));
  const poolMat = waterMat(0x02030a, { seed: 32, repX: 1.5, repY: 1.5, env: 1.8 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.015;
  grove.add(pool);
  updaters.push(poolMat.userData.update);
  grove.position.set(14, 0, 10.5);
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
      teleport(0, -3.4, 0); // 直接站在帷幕之门前
      ui.fade(false);
      freeze.on = false;
      glowPlane.material.emissiveIntensity = 0.5;
      gateLight.intensity = 16;
      audio.sfx('owl', 0.8);
      ui.caption('你没有走向帷幕。是帷幕走向了你。', 5200);
    }, 2400);
  };
  const groveTrig = zoneTrigger({ x: 14, z: 10.5, r: 2.1 }, groveEgg, { cooldown: 60 });
  updaters.push((dt) => groveTrig.update(player, dt));

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
  // v1.10 抛光 P13「远处的声」：环飞的剪影偶尔叫两声——声源挂在
  // 它此刻的方位上（视觉与声第一次对上）。每 70–120s（seeded），
  // 两只错开各自的钟。The owls are not what they seem.
  const owlRng = rng(97);
  const owlCall = owls.map((_, i) => ({ next: 34 + owlRng() * 40 + i * 26 }));
  updaters.push((dt, t) => {
    for (let i = 0; i < owls.length; i++) {
      const o = owls[i];
      const a = t * o.speed + o.phase;
      o.owl.position.set(Math.cos(a) * o.r, o.h + Math.sin(t * 0.5 + o.phase) * 1.6, Math.sin(a) * o.r);
      o.owl.rotation.y = -a - Math.PI / 2;
      o.wingL.rotation.z = Math.sin(t * 5 + o.phase) * 0.5;
      o.wingR.rotation.z = -Math.sin(t * 5 + o.phase) * 0.5;
      owlCall[i].next -= dt;
      if (owlCall[i].next <= 0) {
        owlCall[i].next = 70 + owlRng() * 50;
        audio.sfxAt('owl', o.owl.position.x, o.owl.position.z, 1.0, 12);
      }
    }
  });

  group.add(new THREE.AmbientLight(0x18222a, 0.9));

  return {
    group,
    spawn: { x: 0, z: 7.5, yaw: 0 },
    bounds: zonesBounds(ZONES),
    // 脚步材质分区：夜街=沥青 / diner=瓷砖 / 红房间=硬面 / 瀑布眺望台=木栈道 / 其余林地=泥土
    surfaceAt: (x, z) => {
      if (x >= 27.6 && x <= 31.6 && z >= -12 && z <= -3.6) return 'tile';        // diner
      if (x >= 16.5 && x <= 28.0 && z >= -17 && z <= 3) return 'asphalt';        // 夜街 + 门洞
      if (Math.hypot(x + 20, z + 16) <= 6.0) return 'tile';                       // 红房间折线地板
      if (x >= 5 && x <= 17 && z >= -29 && z <= -22.5) return 'wood';             // 瀑布眺望台
      return 'dirt';
    },
    // 混响分区：diner 小木屋 / 红房间帷幕围合 = 房间尾音；林地与夜街 = 干外景
    spaceAt: (x, z) => {
      if (x >= 27.6 && x <= 31.6 && z >= -12 && z <= -3.6) return 'room';
      if (Math.hypot(x + 20, z + 16) <= 6.0) return 'room';
      return 'outdoor';
    },
    update: (dt, t) => { for (const u of updaters) u(dt, t); },
    eggs: { 'stone-circle': groveTrig, 'falls-vigil': vigilTrig },
    // GLB 松树解析就位信号——main.js 等它再宣布 hall-loaded（普查完整）
    ready: glbReady,
    onLeave: () => { for (const id of timers) clearTimeout(id); }
  };
}
