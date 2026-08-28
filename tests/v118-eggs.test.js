import { describe, it, expect } from 'vitest';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { INTERVIEWS, INTERVIEW_THEMES } from '../src/data/interviews.js';
import { QUOTES } from '../src/data/essays.js';
import { GuestbookStore } from '../src/ui/guestbook-store.js';

// ============================================================
// v1.18 门禁 86/87/88/89：卡片柜抽屉阵 GLB 收官落 archive +
// 「卡死的抽屉」交互（音色 98）+ 回声窗一句暗示 + 访谈四主题齐涨
// + GLB 轴收官转维护
// 口径（对齐 GOAL_HANDOFF 第 6 轮优先项）：
//   · 第 7 件二选一落 archive（212 余量最大）；落厅后 GLB 轴收官
//     转维护——七件全数在 blender:check、六处落厅钉死、studio
//     空位刻意留白，不为「每轮一件」松贴顶红线；
//   · INTERACTIVE_MIN 刹车只为收官件开一格（archive 35→36），
//     其余六厅与 v1.16/v1.17 口径逐厅相等；
//   · 收官件带一件交互 → 一件新音色合理（97→98，STYLE_AUDIT §8
//     观察点 4：不必为守恒而守恒）；
//   · 回声窗可发现性：留言簿一句访客口吻暗示，禁 UI 提示。
// ============================================================

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = {
  lobby: read('src/halls/lobby.js'),
  archive: read('src/halls/archive.js'),
  eraserhead: read('src/halls/eraserhead.js'),
  bluevelvet: read('src/halls/bluevelvet.js'),
  twinpeaks: read('src/halls/twinpeaks.js'),
  mulholland: read('src/halls/mulholland.js'),
  studio: read('src/halls/studio.js'),
  props: read('src/halls/props.js'),
  engine: read('src/audio/engine.js'),
  guestbook: read('src/ui/guestbook-store.js'),
  main: read('src/main.js'),
  cjs: read('electron/main.cjs'),
  check: read('scripts/blender-check.js')
};

describe('v1.18 门禁 86：卡片柜抽屉阵 GLB 落档案廊（Blender 管线第 7 件·收官件）', () => {
  it('GLB 在库且守体积纪律（≤300KB）', () => {
    const size = statSync(new URL('../src/assets/card_catalog.glb', import.meta.url)).size;
    expect(size).toBeLessThanOrEqual(300 * 1024);
  });

  it('落厅红线：收官件落 archive——tp/mull 贴顶禁入、era 每厅 ≤1、studio 空位留白', () => {
    expect(SRC.archive).toContain("from '../assets/card_catalog.glb?inline'");
    for (const hall of ['twinpeaks', 'mulholland', 'eraserhead', 'studio']) {
      expect(SRC[hall], `${hall} 禁落本件 GLB`).not.toContain('card_catalog.glb');
    }
  });

  it('ready 承诺 + glb-landed 信号 + 装载闭环（厅等抽屉阵就位）', () => {
    expect(SRC.archive).toContain('const cardArrayReady = new Promise');
    expect(SRC.archive).toContain('glb-landed archive catalog');
    expect(SRC.archive).toContain('glb-failed archive catalog');
    expect(SRC.archive).toContain('ready: cardArrayReady');
  });

  it('仅换网格保留程序化动画：可拉抽屉原件不动，三张静态阵网格退场（几何释放/光晕留任）', () => {
    // props 暴露换接句柄（faces/brass/worn 三张——halo 刻意不进表：手汗不随网格走）
    expect(SRC.props).toContain('g.userData.faceArray = { faces: facesMesh, brass: brassMesh, worn: wornMesh };');
    // 落厅回调按句柄退场且只释放几何（warmWood/brass 共享材质留任）
    const at = SRC.archive.indexOf('const fa = mainCab.userData.faceArray;');
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.archive.slice(at, at + 400);
    expect(seg).toContain("for (const key of ['faces', 'brass', 'worn'])");
    expect(seg).toContain('fa[key].geometry.dispose();');
    expect(seg, '共享材质不许随退场释放').not.toContain('material.dispose');
    // 可拉抽屉的拉开动画一行不动（程序化原件）
    expect(SRC.archive).toContain('cab.userData.drawer.position.z = closedZ + state.open * 0.26;');
  });

  it('材质由运行时整套重设（GLB 只带几何/命名/COLOR_0——七张网格全数按名接管）', () => {
    const at = SRC.archive.indexOf('new GLTFLoader().parse', SRC.archive.indexOf('cardArrayReady'));
    const seg = SRC.archive.slice(at, at + 2400);
    for (const name of ['catFaces', 'catBrass', 'catBrassWorn', 'catCards',
      'catDark', 'catStuck', 'catStuckTrim']) {
      expect(seg, `缺 ${name} 材质接管`).toContain(`'${name}'`);
    }
    expect(seg).toContain("vertexColors: !!mesh.geometry.getAttribute('color')");
  });

  it('变换口径：pivot rotation.y=π（生成侧 x 预镜像），GLB 挂进第一座目录柜', () => {
    expect(SRC.archive).toContain('glbPivot.rotation.y = Math.PI;');
    expect(SRC.archive).toContain('mainCab.add(glbPivot);');
    expect(SRC.archive).toContain('const mainCab = catalogs[0];');
  });

  it('换接缝抹平 + 陈年病灶修正：洞位脸板/拉手换阵同参材质；v1.4 卡沓退进屉体', () => {
    expect(SRC.archive).toContain('mainCab.userData.drawerFace.material = new THREE.MeshStandardMaterial');
    expect(SRC.archive).toContain('mainCab.userData.drawerPull.material = new THREE.MeshStandardMaterial');
    expect(SRC.props).toContain('g.userData.drawerPull = dPull;');
    // 卡沓自 v1.4 停在 drawer 局部 z=0，0.2m 深探出柜面 9cm——退进屉体
    expect(SRC.archive).toContain('wad.position.set(0, 0.015, -0.15);');
    expect(SRC.archive).not.toMatch(/wad\.position\.y = 0\.015;/);
  });
});

