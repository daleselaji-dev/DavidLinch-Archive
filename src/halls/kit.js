// ============================================================
// kit — 程序化美术工具库。所有几何/材质/纹理均由代码生成，
// 项目内不存在任何外部图像或音频素材。
// v1.2：主机级风格化精修 —— 圆角几何、织物 sheen、
// 高精程序纹理（木纹/拉丝金属/污渍）、合并几何控 draw call、
// 栏杆/立柱/岩石/扶手椅等构件、多分区可逛边界。
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PALETTE = {
  ink: 0x0a0608,
  velvet: 0x8f0e1e,
  velvetHi: 0xd4243c,
  neonBlue: 0x3ec5ff,
  neonPink: 0xff2e88,
  ivory: 0xf2e9dc,
  gold: 0xc9a35c
};

// ---------- 画布纹理 ----------
export function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

export function noiseCanvasTexture(size = 256, base = 128, amp = 60, repeat = 4) {
  return canvasTexture(size, (g, s) => {
    const img = g.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = base + (Math.random() - 0.5) * amp * 2;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, repeat, repeat);
}

/** 污渍/磨损蒙版叠层：在已有画布上泼洒暗斑与擦痕 */
export function grime(g, s, { stains = 26, scratches = 30, alpha = 0.1 } = {}) {
  for (let i = 0; i < stains; i++) {
    const r = 8 + Math.random() * s * 0.14;
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, `rgba(0,0,0,${alpha * (0.5 + Math.random())})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.translate(Math.random() * s, Math.random() * s);
    g.fillStyle = grad;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
  }
  g.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
  g.lineWidth = 1;
  for (let i = 0; i < scratches; i++) {
    g.beginPath();
    const x = Math.random() * s;
    const y = Math.random() * s;
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
    g.stroke();
  }
}

/** 黑白折线地板（红房间纹样，含地板接缝与磨损） */
export function chevronTexture(colA = '#0d0d0f', colB = '#e8e2d5', repeat = 6) {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = colA;
    g.fillRect(0, 0, s, s);
    g.fillStyle = colB;
    const n = 4;
    const w = s / n;
    for (let row = -1; row < n + 1; row++) {
      g.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const x = (i * w) / 2;
        const y = row * w + (i % 2 === 0 ? 0 : w / 2);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      for (let i = n * 2; i >= 0; i--) {
        const x = (i * w) / 2;
        const y = row * w + (i % 2 === 0 ? 0 : w / 2) + w / 2;
        g.lineTo(x, y);
      }
      g.closePath();
      if (row % 2 === 0) g.fill();
    }
    // 板块接缝
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(0, i * w); g.lineTo(s, i * w); g.stroke();
    }
    grime(g, s, { stains: 14, scratches: 22, alpha: 0.06 });
  }, repeat, repeat);
}

/** 木纹（拼板 + 年轮曲线 + 节疤 + 接缝） */
export function woodTexture({ base = [36, 24, 12], vary = 12, planks = 8, vertical = false, size = 512 } = {}) {
  return canvasTexture(size, (g, s) => {
    const pw = s / planks;
    for (let i = 0; i < planks; i++) {
      const v = (Math.random() - 0.5) * vary * 2;
      g.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.7},${base[2] + v * 0.45})`;
      if (vertical) g.fillRect(i * pw, 0, pw - 1.5, s);
      else g.fillRect(0, i * pw, s, pw - 1.5);
      // 年轮曲线
      for (let k = 0; k < 9; k++) {
        g.strokeStyle = `rgba(${base[0] * 0.4},${base[1] * 0.4},${base[2] * 0.4},${0.16 + Math.random() * 0.2})`;
        g.lineWidth = 0.8 + Math.random();
        g.beginPath();
        const off = Math.random() * s;
        for (let x = 0; x <= s; x += 16) {
          const wob = Math.sin((x + off) * 0.02) * 3 + Math.sin((x + off) * 0.11) * 1.2;
          const px = vertical ? i * pw + (k / 9) * pw + wob * 0.4 : x;
          const py = vertical ? x : i * pw + (k / 9) * pw + wob * 0.4;
          if (x === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
      }
      // 节疤
      if (Math.random() < 0.6) {
        const kx = vertical ? i * pw + pw * (0.3 + Math.random() * 0.4) : Math.random() * s;
        const ky = vertical ? Math.random() * s : i * pw + pw * (0.3 + Math.random() * 0.4);
        g.strokeStyle = 'rgba(10,6,3,0.55)';
        for (let r = 1.5; r < 6; r += 1.6) {
          g.beginPath(); g.ellipse(kx, ky, r * 1.6, r, 0.4, 0, 7); g.stroke();
        }
      }
    }
    // 接缝阴影
    g.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 1; i < planks; i++) {
      if (vertical) g.fillRect(i * pw - 1, 0, 2, s);
      else g.fillRect(0, i * pw - 1, s, 2);
    }
    grime(g, s, { stains: 10, scratches: 14, alpha: 0.05 });
  });
}

/** 拉丝金属（方向性细纹 + 随机亮丝） */
export function brushedMetalTexture(size = 256, base = 132, streak = 46) {
  return canvasTexture(size, (g, s) => {
    g.fillStyle = `rgb(${base},${base},${base + 4})`;
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      const v = base + (Math.random() - 0.5) * streak;
      g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`;
      g.fillRect(0, y, s, 1);
    }
    for (let i = 0; i < 26; i++) {
      const v = base + 40 + Math.random() * 50;
      g.fillStyle = `rgba(${v},${v},${v},0.25)`;
      g.fillRect(0, Math.random() * s, s, 0.7);
    }
  }, 2, 2);
}

/** 织物织纹（十字交叉编织） */
export function weaveTexture(colA = '#20080d', colB = '#31121a', size = 256, cells = 42) {
  return canvasTexture(size, (g, s) => {
    g.fillStyle = colA;
    g.fillRect(0, 0, s, s);
    const c = s / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? colB : colA;
        g.fillRect(x * c, y * c, c - 0.6, c - 0.6);
      }
    }
    grime(g, s, { stains: 6, scratches: 4, alpha: 0.05 });
  }, 6, 6);
}

export function softCircleTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTexture(128, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
}

// ---------- v1.10 P6 接触阴影 ----------
let ctShadowTex = null;
/**
 * 接触阴影贴片组——道具落地处的一小摊软阴影（假 AO），防「摆上去的」
 * 悬浮感。spots: [{ x, z, r, rz?, ry?, y? }]（rz 缺省为 r=圆摊；ry 为
 * 摊的水平朝向；y 缺省 0.006 贴地）。多摊合并为**单 mesh**、共享一张
 * 径向贴图（模块级缓存），polygonOffset 防与地面深度打架；黑色不受光，
 * 低档无需回退（静态零带宽）。
 */
export function contactShadows(spots, opacity = 0.42) {
  if (!ctShadowTex) {
    ctShadowTex = canvasTexture(128, (g, s) => {
      g.clearRect(0, 0, s, s);
      const rad = g.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s / 2);
      rad.addColorStop(0, 'rgba(0,0,0,0.9)');
      rad.addColorStop(0.55, 'rgba(0,0,0,0.42)');
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rad;
      g.fillRect(0, 0, s, s);
    });
  }
  const geos = spots.map(({ x, z, r, rz = r, ry = 0, y = 0.006 }) => {
    const g = new THREE.PlaneGeometry(r * 2, rz * 2);
    // 先在面内定朝向再放平：rotateZ(θ) → rotateX(-π/2) 等价于水平 yaw θ
    g.rotateZ(ry);
    g.rotateX(-Math.PI / 2);
    g.translate(x, y, z);
    return g;
  });
  return mergedMesh(geos, new THREE.MeshBasicMaterial({
    map: ctShadowTex, color: 0x000000, transparent: true, opacity,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1
  }));
}

// ---------- v1.10 P15 墙脚 AO 带 ----------
let wallAOTex = null;
/**
 * 墙脚阴影带——墙与地交线处的一条软渐变（假环境光遮蔽），杀掉
 * 「墙贴着地」的 CG 感。runs: [{ x, z, len, ry?, w?, y? }]——每条以
 * (x,z) 为中点、沿本地 x 向铺 len 长；暗边初始朝世界 -z，ry 绕竖轴
 * 转到贴墙一侧（0=北墙 / π=南墙 / π/2=西墙 / -π/2=东墙）。多条合并
 * **单 mesh**、共享一张线性渐变贴图（模块级缓存），polygonOffset 防
 * 与地面深度打架；黑色不受光，静态零带宽低档免回退（与接触阴影同口径）。
 */
export function wallAO(runs, opacity = 0.32) {
  if (!wallAOTex) {
    wallAOTex = canvasTexture(64, (g, s) => {
      g.clearRect(0, 0, s, s);
      const grad = g.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, 'rgba(0,0,0,0.85)');
      grad.addColorStop(0.42, 'rgba(0,0,0,0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    });
  }
  const geos = runs.map(({ x, z, len, ry = 0, w = 0.55, y = 0.008 }) => {
    const g = new THREE.PlaneGeometry(len, w);
    g.rotateX(-Math.PI / 2); // 放平后贴图暗边（画布顶行）指向世界 -z
    g.rotateY(ry);
    g.translate(x, y, z);
    return g;
  });
  return mergedMesh(geos, new THREE.MeshBasicMaterial({
    map: wallAOTex, color: 0x000000, transparent: true, opacity,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1
  }));
}

// ---------- 圆角几何 / 合并 ----------
/** 圆角盒几何 */
export function roundedBoxGeo(w, h, d, r, segments = 3) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
}

/** 圆角盒（关键装置禁用裸 Box 的替代品） */
export function roundedBoxMesh(w, h, d, r, material, segments = 3) {
  return new THREE.Mesh(roundedBoxGeo(w, h, d, r, segments), material);
}

/** 多份几何合并为单 mesh（省 draw call）。矩阵需已应用。
 *  RoundedBoxGeometry 等非索引几何与标准索引几何混用时自动归一化。 */
export function mergedMesh(geos, material) {
  const mixed = geos.some((g) => !g.index) && geos.some((g) => g.index);
  const list = mixed ? geos.map((g) => (g.index ? g.toNonIndexed() : g)) : geos;
  const merged = mergeGeometries(list, false);
  if (!merged) {
    throw new Error('mergedMesh: 合并失败（属性不兼容）: ' +
      geos.map((g) => `${g.type}${g.index ? '' : '(non-indexed)'}`).join(','));
  }
  for (const g of geos) g.dispose();
  if (list !== geos) for (const g of list) g.dispose();
  return new THREE.Mesh(merged, material);
}

/** 应用位置/旋转/缩放后返回克隆几何（配合 mergedMesh） */
export function xform(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const g = geo.clone();
  const m = new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(rx, ry, rz))
    .scale(new THREE.Vector3(s, s, s))
    .setPosition(x, y, z);
  g.applyMatrix4(m);
  return g;
}

// ---------- 天鹅绒帷幕 ----------
export function velvetMaterial(color = PALETTE.velvet) {
  const rough = noiseCanvasTexture(256, 196, 46, 4);
  const sheenCol = new THREE.Color(color).lerp(new THREE.Color(0xfff0e0), 0.42);
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.88,
    metalness: 0.0,
    roughnessMap: rough,
    bumpMap: rough,
    bumpScale: 0.55,
    sheen: 1.0,
    sheenRoughness: 0.5,
    sheenColor: sheenCol,
    envMapIntensity: 0.4,
    side: THREE.DoubleSide
  });
}

/** 垂坠褶皱帷幕：三个八度正弦叠加位移的高分段平面 */
export function curtain(width, height, color = PALETTE.velvet, folds = 7, material = null) {
  const geo = new THREE.PlaneGeometry(width, height, Math.max(72, folds * 18), 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = x / width + 0.5;
    const v = y / height + 0.5; // 0 底 1 顶
    const sag = 1 - Math.pow(Math.abs(y / height) * 2, 2) * 0.12;
    const hem = 1 + (1 - v) * 0.25; // 下摆略微张开
    const z =
      (Math.sin(u * Math.PI * folds * 2) * 0.16 +
        Math.sin(u * Math.PI * folds * 5.3 + 1.7) * 0.05 +
        Math.sin(u * Math.PI * folds * 11.7 + 0.6) * 0.02) * sag * hem;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material || velvetMaterial(color));
}

/**
 * 带帷头（valance）的帷幕组：主幕 + 顶部短幕 + 挂杆。
 * 比裸 curtain 多一层褶皱层次。
 */
export function curtainWithValance(width, height, color = PALETTE.velvet, folds = 7) {
  const g = new THREE.Group();
  const mat = velvetMaterial(color);
  const main = curtain(width, height, color, folds, mat);
  main.position.y = height / 2;
  const valH = Math.min(0.9, height * 0.16);
  const val = curtain(width * 1.02, valH, color, Math.round(folds * 1.6), mat);
  val.position.set(0, height - valH / 2 + 0.02, 0.09);
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, width * 1.06, 10),
    new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x6b5232, roughness: 0.35, metalness: 0.9, envMapIntensity: 1.1 })
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, height + 0.05, 0.1);
  g.add(main, val, rod);
  return g;
}

/**
 * 围合式帷幕墙（v1.5 整体化）：一件连续的圆柱幕，褶皱沿整个弧长
 * 不间断——不再由多段独立布片拼合（旧做法在段与段之间留下
 * 无来由的接缝，把帷幕读碎了）。可留缺口（arc < 2π）。
 * segments 参数保留以兼容旧签名，仅作褶皱密度参考。
 */
export function curtainRing(radius, height, color, segments = 18, arc = Math.PI * 2, startAngle = 0) {
  const group = new THREE.Group();
  const closed = Math.abs(arc - Math.PI * 2) < 1e-4;
  // 褶皱数按弧长取整——整圆时波数为整数，首尾相接零缝
  const folds = Math.max(10, Math.round(radius * arc * 0.85));
  const m1 = folds;
  const m2 = Math.round(folds * 2.65);
  const m3 = Math.round(folds * 5.85);
  const radial = Math.min(420, Math.max(120, folds * 6));
  // CylinderGeometry 参数角 θ：x = r·sinθ, z = r·cosθ；
  // 世界方位角 φ（x = r·cosφ, z = r·sinφ）↔ θ = π/2 − φ
  const geo = new THREE.CylinderGeometry(
    radius, radius, height, radial, 8, true,
    Math.PI / 2 - (startAngle + arc), arc
  );
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const phi = Math.atan2(x, z); // 连续角（整数波数下 sin 跨缝连续）
    const v = y / height + 0.5;
    const sag = 1 - Math.pow(Math.abs(y / height) * 2, 2) * 0.12;
    const hem = 1 + (1 - v) * 0.25;
    const off =
      (Math.sin(phi * m1) * 0.16 +
        Math.sin(phi * m2 + 1.7) * 0.05 +
        Math.sin(phi * m3 + 0.6) * 0.02) * sag * hem;
    const s = (radius + off) / radius;
    pos.setX(i, x * s);
    pos.setZ(i, z * s);
  }
  geo.computeVertexNormals();
  // 整圆时焊接接缝法线：首列与末列顶点同位置，直接取平均
  if (closed) {
    const nrm = geo.attributes.normal;
    const cols = radial + 1;
    for (let row = 0; row < 9; row++) {
      const a = row * cols;
      const b = row * cols + radial;
      const nx = (nrm.getX(a) + nrm.getX(b)) / 2;
      const ny = (nrm.getY(a) + nrm.getY(b)) / 2;
      const nz = (nrm.getZ(a) + nrm.getZ(b)) / 2;
      nrm.setXYZ(a, nx, ny, nz);
      nrm.setXYZ(b, nx, ny, nz);
    }
  }
  const mesh = new THREE.Mesh(geo, velvetMaterial(color));
  mesh.position.y = height / 2;
  group.add(mesh);
  return group;
}

// ---------- 霓虹灯牌 ----------
export function neonSign(text, { color = '#ff2e88', size = 3, font = 'Georgia, serif', weight = '400', letter = 0.12 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const fpx = 110;
  g.font = `${weight} ${fpx}px ${font}`;
  const tw = g.measureText(text).width * (1 + letter);
  c.width = Math.ceil(tw + 220);
  c.height = 300;
  const ctx = c.getContext('2d');
  ctx.font = `${weight} ${fpx}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [blur, alpha] of [[46, 0.55], [22, 0.75], [8, 0.9]]) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.scale(1 + letter, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  const aspect = c.width / c.height;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, toneMapped: false,
    side: THREE.DoubleSide, depthWrite: false
  });
  mat.color.set(color);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * aspect, size), mat);
  const light = new THREE.PointLight(color, 4, size * 6, 1.6);
  const group = new THREE.Group();
  group.add(mesh, light);
  group.userData.flicker = (t, seed = 0) => {
    const f = Math.sin(t * 17 + seed) * Math.sin(t * 5.3 + seed * 2) > 0.92 ? 0.35 : 1;
    mat.opacity = f;
    light.intensity = 4 * f;
  };
  return group;
}

