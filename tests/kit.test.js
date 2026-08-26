import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as kit from '../src/halls/kit.js';
import * as props from '../src/halls/props.js';

// canvas 相关函数在 node 环境无法执行（无 DOM），
// 这里只测纯逻辑（rng）、导出面、以及源码级纹理预算审计；
// 渲染正确性由 electron --smoke 截屏证据覆盖（门禁 21）。

describe('v1.3 材质系统 — seeded RNG', () => {
  it('同种子序列完全一致（多通道纹理对齐的前提）', () => {
    const a = kit.rng(42);
    const b = kit.rng(42);
    for (let i = 0; i < 200; i++) expect(a()).toBe(b());
  });

  it('不同种子序列不同', () => {
    const a = kit.rng(1);
    const b = kit.rng(2);
    const seqA = Array.from({ length: 8 }, a);
    const seqB = Array.from({ length: 8 }, b);
    expect(seqA).not.toEqual(seqB);
  });

  it('输出落在 [0,1) 且分布不退化', () => {
    const r = kit.rng(7);
    let min = 1;
    let max = 0;
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeLessThan(0.05);
    expect(max).toBeGreaterThan(0.95);
  });

  it('种子 0 不塌缩为全零序列', () => {
    const r = kit.rng(0);
    const vals = new Set(Array.from({ length: 10 }, r));
    expect(vals.size).toBeGreaterThan(5);
  });
});

describe('v1.3 材质工厂导出面', () => {
  const MATS = [
    'woodMat', 'brassMat', 'chromeMat', 'ironMat', 'fabricMat', 'leatherMat',
    'concreteMat', 'brickMat', 'asphaltMat', 'chevronMat', 'waterMat'
  ];
  it.each(MATS)('%s 已导出为函数', (name) => {
    expect(typeof kit[name]).toBe('function');
  });

  const SETS = ['woodSet', 'brickSet', 'metalBrushedSet', 'weaveSet', 'concreteSet', 'asphaltSet', 'chevronSet', 'leatherSet'];
  it.each(SETS)('纹理组 %s 已导出为函数', (name) => {
    expect(typeof kit[name]).toBe('function');
  });

  it('法线生成与纹理组装工具已导出', () => {
    expect(typeof kit.normalFromHeight).toBe('function');
    expect(typeof kit.canvasOf).toBe('function');
    expect(typeof kit.texOf).toBe('function');
  });
});

describe('v1.4 PS5-tier 材质系统（P1/P2/P7）', () => {
  const src = readFileSync(new URL('../src/halls/kit.js', import.meta.url), 'utf8');

  it('P1 AO 通道：aoFromHeight 已导出且 setFrom 装配 aoMap', () => {
    expect(typeof kit.aoFromHeight).toBe('function');
    expect(src).toContain('aoMap: aoFromHeight(');
    expect(src).toContain('tex.channel = 0');
  });

  it('P1 金属度通道：拉丝金属组带 metalnessMap（禁单值大色块）', () => {
    expect(src).toMatch(/metal[\s\S]{0,900}nStrength: 0\.6, metal/);
    expect(src).toContain('mat.metalnessMap = set.metalnessMap');
  });

  it.each(['marbleSet', 'boomerangSet', 'rustSet'])('P2 新纹理组 %s 已导出', (name) => {
    expect(typeof kit[name]).toBe('function');
  });

  it.each(['marbleMat', 'boomerangMat', 'rustMat'])('P2 新材质工厂 %s 已导出', (name) => {
    expect(typeof kit[name]).toBe('function');
  });

  it('v1.9 B4 瓷釉铁皮 enamelSet/enamelMat 已导出且四通道齐备（露铁走 metalnessMap）', () => {
    expect(typeof kit.enamelSet).toBe('function');
    expect(typeof kit.enamelMat).toBe('function');
    const seg = src.slice(src.indexOf('export function enamelSet'), src.indexOf('// ---------- PBR 材质工厂'));
    expect(seg).toContain("draw(g, s, 'albedo')");
    expect(seg).toContain("draw(g, s, 'height')");
    expect(seg).toContain("draw(g, s, 'rough')");
    expect(seg).toContain("draw(g, s, 'metal')");
    expect(seg).toContain('metal');
  });

  it('P7 双层体积光锥 lightCone2 已导出（内芯+外晕+同步调制）', () => {
    expect(typeof kit.lightCone2).toBe('function');
    expect(src).toContain('setStrength');
  });
});

describe('v1.3 道具预制体库导出面', () => {
  const PROPS = [
    'chandelier', 'fluorescentFixture', 'cardCatalog', 'jukebox', 'sedanCar',
    'theaterSeats', 'phoneBooth', 'angleLamp', 'radioCabinet', 'turntable',
    'typewriter', 'ceilingFan', 'counterClutter', 'pieCase', 'streetLampV2',
    'trafficLight', 'viewScope', 'fireboxDoor', 'valveWheel', 'fuseBox',
    'gramophone', 'beerTaps', 'cashRegister', 'memorialStele', 'propMats',
    // v1.3 阶段 4 新增（互动带小件）
    'lectern', 'stanchionRope', 'ushersBell', 'dimmerPlate', 'callaLily', 'lilyMats',
    // v1.3 阶段 7 艺术二遍新增
    'ashStand',
    // v1.3 艺术三遍：装饰派俱乐部椅（替代 roundedBox armchair）+ 档案放映机 + 吧台壁挂电话
    'clubChair', 'filmProjector', 'wallPhone'
  ];
  it.each(PROPS)('%s 已导出为函数', (name) => {
    expect(typeof props[name]).toBe('function');
  });

  it('预制体总数 ≥ 29（PRODUCTION_PLAN §3 独有预制体清单 + 阶段 4 互动小件）', () => {
    const fns = Object.values(props).filter((v) => typeof v === 'function');
    expect(fns.length).toBeGreaterThanOrEqual(29);
  });
});

describe('纹理分辨率预算（PRODUCTION_PLAN §2.1 源码审计）', () => {
  const files = [
    'src/halls/kit.js', 'src/halls/props.js', 'src/halls/lobby.js',
    'src/halls/archive.js', 'src/halls/eraserhead.js', 'src/halls/bluevelvet.js',
    'src/halls/twinpeaks.js', 'src/halls/mulholland.js', 'src/halls/studio.js'
  ];
  it('所有程序纹理 canvas 尺寸 ≤ 1024', () => {
    for (const f of files) {
      const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
      for (const m of src.matchAll(/canvas(?:Texture|Of)\(\s*(\d+)/g)) {
        expect(Number(m[1]), `${f} 中纹理尺寸 ${m[1]} 超预算`).toBeLessThanOrEqual(1024);
      }
      for (const m of src.matchAll(/\.width\s*=\s*c?\.height\s*=\s*(\d+)/g)) {
        expect(Number(m[1]), `${f} 中画布尺寸 ${m[1]} 超预算`).toBeLessThanOrEqual(1024);
      }
    }
  });

  it('kit.js 不再有超大 2048+ 纹理', () => {
    const src = readFileSync(new URL('../src/halls/kit.js', import.meta.url), 'utf8');
    expect(src).not.toMatch(/canvas(?:Texture|Of)\(\s*(2048|4096)/);
  });
});
