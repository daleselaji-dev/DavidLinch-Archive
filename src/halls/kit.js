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
import { BLEND_MESHES } from '../data/blendmeshes.js';

// ============================================================
// v1.8 Blender 权威细模管线 —— assets/blender/scripts/gen_*.py
// （Blender 4.1.1 headless，bpy 确定性程序化建模）生成 HI 细模
// （blends/*.blend + 渲染自检）与 GAME 档；GAME 档量化烘焙进
// src/data/blendmeshes.js，运行时在这里解码为 BufferGeometry。
// 仓库内仍然没有任何图像/音频媒体文件（数据为 base64 量化几何）。
// ============================================================
function b64Bytes(s) {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

/**
 * Blender 细模游戏档解码：位置 uint16（bbox 反归一）/ 法线 int8 /
 * 顶点色 uint8 / 索引 uint16 → THREE.BufferGeometry。
 * 每次调用返回独立几何（换厅 disposeGroup 全量释放，互不牵连）。
 */
export function blendGeo(name) {
  const d = BLEND_MESHES[name];
  if (!d) throw new Error(`blendGeo: 未知 Blender 资产 ${name}`);
  const pos = new Float32Array(d.nv * 3);
  const q = new Uint16Array(b64Bytes(d.vp).buffer);
  for (let i = 0; i < d.nv; i++) {
    for (let k = 0; k < 3; k++) {
      pos[i * 3 + k] = d.bbmin[k] + (q[i * 3 + k] / 65535) * d.bbspan[k];
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(b64Bytes(d.vn).buffer), 3, true));
  if (d.vc) geo.setAttribute('color', new THREE.BufferAttribute(b64Bytes(d.vc), 3, true));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(b64Bytes(d.ix).buffer), 1));
  return geo;
}