// ---------- 粒子 ----------
export function smokeLayer(count, area, { color = 0xf2e9dc, opacity = 0.05, size = 9, yBase = 0.4, ySpread = 1.2 } = {}) {
  const geo = new THREE.BufferGeometry();
  const posArr = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    posArr[i * 3] = (Math.random() - 0.5) * area.x;
    posArr[i * 3 + 1] = yBase + Math.random() * ySpread;
    posArr[i * 3 + 2] = (Math.random() - 0.5) * area.z;
    seed[i] = Math.random() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity,
    map: softCircleTexture(), depthWrite: false,
    blending: THREE.NormalBlending, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.update = (dt, t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      p.array[i * 3] += Math.sin(t * 0.13 + seed[i]) * dt * 0.24;
      p.array[i * 3 + 2] += Math.cos(t * 0.11 + seed[i] * 1.3) * dt * 0.24;
    }
    p.needsUpdate = true;
    pts.rotation.y = t * 0.008;
  };
  return pts;
}

export function dustField(count, area, { color = 0xf2e9dc, size = 0.05, opacity = 0.5 } = {}) {
  const geo = new THREE.BufferGeometry();
  const posArr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    posArr[i * 3] = (Math.random() - 0.5) * area.x;
    posArr[i * 3 + 1] = Math.random() * area.y;
    posArr[i * 3 + 2] = (Math.random() - 0.5) * area.z;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity,
    map: softCircleTexture(), depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.update = (dt, t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      p.array[i * 3 + 1] -= dt * 0.05;
      if (p.array[i * 3 + 1] < 0) p.array[i * 3 + 1] = area.y;
      p.array[i * 3] += Math.sin(t * 0.4 + i) * dt * 0.02;
    }
    p.needsUpdate = true;
  };
  return pts;
}

