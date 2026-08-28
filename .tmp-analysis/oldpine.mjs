import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function rng(seed){let a=seed>>>0;return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
export function oldPineTree({ seed = 41, detail = 1 } = {}) {
  const r = rng(seed);
  const H = 4.8;
  const radial = detail ? 11 : 7;
  const parts = [];
  const paint = (geo, fn) => {
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      fn(c, pos.getX(i), pos.getY(i), pos.getZ(i));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  };
  // ---- 树干：贯穿整冠（从任何缝隙看进去都有干），根盘外扩 + 皮棱 ----
  const trunkH = H * 0.96;
  const trunk = new THREE.CylinderGeometry(0.045, 0.17, trunkH, radial - 2, detail ? 6 : 3);
  trunk.translate(0, trunkH / 2, 0);
  {
    const p = trunk.attributes.position;
    const ph = r() * 7;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const a = Math.atan2(p.getZ(i), p.getX(i));
      // 根盘：低处向外张开成裙脚，扎进地里
      const flare = y < 0.6 ? (0.6 - y) * (1.0 + Math.sin(a * 3 + ph) * 0.5) : 0;
      // 树皮竖棱（确定性，接缝两侧位移一致）
      const bark = 1 + Math.sin(a * 7 + y * 2.1 + ph) * 0.07 + Math.sin(a * 17 + ph * 2) * 0.03;
      p.setX(i, p.getX(i) * (bark + flare));
      p.setZ(i, p.getZ(i) * (bark + flare));
    }
    trunk.computeVertexNormals();
    paint(trunk, (c, x, y) => {
      const v = 0.8 + Math.sin(y * 9.1 + x * 21) * 0.14;
      c.setRGB(0.11 * v, 0.078 * v, 0.05 * v);
    });
  }
  parts.push(trunk);
  // ---- 短枝残桩（英雄树独有）：冠下露出的几根枯枝，把干与冠「织」在一起 ----
  if (detail) {
    for (let b = 0; b < 4; b++) {
      const a = r() * Math.PI * 2;
      const y = H * (0.24 + r() * 0.16);
      const len = 0.32 + r() * 0.3;
      const stub = new THREE.CylinderGeometry(0.012, 0.03, len, 5);
      stub.translate(0, len / 2, 0);
      stub.rotateZ(Math.PI / 2 - 0.5 - r() * 0.3);
      stub.rotateY(a);
      stub.translate(Math.cos(a) * 0.08, y, -Math.sin(a) * 0.08);
      paint(stub, (c) => c.setRGB(0.08, 0.058, 0.038));
      parts.push(stub);
    }
  }
  // ---- 层叠针叶冠：裙缘参差 + 下垂枝梢，底层从 0.26H 起（下方露干与根盘） ----
  const nT = detail ? 6 : 4;
  for (let ti = 0; ti < nT; ti++) {
    const u = ti / (nT - 1);
    const tierR = (1.42 - u * 1.1) * (1 + (r() - 0.5) * 0.12);
    const tierH = 1.55 - u * 0.55;
    const yBase = H * (0.24 + u * 0.6);
    const cone = new THREE.ConeGeometry(tierR, tierH, radial, detail ? 3 : 2);
    const ph1 = r() * 7;
    const ph2 = r() * 7;
    const p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const v = (y + tierH / 2) / tierH; // 0 = 裙缘, 1 = 该层顶
      // 裙缘参差（双频角向噪声，越靠缘越明显）
      const jag = 1 + (Math.sin(a * 5 + ph1) * 0.11 + Math.sin(a * 12 + ph2) * 0.06) * (1 - v);
      p.setX(i, p.getX(i) * jag);
      p.setZ(i, p.getZ(i) * jag);
      // 枝梢下垂：外缘往下坠出「压着雪」的弧度
      if (v < 0.25) {
        p.setY(i, y - (0.25 - v) * (0.55 + Math.sin(a * 7 + ph2) * 0.3) * tierH * 0.5);
      }
    }
    cone.translate(0, yBase + tierH / 2, 0);
    cone.computeVertexNormals();
    const rMax = tierR * 1.2;
    const tierShade = 0.72 + u * 0.28; // 低层枝在冠影里更暗
    paint(cone, (c, x, y, z) => {
      const d = Math.min(1, Math.hypot(x, z) / rMax);
      // 冠芯近黑 → 缘梢一点冷月光绿（黑松要黑，别读成圣诞树）
      c.setRGB(
        (0.016 + d * 0.03) * tierShade,
        (0.038 + d * 0.062) * tierShade,
        (0.026 + d * 0.046) * tierShade
      );
    });
    // 冠底盖片自遮蔽压暗（v1.7）：从树下抬头看，层底不该是一片亮板——
    // 法线朝正下的盖片顶点整体压到三成，近景钻到树冠下也不穿帮
    {
      const nrm = cone.attributes.normal;
      const col = cone.attributes.color;
      for (let i = 0; i < nrm.count; i++) {
        if (nrm.getY(i) < -0.75) {
          col.setXYZ(i, col.getX(i) * 0.3, col.getY(i) * 0.3, col.getZ(i) * 0.3);
        }
      }
    }
    parts.push(cone);
  }
  const geo = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  return { geo };
}
