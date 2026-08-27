// v1.10 P23 防塑料终审——把「禁塑料」从肉眼抽查变成全源扫描门禁。
// 口径：roughness < 0.16 的「裸材质」（无贴图、无清漆、非金属、非透明、
// 非自发光）在没有正当物理语境（水面/玻璃/釉面）的情况下不允许存在——
// 低粗糙度 + 纯色 + 无微表面变化正是「塑料感/CG 感」的配方。
// 有正当语境的低粗糙度（水面近镜、窗玻璃、emissive 灯罩）逐处放行并入册。
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const hallsDir = join(dirname(fileURLToPath(import.meta.url)), '../src/halls');
const FILES = readdirSync(hallsDir).filter((f) => f.endsWith('.js'))
  .map((f) => [f, readFileSync(join(hallsDir, f), 'utf8')]);

function scan() {
  const unjustified = [];
  const justified = [];
  for (const [file, src] of FILES) {
    for (const m of src.matchAll(/new THREE\.Mesh(Standard|Physical)Material\(\{([\s\S]{0,400}?)\}\)/g)) {
      const body = m[2];
      const rough = body.match(/roughness:\s*([\d.]+)/);
      if (!rough || parseFloat(rough[1]) >= 0.16) continue;
      if (/\bmap:/.test(body)) continue;                      // 有贴图=有微表面
      if (/clearcoat/.test(body)) continue;                   // 清漆层有自己的语言
      const metal = body.match(/metalness:\s*([\d.]+)/);
      if (metal && parseFloat(metal[1]) >= 0.5) continue;     // 金属走金属口径
      if (/transparent|transmission/.test(body)) continue;    // 透明件另册
      if (/emissive/.test(body)) { justified.push(`${file}(自发光)`); continue; }
      // 正当物理语境：材质声明前 320 字符内出现水面/玻璃语汇
      const ctx = src.slice(Math.max(0, m.index - 320), m.index);
      if (/水|[Ww]ater|玻璃|[Gg]lass|釉/.test(ctx)) {
        justified.push(`${file}(${/玻璃|[Gg]lass/.test(ctx) ? '玻璃' : '水面'})`);
        continue;
      }
      unjustified.push(`${file}: roughness=${rough[1]} :: ${body.slice(0, 80).replace(/\s+/g, ' ')}`);
    }
  }
  return { unjustified, justified };
}

describe('v1.10 P23 防塑料全源门禁（低粗糙度裸材质普查）', () => {
  const { unjustified, justified } = scan();

  it('无正当语境的裸低粗糙度材质 = 0（塑料感配方零容忍）', () => {
    expect(unjustified, `疑似塑料材质：\n${unjustified.join('\n')}`).toEqual([]);
  });

  it('放行清单在册且不膨胀（水面/玻璃/自发光 ≤6 处）', () => {
    // 当前在册：eraserhead 接水盘水面 + 接水桶水面、twinpeaks 窗玻璃、
    // props 自发光灯罩。新增低粗糙度光面必须带贴图/清漆或落进正当语境。
    expect(justified.length).toBeGreaterThanOrEqual(3);
    expect(justified.length).toBeLessThanOrEqual(6);
  });
});
