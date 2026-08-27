// v1.10 P16 讲解克制全量审计——把「字幕 ≤22 字」从抽查变成全馆扫描
// 的固化门禁：七厅 + 主循环的每一条字幕字面量（含三元双分支、惊吓
// wakeUp 收尾语、脚灯 FOOT_MODES.cap）与每一条热点 hint 全部入扫。
// 展签/讲解正文（essays.js）是自愿阅读的长文，不在此口径内。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILES = ['lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio']
  .map((h) => [`halls/${h}`, readFileSync(new URL(`../src/halls/${h}.js`, import.meta.url), 'utf8')])
  .concat([['main', readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')]]);

function collectCaptions() {
  const caps = [];
  for (const [file, src] of FILES) {
    for (const line of src.split('\n')) {
      if (!line.includes('ui.caption(')) continue;
      for (const m of line.matchAll(/'([^']*)'/g)) {
        if (m[1].length) caps.push({ file, text: m[1] });
      }
    }
    // 变量形态两处的源头：惊吓收尾语与脚灯模式字幕
    for (const m of src.matchAll(/wakeUp\('([^']+)'/g)) caps.push({ file, text: m[1] });
    for (const m of src.matchAll(/cap: '([^']+)'/g)) caps.push({ file, text: m[1] });
  }
  return caps;
}

describe('v1.10 P16 字幕克制全量审计（七厅 + 主循环）', () => {
  const caps = collectCaptions();

  it('提取器在工作（全馆字幕 ≥130 条——静默失效防线）', () => {
    expect(caps.length).toBeGreaterThanOrEqual(130);
  });

  it('每一条字幕 ≤22 字（合规硬口径）', () => {
    for (const { file, text } of caps) {
      expect(text.length, `${file}:「${text}」超 22 字`).toBeLessThanOrEqual(22);
    }
  });

  it('全馆字幕零重复（一句话只说一次）', () => {
    const seen = new Map();
    for (const { file, text } of caps) {
      expect(seen.has(text), `「${text}」在 ${seen.get(text)} 与 ${file} 重复`).toBe(false);
      seen.set(text, file);
    }
  });
});

describe('v1.10 P16 热点提示克制审计', () => {
  const hints = [];
  for (const [file, src] of FILES) {
    for (const m of src.matchAll(/hint: '([^']+)'/g)) hints.push({ file, text: m[1] });
  }

  it('提取器在工作（全馆 hint ≥140 条）', () => {
    expect(hints.length).toBeGreaterThanOrEqual(140);
  });

  it('每一条 hint ≤22 字且以「E — 」开头（键位语言统一）', () => {
    for (const { file, text } of hints) {
      expect(text.length, `${file}:「${text}」超 22 字`).toBeLessThanOrEqual(22);
      expect(text.startsWith('E — '), `${file}:「${text}」未用统一键位前缀`).toBe(true);
    }
  });
});

// v1.10 P25 帮助面板键位同步审计——键位有三个入口（keydown 分发、
// HUD 底栏按钮、帮助面板行表），任何一处新增/改动而另两处漏更新都
// 属于「文档漂移」。这里把三方同步钉成断言。
describe('v1.10 P25 帮助面板键位同步审计', () => {
  const mainSrc = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const overlaySrc = readFileSync(new URL('../src/ui/overlay.js', import.meta.url), 'utf8');
  // keydown 分发的全部单字母键
  const boundKeys = [...mainSrc.matchAll(/case 'Key([A-Z])':/g)].map((m) => m[1]);
  // 帮助面板 rows 块（键位列全文）
  const rowsBlock = overlaySrc.slice(overlaySrc.indexOf('const rows = ['), overlaySrc.indexOf('];', overlaySrc.indexOf('const rows = [')));
  const rowKeys = [...rowsBlock.matchAll(/\['([^']+)'/g)].map((m) => m[1]);
  // HUD 底栏按钮的快捷键标注
  const dockKeys = [...overlaySrc.matchAll(/mkBtn\('[^']+', '([A-Z])'/g)].map((m) => m[1]);

  it('提取器在工作（keydown ≥10 键 / 帮助 ≥12 行 / 底栏 ≥8 钮）', () => {
    expect(boundKeys.length).toBeGreaterThanOrEqual(10);
    expect(rowKeys.length).toBeGreaterThanOrEqual(12);
    expect(dockKeys.length).toBeGreaterThanOrEqual(8);
  });

  it('keydown 分发的每个键都在帮助面板有一行（含 H 自身与 Esc）', () => {
    for (const k of boundKeys) {
      const documented = rowKeys.some((cell) => new RegExp(`(^|[ /])${k}([ /]|$)`).test(cell));
      expect(documented, `键 ${k} 未入帮助面板行表`).toBe(true);
    }
    expect(rowKeys.some((cell) => cell.includes('Esc')), 'Esc 未入帮助面板').toBe(true);
  });

  it('HUD 底栏每个按钮的快捷键标注都真实接在 keydown 上（无死标注）', () => {
    for (const k of dockKeys) {
      expect(boundKeys.includes(k), `底栏标注键 ${k} 在 keydown 中无分发`).toBe(true);
    }
  });
});
