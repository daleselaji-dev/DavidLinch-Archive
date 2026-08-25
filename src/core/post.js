// ============================================================
// LynchPass — 全屏后处理：胶片颗粒 / 暗角 / 扫描线 / 色差 /
// 亮度颤动 / 饱和度分级 / 梦境反色。全部程序化，无贴图资源。
// ============================================================
import * as THREE from 'three';

export const LynchShader = {
  name: 'LynchShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.085 },
    uVignette: { value: 1.12 },
    uScanline: { value: 0.05 },
    uAberration: { value: 0.0022 },
    uFlicker: { value: 0.035 },
    uSaturation: { value: 1.0 },
    uTintColor: { value: new THREE.Color(1, 1, 1) },
    uInvert: { value: 0.0 },
    uShock: { value: 0.0 },
    uFlash: { value: 0.0 },
    uFlashColor: { value: new THREE.Color(1, 0.96, 0.9) },
    uResolution: { value: new THREE.Vector2(1920, 1080) }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uScanline;
    uniform float uAberration;
    uniform float uFlicker;
    uniform float uSaturation;
    uniform vec3 uTintColor;
    uniform float uInvert;
    uniform float uShock;
    uniform float uFlash;
    uniform vec3 uFlashColor;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float r2 = dot(centered, centered);

      // 冲击(彩蛋惊吓): 画面猛烈抽搐 + 撕裂
      if (uShock > 0.001) {
        float jx = (hash(vec2(floor(uTime * 90.0), 1.3)) - 0.5) * 0.05 * uShock;
        float jy = (hash(vec2(floor(uTime * 90.0), 8.6)) - 0.5) * 0.035 * uShock;
        centered += vec2(jx, jy);
        centered *= 1.0 - 0.08 * uShock; // 向内猛拉(变焦冲击)
      }

      // 轻微桶形畸变 —— 老镜头感
      vec2 warped = centered * (1.0 + 0.045 * r2);
      uv = warped + 0.5;

      // 径向色差（冲击时暴涨）
      float ab = uAberration * (0.35 + r2 * 3.2) * (1.0 + uShock * 14.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + centered * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - centered * ab).b;

      // 胶片颗粒（时变；冲击时颗粒风暴）
      float g = hash(uv * uResolution.xy * 0.75 + fract(uTime) * 731.7);
      col += (g - 0.5) * uGrain * (1.0 + uShock * 7.0) * (0.55 + 0.45 * (1.0 - dot(col, vec3(0.333))));

      // 扫描线
      float sl = sin((uv.y * uResolution.y) * 3.14159) * 0.5 + 0.5;
      col *= 1.0 - uScanline * sl;

      // 电灯颤动 —— 不规则亮度抖动
      float fl = hash(vec2(floor(uTime * 24.0), 7.77));
      float spike = step(0.965, hash(vec2(floor(uTime * 9.0), 3.21)));
      col *= 1.0 - uFlicker * (fl * 0.6 + spike * 1.8);

      // 饱和度分级 + 色调
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, uSaturation) * uTintColor;

      // 暗角（冲击时收紧成隧道）
      float vig = smoothstep(0.92, 0.22, r2 * (uVignette + uShock * 1.7));
      col *= mix(0.32, 1.0, vig);

      // 梦境反色（穆赫兰道展厅交互）
      col = mix(col, 1.0 - col, clamp(uInvert, 0.0, 1.0));

      // 闪光帧（惊吓瞬间的过曝白/红）
      col = mix(col, uFlashColor * 1.6, clamp(uFlash, 0.0, 1.0));

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
