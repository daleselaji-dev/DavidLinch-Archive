import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LynchShader } from '../src/core/post.js';

// v1.4 PS5-tier 后处理：三段电影分级（P4）+ halation 光晕（P5）。
// uniform 面与默认值可在 node 环境直接断言；着色器行为由截屏复核覆盖。

describe('v1.4 LynchPass 电影分级（P4）', () => {
  it('uLift/uGamma/uGain 三段 uniform 存在且默认为中性', () => {
    const u = LynchShader.uniforms;
    expect(u.uLift.value.toArray()).toEqual([0, 0, 0]);
    expect(u.uGamma.value.toArray()).toEqual([1, 1, 1]);
    expect(u.uGain.value.toArray()).toEqual([1, 1, 1]);
  });

  it('片元着色器实现 CDL 曲线（gain→lift→1/gamma 幂）', () => {
    expect(LynchShader.fragmentShader).toContain('col * uGain + uLift');
    expect(LynchShader.fragmentShader).toContain('vec3(1.0) / max(uGamma');
  });

  it('引擎 setLook 支持逐厅 grade 并回落中性', () => {
    const src = readFileSync(new URL('../src/core/engine.js', import.meta.url), 'utf8');
    expect(src).toContain('gr.lift || [0, 0, 0]');
    expect(src).toContain('gr.gamma || [1, 1, 1]');
    expect(src).toContain('gr.gain || [1, 1, 1]');
  });
});

describe('v1.4 LynchPass halation（P5）', () => {
  it('uHalation/uHalationColor uniform 存在且默认强度适中', () => {
    const u = LynchShader.uniforms;
    expect(u.uHalation.value).toBeGreaterThan(0);
    expect(u.uHalation.value).toBeLessThanOrEqual(0.3); // 不许糊成一片
    const c = u.uHalationColor.value;
    expect(c.r).toBeGreaterThan(c.b); // 暖色晕（红 > 蓝）
  });

  it('六向亮部采样存在且有阈值（只晕亮部）', () => {
    expect(LynchShader.fragmentShader).toContain('uHalation > 0.001');
    expect(LynchShader.fragmentShader).toMatch(/max\(smp - 0\.\d+, vec3\(0\.0\)\)/);
  });

  it('低画质档关闭 halation（P9 降级链路）', () => {
    const src = readFileSync(new URL('../src/core/engine.js', import.meta.url), 'utf8');
    expect(src).toContain("u.uHalation.value = q === 'high' ? this._lookHalation : 0");
  });
});