describe('v1.18 门禁 87：「卡死的抽屉」交互 + 音色 98', () => {
  it('热点在源：挣一下又咬死（即时 drawerstuck）+ 2.2s 后那头 drawerfar 错拍应答', () => {
    expect(SRC.archive).toContain("hint: 'E — 卡死的抽屉'");
    expect(SRC.archive).toContain("audio.sfxAt('drawerstuck', mainCab.position.x, mainCab.position.z");
    expect(SRC.archive).toContain('stuckState.far = 2.2;');
    // 错拍走游戏时钟不走 setTimeout（暂停安全）
    const at = SRC.archive.indexOf('if (stuckState.far > 0) {');
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.archive.slice(at, at + 420);
    expect(seg).toContain('stuckState.far -= dt;');
    expect(seg).toContain("audio.sfxAt('drawerfar', -W / 2 - 1.5, mainCab.position.z");
  });

  it('零字幕 + 再入守卫 + 单写者（抖动组只有 stuckState 一个驱动）', () => {
    const at = SRC.archive.indexOf("hint: 'E — 卡死的抽屉'");
    const seg = SRC.archive.slice(at, SRC.archive.indexOf('});', at));
    expect(seg, '柜子不解释自己').not.toContain('ui.caption');
    expect(seg).toContain('if (stuckState.t >= 0 || stuckState.far > 0) return;');
    // 抖动衰减归零（挣一下又咬死，不是弹簧）
    expect(SRC.archive).toContain('stuckParts.position.z = Math.sin(stuckState.t * 46) * 0.0016 * (1 - stuckState.t / 0.55);');
    expect(SRC.archive).toContain('stuckParts.position.z = 0;');
  });

  it('drawerstuck 为第 98 种合成音，且不入 REPLY_DYAD 调音（这头的动作声是随手的）', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(98);
    const at = SRC.engine.indexOf("case 'drawerstuck'");
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.engine.slice(at, SRC.engine.indexOf('break;', at));
    for (const f of ['146.83', '174.61']) {
      expect(seg, 'REPLY_DYAD 排练腔不许蔓延到这头').not.toContain(f);
    }
  });

  it('INTERACTIVE_MIN：刹车只为收官件开一格（archive 35→36），其余六厅逐厅相等', () => {
    const at = SRC.cjs.indexOf('const INTERACTIVE_MIN');
    const seg = SRC.cjs.slice(at, at + 300);
    const mins = {
      lobby: 21, archive: 36, eraserhead: 29, bluevelvet: 23,
      twinpeaks: 26, mulholland: 24, studio: 29
    };
    for (const [hall, min] of Object.entries(mins)) {
      const m = new RegExp(`${hall}:\\s*(\\d+)`).exec(seg);
      expect(m, `INTERACTIVE_MIN 缺 ${hall}`).toBeTruthy();
      expect(Number(m[1]), `INTERACTIVE_MIN.${hall} 与 v1.18 口径不符`).toBe(min);
    }
  });
});