/** 假体积光锥（叠加混合渐变） */
export function lightCone(topR, bottomR, height, color = 0xf2e9dc, opacity = 0.06) {
  const tex = canvasTexture(64, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
  const geo = new THREE.CylinderGeometry(topR, bottomR, height, 24, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color, map: tex, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  return new THREE.Mesh(geo, mat);
}

/**
 * 双层体积光锥（v1.4 P7）：内芯亮 + 外晕柔，
 * userData.setStrength(k) 供交互/闪烁调制两层同步。
 */
export function lightCone2(topR, bottomR, height, color = 0xf2e9dc, opacity = 0.055, { dust = false } = {}) {
  const g = new THREE.Group();
  const outer = lightCone(topR, bottomR, height, color, opacity);
  const inner = lightCone(topR * 0.42, bottomR * 0.52, height * 0.985, color, opacity * 2.2);
  g.add(outer, inner);
  const state = { k: 1 };
  // v1.10 C2：光柱里的尘埃流——竖向亮条纹 + 微粒缓慢下沉、随呼吸
  // 微涨落（updateDust 第三参）；低档 updateDust(on=false) 退回素色锥
  let dustMesh = null;
  if (dust) {
    const streakTex = canvasTexture(128, (gg, s) => {
      gg.clearRect(0, 0, s, s);
      const sr = rng(19);
      for (let i = 0; i < 24; i++) {
        const x = sr() * s;
        const w = 0.8 + sr() * 2.2;
        const grad = gg.createLinearGradient(0, 0, 0, s);
        const a = 0.05 + sr() * 0.15;
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, `rgba(255,255,255,${a.toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        gg.fillStyle = grad;
        gg.fillRect(x, 0, w, s);
      }
      for (let i = 0; i < 80; i++) {
        gg.fillStyle = `rgba(255,255,255,${(0.1 + sr() * 0.28).toFixed(3)})`;
        gg.fillRect(sr() * s, sr() * s, 1.4, 1.4 + sr() * 2.2);
      }
    });
    streakTex.wrapS = streakTex.wrapT = THREE.RepeatWrapping;
    dustMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(topR * 0.8, bottomR * 0.86, height * 0.97, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color, map: streakTex, transparent: true, opacity: opacity * 1.5,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    g.add(dustMesh);
  }
  g.userData.setStrength = (k) => {
    state.k = k;
    outer.material.opacity = opacity * k;
    inner.material.opacity = opacity * 2.2 * k;
  };
  g.userData.updateDust = (dt, t, breath = 0, on = true) => {
    if (!dustMesh) return;
    dustMesh.material.map.offset.y -= dt * 0.016; // 灰在光里落
    dustMesh.rotation.y = t * 0.03;
    dustMesh.material.opacity = on ? opacity * 1.5 * state.k * (1 + breath * 0.25) : 0;
  };
  return g;
}

// ---------- 建筑构件 ----------
export function floorMesh(w, d, material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** 通往其他展厅的门廊（v1.2：圆角门柱 + 线脚楣石 + 黄铜踢脚） */
export function doorway({ label, labelZh, color = '#3ec5ff', width = 2.4, height = 3.4 }) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [26, 13, 15], planks: 2, vertical: true, size: 256 }),
    color: 0x241318, roughness: 0.42, metalness: 0.35, envMapIntensity: 0.9
  });
  const brassMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.3, metalness: 0.95, envMapIntensity: 1.2
  });
  // 圆角门柱（含柱脚/柱头黄铜环）
  const colGeo = new RoundedBoxGeometry(0.34, height, 0.34, 3, 0.06);
  const ringGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.09, 14);
  const columns = mergedMesh([
    xform(colGeo, -width / 2, height / 2, 0),
    xform(colGeo, width / 2, height / 2, 0)
  ], frameMat);
  const rings = mergedMesh([
    xform(ringGeo, -width / 2, 0.06, 0),
    xform(ringGeo, width / 2, 0.06, 0),
    xform(ringGeo, -width / 2, height - 0.06, 0),
    xform(ringGeo, width / 2, height - 0.06, 0)
  ], brassMat);
  // 楣石：主梁 + 上下线脚
  const lintel = mergedMesh([
    xform(new RoundedBoxGeometry(width + 0.9, 0.34, 0.5, 3, 0.05), 0, height + 0.17, 0),
    xform(new THREE.BoxGeometry(width + 1.1, 0.07, 0.6), 0, height + 0.38, 0),
    xform(new THREE.BoxGeometry(width + 1.0, 0.05, 0.55), 0, height - 0.02, 0)
  ], frameMat);
  // 门内的"虚空" —— 微光涌动的黑
  const voidMat = new THREE.MeshStandardMaterial({
    color: 0x02010a, roughness: 1,
    emissive: new THREE.Color(color), emissiveIntensity: 0.16
  });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.2, height - 0.1), voidMat);
  portal.position.y = height / 2;
  const sign = neonSign(label, { color, size: 0.42 });
  sign.position.y = height + 0.95;
  const signZh = neonSign(labelZh, { color, size: 0.3, font: "'Songti SC','SimSun',serif" });
  signZh.position.y = height + 0.52;
  // 踏步（圆角 + 黄铜防滑条）
  const step = roundedBoxMesh(width + 0.6, 0.09, 1.1, 0.03,
    new THREE.MeshStandardMaterial({ color: 0x1c1216, roughness: 0.7 }));
  step.position.set(0, 0.045, 0.35);
  const stepTrim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.012, 0.05), brassMat);
  stepTrim.position.set(0, 0.095, 0.82);
  group.add(columns, rings, lintel, portal, sign, signZh, step, stepTrim);
  group.userData.portal = portal;
  group.userData.update = (dt, t) => {
    portal.material.emissiveIntensity = 0.13 + Math.sin(t * 1.7) * 0.06;
    sign.userData.flicker(t, width);
  };
  return group;
}

/** 档案长廊灯牌 */
export function archivePlaque(film) {
  const tex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#0c0709';
    g.fillRect(0, 0, s, s);
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.fillStyle = film.accent;
    g.font = '400 120px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(String(film.year), s / 2, 168);
    g.fillStyle = '#f2e9dc';
    g.font = '400 44px Georgia, serif';
    g.fillText(film.title, s / 2, 268, s - 60);
    g.font = '36px "Songti SC","SimSun",serif';
    g.fillStyle = 'rgba(242,233,220,0.85)';
    g.fillText(film.titleZh, s / 2, 336, s - 60);
    g.strokeStyle = film.accent;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(90, 388); g.lineTo(s - 90, 388);
    g.stroke();
    g.fillStyle = 'rgba(242,233,220,0.45)';
    g.font = '26px "Courier New", monospace';
    g.fillText(film.type === 'tv' ? 'TELEVISION' : film.type === 'short' ? 'SHORT WORKS' : 'FEATURE FILM', s / 2, 440);
  });
  const mesh = roundedBoxMesh(1.5, 1.5, 0.09, 0.03,
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.55,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5
    }));
  return mesh;
}

// ---------- 博物馆化构件 ----------

/** canvas 中文换行 */
function wrapText(g, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * 引语立牌（v1.5 —— show, don't tell）：
 * 取代旧的墙挂大字展签。一支黄铜细杆托一块斜面小板，
 * 远看几乎全黑，只有一枚微亮的引号——字在你走近之前不存在。
 * 走近（quoteStandUpdater）→ 板上那句话缓缓显影，
 * HUD 侧卡浮现原文 + 一句解释 + 一句评述。
 * quote: { zh, en, source, note?, aside? }
 */
export function quoteStand(quote, accent = '#c9a35c') {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x6b5232, roughness: 0.35, metalness: 0.9, envMapIntensity: 1.1
  });
  // 配重圆座 + 细杆（一条车削剖面）
  const post = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.17, 0), new THREE.Vector2(0.16, 0.025), new THREE.Vector2(0.05, 0.06),
      new THREE.Vector2(0.024, 0.12), new THREE.Vector2(0.017, 0.9), new THREE.Vector2(0.03, 0.96)
    ], 14),
    brass
  );
  group.add(post);
  // 斜面小板：静默态——近黑底 + 一枚微亮引号
  const dimTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#0c0709';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(201,163,92,0.35)';
    g.lineWidth = 2;
    g.strokeRect(6, 6, s - 12, s - 12);
    g.fillStyle = 'rgba(201,163,92,0.6)';
    g.font = '400 62px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('\u201c', s / 2, s / 2 + 24);
  });
  const tilt = new THREE.Group();
  tilt.position.y = 0.99;
  tilt.rotation.x = -0.5;
  const board = roundedBoxMesh(0.54, 0.4, 0.03, 0.012,
    new THREE.MeshStandardMaterial({
      map: dimTex, roughness: 0.55,
      emissive: 0xf2e9dc, emissiveMap: dimTex, emissiveIntensity: 0.28
    }));
  tilt.add(board);
  // 显影层：只有那句话（解释与评述交给走近后的侧卡）
  const litTex = canvasTexture(512, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = accent;
    g.font = '400 96px Georgia, serif';
    g.textAlign = 'left';
    g.fillText('\u201c', 44, 130);
    g.fillStyle = '#f2e9dc';
    g.font = '400 46px "Songti SC","SimSun",Georgia,serif';
    const zhLines = wrapText(g, quote.zh, s - 128);
    let y = 208;
    for (const line of zhLines) {
      g.fillText(line, 64, y);
      y += 68;
    }
    g.fillStyle = 'rgba(201,163,92,0.85)';
    g.font = '26px "Courier New", monospace';
    g.textAlign = 'right';
    g.fillText('— DAVID LYNCH', s - 52, s - 56);
  });
  const litMat = new THREE.MeshBasicMaterial({
    map: litTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false
  });
  const lit = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.37), litMat);
  lit.position.z = 0.018;
  tilt.add(lit);
  group.add(tilt);
  group.userData.board = board;
  group.userData.quote = quote;
  group.userData.setNear = (k) => {
    litMat.opacity = k;
    board.material.emissiveIntensity = 0.28 + k * 0.5;
  };
  return group;
}

/**
 * 立牌接近驱动器：加入展厅 updaters —— 玩家走进 radius 内，
 * 板上文字显影 + HUD 侧卡浮现；走出（带迟滞）即收回。
 */
export function quoteStandUpdater(stand, player, ui, { radius = 3.0, narration = null, docent = null } = {}) {
  const wp = new THREE.Vector3();
  let ready = false;
  let k = 0;
  let shown = false;
  let spoke = false;
  let dwell = 0;
  return (dt) => {
    if (!ready) {
      stand.getWorldPosition(wp);
      ready = true;
    }
    const d = Math.hypot(player.x - wp.x, player.z - wp.z);
    const near = d < radius;
    k += ((near ? 1 : 0) - k) * Math.min(1, (dt || 0.016) * 3.2);
    stand.userData.setNear(Math.max(0, Math.min(1, k)));
    if (near && !shown) {
      shown = true;
      ui.showPlaque(stand.userData.quote);
    } else if (shown && d > radius + 0.9) {
      shown = false;
      ui.hidePlaque();
    }
    // v1.7 导览层：立牌只显名言；背景与访谈语境由讲解员在
    // 你驻足端详（1.6s）之后低声补上——每次进厅只讲一遍，
    // 且不打断正在进行的其他讲解
    if (near && docent && narration && !spoke) {
      dwell += dt || 0.016;
      if (dwell > 1.6 && !narration.letters.active) {
        spoke = true;
        narration.speak(docent);
      }
    } else if (!near) {
      dwell = 0;
    }
  };
}

/**
 * 玻璃展柜 —— 圆角展台 + 黄铜沿 + 透明罩 + 顶光 + 小铭牌。
 * 内容物请加到 group.userData.slot（位于台面中心上方）。
 */
export function vitrine(labelTitle, labelSub, accent = '#c9a35c') {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [22, 13, 15], planks: 3, vertical: true, size: 256 }),
    color: 0x1c1014, roughness: 0.38, metalness: 0.2, envMapIntensity: 0.8
  });
  const brassMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x8a6c3c, roughness: 0.28, metalness: 0.95, envMapIntensity: 1.3
  });
  const base = roundedBoxMesh(0.85, 1.02, 0.85, 0.04, baseMat);
  base.position.y = 0.51;
  const top = roundedBoxMesh(0.95, 0.05, 0.95, 0.02, baseMat);
  top.position.y = 1.045;
  // 黄铜沿口
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.015, 0.97), brassMat);
  trim.position.y = 1.075;
  // 玻璃罩
  const glass = new THREE.Mesh(
    new RoundedBoxGeometry(0.78, 0.72, 0.78, 2, 0.02),
    new THREE.MeshPhysicalMaterial({
      color: 0xcfe4ff, transparent: true, opacity: 0.08,
      roughness: 0.04, metalness: 0.0, envMapIntensity: 1.7, depthWrite: false
    })
  );
  glass.position.y = 1.44;
  // 玻璃棱边
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.78, 0.72, 0.78)),
    new THREE.LineBasicMaterial({ color: 0x8fb8d8, transparent: true, opacity: 0.32 })
  );
  edges.position.copy(glass.position);
  // 顶光
  const light = new THREE.PointLight(0xfff2dd, 2.2, 3.2, 2);
  light.position.y = 1.9;
  // 标签牌（斜面小铭牌）
  const labelTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#100a0d';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = accent;
    g.lineWidth = 3;
    g.strokeRect(8, 8, s - 16, s - 16);
    g.fillStyle = '#f2e9dc';
    g.textAlign = 'center';
    g.font = '400 40px "Songti SC","SimSun",serif';
    g.fillText(labelTitle, s / 2, s / 2 - 12, s - 40);
    g.fillStyle = accent;
    g.font = '22px "Courier New", monospace';
    g.fillText(labelSub, s / 2, s / 2 + 42, s - 40);
  });
  const label = roundedBoxMesh(0.5, 0.28, 0.022, 0.01,
    new THREE.MeshStandardMaterial({
      map: labelTex, roughness: 0.6,
      emissive: 0xf2e9dc, emissiveMap: labelTex, emissiveIntensity: 0.4
    }));
  label.position.set(0, 1.02, 0.52);
  label.rotation.x = -0.45;
  // 内容物挂点
  const slot = new THREE.Group();
  slot.position.y = 1.28;
  group.add(base, top, trim, glass, edges, light, label, slot);
  group.userData.slot = slot;
  group.userData.label = label;
  return group;
}

/**
 * 黑影人形 —— 抽象的、无面目的煤黑色形体（彩蛋惊吓用）。
 * 顶点噪声位移让它看起来"不对劲"；不复刻任何受版权保护的角色形象。
 */
export function darkFigure(height = 2.1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x060404, roughness: 0.95, metalness: 0,
    emissive: 0x1a0303, emissiveIntensity: 0.35
  });
  const bodyGeo = new THREE.CylinderGeometry(0.26, 0.42, height * 0.78, 10, 8);
  const bp = bodyGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i);
    const n = Math.sin(y * 7.3 + bp.getX(i) * 11) * 0.06 + (Math.random() - 0.5) * 0.05;
    bp.setX(i, bp.getX(i) * (1 + n));
    bp.setZ(i, bp.getZ(i) * (1 + n));
  }
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = height * 0.39;
  const headGeo = new THREE.SphereGeometry(0.2, 10, 8);
  const hp = headGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const s = 1 + (Math.random() - 0.5) * 0.24;
    hp.setXYZ(i, hp.getX(i) * s, hp.getY(i) * s * 1.2, hp.getZ(i) * s);
  }
  headGeo.computeVertexNormals();
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = height * 0.86;
  head.rotation.z = 0.14; // 微微歪头——最不对劲的细节
  group.add(body, head);
  return group;
}

/**
 * 帷形人影 —— 顺滑车削的抽象人形剪影（v1.7 转身惊吓主体）。
 * 一条连续车削剖面走完 裙裾→收腰→肩→颈→头，48 段径向；
 * 布褶是随高度衰减的正弦竖褶（无随机噪声，不起疙瘩），
 * 全程光滑法线。绒黑体表 + 极暗红内衬自发光：闪光拍里只读出
 * 「一个完整的人形」，看不清任何细节。
 * userData: { pivot 前倾/摆动枢轴, mat, setRush(k) 奔袭形变 }
 */
export function veiledFigure(height = 2.25) {
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  group.add(pivot);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x070408, roughness: 0.88, metalness: 0,
    sheen: 0.6, sheenColor: 0x2a0a12, sheenRoughness: 0.6,
    emissive: 0x180205, emissiveIntensity: 0.45
  });
  const H = height;
  const prof = [
    [0.34, 0], [0.335, 0.02], [0.3, 0.1], [0.245, 0.24], [0.2, 0.38],
    [0.165, 0.52], [0.15, 0.6], [0.168, 0.7], [0.182, 0.775], [0.15, 0.815],
    [0.08, 0.845], [0.062, 0.865], [0.082, 0.895], [0.088, 0.94],
    [0.062, 0.982], [0.001, 1.0]
  ].map(([r, y]) => new THREE.Vector2(r * H * 0.5, y * H));
  const geo = new THREE.LatheGeometry(prof, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const a = Math.atan2(z, x);
    const fall = Math.max(0, 1 - y / (H * 0.78)); // 褶皱只在下身，肩颈头保持光洁
    const fold = 1 + Math.sin(a * 7) * 0.045 * fall + Math.sin(a * 3 + 1.7) * 0.03 * fall;
    pos.setX(i, x * fold);
    pos.setZ(i, z * fold);
  }
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mat);
  pivot.add(body);
  pivot.rotation.z = 0.05; // 整个剪影微微偏着头——最不对劲的一度
  group.userData.pivot = pivot;
  group.userData.mat = mat;
  /** 奔袭形变：k∈[0,1] —— 前倾扑近 + 裙裾展开 + 轻微侧摆（连续，无痉挛）。
   *  lookAt 后组的 +z 朝向玩家，正向 rotation.x 即「朝你前倾」。 */
  group.userData.setRush = (k, t = 0) => {
    pivot.rotation.x = 0.28 * k;
    pivot.rotation.z = 0.05 + Math.sin(t * 9) * 0.05 * k;
    body.scale.set(1 + k * 0.12, 1, 1 + k * 0.12);
  };
  return group;
}

/**
 * 拐角魅影 —— v1.8 拐角惊吓主体（抽象无面目，比帷形人影更细一级）。
 * 车削主身之上做非对称后处理：肩背向后隆起一坨驼峰、头微前倾；
 * 裙裾下摆一圈 seeded 长短错落的破布条；两条过长的垂臂（双段微屈 +
 * 收尖手锥，指尖几乎拖地），挂在独立枢轴上可随步伐拖摆。绒黑体表 +
 * 极暗红内衬自发光：剪影光下只读出轮廓，闪光拍里读出体积。
 * v1.12（门禁 59）v3 全面重做「长发与眼睛」：
 * ① **hairVeil 披垂发帘**——局部车削（前脸留 ~70° 开口）从头顶披垂
 *   过肩：角度双谐波绺条起伏 + 下摆 seeded 参差发梢，剪影从「兜帽
 *   人形」变成「披垂长发的团块」；发帘外再挂九绺**成绺长发**（宽头
 *   收尖、长短错落，前侧两绺垂过胸口）——团块感由绺与绺叠出来。
 * ② **eyeSockets 深陷眼窝空洞**——发帘开口内、头前面上两粒空洞：
 *   内芯纯黑无光（任何灯照不进去），外环极暗红 emissive 随呼吸
 *   搏动/扑近烧亮。**无鼻无嘴无瞳无脸皮**：非写实人脸、非肖像——
 *   恐怖感只来自「发帘后面两个洞在看你」。
 * ③ **headPivot 顿挪抬头**——发帘与眼窝挂头枢轴：lurch 平台段头
 *   一档一档抬起（每停一次抬头多一点，越停越「看着你」）；rush 拍
 *   发帘迎风后甩、眼窝烧起来。
 * 保留 v1.11：第二层错相位破披（下摆 seeded 撕口）/三指长手/身体
 * 冻住时红光呼吸/越挪越前倾。
 * userData: { pivot, headPivot, mat, eyeMat, setLurch(s,t), setRush(k,t) }
 */
export function cornerWraith(height = 2.35) {
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  group.add(pivot);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x050307, roughness: 0.92, metalness: 0,
    sheen: 0.55, sheenColor: 0x1c0812, sheenRoughness: 0.55,
    emissive: 0x140208, emissiveIntensity: 0.4
  });
  const H = height;
  // 主身：裙裾→收腰→胸背→缩颈→兜帽头（连续车削剖面，48 段光滑）
  const prof = [
    [0.36, 0], [0.355, 0.02], [0.315, 0.09], [0.26, 0.22], [0.21, 0.36],
    [0.175, 0.5], [0.16, 0.58], [0.185, 0.68], [0.205, 0.76], [0.17, 0.8],
    [0.1, 0.83], [0.078, 0.85], [0.105, 0.885], [0.115, 0.93],
    [0.085, 0.972], [0.001, 1.0]
  ].map(([r, y]) => new THREE.Vector2(r * H * 0.5, y * H));
  const geo = new THREE.LatheGeometry(prof, 48);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const u = y / H;
    if (r > 1e-4) {
      const a = Math.atan2(z, x);
      // 布褶只在下身；肩颈头保持光洁（与帷形人影同语言，褶更深一点）
      const fall = Math.max(0, 1 - u / 0.72);
      const fold = 1 + Math.sin(a * 8) * 0.05 * fall + Math.sin(a * 3 + 2.1) * 0.034 * fall;
      pos.setX(i, x * fold);
      pos.setZ(i, z * fold);
    }
    // 非对称化（lookAt 后 +z 朝玩家）：驼峰向背侧（-z）隆起、头向玩家侧前倾——
    // 平滑钟形衰减，不破坏光滑法线
    const humpB = Math.exp(-Math.pow((u - 0.72) / 0.1, 2));
    const headF = Math.exp(-Math.pow((u - 0.95) / 0.07, 2));
    pos.setZ(i, pos.getZ(i) - humpB * H * 0.055 + headF * H * 0.05);
    pos.setY(i, y - headF * H * 0.02); // 头微微垂下去
  }
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mat);
  pivot.add(body);
  // ---- v1.12 ①②③：头枢轴 + 披垂发帘 + 成绺长发 + 眼窝空洞 ----
  const headPivot = new THREE.Group();
  headPivot.position.set(0, H * 0.84, 0);
  pivot.add(headPivot);
  // 发丝材质：比体表更暗、冷暗高光（头发的光），闪帧里读出绺条体积；
  // 极暗冷 emissive 兜底——纯黑发在纯黑巷里也得留一口剪影
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: 0x040306, roughness: 0.55, metalness: 0,
    sheen: 1.0, sheenColor: 0x181a28, sheenRoughness: 0.38,
    emissive: 0x040309, emissiveIntensity: 0.5,
    side: THREE.DoubleSide
  });
  // 发帘：局部车削（前脸留 ~76° 开口——洞里是面部空洞与眼窝）。
  // 第二拍 INSPECT 修正：首版太贴头、下摆与肩线齐平——「长发团块」
  // 剪影读不出来。现在加宽（颌位 0.19）加长（垂到 -0.3H，盖过驼峰
  // 一半）+ 绺条起伏加深一倍：远看是一坨披垂的发，不是第二层兜帽。
  const OPEN_HALF = Math.PI * 0.21; // 开口半角 ~38°
  const hairProf = [
    [0.035, 0.17], [0.115, 0.125], [0.16, 0.06], [0.19, -0.01],
    [0.205, -0.09], [0.225, -0.19], [0.24, -0.3]
  ].map(([r, y]) => new THREE.Vector2(r * H * 0.5, y * H));
  const hairGeo = new THREE.LatheGeometry(
    hairProf, 40, OPEN_HALF, Math.PI * 2 - OPEN_HALF * 2);
  const hp = hairGeo.attributes.position;
  const hr = rng(211);
  const hemTear = [];
  for (let i = 0; i <= 40; i++) hemTear.push(hr() * 0.08 + (i % 4 === 0 ? hr() * 0.07 : 0));
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i);
    const y = hp.getY(i);
    const z = hp.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const a = Math.atan2(x, z); // phi=0 → +z（前脸开口中线）
    // 绺条起伏：双谐波沿角度 + 随高度微扭（发是垂下来的，不是罩上去的）
    const tw = a + (y / H) * 0.4;
    const clump = 1 + 0.1 * Math.sin(tw * 9 + 1.3) + 0.05 * Math.sin(tw * 17 + 4.1);
    hp.setX(i, x * clump);
    hp.setZ(i, z * clump);
    if (y < -H * 0.1) { // 下摆参差发梢（seeded 长短）
      const idx = Math.min(40, Math.floor(((a + Math.PI) / (Math.PI * 2)) * 40));
      hp.setY(i, y + hemTear[idx] * H);
    }
  }
  hairGeo.computeVertexNormals();
  // 成绺长发 ×13：宽头收尖、长短错落（前侧两绺垂过胸口、框住面部
  // 开口），避开前脸开口；粗细上探到 0.03H——绺与绺叠出团块感
  const strandGeos = [hairGeo];
  const strandR = rng(223);
  const strandAngles = [
    0.78, 1.16, 1.55, 1.95, 2.38, 2.8, 3.22, 3.66, 4.1, 4.52, 4.92, 5.28, 5.5
  ];
  for (const [si, sa0] of strandAngles.entries()) {
    const sa = sa0 + (strandR() - 0.5) * 0.18;
    const long = si === 0 || si === strandAngles.length - 1; // 前侧两绺垂过胸口
    const sl = (long ? 0.52 : 0.3) * H + strandR() * 0.12 * H;
    const sw = (0.02 + strandR() * 0.011) * H;
    const sg = new THREE.ConeGeometry(sw, sl, 5);
    sg.rotateX(Math.PI); // 宽头在上、发梢收尖朝下
    sg.translate(0, -sl / 2, 0);
    const rr = H * (0.078 + strandR() * 0.014);
    strandGeos.push(xform(sg,
      Math.sin(sa) * rr, H * (0.1 + strandR() * 0.04), Math.cos(sa) * rr,
      Math.sin(sa) * 0.12 + (strandR() - 0.5) * 0.1, 0,
      -Math.cos(sa) * 0.12 + (strandR() - 0.5) * 0.1));
  }
  const hair = mergedMesh(strandGeos, hairMat);
  headPivot.add(hair);
  // 面部空洞：发帘开口内一块凹陷的纯黑无光弧面——开口里没有脸，
  // 只有一个洞（任何灯照不进去）；两粒眼窝环是洞里仅有的东西
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const faceVoid = new THREE.Mesh(new THREE.SphereGeometry(0.052 * H, 14, 12), voidMat);
  faceVoid.scale.set(0.95, 1.3, 0.55);
  faceVoid.position.set(0, 0.045 * H, 0.052 * H);
  headPivot.add(faceVoid);
  // 眼窝空洞 ×2：外环极暗红 emissive（呼吸/烧亮由 eyeMat 控）+ 内芯
  // 纯黑——深陷进面部空洞的两个洞口，不是眼球（无瞳、无脸皮）
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0a0304, roughness: 0.8, metalness: 0,
    emissive: 0x3a060c, emissiveIntensity: 0.5
  });
  const mkRing = (sx) => {
    const t = new THREE.TorusGeometry(0.016 * H, 0.005 * H, 6, 14);
    t.scale(1, 1.3, 1); // 眼窝竖长——空洞更「陷」
    return xform(t, sx * 0.027 * H, 0.042 * H, 0.088 * H, -0.1, 0, sx * 0.12);
  };
  const mkVoid = (sx) => {
    const s = new THREE.SphereGeometry(0.015 * H, 10, 8);
    s.scale(1, 1.32, 0.5);
    return xform(s, sx * 0.027 * H, 0.042 * H, 0.086 * H, -0.1, 0, sx * 0.12);
  };
  const eyeGeo = mergeGeometries([mkRing(-1), mkRing(1), mkVoid(-1), mkVoid(1)], true);
  const eyes = new THREE.Mesh(eyeGeo, [eyeMat, eyeMat, voidMat, voidMat]);
  headPivot.add(eyes);
  // v1.11 ②：第二层错相位破披——肩背披下的一层残布，褶相位与主身
  // 错开，下摆一圈 seeded 参差撕口（双面材质，撕口翻看得到里子）。
  const capeMat = new THREE.MeshPhysicalMaterial({
    color: 0x060409, roughness: 0.95, metalness: 0,
    sheen: 0.4, sheenColor: 0x160710, sheenRoughness: 0.65,
    side: THREE.DoubleSide
  });
  const capeProf = [
    [0.235, 0.55], [0.26, 0.62], [0.27, 0.68], [0.255, 0.74],
    [0.21, 0.79], [0.13, 0.825], [0.09, 0.848]
  ].map(([r, y]) => new THREE.Vector2(r * H * 0.5 * 1.1, y * H));
  const capeGeo = new THREE.LatheGeometry(capeProf, 36);
  const cpos = capeGeo.attributes.position;
  const capeR = rng(157);
  const tear = [];
  for (let i = 0; i <= 36; i++) tear.push(capeR() * 0.12 + (i % 3 === 0 ? capeR() * 0.1 : 0));
  for (let i = 0; i < cpos.count; i++) {
    const x = cpos.getX(i);
    const y = cpos.getY(i);
    const z = cpos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr < 1e-4) continue;
    const a = Math.atan2(z, x);
    const fold = 1 + Math.sin(a * 5 + 0.9) * 0.06 + Math.sin(a * 11 + 2.6) * 0.022;
    cpos.setX(i, x * fold);
    cpos.setZ(i, z * fold);
    if (y < H * 0.6) { // 只撕最下缘一圈
      const idx = Math.min(36, Math.floor(((a + Math.PI) / (Math.PI * 2)) * 36));
      cpos.setY(i, y + tear[idx] * H);
    }
  }
  capeGeo.computeVertexNormals();
  const cape = new THREE.Mesh(capeGeo, capeMat);
  pivot.add(cape);
  // 裙裾破布条：一圈 seeded 长短错落的收尖布条（合并单 mesh）
  const wr = rng(83);
  const fringeGeos = [];
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2 + wr() * 0.3;
    const fr = H * 0.168 + wr() * H * 0.02;
    const fl = 0.14 + wr() * 0.2;
    const cone = new THREE.ConeGeometry(0.028 + wr() * 0.014, fl, 5);
    cone.translate(0, -fl / 2, 0);
    fringeGeos.push(xform(cone,
      Math.cos(a) * fr, 0.1 + wr() * 0.05, Math.sin(a) * fr,
      (wr() - 0.5) * 0.5, 0, (wr() - 0.5) * 0.5));
  }
  const fringe = mergedMesh(fringeGeos, mat);
  pivot.add(fringe);
  // 过长垂臂 ×2：肩点枢轴（可摆）→ 上下两段微屈 + 收尖手锥，指尖近地
  const mkArm = (side) => {
    const arm = new THREE.Group();
    const upLen = H * 0.3;
    const loLen = H * 0.32;
    const up = new THREE.CylinderGeometry(0.03, 0.042, upLen, 8);
    up.translate(0, -upLen / 2, 0);
    const lo = new THREE.CylinderGeometry(0.022, 0.03, loLen, 8);
    lo.translate(0, -loLen / 2, 0);
    // v1.11 ③：三指过长收尖（指根在腕点扇开，指尖几乎拖地）
    const fingerGeos = [];
    const wx = side * upLen * 0.18;
    const wy = -upLen * 0.98 - loLen * 0.99;
    const wz = upLen * 0.06;
    for (const [fi, fl] of [[-1, 0.19], [0, 0.27], [1, 0.21]]) {
      const fg = new THREE.ConeGeometry(0.015, fl, 5);
      fg.translate(0, -fl / 2, 0);
      fingerGeos.push(xform(fg, wx + fi * 0.03, wy, wz + fi * 0.014, fi * 0.08, 0, fi * 0.2));
    }
    arm.add(mergedMesh([
      xform(up, 0, 0, 0, 0.1, 0, side * -0.16),
      xform(lo, side * upLen * 0.15, -upLen * 0.98, upLen * 0.1, -0.06, 0, side * 0.1),
      ...fingerGeos
    ], mat));
    arm.position.set(side * H * 0.115, H * 0.79, -H * 0.01);
    pivot.add(arm);
    return arm;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  pivot.rotation.z = 0.06; // 常态就歪着——最不对劲的一度
  group.userData.pivot = pivot;
  group.userData.headPivot = headPivot;
  group.userData.mat = mat;
  group.userData.eyeMat = eyeMat;
  /** 顿挪体态：s 为 lurchEase 后的阶梯进度——挪的时候侧倾/沉肩/臂拖摆，
   *  s 停在平台上时全身随之冻住（sin(s·6π) 在平台段不动）。
   *  v1.11：越挪越前倾（0.12→0.26——每顿定格在更近的一档）；身体
   *  冻住时暗红内衬随呼吸搏动（红光在呼吸——唯一还在动的东西）。
   *  v1.12：**头一档一档抬起**（headPivot 随 s 后仰——每停一次抬头
   *  多一点，发帘里的眼窝越停越正对你）；眼窝环与红光错半拍呼吸。 */
  group.userData.setLurch = (s, t = 0) => {
    const beat = Math.sin(s * Math.PI * 6);
    pivot.rotation.x = 0.12 + s * 0.14;
    pivot.rotation.z = 0.06 + s * 0.045 + beat * 0.075;
    pivot.position.y = Math.abs(beat) * 0.035;
    headPivot.rotation.x = -(0.06 + s * 0.34);
    headPivot.rotation.z = -0.06 * s + beat * 0.03;
    armL.rotation.x = -0.08 + beat * 0.1;
    armR.rotation.x = -0.08 - beat * 0.1;
    armL.rotation.z = 0.05 * beat;
    armR.rotation.z = 0.05 * beat;
    mat.emissiveIntensity = 0.42 + 0.36 * (0.5 + 0.5 * Math.sin(t * 2.4));
    eyeMat.emissiveIntensity = 0.55 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.4 + 1.2));
  };
  /** 扑近形变：k∈[0,1] —— 深前倾 + 双臂甩后 + 裙裾展开 + 连续侧摆；
   *  v1.11：红光在扑近里烧起来（0.9→1.4，闪帧里读出体积）。
   *  v1.12：头死死昂着盯你 + 发帘迎风后甩 + 眼窝烧起来（1.2→2.8）。 */
  group.userData.setRush = (k, t = 0) => {
    pivot.rotation.x = 0.26 + 0.3 * k;
    pivot.rotation.z = 0.06 + Math.sin(t * 11) * 0.06 * k;
    pivot.position.y = 0;
    headPivot.rotation.x = -0.4 - 0.22 * k;
    headPivot.rotation.z = 0;
    hair.rotation.x = -0.14 * k;
    armL.rotation.x = -0.08 - 0.55 * k;
    armR.rotation.x = -0.08 - 0.55 * k;
    body.scale.set(1 + k * 0.1, 1, 1 + k * 0.1);
    fringe.scale.set(1 + k * 0.22, 1, 1 + k * 0.22);
    mat.emissiveIntensity = 0.9 + k * 0.5;
    eyeMat.emissiveIntensity = 1.2 + k * 1.6;
  };
  return group;
}

/**
 * 顿挪缓动（v1.8 拐角惊吓）：把 [0,1] 进度切成 steps 步——每步只在
 * 前 duty 段用 smoothstep 快挪，其余时间死死停住。「黑影一顿一顿
 * 从拐角后挪出来」靠的就是这条曲线（纯函数，顿挪性质可单测）。
 */
export function lurchEase(k, steps = 3, duty = 0.42) {
  const kk = Math.min(1, Math.max(0, k));
  const seg = Math.min(steps - 1, Math.floor(kk * steps));
  const local = Math.min(1, (kk * steps - seg) / duty);
  const e = local * local * (3 - 2 * local);
  return (seg + e) / steps;
}

/**
 * 拐角触发器（v1.8 惊吓主机制）—— 玩家走进拐角触发区、且视线落进
 * 「即将看见」方向的 ±fov/2 锥内即触发：转过拐角、垃圾箱与后门
 * 方向即将入画的那一步就是扳机。背向穿区（原路北归）不触发；
 * 面朝墙进区的，转回那个方向的瞬间触发。冷却后可重复。
 * zone: { x, z, r } 圆形区；lookAt: { x, z } 视线目标点。
 * 返回 { update(pose, dt), force() }；pose = { x, z, yaw }。
 */
export function cornerTrigger(zone, lookAt, onFire, { fov = 2.6, cooldown = 75 } = {}) {
  let coolT = 0;
  const r2 = zone.r * zone.r;
  return {
    update(pose, dt = 0.016) {
      if (coolT > 0) { coolT -= dt; return; }
      const dx = pose.x - zone.x;
      const dz = pose.z - zone.z;
      if (dx * dx + dz * dz > r2) return;
      // 视线方向（yaw 0 → -z）与目标方向的夹角（卷绕安全）
      const want = Math.atan2(-(lookAt.x - pose.x), -(lookAt.z - pose.z));
      let d = pose.yaw - want;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) <= fov / 2) {
        coolT = cooldown;
        onFire();
      }
    },
    /** 冒烟测试直接引爆 */
    force() {
      coolT = cooldown;
      onFire();
    }
  };
}

/**
 * 转身触发器（v1.7 惊吓核心机制）—— 玩家在指定区域驻留
 * armTime 秒「上膛」后，快速转身/突然回看（滑动时间窗内累计
 * yaw 转角冲过阈值）即触发。不踩圈、不按键：回头那一下才是扳机。
 * 阈值经指数窗衰减：慢扫视累计不起来（180° 用 1s 转完 ≈ 1.4 rad，
 * 不触发）；甩头式回望（180° 半秒内）一定冲过 2.0 rad。
 * zone: 矩形数组 [{minX,maxX,minZ,maxZ}]
 * 返回 { update(pose, dt), force() }；pose = { x, z, yaw }
 */
export function turnTrigger(zone, onFire, { minTurn = 2.0, window = 0.5, armTime = 1.0, cooldown = 45 } = {}) {
  let prevYaw = null;
  let acc = 0;
  let dwell = 0;
  let coolT = 0;
  const inZone = (x, z) =>
    zone.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  return {
    update(pose, dt = 0.016) {
      if (coolT > 0) coolT -= dt;
      const inside = inZone(pose.x, pose.z);
      dwell = inside ? dwell + dt : 0;
      let d = 0;
      if (prevYaw !== null) {
        d = pose.yaw - prevYaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
      }
      prevYaw = pose.yaw;
      acc = acc * Math.exp(-dt / window) + Math.abs(d);
      if (inside && dwell >= armTime && coolT <= 0 && acc >= minTurn) {
        acc = 0;
        dwell = 0;
        coolT = cooldown;
        onFire();
      }
    },
    /** 冒烟测试直接引爆 */
    force() {
      coolT = cooldown;
      onFire();
    }
  };
}

/**
 * 区域触发器 —— 玩家走进圆形区域时触发（彩蛋核心机制）。
 * 返回 update(playerPos) 供每帧调用。
 * opts: { cooldown 秒（默认可重复触发的冷却）, once 只触发一次 }
 */
export function zoneTrigger({ x, z, r }, onEnter, { cooldown = 20, once = false } = {}) {
  let inside = false;
  let fired = false;
  let coolT = 0;
  const r2 = r * r;
  const trig = {
    update(playerPos, dt = 0.016) {
      if (coolT > 0) coolT -= dt;
      const dx = playerPos.x - x;
      const dz = playerPos.z - z;
      const inNow = dx * dx + dz * dz < r2;
      if (inNow && !inside && coolT <= 0 && !(once && fired)) {
        fired = true;
        coolT = cooldown;
        onEnter();
      }
      inside = inNow;
    },
    /** 冒烟测试直接引爆 */
    force() {
      fired = true;
      coolT = cooldown;
      onEnter();
    }
  };
  return trig;
}

/** 立式话筒 v2（v1.4 P3：车削底座 + 药丸头 + 铬鳍片网罩 + 后倾支耳） */
export function micStand() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(), color: 0x9a9a9a, roughness: 0.24, metalness: 0.95, envMapIntensity: 1.2
  });
  const basePts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    basePts.push(new THREE.Vector2(0.26 * (1 - t * t * 0.72), t * 0.07));
  }
  const base = new THREE.Mesh(new THREE.LatheGeometry(basePts, 22), metal);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 26), metal);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.035;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.45, 10), metal);
  pole.position.y = 0.75;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), metal);
  collar.position.y = 1.05;
  // 五十年代药丸头：网面凹凸 + 三道水平铬鳍 + 双侧支耳（微后倾）
  const meshBump = noiseCanvasTexture(64, 128, 90, 6);
  const headMat = new THREE.MeshStandardMaterial({
    map: brushedMetalTexture(128, 118, 40), color: 0xb8bcc2, roughness: 0.3, metalness: 0.92,
    bumpMap: meshBump, bumpScale: 0.25, envMapIntensity: 1.4
  });
  const headGrp = new THREE.Group();
  const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.1, 6, 14), headMat);
  const finGeos = [];
  const finGeo = new THREE.TorusGeometry(0.077, 0.008, 6, 20);
  for (const y of [-0.045, 0, 0.045]) finGeos.push(xform(finGeo, 0, y, 0, Math.PI / 2, 0, 0));
  finGeo.dispose();
  const fins = mergedMesh(finGeos, metal);
  const lugGeos = [
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), -0.085, -0.09, 0, 0, 0, 0.5),
    xform(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), 0.085, -0.09, 0, 0, 0, -0.5)
  ];
  // 防喷圈：短臂挑出的细铬环，随头部一起后仰
  const popGeos = [
    xform(new THREE.TorusGeometry(0.052, 0.005, 6, 22), 0, 0.05, 0.125),
    xform(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), 0, 0.02, 0.075, Math.PI / 2, 0, 0)
  ];
  headGrp.add(pill, fins, mergedMesh(lugGeos, metal), mergedMesh(popGeos, metal));
  headGrp.position.y = 1.52;
  headGrp.rotation.x = 0.22; // 朝观众微俯
  g.add(base, baseRing, pole, collar, headGrp);
  return g;
}

/**
 * 远景山脊/屋脊剪影环（v1.4 P8 三层景深的最远层）。
 * 双正弦包络 + seeded 抖动的锯齿高程，环形三角带；fog:false 保持剪影锐利。
 */
export function ridgeRing(radius, {
  baseH = 6, amp = 12, segs = 64, color = 0x040810, seed = 71,
  arc = Math.PI * 2, start = 0
} = {}) {
  const r = rng(seed);
  const p1 = r() * 7;
  const p2 = r() * 7;
  const heights = [];
  for (let i = 0; i <= segs; i++) {
    const k = (0.5 + 0.5 * Math.sin(i * 0.52 + p1)) * (0.55 + 0.45 * Math.sin(i * 0.21 + p2));
    heights.push(baseH + amp * k + (r() - 0.5) * amp * 0.16);
  }
  if (arc >= Math.PI * 2 - 1e-6) heights[segs] = heights[0]; // 整环闭合
  const pos = [];
  for (let i = 0; i < segs; i++) {
    const a0 = start + (i / segs) * arc;
    const a1 = start + ((i + 1) / segs) * arc;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    pos.push(x0, 0, z0, x1, 0, z1, x0, heights[i], z0);
    pos.push(x1, 0, z1, x1, heights[i + 1], z1, x0, heights[i], z0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide }));
}

/**
 * 松树资产 v2（v1.11 门禁 56 B1——重做点名的「三层光滑锥」）。
 * 冠：8 层枝轮开口锥 + 顶梢针尖——每层下缘（枝尖圈）沿角度连续函数
 * 参差伸缩 + 下垂（长短错落的枝尖，不再是光滑圆锥裙），针叶双色
 * 笔触纹理 + 凹凸；杆：9 段×3 环开口柱——根部张开（角度噪声喇叭）、
 * 全杆 S 形微弯、三根下垂断枝残桩，树皮竖向沟壑 canvas（map+bump 同源）。
 * 冠/杆各一份几何与材质，专为两只 InstancedMesh 设计（mesh 数不变）；
 * 显式返回 trunkGeo 高度归一 y∈[0,1]，实例侧用 scale.y 接到冠底。
 */
export function pineGeometryMaterial() {
  // ---- 冠 ----
  // v1.12 门禁 60 精修循环 v3：v2 的八层枝轮彼此首尾相接——中景读感
  // 仍是「连续锥裙叠塔」。三处结构升级：
  // ① 每层锥体收短（×0.8）拉开**层间空隙**，加一根贯穿冠体的内脊
  //   （顶点色压成暗褐——空隙里露出来的是被针叶阴影吃掉的树干）；
  // ② 顶点色分层明暗：下层枝轮压暗到 0.62（老枝背光），向上渐亮——
  //   一棵树自己就有纵深，不吃后处理；
  // ③ 下层枝轮下垂加深（0.16→0.30 随层递减）+ 段数 12→16（近树
  //   枝尖圈不再读出折角）。
  const tr = rng(67);
  const tiers = [
    [1.16, 1.0, -1.32], [1.03, 0.95, -0.86], [0.9, 0.92, -0.4],
    [0.78, 0.88, 0.05], [0.65, 0.84, 0.48], [0.51, 0.8, 0.9],
    [0.37, 0.74, 1.3], [0.2, 0.66, 1.66]
  ];
  const tint = (g, r, gg, b) => {
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = r;
      arr[i * 3 + 1] = gg;
      arr[i * 3 + 2] = b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  };
  const geos = [];
  for (const [ti, [rad, h, y]] of tiers.entries()) {
    const low = 1 - ti / (tiers.length - 1); // 1=最下层
    const cone = new THREE.ConeGeometry(rad, h * 0.8, 16, 1, true);
    const p = cone.attributes.position;
    const ph = tr() * Math.PI * 2;
    const ph2 = tr() * Math.PI * 2;
    for (let vi = 0; vi < p.count; vi++) {
      const vx = p.getX(vi);
      const vy = p.getY(vi);
      const vz = p.getZ(vi);
      const vr = Math.hypot(vx, vz);
      if (vr < 1e-4) continue;
      const a = Math.atan2(vz, vx);
      if (vy < 0) { // 枝尖圈：连续角度函数（seam 安全）参差 + 下垂
        const jag = 1 + 0.24 * Math.sin(a * 5 + ph) + 0.12 * Math.sin(a * 9 + ph2) +
          0.07 * Math.sin(a * 13 + ph * 1.3);
        p.setX(vi, vx * jag);
        p.setZ(vi, vz * jag);
        p.setY(vi, vy - (0.1 + 0.2 * low) -
          (0.09 + 0.1 * low) * (0.5 + 0.5 * Math.sin(a * 7 + ph2 * 1.7)));
      }
    }
    const shade = 0.62 + 0.38 * (1 - low); // 下层暗、上层亮
    geos.push(xform(tint(cone, shade, shade, shade), 0, y, 0));
  }
  geos.push(xform(
    tint(new THREE.ConeGeometry(0.055, 0.5, 6), 1, 1, 1), 0, 1.92, 0)); // 顶梢针尖
  // 冠内脊：层间空隙里露出来的一段暗褐树干（顶点色压色，同材质零新增）
  geos.push(xform(
    tint(new THREE.CylinderGeometry(0.045, 0.075, 3.2, 7), 0.55, 0.34, 0.22),
    0, 0.16, 0));
  const geo = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  geo.computeVertexNormals();
  // 针叶纹理：暗底 + 两色短笔触（斜排针束）
  const needleTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#0a150e';
    g.fillRect(0, 0, s, s);
    const r = rng(61);
    for (let i = 0; i < 340; i++) {
      const x = r() * s;
      const y = r() * s;
      const l = 3 + r() * 7;
      const a = Math.PI / 2 + (r() - 0.5) * 1.1;
      g.strokeStyle = `rgba(${10 + r() * 26 | 0},${34 + r() * 40 | 0},${18 + r() * 26 | 0},${0.35 + r() * 0.4})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }, 3, 3);
  const mat = new THREE.MeshStandardMaterial({
    map: needleTex, color: 0x93a38c, roughness: 0.95,
    bumpMap: needleTex, bumpScale: 0.5, side: THREE.DoubleSide,
    vertexColors: true // v1.12：分层明暗 + 冠内脊压色
  });
  // ---- 杆（y∈[0,1] 归一，实例侧 scale.y 接冠底；v1.12 段数 9→12） ----
  const trunk = new THREE.CylinderGeometry(0.052, 0.115, 1, 12, 3, true);
  trunk.translate(0, 0.5, 0);
  const tp = trunk.attributes.position;
  for (let vi = 0; vi < tp.count; vi++) {
    const vx = tp.getX(vi);
    const vy = tp.getY(vi);
    const vz = tp.getZ(vi);
    const a = Math.atan2(vz, vx);
    // 根部张开（角度噪声喇叭，越贴地越宽）
    const flare = 1 + Math.pow(Math.max(0, (0.16 - vy) / 0.16), 1.7) *
      (0.55 + 0.2 * Math.sin(a * 3 + 0.7) + 0.14 * Math.sin(a * 7 + 2.1));
    // 全杆 S 形微弯
    tp.setX(vi, vx * flare + Math.sin(vy * Math.PI) * 0.03 + vy * 0.02);
    tp.setZ(vi, vz * flare);
  }
  const trunkParts = [trunk];
  const sr = rng(73);
  for (let i = 0; i < 3; i++) { // 断枝残桩：下垂的秃枝
    const stub = new THREE.ConeGeometry(0.02 + sr() * 0.012, 0.22 + sr() * 0.14, 4, 1, true);
    stub.translate(0, -0.08, 0);
    const sa = sr() * Math.PI * 2;
    const sy = 0.42 + i * 0.16 + sr() * 0.06;
    trunkParts.push(xform(stub,
      Math.cos(sa) * 0.07, sy, Math.sin(sa) * 0.07,
      Math.PI * 0.62, sa, 0));
  }
  const trunkGeo = mergeGeometries(trunkParts, false);
  for (const g of trunkParts) g.dispose();
  trunkGeo.computeVertexNormals();
  // 树皮：竖向沟壑 + 横向皮鳞裂（map/bump 同源）
  const barkTex = canvasTexture(128, (g, s) => {
    g.fillStyle = '#150e08';
    g.fillRect(0, 0, s, s);
    const r = rng(59);
    for (let i = 0; i < 46; i++) {
      const x = r() * s;
      g.fillStyle = `rgba(${30 + r() * 26 | 0},${20 + r() * 16 | 0},${12 + r() * 10 | 0},${0.5 + r() * 0.4})`;
      g.fillRect(x, 0, 1 + r() * 3, s);
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = 'rgba(6,4,2,0.55)';
      g.fillRect(r() * s, r() * s, 2 + r() * 7, 1 + r() * 2);
    }
  }, 1, 2);
  const trunkMat = new THREE.MeshStandardMaterial({
    map: barkTex, roughness: 0.95, bumpMap: barkTex, bumpScale: 0.55,
    side: THREE.DoubleSide
  });
  return { geo, mat, trunkGeo, trunkMat };
}

/** 悬挂灯泡（车削灯罩） */
export function hangingBulb(color = 0xffe9c4, cordLen = 2) {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, cordLen, 6),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.9 })
  );
  cord.position.y = -cordLen / 2;
  // 车削灯罩剖面
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(0.05 + Math.sin(t * Math.PI * 0.52) * 0.21, -t * 0.2));
  }
  const shade = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 20),
    new THREE.MeshStandardMaterial({
      map: brushedMetalTexture(), color: 0x14141a, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide
    })
  );
  shade.position.y = -cordLen + 0.13;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: 3.2, toneMapped: true })
  );
  bulb.position.y = -cordLen - 0.05;
  const light = new THREE.PointLight(color, 6, 11, 1.7);
  light.position.y = -cordLen - 0.08;
  g.add(cord, shade, bulb, light);
  g.userData.bulb = bulb;
  g.userData.light = light;
  return g;
}

