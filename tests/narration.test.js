import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NARRATION_MODES } from '../src/ui/narration.js';
import * as ESSAY_MODULE from '../src/data/essays.js';
import {
  NARRATIONS, DOCENT, ITEM_NOTES, HALL_QUOTES,
  QUOTES, LEGAL, ABOUT_RENDER, quoteById
} from '../src/data/essays.js';

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

describe('留白预算：旁白宁少勿滥（v1.3 收紧至 v1.0 克制量级）', () => {
  it('旁白全馆 ≤8 条（welcome + 7 厅），无多余条目', () => {
    expect(Object.keys(NARRATIONS).length).toBeLessThanOrEqual(8);
  });

  it('每个展厅仅一句旁白稿，且不超过 16 个字符', () => {
    for (const key of ['welcome', ...HALL_KEYS]) {
      expect(NARRATIONS[key], `缺少旁白: ${key}`).toBeTruthy();
      const text = NARRATIONS[key].text;
      expect(text.length, `旁白过长: ${key} → ${text}`).toBeLessThanOrEqual(16);
      expect(text.length).toBeGreaterThanOrEqual(4);
      // 单句：至多一个句号，禁止长篇多句说教
      const sentences = text.split(/[。！？]/).filter((s) => s.trim().length > 0);
      expect(sentences.length, `旁白多于两短句: ${key}`).toBeLessThanOrEqual(2);
    }
  });

  it('全馆旁白总字数 ≤ 110（v1.0 克制量级）', () => {
    const total = Object.values(NARRATIONS).reduce((n, v) => n + v.text.length, 0);
    expect(total).toBeLessThanOrEqual(110);
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

describe('v1.6 三层讲解体系：博物馆讲解 + 物品旁白 + 名言轮播', () => {
  const HALLS = HALL_KEYS;

  it('每厅一段馆方讲解（DOCENT），每段 ≤34 字、≤2 句，仅公开事实', () => {
    for (const key of HALLS) {
      expect(DOCENT[key], `缺馆方讲解: ${key}`).toBeTruthy();
      const text = DOCENT[key].text;
      expect(text.length, `讲解过长: ${key} → ${text}`).toBeLessThanOrEqual(34);
      expect(text.length).toBeGreaterThanOrEqual(10);
      const sentences = text.split(/[。！？]/).filter((s) => s.trim().length > 0);
      expect(sentences.length, `讲解多于两句: ${key}`).toBeLessThanOrEqual(2);
    }
    expect(Object.keys(DOCENT).length).toBeLessThanOrEqual(8);
  });

  it('物品旁白（ITEM_NOTES）：每件 ≤26 字，全馆 ≥12 件，key 归属七厅', () => {
    const keys = Object.keys(ITEM_NOTES);
    expect(keys.length).toBeGreaterThanOrEqual(12);
    for (const key of keys) {
      const hall = key.split('-')[0];
      expect(HALLS, `物品 key 不归属任何厅: ${key}`).toContain(hall);
      const text = ITEM_NOTES[key].text;
      expect(text.length, `物品旁白过长: ${key} → ${text}`).toBeLessThanOrEqual(26);
      expect(text.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('名言轮播（HALL_QUOTES）：每厅 ≥2 条且全部可在 QUOTES 检索到', () => {
    for (const key of HALLS) {
      const pool = HALL_QUOTES[key];
      expect(pool, `缺名言轮播: ${key}`).toBeTruthy();
      expect(pool.length).toBeGreaterThanOrEqual(2);
      for (const id of pool) {
        expect(quoteById(id), `名言 id 无效: ${key} → ${id}`).toBeTruthy();
      }
    }
  });

  it('全部讲解层禁元叙事（操作说明/打破第四面墙的表述零出现）', () => {
    const banned = ['可以碰', '都可以', '点击', '按 E', '按E', '鼠标', '键盘', '试试看', '不妨'];
    const all = [
      ...Object.entries(NARRATIONS).map(([k, v]) => [`NARRATIONS.${k}`, v.text]),
      ...Object.entries(DOCENT).map(([k, v]) => [`DOCENT.${k}`, v.text]),
      ...Object.entries(ITEM_NOTES).map(([k, v]) => [`ITEM_NOTES.${k}`, v.text])
    ];
    for (const [where, text] of all) {
      for (const w of banned) {
        expect(text, `元叙事表述: ${where} → ${w}`).not.toContain(w);
      }
    }
  });

  it('讲解层不复述剧情：无叙事连接词，不引用对白', () => {
    const banned = ['后来', '然后', '接着', '最后他', '剧情', '讲述了', '故事里'];
    const all = [...Object.values(DOCENT), ...Object.values(ITEM_NOTES)].map((v) => v.text);
    for (const text of all) {
      for (const w of banned) {
        expect(text, `讲解疑似叙事: ${text} → ${w}`).not.toContain(w);
      }
    }
  });

  it('主编排接线：首访两段式（风格线 → 馆方讲解）+ 驻留名言轮播 + 换厅清定时器', () => {
    const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf-8');
    expect(main).toContain('narration.speakKey(key)');
    expect(main).toContain('narration.speakDocent(id)');
    expect(main).toContain('narration.speakQuote(q)');
    expect(main).toMatch(/for \(const t of hallTimers\) clearTimeout\(t\)/);
  });

  it('物品旁白接线：七厅合计 ≥12 处 speakItem，且 key 均存在于 ITEM_NOTES', () => {
    const hallsDir = join(process.cwd(), 'src', 'halls');
    const src = readdirSync(hallsDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(join(hallsDir, f), 'utf-8'))
      .join('\n');
    const used = [...src.matchAll(/speakItem\('([^']+)'\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThanOrEqual(12);
    for (const key of used) {
      expect(ITEM_NOTES[key], `speakItem 引用不存在的 key: ${key}`).toBeTruthy();
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

describe('展签预算：源码级审计（v1.3 收紧）', () => {
  const hallsDir = join(process.cwd(), 'src', 'halls');
  const hallFiles = readdirSync(hallsDir).filter((f) => f.endsWith('.js') && f !== 'kit.js');

  it('每厅林奇原话展签（quotePlaque）≤ 1', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      const count = (src.match(/quotePlaque\(/g) || []).length;
      expect(count, `${f} 展签过多: ${count}`).toBeLessThanOrEqual(1);
    }
  });

  it('说明立牌（standPlaque）已全馆退场', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      expect(src, `${f} 仍在使用 standPlaque`).not.toContain('standPlaque');
    }
  });

  it('厅内字幕（ui.caption 字面量）均为短句（≤ 22 字符）', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      for (const line of src.split('\n')) {
        if (!line.includes('ui.caption(')) continue;
        const literals = line.match(/'([^']*)'/g) || [];
        for (const lit of literals) {
          const text = lit.slice(1, -1);
          expect(text.length, `${f} 字幕过长: ${text}`).toBeLessThanOrEqual(22);
        }
      }
    }
  });
});

describe('零原作叙事剧透（v1.3 门禁 19）', () => {
  const srcDirs = ['halls', 'data', 'ui'].map((d) => join(process.cwd(), 'src', d));
  const allSources = srcDirs.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf-8') }))
  );

  it('源码不含原作对白引用与角色名（叙事禁词扫描）', () => {
    const banned = [
      // 原作对白（直译/原文）
      'he\u2019s the one', "he's the one", '就是他', '就 是 他',
      // 场景/角色专名（避免剧情还原式指涉）
      'winkies', 'WINKIES', 'Winkies',
      'Laura Palmer', '劳拉·帕尔默', 'Dale Cooper', '库珀探员',
      'Dorothy Vallens', '多萝西·瓦伦斯', 'Frank Booth', '弗兰克·布斯',
      'Diane Selwyn', '戴安·塞尔温', 'Betty Elms', 'Rita'
    ];
    for (const { file, text } of allSources) {
      for (const w of banned) {
        expect(text, `${file} 含叙事禁词: ${w}`).not.toContain(w);
      }
    }
  });

  it('文案不用叙事还原连接词（后来他/然后他/接着他）', () => {
    for (const { file, text } of allSources) {
      for (const w of ['后来他', '然后他', '接着他', '故事讲到']) {
        expect(text, `${file} 含叙事连接词: ${w}`).not.toContain(w);
      }
    }
  });
});
