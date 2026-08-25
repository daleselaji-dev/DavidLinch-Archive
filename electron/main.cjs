'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// --smoke: 无头自动化冒烟模式（CI/无GPU环境用软件渲染验证运行时）
const SMOKE = process.argv.includes('--smoke');
if (SMOKE) {
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
}

function createWindow() {
  // SV_WIN_SIZE=WxH 供窄屏冒烟/截图验证
  const sizeEnv = /^(\d+)x(\d+)$/.exec(process.env.SV_WIN_SIZE || '');
  const win = new BrowserWindow({
    width: sizeEnv ? Number(sizeEnv[1]) : 1440,
    height: sizeEnv ? Number(sizeEnv[2]) : 900,
    minWidth: 360,
    minHeight: 560,
    show: false,
    backgroundColor: '#070409',
    autoHideMenuBar: true,
    title: 'SMOKE & VELVET — Lynch Memorial Archive (Unofficial Fan Tribute)',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());

  // External links go to the system browser, never inside the app shell.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (SMOKE) {
    // 依次巡检全部展厅，任何一个装载失败/超时即失败退出
    const queue = ['archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland'];
    const deadline = setTimeout(() => {
      console.error('[smoke] 超时：展厅巡检未完成');
      app.exit(1);
    }, 150000);
    win.webContents.on('console-message', (_e, _level, message) => {
      if (message.includes('[sv] boot-ready')) {
        win.webContents.executeJavaScript(
          "document.getElementById('boot-enter').click()", true
        ).catch(() => {});
      }
      if (message.includes('[sv] hall-loaded')) {
        const hall = message.split(' ').pop();
        console.log(`[smoke] 展厅装载 OK: ${hall}`);
        // 输出场景统计（性能门禁证据: 网格数≈draw calls 上限 / 三角面）
        win.webContents.executeJavaScript(
          `(() => {
            let meshes = 0, tris = 0;
            window.__SV__.engine.scene.traverse((o) => {
              if (o.isMesh || o.isPoints) {
                meshes++;
                const g = o.geometry;
                const c = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
                tris += o.isInstancedMesh ? c * o.count : c;
              }
            });
            return 'meshes=' + meshes + ' tris=' + Math.round(tris);
          })()`, true
        ).then((s) => console.log(`[smoke] 场景统计 ${hall}: ${s}`)).catch(() => {});
        const proceed = () => {
          const next = queue.shift();
          if (next) {
            win.webContents.executeJavaScript(`window.__SV__.goTo('${next}')`, true).catch(() => {});
          } else {
            // 六厅巡检完毕 → UI 交互冒烟（面板/年表/留言墙/合规页/发帖闭环）
            const uiScript = `(() => {
              const u = window.__SV__.ui;
              u.openTimeline(); u.closeModal('timeline');
              u.openGuestbook(); u.closeModal('guestbook');
              u.openLegal(); u.closeModal('legal');
              u.openHelp(); u.closeModal('help');
              u.showFilm('mulholland-drive'); u.showEssay('method'); u.showArtist(); u.closeAll();
              const s = window.__SV__.store;
              const p = s.addPost('冒烟机器人', '运行时冒烟测试留言');
              s.toggleLike(p.id); s.reply(p.id, '机器人', '自动回复');
              if (!s.list().find((x) => x.id === p.id).replies.length) throw new Error('留言闭环失败');
              return 'ui-ok';
            })()`;
            win.webContents.executeJavaScript(uiScript, true).then((r) => {
              clearTimeout(deadline);
              console.log(`[smoke] UI 交互冒烟: ${r}`);
              console.log('[smoke] 运行时冒烟通过：启动 → 六厅装载 → UI 交互全部完成');
              app.exit(0);
            }).catch((err) => {
              clearTimeout(deadline);
              console.error('[smoke] UI 冒烟失败', err);
              app.exit(1);
            });
          }
        };
        // SV_SHOT_DIR: 可选，装载后为每厅截屏（视觉自检用）
        const shotDir = process.env.SV_SHOT_DIR;
        if (shotDir) {
          setTimeout(async () => {
            try {
              const img = await win.webContents.capturePage();
              require('fs').writeFileSync(require('path').join(shotDir, `${hall}.png`), img.toPNG());
              console.log(`[smoke] 截屏: ${hall}.png`);
            } catch (err) {
              console.error('[smoke] 截屏失败', err);
            }
            proceed();
          }, 3500);
        } else {
          proceed();
        }
      }
      if (message.includes('[sv] webgl-failed') || message.toLowerCase().includes('uncaught')) {
        clearTimeout(deadline);
        console.error(`[smoke] 渲染进程错误: ${message}`);
        app.exit(1);
      }
    });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
