import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { INTERVIEWS, INTERVIEW_THEMES } from '../src/data/interviews.js';
import { GuestbookStore } from '../src/ui/guestbook-store.js';

// ============================================================
// v1.19 门禁 91/92/93：回声窗第七批·窗长差异化（余温总账 9s）
// + GLB 轴维护巡检 + 第 7 轮纪律钉（墙那头封口/访谈封顶/暗示预算）
// 口径（对齐 GOAL_HANDOFF 第 7 轮优先项）：
//   · 七件回声窗全 ≈6s 是模板化苗头——窗长改为随各件应答时长走：
//     **余温总账 9s**，问出口那刻起余温一共九秒，答落定花掉几秒，
//     窗就剩几秒（落定慢的窗短、落定快的窗长）。机制零改动：
//     echo 倒数/问一次即消耗/自复位/即答通道全部照旧，只改常数；
//   · GLB 轴已收官转维护：七件资产/六处落厅是终态，只修不添——
//     不为「每轮一件」立新 gen_*.py；
//   · 「墙那头」封口：drawerfar 西墙叙事已用两次（v1.10 稀发 +
//     卡死抽屉应答），呼应成对到此为止——第三次就是模板；
//   · 访谈 38 持平（若再扩封顶 40）；暗示预算一句用尽（留言簿
//     「回头客」之外不再加第二句）；音色 98 刹车（v118 精确钉持平）。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  lobby: read('src/halls/lobby.js'),
  archive: read('src/halls/archive.js'),
  eraserhead: read('src/halls/eraserhead.js'),
  bluevelvet: read('src/halls/bluevelvet.js'),
  twinpeaks: read('src/halls/twinpeaks.js'),
  mulholland: read('src/halls/mulholland.js'),
  studio: read('src/halls/studio.js'),
  main: read('src/main.js')
};

// [厅, 状态机, 窗长赋值行（精确钉）, 落定时长, 窗长, 落定账目行（算术的源码根据）]
const CADENCE = [
  ['lobby', 'snuffState', 'snuffState.echo = 5.3;', 3.7, 5.3,
    ['snuffState.wait = 1.5;', 'snuffState.duck - dt / 2.2']],
  ['mulholland', 'poleEcho', 'poleEcho.echo = poleEcho.replay ? 0 : 6;', 3.0, 6.0,
    ['poleEcho.wait = 2.4;', 'poleEcho.t > 0.6']],
  ['studio', 'chinaState', 'chinaState.echo = 6;', 3.0, 6.0,
    ['if (k >= 3.0) {']],
  ['twinpeaks', 'warmState', 'warmState.echo = 7.7;', 1.3, 7.7,
    ['warmState.wait = 1.3;']],
  ['bluevelvet', 'micState', 'micState.echo = 5.7;', 3.3, 5.7,
    ['micState.wait = 1.5;', 'micState.breath - dt / 1.8']],
  ['eraserhead', 'frostState', 'frostState.echo = 7.3;', 1.7, 7.3,
    ['frostState.wait = 1.7;']],
  ['archive', 'windState', 'windState.echo = 5.6;', 3.4, 5.6,
    ['if (k >= 3.4) {']]
];

