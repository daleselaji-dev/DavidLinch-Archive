import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
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

  it('P7 双层体积光锥 lightCone2 已导出（内芯+外晕+同步调制）', () => {
    expect(typeof kit.lightCone2).toBe('function');
    expect(src).toContain('setStrength');
  });
});

describe('v1.5/v1.6 拐角惊吓 / 对讲机资产', () => {
  const src = readFileSync(new URL('../src/halls/kit.js', import.meta.url), 'utf8');

  it('nightmareFigure 梦魇形体 v3 已导出，且带 userData.update 痉挛驱动', () => {
    expect(typeof kit.nightmareFigure).toBe('function');
    expect(src).toMatch(/nightmareFigure[\s\S]{0,13000}userData\.update = \(dt, t, k/);
  });

  it('梦魇形体 v1.8：Blender 细模档（颅骨壳/连体破袍/双臂长手）+ 程序化眼球嘴缝', () => {
    const seg = src.slice(src.indexOf('export function nightmareFigure'));
    // 形体几何来自 Blender 权威细模档（gen_figure.py 烘焙）
    expect(seg).toContain("blendGeo('figure/body')");
    expect(seg).toContain("blendGeo('figure/head')");
    for (const part of ['figure/armL', 'figure/armR', 'figure/handL', 'figure/handR']) {
      expect(seg, `nightmareFigure 缺 Blender 细模件: ${part}`).toContain(`'${part}'`);
    }
    // 眼球/瞳孔/眼圈/嘴缝保持程序化（材质动画通道）
    for (const k of ['socket', 'eyeMat', 'pupil', 'skinTex', 'mkEye', 'faceMat', 'ring', 'mouth.scale.y']) {
      expect(seg, `nightmareFigure 缺细节: ${k}`).toContain(k);
    }
    // 双眼不对称（歪斜/大小差是「不对劲」的核心细节）
    expect(seg).toContain('mkEye(-1');
    expect(seg).toContain('mkEye(1');
  });

  it('v1.8 原作感长发（Blender 档）：三组长绺 mesh 独立摆动 + 脑后垂到胸口 + 扑时后掀', () => {
    const seg = src.slice(src.indexOf('export function nightmareFigure'));
    for (const part of ['figure/hairBack', 'figure/hairL', 'figure/hairR']) {
      expect(seg, `nightmareFigure 缺长发件: ${part}`).toContain(`blendGeo('${part}')`);
    }
    // 脑后长绺解码后必须垂到胸口量级（≥0.9m 纵向跨度，2.4m 身高档）
    const hb = kit.blendGeo('figure/hairBack');
    hb.computeBoundingBox();
    expect(hb.boundingBox.max.y - hb.boundingBox.min.y).toBeGreaterThanOrEqual(0.9);
    // 两鬓绺反相轻摆 + 扑（k 驱动）时整头长发向后掀
    expect(seg).toContain('hairL.rotation.z');
    expect(seg).toContain('hairR.rotation.z');
    expect(seg).toContain('hairBack.rotation.x');
  });

  it('cornerRevealPath 绕角路径：凸包性质 + 贴脸触发时站位收在枢轴', () => {
    expect(typeof kit.cornerRevealPath).toBe('function');
    const p = kit.cornerRevealPath(new THREE.Vector3(0, 0, -2), new THREE.Vector3(2, 0, -1));
    p.aim(2, 5, 1.9); // 玩家在枢轴正北 6m
    const out = new THREE.Vector3();
    for (let i = 0; i <= 20; i++) {
      p.at(i / 20, out);
      // 二次贝塞尔凸包：任何采样点都在三控制点包围盒内
      expect(out.x).toBeGreaterThanOrEqual(-1e-9);
      expect(out.x).toBeLessThanOrEqual(2 + 1e-9);
      expect(out.z).toBeGreaterThanOrEqual(-2 - 1e-9);
    }
    expect(Math.hypot(p.to.x - 2, p.to.z - 5)).toBeCloseTo(1.9, 6);
    p.aim(2.3, -0.6, 1.9); // 玩家贴脸——站位收在枢轴本身
    expect(p.to.x).toBeCloseTo(2, 6);
    expect(p.to.z).toBeCloseTo(-1, 6);
  });

  it('一体化黑松 pineTree v1.8（Blender 档）：hero/far 双 LOD 单几何 + 顶点色 + 预算内三角数', () => {
    expect(typeof kit.pineTree).toBe('function');
    const seg = src.slice(src.indexOf('export function pineTree'));
    expect(seg).toContain("blendGeo(detail ? 'pine/hero' : 'pine/far')");
    expect(seg).toContain('vertexColors: true');
    // 双 LOD 三角预算（双峰厅 72×hero + 215×far 必须压在 240k 内）
    const hero = kit.blendGeo('pine/hero');
    const far = kit.blendGeo('pine/far');
    expect(hero.index.count / 3).toBeLessThanOrEqual(1000);
    expect(far.index.count / 3).toBeLessThanOrEqual(450);
    // 顶点色（针叶明暗/干皮色温）随几何一起烘焙
    expect(hero.attributes.color).toBeTruthy();
    expect(far.attributes.color).toBeTruthy();
    // 树是立着的：纵向跨度按 1 单位规格化建模（scale 由调用方给）
    hero.computeBoundingBox();
    expect(hero.boundingBox.max.y).toBeGreaterThan(hero.boundingBox.max.x);
  });

  describe('v1.8 blendGeo 解码器（Blender 权威细模 → 运行时几何）', () => {
    it('全部烘焙件可解码：位置/法线/顶点色/索引齐全且数量一致', () => {
      const PARTS = [
        'figure/body', 'figure/head', 'figure/hairBack', 'figure/hairL', 'figure/hairR',
        'figure/armL', 'figure/armR', 'figure/handL', 'figure/handR',
        'ladder/wood', 'ladder/brass', 'ladder/wheel', 'pine/hero', 'pine/far'
      ];
      for (const name of PARTS) {
        const g = kit.blendGeo(name);
        expect(g.attributes.position?.count, `${name} 缺位置`).toBeGreaterThan(0);
        expect(g.attributes.normal?.count, `${name} 法线数不齐`).toBe(g.attributes.position.count);
        expect(g.attributes.color?.count, `${name} 顶点色数不齐`).toBe(g.attributes.position.count);
        expect(g.index?.count % 3, `${name} 索引非三角`).toBe(0);
      }
    });

    it('未知资产名抛错（防拼写错误静默出空几何）', () => {
      expect(() => kit.blendGeo('nope/nothing')).toThrow(/未知/);
    });

    it('法线解码后近单位长度（int8 量化误差 < 3%）', () => {
      const g = kit.blendGeo('figure/head');
      const n = g.attributes.normal;
      for (let i = 0; i < n.count; i += 7) {
        const len = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
        expect(len).toBeGreaterThan(0.97);
        expect(len).toBeLessThan(1.03);
      }
    });

    it('cylUV/planarUV 给烘焙几何补 UV（canvas 纹理通道可用）', () => {
      const g1 = kit.cylUV(kit.blendGeo('figure/body'), 2);
      expect(g1.attributes.uv?.count).toBe(g1.attributes.position.count);
      const g2 = kit.planarUV(kit.blendGeo('ladder/wood'), 0.8);
      expect(g2.attributes.uv?.count).toBe(g2.attributes.position.count);
    });
  });

  it('dreamFish 梦鱼已导出：一体车削鱼身 + 顶点色 + 鳞纹 + 发光侧线 + 眼 + 尾摆驱动', () => {
    expect(typeof kit.dreamFish).toBe('function');
    const seg = src.slice(src.indexOf('export function dreamFish'));
    for (const k of [
      'LatheGeometry', "setAttribute('color'", 'scaleTex', 'mkLateral',
      'eyeMat', 'barbels', 'userData.setGlow', 'userData.update',
      'tail.rotation.y', 'lineMat.emissiveIntensity'
    ]) {
      expect(seg.slice(0, 10000), `dreamFish 缺要素: ${k}`).toContain(k);
    }
  });

  it('walkieTalkie 对讲机预制体已导出，暴露 body/ptt/ledMat/antenna 交互挂点', () => {
    expect(typeof props.walkieTalkie).toBe('function');
    const propsSrc = readFileSync(new URL('../src/halls/props.js', import.meta.url), 'utf8');
    for (const hook of ['userData.body', 'userData.ptt', 'userData.ledMat', 'userData.antenna']) {
      expect(propsSrc).toContain(hook);
    }
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
