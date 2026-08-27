// ============================================================
// 展馆文案与旁白稿。
// 文案原则（v1.3 —— 回到 v1.0 克制量级）：
//   1. 尽量让林奇自己解释自己：全站以其公开访谈与著作中的
//      短引语为唯一「解读」，不提供策展评述文章、不借理论名词；
//   2. 旁白配额：全馆 ≤8 条，每条 ≤16 字，总字数 ≤110；
//      只在首访、延迟出现一次；措辞为风格化空间提示
//      （光/质感/空间感受）或公开事实一行，禁止剧情叙述；
//   3. 展签宁缺毋滥：每厅林奇原话展签 ≤1；事实铭牌只写
//      「片名 + 年份」一行；
//   4. 气氛交给空间、光、声与静默，不用文字解释气氛；
//   5. 零原作叙事剧透：不复述任何电影/剧集情节，不引用影视
//      对白 verbatim（源码级单测扫描禁词）。
// 短引语 + 出处类型（访谈/著作）属非商业粉丝纪念语境下的合理
// 使用；不摘抄任何受版权保护的长段文字。
// ============================================================

// ---------- 林奇原话短引语（访谈/著作，短句合理使用） ----------
export const QUOTES = [
  {
    id: 'bigfish',
    en: 'Ideas are like fish. If you want to catch the big fish, you\u2019ve got to go deeper.',
    zh: '点子像鱼。想抓大鱼，就得潜到更深的水里去。',
    source: '《Catching the Big Fish》著作 · 2006'
  },
  {
    id: 'meaning',
    en: 'It\u2019s better not to know so much about what things mean.',
    zh: '最好不要太清楚事物意味着什么。',
    source: '公开访谈'
  },
  {
    id: 'sense',
    en: 'I don\u2019t know why people expect art to make sense. They accept the fact that life doesn\u2019t make sense.',
    zh: '我不明白为什么人们要求艺术讲得通——他们明明接受了生活讲不通这件事。',
    source: '公开访谈'
  },
  {
    id: 'sound5050',
    en: 'Films are 50 percent visual and 50 percent sound.',
    zh: '电影一半是画面，一半是声音。',
    source: '公开访谈'
  },
  {
    id: 'home',
    en: 'The home is a place where things can go wrong.',
    zh: '家，就是会出事的地方。',
    source: '公开访谈'
  },
  {
    id: 'coffee',
    en: 'Even bad coffee is better than no coffee at all.',
    zh: '再难喝的咖啡，也好过没有咖啡。',
    source: '《Catching the Big Fish》著作 · 2006'
  },
  {
    id: 'you',
    en: 'The thing about meditation is: you become more and more you.',
    zh: '冥想这件事是：你会越来越像你自己。',
    source: '公开访谈'
  },
  {
    id: 'voice',
    en: 'Stay true to yourself. Let your voice ring out, and don\u2019t let anybody fiddle with it.',
    zh: '忠于你自己。让你的声音响出来，别让任何人乱动它。',
    source: '公开访谈'
  },
  {
    id: 'philly',
    en: 'Philadelphia was my biggest influence.',
    zh: '费城是我一生最大的影响。',
    source: '公开访谈（多次提及）'
  },
  {
    id: 'darkness',
    en: 'I learned that just beneath the surface there\u2019s another world.',
    zh: '我学到的是：就在表面底下，还有另一个世界。',
    source: '公开访谈'
  },
  {
    id: 'doughnut',
    en: 'Keep your eye on the doughnut, not on the hole.',
    zh: '盯着甜甜圈，别盯着那个洞。',
    source: '公开访谈（多次提及）'
  },
  {
    id: 'intuition',
    en: 'Intuition is the key to everything.',
    zh: '直觉是一切的钥匙。',
    source: '公开访谈'
  },
  {
    id: 'cinema',
    en: 'Cinema is a language. It can say big, abstract things.',
    zh: '电影是一种语言。它能说出巨大而抽象的事。',
    source: '《Catching the Big Fish》著作 · 2006'
  },
  {
    id: 'idea',
    en: 'The idea is the whole thing. If you stay true to the idea, it tells you everything you need to know.',
    zh: '点子就是一切。忠于那个点子，它会告诉你全部。',
    source: '《Catching the Big Fish》著作 · 2006'
  },
  {
    id: 'absurd',
    en: 'I look at the world and I see absurdity all around me.',
    zh: '我看这个世界，满眼都是荒诞。',
    source: '公开访谈'
  },
  {
    id: 'different',
    en: 'Every viewer is going to get a different thing.',
    zh: '每个观众带走的东西都不一样。',
    source: '公开访谈'
  },
  {
    id: 'complicated',
    en: 'Life is very, very complicated, and so films should be allowed to be, too.',
    zh: '生活复杂得很，所以也请允许电影复杂。',
    source: '公开访谈'
  },
  {
    id: 'texture',
    en: 'I like things that go into hidden, mysterious places.',
    zh: '我喜欢那些通往隐秘之处的东西。',
    source: '公开访谈'
  }
];

export function quoteById(id) {
  return QUOTES.find((q) => q.id === id) || null;
}

