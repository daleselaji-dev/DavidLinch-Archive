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

/** 围合式帷幕墙（圆弧排布，可留缺口） */
export function curtainRing(radius, height, color, segments = 18, arc = Math.PI * 2, startAngle = 0) {
  const group = new THREE.Group();
  const segW = (arc * radius) / segments;
  const mat = velvetMaterial(color);
  for (let i = 0; i < segments; i++) {
    const a = startAngle + (i + 0.5) * (arc / segments);
    const m = curtain(segW * 1.06, height, color, 3, mat);
    m.position.set(Math.cos(a) * radius, height / 2, Math.sin(a) * radius);
    m.lookAt(0, height / 2, 0);
    group.add(m);
  }
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
 * 引语展签 —— 只有他自己的话（中英 + 出处），无策展解读。
 * quote: { zh, en, source }
 */
export function quotePlaque(quote, accent = '#c9a35c') {
  const group = new THREE.Group();
  const tex = canvasTexture(1024, (g, s) => {
    g.fillStyle = '#0e0709';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = accent;
    g.lineWidth = 3;
    g.strokeRect(34, 34, s - 68, s - 68);
    // 大引号
    g.fillStyle = accent;
    g.font = '400 170px Georgia, serif';
    g.fillText('\u201c', 72, 220);
    // 中文引语
    g.fillStyle = '#f2e9dc';
    g.font = '400 64px "Songti SC","SimSun",Georgia,serif';
    g.textAlign = 'left';
    const zhLines = wrapText(g, quote.zh, s - 220);
    let y = 330;
    for (const line of zhLines) {
      g.fillText(line, 110, y);
      y += 96;
    }
    // 英文原文
    g.fillStyle = 'rgba(242,233,220,0.55)';
    g.font = 'italic 34px Georgia, serif';
    const enLines = wrapText(g, quote.en, s - 220);
    y += 30;
    for (const line of enLines) {
      g.fillText(line, 110, y);
      y += 48;
    }
    // 出处
    g.fillStyle = accent;
    g.font = '28px "Courier New", monospace';
    g.textAlign = 'right';
    g.fillText('— DAVID LYNCH · ' + quote.source, s - 90, s - 84);
  });
  const board = roundedBoxMesh(1.7, 1.7, 0.055, 0.02,
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.58,
      emissive: 0xf2e9dc, emissiveMap: tex, emissiveIntensity: 0.4
    }));
  board.position.y = 1.55;
  const postMat = new THREE.MeshStandardMaterial({ map: brushedMetalTexture(), color: 0x584124, roughness: 0.35, metalness: 0.9 });
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.55, 10), postMat);
  postL.position.set(-0.6, 0.77, 0);
  const postR = postL.clone();
  postR.position.x = 0.6;
  group.add(board, postL, postR);
  group.userData.board = board;
  return group;
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

/** 立式话筒（车削底座 + 网格头） */
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
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.45, 10), metal);
  pole.position.y = 0.75;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), metal);
  collar.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), metal);
  head.position.y = 1.5;
  g.add(base, pole, collar, head);
  return g;
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
export function railing(length, { height = 1.05, gap = 0.22, color = 0x241708, radius = 0.032 } = {}) {
  const geos = [];
  const railGeo = new THREE.CylinderGeometry(radius, radius, length, 8);
  geos.push(xform(railGeo, 0, height, 0, 0, 0, Math.PI / 2));
  geos.push(xform(railGeo, 0, height * 0.42, 0, 0, 0, Math.PI / 2));
  const n = Math.max(2, Math.round(length / gap));
  const balGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.62, height, 6);
  for (let i = 0; i <= n; i++) {
    geos.push(xform(balGeo, -length / 2 + (i / n) * length, height / 2, 0));
  }
  railGeo.dispose();
  balGeo.dispose();
  const mat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [30, 18, 9], planks: 2, size: 128 }),
    color, roughness: 0.72, metalness: 0.05
  });
  return mergedMesh(geos, mat);
}

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

/** 高背扶手椅（圆角软包，红房间/房间用） */
export function armchair(color = 0x2a0e16) {
  const g = new THREE.Group();
  const fabric = new THREE.MeshPhysicalMaterial({
    map: weaveTexture(), color, roughness: 0.9, sheen: 0.7,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3), sheenRoughness: 0.6
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: [26, 15, 8], planks: 1, size: 128 }), roughness: 0.6
  });
  const seat = roundedBoxMesh(0.72, 0.24, 0.68, 0.09, fabric);
  seat.position.y = 0.42;
  const back = roundedBoxMesh(0.72, 0.85, 0.18, 0.09, fabric);
  back.position.set(0, 0.86, -0.28);
  back.rotation.x = -0.13;
  const armL = roundedBoxMesh(0.15, 0.34, 0.6, 0.06, fabric);
  armL.position.set(-0.34, 0.62, -0.02);
  const armR = armL.clone();
  armR.position.x = 0.34;
  const legGeo = new THREE.CylinderGeometry(0.03, 0.022, 0.3, 8);
  const legs = mergedMesh([
    xform(legGeo, -0.28, 0.15, 0.24), xform(legGeo, 0.28, 0.15, 0.24),
    xform(legGeo, -0.28, 0.15, -0.24), xform(legGeo, 0.28, 0.15, -0.24)
  ], woodMat);
  legGeo.dispose();
  g.add(seat, back, armL, armR, legs);
  return g;
}

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
