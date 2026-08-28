// ============================================================
// main — 启动编排：引擎 / 控制 / 音频 / UI / 展厅装载循环
// 各展厅模块按需动态加载（代码分包 + 懒加载）。
// ============================================================
import { Engine } from './core/engine.js';
import { FirstPersonControls } from './core/controls.js';
import { Hotspots } from './core/hotspots.js';
import { AudioEngine } from './audio/engine.js';
import { UI } from './ui/overlay.js';
import { Narration } from './ui/narration.js';
import { GuestbookStore } from './ui/guestbook-store.js';

const HALLS = {
  lobby: () => import('./halls/lobby.js'),
  archive: () => import('./halls/archive.js'),
  eraserhead: () => import('./halls/eraserhead.js'),
  bluevelvet: () => import('./halls/bluevelvet.js'),
  twinpeaks: () => import('./halls/twinpeaks.js'),
  mulholland: () => import('./halls/mulholland.js'),
  studio: () => import('./halls/studio.js')
};

const bootEl = document.getElementById('boot');
const bootBar = document.getElementById('boot-bar');
const bootBtn = document.getElementById('boot-enter');
const canvas = document.getElementById('stage');
const setProgress = (p) => { bootBar.style.width = `${Math.round(p * 100)}%`; };

// ---------- 子系统 ----------
setProgress(0.08);
let engine;
try {
  engine = new Engine(canvas);
} catch (err) {
  console.error('[sv] webgl-failed', err);
  bootBtn.textContent = '无法创建 WebGL 环境';
  const note = document.createElement('p');
  note.className = 'boot-hint';
  note.textContent = '本展馆需要支持 WebGL 的显卡/驱动。请更新显卡驱动或更换设备后再来。';
  bootBtn.after(note);
  throw err;
}
const audio = new AudioEngine();
const controls = new FirstPersonControls(engine.camera, canvas);
engine.scene.add(controls.yawObject);
// 位置化音效的听者位姿（sfxAt 用它算声像与距离衰减）
audio.setListener(() => ({
  x: controls.yawObject.position.x,
  z: controls.yawObject.position.z,
  yaw: controls.yawObject.rotation.y
}));
const store = new GuestbookStore(window.localStorage);

let narration; // 在 UI 之后构造（相互引用）
const ui = new UI({
  audio,
  store,
  onGoHall: (id) => goTo(id),
  onOpenChange: (open) => {
    controls.enabled = !open && entered;
    if (open) controls.unlock();
  },
  onAct: () => hotspots.activate(),
  onStick: (x, y) => controls.touchMove.set(x, y),
  onToggleMute: () => {
    audio.setMuted(!audio.muted);
    return audio.muted;
  },
  onCycleNarration: () => narration.cycleMode(),
  // v1.14：访谈摘录低语朗读——非人声 MurmurVoice「读」一条摘录
  // （气声音节+静电碎语，永远听不清字）；text=null 即收声
  onMurmurRead: (text) => (text ? narration.murmur.speak(text) : narration.murmur.stop()),
  onToggleQuality: () => {
    autoQ.locked = true; // 玩家手动选择后，自动降档退位
    engine.setQuality(engine.quality === 'high' ? 'low' : 'high');
    return engine.quality;
  }
});
narration = new Narration(ui, audio);
const hotspots = new Hotspots(engine.camera, ui, audio);

document.getElementById('hud').hidden = false;
setProgress(0.25);

// ---------- 展厅装载 ----------
let current = null;       // { id, built, unsubUpdate }
let busy = false;
let entered = false;
const visited = new Set();
const preloaded = {};

async function loadHallModule(id) {
  if (!preloaded[id]) {
    // 动态分包在内存/IO 压力下偶发取失败（慢盘、杀软扫描、软渲染长跑），
    // 指数退避重试三次再放弃
    let lastErr;
    for (let i = 0; i < 3; i++) {
      try {
        preloaded[id] = await HALLS[id]();
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        await sleep(300 * (i + 1) * (i + 1));
      }
    }
    if (lastErr) throw lastErr;
  }
  return preloaded[id];
}

