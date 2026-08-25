import { describe, it, expect } from 'vitest';
import { NARRATION_MODES } from '../src/ui/narration.js';
import { NARRATIONS, QUOTES, ESSAYS, quoteById } from '../src/data/essays.js';

describe('旁白模式体系', () => {
  it('提供 字母显现 / 爵士+字母 / 语音+字母 / 关 四种模式', () => {
    const ids = NARRATION_MODES.map((m) => m.id);
    expect(ids).toEqual(['letters', 'jazz', 'voice', 'off']);
  });

  it('默认第一档是字母显现（旧式干读不再是唯一默认）', () => {
    expect(NARRATION_MODES[0].id).toBe('letters');
    expect(NARRATION_MODES[0].desc).toContain('字母');
  });

  it('每个展厅都有旁白稿（含新厅 studio）', () => {
    for (const key of ['welcome', 'lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio']) {
      expect(NARRATIONS[key], `缺少旁白: ${key}`).toBeTruthy();
      expect(NARRATIONS[key].text.length).toBeGreaterThan(10);
    }
  });
});

describe('文案哲学：林奇原话优先，二手标签退场', () => {
  it('引语库 ≥8 条，每条含中英文与出处类型', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(8);
    for (const q of QUOTES) {
      expect(q.zh.length).toBeGreaterThan(4);
      expect(q.en.length).toBeGreaterThan(10);
      expect(q.source).toMatch(/访谈|著作/);
    }
  });

  it('引语均为短引语（合理使用尺度：单条 ≤200 字符）', () => {
    for (const q of QUOTES) {
      expect(q.en.length, `${q.id} 英文过长`).toBeLessThanOrEqual(200);
      expect(q.zh.length, `${q.id} 中文过长`).toBeLessThanOrEqual(120);
    }
  });

  it('quoteById 可检索', () => {
    expect(quoteById('bigfish')).toBeTruthy();
    expect(quoteById('coffee').source).toContain('著作');
    expect(quoteById('nonexistent')).toBeNull();
  });

  it('策展文章不再堆砌二手空标签', () => {
    const all = Object.values(ESSAYS).map((e) => e.title + e.paras.join('')).join('');
    for (const label of ['超现实主义大师', '梦核', '邪典之王', '鬼才导演']) {
      expect(all, `文案中出现空标签: ${label}`).not.toContain(label);
    }
  });

  it('关键文章以林奇原话为骨架（含引号引语与出处标注）', () => {
    const quoted = Object.values(ESSAYS).filter((e) =>
      e.paras.some((p) => p.includes('「') && (p.includes('访谈') || p.includes('Catching the Big Fish'))));
    expect(quoted.length).toBeGreaterThanOrEqual(4);
  });

  it('理论框架（拉康/齐泽克）出现但克制（各 ≤2 处提及）', () => {
    const all = Object.values(ESSAYS).map((e) => e.paras.join('')).join('');
    const lacan = (all.match(/拉康/g) || []).length;
    const zizek = (all.match(/齐泽克/g) || []).length;
    expect(lacan).toBeGreaterThanOrEqual(1);
    expect(lacan).toBeLessThanOrEqual(2);
    expect(zizek).toBeGreaterThanOrEqual(1);
    expect(zizek).toBeLessThanOrEqual(2);
  });

  it('新厅文章《一个人的房间》存在', () => {
    expect(ESSAYS.world).toBeTruthy();
    expect(ESSAYS.world.paras.join('')).toContain('冥想');
  });
});