/** 电灯故障式闪烁控制器 */
export function makeFlicker(light, bulbMat, baseIntensity, seed = 0) {
  let burstT = 0;
  return (dt, t) => {
    const n = Math.sin(t * 13 + seed * 17) * Math.sin(t * 7.1 + seed * 5) * Math.sin(t * 3.3 + seed);
    let f = 1 - Math.max(0, n - 0.55) * 2.2;
    if (Math.random() < 0.0015) burstT = 0.24;
    if (burstT > 0) {
      burstT -= dt;
      f = Math.random() < 0.5 ? 0.08 : 1.25;
    }
    light.intensity = baseIntensity * Math.max(0.05, f);
    if (bulbMat) bulbMat.emissiveIntensity = 3.2 * Math.max(0.05, f);
  };
}

// ---------- v1.2 新构件 ----------

/** 木栏杆：上下横杆 + 立柱，合并为单 mesh */
// (v1.3 艺术三遍：通用圆杆 railing 已被 props.overlookRail / props.pipeRail 取代并删除)

/** 凹槽立柱：柱础 + 柱身 + 柱头，合并为单 mesh */
export function column(height = 6, radius = 0.32, colorHex = 0x1a1013) {
  const geos = [];
  geos.push(xform(new THREE.CylinderGeometry(radius * 1.5, radius * 1.62, 0.22, 18), 0, 0.11, 0));
  geos.push(xform(new THREE.CylinderGeometry(radius * 1.32, radius * 1.5, 0.12, 18), 0, 0.28, 0));
  geos.push(xform(new THREE.CylinderGeometry(radius * 0.92, radius, height - 0.9, 24, 1), 0, height / 2, 0));
  geos.push(xform(new THREE.CylinderGeometry(radius * 1.3, radius * 0.98, 0.16, 18), 0, height - 0.5, 0));
  geos.push(xform(new RoundedBoxGeometry(radius * 3, 0.2, radius * 3, 2, 0.04), 0, height - 0.32, 0));
  const flute = canvasTexture(128, (g, s) => {
    for (let x = 0; x < s; x++) {
      const v = 120 + Math.sin((x / s) * Math.PI * 20) * 46;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, 0, 1, s);
    }
  }, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex, roughness: 0.5, metalness: 0.25,
    bumpMap: flute, bumpScale: 0.5, envMapIntensity: 0.7
  });
  return mergedMesh(geos, mat);
}