async function goTo(id) {
  if (busy || (current && current.id === id)) return;
  busy = true;
  ui.closeAll();
  ui.hidePlaque();
  ui.fade(true);
  if (current) audio.sfx('whoosh');
  await sleep(650);

  if (current) {
    current.built.onLeave?.();
    current.unsubUpdate();
    hotspots.clear();
    engine.disposeGroup(current.built.group);
    current = null;
  }

  const mod = await loadHallModule(id);
  const built = mod.build({
    engine, audio, ui, hotspots, goTo,
    narration, store,
    player: controls.yawObject.position,
    // 位姿（含朝向）：转身惊吓等机制需要 yaw 角速度
    pose: () => ({
      x: controls.yawObject.position.x,
      z: controls.yawObject.position.z,
      yaw: controls.yawObject.rotation.y
    }),
    teleport: (x, z, yaw) => controls.teleport(x, z, yaw)
  });
  engine.scene.add(built.group);
  engine.setLook(mod.meta.look);
  controls.setBounds(built.bounds);
  controls.teleport(built.spawn.x, built.spawn.z, built.spawn.yaw);
  const unsubUpdate = engine.onUpdate(built.update);
  current = {
    id, built, unsubUpdate,
    floorSfx: mod.meta.floorSfx || 'wood',
    space: mod.meta.space || 'room'
  };

  ui.setHall(mod.meta.name);
  audio.startAmbience(mod.meta.ambience);
  spaceState.cur = null; // 强制下个采样拍刷新混响空间
  ui.fade(false);
  // v1.14：厅可携带异步资产（GLB 分包解析）——等它就位再宣布装载
  // 完成，冒烟的预算/交互普查读到的才是完整场景；8s 兜底不阻塞
  if (built.ready) await Promise.race([built.ready, sleep(8000)]);
  console.log(`[sv] hall-loaded ${id}`);

  // 留白：只在首访、且等你先看一会儿之后，才低声说一句短话
  if (!visited.has(id)) {
    visited.add(id);
    const key = id === 'lobby' && visited.size === 1 ? 'welcome' : mod.meta.narration;
    setTimeout(() => narration.speakKey(key), 2600);
  }
  busy = false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 输入 ----------
canvas.addEventListener('click', (e) => {
  if (!entered || ui.anyOpen) return;
  if (controls.isTouch) {
    hotspots.tap(e.clientX, e.clientY);
  } else if (!controls.locked) {
    controls.requestLock();
  } else {
    hotspots.activate();
  }
});

document.addEventListener('keydown', (e) => {
  if (!entered) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  switch (e.code) {
    case 'KeyE': if (!ui.anyOpen) hotspots.activate(); break;
    case 'KeyL': goTo('lobby'); break;
    case 'KeyT': ui.openTimeline(); break;
    case 'KeyG': ui.openGuestbook(); break;
    case 'KeyC': ui.openLegal(); break;
    case 'KeyH': ui.openHelp(); break;
    case 'KeyM': ui.btnMute.click(); break;
    case 'KeyV': ui.btnNarr.click(); break;
    case 'KeyQ': ui.btnQuality.click(); break;
    case 'KeyF': ui.toggleFps(); break;
    case 'Escape': ui.closeAll(); break;
  }
});

// 控制与 FPS 显示
engine.onUpdate((dt) => {
  controls.update(dt);
  if (!ui.anyOpen) hotspots.update(dt);
});

// 空间混响：每 0.5s 采样一次所在分区（built.spaceAt 若有）→ meta.space，
// 变化时重生成程序化 IR（室内外/瓷砖机房/绒面房间的尾音差异）
const spaceState = { cur: null, t: 0 };
engine.onUpdate((dt) => {
  if (!current) return;
  spaceState.t += dt;
  if (spaceState.t < 0.5) return;
  spaceState.t = 0;
  const p = controls.yawObject.position;
  const want = (current.built.spaceAt && current.built.spaceAt(p.x, p.z)) || current.space;
  if (want !== spaceState.cur) {
    spaceState.cur = want;
    audio.setSpace(want);
  }
});

// 脚步声：按步幅距离触发，左右交替微声像；
// 地面材质 = 厅内分区函数 built.surfaceAt(x,z)（若有）→ meta.floorSfx → wood
const stepState = { prev: null, acc: 0, side: 1 };
engine.onUpdate(() => {
  if (!entered || !current || ui.anyOpen) { stepState.prev = null; return; }
  const p = controls.yawObject.position;
  if (stepState.prev) {
    const d = Math.hypot(p.x - stepState.prev.x, p.z - stepState.prev.z);
    if (d > 1.5) {
      stepState.acc = 0; // 传送不是走路
    } else {
      stepState.acc += d;
      if (stepState.acc >= 0.82) {
        stepState.acc -= 0.82;
        stepState.side = -stepState.side;
        const surf = (current.built.surfaceAt && current.built.surfaceAt(p.x, p.z)) || current.floorSfx;
        audio.sfx(`step-${surf}`, 0.6 + Math.random() * 0.2, stepState.side * 0.12);
      }
    }
  }
  stepState.prev = { x: p.x, z: p.z };
});

// 自动降档保帧（G9）：高档下持续 5s 低于 32fps → 自动切低画质；
// 玩家手动按过 Q 即锁定，尊重玩家的选择
const autoQ = { locked: false, below: 0 };
engine.onUpdate((dt) => {
  if (autoQ.locked || engine.quality !== 'high' || !entered) return;
  if (engine.fps < 32) {
    autoQ.below += dt;
    if (autoQ.below > 5) {
      autoQ.locked = true;
      engine.setQuality('low');
      ui.syncQuality('low');
      ui.caption('帧率偏低，画质已自动降档（Q 可切回）。', 4200);
    }
  } else {
    autoQ.below = Math.max(0, autoQ.below - dt * 0.5);
  }
});
let fpsAcc = 0;
engine.onUpdate((dt) => {
  fpsAcc += dt;
  if (fpsAcc > 0.5) { ui.setFps(engine.fps); fpsAcc = 0; }
});

// ---------- 启动 ----------
(async function boot() {
  try {
    setProgress(0.45);
    await loadHallModule('lobby'); // 预载首个展厅
    setProgress(0.85);
    await sleep(200);
    setProgress(1);
    bootBtn.disabled = false;
    bootBtn.textContent = '掀 开 帷 幕 · ENTER';
    console.log('[sv] boot-ready');
  } catch (err) {
    bootBtn.textContent = '加载失败，请重试';
    console.error(err);
  }
})();

bootBtn.addEventListener('click', async () => {
  if (entered) return;
  entered = true;
  audio.unlock();
  audio.sfx('whoosh');
  narration.applyMode(); // 音频解锁后同步爵士层等模式副作用
  bootEl.classList.add('gone');
  setTimeout(() => bootEl.remove(), 1600);
  engine.start();
  controls.enabled = true;
  await goTo('lobby');
  // 预取其余展厅分包：软渲染/慢盘长跑到第 6/7 厅时，chunk fetch 在内存/IO
  // 压力下偶发失败（退避重试也可能连败）——趁刚进馆的空闲把全部模块拉进缓存，
  // 每 900ms 一个，避免与大厅纹理生成抢 IO；失败留给 goTo 的退避重试兜底
  (async () => {
    for (const id of Object.keys(HALLS)) {
      await sleep(900);
      try { await loadHallModule(id); } catch { /* 见上 */ }
    }
  })();
});

// 调试/冒烟钩子
window.__SV__ = {
  engine, goTo, audio, store, ui,
  narration,
  /** 冒烟测试：引爆当前展厅的全部彩蛋，返回名字列表 */
  triggerEggs: () => {
    if (!current || !current.built.eggs) return [];
    const names = [];
    for (const [name, trig] of Object.entries(current.built.eggs)) {
      trig.force();
      names.push(name);
    }
    return names;
  },
  /** 冒烟测试：当前展厅非导航可交互物件数（门禁 20：nav 门户不计入） */
  countInteractives: () =>
    hotspots.items.filter((m) => !(m.userData.hotspot && m.userData.hotspot.nav)).length,
  /**
   * 冒烟（v1.16 门禁 77）：热点场景归属普查——每个已登记热点的网格
   * 沿 parent 链上溯必须落在 engine.scene 上。防「幽灵交互」：登记了
   * 热点但网格没挂进场景树，玩家永远摸不到，交互计数却照常通过
   * （v1.15 studio 工作桌误删事故的制度化补漏——交互审计从此验归属）。
   * 返回孤儿热点的 hint 列表（空数组 = 全部在场）。
   */
  auditHotspots: () => {
    const orphans = [];
    for (const m of hotspots.items) {
      let node = m;
      while (node.parent) node = node.parent;
      if (node !== engine.scene) {
        orphans.push((m.userData.hotspot && m.userData.hotspot.hint) || m.name || '(unnamed)');
      }
    }
    return orphans;
  },
  /** 冒烟/截屏：瞬移到指定位置（视觉复核各分区用） */
  teleport: (x, z, yaw) => controls.teleport(x, z, yaw),
  /** 冒烟/截屏：当前展厅 id（SV_SHOT_PRE 按厅分机位用） */
  hall: () => (current ? current.id : null),
  /** 冒烟/截屏：读回当前机位（诊断瞬移是否被回弹；v1.14 +yaw） */
  player: () => ({
    x: controls.yawObject.position.x,
    z: controls.yawObject.position.z,
    yaw: controls.yawObject.rotation.y
  }),
  /**
   * 冒烟（v1.7 门禁 40）：模拟「猛回头」——瞬间转过 rad 弧度。
   * 转身触发器在下一渲染帧会看到这次 yaw 突变（等价于真人
   * 半秒内甩头 180°），像真玩家一样自然触发惊吓。
   */
  spinYaw: (rad = Math.PI) => {
    controls.yawObject.rotation.y += rad;
    return controls.yawObject.rotation.y;
  },
  /**
   * 冒烟（v1.6 门禁 37）：把真实玩家沿路点逐帧「走」过去——每步 7cm、
   * 每步过当前展厅的 bounds 钳制，不瞬移不作弊。撞墙走不到即 ok:false。
   * 终点若落在区域触发器内，下一渲染帧会像真人走进去一样自然触发。
   */
  walkPath: (waypoints, speed = 4.2) => {
    if (!current) return { ok: false, reason: 'no-hall' };
    const p = controls.yawObject.position;
    const dt = 1 / 60;
    for (const [wx, wz] of waypoints) {
      let guard = 0;
      while (Math.hypot(wx - p.x, wz - p.z) > 0.3) {
        if (++guard > 2600) {
          return { ok: false, x: +p.x.toFixed(2), z: +p.z.toFixed(2), target: [wx, wz] };
        }
        const dx = wx - p.x;
        const dz = wz - p.z;
        const d = Math.hypot(dx, dz) || 1;
        p.x += (dx / d) * speed * dt;
        p.z += (dz / d) * speed * dt;
        // 真人往哪走脸就朝哪（yaw 0 → -z）：拐角/转身触发器读到的
        // 是行走朝向，而不是上一次瞬移/截屏留下的残留视角
        controls.yawObject.rotation.y = Math.atan2(-dx / d, -dz / d);
        if (current.built.bounds) current.built.bounds(p);
      }
    }
    controls.velocity.set(0, 0, 0);
    return { ok: true, x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  },
  /** 冒烟测试：逐一激活当前展厅全部非导航交互（onActivate 链不得抛错），返回激活数 */
  activateAll: () => {
    let n = 0;
    for (const m of hotspots.items) {
      const h = m.userData.hotspot;
      if (!h || h.nav) continue;
      h.onActivate();
      n += 1;
    }
    ui.closeAll();
    return n;
  },
  /**
   * 冒烟/截屏（v1.11）：按 hint 片段激活单个热点（如截屏前先拉帘/
   * 开盖，把「交互后的状态」摆进镜头）。返回是否命中。
   */
  activateByHint: (sub) => {
    for (const m of hotspots.items) {
      const h = m.userData.hotspot;
      if (!h || h.nav || !h.hint || !h.hint.includes(sub)) continue;
      h.onActivate();
      return true;
    }
    return false;
  },
  version: '1.20.0'
};
