// ============================================================
// kit — 程序化美术工具库。所有几何/材质/纹理均由代码生成，
// 项目内不存在任何外部图像或音频素材。
// ============================================================
import * as THREE from 'three';

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
  tex.anisotropy = 4;
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

/** 黑白折线地板（通用锯齿纹样） */
export function chevronTexture(colA = '#0d0d0f', colB = '#e8e2d5', repeat = 6) {
  return canvasTexture(256, (g, s) => {
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
  }, repeat, repeat);
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

// ---------- 天鹅绒帷幕 ----------
export function velvetMaterial(color = PALETTE.velvet) {
  const rough = noiseCanvasTexture(128, 200, 40, 3);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0.02,
    roughnessMap: rough,
    bumpMap: rough,
    bumpScale: 0.6,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide
  });
}

/** 垂坠褶皱帷幕：正弦叠加位移的高分段平面 */
export function curtain(width, height, color = PALETTE.velvet, folds = 7) {
  const geo = new THREE.PlaneGeometry(width, height, Math.max(48, folds * 14), 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = x / width + 0.5;
    const sag = 1 - Math.pow(Math.abs(y / height) * 2, 2) * 0.12;
    const z =
      (Math.sin(u * Math.PI * folds * 2) * 0.16 +
        Math.sin(u * Math.PI * folds * 5.3 + 1.7) * 0.05) * sag;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, velvetMaterial(color));
}

/** 围合式帷幕墙（圆弧排布） */
export function curtainRing(radius, height, color, segments = 18, arc = Math.PI * 2, startAngle = 0) {
  const group = new THREE.Group();
  const segW = (arc * radius) / segments;
  const mat = velvetMaterial(color);
  for (let i = 0; i < segments; i++) {
    const a = startAngle + (i + 0.5) * (arc / segments);
    const m = curtain(segW * 1.06, height, color);
    m.material = mat;
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

/** 通往其他展厅的门廊 */
export function doorway({ label, labelZh, color = '#3ec5ff', width = 2.4, height = 3.4 }) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x17090d, roughness: 0.4, metalness: 0.6, envMapIntensity: 0.8 });
  const colGeo = new THREE.BoxGeometry(0.34, height, 0.34);
  const left = new THREE.Mesh(colGeo, frameMat);
  left.position.set(-width / 2, height / 2, 0);
  const right = left.clone();
  right.position.x = width / 2;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.4, 0.5), frameMat);
  lintel.position.y = height + 0.2;
  // 门内的"虚空" —— 微光涌动的黑
  const voidMat = new THREE.MeshStandardMaterial({
    color: 0x02010a, roughness: 1,
    emissive: new THREE.Color(color), emissiveIntensity: 0.16
  });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.2, height - 0.1), voidMat);
  portal.position.y = height / 2;
  const sign = neonSign(label, { color, size: 0.42 });
  sign.position.y = height + 0.85;
  const signZh = neonSign(labelZh, { color, size: 0.3, font: "'Songti SC','SimSun',serif" });
  signZh.position.y = height + 0.42;
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.6, 0.09, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1c1216, roughness: 0.75 })
  );
  step.position.set(0, 0.045, 0.35);
  group.add(left, right, lintel, portal, sign, signZh, step);
  group.userData.portal = portal;
  group.userData.update = (dt, t) => {
    portal.material.emissiveIntensity = 0.13 + Math.sin(t * 1.7) * 0.06;
    sign.userData.flicker(t, width);
  };
  return group;
}

/** 展签立牌（可作热点） */
export function standPlaque(title, subtitle, accent = '#c9a35c') {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x14090c, roughness: 0.5, metalness: 0.7 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.05, 10), postMat);
  post.position.y = 0.52;
  const tex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#100a0d';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = accent;
    g.lineWidth = 5;
    g.strokeRect(14, 14, s - 28, s - 28);
    g.fillStyle = '#f2e9dc';
    g.font = '400 58px Georgia, serif';
    g.textAlign = 'center';
    g.fillText(title, s / 2, s / 2 - 30, s - 80);
    g.fillStyle = accent;
    g.font = '30px "Courier New", monospace';
    g.fillText(subtitle, s / 2, s / 2 + 46, s - 80);
    g.fillStyle = 'rgba(242,233,220,0.5)';
    g.font = '24px "Courier New", monospace';
    g.fillText('· 点 击 阅 读 ·', s / 2, s - 66);
  });
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.72, 0.04),
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.6,
      emissive: 0xf2e9dc, emissiveMap: tex, emissiveIntensity: 0.35
    })
  );
  board.position.y = 1.32;
  board.rotation.x = -0.22;
  group.add(post, board);
  group.userData.board = board;
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
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 0.08),
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.55,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5
    })
  );
  return mesh;
}

/** 立式话筒（抽象原创造型） */
export function micStand() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.25, metalness: 0.95, envMapIntensity: 1.2 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 20), metal);
  base.position.y = 0.025;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.45, 8), metal);
  pole.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), metal);
  head.position.y = 1.5;
  g.add(base, pole, head);
  return g;
}

/** 松树（原创低多边形） */
export function pineGeometryMaterial() {
  const geo = new THREE.ConeGeometry(1, 3.2, 7);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a1a10, roughness: 0.95 });
  return { geo, mat };
}

/** 悬挂灯泡（含灯罩） */
export function hangingBulb(color = 0xffe9c4, cordLen = 2) {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, cordLen, 5),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.9 })
  );
  cord.position.y = -cordLen / 2;
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.2, 14, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.4, metalness: 0.8, side: THREE.DoubleSide })
  );
  shade.position.y = -cordLen + 0.05;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 10),
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
