import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SCARE_BEATS, VACUUM, WAKE_DAZE, APPROACH_DREAD, CLOSEUP, STARE_TILT, RIM_BEATS
} from '../src/halls/mulholland.js';

// ============================================================
// v1.24 门禁 102：新 Goal 第 3 轮（音频层 + wake 错位感）
// 口径（对齐 GOAL_HANDOFF 第 3 轮优先项）：
//   · 机制/几何/拍长**零改动**——显形线、贝塞尔、SCARE_BEATS、
//     CLOSEUP、STARE_TILT、RIM_BEATS 原值复钉在本文件（±0ms）；
//     本轮全部改动落在**音频层**与 **wake 身体面**：
//     - 病灶修复：惊吓自己的声此前挂 master、被自己的 duck 抽真空
//       压到 6%——引擎立**直通总线**（punch，绕 duck 不绕压缩器）；
//     - 真空罩拍长重钉（VACUUM）：罩过黑幕罩过醒来那一瞬，环境音
//       比睁眼慢一步归还；
//     - 音色塑形不加嗓子（98 刹车）：scare 低频加权/双翼去相关、
//       scrape 与四次方滑出对时、thud 力度分层（惊吓级才醒深层）；
//     - 接近段持续低压层 setDread（dreadswell 27Hz 嗓子的持续态，
//       非新 case）；
//     - wake 错位感（WAKE_DAZE）：俯冲醒 + 字幕迟到，只给拐角惊吓
//       （转身惊吓保持平视即醒——两重 wake 从此不只字幕不同）。
//   · 变奏彩蛋第三例·时序反转语法（路灯杆）：答在问前——零字幕
//     零网格零新热点，v1.16 贴顶纪律原封，195 交互持平。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  mull: read('src/halls/mulholland.js'),
  engine: read('src/audio/engine.js'),
  cjs: read('electron/main.cjs')
};

describe('v1.24 门禁 102：惊吓直通总线（duck 病灶修复——真空抽走世界，不抽走它）', () => {
  it('引擎侧：punch 总线绕过 master 直连压缩器，静音闸同样闸死', () => {
    expect(SRC.engine).toContain('this.punch = this.ctx.createGain();');
    expect(SRC.engine).toContain('this.punch.connect(comp);');
    expect(SRC.engine).toContain('sfx(name, vol = 1, pan = 0, punch = false)');
    expect(SRC.engine).toContain('sfxAt(name, x, z, vol = 1, ref = 3, punch = false)');
    expect(SRC.engine).toContain('this.sfx(name, vol * att, pan, punch);');
    // 静音时直通总线一并压零（不吃 duck ≠ 不吃静音）
    expect(SRC.engine).toMatch(/this\.punch\.gain\.linearRampToValueAtTime\(m \? 0 : 0\.9/);
  });

  it('拐角惊吓十一处「它的声」全走直通：升压/刮擦/落定/三口心跳/主体/呼吸/闷击/低语', () => {
    for (const line of [
      "audio.sfx('dreadswell', 0.75, 0, true)",
      "audio.sfxAt('scrape', CORNER_EDGE.x, CORNER_EDGE.z, 0.9, 5, true)",
      "audio.sfxAt('thud', CORNER_EDGE.x, CORNER_EDGE.z, 0.42, 4, true)",
      "audio.sfx('heartbeat', 0.5, 0, true)",
      "audio.sfx('heartbeat', 0.62, 0, true)",
      "audio.sfx('heartbeat', 0.72, 0, true)",
      "audio.sfx('scare', 1, 0, true)",
      "audio.sfx('breath', 0.85, 0, true)",
      "audio.sfx('thud', 1.0, 0, true)",
      "audio.sfx('whisper', 0.7, 0, true)"
    ]) {
      expect(SRC.mull, `直通缺席: ${line}`).toContain(line);
    }
    // 转身惊吓同口径（scare/breath/thud 各第二处）
    expect((SRC.mull.match(/audio\.sfx\('scare', 1, 0, true\)/g) || []).length).toBe(2);
    expect((SRC.mull.match(/audio\.sfx\('thud', 1\.0, 0, true\)/g) || []).length).toBe(2);
  });

  it('世界侧的声不走直通（该被抽走的照旧被抽走）：灯灭/接近段心跳/半程升压', () => {
    expect(SRC.mull).toContain("audio.sfx('lampoff', 0.4);");
    expect(SRC.mull).toContain("audio.sfx('heartbeat', 0.16 + 0.3 * q);");
    expect(SRC.mull).toContain("audio.sfx('dreadswell', 0.3);");
  });
});

describe('v1.24 门禁 102：真空罩拍长 VACUUM（万籁俱寂要罩满黑幕）', () => {
  it('拐角账：0.045 进坑 + hold = wake + 0.3——罩过黑幕、罩过醒来那一瞬', () => {
    expect(0.045 + VACUUM.hold).toBeCloseTo(SCARE_BEATS.wake / 1000 + 0.3, 6);
    expect(0.045 + VACUUM.hold).toBeGreaterThan(SCARE_BEATS.blackout / 1000);
    expect(VACUUM.floor).toBeLessThanOrEqual(0.06);
  });

  it('转身账同构：0.045 + turnHold = 转身 wake 1.75 + 0.3（各按各的拍长裁）', () => {
    expect(0.045 + VACUUM.turnHold).toBeCloseTo(1.75 + 0.3, 6);
    expect(VACUUM.turnHold).toBeLessThan(VACUUM.hold); // 快拍的真空也短
  });

  it('归还是一口气不是一瞬：release ∈ [1, 2.5]，且全程收在字幕窗内', () => {
    for (const r of [VACUUM.release, VACUUM.turnRelease]) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(2.5);
    }
    // 拐角：世界还满 = 0.045+hold+release ≈ 5.2s < 醒后字幕收尾（1.15+5.2s）
    expect(0.045 + VACUUM.hold + VACUUM.release)
      .toBeLessThan(SCARE_BEATS.wake / 1000 + WAKE_DAZE.captionMs / 1000 + 5.2);
  });

  it('接线：两重惊吓的 duck 都换 VACUUM 常数（1.3s 旧罩退役）', () => {
    expect(SRC.mull).toContain('audio.duck(VACUUM.hold, VACUUM.floor, VACUUM.release)');
    expect(SRC.mull).toContain('audio.duck(VACUUM.turnHold, VACUUM.turnFloor, VACUUM.turnRelease)');
    expect(SRC.mull).not.toContain('audio.duck(1.3');
  });
});