/** 岩石（噪声位移二十面体） */
export function rockMesh(size = 1, color = 0x141821) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (Math.random() - 0.5) * 0.42;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, roughness: 0.95, bumpMap: noiseCanvasTexture(64, 128, 70, 2), bumpScale: 0.5
  }));
}

// （v1.3 艺术三遍：旧 roundedBox armchair 已由 props.clubChair 取代并删除）

/** 沿线段铺设的地面条带（小径/道路） */
export function groundStrip(x1, z1, x2, z2, width, material, y = 0.012) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, len + width * 0.5), material);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = -Math.atan2(x2 - x1, z2 - z1);
  m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  return m;
}

/** 碎石小径纹理 */
export function gravelTexture(base = '#131009', size = 256) {
  return canvasTexture(size, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 700; i++) {
      const v = 26 + Math.random() * 42;
      g.fillStyle = `rgba(${v},${v * 0.92},${v * 0.7},0.8)`;
      g.beginPath();
      g.arc(Math.random() * s, Math.random() * s, 0.6 + Math.random() * 2.2, 0, 7);
      g.fill();
    }
    grime(g, s, { stains: 8, scratches: 0, alpha: 0.08 });
  }, 2, 6);
}

// ============================================================
// v1.3 材质系统 —— seeded RNG / 高度图→Sobel 法线 / 三通道对齐
// 纹理组（map+normalMap+roughnessMap 由同一随机种子驱动，逐像素
// 对齐）/ PBR 材质工厂（含各向异性拉丝金属、湿沥青、静水）。
// 纹理尺寸遵守 PRODUCTION_PLAN §2.1 上限表。
// ============================================================

/** mulberry32 —— 可复现随机源（多通道纹理对齐的关键） */
export function rng(seed = 1) {
  let a = (seed * 1e9) >>> 0 || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasOf(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

export function texOf(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}

/**
 * 高度图 → 法线贴图（Sobel，环绕采样保平铺）。
 * 高度canvas 取 R 通道；输出 OpenGL 约定（+Y 上，配合 flipY canvas 纹理）。
 */
export function normalFromHeight(heightCanvas, strength = 1.4, repeatX = 1, repeatY = 1) {
  const s = heightCanvas.width;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, s, s).data;
  const h = (x, y) => src[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  const out = document.createElement('canvas');
  out.width = out.height = s;
  const g = out.getContext('2d');
  const img = g.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      // 左-右 / 下-上（canvas y 向下 + flipY 纹理 → v 向上）
      const dx = (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1)) -
                 (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1));
      const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) -
                 (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
      let nx = dx * strength;
      let ny = dy * strength;
      const inv = 1 / Math.hypot(nx, ny, 1);
      const i = (y * s + x) * 4;
      img.data[i] = (nx * inv * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return texOf(out, repeatX, repeatY);
}

/**
 * 高度图 → AO 贴图（v1.4 P1 五通道）。
 * 两尺度环绕盒模糊求邻域均值：比邻域低 → 处于凹处 → 遮蔽变暗。
 * 环绕采样保平铺；输出灰度 canvas 纹理（channel=0 与主 UV 共用）。
 */
export function aoFromHeight(heightCanvas, strength = 1.0, repeatX = 1, repeatY = 1) {
  const s = heightCanvas.width;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, s, s).data;
  const h = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) h[i] = src[i * 4] / 255;
  const blur = (input, radius) => {
    const tmp = new Float32Array(s * s);
    const out = new Float32Array(s * s);
    const norm = 1 / (radius * 2 + 1);
    for (let y = 0; y < s; y++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += input[y * s + ((k + s * 8) % s)];
      for (let x = 0; x < s; x++) {
        tmp[y * s + x] = acc * norm;
        acc += input[y * s + ((x + radius + 1) % s)] - input[y * s + ((x - radius + s * 8) % s)];
      }
    }
    for (let x = 0; x < s; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += tmp[((k + s * 8) % s) * s + x];
      for (let y = 0; y < s; y++) {
        out[y * s + x] = acc * norm;
        acc += tmp[((y + radius + 1) % s) * s + x] - tmp[((y - radius + s * 8) % s) * s + x];
      }
    }
    return out;
  };
  const near = blur(h, Math.max(1, Math.round(s * 0.012)));
  const wide = blur(h, Math.max(3, Math.round(s * 0.045)));
  const out = document.createElement('canvas');
  out.width = out.height = s;
  const g = out.getContext('2d');
  const img = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const occ = Math.max(0, (near[i] - h[i]) * 1.7 + (wide[i] - h[i]) * 0.9) * strength;
    const v = Math.round(Math.max(0.25, Math.min(1, 1 - occ * 2.4)) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = texOf(out, repeatX, repeatY);
  tex.channel = 0; // aoMap 默认 uv1——强制与主 UV 共用，几何无需 uv1
  return tex;
}

/** 纹理组装配（v1.4：三通道 → 五通道，+aoMap，可选 +metalnessMap） */
function setFrom(albedo, height, rough, { repX = 1, repY = 1, nStrength = 1.4, aoStrength = 1.0, metal = null } = {}) {
  const set = {
    map: texOf(albedo, repX, repY),
    normalMap: normalFromHeight(height, nStrength, repX, repY),
    roughnessMap: texOf(rough, repX, repY),
    aoMap: aoFromHeight(height, aoStrength, repX, repY)
  };
  if (metal) set.metalnessMap = texOf(metal, repX, repY);
  return set;
}

