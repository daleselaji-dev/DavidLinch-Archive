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
        // 交互密度门禁（QUALITY_GATES 20 / v1.4 门禁 28 / v1.7 门禁 42 / v1.9 门禁 48）：
        // 每厅非导航可交互物 ≥ 阈值，且逐一激活（onActivate 全链无异常）
        // 后才放行去下一厅。v1.9 阶段 2 七厅两件后重锁普查-1：
        // 普查 16/26/19/17/20/19/20 = 137（长明灯/束带/落地灯拉链/柴堆/
        // 歪瓷碗/衣帽间/蒸汽立管/擦痕/铅笔刀/表盘/阀牌/放大镜/检修牌…）
        // v1.10 阶段 3 重锁：普查 18/29/23/19/21/21/25 = 156，阈值 = 普查 -1
        // v1.11 阶段 4 重锁：普查 18/30/25/20/22/21/26 = 162（七件彩蛋中带热点者
        // +6：缠布/焦球/首饰盒/椅臂杯/小门/灯牌接骨——过影无热点），阈值 = 普查 -1
        const INTERACTIVE_MIN = {
          lobby: 17, archive: 29, eraserhead: 24, bluevelvet: 19,
          twinpeaks: 21, mulholland: 20, studio: 25
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
        // v1.6 门禁 37 / v1.7 门禁 40 / v1.8 门禁 44：穆赫兰道后巷通路
        // 走通性 + 两重惊吓自然触发断言。
        // ① 拐角惊吓（v1.8 主触发）：walkPath 把真实玩家逐帧走过
        //    路→右侧便道→票亭转角→暗巷（停在拐角触发区北缘外），再一步
        //    走进拐角区——南行朝向天然落在「垃圾箱·后门」视锥内，
        //    cornerTrigger 在下一渲染帧自然引爆多幕序列（实时钟 ~6.5s），
        //    空间错位应把玩家移回巷口 (9.7, 9.5)。
        // ② 转身惊吓（v1.7 保留第二扳机）：再走到空地站定点，站定
        //    1.6s（> armTime 上膛）后 spinYaw(π) 模拟猛回头——turnTrigger
        //    看到 yaw 突变即自然引爆，同样移回巷口。拐角触发器 75s
        //    冷却（游戏时钟）保证第二段路过拐角区不复触发。
        const pollUntilWake = (label, budgetMs, onWake, onTick) => {
          const t0 = Date.now();
          const poll = () => {
            win.webContents.executeJavaScript(
              '(() => { const p = window.__SV__.player(); return p.x.toFixed(1) + "," + p.z.toFixed(1); })()', true
            ).then((at) => {
              if (at === '9.7,9.5') {
                onWake();
              } else if (Date.now() - t0 > budgetMs) {
                console.error(`[smoke] ${label} 未完成（机位 ${at}，期望 9.7,9.5）`);
                app.exit(1);
              } else {
                if (onTick) onTick();
                setTimeout(poll, 500);
              }
            }).catch((err) => {
              console.error(`[smoke] ${label} 断言失败`, err && err.message ? err.message : err);
              app.exit(1);
            });
          };
          setTimeout(poll, 800);
        };
        const maybeWalkTest = (done) => {
          if (hall !== 'mulholland') { done(); return; }
          // v1.12：截屏机位（SV_SHOT_POS/SV_SHOT_PRE）可能把玩家留在任意
          // 分区（如剧场背后空地）——走测先定点回街口再起步；门禁验证的
          // 是「巷道走通性 + 拐角自然触发」，与截屏残留位置解耦
          // ① 走到拐角触发区北缘外一步（v1.12 贴角化：zone 圆心 9.3,-27.2
          //    r1.15 → 北缘 z≈-26.05，距拐角沿 z≈-26.7 仅 0.65m）
          const routeA = JSON.stringify([[2, -8], [6.5, -11], [9.3, -12.8], [9.3, -24.6]]);
          win.webContents.executeJavaScript(
            `window.__SV__.teleport(2, -8, Math.PI), window.__SV__.walkPath(${routeA})`, true
          ).then((rA) => {
            console.log(`[smoke] 后巷走通性（至拐角前）mulholland: ${JSON.stringify(rA)}`);
            if (!rA || !rA.ok) {
              console.error('[smoke] 后巷通路不通：玩家撞墙走不到拐角');
              app.exit(1);
              return;
            }
            // 再一步走进拐角区（面朝南——垃圾箱·后门方向在视锥内），
            // 下一渲染帧 cornerTrigger 自然引爆（不靠 triggerEggs 强制）
            win.webContents.executeJavaScript('window.__SV__.walkPath([[9.3, -27.2]])', true).then((rB) => {
              if (!rB || !rB.ok) {
                console.error('[smoke] 走进拐角触发区失败');
                app.exit(1);
                return;
              }
              console.log('[smoke] 已走进拐角触发区：等待拐角惊吓多幕序列自然触发…');
              // SV_SCARE_SHOT: 可选，惊吓多幕序列连拍捕帧（视觉证据）。
              // 软渲染下扳机在进区后的下一渲染帧引爆（~0.4–1.2s 漂移），
              // 单点必踩空——从 3s 起每 0.8s 连拍 6 帧覆盖顿挪→扑近→冲击窗
              const scareDir = process.env.SV_SCARE_SHOT;
              if (scareDir) {
                for (let si = 0; si < 14; si++) {
                  setTimeout(async () => {
                    try {
                      const img = await win.webContents.capturePage();
                      require('fs').mkdirSync(scareDir, { recursive: true });
                      require('fs').writeFileSync(require('path').join(scareDir, `scare-${String(si).padStart(2, '0')}.png`), img.toPNG());
                      console.log(`[smoke] 惊吓捕帧: scare-${si}.png`);
                    } catch (err) {
                      console.error('[smoke] 惊吓捕帧失败', err);
                    }
                  }, 2200 + si * 800);
                }
              }
              // 多幕序列 later 链按实时钟走（~6.5s）+ 软渲染冗余 → 预算 40s
              pollUntilWake('拐角惊吓', 40000, () => {
                console.log('[smoke] 拐角惊吓自然触发 OK：转过拐角 → 灯闪/刮擦/心跳 → 留白 → 顿挪现身 → 扑近 → 空间错位移回巷口 (9.7,9.5)');
                setTimeout(turnScareTest, 1600); // 等状态机归零再测第二扳机
              });
            }).catch((err) => {
              console.error('[smoke] walkPath(拐角) 执行失败', err && err.message ? err.message : err);
              app.exit(1);
            });
          }).catch((err) => {
            console.error('[smoke] walkPath 执行失败', err && err.message ? err.message : err);
            app.exit(1);
          });
          // ② v1.7 转身惊吓保留断言：走到空地站定点 → 站定上膛 → 猛回头。
          // 站定上膛（armTime 1s 按游戏时钟计；swiftshader ≈1–2.5fps 且
          // dt 钳 0.1s → 游戏时间只有真实时间的 1/4~1/10）。每 3s 甩一次头，
          // 等 dwell 追上 armTime 那一甩即自然引爆；预算 40s。
          const turnScareTest = () => {
            const routeC = JSON.stringify([[9.3, -12.8], [9.3, -29.5], [2.0, -30.3]]);
            win.webContents.executeJavaScript(`window.__SV__.walkPath(${routeC})`, true).then((rC) => {
              console.log(`[smoke] 后巷走通性（至空地站定点）mulholland: ${JSON.stringify(rC)}`);
              if (!rC || !rC.ok) {
                console.error('[smoke] 后巷通路不通：玩家撞墙走不到空地站定点');
                app.exit(1);
                return;
              }
              const spin = () =>
                win.webContents.executeJavaScript('window.__SV__.spinYaw(Math.PI)', true).then(() => {
                  console.log('[smoke] 模拟猛回头 spinYaw(π)：等待转身惊吓自然触发…');
                }).catch((err) => {
                  console.error('[smoke] spinYaw 执行失败', err && err.message ? err.message : err);
                  app.exit(1);
                });
              setTimeout(() => {
                spin();
                let lastSpin = Date.now();
                pollUntilWake('转身惊吓', 40000, () => {
                  console.log('[smoke] 转身惊吓自然触发 OK：空地站定 → 猛回头 → 冲脸 → 空间错位移回巷口 (9.7,9.5)');
                  setTimeout(done, 1600); // 等惊吓状态机归零再做全量激活
                }, () => {
                  if (Date.now() - lastSpin > 3000) {
                    lastSpin = Date.now();
                    spin();
                  }
                });
              }, 4000);
            }).catch((err) => {
              console.error('[smoke] walkPath(空地) 执行失败', err && err.message ? err.message : err);
              app.exit(1);
            });
          };
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
        // SV_SHOT_LOW: 可选 "1" —— 截屏前切低画质档（低档退化视觉点验）
        // 顺序：交互密度检查 → （瞬移 + 截屏）→ 全量激活 + 彩蛋 → 下一厅
        // SV_OPEN_SHOT: 可选，开幕点灯序列连拍（仅首厅装载）。软渲染
        // 合成器前 ~6.5s 是黑窗（淡入 + 预取占满），可见进程被压缩在
        // 约 7–10s——6.6s 起每 0.4s 连拍 10 帧覆盖第 0 拍 → 吊灯错拍 →
        // 尘埃醒来收口
        const openDir = process.env.SV_OPEN_SHOT;
        if (openDir && shotCount === 0) {
          for (let oi = 0; oi < 10; oi++) {
            setTimeout(async () => {
              try {
                const img = await win.webContents.capturePage();
                require('fs').mkdirSync(openDir, { recursive: true });
                require('fs').writeFileSync(require('path').join(openDir, `open-${String(oi).padStart(2, '0')}.png`), img.toPNG());
                console.log(`[smoke] 开幕捕帧: open-${oi}.png`);
              } catch (err) {
                console.error('[smoke] 开幕捕帧失败', err);
              }
            }, 6600 + oi * 400);
          }
        }
        const shotDir = process.env.SV_SHOT_DIR;
        if (shotDir && process.env.SV_SHOT_LOW === '1') {
          win.webContents.executeJavaScript(
            "window.__SV__.engine.setQuality('low')", true
          ).then(
            () => console.log(`[smoke] 低画质档已切换 ${hall}`),
            () => {}
          );
        }
        // 首厅截屏额外加等：开场淡入 + 空闲预取 6 个分包在软渲染下会占满
        // 合成器数秒，3.5s 默认延迟会拍到全黑首帧（后续厅无预取压力不受影响）
        const firstShotExtra = shotCount === 0 ? 5500 : 0;
        shotCount += 1;
        interactiveCheck.then(() => {
          if (shotDir) {
            // SV_SHOT_PRE: 可选，截屏前在页面执行一段 JS（如先拉帘/开盖，
            // 把交互后的状态摆进镜头；配合 __SV__.activateByHint 使用）
            const pre = process.env.SV_SHOT_PRE;
            if (pre) {
              win.webContents.executeJavaScript(pre, true).then(
                (r) => console.log(`[smoke] 截屏前置脚本 ${hall}: ${JSON.stringify(r)}`),
                (err) => console.error(`[smoke] 截屏前置脚本失败 ${hall}:`, err && err.message ? err.message : err)
              );
            }
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