describe('v1.24 门禁 102：wake 错位感 WAKE_DAZE（空间错位长进身体里）', () => {
  it('参数边界：俯冲角在 [-0.6,-0.15]（看得见脚边、抬得起头）、字幕迟到 0.6–2.2s', () => {
    expect(WAKE_DAZE.pitch).toBeLessThanOrEqual(-0.15);
    expect(WAKE_DAZE.pitch).toBeGreaterThanOrEqual(-0.6);
    expect(WAKE_DAZE.captionMs).toBeGreaterThanOrEqual(600);
    expect(WAKE_DAZE.captionMs).toBeLessThanOrEqual(2200);
  });

  it('压俯仰写在 teleport 之后（teleport 清俯仰——顺序反了就白压）', () => {
    const seg = SRC.mull.slice(
      SRC.mull.indexOf('const wakeUp'), SRC.mull.indexOf('const doCornerScare'));
    const tp = seg.indexOf('teleport(WAKE_POINT.x');
    const pitch = seg.indexOf('pitchObj.rotation.x = WAKE_DAZE.pitch');
    expect(tp).toBeGreaterThan(-1);
    expect(pitch).toBeGreaterThan(tp);
    // 字幕迟到走 later（daze 分支），且低语已走直通（真空里独响）
    expect(seg).toContain('later(() => ui.caption(caption, 5200), WAKE_DAZE.captionMs)');
    expect(seg).toContain("audio.sfx('whisper', 0.7, 0, true)");
  });

  it('只给拐角惊吓：拐角 wake 带 daze、转身 wake 平视即醒即字（两重 wake 分家）', () => {
    expect(SRC.mull).toContain("wakeUp('有些拐角，不该拐过去。', true)");
    expect(SRC.mull).toContain("wakeUp('有些东西只在你回头时存在。')");
  });
});

