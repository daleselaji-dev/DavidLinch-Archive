import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NARRATION_MODES } from '../src/ui/narration.js';
import * as ESSAY_MODULE from '../src/data/essays.js';
import { NARRATIONS, DOCENT, QUOTES, LEGAL, quoteById } from '../src/data/essays.js';

const HALL_KEYS = ['lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio'];

describe('旁白模式体系（v1.5：清晰 TTS 退场）', () => {
  it('提供 字母显现 / 低语+字母 / 爵士+字母 / 关 四种模式', () => {
    const ids = NARRATION_MODES.map((m) => m.id);
    expect(ids).toEqual(['letters', 'murmur', 'jazz', 'off']);
  });

  it('默认第一档是字母显现', () => {
    expect(NARRATION_MODES[0].id).toBe('letters');
    expect(NARRATION_MODES[0].desc).toContain('字母');
  });

  it('门禁 32：真人朗读（Web Speech TTS）已从全部源码退场', () => {
    const srcDirs = ['ui', 'audio', 'data', 'halls', 'core'].map((d) => join(process.cwd(), 'src', d));
    for (const dir of srcDirs) {
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
        const text = readFileSync(join(dir, f), 'utf-8');
        expect(text, `${f} 仍引用 speechSynthesis`).not.toContain('speechSynthesis');
        expect(text, `${f} 仍引用 SpeechSynthesisUtterance`).not.toContain('SpeechSynthesisUtterance');
      }
    }
    const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf-8');
    expect(main).not.toContain('speechSynthesis');
  });
});

