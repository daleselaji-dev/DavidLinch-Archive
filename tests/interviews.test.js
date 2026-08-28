import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTERVIEWS, INTERVIEW_THEMES, interviewById } from '../src/data/interviews.js';
import { QUOTES, DOCENT } from '../src/data/essays.js';

describe('访谈摘录册（v1.13 门禁 64 / v1.14 门禁 68 / v1.15 门禁 74：扩容至 ≥28 条）', () => {
  it('条目 ≥28，id 唯一，四要素齐全（topic/zh/en/source）', () => {
    expect(INTERVIEWS.length).toBeGreaterThanOrEqual(28);
    const ids = INTERVIEWS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of INTERVIEWS) {
      expect(v.topic, `${v.id} 缺主题`).toBeTruthy();
      expect(v.zh.length, `${v.id} 中文过短`).toBeGreaterThan(4);
      expect(v.en.length, `${v.id} 英文过短`).toBeGreaterThan(10);
      expect(v.source, `${v.id} 缺出处类型`).toMatch(/访谈|著作|讲座|播报/);
    }
  });

  it('主题筛选口径（v1.15）：四主题固定，每条归且只归一个主题，每主题 ≥5 条', () => {
    expect(INTERVIEW_THEMES).toEqual(['点子', '电影', '心境', '此生']);
    for (const v of INTERVIEWS) {
      expect(INTERVIEW_THEMES.includes(v.theme), `${v.id} 主题越界: ${v.theme}`).toBe(true);
    }
    for (const t of INTERVIEW_THEMES) {
      const n = INTERVIEWS.filter((v) => v.theme === t).length;
      expect(n, `主题「${t}」条目过少`).toBeGreaterThanOrEqual(5);
    }
  });

  it('短引语合理使用尺度：英文 ≤200 字符、中文 ≤120', () => {
    for (const v of INTERVIEWS) {
      expect(v.en.length, `${v.id} 英文过长`).toBeLessThanOrEqual(200);
      expect(v.zh.length, `${v.id} 中文过长`).toBeLessThanOrEqual(120);
    }
  });

  it('策展语境 context：≤60 字、≤2 短句、事实级不解读', () => {
    for (const v of INTERVIEWS) {
      if (!v.context) continue;
      expect(v.context.length, `${v.id} 语境过长`).toBeLessThanOrEqual(60);
      const sentences = v.context.split(/[。！？]/).filter((s) => s.trim().length > 0);
      expect(sentences.length, `${v.id} 语境超过 2 短句`).toBeLessThanOrEqual(2);
    }
  });

  it('与立牌名言库（QUOTES）零重复：id 与英文原句都不重', () => {
    const quoteIds = new Set(QUOTES.map((q) => q.id));
    const quoteEns = QUOTES.map((q) => q.en.toLowerCase());
    for (const v of INTERVIEWS) {
      expect(quoteIds.has(v.id), `${v.id} 与 QUOTES id 重复`).toBe(false);
      for (const en of quoteEns) {
        expect(v.en.toLowerCase()).not.toBe(en);
      }
    }
  });

  it('叙事禁词/角色名/理论词扫描（门禁 19/13 口径沿用）', () => {
    const all = INTERVIEWS.map((v) => v.topic + v.zh + v.en + (v.context || '') + v.source).join('');
    const banned = [
      "he's the one", 'he\u2019s the one', '就是他',
      'Laura Palmer', '劳拉·帕尔默', 'Dale Cooper', '库珀探员',
      'Dorothy Vallens', 'Frank Booth', 'Diane Selwyn', 'Betty Elms',
      '拉康', '齐泽克', '精神分析', '超现实主义大师', '梦核', '鬼才导演',
      '后来他', '然后他', '接着他', '故事讲到'
    ];
    for (const w of banned) {
      expect(all, `访谈摘录含禁词: ${w}`).not.toContain(w);
    }
  });

  it('元叙述禁词扫描：不谈本馆制作方法（门禁 33 口径沿用）', () => {
    const inArt = INTERVIEWS.map((v) => v.topic + v.zh + (v.context || '')).join('');
    for (const w of ['程序化', '建模', '渲染', '多边形', '着色器', 'PS5', '引擎', '帧率', '贴图']) {
      expect(inArt, `访谈摘录谈及制作方法: ${w}`).not.toContain(w);
    }
  });

  it('interviewById 可检索', () => {
    expect(interviewById('artlife')).toBeTruthy();
    expect(interviewById('artlife').source).toContain('访谈');
    expect(interviewById('nonexistent')).toBeNull();
  });

  it('档案廊立牌引语 doughnut 有 DOCENT 导览注解（24–96 字）', () => {
    const d = DOCENT.doughnut;
    expect(d).toBeTruthy();
    expect(d.length).toBeGreaterThanOrEqual(24);
    expect(d.length).toBeLessThanOrEqual(96);
  });
});