describe('v1.24 门禁 102：音色塑形（98 刹车内改形，零新嗓子）', () => {
  it('音色 98 刹车照旧：合成器 case 恰 98 种（塑形不是添丁）', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
  });

  it('scare 低频加权 + 双翼去相关：失谐簇分翼、噪声墙劈两面、52→27Hz 半沉新层', () => {
    expect(SRC.engine).toContain('i % 2 === 0 ? -0.4 : 0.4');       // 失谐簇左右错开
    expect(SRC.engine).toContain("noise('white', 0.95, 'bandpass', 1500, 0.8, 0.34, 0, 0.02, -0.6)");
    expect(SRC.engine).toContain("noise('pink', 1.2, 'bandpass', 1100, 0.9, 0.3, 0.01, 0.03, 0.6)");
    expect(SRC.engine).toContain("noise('brown', 1.9, 'lowpass', 130, 1, 0.5, 0, 0.02)"); // 衰减 1.5→1.9
    expect(SRC.engine).toContain("tone('sine', 52, 27, 1.7, 0.2, 0.02)");                 // 半沉层
    expect(SRC.engine).toContain("tone('sine', 34, 22, 1.5, 0.4)");                       // 旧次声原封
  });

  it('thud 力度分层：vol≥0.9 才醒深层——现役满格调用恰两处（两重惊吓 shock 拍）', () => {
    const at = SRC.engine.indexOf("case 'thud':");
    const seg = SRC.engine.slice(at, SRC.engine.indexOf('break;', at));
    expect(seg).toContain('if (vol >= 0.9) {');
    expect(seg).toContain("tone('sine', 31, 19, 0.62, 0.3)");
    // 全馆 thud 调用普查：≥0.9 的只有两重惊吓的 1.0（家具级闷响不越线）
    const halls = ['mulholland', 'archive', 'twinpeaks', 'bluevelvet', 'lobby', 'studio', 'eraserhead']
      .map((h) => read(`src/halls/${h}.js`)).join('\n');
    const hot = [];
    for (const m of halls.matchAll(/sfx(?:At)?\('thud'[^)]*\)/g)) {
      const v = /,\s*(0?\.\d+|1(?:\.0)?)\s*[,)]/.exec(m[0].replace(/'thud'/, "'thud'"));
      if (v && Number(v[1]) >= 0.9) hot.push(m[0]);
    }
    expect(hot.length, `惊吓级 thud 越界: ${hot.join(' | ')}`).toBe(2);
  });

  it('scrape 与滑出窗对时：主擦噪 0.58s、指数快落、石屑 0.48s 赶在落定闷响前', () => {
    const at = SRC.engine.indexOf("case 'scrape'");
    const seg = SRC.engine.slice(at, SRC.engine.indexOf('break;', at));
    expect(seg).toContain("noise('pink', 0.58, 'bandpass', 1050, 3, 0.17, 0, 0.03)");
    expect(seg).toContain('exponentialRampToValueAtTime(330, t + 0.42)');
    expect(seg).toContain('0.48');
    expect(seg).not.toContain('t + 0.85'); // 0.9s 线性拖尾退役（声画各说各话的病灶）
    // 对时账：石屑 0.48s < 滑出落定 0.55s；主擦噪 0.58s 只比落定多半口气
    expect(0.48).toBeLessThan(SCARE_BEATS.stare / 1000);
    expect(0.58 - SCARE_BEATS.stare / 1000).toBeLessThanOrEqual(0.05);
  });

  it('单音色内部分翼的通道存在：wing(node, spread) + tone/noise 末参', () => {
    expect(SRC.engine).toContain('const wing = (node, spread)');
    expect(SRC.engine).toContain('delay = 0, spread = 0');
    expect(SRC.engine).toContain('delay = 0, attack = 0.012, spread = 0');
  });
});

