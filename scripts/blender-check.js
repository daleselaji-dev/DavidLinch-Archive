// ============================================================
// blender-check.js — Blender 资产管线冒烟（npm run blender:check）。
// 1) 定位 blender（PATH 或 BLENDER_BIN），校验版本 4.1.x
// 2) 快速跑一遍 loop 头两步：gen(block) → inspect，断言
//    对象数与总高（比例架就位即工具链可用）
// 环境无 Blender 时打印手动步骤后以 0 退出（CI 不因缺重型
// 依赖阻塞；SV_BLENDER_STRICT=1 时改为非零退出）。
// ============================================================
'use strict';

const { execFileSync, execSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const root = path.join(__dirname, '..');
const strict = process.env.SV_BLENDER_STRICT === '1';

function findBlender() {
  if (process.env.BLENDER_BIN && fs.existsSync(process.env.BLENDER_BIN)) {
    return process.env.BLENDER_BIN;
  }
  try {
    return execSync('command -v blender', { encoding: 'utf-8' }).trim() || null;
  } catch {
    return null;
  }
}

const MANUAL = `
[blender:check] 本机未找到 Blender —— 手动安装步骤（Linux headless）:
  1. 从官方镜像下载 4.1.1:
     curl -L -o /tmp/blender.tar.xz \\
       https://ftp.nluug.nl/pub/graphics/blender/release/Blender4.1/blender-4.1.1-linux-x64.tar.xz
  2. tar xf /tmp/blender.tar.xz -C /opt/blender
  3. ln -s /opt/blender/blender-4.1.1-linux-x64/blender /usr/local/bin/blender
  4. 重新运行: npm run blender:check
资产管线用法见 scripts/blender/README.md。`;

const blender = findBlender();
if (!blender) {
  console.log(MANUAL);
  process.exit(strict ? 1 : 0);
}

console.log(`[blender:check] blender = ${blender}`);
const version = execFileSync(blender, ['--version'], { encoding: 'utf-8' }).split('\n')[0];
console.log(`[blender:check] ${version}`);
if (!/^Blender 4\.1\./.test(version)) {
  console.error(`[blender:check] 需要 Blender 4.1.x，实际: ${version}`);
  process.exit(1);
}

const tmpBlend = path.join(os.tmpdir(), `sv-blender-check-${Date.now()}.blend`);
try {
  console.log('[blender:check] gen(block) …');
  execFileSync(blender, [
    '-b', '--factory-startup',
    '--python', path.join(root, 'scripts', 'blender', 'gen_corner_wraith.py'),
    '--', '--stage', 'block', '--out', tmpBlend
  ], { encoding: 'utf-8', timeout: 180000 });

  console.log('[blender:check] inspect …');
  const out = execFileSync(blender, [
    '-b', tmpBlend,
    '--python', path.join(root, 'scripts', 'blender', 'inspect_blend.py')
  ], { encoding: 'utf-8', timeout: 120000 });

  const meshes = /\[inspect\] meshes=(\d+)/.exec(out);
  const height = /height=([\d.]+)/.exec(out);
  if (!meshes || Number(meshes[1]) !== 5) {
    throw new Error(`比例架对象数异常: ${meshes && meshes[1]}（应为 5）`);
  }
  const h = Number(height && height[1]);
  if (!(h > 2.1 && h < 2.75)) {
    throw new Error(`比例架总高异常: ${h}（应 ≈2.35，容差含枢轴旋转的包围盒过估）`);
  }
  console.log(`[blender:check] OK — meshes=5 height=${h}`);
  console.log('[blender:check] 工具链可用。完整 loop（fine/渲染/GLB）见 scripts/blender/README.md');
} finally {
  try { fs.unlinkSync(tmpBlend); } catch { /* 清理尽力而为 */ }
}