describe('v1.18 门禁 88：回声窗一句暗示 + 访谈 34 → 38（四主题齐涨）', () => {
  it('留言簿第四条种子：访客口吻、不指名哪件、不讲机制、零 UI 提示', () => {
    const store = new GuestbookStore({
      getItem: () => null, setItem: () => {}, removeItem: () => {}
    });
    const hint = store.list().find((p) => p.name === '回头客');
    expect(hint, '缺回声窗暗示种子').toBeTruthy();
    expect(hint.text).toContain('又问了一遍');
    // 不点破红线：不指名七件中的任何一件、不出现秒数/窗口等机制词
    for (const w of ['烛剪', '钥匙', '支管', '话筒', '保温', '路灯', '小碟', '秒', '窗口', '回声']) {
      expect(hint.text, `暗示点破了: ${w}`).not.toContain(w);
    }
    // 暗示只活在留言墙数据层——UI/HUD 层零提示
    expect(SRC.main).not.toContain('回头客');
  });

  it('条目 38，四主题分布 10/10/9/9（齐涨口径：单主题 ≥10 前先扩别的 → 整排推进）', () => {
    expect(INTERVIEWS.length).toBe(38);
    const dist = INTERVIEW_THEMES.map(
      (t) => INTERVIEWS.filter((v) => v.theme === t).length);
    expect(dist).toEqual([10, 10, 9, 9]);
  });

  it('新增四条在册且与 QUOTES 立牌语录零重复（防撞第四轮：sound5050/intuition/you 三句撞库弃用在案）', () => {
    const themes = { ideasdictate: '点子', telephone: '电影', abstractions: '心境', milkman: '此生' };
    for (const [id, theme] of Object.entries(themes)) {
      const v = INTERVIEWS.find((x) => x.id === id);
      expect(v, `缺新条目 ${id}`).toBeTruthy();
      expect(v.theme).toBe(theme);
      for (const q of QUOTES) {
        expect(q.en.toLowerCase()).not.toBe(v.en.toLowerCase());
      }
    }
    // 防撞记录必须留档在数据文件里（弃用三句是纪律的一部分）
    expect(read('src/data/interviews.js')).toContain('防撞记录');
  });
});

describe('v1.18 门禁 89：GLB 轴收官转维护', () => {
  it('blender:check 七件全数在检（收官后不再为「每轮一件」扩列）', () => {
    expect(SRC.check).toContain("gen: 'gen_card_catalog.py'");
    expect(SRC.check).toContain('卡片柜抽屉阵');
    expect((SRC.check.match(/\{ gen: 'gen_/g) || []).length).toBe(7);
  });

  it('六处落厅钉死：六厅各一件 GLB、studio 空位刻意留白、每厅 ≤1', () => {
    const landed = {
      lobby: 'memorial_relief.glb', archive: 'card_catalog.glb',
      eraserhead: 'steam_governor.glb', bluevelvet: 'bottle_wall.glb',
      twinpeaks: 'pine_tree.glb', mulholland: 'corner_wraith.glb'
    };
    for (const [hall, glb] of Object.entries(landed)) {
      expect(SRC[hall], `${hall} 缺 ${glb}`).toContain(`${glb}?inline`);
      // 每厅 ≤1：该厅只 import 这一件
      expect((SRC[hall].match(/\.glb\?inline/g) || []).length,
        `${hall} 每厅 ≤1 件 GLB`).toBe(1);
    }
    expect(SRC.studio, 'studio 空位收官留白——转维护后不补件').not.toContain('.glb?inline');
  });

  it('在库 GLB 恰六件且全部 ≤300KB（体积纪律收官口径）', () => {
    const dir = new URL('../src/assets/', import.meta.url);
    const glbs = readdirSync(dir).filter((f) => f.endsWith('.glb'));
    expect(glbs.sort()).toEqual([
      'bottle_wall.glb', 'card_catalog.glb', 'corner_wraith.glb',
      'memorial_relief.glb', 'pine_tree.glb', 'steam_governor.glb'
    ]);
    for (const f of glbs) {
      expect(statSync(new URL(`../src/assets/${f}`, import.meta.url)).size,
        `${f} 超体积红线`).toBeLessThanOrEqual(300 * 1024);
    }
  });
});

describe('v1.18 阈值与版本', () => {
  it('版本口径一致：package.json 与 __SV__.version 都是 1.18.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('1.18.0');
    expect(SRC.main).toContain("version: '1.18.0'");
  });
});