/** 圆柱投影 UV（细模档配程序纹理用：绕 y 轴展开 + 高度归一） */
export function cylUV(geo, repeatY = 1) {
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(1e-6, maxY - minY);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = Math.atan2(p.getZ(i), p.getX(i)) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = ((p.getY(i) - minY) / span) * repeatY;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** 平面投影 UV（正面朝 +Z 的构造物配木纹/金属纹理用） */
export function planarUV(geo, scale = 1) {
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) * scale;
    uv[i * 2 + 1] = p.getY(i) * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

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
 * 梦魇形体 v4（v1.8 Blender 权威细模档）——形体几何全部来自
 * assets/blender/scripts/gen_figure.py（bpy 确定性建模：雕刻眼窝/
 * 眉棱/颊窝/鼻脊的颅骨壳、垂褶撕摆连体破袍、脸窗开在正前的贴颅
 * 乱壳 + 三组长绺、撕口破袖与三节长指苍白手），HI 细模存档于
 * blends/figure.blend，GAME 档烘焙进 blendmeshes.js。
 * 材质仍为程序 canvas 纹理（烟垢皮肤/破布袍）× Blender 顶点色
 * 大结构；眼球/瞳孔/嘴缝保持程序化（材质动画通道）。
 * 全部为原创恐怖形体，不复刻任何受版权保护的角色妆造。
 * userData: { update(dt,t,k), eyeMat, faceMat, head }（k = 不安强度 0–1，
 * 驱动痉挛/呼吸/眼睛亮度）。
 */
export function nightmareFigure(height = 2.4) {
  const group = new THREE.Group();
  // ---- 破布黑袍质感（近黑但有织物撕痕细节，红光/惨白光扫过时可读） ----
  const ragTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0a0706';
    g.fillRect(0, 0, s, s);
    const rr = rng(83);
    for (let i = 0; i < 90; i++) { // 竖向撕条与油渍
      g.fillStyle = `rgba(${18 + rr() * 22 | 0},${12 + rr() * 14 | 0},${10 + rr() * 12 | 0},${0.25 + rr() * 0.4})`;
      const x = rr() * s;
      g.fillRect(x, rr() * s * 0.5, 2 + rr() * 5, s * (0.2 + rr() * 0.7));
    }
    grime(g, s, { stains: 20, scratches: 26, alpha: 0.14 });
  }, 2, 2);
  const ragMat = new THREE.MeshStandardMaterial({
    // 近黑煤垢袍（v1.7 调深：底光再亮袍身也不能洗成灰白，
    // 「黑袍黑发惨白脸」的对比就是恐怖感的来源）；
    // v1.8：canvas 撕条细节 × Blender 顶点色炭黑 streak 大结构
    map: ragTex, color: 0x2a201c, roughness: 0.98, metalness: 0,
    bumpMap: ragTex, bumpScale: 0.5, emissive: 0x0a0404, emissiveIntensity: 0.3,
    vertexColors: true
  });
  // ---- 烟垢皮肤（脸与手共用）：惨白底 + 大块煤烟斑 + 皴裂 ----
  const skinTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#96897a';
    g.fillRect(0, 0, s, s);
    const rr = rng(89);
    for (let i = 0; i < 34; i++) { // 煤烟斑块（边缘发虚）
      const rad = 10 + rr() * 46;
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      grad.addColorStop(0, `rgba(16,12,10,${0.5 + rr() * 0.4})`);
      grad.addColorStop(1, 'rgba(16,12,10,0)');
      g.save();
      g.translate(rr() * s, rr() * s);
      g.fillStyle = grad;
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    }
    g.strokeStyle = 'rgba(30,22,18,0.5)';
    for (let i = 0; i < 26; i++) { // 皴裂细纹
      g.lineWidth = 0.6 + rr();
      g.beginPath();
      let x = rr() * s;
      let y = rr() * s;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rr() - 0.5) * 26;
        y += rr() * 18;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: skinTex, color: 0xb0a494, roughness: 0.88, metalness: 0,
    bumpMap: skinTex, bumpScale: 0.35,
    emissive: 0x4a3d31, emissiveIntensity: 0.5, // 尸白微亮——黑暗里也读得出「有一张脸」
    vertexColors: true // Blender 烘焙的眼周/颊侧烟熏黑晕
  });
  // ---- 躯干：Blender 细模档连体破袍（垂褶/撕摆/佝偻前倾/驼峰） ----
  const body = new THREE.Mesh(cylUV(blendGeo('figure/body'), 2), ragMat);
  // ---- 头：Blender 雕刻颅骨壳（深陷眼窝/眉棱/颊窝/鼻脊/长颌，面向 +Z） ----
  const head = new THREE.Group();
  const skull = new THREE.Mesh(cylUV(blendGeo('figure/head')), faceMat);
  head.add(skull);
  // ---- 眼睛：深陷眼窝 + 熏黑眼圈 + 会亮的眼球 + 不对称瞳孔 ----
  // （这双眼睛就是惊吓的核心——v1.7 加大眼球与眼圈，2m 外也读得出
  // 「它在看你」；眉棱压出眼窝阴影，底光扫上来时整圈发黑。）
  const socketMat = new THREE.MeshStandardMaterial({ color: 0x080404, roughness: 1 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xd8d2c2, roughness: 0.25, metalness: 0,
    emissive: 0xfff3da, emissiveIntensity: 0.9
  });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x050302, roughness: 0.4 });
  const mkEye = (side, dy, sc) => {
    // v1.8：眼窝已由 Blender 颅骨壳雕出（深 0.09 的双高斯凹陷），
    // 这里把眼圈/眼球/瞳孔嵌进雕好的窝里（z 内收贴合雕刻面）
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.046 * sc, 10, 8), socketMat);
    socket.position.set(side * 0.062, 0.035 + dy, 0.092);
    socket.scale.z = 0.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.041 * sc, 0.013, 6, 16), socketMat);
    ring.position.set(side * 0.062, 0.035 + dy, 0.104);
    ring.scale.z = 0.45; // 熏黑眼圈——把眼窝在惨白脸上圈出来
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.031 * sc, 10, 8), eyeMat);
    ball.position.set(side * 0.062, 0.035 + dy, 0.118);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0125 * sc, 8, 6), pupilMat);
    pupil.position.set(side * 0.06, 0.033 + dy, 0.145);
    head.add(socket, ring, ball, pupil);
  };
  mkEye(-1, 0.006, 1.0);   // 左眼略高
  mkEye(1, -0.004, 1.18);  // 右眼略大——不对称是最不对劲的细节
  // （眉棱/口窝/颊窝已在 Blender 颅骨壳里雕出——gen_figure.py build_head）
  // 微张的嘴：一条无声的黑缝（update 里随不安撑成无声尖叫）
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), socketMat);
  mouth.scale.set(1.35, 0.5, 0.5);
  mouth.position.set(0, -0.108, 0.128);
  head.add(mouth);
  // ---- 长发（v1.8 Blender 细模档）：贴颅乱壳（脸窗开在正前 + 额前
  // 碎帘）与三组长绺（脑后 14 绺垂到胸口 / 两鬓各 3 绺框脸）都来自
  // gen_figure.py 的 hair_params/build_strand/build_hair_cap；左右绺
  // 独立成 mesh，update 里跟着歪头蠕变各自摆，扑时整头长发向后掀。----
  const hairMat = new THREE.MeshStandardMaterial({
    // 低粗糙度=油腻板结的反光：黑发在夜里靠底光/红边光的高光读出绺
    color: 0x0b0806, roughness: 0.45, metalness: 0,
    bumpMap: noiseCanvasTexture(64, 100, 60, 5), bumpScale: 0.3,
    vertexColors: true, side: THREE.DoubleSide // 额帘薄片从下往上看也不破面
  });
  const hairBack = new THREE.Mesh(cylUV(blendGeo('figure/hairBack')), hairMat);
  const hairL = new THREE.Mesh(cylUV(blendGeo('figure/hairL')), hairMat);
  const hairR = new THREE.Mesh(cylUV(blendGeo('figure/hairR')), hairMat);
  head.add(hairBack, hairL, hairR);
  head.position.set(0, 2.4 * 0.86, 0.1); // 头探在身前（佝偻；细模档 2.4 基准）
  head.rotation.z = 0.16;
  // ---- 双臂 + 苍白长手（Blender 细模档：撕口破袖 + 三节弯曲长指） ----
  const mkArm = (side) => {
    const armGrp = new THREE.Group();
    const sleeve = new THREE.Mesh(
      cylUV(blendGeo(side < 0 ? 'figure/armL' : 'figure/armR')), ragMat);
    const hand = new THREE.Mesh(
      cylUV(blendGeo(side < 0 ? 'figure/handL' : 'figure/handR')), faceMat);
    armGrp.add(sleeve, hand);
    armGrp.position.set(side * 0.27, 2.4 * 0.62, 0.06);
    armGrp.rotation.set(0.34, 0, side * -0.12); // 双臂微抬向前
    return armGrp;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  group.add(body, head, armL, armR);
  group.scale.setScalar(height / 2.4); // 细模档以 2.4 身高建模，等比适配
  group.userData.eyeMat = eyeMat;
  group.userData.faceMat = faceMat;
  group.userData.head = head;
  group.userData.update = (dt, t, k = 0.5) => {
    // 歪头蠕变 + 高频痉挛 + 呼吸起伏 + 眼睛随不安亮起
    head.rotation.z = 0.16 + Math.sin(t * 0.9) * 0.12 + Math.sin(t * 33) * 0.06 * k;
    head.rotation.x = 0.1 + Math.sin(t * 19) * 0.05 * k;
    body.scale.y = 1 + Math.sin(t * 2.6) * 0.012 + Math.sin(t * 21) * 0.008 * k;
    armL.rotation.x = 0.34 + Math.sin(t * 1.4) * 0.05 + Math.sin(t * 27) * 0.05 * k;
    armR.rotation.x = 0.34 + Math.sin(t * 1.2 + 2) * 0.05 + Math.cos(t * 24) * 0.05 * k;
    // 眼睛亮但不烧成光晕（v1.7 调参：让瞳孔与眼白读成「眼睛」而不是车灯）
    eyeMat.emissiveIntensity = 0.55 + k * 1.7 + Math.sin(t * 43) * 0.3 * k;
    faceMat.emissiveIntensity = 0.5 + k * 0.9;
    // 长发跟着头动：两鬓绺反相轻摆，扑（k→1）时整头长发向后掀
    const hs = Math.sin(t * 1.1) * 0.03 + Math.sin(t * 17) * 0.02 * k;
    hairL.rotation.z = 0.02 + hs;
    hairR.rotation.z = -0.02 - hs * 0.85;
    hairBack.rotation.x = -0.02 - k * k * 0.18 + Math.sin(t * 1.7) * 0.02;
    // 无声尖叫：不安越强，那条黑缝撑得越开
    mouth.scale.y = 0.5 + k * k * 1.5;
    mouth.scale.x = 1.35 - k * 0.35;
  };
  return group;
}

