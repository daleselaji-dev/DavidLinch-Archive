// ============================================================
// 各展厅环境底噪配方 — 纯数据，供 AudioEngine 实时合成。
// 全部由振荡器 + 噪声 + 滤波器生成，不含任何采样音频。
// ============================================================

export const DRONES = {
  lobby: {
    // 双相位低频嗡鸣 —— "房间在通电"
    oscs: [
      { type: 'sine', freq: 55, gain: 0.055 },
      { type: 'sine', freq: 55.7, gain: 0.05 },
      { type: 'triangle', freq: 110.4, gain: 0.011 }
    ],
    noises: [{ type: 'brown', gain: 0.05, filter: { type: 'lowpass', freq: 300, q: 0.7 } }],
    lfo: { freq: 0.07, depth: 0.4 },
    events: []
  },
  archive: {
    // 档案室: 更亮的电流声 + 磁带气息
    oscs: [
      { type: 'sine', freq: 60, gain: 0.04 },
      { type: 'sine', freq: 120.3, gain: 0.014 },
      { type: 'sine', freq: 179.8, gain: 0.006 }
    ],
    noises: [{ type: 'pink', gain: 0.02, filter: { type: 'bandpass', freq: 3200, q: 1.2 } }],
    lfo: { freq: 0.11, depth: 0.3 },
    events: [{ sfx: 'fluor', minGap: 5, maxGap: 13 }]
  },
  eraserhead: {
    // 工业摇篮曲: 沉重机器 + 周期金属撞击
    oscs: [
      { type: 'square', freq: 41.2, gain: 0.028 },
      { type: 'sine', freq: 41.6, gain: 0.05 },
      { type: 'sawtooth', freq: 82.9, gain: 0.008 }
    ],
    noises: [
      { type: 'brown', gain: 0.075, filter: { type: 'lowpass', freq: 210, q: 1.1 } },
      { type: 'white', gain: 0.012, filter: { type: 'bandpass', freq: 1900, q: 4 } }
    ],
    lfo: { freq: 0.19, depth: 0.5 },
    events: [
      { sfx: 'clank', minGap: 6, maxGap: 15 },
      { sfx: 'steamfar', minGap: 11, maxGap: 24 }
    ]
  },
  bluevelvet: {
    // 夜总会: 小调和声垫 + 唱片炒豆声
    oscs: [
      { type: 'triangle', freq: 110, gain: 0.03 },
      { type: 'triangle', freq: 130.8, gain: 0.022 },
      { type: 'triangle', freq: 164.8, gain: 0.018 },
      { type: 'sine', freq: 55, gain: 0.04 }
    ],
    noises: [{ type: 'crackle', gain: 0.05, filter: { type: 'highpass', freq: 1400, q: 0.6 } }],
    lfo: { freq: 0.09, depth: 0.35 },
    events: []
  },
  twinpeaks: {
    // 黑松林: 风 + 极低垫音 + 远处猫头鹰
    oscs: [
      { type: 'sine', freq: 49, gain: 0.045 },
      { type: 'sine', freq: 73.4, gain: 0.014 }
    ],
    noises: [{ type: 'white', gain: 0.05, filter: { type: 'bandpass', freq: 480, q: 0.4 } }],
    lfo: { freq: 0.05, depth: 0.75 },
    events: [{ sfx: 'owl', minGap: 9, maxGap: 22 }]
  },
  mulholland: {
    // 梦境错位: 黑暗和声垫 + 缓慢涌动
    oscs: [
      { type: 'sine', freq: 46.2, gain: 0.05 },
      { type: 'sine', freq: 46.9, gain: 0.04 },
      { type: 'triangle', freq: 138.6, gain: 0.009 },
      { type: 'sine', freq: 92.5, gain: 0.013 }
    ],
    noises: [{ type: 'brown', gain: 0.04, filter: { type: 'lowpass', freq: 420, q: 0.9 } }],
    lfo: { freq: 0.04, depth: 0.6 },
    events: [{ sfx: 'swell', minGap: 14, maxGap: 30 }]
  }
};