describe('讲解员导览（v1.7 门禁 41：旁白从氛围句改为信息型导览）', () => {
  it('导览全馆 ≤8 段（welcome + 7 厅），无多余条目', () => {
    expect(Object.keys(NARRATIONS).length).toBeLessThanOrEqual(8);
  });

  it('每厅一段导览：24–96 字、至多 3 短句（有信息量但不啰嗦）', () => {
    for (const key of ['welcome', ...HALL_KEYS]) {
      expect(NARRATIONS[key], `缺少导览: ${key}`).toBeTruthy();
      const text = NARRATIONS[key].text;
      expect(text.length, `导览过短（回到了空洞氛围句量级）: ${key} → ${text}`).toBeGreaterThanOrEqual(24);
      expect(text.length, `导览过长: ${key} → ${text}`).toBeLessThanOrEqual(96);
      const sentences = text.split(/[。！？]/).filter((s) => s.trim().length > 0);
      expect(sentences.length, `导览超过 3 短句: ${key}`).toBeLessThanOrEqual(3);
    }
  });

  it('全馆导览总字数 ≤ 620（讲解员不是讲座）', () => {
    const total = Object.values(NARRATIONS).reduce((n, v) => n + v.text.length, 0);
    expect(total).toBeLessThanOrEqual(620);
  });

  it('影片厅导览含事实锚点（公开事实/访谈来源/年份——不是氛围形容）', () => {
    const anchor = /访谈|自述|公开|同创|档案|片场|\d/;
    for (const key of ['lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio']) {
      expect(NARRATIONS[key].text, `导览缺事实锚点: ${key}`).toMatch(anchor);
    }
  });

  it('空洞氛围句已退场（不再用「适应黑」「风穿过」类措辞）', () => {
    for (const [key, n] of Object.entries(NARRATIONS)) {
      for (const w of ['适应黑', '深浅的黑', '风穿过', '在呼吸', '只在夜里成立']) {
        expect(n.text, `导览仍是氛围句: ${key} → ${w}`).not.toContain(w);
      }
    }
  });

  it('导览不含说教/总结腔词汇', () => {
    const banned = ['告诉我们', '正如', '象征着', '代表着', '意味着我们', '这提醒'];
    for (const [key, n] of Object.entries(NARRATIONS)) {
      for (const w of banned) {
        expect(n.text, `导览说教词: ${key} → ${w}`).not.toContain(w);
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
      ...Object.values(DOCENT),
      LEGAL.title + LEGAL.badge + LEGAL.paras.join('')
    ].join('');
    for (const label of ['超现实主义大师', '梦核', '邪典之王', '鬼才导演', '拉康', '齐泽克', '精神分析']) {
      expect(all, `文案中出现标签/理论词: ${label}`).not.toContain(label);
    }
  });

  it('「关于画质」类元叙述页已移除（不再导出 ABOUT_RENDER）', () => {
    expect(ESSAY_MODULE.ABOUT_RENDER).toBeUndefined();
  });
});

describe('立牌与导览层分工（v1.7 门禁 41：立牌只留名言）', () => {
  // 各厅立牌实际引用的引语——背景语境必须在 DOCENT 导览层，不进弹层
  // v1.13：档案廊补上第 7 座立牌（doughnut）——七厅每厅恰 1 座
  const USED = ['meaning', 'sense', 'home', 'you', 'philly', 'darkness', 'doughnut'];

  it.each(USED)('厅内引语 %s 有对应导览注解（24–96 字、≤3 短句）', (id) => {
    const d = DOCENT[id];
    expect(d, `${id} 缺导览注解`).toBeTruthy();
    expect(d.length, `${id} 注解过短`).toBeGreaterThanOrEqual(24);
    expect(d.length, `${id} 注解过长`).toBeLessThanOrEqual(96);
    const sentences = d.split(/[。！？]/).filter((x) => x.trim().length > 0);
    expect(sentences.length, `${id} 注解超过 3 短句`).toBeLessThanOrEqual(3);
  });

  it('引语数据不再携带 note/aside（背景一律走导览层，不塞立牌弹层）', () => {
    for (const q of QUOTES) {
      expect(q.note, `${q.id} 仍带 note`).toBeUndefined();
      expect(q.aside, `${q.id} 仍带 aside`).toBeUndefined();
    }
  });

  it('立牌浮卡渲染只有 名言/英文/出处 三行（源码级审计）', () => {
    const overlay = readFileSync(join(process.cwd(), 'src', 'ui', 'overlay.js'), 'utf-8');
    const m = overlay.match(/showPlaque\(q\) \{[\s\S]*?\n  \}/);
    expect(m, 'showPlaque 不存在').toBeTruthy();
    expect(m[0]).not.toContain('pc-note');
    expect(m[0]).not.toContain('pc-aside');
  });

  it('每座立牌接近驱动都接了导览层（narration + docent）', () => {
    const hallsDir = join(process.cwd(), 'src', 'halls');
    for (const f of readdirSync(hallsDir).filter((x) => x.endsWith('.js') && x !== 'kit.js' && x !== 'props.js')) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      const stands = (src.match(/quoteStandUpdater\(/g) || []).length;
      if (!stands) continue;
      const wired = (src.match(/docent: DOCENT\./g) || []).length;
      expect(wired, `${f} 立牌未接导览层`).toBe(stands);
    }
  });

  it('门禁 33：作品内文案不谈本馆制作方法（禁元叙述扫描）', () => {
    // 展陈文案 = 引语 + 导览 + 注解（合规页的必要事实陈述除外）。
    // 注意：影片本身的公开拍摄史属于讲解内容，不在此列。
    const inArt = [
      ...QUOTES.map((q) => q.zh),
      ...Object.values(NARRATIONS).map((n) => n.text),
      ...Object.values(DOCENT)
    ].join('');
    for (const w of ['程序化', '建模', '渲染', '多边形', '着色器', 'PS5', '引擎', '帧率', '贴图']) {
      expect(inArt, `展陈文案谈及制作方法: ${w}`).not.toContain(w);
    }
  });
});

describe('展签预算：源码级审计（v1.3 收紧）', () => {
  const hallsDir = join(process.cwd(), 'src', 'halls');
  const hallFiles = readdirSync(hallsDir).filter((f) => f.endsWith('.js') && f !== 'kit.js');

  it('每厅引语立牌（quoteStand）≤ 1', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      const count = (src.match(/quoteStand\(/g) || []).length;
      expect(count, `${f} 立牌过多: ${count}`).toBeLessThanOrEqual(1);
    }
  });

  it('墙挂式大字展签（quotePlaque）与说明立牌（standPlaque）已全馆退场', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      expect(src, `${f} 仍在使用 quotePlaque`).not.toContain('quotePlaque');
      expect(src, `${f} 仍在使用 standPlaque`).not.toContain('standPlaque');
    }
  });

  it('每座立牌都接了接近驱动器（走近才显影，不是常亮）', () => {
    for (const f of hallFiles) {
      const src = readFileSync(join(hallsDir, f), 'utf-8');
      const stands = (src.match(/quoteStand\(/g) || []).length;
      const updaters = (src.match(/quoteStandUpdater\(/g) || []).length;
      expect(updaters, `${f} 立牌缺接近驱动`).toBe(stands);
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