/** 确定性污渍/磨损（seeded 版 grime） */
function grimeR(g, s, r, { stains = 18, scratches = 20, alpha = 0.08 } = {}) {
  for (let i = 0; i < stains; i++) {
    const rad = 8 + r() * s * 0.13;
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    grad.addColorStop(0, `rgba(0,0,0,${alpha * (0.5 + r())})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.translate(r() * s, r() * s);
    g.fillStyle = grad;
    g.fillRect(-rad, -rad, rad * 2, rad * 2);
    g.restore();
  }
  g.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
  g.lineWidth = 1;
  for (let i = 0; i < scratches; i++) {
    g.beginPath();
    const x = r() * s;
    const y = r() * s;
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40);
    g.stroke();
  }
}

// ---------- 木纹三通道组 ----------
export function woodSet({
  base = [44, 30, 16], planks = 6, vertical = false, size = 512,
  seed = 7, repX = 1, repY = 1, worn = 0.5, gloss = 0.5, nStrength = 1.6
} = {}) {
  // 布局（归一化坐标，通道间共享）
  const r = rng(seed);
  const lay = [];
  for (let i = 0; i < planks; i++) {
    const rings = [];
    for (let k = 0; k < 9; k++) rings.push({ off: r(), amp: 0.16 + r() * 0.2, w: 0.8 + r() });
    lay.push({
      tone: (r() - 0.5) * 2,
      rings,
      knot: r() < 0.6 ? { u: 0.2 + r() * 0.6, v: r() } : null
    });
  }
  const drawPlank = (g, s, mode) => {
    const pw = s / planks;
    for (let i = 0; i < planks; i++) {
      const L = lay[i];
      const v = L.tone * 12;
      if (mode === 'albedo') {
        g.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.7},${base[2] + v * 0.45})`;
      } else if (mode === 'height') {
        const hv = Math.round(128 + L.tone * 7);
        g.fillStyle = `rgb(${hv},${hv},${hv})`;
      } else {
        const rv = Math.round(150 - gloss * 60 + L.tone * 12);
        g.fillStyle = `rgb(${rv},${rv},${rv})`;
      }
      if (vertical) g.fillRect(i * pw, 0, pw, s);
      else g.fillRect(0, i * pw, s, pw);
      // 年轮
      for (const ring of L.rings) {
        if (mode === 'albedo') {
          g.strokeStyle = `rgba(${base[0] * 0.4},${base[1] * 0.4},${base[2] * 0.4},${ring.amp})`;
        } else if (mode === 'height') {
          g.strokeStyle = 'rgba(112,112,112,0.5)';
        } else {
          g.strokeStyle = 'rgba(190,190,190,0.35)';
        }
        g.lineWidth = ring.w;
        g.beginPath();
        const off = ring.off * s;
        const ri = lay[i].rings.indexOf(ring);
        for (let t = 0; t <= s; t += 14) {
          const wob = Math.sin((t + off) * 0.02) * 3 + Math.sin((t + off) * 0.11) * 1.2;
          const along = t;
          const across = i * pw + ((ri + 0.5) / 9) * pw + wob * 0.4;
          const px = vertical ? across : along;
          const py = vertical ? along : across;
          if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.stroke();
      }
      // 节疤
      if (L.knot) {
        const kx = vertical ? i * pw + L.knot.u * pw : L.knot.v * s;
        const ky = vertical ? L.knot.v * s : i * pw + L.knot.u * pw;
        if (mode === 'albedo') g.strokeStyle = 'rgba(10,6,3,0.55)';
        else if (mode === 'height') g.strokeStyle = 'rgba(150,150,150,0.7)';
        else g.strokeStyle = 'rgba(215,215,215,0.7)';
        for (let rad = 1.5; rad < 6; rad += 1.6) {
          g.beginPath(); g.ellipse(kx, ky, rad * 1.6, rad, 0.4, 0, 7); g.stroke();
        }
      }
      // 使用磨损带（板条中央更亮更滑）
      if (mode !== 'height' && worn > 0) {
        const grad = vertical
          ? g.createLinearGradient(i * pw, 0, i * pw + pw, 0)
          : g.createLinearGradient(0, i * pw, 0, i * pw + pw);
        const a = mode === 'albedo' ? 0.10 * worn : 0.35 * worn;
        const col = mode === 'albedo' ? '255,240,220' : '40,40,40';
        grad.addColorStop(0, `rgba(${col},0)`);
        grad.addColorStop(0.5, `rgba(${col},${a})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = grad;
        if (vertical) g.fillRect(i * pw, 0, pw, s);
        else g.fillRect(0, i * pw, s, pw);
      }
    }
    // 板缝
    for (let i = 0; i < planks; i++) {
      if (mode === 'albedo') g.fillStyle = 'rgba(0,0,0,0.55)';
      else if (mode === 'height') g.fillStyle = 'rgb(52,52,52)';
      else g.fillStyle = 'rgb(215,215,215)';
      if (vertical) g.fillRect(((i * pw) + pw - 1.5 + s) % s, 0, 2.2, s);
      else g.fillRect(0, ((i * pw) + pw - 1.5 + s) % s, s, 2.2);
    }
  };
  const albedo = canvasOf(size, (g, s) => { drawPlank(g, s, 'albedo'); grimeR(g, s, rng(seed + 1), { stains: 10, scratches: 14, alpha: 0.05 }); });
  const height = canvasOf(size >> 1, (g, s) => drawPlank(g, s, 'height'));
  const rough = canvasOf(size >> 1, (g, s) => { drawPlank(g, s, 'rough'); grimeR(g, s, rng(seed + 1), { stains: 8, scratches: 10, alpha: 0.10 }); });
  return setFrom(albedo, height, rough, { repX, repY, nStrength });
}

// ---------- 砖墙三通道组 ----------
export function brickSet({
  tint = [36, 34, 38], rows = 10, cols = 5, size = 512,
  seed = 11, repX = 4, repY = 2, nStrength = 2.2
} = {}) {
  const r = rng(seed);
  const bricks = [];
  for (let row = 0; row < rows; row++) {
    for (let c = -1; c < cols + 1; c++) {
      bricks.push({ row, c, tone: r() * 16, chip: r() < 0.18 ? { u: r(), v: r() } : null });
    }
  }
  const draw = (g, s, mode) => {
    const bh = s / rows;
    const bw = s / cols;
    if (mode === 'albedo') g.fillStyle = 'rgb(16,15,17)';
    else if (mode === 'height') g.fillStyle = 'rgb(72,72,72)';
    else g.fillStyle = 'rgb(225,225,225)';
    g.fillRect(0, 0, s, s);
    for (const b of bricks) {
      const off = b.row % 2 ? bw / 2 : 0;
      const x = b.c * bw + off + 2;
      const y = b.row * bh + 2;
      if (mode === 'albedo') {
        g.fillStyle = `rgb(${tint[0] + b.tone},${tint[1] + b.tone * 0.85},${tint[2] + b.tone * 0.8})`;
      } else if (mode === 'height') {
        const hv = Math.round(150 + b.tone * 0.6);
        g.fillStyle = `rgb(${hv},${hv},${hv})`;
      } else {
        g.fillStyle = `rgb(${Math.round(168 - b.tone)},${Math.round(168 - b.tone)},${Math.round(168 - b.tone)})`;
      }
      g.fillRect(x, y, bw - 4, bh - 4);
      if (b.chip) {
        const cx = x + b.chip.u * (bw - 8);
        const cy = y + b.chip.v * (bh - 8);
        if (mode === 'albedo') g.fillStyle = 'rgba(12,11,13,0.8)';
        else if (mode === 'height') g.fillStyle = 'rgb(96,96,96)';
        else g.fillStyle = 'rgb(230,230,230)';
        g.beginPath(); g.arc(cx, cy, 3 + b.tone * 0.3, 0, 7); g.fill();
      }
    }
  };
  const albedo = canvasOf(size, (g, s) => { draw(g, s, 'albedo'); grimeR(g, s, rng(seed + 2), { stains: 16, scratches: 6, alpha: 0.09 }); });
  const height = canvasOf(size, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size >> 1, (g, s) => draw(g, s, 'rough'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength });
}

// ---------- 拉丝金属三通道组 ----------
export function metalBrushedSet({
  base = 132, streak = 46, size = 256, seed = 5, repX = 2, repY = 2, roughBase = 100
} = {}) {
  const r = rng(seed);
  const rows = [];
  for (let y = 0; y < size; y++) rows.push((r() - 0.5) * streak);
  const marks = [];
  for (let i = 0; i < 26; i++) marks.push({ v: r(), a: 0.2 + r() * 0.3 });
  const draw = (g, s, mode) => {
    for (let y = 0; y < s; y++) {
      const v = rows[Math.floor((y / s) * rows.length)];
      if (mode === 'albedo') {
        g.fillStyle = `rgba(${base + v},${base + v},${base + v + 4},1)`;
      } else if (mode === 'height') {
        g.fillStyle = `rgb(${Math.round(128 + v * 0.18)},${Math.round(128 + v * 0.18)},${Math.round(128 + v * 0.18)})`;
      } else {
        g.fillStyle = `rgb(${Math.round(roughBase + v * 0.7)},${Math.round(roughBase + v * 0.7)},${Math.round(roughBase + v * 0.7)})`;
      }
      g.fillRect(0, y, s, 1);
    }
    for (const m of marks) {
      if (mode === 'albedo') g.fillStyle = `rgba(${base + 60},${base + 60},${base + 62},${m.a})`;
      else if (mode === 'height') g.fillStyle = `rgba(140,140,140,${m.a})`;
      else g.fillStyle = `rgba(${roughBase + 70},${roughBase + 70},${roughBase + 70},${m.a})`;
      g.fillRect(0, m.v * size, size, 0.8);
    }
  };
  const albedo = canvasOf(size, (g, s) => draw(g, s, 'albedo'));
  const height = canvasOf(size, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size, (g, s) => draw(g, s, 'rough'));
  // v1.4 P1：金属度通道——高接触区磨掉镀层露出暗底（禁止单值 metalness）
  const metal = canvasOf(size, (g, s) => {
    g.fillStyle = 'rgb(236,236,236)';
    g.fillRect(0, 0, s, s);
    const rm = rng(seed + 4);
    for (let i = 0; i < 24; i++) {
      const rad = 4 + rm() * s * 0.09;
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      grad.addColorStop(0, `rgba(112,112,112,${0.22 + rm() * 0.3})`);
      grad.addColorStop(1, 'rgba(112,112,112,0)');
      g.save();
      g.translate(rm() * s, rm() * s);
      g.fillStyle = grad;
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    }
  });
  return setFrom(albedo, height, rough, { repX, repY, nStrength: 0.6, metal });
}

// ---------- 织物三通道组 ----------
export function weaveSet(colA = '#20080d', colB = '#31121a', {
  cells = 42, size = 256, seed = 9, repX = 6, repY = 6
} = {}) {
  const r = rng(seed);
  const jitter = [];
  for (let i = 0; i < cells * cells; i++) jitter.push(r());
  const draw = (g, s, mode) => {
    const c = s / cells;
    if (mode === 'albedo') g.fillStyle = colA;
    else if (mode === 'height') g.fillStyle = 'rgb(96,96,96)';
    else g.fillStyle = 'rgb(215,215,215)';
    g.fillRect(0, 0, s, s);
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const j = jitter[y * cells + x];
        const even = (x + y) % 2 === 0;
        if (mode === 'albedo') {
          g.fillStyle = even ? colB : colA;
          g.fillRect(x * c, y * c, c - 0.6, c - 0.6);
        } else if (mode === 'height') {
          // 每格一粒鼓起的线束，横竖交替拉长
          const grad = g.createRadialGradient(
            x * c + c / 2, y * c + c / 2, 0,
            x * c + c / 2, y * c + c / 2, c * 0.7
          );
          grad.addColorStop(0, `rgb(${170 + j * 20},${170 + j * 20},${170 + j * 20})`);
          grad.addColorStop(1, 'rgb(96,96,96)');
          g.save();
          g.translate(x * c + c / 2, y * c + c / 2);
          g.scale(even ? 1.4 : 0.7, even ? 0.7 : 1.4);
          g.translate(-(x * c + c / 2), -(y * c + c / 2));
          g.fillStyle = grad;
          g.fillRect(x * c - c, y * c - c, c * 3, c * 3);
          g.restore();
        } else {
          const rv = Math.round(205 + j * 26);
          g.fillStyle = `rgb(${rv},${rv},${rv})`;
          g.fillRect(x * c, y * c, c - 0.6, c - 0.6);
        }
      }
    }
  };
  const albedo = canvasOf(size, (g, s) => { draw(g, s, 'albedo'); grimeR(g, s, rng(seed + 3), { stains: 6, scratches: 4, alpha: 0.05 }); });
  const height = canvasOf(size, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size, (g, s) => draw(g, s, 'rough'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength: 1.0 });
}

// ---------- 水泥三通道组 ----------
export function concreteSet({
  base = [42, 42, 44], size = 512, seed = 13, repX = 3, repY = 3, joints = 4, nStrength = 1.8
} = {}) {
  const r = rng(seed);
  const blotches = [];
  for (let i = 0; i < 220; i++) blotches.push({ u: r(), v: r(), rad: r() * 0.09, dark: r() < 0.55, a: r() * 0.28 });
  const pits = [];
  for (let i = 0; i < 260; i++) pits.push({ u: r(), v: r(), rad: 0.6 + r() * 2 });
  const polish = [];
  for (let i = 0; i < 8; i++) polish.push({ u: r(), v: r(), rad: 0.08 + r() * 0.16 });
  const draw = (g, s, mode) => {
    if (mode === 'albedo') g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    else if (mode === 'height') g.fillStyle = 'rgb(128,128,128)';
    else g.fillStyle = 'rgb(178,178,178)';
    g.fillRect(0, 0, s, s);
    for (const b of blotches) {
      if (mode === 'albedo') g.fillStyle = b.dark ? `rgba(14,14,16,${b.a})` : `rgba(84,84,88,${b.a * 0.7})`;
      else if (mode === 'height') continue;
      else g.fillStyle = b.dark ? `rgba(215,215,215,${b.a * 0.5})` : `rgba(120,120,120,${b.a * 0.4})`;
      g.beginPath(); g.arc(b.u * s, b.v * s, b.rad * s, 0, 7); g.fill();
    }
    for (const p of pits) {
      if (mode === 'albedo') g.fillStyle = 'rgba(10,10,12,0.5)';
      else if (mode === 'height') g.fillStyle = 'rgb(92,92,92)';
      else g.fillStyle = 'rgb(226,226,226)';
      g.beginPath(); g.arc(p.u * s, p.v * s, p.rad, 0, 7); g.fill();
    }
    if (mode !== 'height') {
      for (const p of polish) {
        const grad = g.createRadialGradient(p.u * s, p.v * s, 0, p.u * s, p.v * s, p.rad * s);
        grad.addColorStop(0, mode === 'albedo' ? 'rgba(96,96,100,0.18)' : 'rgba(80,80,80,0.55)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(p.u * s, p.v * s, p.rad * s, 0, 7); g.fill();
      }
    }
    // 伸缩缝
    for (let i = 1; i < joints; i++) {
      if (mode === 'albedo') g.strokeStyle = 'rgba(8,8,10,0.75)';
      else if (mode === 'height') g.strokeStyle = 'rgb(58,58,58)';
      else g.strokeStyle = 'rgb(230,230,230)';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo((i / joints) * s, 0); g.lineTo((i / joints) * s, s); g.stroke();
      g.beginPath(); g.moveTo(0, (i / joints) * s); g.lineTo(s, (i / joints) * s); g.stroke();
    }
  };
  const albedo = canvasOf(size, (g, s) => draw(g, s, 'albedo'));
  const height = canvasOf(size >> 1, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size >> 1, (g, s) => draw(g, s, 'rough'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength });
}

// ---------- 沥青三通道组（可湿润） ----------
export function asphaltSet({
  size = 512, seed = 17, repX = 1, repY = 6, wet = 0.7, centerLine = 'dash', nStrength = 1.6
} = {}) {
  const r = rng(seed);
  const grains = [];
  for (let i = 0; i < 900; i++) grains.push({ u: r(), v: r(), t: r(), rad: 0.8 + r() * 1.8 });
  const cracks = [];
  for (let i = 0; i < 7; i++) {
    const pts = [{ u: r(), v: r() }];
    for (let k = 0; k < 6; k++) {
      const p = pts[pts.length - 1];
      pts.push({ u: p.u + (r() - 0.5) * 0.12, v: p.v + (r() - 0.3) * 0.14 });
    }
    cracks.push(pts);
  }
  const puddles = [];
  for (let i = 0; i < 5; i++) puddles.push({ u: 0.2 + r() * 0.6, v: r(), rad: 0.05 + r() * 0.1 });
  const draw = (g, s, mode) => {
    if (mode === 'albedo') g.fillStyle = '#131317';
    else if (mode === 'height') g.fillStyle = 'rgb(128,128,128)';
    else g.fillStyle = 'rgb(205,205,205)';
    g.fillRect(0, 0, s, s);
    for (const gr of grains) {
      const v = 18 + gr.t * 30;
      if (mode === 'albedo') g.fillStyle = `rgba(${v},${v},${v + 4},0.6)`;
      else if (mode === 'height') g.fillStyle = `rgb(${Math.round(120 + gr.t * 22)},${Math.round(120 + gr.t * 22)},${Math.round(120 + gr.t * 22)})`;
      else g.fillStyle = `rgba(${Math.round(160 + gr.t * 60)},${Math.round(160 + gr.t * 60)},${Math.round(160 + gr.t * 60)},0.8)`;
      g.fillRect(gr.u * s, gr.v * s, gr.rad, gr.rad);
    }
    for (const pts of cracks) {
      if (mode === 'albedo') g.strokeStyle = 'rgba(6,6,8,0.7)';
      else if (mode === 'height') g.strokeStyle = 'rgb(88,88,88)';
      else g.strokeStyle = 'rgb(235,235,235)';
      g.lineWidth = 1.4;
      g.beginPath();
      pts.forEach((p, i) => { if (i === 0) g.moveTo(p.u * s, p.v * s); else g.lineTo(p.u * s, p.v * s); });
      g.stroke();
    }
    if (wet > 0 && mode === 'rough') {
      // 车辙湿带（低粗糙）+ 积水斑（镜面）
      for (const x of [0.3, 0.7]) {
        const grad = g.createLinearGradient((x - 0.09) * s, 0, (x + 0.09) * s, 0);
        grad.addColorStop(0, 'rgba(70,70,70,0)');
        grad.addColorStop(0.5, `rgba(60,60,60,${0.85 * wet})`);
        grad.addColorStop(1, 'rgba(70,70,70,0)');
        g.fillStyle = grad;
        g.fillRect((x - 0.1) * s, 0, 0.2 * s, s);
      }
      for (const p of puddles) {
        const grad = g.createRadialGradient(p.u * s, p.v * s, 0, p.u * s, p.v * s, p.rad * s);
        grad.addColorStop(0, `rgba(28,28,28,${wet})`);
        grad.addColorStop(1, 'rgba(28,28,28,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(p.u * s, p.v * s, p.rad * s, 0, 7); g.fill();
      }
    }
    if (wet > 0 && mode === 'albedo') {
      for (const p of puddles) {
        const grad = g.createRadialGradient(p.u * s, p.v * s, 0, p.u * s, p.v * s, p.rad * s);
        grad.addColorStop(0, `rgba(8,9,14,${0.5 * wet})`);
        grad.addColorStop(1, 'rgba(8,9,14,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(p.u * s, p.v * s, p.rad * s, 0, 7); g.fill();
      }
    }
    if (centerLine && mode === 'albedo') {
      g.fillStyle = '#b8a24a';
      if (centerLine === 'dash') g.fillRect(s / 2 - 5, 10, 10, s * 0.42);
      else g.fillRect(s / 2 - 5, 0, 10, s);
    }
  };
  const albedo = canvasOf(size, (g, s) => draw(g, s, 'albedo'));
  const height = canvasOf(size >> 1, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size, (g, s) => draw(g, s, 'rough'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength });
}

// ---------- 折线地板三通道组（红房间纹样 + 缝隙 + 蜡面磨损） ----------
export function chevronSet(colA = '#0d0d0f', colB = '#e8e2d5', {
  repeat = 6, size = 1024, seed = 21, gloss = 0.75, nStrength = 1.5
} = {}) {
  const drawChevron = (g, s, mode) => {
    const n = 4;
    const w = s / n;
    if (mode === 'albedo') g.fillStyle = colA;
    else if (mode === 'height') g.fillStyle = 'rgb(128,128,128)';
    else g.fillStyle = `rgb(${Math.round(140 - gloss * 70)},${Math.round(140 - gloss * 70)},${Math.round(140 - gloss * 70)})`;
    g.fillRect(0, 0, s, s);
    if (mode === 'albedo') g.fillStyle = colB;
    else if (mode === 'height') g.fillStyle = 'rgb(134,134,134)';
    else g.fillStyle = `rgb(${Math.round(148 - gloss * 70)},${Math.round(148 - gloss * 70)},${Math.round(148 - gloss * 70)})`;
    for (let row = -1; row < n + 1; row++) {
      g.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const x = (i * w) / 2;
        const y = row * w + (i % 2 === 0 ? 0 : w / 2);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      for (let i = n * 2; i >= 0; i--) {
        const x = (i * w) / 2;
        const y = row * w + (i % 2 === 0 ? 0 : w / 2) + w / 2;
        g.lineTo(x, y);
      }
      g.closePath();
      if (row % 2 === 0) g.fill();
    }
    // 板块接缝
    if (mode === 'albedo') g.strokeStyle = 'rgba(0,0,0,0.35)';
    else if (mode === 'height') g.strokeStyle = 'rgb(84,84,84)';
    else g.strokeStyle = 'rgb(205,205,205)';
    g.lineWidth = mode === 'height' ? 3 : 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(0, i * w); g.lineTo(s, i * w); g.stroke();
    }
  };
  const albedo = canvasOf(size, (g, s) => { drawChevron(g, s, 'albedo'); grimeR(g, s, rng(seed), { stains: 14, scratches: 22, alpha: 0.06 }); });
  const height = canvasOf(size >> 1, (g, s) => drawChevron(g, s, 'height'));
  const rough = canvasOf(size >> 1, (g, s) => { drawChevron(g, s, 'rough'); grimeR(g, s, rng(seed), { stains: 12, scratches: 20, alpha: 0.14 }); });
  return setFrom(albedo, height, rough, { repX: repeat, repY: repeat, nStrength });
}

// ---------- 皮革三通道组 ----------
export function leatherSet(color = [64, 20, 28], { size = 256, seed = 27, repX = 2, repY = 2 } = {}) {
  const r = rng(seed);
  const cells = [];
  for (let i = 0; i < 340; i++) cells.push({ u: r(), v: r(), rad: 3 + r() * 8, t: r() });
  const draw = (g, s, mode) => {
    if (mode === 'albedo') g.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    else if (mode === 'height') g.fillStyle = 'rgb(120,120,120)';
    else g.fillStyle = 'rgb(158,158,158)';
    g.fillRect(0, 0, s, s);
    for (const c of cells) {
      const grad = g.createRadialGradient(c.u * s, c.v * s, 0, c.u * s, c.v * s, c.rad);
      if (mode === 'albedo') {
        grad.addColorStop(0, `rgba(${color[0] + 18},${color[1] + 10},${color[2] + 10},${0.3 + c.t * 0.3})`);
        grad.addColorStop(1, `rgba(${color[0] - 14},${color[1] - 6},${color[2] - 8},0.2)`);
      } else if (mode === 'height') {
        grad.addColorStop(0, `rgba(${Math.round(150 + c.t * 30)},${Math.round(150 + c.t * 30)},${Math.round(150 + c.t * 30)},0.8)`);
        grad.addColorStop(1, 'rgba(104,104,104,0.5)');
      } else {
        grad.addColorStop(0, `rgba(${Math.round(140 + c.t * 40)},${Math.round(140 + c.t * 40)},${Math.round(140 + c.t * 40)},0.6)`);
        grad.addColorStop(1, 'rgba(170,170,170,0)');
      }
      g.fillStyle = grad;
      g.beginPath(); g.arc(c.u * s, c.v * s, c.rad, 0, 7); g.fill();
    }
  };
  const albedo = canvasOf(size, (g, s) => draw(g, s, 'albedo'));
  const height = canvasOf(size, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size, (g, s) => draw(g, s, 'rough'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength: 1.1 });
}

// ---------- v1.4 新材质组 ----------

/**
 * 脉络大理石五通道组（P2，大厅名片）。
 * 主脉 = 随机游走折线 + 软阴影晕开；次脉细亮；云斑大软渐变；
 * 抛光面低粗糙 + 踩踏磨损带略糙；脉络微凹。
 */
export function marbleSet({
  base = [226, 221, 211], veinA = [88, 90, 102], veinB = [176, 165, 146],
  size = 1024, seed = 33, repX = 1, repY = 1, gloss = 0.8, nStrength = 0.7
} = {}) {
  const r = rng(seed);
  const veins = [];
  for (let i = 0; i < 7; i++) {
    const pts = [{ u: r(), v: r() * 0.2 - 0.1 }];
    const drift = (r() - 0.5) * 0.24;
    for (let k = 0; k < 15; k++) {
      const p = pts[pts.length - 1];
      pts.push({ u: p.u + drift + (r() - 0.5) * 0.1, v: p.v + 0.07 + r() * 0.05 });
    }
    veins.push({ pts, w: 1.2 + r() * 2.6, major: r() < 0.55, branch: r() });
  }
  const clouds = [];
  for (let i = 0; i < 14; i++) clouds.push({ u: r(), v: r(), rad: 0.08 + r() * 0.22, warm: r() < 0.4, a: 0.05 + r() * 0.09 });
  const wearR = rng(seed + 1);
  const wears = [];
  for (let i = 0; i < 6; i++) wears.push({ u: wearR(), v: wearR(), rad: 0.1 + wearR() * 0.2, a: 0.2 + wearR() * 0.3 });
  const draw = (g, s, mode) => {
    if (mode === 'albedo') g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    else if (mode === 'height') g.fillStyle = 'rgb(128,128,128)';
    else g.fillStyle = `rgb(${Math.round(150 - gloss * 110)},${Math.round(150 - gloss * 110)},${Math.round(150 - gloss * 110)})`;
    g.fillRect(0, 0, s, s);
    if (mode === 'albedo') {
      for (const c of clouds) {
        const grad = g.createRadialGradient(c.u * s, c.v * s, 0, c.u * s, c.v * s, c.rad * s);
        const col = c.warm ? `${base[0] - 18},${base[1] - 22},${base[2] - 28}` : `${base[0] - 26},${base[1] - 24},${base[2] - 18}`;
        grad.addColorStop(0, `rgba(${col},${c.a})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = grad;
        g.beginPath(); g.arc(c.u * s, c.v * s, c.rad * s, 0, 7); g.fill();
      }
    }
    for (const vn of veins) {
      const col = vn.major ? veinA : veinB;
      if (mode === 'albedo') {
        g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${vn.major ? 0.62 : 0.34})`;
        g.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},0.4)`;
        g.shadowBlur = vn.major ? 7 : 3;
      } else if (mode === 'height') {
        g.strokeStyle = 'rgba(110,110,110,0.7)';
        g.shadowColor = 'rgba(110,110,110,0.4)';
        g.shadowBlur = 4;
      } else {
        g.strokeStyle = 'rgba(210,210,210,0.4)';
        g.shadowBlur = 0;
      }
      g.lineWidth = vn.w * (mode === 'height' ? 1.6 : 1);
      g.beginPath();
      vn.pts.forEach((p, i) => {
        const x = ((p.u % 1) + 1) % 1 * s;
        const y = ((p.v % 1) + 1) % 1 * s;
        if (i === 0 || Math.abs(y - ((vn.pts[i - 1].v % 1) + 1) % 1 * s) > s * 0.5) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
      g.shadowBlur = 0;
      // 次生细脉从主脉分岔
      if (vn.major && mode !== 'rough') {
        const bi = Math.floor(vn.branch * (vn.pts.length - 4)) + 2;
        const bp = vn.pts[bi];
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(((bp.u % 1) + 1) % 1 * s, ((bp.v % 1) + 1) % 1 * s);
        g.lineTo(((bp.u + 0.14) % 1) * s, ((bp.v + 0.06) % 1) * s);
        g.stroke();
      }
    }
    if (mode === 'rough') {
      // 踩踏磨损带：抛光被磨钝（值升高）
      for (const w of wears) {
        const grad = g.createRadialGradient(w.u * s, w.v * s, 0, w.u * s, w.v * s, w.rad * s);
        grad.addColorStop(0, `rgba(128,128,128,${w.a})`);
        grad.addColorStop(1, 'rgba(128,128,128,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(w.u * s, w.v * s, w.rad * s, 0, 7); g.fill();
      }
    }
  };
  const albedo = canvasOf(size, (g, s) => { draw(g, s, 'albedo'); grimeR(g, s, rng(seed + 2), { stains: 6, scratches: 8, alpha: 0.03 }); });
  const height = canvasOf(size >> 1, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size >> 1, (g, s) => draw(g, s, 'rough'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength, aoStrength: 0.7 });
}

/**
 * 五十年代 boomerang 层压板五通道组（P2，diner 台面欠账）。
 * 散布回旋镖形 ×3 色调 + 细碎斑点；层压板高光滑，仅斑点微扰。
 */
export function boomerangSet({
  bg = [238, 230, 210], tones = ['#c9b89a', '#8f0e1e', '#3a4652'],
  size = 512, seed = 37, count = 46, repX = 3, repY = 3
} = {}) {
  const r = rng(seed);
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({ u: r(), v: r(), rot: r() * Math.PI * 2, L: 0.028 + r() * 0.03, t: Math.floor(r() * 3) });
  }
  const specks = [];
  for (let i = 0; i < 320; i++) specks.push({ u: r(), v: r(), rad: 0.4 + r() * 1.1, a: 0.1 + r() * 0.2 });
  const toneCols = tones;
  const draw = (g, s, mode) => {
    if (mode === 'albedo') g.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    else if (mode === 'height') g.fillStyle = 'rgb(128,128,128)';
    else g.fillStyle = 'rgb(64,64,64)';
    g.fillRect(0, 0, s, s);
    for (const it of items) {
      const L = it.L * s;
      g.save();
      g.translate(it.u * s, it.v * s);
      g.rotate(it.rot);
      if (mode === 'albedo') g.fillStyle = toneCols[it.t];
      else if (mode === 'height') g.fillStyle = 'rgb(132,132,132)';
      else g.fillStyle = 'rgb(72,72,72)';
      g.beginPath();
      g.moveTo(-L, 0);
      g.quadraticCurveTo(0, -L * 0.66, L, 0);
      g.quadraticCurveTo(0, -L * 0.3, -L, 0);
      g.closePath();
      g.fill();
      g.restore();
    }
    for (const sp of specks) {
      if (mode === 'albedo') g.fillStyle = `rgba(60,54,44,${sp.a * 0.5})`;
      else if (mode === 'height') g.fillStyle = `rgba(140,140,140,${sp.a})`;
      else g.fillStyle = `rgba(90,90,90,${sp.a})`;
      g.beginPath(); g.arc(sp.u * s, sp.v * s, sp.rad, 0, 7); g.fill();
    }
  };
  const albedo = canvasOf(size, (g, s) => draw(g, s, 'albedo'));
  const height = canvasOf(size >> 1, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size >> 1, (g, s) => draw(g, s, 'rough'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength: 0.4, aoStrength: 0.4 });
}

/**
 * 锈蚀铁皮五通道组（P2，锅炉房/夜街）。
 * 锈斑簇（多层橙褐渐变）+ 垂直流挂 + 点蚀；金属度：裸铁高、锈层低。
 */
export function rustSet({
  base = 112, size = 512, seed = 41, repX = 2, repY = 2, rust = 0.55, nStrength = 1.7
} = {}) {
  const r = rng(seed);
  const patches = [];
  const n = Math.round(20 + rust * 22);
  for (let i = 0; i < n; i++) {
    patches.push({ u: r(), v: r(), rad: 0.03 + r() * 0.1, t: r(), drip: r() < 0.5 ? 0.08 + r() * 0.22 : 0 });
  }
  const pits = [];
  for (let i = 0; i < 160; i++) pits.push({ u: r(), v: r(), rad: 0.6 + r() * 1.6, t: r() });
  const rows = [];
  for (let i = 0; i < 64; i++) rows.push((r() - 0.5) * 26);
  const rustCol = (t) => t < 0.45 ? [96, 48, 22] : t < 0.8 ? [128, 66, 30] : [74, 40, 26];
  const draw = (g, s, mode) => {
    // 底：竖向拉丝钢
    for (let y = 0; y < s; y++) {
      const v = rows[Math.floor((y / s) * rows.length)];
      if (mode === 'albedo') g.fillStyle = `rgb(${base + v},${base + v + 2},${base + v + 5})`;
      else if (mode === 'height') g.fillStyle = 'rgb(128,128,128)';
      else if (mode === 'rough') g.fillStyle = `rgb(${Math.round(138 + v * 0.5)},${Math.round(138 + v * 0.5)},${Math.round(138 + v * 0.5)})`;
      else g.fillStyle = 'rgb(232,232,232)';
      g.fillRect(0, y, s, 1);
    }
    for (const p of patches) {
      const [cr, cg, cb] = rustCol(p.t);
      const grad = g.createRadialGradient(p.u * s, p.v * s, 0, p.u * s, p.v * s, p.rad * s);
      if (mode === 'albedo') {
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.92)`);
        grad.addColorStop(0.7, `rgba(${cr - 20},${cg - 12},${cb - 8},0.6)`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      } else if (mode === 'height') {
        grad.addColorStop(0, 'rgba(148,148,148,0.9)');
        grad.addColorStop(1, 'rgba(128,128,128,0)');
      } else if (mode === 'rough') {
        grad.addColorStop(0, 'rgba(226,226,226,0.95)');
        grad.addColorStop(1, 'rgba(138,138,138,0)');
      } else {
        grad.addColorStop(0, 'rgba(26,26,26,0.95)');
        grad.addColorStop(1, 'rgba(232,232,232,0)');
      }
      g.fillStyle = grad;
      g.beginPath(); g.arc(p.u * s, p.v * s, p.rad * s, 0, 7); g.fill();
      // 流挂：从锈斑往下淌
      if (p.drip > 0 && mode !== 'height') {
        const lg = g.createLinearGradient(0, p.v * s, 0, (p.v + p.drip) * s);
        if (mode === 'albedo') {
          lg.addColorStop(0, `rgba(${cr - 14},${cg - 8},${cb - 4},0.5)`);
          lg.addColorStop(1, `rgba(${cr - 14},${cg - 8},${cb - 4},0)`);
        } else if (mode === 'rough') {
          lg.addColorStop(0, 'rgba(215,215,215,0.6)');
          lg.addColorStop(1, 'rgba(215,215,215,0)');
        } else {
          lg.addColorStop(0, 'rgba(40,40,40,0.6)');
          lg.addColorStop(1, 'rgba(40,40,40,0)');
        }
        g.fillStyle = lg;
        g.fillRect((p.u - 0.008) * s, p.v * s, 0.016 * s, p.drip * s);
      }
    }
    for (const p of pits) {
      if (mode === 'albedo') g.fillStyle = `rgba(20,14,10,${0.3 + p.t * 0.35})`;
      else if (mode === 'height') g.fillStyle = 'rgb(96,96,96)';
      else if (mode === 'rough') g.fillStyle = 'rgb(230,230,230)';
      else g.fillStyle = 'rgb(120,120,120)';
      g.beginPath(); g.arc(p.u * s, p.v * s, p.rad, 0, 7); g.fill();
    }
  };
  const albedo = canvasOf(size, (g, s) => draw(g, s, 'albedo'));
  const height = canvasOf(size >> 1, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size, (g, s) => draw(g, s, 'rough'));
  const metal = canvasOf(size >> 1, (g, s) => draw(g, s, 'metal'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength, aoStrength: 1.2, metal });
}

/**
 * 瓷釉铁皮（v1.9 B4，四通道：albedo/height/rough/metal）——
 * 白瓷釉面 + 边缘磕碰露黑铁 + 釉裂细纹 + 陈年茶渍。
 * 釉面光滑非金属；磕碰缺口粗糙且露出铁底（metalnessMap 亮斑）。
 * 补 v1.4 P2 欠账（enamel/锈蚀二选一当年只落了 rust）。
 */
export function enamelSet({
  base = 224, warm = 6, size = 256, seed = 47, repX = 1, repY = 1,
  chip = 0.55, nStrength = 1.2
} = {}) {
  const r = rng(seed);
  // 磕碰缺口偏向四缘与四角（真瓷釉先崩边）
  const chips = [];
  const n = Math.round(8 + chip * 16);
  for (let i = 0; i < n; i++) {
    const edge = Math.floor(r() * 4);
    const along = r();
    const inset = r() * r() * 0.16; // 平方偏置：贴边最密
    const u = edge === 0 ? along : edge === 1 ? along : edge === 2 ? inset : 1 - inset;
    const v = edge === 0 ? inset : edge === 1 ? 1 - inset : along;
    chips.push({ u, v, rad: 0.012 + r() * 0.03, lob: 3 + Math.floor(r() * 3), t: r() });
  }
  // 釉裂细纹：随机游走短折线
  const crazes = [];
  for (let i = 0; i < 26; i++) {
    const pts = [[r(), r()]];
    const segs = 3 + Math.floor(r() * 4);
    for (let sgi = 0; sgi < segs; sgi++) {
      const [pu, pv] = pts[pts.length - 1];
      pts.push([pu + (r() - 0.5) * 0.12, pv + (r() - 0.5) * 0.12]);
    }
    pts.alpha = 0.05 + r() * 0.08;
    crazes.push(pts);
  }
  // 陈年茶渍云斑
  const stains = [];
  for (let i = 0; i < 9; i++) stains.push({ u: r(), v: r(), rad: 0.05 + r() * 0.14, a: 0.03 + r() * 0.05 });
  const draw = (g, s, mode) => {
    if (mode === 'albedo') g.fillStyle = `rgb(${base},${base - 2},${base - warm})`;
    else if (mode === 'height') g.fillStyle = 'rgb(150,150,150)';
    else if (mode === 'rough') g.fillStyle = 'rgb(52,52,52)'; // 釉面光滑
    else g.fillStyle = 'rgb(18,18,18)'; // 釉层非金属
    g.fillRect(0, 0, s, s);
    if (mode === 'albedo' || mode === 'rough') {
      for (const st of stains) {
        const grad = g.createRadialGradient(st.u * s, st.v * s, 0, st.u * s, st.v * s, st.rad * s);
        grad.addColorStop(0, mode === 'albedo' ? `rgba(150,118,72,${st.a})` : `rgba(120,120,120,${st.a * 3})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(st.u * s, st.v * s, st.rad * s, 0, 7); g.fill();
      }
    }
    if (mode !== 'height') {
      for (const cz of crazes) {
        g.strokeStyle = mode === 'albedo' ? `rgba(96,86,74,${cz.alpha})`
          : mode === 'rough' ? `rgba(150,150,150,${cz.alpha * 3})` : `rgba(40,40,40,${cz.alpha})`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(cz[0][0] * s, cz[0][1] * s);
        for (let i = 1; i < cz.length; i++) g.lineTo(cz[i][0] * s, cz[i][1] * s);
        g.stroke();
      }
    }
    // 磕碰缺口：多瓣叠圆读出崩瓷的贝壳状边缘；中心露黑铁
    for (const ch of chips) {
      for (let l = 0; l < ch.lob; l++) {
        const la = (l / ch.lob) * Math.PI * 2 + ch.t * 7;
        const lu = ch.u + Math.cos(la) * ch.rad * 0.5;
        const lv = ch.v + Math.sin(la) * ch.rad * 0.5;
        if (mode === 'albedo') g.fillStyle = 'rgb(38,34,32)';
        else if (mode === 'height') g.fillStyle = 'rgb(104,104,104)';
        else if (mode === 'rough') g.fillStyle = 'rgb(214,214,214)';
        else g.fillStyle = 'rgb(212,212,212)'; // 露出的铁底吃反射
        g.beginPath(); g.arc(lu * s, lv * s, ch.rad * s * (0.5 + ch.t * 0.4), 0, 7); g.fill();
      }
      // 缺口外一圈暗晕（albedo）：崩瓷边缘的应力细纹
      if (mode === 'albedo') {
        g.strokeStyle = 'rgba(120,110,100,0.4)';
        g.lineWidth = 1;
        g.beginPath(); g.arc(ch.u * s, ch.v * s, ch.rad * s * 1.35, 0, 7); g.stroke();
      }
    }
  };
  const albedo = canvasOf(size, (g, s) => draw(g, s, 'albedo'));
  const height = canvasOf(size >> 1, (g, s) => draw(g, s, 'height'));
  const rough = canvasOf(size, (g, s) => draw(g, s, 'rough'));
  const metal = canvasOf(size >> 1, (g, s) => draw(g, s, 'metal'));
  return setFrom(albedo, height, rough, { repX, repY, nStrength, aoStrength: 0.9, metal });
}

// ---------- PBR 材质工厂 ----------
function applySet(mat, set, normalScale = 0.8) {
  mat.map = set.map;
  mat.normalMap = set.normalMap;
  mat.roughnessMap = set.roughnessMap;
  if (set.aoMap) {
    mat.aoMap = set.aoMap;
    mat.aoMapIntensity = 0.85;
  }
  if (set.metalnessMap) {
    mat.metalnessMap = set.metalnessMap;
    mat.metalness = 1.0; // 实际金属度交给贴图空间变化（P1 禁单值大色块）
  }
  mat.normalScale = new THREE.Vector2(normalScale, normalScale);
  return mat;
}

/** 木质（三通道 PBR） */
export function woodMat(opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    roughness: 1.0,
    metalness: opts.metalness ?? 0.04,
    envMapIntensity: opts.env ?? 0.8
  });
  return applySet(mat, woodSet(opts), opts.normalScale ?? 0.8);
}

