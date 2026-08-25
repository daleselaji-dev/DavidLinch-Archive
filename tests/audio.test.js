import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DRONES } from '../src/audio/drones.js';
import { spatialParams } from '../src/audio/engine.js';

const HALLS = ['lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio'];
const OSC_TYPES = ['sine', 'triangle', 'square', 'sawtooth'];
const NOISE_TYPES = ['white', 'brown', 'pink', 'crackle'];
const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass'];

describe('程序化环境音配方', () => {
  it('每个展厅都有底噪配方', () => {
    for (const h of HALLS) expect(DRONES[h]).toBeTruthy();
  });

  it('振荡器参数在安全可听范围', () => {
    for (const cfg of Object.values(DRONES)) {
      expect(cfg.oscs.length).toBeGreaterThanOrEqual(2);
      for (const o of cfg.oscs) {
        expect(OSC_TYPES).toContain(o.type);
        expect(o.freq).toBeGreaterThanOrEqual(20);
        expect(o.freq).toBeLessThanOrEqual(2000);
        expect(o.gain).toBeGreaterThan(0);
        expect(o.gain).toBeLessThanOrEqual(0.2); // 防炸耳
      }
    }
  });

  it('噪声与滤波参数合法', () => {
    for (const cfg of Object.values(DRONES)) {
      expect(cfg.noises.length).toBeGreaterThanOrEqual(1);
      for (const n of cfg.noises) {
        expect(NOISE_TYPES).toContain(n.type);
        expect(FILTER_TYPES).toContain(n.filter.type);
        expect(n.filter.freq).toBeGreaterThan(20);
        expect(n.filter.freq).toBeLessThan(20000);
        expect(n.gain).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it('低频嗡鸣确实存在（每厅至少一个 <120Hz 成分）', () => {
    for (const [name, cfg] of Object.entries(DRONES)) {
      const hasLow = cfg.oscs.some((o) => o.freq < 120);
      expect(hasLow, `${name} 缺少低频成分`).toBe(true);
    }
  });

  it('事件音间隔合理', () => {
    for (const cfg of Object.values(DRONES)) {
      for (const ev of cfg.events || []) {
        expect(ev.minGap).toBeGreaterThanOrEqual(3);
        expect(ev.maxGap).toBeGreaterThan(ev.minGap);
        expect(typeof ev.sfx).toBe('string');
      }
    }
  });
});

describe('v1.3 位置化音效 spatialParams（纯几何）', () => {
  it('正前方（yaw=0，-z 方向）声像居中', () => {
    const { pan } = spatialParams(0, -5, 0);
    expect(Math.abs(pan)).toBeLessThan(1e-9);
  });

  it('yaw=0 时 +x 声源偏右、-x 偏左', () => {
    expect(spatialParams(4, 0, 0).pan).toBeGreaterThan(0.5);
    expect(spatialParams(-4, 0, 0).pan).toBeLessThan(-0.5);
  });

  it('转身 π 后左右互换', () => {
    const before = spatialParams(4, 0, 0).pan;
    const after = spatialParams(4, 0, Math.PI).pan;
    expect(before).toBeGreaterThan(0);
    expect(after).toBeLessThan(0);
    expect(Math.abs(before + after)).toBeLessThan(1e-6);
  });

  it('yaw=π/2（面向 -x）时 -z 方向声源在右手侧', () => {
    expect(spatialParams(0, -4, Math.PI / 2).pan).toBeGreaterThan(0.5);
  });

  it('声像永远被夹在 [-1, 1]', () => {
    for (const [dx, dz, yaw] of [[100, 0, 0], [-100, 3, 2.1], [0.5, -0.1, -3]]) {
      const { pan } = spatialParams(dx, dz, yaw);
      expect(pan).toBeGreaterThanOrEqual(-1);
      expect(pan).toBeLessThanOrEqual(1);
    }
  });

  it('距离衰减单调：参考距离内不衰减，远处按幂率衰减', () => {
    const near = spatialParams(0, -2, 0, 3).att;
    const mid = spatialParams(0, -6, 0, 3).att;
    const far = spatialParams(0, -18, 0, 3).att;
    expect(near).toBe(1);
    expect(mid).toBeLessThan(near);
    expect(far).toBeLessThan(mid);
    expect(far).toBeGreaterThan(0);
  });

  it('零距离不产生 NaN', () => {
    const { pan, att } = spatialParams(0, 0, 1.2);
    expect(pan).toBe(0);
    expect(Number.isFinite(att)).toBe(true);
  });
});

describe('v1.3 新交互音色（源码审计：合成器 switch 分支存在）', () => {
  const src = readFileSync(new URL('../src/audio/engine.js', import.meta.url), 'utf8');
  it.each(['bell', 'ratchet', 'creak', 'switch', 'crank'])('音色 %s 已实现', (name) => {
    expect(src).toContain(`case '${name}'`);
  });

  it('sfxAt / setListener 定位接口存在', () => {
    expect(src).toContain('sfxAt(name, x, z');
    expect(src).toContain('setListener(fn)');
  });
});

describe('v1.3 脚步系统（七种地面材质 + 逐厅映射）', () => {
  const engineSrc = readFileSync(new URL('../src/audio/engine.js', import.meta.url), 'utf8');
  const mainSrc = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

  it.each(['wood', 'concrete', 'tile', 'carpet', 'asphalt', 'dirt', 'metal'])(
    '脚步音色 step-%s 已实现', (surf) => {
      expect(engineSrc).toContain(`case 'step-${surf}'`);
    }
  );

  it('主循环存在步幅触发（左右交替声像 + 传送保护）', () => {
    expect(mainSrc).toContain('step-${surf}');
    expect(mainSrc).toContain('stepState');
    expect(mainSrc).toMatch(/d > 1\.5/);
  });

  it('每个展厅 meta 都声明了 floorSfx；多地面厅有 surfaceAt 分区', () => {
    for (const h of HALLS) {
      const hallSrc = readFileSync(new URL(`../src/halls/${h}.js`, import.meta.url), 'utf8');
      expect(hallSrc, `${h} 缺 floorSfx`).toContain('floorSfx:');
    }
    for (const h of ['twinpeaks', 'mulholland', 'studio', 'eraserhead']) {
      const hallSrc = readFileSync(new URL(`../src/halls/${h}.js`, import.meta.url), 'utf8');
      expect(hallSrc, `${h} 缺 surfaceAt`).toContain('surfaceAt:');
    }
  });
});
