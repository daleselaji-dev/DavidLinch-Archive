import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { LEGAL, NARRATIONS, ESSAYS } from '../src/data/essays.js';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe('版权合规自检', () => {
  it('应用内合规声明存在且明确「非官方」', () => {
    const all = LEGAL.badge + LEGAL.paras.join('');
    expect(all).toContain('非官方');
    expect(all).toContain('非授权');
    expect(all).toContain('粉丝');
  });

  it('仓库内不存在任何图像/音频/视频素材文件（全程序化生成）', () => {
    const banned = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.mp4', '.mov', '.flac', '.aac', '.bmp', '.tiff', '.svg'];
    const files = walk(join(process.cwd(), 'src')).concat(walk(join(process.cwd(), 'electron')));
    const media = files.filter((f) => banned.includes(extname(f).toLowerCase()));
    expect(media).toEqual([]);
  });

  it('旁白与文章均为原创中文文案且非空', () => {
    for (const n of Object.values(NARRATIONS)) {
      expect(n.text.length).toBeGreaterThan(10);
    }
    for (const e of Object.values(ESSAYS)) {
      expect(e.title).toBeTruthy();
      expect(e.paras.join('').length).toBeGreaterThan(80);
    }
  });

  it('README 顶部含免责声明', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf-8');
    expect(readme).toMatch(/非官方|unofficial/i);
    expect(readme).toMatch(/粉丝|fan/i);
  });
});