/** 黄铜（拉丝 + 各向异性高光） */
export function brassMat(opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0x8a6c3c,
    roughness: 1.0,
    metalness: 0.95,
    anisotropy: opts.anisotropy ?? 0.55,
    envMapIntensity: opts.env ?? 1.4
  });
  return applySet(mat, metalBrushedSet({ seed: opts.seed ?? 5, roughBase: opts.roughBase ?? 88, ...opts }), 0.35);
}

/** 铬/不锈钢（拉丝 + 各向异性） */
export function chromeMat(opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xb8bcc2,
    roughness: 1.0,
    metalness: 0.96,
    anisotropy: opts.anisotropy ?? 0.4,
    envMapIntensity: opts.env ?? 1.6
  });
  return applySet(mat, metalBrushedSet({ seed: opts.seed ?? 6, roughBase: 68, streak: 30 }), 0.3);
}

/** 铸铁/深色钢（哑光 + 微各向异性） */
export function ironMat(opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0x3c4046,
    roughness: 1.0,
    metalness: 0.85,
    anisotropy: 0.22,
    envMapIntensity: opts.env ?? 0.9
  });
  return applySet(mat, metalBrushedSet({ seed: opts.seed ?? 8, roughBase: 148, streak: 60, base: 96 }), 0.55);
}

