import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NARRATION_MODES } from '../src/ui/narration.js';
import * as ESSAY_MODULE from '../src/data/essays.js';
import { NARRATIONS, QUOTES, LEGAL, ABOUT_RENDER, quoteById } from '../src/data/essays.js';

const HALL_KEYS = ['lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio'];

describe('旁白模式体系', () => {
  it('提供 字母显现 / 爵士+字母 / 语音+字母 / 关 四种模式', () => {
    const ids = NARRATION_MODES.map((m) => m.id);
    expect(ids).toEqual(['letters', 'jazz', 'voice', 'off']);
  });

  it('默认第一档是字母显现（旧式干读不再是唯一默认）', () => {
    expect(NARRATION_MODES[0].id).toBe('letters');
    expect(NARRATION_MODES[0].desc).toContain('字母');
  });
});

describe('留白预算：旁白宁少勿滥（v1.2 门禁）', () => {
  it('每个展厅仅一句旁白稿，且不超过 24 个字符', () => {
    for (const key of ['welcome', ...HALL_KEYS]) {
      expect(NARRATIONS[key], `缺少旁白: ${key}`).toBeTruthy();
      const text = NARRATIONS[key].text;
      expect(text.length, `旁白过长: ${key} → ${text}`).toBeLessThanOrEqual(24);
      expect(text.length).toBeGreaterThanOrEqual(4);
      // 单句：至多一个句号，禁止长篇多句说教
      const sentences = text.split(/[。！？]/).filter((s) => s.trim().length > 0);
      expect(sentences.length, `旁白多于两短句: ${key}`).toBeLessThanOrEqual(2);
    }
  });

  it('全馆旁白总字数 ≤ 160（v1.1 曾数倍于此）', () => {
    const total = Object.values(NARRATIONS).reduce((n, v) => n + v.text.length, 0);
    expect(total).toBeLessThanOrEqual(160);
  });

  it('旁白不含说教/总结腔词汇', () => {
    const banned = ['告诉我们', '正如', '象征着', '代表着', '意味着我们', '这提醒'];
    for (const [key, n] of Object.entries(NARRATIONS)) {
      for (const w of banned) {
        expect(n.text, `旁白说教词: ${key} → ${w}`).not.toContain(w);
      }
    }
  });
});

describe('文案哲学：只用林奇自己的话，二手解读退场', () => {
  it('引语库 ≥10 条，每条含中英文与出处类型', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(10);
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

  it('策展文章体系已移除（不再导出 ESSAYS，原话摘录墙是唯一「解读」）', () => {
    expect(ESSAY_MODULE.ESSAYS).toBeUndefined();
  });

  it('全部文案不含空标签与理论名词堆砌', () => {
    const all = [
      ...QUOTES.map((q) => q.zh + q.en),
      ...Object.values(NARRATIONS).map((n) => n.text),
      LEGAL.title + LEGAL.badge + LEGAL.paras.join(''),
      ABOUT_RENDER.title + ABOUT_RENDER.paras.join('')
    ].join('');
    for (const label of ['超现实主义大师', '梦核', '邪典之王', '鬼才导演', '拉康', '齐泽克', '精神分析']) {
      expect(all, `文案中出现标签/理论词: ${label}`).not.toContain(label);
    }
  });
});

describe('展签预算：源码级审计（v1.2 门禁）', () => {
  const hallsDir = join(process.cwd(), 'src', 'halls');
  const hallFiles = readdirSync(hallsDir).filter((f) => f.endsWith('.js') && f !== 'kit.js');

  it('每厅可见文字展签（quotePlaque）≤ 2', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      const count = (src.match(/quotePlaque\(/g) || []).length;
      expect(count, `${f} 展签过多: ${count}`).toBeLessThanOrEqual(2);
    }
  });

  it('说明立牌（standPlaque）已全馆退场', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      expect(src, `${f} 仍在使用 standPlaque`).not.toContain('standPlaque');
    }
  });

  it('厅内字幕（ui.caption 字面量）均为短句（≤ 26 字符）', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      for (const line of src.split('\n')) {
        if (!line.includes('ui.caption(')) continue;
        const literals = line.match(/'([^']*)'/g) || [];
        for (const lit of literals) {
          const text = lit.slice(1, -1);
          expect(text.length, `${f} 字幕过长: ${text}`).toBeLessThanOrEqual(26);
        }
      }
    }
  });
});
