import { describe, it, expect } from 'vitest';
import { DRONES } from '../src/audio/drones.js';

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