/** 织物（织纹法线 + sheen） */
export function fabricMat(colA, colB, opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xffffff,
    roughness: 1.0,
    metalness: 0,
    sheen: opts.sheen ?? 0.7,
    sheenColor: new THREE.Color(opts.sheenColor ?? 0xffffff).multiplyScalar(0.6),
    sheenRoughness: 0.55,
    envMapIntensity: 0.5
  });
  return applySet(mat, weaveSet(colA, colB, opts), opts.normalScale ?? 0.9);
}

/** 皮革（皱纹法线 + clearcoat） */
export function leatherMat(color = [64, 20, 28], opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0,
    clearcoat: opts.clearcoat ?? 0.35,
    clearcoatRoughness: 0.45,
    sheen: 0.3,
    sheenColor: new THREE.Color(0xffffff).multiplyScalar(0.3),
    envMapIntensity: 0.9
  });
  return applySet(mat, leatherSet(color, opts), 0.9);
}

/** 水泥地/墙 */
export function concreteMat(opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    roughness: 1.0,
    metalness: opts.metalness ?? 0.08,
    envMapIntensity: opts.env ?? 0.6
  });
  return applySet(mat, concreteSet(opts), opts.normalScale ?? 0.9);
}

/** 砖墙 */
export function brickMat(opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.02,
    envMapIntensity: 0.5
  });
  return applySet(mat, brickSet(opts), opts.normalScale ?? 1.0);
}

/** 沥青（默认雨后微湿：车辙与积水低粗糙度反光） */
export function asphaltMat(opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.12,
    envMapIntensity: opts.env ?? 1.1
  });
  return applySet(mat, asphaltSet(opts), opts.normalScale ?? 0.8);
}

/** 折线拼花地板（蜡面） */
export function chevronMat(colA, colB, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: opts.metalness ?? 0.14,
    envMapIntensity: opts.env ?? 1.1
  });
  return applySet(mat, chevronSet(colA, colB, opts), opts.normalScale ?? 0.7);
}

/** 脉络大理石（抛光 clearcoat + 踩踏磨损，大厅名片） */
export function marbleMat(opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xffffff,
    roughness: 1.0,
    metalness: 0.02,
    clearcoat: opts.clearcoat ?? 0.5,
    clearcoatRoughness: 0.14,
    envMapIntensity: opts.env ?? 1.35
  });
  return applySet(mat, marbleSet(opts), opts.normalScale ?? 0.45);
}

/** 五十年代层压板（boomerang 纹样，diner 台面） */
export function boomerangMat(opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    clearcoat: opts.clearcoat ?? 0.65,
    clearcoatRoughness: 0.18,
    envMapIntensity: opts.env ?? 1.2
  });
  return applySet(mat, boomerangSet(opts), 0.35);
}

/** 锈蚀铁皮（金属度贴图：裸铁高/锈层低） */
export function rustMat(opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0xffffff,
    roughness: 1.0,
    metalness: 1.0,
    envMapIntensity: opts.env ?? 0.85
  });
  return applySet(mat, rustSet(opts), opts.normalScale ?? 1.0);
}

/** 瓷釉铁皮（v1.9 B4：釉面清漆高光 + 崩瓷露铁金属度贴图） */
export function enamelMat(opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xffffff,
    roughness: 1.0,
    metalness: 1.0, // 实际金属度交给贴图（釉暗/露铁亮）
    clearcoat: opts.clearcoat ?? 0.6,
    clearcoatRoughness: 0.12,
    envMapIntensity: opts.env ?? 1.1
  });
  return applySet(mat, enamelSet(opts), opts.normalScale ?? 0.6);
}

/** 静水/镜面水（微波纹法线，userData.update 缓慢流动） */
export function waterMat(color = 0x04121c, opts = {}) {
  const rippleHeight = canvasOf(128, (g, s) => {
    g.fillStyle = 'rgb(128,128,128)';
    g.fillRect(0, 0, s, s);
    const r = rng(opts.seed ?? 31);
    for (let i = 0; i < 60; i++) {
      const v = Math.round(120 + r() * 16);
      g.strokeStyle = `rgba(${v},${v},${v},0.6)`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      const y = r() * s;
      g.moveTo(0, y);
      g.bezierCurveTo(s * 0.3, y + (r() - 0.5) * 10, s * 0.7, y + (r() - 0.5) * 10, s, y);
      g.stroke();
    }
  });
  const normalMap = normalFromHeight(rippleHeight, 0.5, opts.repX ?? 2, opts.repY ?? 2);
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.06,
    metalness: 0.55,
    normalMap,
    normalScale: new THREE.Vector2(0.22, 0.22),
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: opts.env ?? 2.0
  });
  mat.userData.update = (dt) => {
    normalMap.offset.x += dt * 0.008;
    normalMap.offset.y += dt * 0.005;
  };
  return mat;
}

// ---------- 边界 ----------
/** 矩形边界约束 */
export function rectBounds(minX, maxX, minZ, maxZ) {
  return (p) => {
    p.x = Math.max(minX, Math.min(maxX, p.x));
    p.z = Math.max(minZ, Math.min(maxZ, p.z));
  };
}

/** 圆形边界约束 */
export function circleBounds(radius, cx = 0, cz = 0) {
  return (p) => {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d = Math.hypot(dx, dz);
    if (d > radius) {
      p.x = cx + (dx / d) * radius;
      p.z = cz + (dz / d) * radius;
    }
  };
}

/** 多矩形并集边界（房间 + 走廊拼合） */
export function multiRectBounds(rects) {
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

/**
 * 多分区并集边界：圆形分区 + 矩形通道混拼（双峰多分区地图用）。
 * zones: [{ circle: {x,z,r} } | { rect: {minX,maxX,minZ,maxZ} }]
 */
export function zonesBounds(zones) {
  const insideRect = (r, x, z) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  const insideCircle = (c, x, z) => (x - c.x) ** 2 + (z - c.z) ** 2 <= c.r * c.r;
  return (p) => {
    for (const zn of zones) {
      if (zn.rect && insideRect(zn.rect, p.x, p.z)) return;
      if (zn.circle && insideCircle(zn.circle, p.x, p.z)) return;
    }
    let best = null;
    let bestD = Infinity;
    for (const zn of zones) {
      let cx, cz;
      if (zn.rect) {
        cx = Math.max(zn.rect.minX, Math.min(zn.rect.maxX, p.x));
        cz = Math.max(zn.rect.minZ, Math.min(zn.rect.maxZ, p.z));
      } else {
        const dx = p.x - zn.circle.x;
        const dz = p.z - zn.circle.z;
        const d = Math.hypot(dx, dz) || 1;
        const k = Math.min(d, zn.circle.r);
        cx = zn.circle.x + (dx / d) * k;
        cz = zn.circle.z + (dz / d) * k;
      }
      const d2 = (cx - p.x) ** 2 + (cz - p.z) ** 2;
      if (d2 < bestD) { bestD = d2; best = { cx, cz }; }
    }
    if (best) { p.x = best.cx; p.z = best.cz; }
  };
}
