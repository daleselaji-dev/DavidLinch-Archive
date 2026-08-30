import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SCARE_BEATS, CLOSEUP, STARE_TILT, WRAITH_T0, RIM_BEATS, APPROACH_DREAD
} from '../src/halls/mulholland.js';
import { DOCENT, QUOTES } from '../src/data/essays.js';
import { INTERVIEWS } from '../src/data/interviews.js';

// ============================================================
// v1.23 门禁 101：新 Goal 第 2 轮（惊吓手感抛光 + rim 灯语 + 内容出口）
// 口径（对齐 GOAL_HANDOFF 第 2 轮优先项）：
//   · 显形线机制**不换**——cornerscare.test 47 用例几何守卫原封，
//     本文件钉的是手感参数边界与运行时曲线（入锁/慢推/滑出/错拍/
//     歪头/相位钟/rim 分拍）；
//   · 魅影本轮只动灯光与运行时相位，**零几何回炉**（gen 脚本不动，
//     12 mesh / 7388 tris 账由 blender:check 与 v122 眼组钉继续守）；
//   · 内容出口走关闸后仅有的两条：DOCENT 回访补注 ×7（访谈 40
//     封顶复钉不涨）+ 呼叫铃 scare.seen 变奏（零网格零新热点，
//     只换既有第二层应答的方位与迟延——第三层判死红线不碰）。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  mull: read('src/halls/mulholland.js'),
  kit: read('src/halls/kit.js')
};

