import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { INTERVIEWS, INTERVIEW_THEMES } from '../src/data/interviews.js';
import { QUOTES } from '../src/data/essays.js';

// ============================================================
// v1.17 门禁 81/82/83/84：酒瓶墙 GLB 落 bv + 彩蛋第五批「问第二遍」
// + 共用件并发抽查制度化 + 访谈「此生」补至 8
// 口径（对齐 GOAL_HANDOFF 第 5 轮优先项）：
//   · GLB 第四批只许落 bv / archive / studio——era 已有调速器
//     （每厅 ≤1 件），tp/mull 244/250 贴顶禁入；
//   · 问第二遍：应答落定的回声窗（echo，游戏时钟自复位）内再问，
//     **同拍即答**、答在意想不到的通道——零新增交互/网格/光源/
//     音色/字幕（INTERACTIVE_MIN 五轮连涨的惯性在本轮刹车）；
//   · 共用件单写者纪律：archive 分针只有 clockState 一个写者、
//     秒针只有 windState 一个写者——并发触发各归各位（冒烟探针
//     实录见 TESTING v1.17 抽查段）。
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
  engine: read('src/audio/engine.js'),
  main: read('src/main.js'),
  cjs: read('electron/main.cjs'),
  check: read('scripts/blender-check.js')
};

