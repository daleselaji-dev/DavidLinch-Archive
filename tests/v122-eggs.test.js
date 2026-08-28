import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { INTERVIEWS, INTERVIEW_THEMES, interviewById } from '../src/data/interviews.js';
import { QUOTES } from '../src/data/essays.js';

// ============================================================
// v1.22 门禁 100：新 Goal 第 1 轮（拐角惊吓换代 + 魅影回炉 + 内容封顶）
// 口径（对齐本轮用户三诉求）：
//   · 拐角惊吓的几何/时序守卫在 cornerscare.test.js（47 用例），
//     此处不重钉——本文件钉的是**内容与资产账**；
//   · corner_wraith 第二轮回炉：眼组参数一字不动（用户口径
//     「眼睛很好」），GLB ≤300KB、对象名/wraithPivot 契约不破
//     （落厅零改动：仅换网格保留程序化动画）；
//   · 访谈册 38 → 40 封顶收官（四主题 10/10/10/10 齐平；此后
//     新增永久关闸，只做质量替换）；
//   · 刮痕墙错拍变奏彩蛋：零网格、零新热点——交互普查 195 与
//     mulholland mesh 预算一格不动。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  mull: read('src/halls/mulholland.js'),
  gen: read('scripts/blender/gen_corner_wraith.py')
};

describe('v1.22 门禁 100：访谈册封顶收官（38 → 40，四主题齐平）', () => {
  it('条数恰 40 封顶，四主题 10/10/10/10 齐平', () => {
    expect(INTERVIEWS.length).toBe(40);
    const dist = INTERVIEW_THEMES.map(
      (t) => INTERVIEWS.filter((v) => v.theme === t).length);
    expect(dist).toEqual([10, 10, 10, 10]);
  });

  it('新入册两条：lightbulbs（心境）/ bigboy（此生·趣闻向）——四要素齐备', () => {
    const lb = interviewById('lightbulbs');
    expect(lb).toBeTruthy();
    expect(lb.theme).toBe('心境');
    expect(lb.en).toContain('lightbulbs');
    expect(lb.source).toContain('著作');
    const bb = interviewById('bigboy');
    expect(bb).toBeTruthy();
    expect(bb.theme).toBe('此生');
    expect(bb.en).toContain('chocolate shake');
    expect(bb.source).toContain('访谈');
  });

  it('防撞第六轮：新两条与 QUOTES 立牌语录 id / 英文原句零重复', () => {
    const quoteIds = new Set(QUOTES.map((q) => q.id));
    const quoteEns = QUOTES.map((q) => q.en.toLowerCase());
    for (const id of ['lightbulbs', 'bigboy']) {
      expect(quoteIds.has(id)).toBe(false);
      const v = interviewById(id);
      for (const en of quoteEns) {
        expect(v.en.toLowerCase()).not.toBe(en);
      }
    }
  });

  it('封顶语义入册：数据文件头部留有「封顶收官 / 只做质量替换」的口径账', () => {
    const src = read('src/data/interviews.js');
    expect(src).toContain('封顶收官');
    expect(src).toMatch(/只做质量替换/);
  });
});

describe('v1.22 门禁 100：刮痕墙错拍变奏彩蛋（零网格零新热点）', () => {
  it('scare.seen 标记接线：声明带 seen、doCornerScare 置位', () => {
    expect(SRC.mull).toMatch(/const scare = \{ phase: 0, sub: null, t: 0, seen: false/);
    expect(SRC.mull).toContain('scare.seen = true');
  });

  it('变奏分支：见过它之后刮擦不来（缺席），只剩一记轻心跳与停更的字幕', () => {
    const seg = SRC.mull.slice(
      SRC.mull.indexOf("hint: 'E — 墙角的刮痕'"),
      SRC.mull.indexOf('拐角后的地面拖痕'));
    expect(seg).toContain('if (scare.seen)');
    expect(seg).toContain('刮痕停在了那一夜。');
    // 变奏分支 return 在 scrape 之前——预期中的那声刮擦不来
    expect(seg.indexOf('return')).toBeLessThan(seg.indexOf("sfxAt('scrape'"));
    // 首访原文案仍在（错拍要有「原拍」才成立）
    expect(seg).toContain('刮痕比你高，还在变多。');
  });
});

describe('v1.22 门禁 100：corner_wraith 第二轮回炉（资产与契约账）', () => {
  it('GLB ≤300KB 体积纪律', () => {
    const size = statSync(new URL('../src/assets/corner_wraith.glb', import.meta.url)).size;
    expect(size).toBeLessThanOrEqual(300 * 1024);
  });

  it('眼组参数一字不动（用户口径「眼睛很好」）：环径/环管/亮度/竖长原值在源', () => {
    expect(SRC.gen).toContain('major_radius=0.012 * H, minor_radius=0.0035 * H');
    expect(SRC.gen).toContain('emission_strength=0.9');
    expect(SRC.gen).toContain("ring.scale = (1, 1, 1.3)");
  });

  it('落厅契约不破：枢轴挂名（wraithPivot/hairVeil/arm_L/arm_R）生成侧与落厅侧同名', () => {
    for (const name of ['wraithPivot', 'hairVeil', 'hairStrands', 'faceVoidMesh',
      'eyeRing_', 'eyeVoid_']) {
      expect(SRC.gen, `生成脚本缺 ${name}`).toContain(name);
      expect(SRC.mull, `落厅侧缺 ${name}`).toContain(name);
    }
    // 臂名生成侧是模板串（arm_{"L"...}），落厅侧是字面量
    expect(SRC.gen).toContain('arm_{');
    expect(SRC.mull).toContain("getObjectByName('arm_L')");
    expect(SRC.mull).toContain("getObjectByName('arm_R')");
  });

  it('回炉五拍账在源：佝偻场颈上淡出 / 帘幕不对称合拢 / 前垂发绺 / 披领后折', () => {
    expect(SRC.gen).toContain('u>0.80 线性归零');
    expect(SRC.gen).toContain('不对称合拢');
    expect(SRC.gen).toContain('前垂发绺 ×4');
    expect(SRC.gen).toContain('前侧领口向后');
  });

  it('版本口径一致：package.json 与 __SV__.version 都是 1.22.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('1.22.0');
    expect(read('src/main.js')).toContain("version: '1.22.0'");
  });
});