describe('v1.23 门禁 101：惊吓手感抛光——参数边界（机制零改动）', () => {
  it('错拍加长账：站住盯你 950ms（800→950），后续三拍顺延、全程仍 ≤4.5s', () => {
    expect(SCARE_BEATS.rush - SCARE_BEATS.stare).toBe(950);
    expect(SCARE_BEATS.shock - SCARE_BEATS.rush).toBe(400);   // 扑近窗不动
    expect(SCARE_BEATS.blackout - SCARE_BEATS.shock).toBe(500); // 闷击→黑幕不动
    expect(SCARE_BEATS.wake - SCARE_BEATS.blackout).toBe(900);  // 归位窗不缩水
    expect(SCARE_BEATS.wake).toBeLessThanOrEqual(4500);
  });

  it('入锁快一步：grabIn 0.35s——锁到位早于滑出收尾（看着它滑完最后半程）', () => {
    expect(CLOSEUP.grabIn).toBeCloseTo(0.35, 5);
    expect(CLOSEUP.grabIn * 1000).toBeLessThan(SCARE_BEATS.stare); // 0.55s 滑出窗内锁定
  });

  it('FOV 慢推：推量 15°（13→15，≤18 守卫内）且曲线换 smoothstep——起步几乎不动', () => {
    expect(CLOSEUP.fovPush).toBe(15);
    expect(CLOSEUP.fovPush).toBeLessThanOrEqual(18);
    expect(SRC.mull).toContain('const push = pRaw * pRaw * (3 - 2 * pRaw)');
    expect(SRC.mull).not.toMatch(/const push = Math\.min\(1, grab\.t/); // 线性推退役
  });

  it('滑出曲线立方→四次方：更「闪」的出角 + 更长的减速尾（贝塞尔路径不动）', () => {
    expect(SRC.mull).toContain('const s = 1 - (1 - k) ** 4;');
    expect(SRC.mull).not.toContain('const s = 1 - (1 - k) ** 3;');
    // 曲线性质：前 0.2s（k≈0.364）完成 ≥80% 行程，且单调不回头
    const quart = (k) => 1 - (1 - k) ** 4;
    expect(quart(0.2 / (SCARE_BEATS.stare / 1000))).toBeGreaterThanOrEqual(0.8);
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const v = quart(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('错拍三口心跳：120/520/870ms——间隔 400→350 收紧（心先替你往前跑）', () => {
    expect(SRC.mull).toContain('B.stare + 120');
    expect(SRC.mull).toContain('B.stare + 520');
    expect(SRC.mull).toContain('B.stare + 870');
    expect(520 - 120).toBeGreaterThan(870 - 520); // 后一口比前一口更急
    expect(SCARE_BEATS.stare + 870).toBeLessThan(SCARE_BEATS.rush); // 三口都落在错拍窗内
  });

  it('接近段末程双拍：q≥0.7 心跳变「咚-咚」，半拍音量低于主拍；涨程参数原封', () => {
    expect(SRC.mull).toContain('if (q >= 0.7) later(');
    expect(SRC.mull).toContain("audio.sfx('heartbeat', 0.1 + 0.18 * q)");
    expect(0.1 + 0.18 * 1).toBeLessThan(0.16 + 0.3 * 1); // 半拍是回声不抢主拍
    // APPROACH_DREAD 手感抛光不动涨程（涨程账在 cornerscare.test 47 用例）
    expect(APPROACH_DREAD.z0).toBe(-18.5);
    expect(APPROACH_DREAD.z1).toBe(-26.4);
  });
});

describe('v1.23 门禁 101：错拍中段歪头（STARE_TILT——运行时姿态零网格）', () => {
  it('参数边界：歪完落在错拍窗内、弧度克制（≤0.12——是核对不是抽搐）', () => {
    expect(STARE_TILT.at + STARE_TILT.span).toBeLessThanOrEqual(1);
    expect(STARE_TILT.at).toBeGreaterThan(0);
    expect(STARE_TILT.rad).toBeGreaterThan(0);
    expect(STARE_TILT.rad).toBeLessThanOrEqual(0.12);
  });

  it('接线：lookAt 重置之后绕视线轴 rotateZ，smoothstep 进、进了就不回', () => {
    const seg = SRC.mull.slice(
      SRC.mull.indexOf("scare.sub === 'stare'"),
      SRC.mull.indexOf('cornerTrigger(CORNER_SCARE'));
    expect(seg).toContain('wraith.rotateZ(STARE_TILT.rad');
    expect(seg).toContain('u * u * (3 - 2 * u)');
    expect(seg.indexOf('wraith.lookAt')).toBeLessThan(seg.indexOf('wraith.rotateZ'));
  });
});

describe('v1.23 门禁 101：魅影自发光相位钟（确定化——眼焰不再看全局钟脸色）', () => {
  const eye = (tau) => Math.sin(tau * 2.4 + 1.2); // GLB setLurch 眼焰相位项

  it('WRAITH_T0 数学账：眼焰相位在错拍开始那一帧过零上行', () => {
    const stareStart = WRAITH_T0 + SCARE_BEATS.stare / 1000;
    expect(Math.abs(eye(stareStart))).toBeLessThan(1e-9);
    expect(eye(stareStart + 0.01)).toBeGreaterThan(0); // 上行不是下行
  });

  it('眼焰峰值落在错拍窗内（~69% 处烧到最亮——它看你看得最狠的那一拍）', () => {
    const stareStart = WRAITH_T0 + SCARE_BEATS.stare / 1000;
    const stareLen = (SCARE_BEATS.rush - SCARE_BEATS.stare) / 1000;
    const peakAt = (Math.PI / 2) / 2.4; // 相位爬到 π/2 的用时
    expect(peakAt).toBeGreaterThan(stareLen * 0.4);
    expect(peakAt).toBeLessThan(stareLen * 0.9);
    expect(eye(stareStart + peakAt)).toBeCloseTo(1, 9);
  });

  it('接线：scare.clock 跨线帧清零、逐帧累加；更新器内 t 重指局部钟', () => {
    expect(SRC.mull).toContain('scare.clock = 0;');
    expect(SRC.mull).toContain('scare.clock += dt;');
    expect(SRC.mull).toContain('t = WRAITH_T0 + scare.clock;');
    // 47 用例的字面钉原封：setLurch/setRush 仍以 (…, t) 形参喂入
    expect(SRC.mull).toContain('wraith.userData.setLurch(s, t)');
    expect(SRC.mull).toContain('wraith.userData.setLurch(1, t)');
    expect(SRC.mull).toContain('wraith.userData.setRush(k, t)');
  });
});

describe('v1.23 门禁 101：rim 剪影光分拍灯语（灯光不动几何）', () => {
  it('RIM_BEATS 边界：打火过冲 ≤ 基值（不炸白）、呼吸 ≤15% 基值（是呼吸不是频闪）', () => {
    expect(RIM_BEATS.base).toBeGreaterThan(0);
    expect(RIM_BEATS.strike).toBeLessThanOrEqual(RIM_BEATS.base);
    expect(RIM_BEATS.breath).toBeLessThanOrEqual(RIM_BEATS.base * 0.15);
    expect(RIM_BEATS.surge).toBeGreaterThan(0);
  });

  it('reveal 拍与滑出同步涨光 + 起辉打火；stare 拍与眼焰错半拍；rush 拍涌光', () => {
    expect(SRC.mull).toContain('RIM_BEATS.base * (0.25 + 0.75 * k)');
    expect(SRC.mull).toContain("scare.t < 0.09 ? RIM_BEATS.strike : 0");
    expect(SRC.mull).toContain('+ Math.PI) * RIM_BEATS.breath'); // 错半拍：光弱那一瞬眼最亮
    expect(SRC.mull).toContain('RIM_BEATS.surge * Math.min(1, scare.t / 0.4)');
    expect(SRC.mull).toContain('(want - rimLight.intensity) * Math.min(1, dt * 14)');
    expect(SRC.mull).not.toContain('rimState.on * 6.5'); // v1.22 单档更新器退役
  });

  it('色温压冷 + 灯位抬高（0x93aeff / y=2.9——背顶光剪出冠顶与肩线）', () => {
    expect(SRC.mull).toContain('0x93aeff');
    expect(SRC.mull).toContain('rimLight.position.set(6.3, 2.9, -28.7)');
  });

  it('rimState 开关帧不动：reveal 置 1、blackout 归 0（黑幕帧灯语一起走）', () => {
    expect(SRC.mull).toContain('rimState.on = 1;');
    expect(SRC.mull).toContain('rimState.on = 0;');
  });

  it('几何纪律：本轮零回炉——gen_corner_wraith.py 眼组四参数原值在源（v122 钉复验）', () => {
    const gen = read('scripts/blender/gen_corner_wraith.py');
    expect(gen).toContain('major_radius=0.012 * H, minor_radius=0.0035 * H');
    expect(gen).toContain('emission_strength=0.9');
  });
});

describe('v1.23 门禁 101：DOCENT 回访补注 ×7（关闸后的内容出口一）', () => {
  const USED = ['meaning', 'sense', 'home', 'you', 'philly', 'darkness', 'doughnut'];

  it.each(USED)('回访注解 %s2 在册（24–96 字、≤3 短句，与首段同纪律）', (id) => {
    const d = DOCENT[`${id}2`];
    expect(d, `${id}2 缺回访注解`).toBeTruthy();
    expect(d.length).toBeGreaterThanOrEqual(24);
    expect(d.length).toBeLessThanOrEqual(96);
    const sentences = d.split(/[。！？]/).filter((x) => x.trim().length > 0);
    expect(sentences.length, `${id}2 超过 3 短句`).toBeLessThanOrEqual(3);
  });

  it('七厅各恰一处 docent2 接线，且键名与首段键配对（id + 2）', () => {
    const wires = {
      lobby: 'meaning', mulholland: 'sense', bluevelvet: 'home', studio: 'you',
      eraserhead: 'philly', twinpeaks: 'darkness', archive: 'doughnut'
    };
    for (const [hall, id] of Object.entries(wires)) {
      const src = read(`src/halls/${hall}.js`);
      expect((src.match(/docent2: DOCENT\./g) || []).length, `${hall} docent2 计数`).toBe(1);
      expect(src).toContain(`docent2: DOCENT.${id}2`);
    }
  });

  it('kit 回访门：docent2 形参 + awayAfterSpoke 闸（走开又折回来才补讲，站着不走听不到）', () => {
    expect(SRC.kit).toContain('docent2 = null');
    expect(SRC.kit).toContain('awayAfterSpoke');
    expect(SRC.kit).toMatch(/spoke && awayAfterSpoke && !spoke2/);
    // 两段低语都不打断进行中的讲解
    expect((SRC.kit.match(/!narration\.letters\.active/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('防撞第七轮：回访补注关键词在 QUOTES/INTERVIEWS/DOCENT 首段全库零出现', () => {
    const firstTier = USED.map((id) => DOCENT[id]).join('');
    const pool = firstTier
      + QUOTES.map((q) => q.zh + q.en).join('')
      + INTERVIEWS.map((v) => v.zh + v.en).join('');
    for (const w of ['马厩', '米兰', '章节点', '树木研究员', '摇号', '传记片']) {
      expect(pool, `关键词撞车: ${w}`).not.toContain(w);
    }
  });

  it('访谈封顶复钉：40 恰等、四主题 10/10/10/10——内容轮不碰关闸', () => {
    expect(INTERVIEWS.length).toBe(40);
    for (const theme of ['点子', '电影', '心境', '此生']) {
      expect(INTERVIEWS.filter((v) => v.theme === theme).length).toBe(10);
    }
  });
});

describe('v1.23 门禁 101：呼叫铃 scare.seen 变奏（关闸后的内容出口二）', () => {
  const seg = SRC.mull.slice(
    SRC.mull.indexOf("hint: 'E — 候场呼叫铃'"),
    SRC.mull.indexOf('折座排椅 v2'));

  it('变奏分支：那一夜之后应铃的换了位置——拐角那头、快一步近一截', () => {
    expect(seg).toContain('if (scare.seen)');
    expect(seg).toContain("sfxAt('doorfar', CORNER_EDGE.x, CORNER_EDGE.z");
    expect(seg).toContain('这次是拐角那头应的。');
    expect(seg).toContain(', 1400)'); // 变奏应答 1.4s
    expect(seg).toContain(', 2100)'); // 首访原拍 2.1s 原样保留（变奏要有原拍才成立）
    expect(seg).toContain('应声的门离得太远了。');
  });

  it('第三层判死红线不碰：变奏分支内连锁应答恰一记（只换方位迟延，不叠层）', () => {
    const at = seg.indexOf('if (scare.seen)');
    const branch = seg.slice(at, seg.indexOf('return;', at));
    expect((branch.match(/later\(/g) || []).length).toBe(1);
  });

  it('零新热点零网格：mulholland INTERACTIVE_MIN 24 持平（普查 195 不动）', () => {
    const cjs = read('electron/main.cjs');
    expect(cjs).toMatch(/mulholland: 24/);
  });
});

describe('v1.23 门禁 101：版本口径', () => {
  it('版本口径一致：package.json 与 __SV__.version 同值（精确钉移交 v124-eggs）', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(read('src/main.js')).toContain(`version: '${pkg.version}'`);
  });
});
