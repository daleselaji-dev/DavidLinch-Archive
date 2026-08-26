import { describe, it, expect } from 'vitest';
import { JAZZ } from '../src/audio/jazz.js';

describe('程序化深夜爵士氛围层（配方校验）', () => {
  it('速度为慢速摇摆（50–80 BPM）且摇摆比例在三连音域', () => {
    expect(JAZZ.bpm).toBeGreaterThanOrEqual(50);
    expect(JAZZ.bpm).toBeLessThanOrEqual(80);
    expect(JAZZ.swing).toBeGreaterThan(0.55);
    expect(JAZZ.swing).toBeLessThan(0.75);
  });

  it('和声进行 ≥4 小节，每小节含行走贝斯 4 音与和声音堆', () => {
    expect(JAZZ.progression.length).toBeGreaterThanOrEqual(4);
    for (const bar of JAZZ.progression) {
      expect(bar.bass).toHaveLength(4);
      expect(bar.chord.length).toBeGreaterThanOrEqual(3);
      // 贝斯在低音区（不轰不刺）
      for (const f of bar.bass) {
        expect(f).toBeGreaterThanOrEqual(40);
        expect(f).toBeLessThanOrEqual(200);
      }
      // 和声在中音区
      for (const f of bar.chord) {
        expect(f).toBeGreaterThanOrEqual(180);
        expect(f).toBeLessThanOrEqual(600);
      }
    }
  });

  it('ride 骨架含正拍与摇摆后八分', () => {
    expect(JAZZ.ridePattern).toContain(0);
    expect(JAZZ.ridePattern.some((b) => b % 1 !== 0)).toBe(true);
    for (const b of JAZZ.ridePattern) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(4);
    }
  });

  it('铜管短句音阶在可听中音区', () => {
    expect(JAZZ.hornScale.length).toBeGreaterThanOrEqual(5);
    for (const f of JAZZ.hornScale) {
      expect(f).toBeGreaterThan(200);
      expect(f).toBeLessThan(1200);
    }
  });

  it('混音电平压在底噪之下（防喧宾夺主）', () => {
    expect(JAZZ.level).toBeGreaterThan(0);
    expect(JAZZ.level).toBeLessThanOrEqual(0.3);
  });

  it('回转填充音阶：中高音区严格下行（v1.3 抛光）', () => {
    expect(JAZZ.fillScale.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < JAZZ.fillScale.length; i++) {
      expect(JAZZ.fillScale[i]).toBeGreaterThan(300);
      expect(JAZZ.fillScale[i]).toBeLessThan(1100);
      if (i > 0) expect(JAZZ.fillScale[i]).toBeLessThan(JAZZ.fillScale[i - 1]);
    }
  });
});
