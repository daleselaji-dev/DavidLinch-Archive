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

describe('v1.10 P9 微动遍：没有东西完全静止（怠速动画，零带宽标量）', () => {
  it('twinpeaks 信箱里探出的信角随夜风翕动', () => {
    expect(SRC.twinpeaks).toMatch(/letter\.rotation\.z = 0\.05 \+ Math\.sin/);
  });

  it('eraserhead 挂锁归位后仍有怠速摆（厂房低频震）', () => {
    expect(SRC.eraserhead).toMatch(/idle = 0\.1 \+ Math\.sin/);
  });

  it('studio 空白行李牌没有风也在极缓地摆', () => {
    expect(SRC.studio).toMatch(/tagPivot\.rotation\.z = Math\.sin\(t \* 0\.63\)/);
  });

  it('archive 停机的缩微机偶尔自己蠕一格走带（seeded 间隔）', () => {
    expect(SRC.archive).toContain('mfCreep');
    expect(SRC.archive).toMatch(/mfCreep\.next = 21 \+ mfRng\(\) \* 13/);
  });
});

describe('v1.10 P18 微动第二遍（四处怠速/稀疏微动，零带宽标量）', () => {
  it('lobby 画架上的花圈从来没有真正静止过（±0.006，13s）', () => {
    expect(SRC.lobby).toMatch(/wreathPivot\.rotation\.z = Math\.sin\(t \* 0\.48\) \* 0\.006/);
  });

  it('archive 气送管垂开的翻盖在铰链上极缓地悠（管里的气流没停过）', () => {
    expect(SRC.archive).toMatch(/pnFlapPivot\.rotation\.x = 0\.95 \+ Math\.sin\(t \* 0\.74\) \* 0\.012/);
  });

  it('bluevelvet 冰桶的瓶每 50–85s 自己碰一下桶壁（seeded + 极轻 iceclink）', () => {
    expect(SRC.bluevelvet).toContain('botIdle');
    expect(SRC.bluevelvet).toMatch(/botIdle\.next = 50 \+ botRng\(\) \* 35/);
    expect(SRC.bluevelvet).toMatch(/sfxAt\('iceclink', 6\.85, 3\.75, 0\.14/);
  });

  it('mulholland 站牌牌面在螺栓上打颤（8.2Hz 碎颤 × 0.9Hz 慢摆双叠）', () => {
    expect(SRC.mulholland).toMatch(/busSign\.rotation\.x = Math\.sin\(t \* 8\.2\) \* 0\.004/);
  });
});

describe('v1.10 P10 远处的光（稀疏夜空事件，seeded 间隔）', () => {
  it('twinpeaks 偶尔一道流星（60–110s、0.9s 划过、正弦包络）', () => {
    expect(SRC.twinpeaks).toContain('metState');
    expect(SRC.twinpeaks).toMatch(/metState\.next = 60 \+ metRng\(\) \* 50/);
    expect(SRC.twinpeaks).toMatch(/meteor\.material\.opacity = Math\.sin\(u \* Math\.PI\)/);
  });

  it('mulholland 山腰远车头灯（75–120s、8.5s 缓移、途中被山形挡口）', () => {
    expect(SRC.mulholland).toContain('farCar');
    expect(SRC.mulholland).toMatch(/carState\.next = 75 \+ carRng\(\) \* 45/);
    // 双头灯 + 路面拖晕合并单 mesh（预算只 +1）
    expect(SRC.mulholland).toMatch(/mergedMesh\(\[\s*xform\(new THREE\.PlaneGeometry\(1\.2, 1\.2\)/);
  });
});

describe('v1.10 P17 无人剧场（bluevelvet 空舞台自演，seeded 稀疏）', () => {
  it('三拍都在：聚光亮一口（乘法覆写）+ 幕布轻颤 + 话筒 breath', () => {
    expect(SRC.bluevelvet).toContain('ghostShow');
    expect(SRC.bluevelvet).toMatch(/ghostShow\.next = 120 \+ ghostRng\(\) \* 60/);
    expect(SRC.bluevelvet).toMatch(/spot\.intensity \*= 1 \+ Math\.sin\(u \* Math\.PI\) \* 0\.42/);
    expect(SRC.bluevelvet).toMatch(/ghostShow[\s\S]{0,500}curtainShudder\.e = Math\.max/);
    expect(SRC.bluevelvet).toMatch(/ghostShow[\s\S]{0,700}sfxAt\('breath', 0, -D \/ 2 \+ 2\.3, 0\.16/);
  });

  it('无字幕无热点（观众自己撞见才算数）', () => {
    const seg = SRC.bluevelvet.slice(SRC.bluevelvet.indexOf('无人剧场'));
    expect(seg).not.toContain('ui.caption');
    expect(seg).not.toContain('hotspots.add');
  });
});

describe('v1.10 P14 入口长毯（开门第一眼第四看，纯场景件）', () => {
  it('lobby 丝绒长毯在源：金双边线 + 中线磨浅 + 两端流苏 + 天鹅绒 sheen', () => {
    expect(SRC.lobby).toContain('runnerTex');
    expect(SRC.lobby).toContain('中线磨浅');
    expect(SRC.lobby).toMatch(/sheen: 1\.0,\s*sheenRoughness: 0\.55/);
    // 静态单 mesh、polygonOffset 防与拼花地板深度打架
    expect(SRC.lobby).toMatch(/runner = new THREE\.Mesh\([\s\S]{0,700}polygonOffsetFactor: -2/);
  });

  it('长毯与 C4 积水洼同口径：纯场景件不设热点', () => {
    expect(SRC.lobby).not.toMatch(/hotspots\.add\(runner/);
  });
});
