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
  mulholland: () => import('./halls/mulholland.js')
};

const bootEl = document.getElementById('boot');
const bootBar = document.getElementById('boot-bar');
const bootBtn = document.getElementById('boot-enter');
const canvas = document.getElementById('stage');
const setProgress = (p) => { bootBar.style.width = `${Math.round(p * 100)}%`; };

// ---------- 子系统 ----------
setProgress(0.08);
const engine = new Engine(canvas);
const audio = new AudioEngine();
const controls = new FirstPersonControls(engine.camera, canvas);
engine.scene.add(controls.yawObject);
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
  onToggleNarration: () => {
    narration.setEnabled(!narration.enabled);
    return narration.enabled;
  },
  onToggleQuality: () => {
    engine.setQuality(engine.quality === 'high' ? 'low' : 'high');
    return engine.quality;
  }
});
narration = new Narration(ui);
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
  if (!preloaded[id]) preloaded[id] = await HALLS[id]();
  return preloaded[id];
}

async function goTo(id) {
  if (busy || (current && current.id === id)) return;
  busy = true;
  ui.closeAll();
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
  const built = mod.build({ engine, audio, ui, hotspots, goTo });
  engine.scene.add(built.group);
  engine.setLook(mod.meta.look);
  controls.setBounds(built.bounds);
  controls.teleport(built.spawn.x, built.spawn.z, built.spawn.yaw);
  const unsubUpdate = engine.onUpdate(built.update);
  current = { id, built, unsubUpdate };

  ui.setHall(mod.meta.name);
  audio.startAmbience(mod.meta.ambience);
  ui.fade(false);

  if (!visited.has(id)) {
    visited.add(id);
    const key = id === 'lobby' && visited.size === 1 ? 'welcome' : mod.meta.narration;
    setTimeout(() => narration.speakKey(key), 900);
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
  bootEl.classList.add('gone');
  setTimeout(() => bootEl.remove(), 1600);
  engine.start();
  controls.enabled = true;
  await goTo('lobby');
});

// 调试/冒烟钩子
window.__SV__ = { engine, goTo, audio, store, version: '1.0.0' };
