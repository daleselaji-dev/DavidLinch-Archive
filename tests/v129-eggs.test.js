import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import {
  REVEAL_PEEK, SCARE_BEATS, CLOSEUP, VACUUM
} from '../src/halls/mulholland.js';
import { DOCENT } from '../src/data/essays.js';
import { INTERVIEWS, interviewById } from '../src/data/interviews.js';

// ============================================================
// v1.29 门禁 109：贴角闪现 + 鸮/魅影精修 + 内容
// 用户证词：时机仍不对、建模不够吓人、不符合原著。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  mull: read('src/halls/mulholland.js'),
  tp: read('src/halls/twinpeaks.js'),
  gen: read('scripts/blender/gen_corner_wraith.py'),
  main: read('src/main.js'),
  engine: read('src/audio/engine.js'),
  cjs: read('electron/main.cjs')
};
const OWL = SRC.tp.slice(
  SRC.tp.indexOf('const owl = new THREE.Group();'),
  SRC.tp.indexOf('snag.add(owl);'));

describe('v1.29 门禁 109：贴角闪现（时机）', () => {
  it('REVEAL_PEEK 闪拍：s≈0.28 hold 90ms（不再冻 220ms）', () => {
    expect(REVEAL_PEEK).toEqual({ s: 0.28, holdMs: 90 });
  });

  it('CLOSEUP 同帧锁：grabIn 0.10 + ease-out 立方', () => {
    expect(CLOSEUP.grabIn).toBe(0.10);
    expect(SRC.mull).toContain('const k = 1 - (1 - g) ** 3');
    expect(SRC.mull).not.toContain('const k = g * g * (3 - 2 * g); // smoothstep 入锁');
  });

  it('SCARE_BEATS / VACUUM 窗宽守恒（本轮只改入锁与 peek，不改拍长）', () => {
    expect(SCARE_BEATS.rush - SCARE_BEATS.stare).toBe(950);
    expect(0.045 + VACUUM.hold).toBeCloseTo(SCARE_BEATS.wake / 1000 + 0.3, 6);
  });
});

describe('v1.29 门禁 109：corner_wraith 第四轮 + 双峰鸮', () => {
  it('GLB ≤300KB + 眼组一字不动 + 第四轮账', () => {
    const size = statSync(new URL('../src/assets/corner_wraith.glb', import.meta.url)).size;
    expect(size).toBeLessThanOrEqual(300 * 1024);
    expect(SRC.gen).toContain('major_radius=0.012 * H, minor_radius=0.0035 * H');
    expect(SRC.gen).toContain('emission_strength=0.9');
    expect(SRC.gen).toContain('v1.29 第四轮回炉');
    expect(SRC.gen).toContain('OPEN_HALF = math.pi * 0.14');
  });

  it('鸮眼组不动 + 面盘/羽贴图入形件（mesh 仍 2）', () => {
    expect(OWL).toContain("xform(new THREE.SphereGeometry(0.02, 8, 6), -0.035, 0.315, 0.075)");
    expect(OWL).toContain("xform(new THREE.SphereGeometry(0.02, 8, 6), 0.035, 0.315, 0.075)");
    expect(OWL).toContain('color: 0x050403, emissive: 0xffb45e, emissiveIntensity: 1.15');
    expect(OWL).toContain('diskGeo');
    expect(OWL).toContain('owlFeatherTex');
    expect(OWL).toContain('owl.add(owlBody, eyes);');
  });
});

describe('v1.29 门禁 109：内容与纪律', () => {
  it('DOCENT.mulholland2 夜路灵感 + 访谈 coffeelove 替换 selfish', () => {
    expect(DOCENT.mulholland2).toContain('夜路');
    expect(interviewById('coffeelove')).toBeTruthy();
    expect(interviewById('selfish')).toBeFalsy();
    expect(INTERVIEWS.length).toBe(40);
  });

  it('纪律三数：音色 98 · 访谈 40 · 普查 195 · 变奏恰三处', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
    const m = /INTERACTIVE_MIN = \{([\s\S]*?)\}/.exec(SRC.cjs);
    const total = [...m[1].matchAll(/: (\d+)/g)].reduce((n, x) => n + Number(x[1]), 0);
    expect(total + 7).toBe(195);
    expect((SRC.mull.match(/if \(scare\.seen\)/g) || []).length).toBe(3);
  });

  it('package.json 与 __SV__.version 都是 1.29.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('1.29.0');
    expect(SRC.main).toContain("version: '1.29.0'");
  });
});