/**
 * 梦鱼（v1.6 冥想深潜主角）——「想抓大鱼就得潜到更深的水里」。
 * 一体车削鱼身（顶点色：墨蓝背脊 → 银白腹）+ 鳞纹贴图 + 新月尾 +
 * 背鳍/胸鳍 + 发光侧线 ×2 + 珠光眼 + 触须两根。鱼头朝 +Z。
 * userData.update(dt, t) 驱动尾摆/鳍颤/侧线呼吸；
 * userData.setGlow(v) 献念时全身亮起。
 */
export function dreamFish(len = 3.4, { lite = false } = {}) {
  // lite：小鱼群档——省瞳孔/触须（该尺寸下不可辨）与车削段数，控网格预算
  const group = new THREE.Group();

  // ---- 鱼身：LatheGeometry 绕轴车削（轴向 +Z），一体成型 ----
  const prof = [];
  const R = len * 0.135; // 最大体半径
  const stations = [
    [0.0, 0.012], [0.04, 0.32], [0.12, 0.62], [0.24, 0.88], [0.4, 1.0],
    [0.56, 0.94], [0.7, 0.72], [0.82, 0.42], [0.92, 0.2], [1.0, 0.085]
  ];
  for (const [u, k] of stations) prof.push(new THREE.Vector2(Math.max(0.001, R * k), u * len));
  const bodyGeo = new THREE.LatheGeometry(prof, lite ? 16 : 28);
  bodyGeo.rotateX(Math.PI / 2);          // 轴向 → +Z（0 = 鼻尖…等等：lathe y=0 是第一站）
  bodyGeo.translate(0, 0, -len * 0.45);  // 鼻尖在 +Z 前方，重心近原点
  bodyGeo.computeVertexNormals();
  // 顶点色：背脊墨蓝黑 → 腹部银白（按法线俯仰混合），加一点脊线冷辉
  {
    const pos = bodyGeo.attributes.position;
    const nrm = bodyGeo.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const back = new THREE.Color(0x0a141f);
    const belly = new THREE.Color(0x8ea6b4);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const ny = nrm.getY(i);
      const k = Math.pow(Math.min(1, Math.max(0, 0.5 - ny * 0.62)), 1.35);
      c.copy(back).lerp(belly, k);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    bodyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  // 鳞纹（低对比叠瓦弧排 + 细噪）：map + bump 双通道
  const scaleTex = canvasTexture(256, (g, s) => {
    g.fillStyle = '#9aa4ac';
    g.fillRect(0, 0, s, s);
    for (let row = 0; row < 16; row++) {
      for (let i = 0; i < 16; i++) {
        const x = i * 16 + (row % 2) * 8;
        const y = row * 16;
        g.strokeStyle = `rgba(30,40,52,${0.22 + Math.random() * 0.18})`;
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(x, y, 9, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
        g.fillStyle = `rgba(215,228,236,${0.05 + Math.random() * 0.05})`;
        g.fillRect(x - 5, y + 3, 10, 2);
      }
    }
  }, 6, 2);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: scaleTex, vertexColors: true, roughness: 0.32, metalness: 0.42,
    bumpMap: scaleTex, bumpScale: 0.35, envMapIntensity: 1.1,
    emissive: 0x27455c, emissiveIntensity: 0.12
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // ---- 鳍：薄片 Shape（半透明、边缘微光）----
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x16222e, roughness: 0.55, side: THREE.DoubleSide,
    transparent: true, opacity: 0.82, emissive: 0x3e6a86, emissiveIntensity: 0.28
  });
  const finShape = (pts) => {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    return new THREE.ShapeGeometry(sh);
  };
  // 背鳍：长低帆形（贴在背脊上）
  const dorsal = new THREE.Mesh(
    finShape([[0, 0], [len * 0.34, 0], [len * 0.30, R * 0.85], [len * 0.16, R * 1.12], [len * 0.04, R * 0.5]]),
    finMat
  );
  dorsal.rotation.y = -Math.PI / 2;
  dorsal.position.set(0, R * 0.86, len * 0.2);
  group.add(dorsal);
  // 胸鳍一对（会随游动划水）
  const mkPect = (side) => {
    const p = new THREE.Mesh(
      finShape([[0, 0], [len * 0.16, -R * 0.34], [len * 0.2, -R * 0.16], [len * 0.07, R * 0.06]]),
      finMat
    );
    p.position.set(side * R * 0.88, -R * 0.22, len * 0.24);
    p.rotation.z = side * 0.5;
    p.rotation.y = side * 0.55;
    return p;
  };
  const pectL = mkPect(-1);
  const pectR = mkPect(1);
  group.add(pectL, pectR);

  // ---- 尾：新月双叶（挂在尾柄枢轴上摆动）----
  const tail = new THREE.Group();
  const tailFin = new THREE.Mesh(
    finShape([
      [0, 0], [-len * 0.2, R * 1.3], [-len * 0.128, R * 0.4], [-len * 0.11, 0],
      [-len * 0.128, -R * 0.4], [-len * 0.2, -R * 1.3]
    ]),
    finMat
  );
  tailFin.rotation.y = Math.PI / 2;
  tail.add(tailFin);
  tail.position.set(0, 0, -len * 0.44);
  group.add(tail);

  // ---- 发光侧线（左右各一条沿体侧的细管）----
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x0c1218, emissive: 0x6fd4ff, emissiveIntensity: 1.3,
    roughness: 0.4, transparent: true, opacity: 0.95
  });
  const mkLateral = (side) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const z = -len * 0.42 + u * len * 0.92;
      const st = 1 - Math.abs(u - 0.44) * 1.6;
      const r = R * Math.max(0.12, Math.min(1, st)) * 1.005;
      pts.push(new THREE.Vector3(side * r, R * 0.06 + Math.sin(u * 5) * 0.01, z));
    }
    return new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 6),
      lineMat
    );
  };
  group.add(mkLateral(1), mkLateral(-1));

  // ---- 眼：珠光大眼一对（虹膜发光 + 黑瞳）----
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0a0c10, emissive: 0xbfe4ff, emissiveIntensity: 1.6, roughness: 0.2
  });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x02040a, roughness: 0.1 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 12, 10), eyeMat);
    eye.position.set(side * R * 0.62, R * 0.18, len * 0.42);
    group.add(eye);
    if (!lite) {
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 8, 8), pupilMat);
      pupil.position.set(side * R * 0.76, R * 0.18, len * 0.46);
      group.add(pupil);
    }
  }

  // ---- 触须两根（深水的老家伙）----
  const barbels = [];
  const barbMat = new THREE.MeshStandardMaterial({ color: 0x1c2830, roughness: 0.7 });
  if (!lite) {
    for (const side of [-1, 1]) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * R * 0.3, -R * 0.4, len * 0.5),
        new THREE.Vector3(side * R * 0.7, -R * 1.1, len * 0.42),
        new THREE.Vector3(side * R * 1.0, -R * 1.9, len * 0.28)
      );
      const b = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.012, 5), barbMat);
      barbels.push(b);
      group.add(b);
    }
  }

  let glow = 0;
  group.userData.setGlow = (v) => { glow = v; };
  group.userData.update = (dt, t) => {
    tail.rotation.y = Math.sin(t * 2.7) * 0.42;
    body.rotation.z = Math.sin(t * 1.15) * 0.05;
    pectL.rotation.z = -0.5 - (Math.sin(t * 2.1) * 0.28 + 0.28);
    pectR.rotation.z = 0.5 + Math.sin(t * 2.1 + 0.9) * 0.28 + 0.28;
    dorsal.rotation.x = Math.sin(t * 1.7) * 0.06;
    for (const [i, b] of barbels.entries()) b.rotation.x = Math.sin(t * 1.9 + i * 2.2) * 0.1;
    lineMat.emissiveIntensity = 1.1 + Math.sin(t * 1.6) * 0.5 + glow * 3.2;
    eyeMat.emissiveIntensity = 1.4 + Math.sin(t * 2.3) * 0.4 + glow * 2.4;
    bodyMat.emissiveIntensity = 0.12 + glow * 0.5;
  };
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

