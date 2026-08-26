import { describe, it, expect } from 'vitest';
import { MURMUR, murmurPlan, MurmurVoice } from '../src/audio/murmur.js';

// 确定性伪随机（种子化），让时间线可断言
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('MurmurVoice —「代替配音」：介于真实与虚假之间', () => {
  it('配方参数域：共振峰对落在真实语音域内（F1 200–900 / F2 800–2500 Hz）', () => {
    for (const [f1, f2] of MURMUR.vowels) {
      expect(f1).toBeGreaterThanOrEqual(200);
      expect(f1).toBeLessThanOrEqual(900);
      expect(f2).toBeGreaterThanOrEqual(800);
      expect(f2).toBeLessThanOrEqual(2500);
      expect(f2).toBeGreaterThan(f1);
    }
  });

  it('总线电平压在氛围之下（≤0.25——是低语，不是朗读）', () => {
    expect(MURMUR.level).toBeLessThanOrEqual(0.25);
    expect(MURMUR.level).toBeGreaterThan(0);
  });

  it('murmurPlan 纯函数：同种子同文本 → 同时间线', () => {
    const a = murmurPlan('慢慢走。让眼睛先适应黑。', seeded(7));
    const b = murmurPlan('慢慢走。让眼睛先适应黑。', seeded(7));
    expect(a).toEqual(b);
  });

  it('时间线单调不减，事件类型只有 syl/static/breath', () => {
    const plan = murmurPlan('六扇门，六种深浅的黑。', seeded(3));
    let last = -1;
    for (const ev of plan) {
      expect(ev.t).toBeGreaterThanOrEqual(last);
      last = ev.t;
      expect(['syl', 'static', 'breath']).toContain(ev.type);
      expect(ev.dur).toBeGreaterThan(0);
      expect(ev.gain).toBeGreaterThan(0);
    }
  });

  it('句尾必有一次呼吸（一句话说完，先呼吸再沉默）', () => {
    for (const seed of [1, 2, 3, 4]) {
      const plan = murmurPlan('风穿过冷杉。', seeded(seed));
      expect(plan[plan.length - 1].type).toBe('breath');
    }
  });

  it('音节共振峰跟随配方元音（±16% 抖动内），永不成词', () => {
    const plan = murmurPlan('他的房间。东西可以碰。', seeded(11));
    const f1s = MURMUR.vowels.map((v) => v[0]);
    const f2s = MURMUR.vowels.map((v) => v[1]);
    for (const ev of plan) {
      if (ev.type !== 'syl') continue;
      expect(ev.f1).toBeGreaterThanOrEqual(Math.min(...f1s) * 0.9);
      expect(ev.f1).toBeLessThanOrEqual(Math.max(...f1s) * 1.1);
      expect(ev.f2).toBeGreaterThanOrEqual(Math.min(...f2s) * 0.9);
      expect(ev.f2).toBeLessThanOrEqual(Math.max(...f2s) * 1.1);
    }
  });

  it('标点造成留白：句号级停顿 ≥ 音节间隔上限', () => {
    // 无标点与带句号版本对比：带标点的总时长应显著更长
    const flat = murmurPlan('灯下只有年份和名字', seeded(5));
    const punct = murmurPlan('灯下只有。年份和名字。', seeded(5));
    const end = (p) => p[p.length - 1].t;
    expect(end(punct)).toBeGreaterThan(end(flat));
    expect(MURMUR.majorPause[0]).toBeGreaterThanOrEqual(MURMUR.sylGap[1]);
  });

  it('静电碎语只是点缀（长文本中占比 < 40%）', () => {
    const long = '一句一句一句一句一句一句一句一句一句一句一句一句一句一句一句一句';
    const plan = murmurPlan(long, seeded(9));
    const statics = plan.filter((e) => e.type === 'static').length;
    const voiced = plan.filter((e) => e.type === 'syl').length;
    expect(statics / (statics + voiced)).toBeLessThan(0.4);
  });

  it('MurmurVoice 在音频未解锁/静音时安全空转（不抛错）', () => {
    const v = new MurmurVoice({ ctx: null, muted: false });
    expect(() => v.speak('测试')).not.toThrow();
    expect(() => v.stop()).not.toThrow();
    const v2 = new MurmurVoice({ ctx: {}, muted: true });
    expect(() => v2.speak('测试')).not.toThrow();
  });
});
