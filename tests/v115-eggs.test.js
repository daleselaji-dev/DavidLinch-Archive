import { describe, it, expect } from 'vitest';
import { readFileSync, statSync, readdirSync } from 'node:fs';

// ============================================================
// v1.15 门禁 73：彩蛋第三批——远声应答音色谱系
// 口径（对齐 STYLE_AUDIT §5 第 3 轮新病灶）：
//   · 音色谱系：所有「另一边」的应答共享 REPLY_DYAD（D3-F3 小三度）
//     ——replyhum（有嗓子的那头）/ replytap（调过音的指节）；
//     「这头」的动作声不调音（clank/thud/woodknock/latchsnap）
//   · 错拍默认：应答一律迟到 ≥0.8s，且走游戏时钟（dt 倒计时，
//     软渲染下不抢拍）
//   · 永久态纪律不加码：七厅各恰一件永久态是 v1.14 的账——本批
//     六件全部可重复、无锁存（wait/spin/settle 全部自复位）
//   · 零字幕：onActivate 邻域无 ui.caption
//   · 光的礼貌：全批零新增光源
//   · GLB 体积纪律：单件 ≤300KB、每厅 ≤1 件 GLB
//   · v1.14 回归修复：studio 工作桌挂载三行（门禁 69 误删）
// ============================================================

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const SRC = {
  lobby: read('halls/lobby.js'),
  archive: read('halls/archive.js'),
  eraserhead: read('halls/eraserhead.js'),
  bluevelvet: read('halls/bluevelvet.js'),
  twinpeaks: read('halls/twinpeaks.js'),
  mulholland: read('halls/mulholland.js'),
  studio: read('halls/studio.js'),
  engine: read('audio/engine.js')
};

// [厅, hint, 状态字段, 即时音色, 应答音色（REPLY_DYAD 谱系）, 错拍秒数]
const EGGS = [
  ['archive', "hint: 'E — 通风格栅'", 'grilleState', "'clank'", "'replytap'", 'grilleState.wait = 2.4'],
  ['eraserhead', "hint: 'E — 对讲管'", 'tubeState', "'clank'", "'replyhum'", 'tubeState.wait = 3.0'],
  ['bluevelvet', "hint: 'E — 返听音箱'", 'wedgeState', "'thud'", "'replyhum'", 'wedgeState.wait = 1.9'],
  ['twinpeaks', "hint: 'E — 一颗松果'", 'coneState', "'woodknock'", "'replytap'", 'coneState.wait = 2.2'],
  ['mulholland', "hint: 'E — BACK IN 5'", 'backInState', "'latchsnap'", "'replyhum'", 'backInState.wait = 1.6'],
  ['studio', "hint: 'E — 墙角的立管'", 'riserState', "'clank'", "'replytap'", 'riserState.wait = 1.4']
];

describe('v1.15 门禁 73：六件远声应答彩蛋在源', () => {
  it.each(EGGS)('%s %s：状态字段 + 双通道（即时 + 应答）+ 游戏时钟错拍', (hall, hint, state, sfxNow, sfxReply, waitLine) => {
    expect(SRC[hall]).toContain(state);
    expect(SRC[hall], `${hall} 缺即时声通道`).toContain(sfxNow);
    expect(SRC[hall], `${hall} 缺远声应答通道`).toContain(sfxReply);
    expect(SRC[hall], `${hall} 错拍须走游戏时钟且 ≥0.8s`).toContain(waitLine);
  });

  it.each(EGGS)('%s 零字幕（onActivate 全块无 ui.caption）', (hall, hint) => {
    const at = SRC[hall].indexOf(hint);
    expect(at, `hint 未找到: ${hint}`).toBeGreaterThan(-1);
    const end = SRC[hall].indexOf('\n  });', at);
    expect(end).toBeGreaterThan(at);
    const block = SRC[hall].slice(at, end);
    expect(block, `${hall} 彩蛋三批不许带字幕`).not.toContain('ui.caption');
  });

  it.each(EGGS)('%s 无永久态锁存（本批全部可重复——七厅各恰一件永久态是 v1.14 的账）', (hall, hint, state) => {
    // 状态段落里不许出现 `xxx = true` 式锁存（wait/spin/settle 全自复位）
    const at = SRC[hall].indexOf(`const ${state}`);
    expect(at).toBeGreaterThan(-1);
    const seg = SRC[hall].slice(at, at + 2400);
    expect(seg, `${hall} 彩蛋三批不许加永久态`).not.toMatch(/State\.\w+ = true/);
  });

  it('全批零新增光源（每件彩蛋段落无 PointLight/SpotLight）', () => {
    for (const [hall, hint] of EGGS) {
      const at = SRC[hall].indexOf(hint);
      const from = Math.max(0, at - 3200);
      const seg = SRC[hall].slice(from, at);
      // 段落起点粗于块——只查彩蛋注释标记之后
      const mark = seg.lastIndexOf('v1.15 彩蛋三批');
      if (mark >= 0) {
        expect(seg.slice(mark), `${hall} 彩蛋三批不许加光源`).not.toMatch(/new THREE\.(Point|Spot)Light/);
      }
    }
  });
});

