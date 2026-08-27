import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// v1.5 彩蛋接线源码审计（渲染/时序正确性由 electron --smoke 的
// triggerEggs 全量引爆覆盖；这里锁定关键结构不被无意回退）。
const mul = readFileSync(new URL('../src/halls/mulholland.js', import.meta.url), 'utf8');
const tp = readFileSync(new URL('../src/halls/twinpeaks.js', import.meta.url), 'utf8');

describe('穆赫兰道「拐角那个东西」惊吓 v3', () => {
  const scareSeg = mul.slice(mul.indexOf('const doScare'), mul.indexOf('const scareTrig'));

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

  it('拐角即出：触发同帧 figure.visible = true / 灯灭 / 声音抽走（零铺垫拖沓）', () => {
    expect(scareSeg, '现身不在触发同帧').toContain('figure.visible = true');
    expect(scareSeg, '灯没有在触发同帧熄灭').toContain('alleyPanic.mode = 2');
    expect(scareSeg, '声音没有在触发同帧抽走').toContain('audio.duck');
    // doScare 内不允许任何 setTimeout/later 铺垫（旧版 2.9s 灯闪铺垫已废弃）
    expect(scareSeg).not.toContain('later(');
    expect(scareSeg).not.toContain('setTimeout(');
  });

  it('节拍全由 dt 帧循环驱动（低帧率下声画不脱节），总长 ≤ 3.2s、现身 ≤ 0.6s', () => {
    const m = mul.match(/const BEATS = \{([^}]+)\}/);
    expect(m, '找不到 BEATS 节拍表').toBeTruthy();
    const beats = {};
    for (const [, k, v] of m[1].matchAll(/(\w+): ([\d.]+)/g)) beats[k] = Number(v);
    expect(beats.emerge, '现身太慢（拐角即出要求 ≤0.6s）').toBeLessThanOrEqual(0.6);
    expect(Math.max(...Object.values(beats)), '全链太长（拖沓）').toBeLessThanOrEqual(3.2);
    expect(beats.wake).toBeGreaterThan(beats.blackout);
    expect(beats.blackout).toBeGreaterThan(beats.lunge);
    expect(beats.lunge).toBeGreaterThan(beats.emerge);
  });

  it('使用 nightmareFigure（细节+眼睛）而非粗黑剪影，且带惨白底光与剪影红光', () => {
    expect(mul).toContain('nightmareFigure(');
    expect(mul).not.toContain('lurkerFigure(');
    expect(mul).not.toContain('darkFigure(');
    expect(mul).toContain('scareFace');   // 下巴底下的惨白底光——照出那张脸
    expect(mul).toContain('scareLight');  // 背后剪影红光
  });

  it('声画链齐备：dread/metalscrape/heartbeat/breath → 真空(duck) → 扑(scare+shock) → 黑幕传送', () => {
    for (const k of ["'dread'", "'metalscrape'", "'heartbeat'", "'breath'", 'audio.duck', "'scare'", 'engine.shock', 'ui.fade(true)', 'teleport(']) {
      expect(mul, `惊吓链缺环节: ${k}`).toContain(k);
    }
  });

  it('可重复触发且有冷却；彩蛋以 corner-scare 暴露给冒烟测试', () => {
    expect(mul).toMatch(/doScare, \{ cooldown: \d+ \}/);
    expect(mul).toContain("'corner-scare': scareTrig");
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