describe('v1.17 门禁 81：酒瓶墙 GLB 落蓝丝绒厅（Blender 管线第 6 件）', () => {
  it('GLB 在库且守体积纪律（≤300KB）', () => {
    const size = statSync(new URL('../src/assets/bottle_wall.glb', import.meta.url)).size;
    expect(size).toBeLessThanOrEqual(300 * 1024);
  });

  it('落厅红线：第四批只落 bv/archive/studio——本件落 bv；era 每厅 ≤1 件、tp/mull 贴顶禁入', () => {
    expect(SRC.bluevelvet).toContain("from '../assets/bottle_wall.glb?inline'");
    for (const hall of ['twinpeaks', 'mulholland']) {
      expect(SRC[hall], `${hall} 已贴顶（244/250），禁落 GLB`)
        .not.toContain('bottle_wall.glb');
    }
    expect(SRC.eraserhead, 'era 已有调速器——每厅 ≤1 件 GLB')
      .not.toContain('bottle_wall.glb');
  });

  it('ready 承诺 + glb-landed 信号 + 装载闭环（厅等酒瓶墙就位）', () => {
    expect(SRC.bluevelvet).toContain('const bottleWallReady = new Promise');
    expect(SRC.bluevelvet).toContain('glb-landed bluevelvet bottlewall');
    expect(SRC.bluevelvet).toContain('glb-failed bluevelvet bottlewall');
    expect(SRC.bluevelvet).toContain('ready: bottleWallReady');
  });

  it('仅换网格保留程序化动画：闪烁驱 bottleGlassMats 活登记表，程序化三件退场即兜底', () => {
    expect(SRC.bluevelvet).toContain('let bottleGlassMats = bottleMeshes.map((m) => m.material)');
    // 「电压不稳」更新器只认登记表，不再直呼 bottleMeshes
    const at = SRC.bluevelvet.indexOf('电压不稳');
    const seg = SRC.bluevelvet.slice(at, SRC.bluevelvet.indexOf('});', SRC.bluevelvet.indexOf('updaters.push', at)));
    expect(seg).toContain('bottleGlassMats.forEach');
    expect(seg).not.toContain('bottleMeshes.forEach');
    // GLB 就位后程序化瓶原位退场（几何/材质双释放）
    expect(SRC.bluevelvet).toContain('m.geometry.dispose();');
    expect(SRC.bluevelvet).toContain('if (nextMats.filter(Boolean).length === 3) bottleGlassMats = nextMats;');
  });

  it('材质由运行时整套重设（GLB 只带几何/命名/COLOR_0）', () => {
    const at = SRC.bluevelvet.indexOf('new GLTFLoader().parse');
    const seg = SRC.bluevelvet.slice(at, at + 2600);
    expect(seg).toContain("getObjectByName(`bottleGlass_${name}`)");
    expect(seg).toContain('vertexColors: hasCol');
    expect(seg).toContain("getObjectByName('bottleCorks')");
  });

  it('blender:check 扩到六件（gen_bottle_wall.py 比例架入列）', () => {
    expect(SRC.check).toContain("gen: 'gen_bottle_wall.py'");
    expect(SRC.check).toContain('酒瓶墙');
    expect((SRC.check.match(/\{ gen: 'gen_/g) || []).length).toBe(6);
  });
});

// [厅, hint, 状态字段, 即答通道（意想不到的答口）, 即答行]
const EGGS2 = [
  ['lobby', "hint: 'E — 烛剪'", 'snuffState', '三对流苏同拍齐晃', 'echoTassels.fire()'],
  ['archive', "hint: 'E — 上弦钥匙'", 'windState', '停摆钟分针同拍挣', 'if (clockState.t < 0) clockState.t = 0;'],
  ['eraserhead', "hint: 'E — 结霜的支管'", 'frostState', '大机器转速沉半口', 'machineState.run = 0.55;'],
  ['bluevelvet', "hint: 'E — 空话筒'", 'micState', '酒瓶墙玻璃泛一口光', 'glassEcho.t = 0;'],
  ['twinpeaks', "hint: 'E — 保温座'", 'warmState', '旋转派柜转过一格', 'pcaseState.spin = 0.55;'],
  ['mulholland', "hint: 'E — 路灯铁杆'", 'poleEcho', '光先声无（因果换位）', 'poleEcho.t = 0;'],
  ['studio', "hint: 'E — 白瓷小碟'", 'chinaState', '节拍器摆针无声点头', 'metroNudge.t = 0;']
];

describe('v1.17 门禁 82：彩蛋第五批「问第二遍」（七件在源，同拍即答）', () => {
  it.each(EGGS2)('%s %s：echo 回声窗 + 即答通道在源', (hall, hint, state, _axis, line) => {
    expect(SRC[hall]).toContain(hint);
    expect(SRC[hall], `${hall} 状态须带 echo 回声窗`).toMatch(
      new RegExp(`const ${state} = \\{[^}]*echo: 0`));
    expect(SRC[hall], `${hall} 缺即答行`).toContain(line);
  });

  it.each(EGGS2)('%s 回声窗走游戏时钟且自复位（echo -= dt / 问一次即消耗）', (hall, hint, state) => {
    expect(SRC[hall]).toContain(`${state}.echo -= dt`);
    expect(SRC[hall]).toContain(`${state}.echo = 0;`);
  });

  it.each(EGGS2)('%s 即答分支不等不响不说（无 wait 赋值 / sfx / 字幕）', (hall, hint, state) => {
    const at = SRC[hall].indexOf(`if (${state}.echo > 0) {`,
      SRC[hall].indexOf('onActivate', SRC[hall].indexOf(hint) - 4000));
    expect(at, `${hall} onActivate 缺 echo 分支`).toBeGreaterThan(-1);
    const seg = SRC[hall].slice(at, SRC[hall].indexOf('return;', at));
    expect(seg, `${hall} 即答不许再错拍`).not.toMatch(/\.wait = \d/);
    expect(seg, `${hall} 即答不出声（答在别的通道）`).not.toContain('sfx');
    expect(seg, `${hall} 即答零字幕`).not.toContain('ui.caption');
  });

  it('零新增交互：INTERACTIVE_MIN 与 v1.16 口径逐厅相等（五轮连涨惯性刹车）', () => {
    const at = SRC.cjs.indexOf('const INTERACTIVE_MIN');
    const seg = SRC.cjs.slice(at, at + 260);
    const mins = {
      lobby: 21, archive: 35, eraserhead: 29, bluevelvet: 23,
      twinpeaks: 26, mulholland: 24, studio: 29
    };
    for (const [hall, min] of Object.entries(mins)) {
      const m = new RegExp(`${hall}:\\s*(\\d+)`).exec(seg);
      expect(m, `INTERACTIVE_MIN 缺 ${hall}`).toBeTruthy();
      expect(Number(m[1]), `INTERACTIVE_MIN.${hall} 本轮不许涨也不许跌`).toBe(min);
    }
  });

  it('第五批零新增件：v1.17 彩蛋五批段落无新网格/新光源/新增热点', () => {
    for (const [hall, hint] of EGGS2.map((e) => [e[0], e[1]])) {
      const at = SRC[hall].indexOf('v1.17 彩蛋五批');
      expect(at, `${hall} 缺五批标记`).toBeGreaterThan(-1);
      // 段落 = 标记注释 → 该件热点注册块结束（既有热点复用不算新增）
      const end = SRC[hall].indexOf('\n  });', SRC[hall].indexOf(hint, at));
      expect(end).toBeGreaterThan(at);
      const seg = SRC[hall].slice(at, end);
      expect(seg, `${hall} 第五批不许加网格`).not.toContain('new THREE.Mesh');
      expect(seg, `${hall} 第五批不许加合并网格`).not.toMatch(/mergedMesh\(/);
      expect(seg, `${hall} 第五批不许加光源`).not.toMatch(/new THREE\.(Point|Spot)Light/);
      expect((seg.match(/hotspots\.add\(/g) || []).length,
        `${hall} 第五批只许复用既有热点（≤1 处注册即原件自身）`).toBeLessThanOrEqual(1);
    }
  });

  it('第五批零新增音色：engine 合成音保持 97 种（换轴不加声，答全走既有通道）', () => {
    expect((SRC.engine.match(/case '/g) || []).length).toBe(97);
  });

  it('mull 即时重放不续窗（replay 标记——七件同口径：答一次即消耗）', () => {
    expect(SRC.mulholland).toContain('poleEcho.replay = 1;');
    expect(SRC.mulholland).toContain('poleEcho.echo = poleEcho.replay ? 0 : 6;');
  });

  it('studio 摆针基准写者不变：nudge 是 metro 更新器之后的加法覆写，metro 走时不插话', () => {
    expect(SRC.studio).toContain('metroPend.rotation.z +=');
    expect(SRC.studio).toContain('if (metroNudge.t >= 1.1 || metroState.on)');
    expect(SRC.studio).toContain('if (!metroState.on) metroNudge.t = 0;');
    expect(SRC.studio.indexOf('metroPend.rotation.z +='),
      'nudge 更新器必须注册在 metro 基准写之后').toBeGreaterThan(
      SRC.studio.indexOf('metroPend.rotation.z = Math.sin(metroState.phase)'));
  });
});

describe('v1.17 门禁 83：时间错位轴共用件盯防（archive 单写者纪律 + 并发自复位）', () => {
  it('分针只有 clockState 一个写者、秒针只有 windState 一个写者', () => {
    // clockState 更新器块内不碰秒针
    const cAt = SRC.archive.indexOf('const clockState');
    const cSeg = SRC.archive.slice(cAt, SRC.archive.indexOf('hotspots.add(face', cAt));
    expect(cSeg).toContain('minHand.rotation.z');
    expect(cSeg, '停摆钟更新器不许碰秒针').not.toContain('secHand.rotation');
    // windState 更新器块内不碰分针
    const wAt = SRC.archive.indexOf('const windState');
    const wSeg = SRC.archive.slice(wAt, SRC.archive.indexOf('hotspots.add(windKey', wAt));
    expect(wSeg).toContain('secHand.rotation.z');
    expect(wSeg, '上弦钥匙更新器不许碰分针').not.toContain('minHand.rotation');
    // 问第二遍的答只点火 clockState，不直驱任何针
    const eAt = SRC.archive.indexOf('if (windState.echo > 0) {');
    const eSeg = SRC.archive.slice(eAt, SRC.archive.indexOf('return;', eAt));
    expect(eSeg).toContain('clockState.t = 0');
    expect(eSeg).not.toContain('Hand.rotation');
  });

  it('windState 自复位兜底：k≥3.4 全量归位（秒针/钥匙/step）后才开回声窗', () => {
    const at = SRC.archive.indexOf('if (k >= 3.4) {');
    const seg = SRC.archive.slice(at, SRC.archive.indexOf('}', at + 200));
    expect(seg).toContain('secHand.rotation.z = SEC_REST;');
    expect(seg).toContain('windKey.rotation.z = 0;');
    expect(seg).toContain('windState.step = 0;');
    expect(seg).toContain('windState.echo = 8;');
  });

  it('并发抽查取证句柄在源（冒烟探针按名读针角）', () => {
    expect(SRC.archive).toContain("minHand.name = 'clockMinHand';");
    expect(SRC.archive).toContain("secHand.name = 'clockSecHand';");
    // 双状态机再入守卫（同帧双触发不重入）
    expect(SRC.archive).toContain('if (windState.t >= 0) return;');
    expect(SRC.archive).toContain('if (clockState.t < 0) clockState.t = 0;');
  });
});

describe('v1.17 门禁 84：访谈 32 → 34（补「此生」至 8）', () => {
  it('条目 ≥34，「此生」≥8，四主题分布 9/9/8/8', () => {
    expect(INTERVIEWS.length).toBeGreaterThanOrEqual(34);
    expect(INTERVIEWS.filter((v) => v.theme === '此生').length).toBeGreaterThanOrEqual(8);
    for (const t of INTERVIEW_THEMES) {
      expect(INTERVIEWS.filter((v) => v.theme === t).length).toBeGreaterThanOrEqual(8);
    }
  });

  it('新增两条在册且与 QUOTES 立牌语录零重复（防撞纪律第三轮实战）', () => {
    for (const id of ['pastcolors', 'neverretire']) {
      const v = INTERVIEWS.find((x) => x.id === id);
      expect(v, `缺新条目 ${id}`).toBeTruthy();
      expect(v.theme).toBe('此生');
      for (const q of QUOTES) {
        expect(q.en.toLowerCase()).not.toBe(v.en.toLowerCase());
      }
    }
  });
});

describe('v1.17 阈值与版本', () => {
  it('版本口径一致：package.json 与 __SV__.version 都是 1.17.0', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('1.17.0');
    expect(SRC.main).toContain("version: '1.17.0'");
  });
});
