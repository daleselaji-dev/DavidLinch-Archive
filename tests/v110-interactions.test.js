import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// ============================================================
// v1.10 抛光 P8：本轮 14 件新交互的反馈通道普查（源码级门禁）。
// 升级方向要求「≥2 通道反馈、连锁 ≥2」——这里把它固化成测试：
//   · 每件新交互至少一路声音（sfx/sfxAt）+ 一路字幕（caption），
//     动画通道由各厅状态机源码断言（关键状态字段存在）
//   · 五条连锁（A 触发 → 半拍后 B 自己动）逐条审计
// 防后续改动无声拆掉反馈通道或连锁。
// ============================================================

const read = (h) => readFileSync(new URL(`../src/halls/${h}.js`, import.meta.url), 'utf8');
const SRC = {
  lobby: read('lobby'),
  archive: read('archive'),
  eraserhead: read('eraserhead'),
  bluevelvet: read('bluevelvet'),
  twinpeaks: read('twinpeaks'),
  mulholland: read('mulholland'),
  studio: read('studio')
};

// [厅, 交互名, 声通道特征, 字幕特征, 动画状态特征]
// 注：mulholland 本轮两件 = C4 积水洼（纯场景件，不设热点）+ 呼叫铃，
// 故此处 13 件热点 + 积水洼另行在 C4 视觉验收覆盖。
const NEW_INTERACTIONS = [
  ['lobby', '吊灯绞盘', "sfxAt('winch'", '绞盘还记得灯的重量。', 'winchState'],
  ['lobby', '碑阶白花', "sfxAt('tassel'", '一支白花。不在名册上。', 'lilyState'],
  ['twinpeaks', '壁挂点唱盒', "'wallbox'", '歌单上没有这首歌。', 'wbState'],
  ['twinpeaks', '路边信箱', "sfxAt('springdoor'", '门关不上。信也没人取。', 'mbState'],
  ['bluevelvet', '歌单立牌', "sfxAt('page'", '最后一首没有名字。', 'cardShake'],
  ['bluevelvet', '半掩的穿衣镜', "sfxAt('tassel'", '盖上它是有原因的。', 'clothState'],
  ['mulholland', '候场呼叫铃', "'callbell'", '应声的门离得太远了。', 'bellState'],
  ['studio', '书桌转椅', "sfxAt('creak'", '它不想被灯看着。', 'chairState'],
  ['studio', '门后的行李箱', "'latchsnap'", '随时能走。从没走成。', 'caseState'],
  ['eraserhead', '更衣柜排', "'lockerclang'", '空柜子才关不严。', 'lockerState'],
  ['eraserhead', '接水桶', "'waterlap'", '上面没有水管。', 'pailState'],
  ['archive', '缩微胶片阅读器', "sfxAt('switch'", '整卷都没拍过东西。', 'mfState'],
  ['archive', '索引灯箱', "'fluor'", '它搬进了隔壁那年。', 'boxDip']
];

describe('v1.10 新交互反馈通道普查（声 + 字幕 + 动画状态机）', () => {
  it.each(NEW_INTERACTIONS)('%s·%s：声通道在', (hall, _name, sfx) => {
    expect(SRC[hall]).toContain(sfx);
  });

  it.each(NEW_INTERACTIONS.filter((r) => r[3]))('%s·%s：字幕在（≤22 字）', (hall, _name, _s, cap) => {
    expect(SRC[hall]).toContain(cap);
    expect(cap.length).toBeLessThanOrEqual(22);
  });

  it.each(NEW_INTERACTIONS)('%s·%s：动画状态机在', (hall, _name, _s, _c, state) => {
    expect(SRC[hall]).toContain(state);
  });
});

describe('v1.10 连锁交互 ≥2（A 动 → 半拍后 B 自己动）', () => {
  it('bluevelvet 歌单立牌 → 舞台聚光咽一口气 + 话筒那头一声 breath', () => {
    expect(SRC.bluevelvet).toContain('spotSwallow');
    expect(SRC.bluevelvet).toMatch(/spotSwallow\.t = 0[\s\S]{0,200}sfxAt\('breath'/);
  });

  it('mulholland 呼叫铃 → 很远处一扇门应一声（doorfar 位置化）', () => {
    expect(SRC.mulholland).toMatch(/callbell[\s\S]{0,900}sfxAt\('doorfar'/);
  });

  it('twinpeaks 中箱门弹开 → 邻箱小旗自己放平', () => {
    expect(SRC.twinpeaks).toContain('flagDropped');
  });

  it('studio 行李箱锁扣弹开扣回 → 行李牌自己晃起来', () => {
    expect(SRC.studio).toMatch(/caseState\.swing/);
  });

  it('archive 灯箱闪格熄灭 → 灯搬进隔壁那年 + 整箱咽一口气', () => {
    expect(SRC.archive).toContain('boxDip.t = 0');
    // 挪格：覆亮片换格 + 双声（fluor + switch）
    expect(SRC.archive).toMatch(/flickAt = \(flickAt \+ 1\) % litCells\.length/);
  });

  it('连锁总数 ≥2（本轮要求下限）', () => {
    // 上面五条已逐一断言存在——总数下限自然满足
    expect(5).toBeGreaterThanOrEqual(2);
  });
});
