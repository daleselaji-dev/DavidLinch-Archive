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
    // SV_SMOKE_QUEUE=a,b,c 可覆盖巡检顺序（调试单厅用）
    const queue = process.env.SV_SMOKE_QUEUE
      ? process.env.SV_SMOKE_QUEUE.split(',')
      : ['archive', 'eraserhead', 'bluevelvet', 'studio', 'twinpeaks', 'mulholland'];
    // v1.3 三通道程序纹理生成 + swiftshader 软渲染较慢，巡检上限放宽
    const deadline = setTimeout(() => {
      console.error('[smoke] 超时：展厅巡检未完成');
      app.exit(1);
    }, 300000);
    let shotCount = 0;
    win.webContents.on('console-message', (_e, _level, message) => {
      if (message.includes('[sv] boot-ready')) {
        win.webContents.executeJavaScript(
          "document.getElementById('boot-enter').click()", true
        ).catch(() => {});
      }
      if (message.includes('[sv] hall-loaded')) {
        const hall = message.split(' ').pop();
        console.log(`[smoke] 展厅装载 OK: ${hall}`);
        // 输出场景统计并校验性能预算（QUALITY_GATES 22 / v1.4 门禁 30：
        // PS5-tier 预算按 PRODUCTION_PLAN §6 上调至
        // meshes ≤ 240 / tris ≤ 240k / 动态光源 ≤ 40，仍为硬门禁）
        const MESH_BUDGET = 240;
        const TRI_BUDGET = 240000;
        const LIGHT_BUDGET = 40;
        win.webContents.executeJavaScript(
          `(() => {
            let meshes = 0, tris = 0, lights = 0;
            window.__SV__.engine.scene.traverse((o) => {
              if (o.isMesh || o.isPoints) {
                meshes++;
                const g = o.geometry;
                const c = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
                tris += o.isInstancedMesh ? c * o.count : c;
              }
              if (o.isLight && !o.isAmbientLight) lights++;
            });
            return 'meshes=' + meshes + ' tris=' + Math.round(tris) + ' lights=' + lights;
          })()`, true
        ).then((s) => {
          console.log(`[smoke] 场景统计 ${hall}: ${s}`);
          const m = /meshes=(\d+) tris=(\d+) lights=(\d+)/.exec(s);
          if (m && (Number(m[1]) > MESH_BUDGET || Number(m[2]) > TRI_BUDGET || Number(m[3]) > LIGHT_BUDGET)) {
            console.error(`[smoke] 性能预算超标 ${hall}: ${s} (预算 meshes≤${MESH_BUDGET} tris≤${TRI_BUDGET} lights≤${LIGHT_BUDGET})`);
            app.exit(1);
          }
        }).catch(() => {});
        // 交互密度门禁（QUALITY_GATES 20 / v1.4 门禁 28）：每厅非导航可交互物 ≥ 阈值，
        // 且逐一激活（onActivate 全链无异常）后才放行去下一厅。
        // v1.5 减法：主动去掉清单打卡式交互（大厅伞架/烟灰缸/围栏、
        // 双峰缺角派、蓝丝绒杯架）——阈值随普查下调是「有意的减」，
        // 但仍锁普查-1 防继续流失
        const INTERACTIVE_MIN = {
          lobby: 9, archive: 23, eraserhead: 16, bluevelvet: 14,
          twinpeaks: 16, mulholland: 15, studio: 17
        };
        const interactiveCheck = win.webContents.executeJavaScript(
          'window.__SV__.countInteractives()', true
        ).then((n) => {
          const min = INTERACTIVE_MIN[hall] ?? 8;
          console.log(`[smoke] 可交互物 ${hall}: ${n} (阈值 ≥${min})`);
          if (Number(n) < min) {
            console.error(`[smoke] 交互密度不足 ${hall}: ${n} < ${min}`);
            app.exit(1);
          }
        }).catch((err) => {
          console.error(`[smoke] 交互检查失败 ${hall}: ${err && err.message}`);
          app.exit(1);
        });
        // v1.6 门禁 37：穆赫兰道后巷通路走通性 + 惊吓自然触发断言。
        // walkPath 把真实玩家逐帧走过 路→右侧便道→票亭转角→暗巷→背后空地，
        // 全程被 bounds 钳制（撞墙即失败）；终点落在触发圈内，下一帧惊吓
        // 自然引爆，2.9s 后空间错位应把玩家移回巷口 (9.7, 9.5)。
        const maybeWalkTest = (done) => {
          if (hall !== 'mulholland') { done(); return; }
          const route = JSON.stringify([[2, -8], [6.5, -11], [9.3, -12.8], [9.3, -29.5], [2.0, -30.3]]);
          win.webContents.executeJavaScript(`window.__SV__.walkPath(${route})`, true).then((r) => {
            console.log(`[smoke] 后巷走通性 mulholland: ${JSON.stringify(r)}`);
            if (!r || !r.ok) {
              console.error('[smoke] 后巷通路不通：玩家撞墙走不到惊吓触发点');
              app.exit(1);
              return;
            }
            const t0 = Date.now();
            const poll = () => {
              win.webContents.executeJavaScript(
                '(() => { const p = window.__SV__.player(); return p.x.toFixed(1) + "," + p.z.toFixed(1); })()', true
              ).then((at) => {
                if (at === '9.7,9.5') {
                  console.log('[smoke] 惊吓自然触发 OK：走进触发圈 → 空间错位移回巷口 (9.7,9.5)');
                  setTimeout(done, 1600); // 等惊吓状态机归零再做全量激活
                } else if (Date.now() - t0 > 9000) {
                  console.error(`[smoke] 走进触发圈后惊吓未完成（机位 ${at}，期望 9.7,9.5）`);
                  app.exit(1);
                } else {
                  setTimeout(poll, 500);
                }
              }).catch((err) => {
                console.error('[smoke] 后巷断言失败', err && err.message ? err.message : err);
                app.exit(1);
              });
            };
            setTimeout(poll, 800);
          }).catch((err) => {
            console.error('[smoke] walkPath 执行失败', err && err.message ? err.message : err);
            app.exit(1);
          });
        };
        const proceed = () => {
          // 全量交互激活 → 彩蛋触发（都放在截屏之后，避免反转/熄灯污染画面存档）
          win.webContents.executeJavaScript(
            'window.__SV__.activateAll()', true
          ).then((n) => {
            console.log(`[smoke] 交互激活 ${hall}: ${n} 个 onActivate 全部无异常`);
            return win.webContents.executeJavaScript('window.__SV__.triggerEggs().join(",") || "none"', true);
          }).then((names) => console.log(`[smoke] 彩蛋触发 ${hall}: ${names}`)).catch((err) => {
            console.error(`[smoke] 交互激活/彩蛋触发失败 ${hall}`, err && err.message ? err.message : err);
            app.exit(1);
          });
          const next = queue.shift();
          if (next) {
            win.webContents.executeJavaScript(`window.__SV__.goTo('${next}')`, true).catch((err) => {
              console.error(`[smoke] 展厅装载异常 ${next}:`, err && err.message ? err.message : err);
              app.exit(1);
            });
          } else {
            // 七厅巡检完毕 → UI 交互冒烟（面板/年表/留言墙/合规页/发帖闭环/旁白模式循环）
            const uiScript = `(() => {
              const u = window.__SV__.ui;
              u.openTimeline(); u.closeModal('timeline');
              u.openGuestbook(); u.closeModal('guestbook');
              u.openLegal(); u.closeModal('legal');
              u.openHelp(); u.closeModal('help');
              u.showFilm('mulholland-drive'); u.showQuotes(); u.showArtist(); u.closeAll();
              const s = window.__SV__.store;
              const p = s.addPost('冒烟机器人', '运行时冒烟测试留言');
              s.toggleLike(p.id); s.reply(p.id, '机器人', '自动回复');
              if (!s.list().find((x) => x.id === p.id).replies.length) throw new Error('留言闭环失败');
              // 旁白模式全循环：letters → murmur(低语) → jazz(爵士层) → off → letters
              const n = window.__SV__.narration;
              const seen = [];
              for (let i = 0; i < 4; i++) seen.push(n.cycleMode().id);
              if (!seen.includes('murmur') || !seen.includes('jazz') || !seen.includes('off')) {
                throw new Error('旁白模式循环缺项: ' + seen.join(','));
              }
              // 低语模式在音频总线上安全（speak/stop 不抛错）
              n.setMode('murmur');
              n.speak('低语冒烟测试。');
              n.stop();
              n.setMode('jazz');
              if (!n.jazz.playing) throw new Error('爵士氛围层未启动');
              n.setMode('letters');
              if (n.jazz.playing) throw new Error('爵士氛围层未随模式关闭');
              n.speak('字母显现冒烟测试。');
              if (!n.letters.active) throw new Error('字母显现未激活');
              n.stop();
              return 'ui-ok narration-modes=' + seen.join(',');
            })()`;
            win.webContents.executeJavaScript(uiScript, true).then((r) => {
              clearTimeout(deadline);
              console.log(`[smoke] UI 交互冒烟: ${r}`);
              console.log('[smoke] 运行时冒烟通过：启动 → 七厅装载 → 后巷走通+惊吓自然触发 → 彩蛋触发 → UI/旁白交互全部完成');
              app.exit(0);
            }).catch((err) => {
              clearTimeout(deadline);
              console.error('[smoke] UI 冒烟失败', err);
              app.exit(1);
            });
          }
        };
        // SV_SHOT_DIR: 可选，装载后为每厅截屏（视觉自检用）
        // SV_SHOT_DELAY: 截屏前等待毫秒数（软件渲染合成器有延迟时调大）
        // SV_SHOT_POS: 可选 "x,z,yaw" —— 截屏前瞬移（复核厅内分区）
        // 顺序：交互密度检查 → （瞬移 + 截屏）→ 全量激活 + 彩蛋 → 下一厅
        const shotDir = process.env.SV_SHOT_DIR;
        // 首厅截屏额外加等：开场淡入 + 空闲预取 6 个分包在软渲染下会占满
        // 合成器数秒，3.5s 默认延迟会拍到全黑首帧（后续厅无预取压力不受影响）
        const firstShotExtra = shotCount === 0 ? 5500 : 0;
        shotCount += 1;
        interactiveCheck.then(() => {
          if (shotDir) {
            const pos = (process.env.SV_SHOT_POS || '').split(',').map(Number);
            if (pos.length === 3 && pos.every((v) => Number.isFinite(v))) {
              win.webContents.executeJavaScript(
                `window.__SV__.teleport(${pos[0]}, ${pos[1]}, ${pos[2]})`, true
              ).then(
                () => console.log(`[smoke] 瞬移 ${hall}: ${pos.join(',')}`),
                (err) => console.error(`[smoke] 瞬移失败 ${hall}:`, err && err.message ? err.message : err)
              );
            }
            setTimeout(async () => {
              try {
                const at = await win.webContents.executeJavaScript(
                  '(() => { const p = window.__SV__.player(); return p.x.toFixed(1) + "," + p.z.toFixed(1); })()', true
                ).catch(() => '?');
                console.log(`[smoke] 截屏机位 ${hall}: ${at}`);
                const img = await win.webContents.capturePage();
                require('fs').mkdirSync(shotDir, { recursive: true });
                require('fs').writeFileSync(require('path').join(shotDir, `${hall}.png`), img.toPNG());
                console.log(`[smoke] 截屏: ${hall}.png`);
              } catch (err) {
                console.error('[smoke] 截屏失败', err);
              }
              maybeWalkTest(proceed);
            }, Number(process.env.SV_SHOT_DELAY || 3500) + firstShotExtra);
          } else {
            maybeWalkTest(proceed);
          }
        });
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
