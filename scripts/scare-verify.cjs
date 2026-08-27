'use strict';

// ============================================================
// 拐角惊吓专项验证（v1.7）——逐帧证据链：
//   1. 站在触发圈外（巷中段）拍一张：黑影不可见、巷灯正常
//   2. 瞬移一步「走到拐角」（进入触发圈）——自然触发（非 force）
//   3. 之后 ~3.6s 内每 ~200ms 抓一帧 + 读 corner-scare state 探针
//      （相位/时间轴/黑影坐标）：现身应贴着拐角外皮绕出、
//      凝视应站定在玩家面前、扑→黑幕→错位醒来应回到巷口
// 用法：SV_SCARE_DIR=/tmp/scare xvfb-run -a npx electron scripts/scare-verify.cjs
// ============================================================

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

const OUT = process.env.SV_SCARE_DIR || '/tmp/scare-verify';
const APPROACH = [9.7, -22.9, 0]; // 触发圈外（离圈心 3.5m > r2.6），面朝拐角
const AT_CORNER = [9.7, -24.9, 0]; // 走到拐角的那一步（入圈）

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 900, show: false, backgroundColor: '#070409',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.once('ready-to-show', () => win.show());

  const deadline = setTimeout(() => {
    console.error('[scare-verify] 超时');
    app.exit(1);
  }, 240000);

  const js = (code) => win.webContents.executeJavaScript(code, true);
  const state = () => js("window.__SV__.eggState('corner-scare')").catch(() => '?');
  const playerAt = () => js('(() => { const p = window.__SV__.player(); return p.x.toFixed(2) + "," + p.z.toFixed(2); })()').catch(() => '?');
  const shot = async (name) => {
    await playerAt(); // JS 往返刷掉软渲染合成器陈旧帧
    const img = await win.webContents.capturePage();
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, name), img.toPNG());
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let phase = 'boot';
  win.webContents.on('console-message', (_e, _l, message) => {
    if (message.includes('[sv] boot-ready')) {
      js("document.getElementById('boot-enter').click()").catch(() => {});
    }
    if (!message.includes('[sv] hall-loaded')) return;
    const hall = message.split(' ').pop();
    if (hall !== 'mulholland') {
      if (phase === 'boot') {
        phase = 'route';
        js("window.__SV__.goTo('mulholland')").catch((err) => {
          console.error('[scare-verify] 装载失败', err);
          app.exit(1);
        });
      }
      return;
    }
    (async () => {
      // ① 圈外一步：黑影必须不可见
      await js(`window.__SV__.teleport(${APPROACH.join(',')})`);
      await sleep(2600); // 软渲染合成器就位
      const s0 = await state();
      console.log(`[scare-verify] 圈外 approach state: ${s0} player=${await playerAt()}`);
      await shot('seq-00-approach.png');
      if (!/phase=0/.test(s0) || !/vis=0/.test(s0)) {
        console.error('[scare-verify] 失败：还没走到拐角就已触发/可见');
        app.exit(1);
      }
      // ② 走到拐角的那一步（入圈）——自然触发，不用 force
      const t0 = Date.now();
      await js(`window.__SV__.teleport(${AT_CORNER.join(',')})`);
      // ③ 逐帧证据
      for (let i = 1; i <= 17; i++) {
        const el = ((Date.now() - t0) / 1000).toFixed(2);
        const st = await state();
        console.log(`[scare-verify] +${el}s state: ${st} player=${await playerAt()}`);
        await shot(`seq-${String(i).padStart(2, '0')}-t${el}.png`);
        await sleep(120);
      }
      const stEnd = await state();
      const pEnd = await playerAt();
      console.log(`[scare-verify] 终态 state: ${stEnd} player=${pEnd}`);
      // 终态校验：序列结束后应已黑幕醒来（相位归 0、黑影不可见、人已被错位传送回巷口）
      const [ex, ez] = pEnd.split(',').map(Number);
      if (!/phase=0/.test(stEnd) || !/vis=0/.test(stEnd) || Math.hypot(ex - 9.7, ez - 9.5) > 0.6) {
        console.error('[scare-verify] 失败：惊吓链未完成或错位传送缺失');
        app.exit(1);
      }
      // ④ 特写肖像：机位放到拐角口 1.4m 处再 force（站位收在拐角枢轴），
      //    凝视拍 + 扑脸拍各抓一帧——核验惨白脸/眼睛/长发的近距可读性
      await js('window.__SV__.teleport(9.3,-25.9,0.58)');
      await sleep(1400); // 合成器就位（巷灯恢复后的稳定帧）
      await js('window.__SV__.triggerEggs().join(",")');
      const p0 = Date.now();
      console.log(`[scare-verify] portrait force: ${await state()}`);
      // 软渲染合成器有陈旧帧：连拍覆盖凝视→扑→黑幕窗口，事后择帧
      for (let i = 1; i <= 7; i++) {
        await shot(`portrait-${i}.png`);
        console.log(`[scare-verify] portrait ${i} @+${((Date.now() - p0) / 1000).toFixed(2)}s: ${await state()}`);
      }
      clearTimeout(deadline);
      console.log('[scare-verify] 通过：圈外不触发 → 拐角即触发 → 全链完成 → 错位醒来于巷口');
      app.exit(0);
    })().catch((err) => {
      console.error('[scare-verify] 异常', err);
      app.exit(1);
    });
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
