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
export function lightCone2(topR, bottomR, height, color = 0xf2e9dc, opacity = 0.055) {
  const g = new THREE.Group();
  const outer = lightCone(topR, bottomR, height, color, opacity);
  const inner = lightCone(topR * 0.42, bottomR * 0.52, height * 0.985, color, opacity * 2.2);
  g.add(outer, inner);
  g.userData.setStrength = (k) => {
    outer.material.opacity = opacity * k;
    inner.material.opacity = opacity * 2.2 * k;
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
export function quoteStandUpdater(stand, player, ui, { radius = 3.0 } = {}) {
  const wp = new THREE.Vector3();
  let ready = false;
  let k = 0;
  let shown = false;
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

/** 松树（分层锥体，比单锥更像真树） */
export function pineGeometryMaterial() {
  const layers = [
    xform(new THREE.ConeGeometry(1.05, 1.7, 8), 0, -0.7, 0),
    xform(new THREE.ConeGeometry(0.82, 1.5, 8), 0, 0.25, 0),
    xform(new THREE.ConeGeometry(0.55, 1.3, 8), 0, 1.15, 0)
  ];
  const geo = mergeGeometries(layers, false);
  for (const l of layers) l.dispose();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a1a10, roughness: 0.95,
    bumpMap: noiseCanvasTexture(64, 128, 60, 3), bumpScale: 0.4
  });
  return { geo, mat };
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
