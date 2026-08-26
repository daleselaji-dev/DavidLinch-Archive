// ============================================================
// smoke.js — 构建冒烟测试。
// 1) 执行 vite 生产构建  2) 校验产物结构 (入口/懒加载分包/CSS)
// 3) Electron 主进程语法检查  4) 打包配置校验  5) 素材合规扫描
// 任一失败即以非零码退出。
// ============================================================
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures++;
    console.error(`  ✘ ${name}\n    → ${err.message}`);
  }
}

console.log('[smoke] 1/5 生产构建…');
execSync('npx vite build', { cwd: root, stdio: 'inherit' });

console.log('[smoke] 2/5 产物结构校验…');
const dist = path.join(root, 'dist');
check('dist/index.html 存在且包含标题与免责声明', () => {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');
  if (!html.includes('SMOKE')) throw new Error('缺少标题');
  if (!html.includes('非官方')) throw new Error('缺少免责声明');
});
check('展厅懒加载分包 ≥ 6 个（含新厅 studio，资源按需加载）', () => {
  const assets = fs.readdirSync(path.join(dist, 'assets'));
  const hallChunks = assets.filter((f) =>
    /(lobby|archive|eraserhead|bluevelvet|twinpeaks|mulholland|studio)-.*\.js$/.test(f));
  if (hallChunks.length < 6) throw new Error(`只找到 ${hallChunks.length} 个: ${hallChunks.join(', ')}`);
  if (!hallChunks.some((f) => f.startsWith('studio-'))) throw new Error('缺少 studio 分包');
});
check('CSS 产物存在（统一视觉语言样式表）', () => {
  const assets = fs.readdirSync(path.join(dist, 'assets'));
  if (!assets.some((f) => f.endsWith('.css'))) throw new Error('无 CSS 产物');
});

console.log('[smoke] 3/5 Electron 主进程语法检查…');
check('electron/main.cjs 可被 Node 解析', () => {
  execSync(`node --check ${path.join(root, 'electron', 'main.cjs')}`);
});

console.log('[smoke] 4/5 打包配置校验…');
check('package.json 含 Windows 打包目标 (portable + nsis)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  const targets = (pkg.build?.win?.target || []).map((t) => t.target);
  if (!targets.includes('portable') || !targets.includes('nsis')) {
    throw new Error(`目标不全: ${targets.join(',')}`);
  }
  if (pkg.main !== 'electron/main.cjs') throw new Error('main 入口错误');
});

console.log('[smoke] 5/5 素材合规扫描（不允许任何媒体素材文件）…');
check('src/ 与 electron/ 内无图像/音频/视频文件', () => {
  const banned = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.mp4', '.mov', '.svg', '.flac']);
  const walk = (dir, out = []) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  };
  const files = walk(path.join(root, 'src')).concat(walk(path.join(root, 'electron')));
  const bad = files.filter((f) => banned.has(path.extname(f).toLowerCase()));
  if (bad.length) throw new Error(`发现素材文件: ${bad.join(', ')}`);
});

if (failures > 0) {
  console.error(`\n[smoke] 失败: ${failures} 项未通过`);
  process.exit(1);
}
console.log('\n[smoke] 全部通过 ✔');