describe('v1.24 门禁 102：接近段持续低压层 setDread（dreadswell 嗓子的持续态）', () => {
  it('引擎侧：27Hz 同源（dreadswell 起音同频）、增益 q² 封顶 0.2、挂 master 吃真空', () => {
    expect(SRC.engine).toContain('setDread(q)');
    expect(SRC.engine).toContain('osc.frequency.value = 27;');
    expect(SRC.engine).toMatch(/case 'dreadswell'[\s\S]{0,400}tone\('sine', 27, 46/); // 同一副嗓子
    expect(SRC.engine).toContain('setTargetAtTime(0.2 * v * v, t, 0.18)');
    expect(SRC.engine).toContain('g.connect(this.master);');
  });

  it('换厅归零：stopAmbience 把低压层随环境一并收走（防跨厅残留）', () => {
    const at = SRC.engine.indexOf('stopAmbience() {');
    expect(SRC.engine.slice(at, at + 300)).toContain('this.setDread(0);');
  });

  it('mull 接线：q 与巷灯/心跳同源同闸（armed 静音门内 setDread(0)）', () => {
    expect(SRC.mull).toContain('audio.setDread(q);');
    expect(SRC.mull).toMatch(/lampDread\.v = 0; audio\.setDread\(0\); return;/);
    // 涨程参数零改动（机制勿再内卷的复钉）
    expect(APPROACH_DREAD.z0).toBe(-18.5);
    expect(APPROACH_DREAD.swellAt).toBe(0.6);
  });
});

describe('v1.24 门禁 102：变奏彩蛋第三例·时序反转（路灯杆——答在问前）', () => {
  const seg = SRC.mull.slice(
    SRC.mull.indexOf("hint: 'E — 路灯铁杆'"),
    SRC.mull.indexOf('\n  });', SRC.mull.indexOf("hint: 'E — 路灯铁杆'")));

  it('反转分支：scare.seen 后光先答（复用双沉包络）、你的那声 2.4s 才到', () => {
    expect(seg).toContain('if (scare.seen)');
    expect(seg).toContain('poleEcho.rev = 2.4;');
    expect(seg).toContain('poleEcho.t = 0;');
    // 同一笔账方向相反：rev 迟延 = 原错拍 wait 迟延
    expect(seg).toContain('poleEcho.wait = 2.4;');
  });

  it('贴顶纪律原封：分支段内零字幕零 sfxAt（远声密度钉不动——迟到的声在段外）', () => {
    expect(seg).not.toContain('ui.caption');
    expect((seg.match(/sfxAt\(/g) || []).length).toBe(1); // 仍只有原首拍那一处
    // 段外 rev 更新器走游戏时钟（swiftshader 纪律）
    expect(SRC.mull).toContain('poleEcho.rev -= dt;');
    expect(SRC.mull).toMatch(/poleEcho\.rev < 0\) audio\.sfxAt\('poletap', -3\.9, 14, 0\.6, 4\);/);
  });

  it('反转进行中再敲无效（rev 入首行闸——问还没落地不许再问）', () => {
    expect(seg).toContain('if (poleEcho.wait >= 0 || poleEcho.t >= 0 || poleEcho.rev >= 0) return;');
  });

  it('变奏家族三例三语法封口：if (scare.seen) 恰三处（缺席/换位/反转，再加就是通胀）', () => {
    expect((SRC.mull.match(/if \(scare\.seen\)/g) || []).length).toBe(3);
  });

  it('零新热点：mulholland INTERACTIVE_MIN 24 持平（普查 195 不动）', () => {
    expect(SRC.cjs).toMatch(/mulholland: 24/);
  });
});

describe('v1.24 门禁 102：机制/几何/拍长零改动复钉（本轮纪律——只动声与醒）', () => {
  it('SCARE_BEATS 六拍原值（v1.28 演进后复钉）', () => {
    expect(SCARE_BEATS).toEqual({
      reveal: 0, stare: 720, rush: 1670, shock: 2070, blackout: 2570, wake: 3470
    });
  });

  it('CLOSEUP/STARE_TILT/RIM_BEATS 手感参数原值（v1.28 钉）', () => {
    expect(CLOSEUP).toEqual({ grabIn: 0.10, fovPush: 18, headY: 2.05 });
    expect(STARE_TILT).toEqual({ at: 0.28, span: 0.42, rad: 0.095 });
    expect(RIM_BEATS).toEqual({ base: 8.2, strike: 4.8, breath: 0.65, surge: 4.0 });
  });

  it('electron 惊吓 wake 预算联动检查：拍长未动、40s 预算照旧', () => {
    expect(SRC.cjs).toContain("pollUntilWake('拐角惊吓', 40000");
    expect(SRC.cjs).toContain("pollUntilWake('转身惊吓', 40000");
  });
});

describe('v1.24 门禁 102：版本口径', () => {
  it('版本口径一致：package.json 与 __SV__.version 同值（精确钉移交 v125-eggs）', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(read('src/main.js')).toContain(`version: '${pkg.version}'`);
  });
});
