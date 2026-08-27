import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// v1.5 彩蛋接线源码审计（渲染/时序正确性由 electron --smoke 的
// triggerEggs 全量引爆覆盖；这里锁定关键结构不被无意回退）。
const mul = readFileSync(new URL('../src/halls/mulholland.js', import.meta.url), 'utf8');
const tp = readFileSync(new URL('../src/halls/twinpeaks.js', import.meta.url), 'utf8');

describe('穆赫兰道「拐角黑影」惊吓 v3（拐角即出）', () => {
  it('触发点在暗巷拐角（z 在剧场东南角附近，不要求深入空地）', () => {
    const m = mul.match(/zoneTrigger\(\{ x: ([\d.-]+), z: ([\d.-]+), r: ([\d.]+) \}, doScare/);
    expect(m, '找不到 doScare 的 zoneTrigger').toBeTruthy();
    const [, x, z, r] = m.map(Number);
    expect(x).toBeGreaterThan(8.4);          // 在暗巷走廊内
    expect(x).toBeLessThan(11);
    expect(z).toBeGreaterThan(-27.6);        // 不在 BACKLOT 深处
    expect(z).toBeLessThan(-20);             // 已过巷中段、贴近拐角
    expect(r).toBeGreaterThanOrEqual(2.5);
  });

  it('使用 lurkerFigure v3（带眼）而非旧 darkFigure，且带剪影红光', () => {
    expect(mul).toContain('lurkerFigure(');
    expect(mul).not.toContain('darkFigure(');
    expect(mul).toContain('scareLight');
  });

  it('拐角即出：触发同帧滑出（phase=3 无前置延时）+ 0.3s 滑到面前 + 0.75s 内起扑', () => {
    // doScare 里第一动作即 phase=3（黑影出场），不再有 2.9s 铺垫计时器
    expect(mul).toMatch(/const doScare = \(\) => \{\s*\n\s*if \(scare\.phase !== 0\) return;\s*\n\s*\/\/[^\n]*\n\s*scare\.phase = 3;/);
    expect(mul).toMatch(/scare\.t \/ 0\.3\b/);      // 0.3s 滑出
    expect(mul).toMatch(/\}, 750\);/);               // 0.75s 起扑
    expect(mul).toMatch(/\}, 1150\);/);              // 1.15s 黑幕
    expect(mul).not.toMatch(/\}, 2900\);/);          // 旧的拖沓铺垫已删除
  });

  it('铺垫改为接近驱动：unease 距离场 + 巷灯随之失稳 + dread 预警一记', () => {
    for (const k of ['alleyPanic.unease', "sfxAt('dread'", 'dreadState.armed']) {
      expect(mul, `接近驱动铺垫缺环节: ${k}`).toContain(k);
    }
  });

  it('声画链齐备：silencecut 抽真空(duck) + metalscrape 拖地 + scare+shock + 黑幕(heartbeat) + 错位传送', () => {
    for (const k of ["'silencecut'", "'metalscrape'", "'heartbeat'", 'audio.duck', "'scare'", 'engine.shock', 'ui.fade(true)', 'teleport(']) {
      expect(mul, `惊吓链缺环节: ${k}`).toContain(k);
    }
  });

  it('可重复触发且有冷却；彩蛋以 corner-scare 暴露给冒烟测试', () => {
    expect(mul).toMatch(/doScare, \{ cooldown: \d+ \}/);
    expect(mul).toContain("'corner-scare': scareTrig");
  });
});

describe('穆赫兰道「午夜来电」彩蛋（v1.6 惊吓连锁）', () => {
  it('惊吓归位时武装电话亭（lateCall.arm），走近响铃，接起有静电/呼吸/亭灯寒颤', () => {
    for (const k of ['lateCall.arm()', "sfxAt('phonering'", 'lateCall.ringing', 'boothShiver']) {
      expect(mul, `午夜来电缺环节: ${k}`).toContain(k);
    }
  });

  it('彩蛋以 late-call 暴露给冒烟测试', () => {
    expect(mul).toContain("'late-call': lateCall");
  });
});

describe('穆赫兰道「没有乐队」彩蛋', () => {
  it('话筒交互接到完整状态机（咏叹→silencecut 抽真空→回声→复原）', () => {
    for (const k of ["'aria'", "'silencecut'", 'runNoBand', 'noBand.phase']) {
      expect(mul, `没有乐队链缺环节: ${k}`).toContain(k);
    }
  });

  it('视觉 ≥2 通道：歌者剪影 + 聚光转冷 + 帷幕异动 + 全厅压暗', () => {
    for (const k of ['singerMat', 'spotCold', 'proscenium.rotation.x', 'houseDim.k']) {
      expect(mul, `没有乐队缺视觉通道: ${k}`).toContain(k);
    }
  });

  it('彩蛋以 no-band 暴露给冒烟测试', () => {
    expect(mul).toContain("'no-band': noBandTrig");
  });
});

describe('双峰对讲机彩蛋', () => {
  it('两台对讲机（林地 + 红房间）都已放置并接 E 交互', () => {
    expect(tp.match(/walkieTalkie\(\{ mats: M \}\)/g)?.length).toBe(2);
    expect(tp).toContain('walkieA.userData.body');
    expect(tp).toContain('walkieB.userData.body');
  });

  it('按键反馈：walkie 合成音 + PTT 压下 + LED + 远端应答', () => {
    for (const k of ["'walkie'", 'userData.ptt.position.x', 'userData.ledMat.emissiveIntensity', 'wkLed[1 - i]']) {
      expect(tp, `对讲机反馈缺环节: ${k}`).toContain(k);
    }
  });

  it('隐藏互答层：双机窗口判定 + 雾涨/萤火凝固/帷幕门骤亮，暴露为 walkie-duet', () => {
    for (const k of ['runDuet', 'freeze.on = u < 4.2', 'fogLayer.material.opacity = 0.045 + k', "'walkie-duet'"]) {
      expect(tp, `互答层缺环节: ${k}`).toContain(k);
    }
  });
});

describe('v1.5 氛围增强（雾呼吸 + 稀发远景事件）', () => {
  it('穆赫兰道：路雾/巷雾呼吸 + 远景事件调度器（惊吓中不插话）', () => {
    expect(mul).toContain('roadHaze.material.opacity = 0.05 * (1 + Math.sin');
    expect(mul).toContain("'sirenfar'");
    expect(mul).toMatch(/scare\.phase !== 0\) return/);
  });

  it('双峰：地表雾长波呼吸 + 远鸮/远门/闷雷调度器', () => {
    expect(tp).toContain('fogLayer.material.opacity = 0.045 * (1 + Math.sin');
    expect(tp).toMatch(/farEvt/);
  });
});