/**
 * 绕拐角现身路径（v1.7 拐角惊吓专用，纯几何、可单测）。
 * from = 藏身点（墙后，触发前绝对不可见）；pivot = 拐角外皮上的绕角枢轴。
 * aim(px, pz, standOff) 依玩家位置算出站位（枢轴朝玩家方向 standOff 米处；
 * 玩家贴得比 standOff 还近时收在枢轴本身，永不穿模）。
 * at(u, out) 取二次贝塞尔 from→pivot→to 上的点：三个控制点都在墙外侧时，
 * 凸包性质保证整条曲线永远不进墙——黑影是「贴着拐角挪出来」的，不是穿墙。
 */
export function cornerRevealPath(from, pivot) {
  const to = new THREE.Vector3();
  return {
    from, pivot, to,
    aim(px, pz, standOff = 1.9) {
      const dx = px - pivot.x;
      const dz = pz - pivot.z;
      const d = Math.hypot(dx, dz) || 1;
      const k = Math.max(0, 1 - standOff / d);
      to.set(pivot.x + dx * k, 0, pivot.z + dz * k);
      return to;
    },
    at(u, out) {
      const s = 1 - u;
      const a = s * s;
      const b = 2 * u * s;
      const c = u * u;
      out.set(
        a * from.x + b * pivot.x + c * to.x, 0,
        a * from.z + b * pivot.z + c * to.z
      );
      return out;
    }
  };
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
 * 一体化黑松（v1.8 Blender 权威细模档）——树干、根盘、瓣裂针叶冠
 * 为单一几何体（gen_pine.py：HI 细模逐枝垂坠针叶簇存档于
 * blends/pine.blend，GAME 档由同一组「基因」参数派生——瓣位对齐
 * HI 的枝角、瓣缘各自垂坠、冠底盖片自遮蔽压暗、根盘裙脚、树皮
 * 竖棱与顶点色「冠芯近黑 → 缘梢冷月光绿」全部烘焙在数据里）。
 * detail=1 近景英雄档（pine/hero，含枯枝桩与盖片）/
 * detail=0 远景简化档（pine/far）。树干与树冠永不分离（单几何）。
 * 返回 { geo, mat }：几何底部落在 y=0，总高约 4.8（等比缩放用）。
 */
export function pineTree({ detail = 1 } = {}) {
  const geo = blendGeo(detail ? 'pine/hero' : 'pine/far');
  const mat = new THREE.MeshStandardMaterial({
    // color 乘数是夜色分级（与厅内 instanceColor 调色同层）：连续裙锥
    // 的受光面积比 v1.7 分层锥大（旧版层间露出压暗盖片），月光下会
    // 整片泛灰——按 v1.7 已验收截屏像素校准压回「黑松要黑」的基调
    color: 0x8d948d,
    vertexColors: true, roughness: 0.96, metalness: 0,
    bumpMap: noiseCanvasTexture(64, 128, 74, 3), bumpScale: 0.38
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