describe('v1.15 门禁 73：远声应答音色谱系（REPLY_DYAD）', () => {
  it('REPLY_DYAD 是 D3-F3 小三度且被导出（谱系有据可查）', () => {
    expect(SRC.engine).toContain('export const REPLY_DYAD = [146.83, 174.61]');
  });

  it.each(['replyhum', 'replytap', 'stonebrush'])('新音色 %s 在引擎', (name) => {
    expect(SRC.engine).toContain(`case '${name}'`);
  });

  it('replyhum / replytap 都建在 REPLY_DYAD 上（那头永远是同一副音高）', () => {
    for (const name of ['replyhum', 'replytap']) {
      const at = SRC.engine.indexOf(`case '${name}'`);
      const seg = SRC.engine.slice(at, at + 700);
      expect(seg, `${name} 必须引用 REPLY_DYAD`).toContain('REPLY_DYAD');
    }
  });

  it('「这头」的动作声不调音（六件即时音色全部不取用 REPLY_DYAD——对照关系成立）', () => {
    for (const name of ['clank', 'thud', 'woodknock', 'latchsnap']) {
      const at = SRC.engine.indexOf(`case '${name}'`);
      expect(at, `即时音色 ${name} 应在引擎`).toBeGreaterThan(-1);
      const end = SRC.engine.indexOf('break;', at);
      expect(SRC.engine.slice(at, end)).not.toMatch(/REPLY_DYAD\[/);
    }
  });

  it('lobby 浮雕应答走石钟谱系（stonebrush 即时 + 2.1s 错拍 seamPulse/stonechime）', () => {
    const at = SRC.lobby.indexOf("hint: 'E — 石上的烟'");
    expect(at).toBeGreaterThan(-1);
    const seg = SRC.lobby.slice(at, at + 700);
    expect(seg).toContain("sfxAt('stonebrush'");
    expect(seg).toContain('}, 2100)');
    expect(seg).not.toContain('ui.caption');
  });
});

describe('v1.15 门禁 71/72：GLB 落厅第二批 + 体积纪律', () => {
  const halls = ['lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland', 'studio'];

  it('GLB 体积纪律：单件 ≤300KB', () => {
    const dir = new URL('../src/assets/', import.meta.url);
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.glb')) continue;
      const size = statSync(new URL(f, dir)).size;
      expect(size, `${f} 超出 300KB 纪律`).toBeLessThanOrEqual(300 * 1024);
    }
  });

  it('GLB 每厅 ≤1 件（导入普查）', () => {
    for (const hall of halls) {
      const n = (SRC[hall].match(/from '\.\.\/assets\/[\w-]+\.glb\?inline'/g) || []).length;
      expect(n, `${hall} 每厅至多 1 件 GLB`).toBeLessThanOrEqual(1);
    }
  });

  it('corner_wraith.glb 落穆赫兰道：仅换网格保留程序化动画（子件重挂 + ready 承诺）', () => {
    expect(SRC.mulholland).toContain("from '../assets/corner_wraith.glb?inline'");
    expect(SRC.mulholland).toContain('glb-landed mulholland wraith');
    expect(SRC.mulholland).toContain('const wraithReady = new Promise');
    // GLB 前脸 -Z → lookAt(+Z) 轴系换算
    expect(SRC.mulholland).toContain('rotation.y = Math.PI');
    // setLurch/setRush 程序化动画钩子保留
    expect(SRC.mulholland).toContain('setLurch');
    expect(SRC.mulholland).toContain('setRush');
  });

  it('memorial_relief.glb 落大厅：钳材质豁免鎏金 + ready 承诺', () => {
    expect(SRC.lobby).toContain("from '../assets/memorial_relief.glb?inline'");
    expect(SRC.lobby).toContain('glb-landed lobby relief');
    expect(SRC.lobby).toContain('const reliefReady = new Promise');
    expect(SRC.lobby).toContain("o.material.name === 'reliefGilt'");
  });

  it('贴顶厅先合并再新增：mulholland 七山合一 + twinpeaks 滚木端盖合一', () => {
    expect(SRC.mulholland).toContain('mergedMesh(hillGeos');
    expect(SRC.twinpeaks).toContain('const rollCaps = mergedMesh');
  });
});

describe('v1.15 回归修复 + 阈值重锁', () => {
  it('studio 工作桌挂载三行回归（门禁 69 误删——桌与抽屉/铅笔刀/场记板回到场景）', () => {
    expect(SRC.studio).toContain('desk.position.set(-6.4, 0, -1.4)');
    expect(SRC.studio).toContain('desk.rotation.y = Math.PI / 2');
    expect(SRC.studio).toContain('group.add(desk)');
  });

  it('INTERACTIVE_MIN 七厅全部上调（v1.15 普查 -1 口径：21/35/28/23/26/24/29）', () => {
    const cjs = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    const at = cjs.indexOf('const INTERACTIVE_MIN');
    const seg = cjs.slice(at, at + 260);
    const mins = {
      lobby: 20, archive: 34, eraserhead: 27, bluevelvet: 22,
      twinpeaks: 25, mulholland: 23, studio: 28
    };
    for (const [hall, min] of Object.entries(mins)) {
      const m = new RegExp(`${hall}:\\s*(\\d+)`).exec(seg);
      expect(m, `INTERACTIVE_MIN 缺 ${hall}`).toBeTruthy();
      expect(Number(m[1]), `INTERACTIVE_MIN.${hall} 回退`).toBeGreaterThanOrEqual(min);
    }
  });
});
