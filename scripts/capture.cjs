'use strict';
// ============================================================
// capture — 视觉核验专用截屏（不入 CI）：
//   node_modules/.bin/electron scripts/capture.cjs
// 场景：
//   1) 穆赫兰道拐角惊吓 v3（触发后连拍：滑出/对视/扑）
//   2) 工作室冥想深水序列（大鱼逼近 / 点子光粒 / 上浮）
//   3) 双峰一体化松树近景
// 输出：SV_CAP_DIR（默认 /tmp/sv-captures）
// ============================================================
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

const OUT = process.env.SV_CAP_DIR || '/tmp/sv-captures';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1440, height: 900, show: false, backgroundColor: '#070409',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.once('ready-to-show', () => win.show());
  const js = (code) => win.webContents.executeJavaScript(code, true);
  const shot = async (name) => {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(OUT, `${name}.png`), img.toPNG());
    console.log(`[cap] ${name}.png`);
  };

  const deadline = setTimeout(() => { console.error('[cap] 超时'); app.exit(1); }, 300000);
  let stage = 0;
  win.webContents.on('console-message', async (_e, _l, message) => {
    try {
      if (message.includes('[sv] boot-ready')) {
        await js("document.getElementById('boot-enter').click()");
      }
      if (!message.includes('[sv] hall-loaded')) return;
      const hall = message.split(' ').pop();

      if (hall === 'lobby' && stage === 0) {
        stage = 1;
        await sleep(2500);
        await js("window.__SV__.goTo('mulholland')");
      }

      if (hall === 'mulholland' && stage === 1) {
        stage = 2;
        await sleep(5000);
        // 巷中面向拐角（yaw 0 = 面向 -z）；软渲染合成器有数秒延迟，
        // 摆拍改用 poseEgg 定格（游戏内时序 2.35s 太快拍不到）
        await js('window.__SV__.teleport(9.7, -21.4, 0.12)');
        await sleep(6000);
        await shot('scare-0-alley');
        await js("window.__SV__.poseEgg('corner-scare', 'pose', 2.4)");
        await sleep(6000);
        await shot('scare-1-corner');
        await js("window.__SV__.poseEgg('corner-scare', 'pose', 1.1)");
        await sleep(6000);
        await shot('scare-2-face');
        await js("window.__SV__.poseEgg('corner-scare', 'unpose')");
        await js("window.__SV__.goTo('twinpeaks')");
      }

      if (hall === 'twinpeaks' && stage === 2) {
        stage = 3;
        await sleep(5000);
        // 林缘近景：看向环绕空地的一体化松树
        await js('window.__SV__.teleport(3.4, 11.5, -2.4)');
        await sleep(6000);
        await shot('tree-1-closeup');
        await js('window.__SV__.teleport(-4.2, 9.0, 2.2)');
        await sleep(6000);
        await shot('tree-2-closeup');
        await js("window.__SV__.goTo('studio')");
      }

      if (hall === 'studio' && stage === 3) {
        stage = 4;
        await sleep(5000);
        // 进冥想角坐下（帘可不拉开，直接瞬移进去）
        await js('window.__SV__.teleport(4.5, -7.2, Math.PI)');
        await sleep(3000);
        await js("window.__SV__.activateByHint('坐下')");
        await sleep(5000); await shot('meditate-1-descend');
        await sleep(13000); await shot('meditate-2-bigfish');   // ≈18s
        await sleep(6500); await shot('meditate-3-idea');       // ≈24.5s
        await sleep(7500); await shot('meditate-4-surface');    // ≈32s
        clearTimeout(deadline);
        console.log('[cap] 完成');
        app.exit(0);
      }
    } catch (err) {
      console.error('[cap] 失败', err);
      app.exit(1);
    }
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