describe('v1.19 门禁 91：回声窗窗长差异化（余温总账 9s，机制零改动）', () => {
  it.each(CADENCE)('%s %s：窗长精确钉 + 落定账目行在源', (hall, _state, assign, _settle, _win, basis) => {
    expect(SRC[hall], `${hall} 窗长赋值不符余温总账`).toContain(assign);
    for (const line of basis) {
      expect(SRC[hall], `${hall} 落定账目行缺失（算术要有源码根据）`).toContain(line);
    }
  });

  it('总账守恒：七件 落定时长 + 窗长 = 9.0（差异化是算出来的不是配出来的）', () => {
    for (const [hall, , , settle, win] of CADENCE) {
      expect(settle + win, `${hall} 总账不等于 9s`).toBeCloseTo(9.0, 6);
    }
  });

  it('模板拆除：窗长至少 5 个不同值（七件全 ≈6s 不许回流）', () => {
    const wins = new Set(CADENCE.map((c) => c[4]));
    expect(wins.size).toBeGreaterThanOrEqual(5);
  });

  it('落定慢的窗短、落定快的窗长（逆序单调，一对都不许破）', () => {
    for (const a of CADENCE) {
      for (const b of CADENCE) {
        if (a[3] < b[3]) {
          expect(a[4], `${a[0]}(落定 ${a[3]}) 窗须不短于 ${b[0]}(落定 ${b[3]})`)
            .toBeGreaterThanOrEqual(b[4]);
        }
      }
    }
  });

  it('archive 旧例外退役：8s 钉不回流（最慢落定不再配最长窗，v117 钉移交在案）', () => {
    expect(SRC.archive).not.toContain('windState.echo = 8');
    // 新账下 tp（最快落定 1.3s）持最长窗、lobby（最慢落定 3.7s）持最短窗
    const sorted = [...CADENCE].sort((x, y) => x[3] - y[3]);
    expect(sorted[0][0]).toBe('twinpeaks');
    expect(sorted[sorted.length - 1][0]).toBe('lobby');
  });

  it.each(CADENCE)('%s 机制零改动：echo 倒数/问一次即消耗照旧（v117 口径不回退）', (hall, state) => {
    expect(SRC[hall]).toContain(`${state}.echo -= dt`);
    expect(SRC[hall]).toContain(`${state}.echo = 0;`);
  });

  it('七厅余温总账注释在册（改常数必须留账——防下轮读不懂 5.3/7.7 从哪来）', () => {
    for (const [hall] of CADENCE) {
      expect(SRC[hall], `${hall} 缺余温总账注记`).toContain('余温');
    }
  });
});

describe('v1.19 门禁 92：GLB 轴维护巡检 + 第 7 轮纪律钉', () => {
  it('维护轴不立新项：gen_*.py 恰七件（不为「每轮一件」产新资产）', () => {
    const dir = new URL('../scripts/blender/', import.meta.url);
    const gens = readdirSync(dir).filter((f) => /^gen_.*\.py$/.test(f));
    expect(gens.length).toBe(7);
  });

  it('在库 GLB 恰六件、全 ≤300KB、studio 零导入（收官终态不回退）', () => {
    const dir = new URL('../src/assets/', import.meta.url);
    const glbs = readdirSync(dir).filter((f) => f.endsWith('.glb'));
    expect(glbs.length).toBe(6);
    for (const f of glbs) {
      expect(statSync(new URL(`../src/assets/${f}`, import.meta.url)).size,
        `${f} 超体积红线`).toBeLessThanOrEqual(300 * 1024);
    }
    expect(SRC.studio).not.toContain('.glb?inline');
  });

  it('「墙那头」封口：archive drawerfar 调用点恰三处（西墙叙事两次用尽，新交互不许再推给这面墙）', () => {
    // 三处 = v1.10 稀发远声 + 卡死抽屉西墙应答 + 没关严抽屉自滑开
    // （后者声源在柜位不在墙后）——多一处即破「呼应成对」的封口
    expect((SRC.archive.match(/sfxAt\('drawerfar'/g) || []).length).toBe(3);
    for (const hall of ['lobby', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio']) {
      expect(SRC[hall], `${hall} 不许借用 drawerfar 西墙叙事`).not.toContain('drawerfar');
    }
  });

  it('访谈层持平 38、封顶 40（四主题 10/10/9/9 不回退；再扩转质量维护）', () => {
    expect(INTERVIEWS.length).toBeGreaterThanOrEqual(38);
    expect(INTERVIEWS.length).toBeLessThanOrEqual(40);
    const dist = INTERVIEW_THEMES.map(
      (t) => INTERVIEWS.filter((v) => v.theme === t).length);
    for (const n of dist) expect(n).toBeGreaterThanOrEqual(9);
  });

  it('暗示预算用尽：留言簿种子恰四条、含暗示的只有「回头客」一条（全馆至多一句）', () => {
    const store = new GuestbookStore({
      getItem: () => null, setItem: () => {}, removeItem: () => {}
    });
    const seeds = store.list().filter((p) => p.id.startsWith('seed-'));
    expect(seeds.length).toBe(4);
    expect(seeds.filter((p) => p.name === '回头客').length).toBe(1);
    // 暗示只活在数据层——UI/HUD 层零提示（v118 口径复钉）
    expect(SRC.main).not.toContain('回头客');
  });
});

describe('v1.19 阈值与版本', () => {
  it('版本口径一致：package.json 与 __SV__.version 同值（版本钉移交 v120-eggs.test）', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(SRC.main).toContain(`version: '${pkg.version}'`);
  });
});