// ---------- 博物馆讲解层（v1.6 新增） ----------
// (b) 进厅讲解卡：每厅两行「博物馆之声」——只讲公开背景事实与空间导引，
//     不复述剧情、不用说教腔（单测扫描禁词）；每行 ≤ 26 字。
// (c) 物品旁白：各厅 hotspot 调 ui.docentNote()（单测扫描 ≤ 46 字）。
// (d) 名言/想法漂浮：QUOTES 库随时间在厅内轻轻淌过（main.js 调度）。
export const DOCENT = {
  lobby: {
    title: '天鹅绒大厅 · THE FOYER',
    lines: ['大卫·林奇（1946–2025），画家出身的电影人。', '六扇门，五十年：影像、绘画、音乐与天气。']
  },
  archive: {
    title: '档案长廊 · THE ARCHIVE',
    lines: ['从 1966 年的动画实验到 2017 年的归来。', '灯牌只写年份与名字，其余交给放映机。']
  },
  eraserhead: {
    title: '橡皮头 · ERASERHEAD (1977)',
    lines: ['第一部长片，断续拍了五年才完成。', '费城的工业噪声从此住进他所有作品。']
  },
  bluevelvet: {
    title: '蓝丝绒 · BLUE VELVET (1986)',
    lines: ['片名来自 1963 年的一首同名老歌。', '小镇草坪之下，藏着另一个世界。']
  },
  twinpeaks: {
    title: '双峰 · TWIN PEAKS (1990–2017)',
    lines: ['一部改变电视的剧集：小镇、咖啡与冷杉。', '归来季与首播相隔二十五年。']
  },
  mulholland: {
    title: '穆赫兰道 · MULHOLLAND DR. (2001)',
    lines: ['被退回的剧集试播集，两年后重生为电影。', '2001 年获戛纳电影节最佳导演奖。']
  },
  studio: {
    title: '他的房间 · HIS ROOM',
    lines: ['画架、咖啡、香烟与冥想：他每天的功课。', '他练习超觉冥想逾五十年，从未间断。']
  }
};

// ---------- 冥想深潜的「意念」碎片（v1.6） ----------
// 潜到深处时一粒一粒亮起的原创意象短句（≤ 12 字，抽象母题，
// 不指涉任何具体剧情），最后一粒会被带回画架。
export const MEDITATION_IDEAS = [
  '一间红色的房间。',
  '雨里的霓虹灯。',
  '楼梯上方的风扇。',
  '深夜电台的杂音。',
  '一条只有车灯的路。',
  '半张脸的月亮。',
  '烧了一半的火柴。',
  '窗帘后面的风。'
];

// ---------- 旁白（v1.3：v1.0 克制量级。每厅一句 ≤16 字，
// 风格化空间提示，首访一次，迟到而安静） ----------
export const NARRATIONS = {
  welcome: { lang: 'zh-CN', text: '慢慢走。让眼睛先适应黑。' },
  lobby: { lang: 'zh-CN', text: '六扇门，六种深浅的黑。' },
  archive: { lang: 'zh-CN', text: '灯下只有年份和名字。' },
  eraserhead: { lang: 'zh-CN', text: '听，这栋楼在呼吸。' },
  bluevelvet: { lang: 'zh-CN', text: '灯只照亮歌者的一半。' },
  twinpeaks: { lang: 'zh-CN', text: '风穿过冷杉。咖啡还热。' },
  mulholland: { lang: 'zh-CN', text: '这条路只在夜里成立。' },
  studio: { lang: 'zh-CN', text: '他的房间。咖啡还温着。' }
};

// 版权与合规声明（应用内页 + README 同步；只保留必要事实陈述）
export const LEGAL = {
  title: '版权与合规声明',
  badge: '本项目为独立粉丝艺术纪念展 · 非官方 · 非授权商品 · 不作商业用途',
  paras: [
    '「烟与天鹅绒 SMOKE & VELVET」是一座由粉丝独立制作的数字纪念展览馆，用以悼念导演大卫·林奇' +
    '（David Lynch, 1946–2025），与林奇家族、其遗产管理方、任何制片公司、发行商或版权方均无关联，' +
    '亦未获得其授权或背书。',
    '本展馆不包含且拒绝包含：任何电影或剧集的画面与截图、官方海报及其复制、原声带音频采样、' +
    '影视作品中受版权保护对白的逐字引用、受保护角色的精确肖像，以及任何商标性标识。',
    '本展馆包含的全部内容均为：程序化生成的原创美术与音频（几何、材质、粒子、合成音效、旁白文本）、' +
    '公有领域的客观事实（作品名称、发表年份、公开奖项记录）。',
    '展签中出现的林奇本人语句，为其公开访谈与著作中的短引语，均注明出处类型，' +
    '在非商业粉丝纪念展语境下属合理使用（fair use）；本馆不转载任何受版权保护的长段文字。',
    '作品名称与人名的出现仅用于事实性指称（nominative use）。若任何权利方认为本项目存在不当使用，' +
    '请通过项目仓库提出，我们将立即处理。'
  ]
};

export const ABOUT_RENDER = {
  title: '关于画质',
  paras: [
    '本馆所有画面为实时渲染：PBR 材质、Bloom、胶片颗粒、色差与暗角后处理、体积氛围与粒子，' +
    '全部程序化生成，`Q` 键可切换画质档位。'
  ]
};