describe('访谈摘录接线（源码级审计）', () => {
  const overlay = readFileSync(join(process.cwd(), 'src', 'ui', 'overlay.js'), 'utf-8');
  const archive = readFileSync(join(process.cwd(), 'src', 'halls', 'archive.js'), 'utf-8');

  it('overlay 提供 showInterviews 面板且引入 INTERVIEWS 数据（v1.15 起含主题常量）', () => {
    expect(overlay).toContain('showInterviews(theme = null)');
    expect(overlay).toMatch(/import \{ INTERVIEWS, INTERVIEW_THEMES \} from '\.\.\/data\/interviews\.js'/);
  });

  it('三处入口：原话墙跳转 + 年表行 + 档案廊剪报盒（E 实体交互）', () => {
    expect((overlay.match(/\.showInterviews\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(archive).toContain('访谈剪报');
    expect(archive).toContain('ui.showInterviews()');
  });

  it('剪报盒 ≥2 通道反馈（翻纸声 + 台灯池借光一拍）', () => {
    expect(archive).toMatch(/sfxAt\('page'/);
    expect(archive).toContain('clipFlash');
    expect(archive).toMatch(/lampPool\.intensity \+=/);
  });

  it('档案廊第 7 座立牌：doughnut + DOCENT 接线 + 接近驱动', () => {
    expect(archive).toMatch(/quoteStand\(quoteById\('doughnut'\)/);
    expect(archive).toMatch(/docent: DOCENT\.doughnut/);
    expect((archive.match(/quoteStandUpdater\(/g) || []).length).toBe(1);
  });

  it('面板渲染走 textContent 注入（el 助手），无 innerHTML', () => {
    const m = overlay.match(/showInterviews\(theme = null\) \{[\s\S]*?\n  \}/);
    expect(m).toBeTruthy();
    expect(m[0]).not.toContain('innerHTML');
  });

  it('主题筛选片（v1.15）：面板筛选只重排内容（D-5 文字只进面板），换筛即收声', () => {
    expect(overlay).toContain('INTERVIEW_THEMES');
    expect(overlay).toContain('iv-theme');
    // showInterviews(theme) 自重渲染 + 起手收声（换筛不留残响）
    expect(overlay).toMatch(/showInterviews\(theme = null\) \{\s*\n\s*this\._stopMurmur\(\)/);
    expect(overlay).toContain('chip.addEventListener');
  });

  it('低语朗读（v1.14）：逐条 MurmurVoice 非人声朗读 + 收声闭环，面板关闭即收声', () => {
    // 面板侧：每张卡带低语钮，经 onMurmurRead 回调走 MurmurVoice
    expect(overlay).toContain('onMurmurRead');
    expect(overlay).toContain('iv-murmur');
    expect(overlay).toContain('_stopMurmur');
    // closeInfo 收声（关面板不留残响）
    expect(overlay).toMatch(/closeInfo\(\) \{[\s\S]*?_stopMurmur\(\)[\s\S]*?\n  \}/);
    // 接线侧：main.js 把回调接到 narration.murmur（清晰人声不回来——
    // 朗读走非人声低语，null 即 stop）
    const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf-8');
    expect(main).toMatch(/onMurmurRead: \(text\) => \(text \? narration\.murmur\.speak\(text\) : narration\.murmur\.stop\(\)\)/);
  });
});
