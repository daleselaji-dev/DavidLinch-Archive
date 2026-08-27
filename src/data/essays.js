// ============================================================
// 展馆文案与旁白稿。
// 文案原则（v1.6 —— 三层讲解体系，仍守克制与零剧透）：
//   1. 尽量让林奇自己解释自己：全站以其公开访谈与著作中的
//      短引语为唯一「解读」，不提供策展评述文章、不借理论名词；
//   2. 三层旁白：
//      · 风格线 NARRATIONS：每厅一句 ≤16 字的空间提示，首访先响；
//      · 馆方讲解 DOCENT：每厅一段 ≤34 字的博物馆背景讲解
//        （公开事实：年份/地点/奖项/工作方式），风格线之后低声补上；
//      · 物品旁白 ITEM_NOTES：重点展项首次交互时一句 ≤26 字的
//        馆方注脚（创作背景/公开事实），每件一次不重复。
//   3. 严禁元叙事（「东西都可以碰」「点击试试」类操作说明）；
//      严禁剧情叙述与对白引用（源码级单测扫描禁词）；
//   4. 展签宁缺毋滥：每厅林奇原话展签 ≤1；事实铭牌只写
//      「片名 + 年份」一行；名言以轮播短引语出现（HALL_QUOTES）；
//   5. 气氛交给空间、光、声与静默，讲解只给事实，不解释气氛。
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
    id: 'spiritual',
    en: 'Eraserhead is my most spiritual movie.',
    zh: '《橡皮头》是我最属灵的一部电影。',
    source: '公开访谈'
  },
  {
    id: 'idea-tells',
    en: 'If you stay true to the idea, it tells you everything you need to know.',
    zh: '只要忠于那个点子，它会告诉你一切你需要知道的。',
    source: '《Catching the Big Fish》著作 · 2006'
  },
  {
    id: 'cinema-language',
    en: 'Cinema is a language. It can say big, abstract things.',
    zh: '电影是一种语言，能说出巨大而抽象的事物。',
    source: '《Catching the Big Fish》著作 · 2006'
  },
  {
    id: 'different-thing',
    en: 'Every viewer is going to get a different thing.',
    zh: '每个观众得到的，都会是不一样的东西。',
    source: '公开访谈'
  }
];

export function quoteById(id) {
  return QUOTES.find((q) => q.id === id) || null;
}

// 每厅名言轮播偏好：驻留约一分钟后，低声浮现一条与该厅作品/创作
// 相关的短引语（每次到访轮换一条，不重复打扰）
export const HALL_QUOTES = {
  lobby: ['sense', 'voice', 'intuition'],
  archive: ['cinema-language', 'idea-tells', 'doughnut'],
  eraserhead: ['spiritual', 'philly', 'darkness'],
  bluevelvet: ['home', 'darkness', 'sound5050'],
  twinpeaks: ['coffee', 'doughnut', 'home'],
  mulholland: ['different-thing', 'meaning', 'sense'],
  studio: ['bigfish', 'you', 'idea-tells']
};

// ---------- 风格线（每厅一句 ≤16 字，首访先响，迟到而安静） ----------
// v1.6：studio 原句「东西可以碰」属元叙事（操作说明），已清除。
export const NARRATIONS = {
  welcome: { lang: 'zh-CN', text: '慢慢走。让眼睛先适应黑。' },
  lobby: { lang: 'zh-CN', text: '六扇门，六种深浅的黑。' },
  archive: { lang: 'zh-CN', text: '灯下只有年份和名字。' },
  eraserhead: { lang: 'zh-CN', text: '听，这栋楼在呼吸。' },
  bluevelvet: { lang: 'zh-CN', text: '灯只照亮歌者的一半。' },
  twinpeaks: { lang: 'zh-CN', text: '风穿过冷杉。咖啡还热。' },
  mulholland: { lang: 'zh-CN', text: '这条路只在夜里成立。' },
  studio: { lang: 'zh-CN', text: '他的房间。灯还亮着。' }
};

// ---------- 馆方讲解（v1.6：博物馆背景/内容讲解，每厅一段 ≤34 字。
// 只陈述公开事实：年份/地点/奖项/工作方式；风格线之后低声补上，
// 首访一次。不解释气氛，不复述剧情。） ----------
export const DOCENT = {
  lobby: { lang: 'zh-CN', text: '烟与天鹅绒——悼念大卫·林奇的展馆。六扇门，各通一件作品。' },
  archive: { lang: 'zh-CN', text: '档案长廊收录一九六六至二〇一七年的作品年表与公开奖项。' },
  eraserhead: { lang: 'zh-CN', text: '《橡皮头》摄制五年，一九七七年上映。展厅重构它的工业夜。' },
  bluevelvet: { lang: 'zh-CN', text: '《蓝丝绒》上映于一九八六年。展厅重构小镇歌厅的灯与夜。' },
  twinpeaks: { lang: 'zh-CN', text: '《双峰》始于一九九〇年。冷杉、咖啡与红房间由此进入电视史。' },
  mulholland: { lang: 'zh-CN', text: '《穆赫兰道》二〇〇一年获戛纳最佳导演。夜路通向一座剧场。' },
  studio: { lang: 'zh-CN', text: '按他公开谈及的日常复原：咖啡、画架、冥想，和一台收音机。' }
};

// ---------- 物品旁白（v1.6：重点展项首次交互时的馆方注脚，
// 每件一句 ≤26 字，只讲创作背景与公开事实，一次不重复） ----------
export const ITEM_NOTES = {
  'lobby-stele': { lang: 'zh-CN', text: '一九四六年生于蒙大拿州米苏拉，二〇二五年离开。' },
  'archive-projector': { lang: 'zh-CN', text: '16 毫米放映机——「会动的画」最初的介质。' },
  'archive-ladder': { lang: 'zh-CN', text: '年表放最高处的，永远是还没拍的那部。' },
  'eraserhead-machine': { lang: 'zh-CN', text: '早年特效多为他亲手制作，这台机器致敬那段手工岁月。' },
  'eraserhead-radiator': { lang: 'zh-CN', text: '暖气炉里藏着一方小舞台——本片最著名的意象之一。' },
  'bluevelvet-jukebox': { lang: 'zh-CN', text: '五十年代点唱机：他挚爱的年代，歌单的入口。' },
  'bluevelvet-curtain': { lang: 'zh-CN', text: '蓝色天鹅绒——片名的质感来源，也是他挚爱的幕布。' },
  'twinpeaks-pie': { lang: 'zh-CN', text: '樱桃派与黑咖啡，剧集里小镇餐馆的日常仪式。' },
  'twinpeaks-scope': { lang: 'zh-CN', text: '瀑布取景自华盛顿州斯诺夸尔米，剧集片头名景。' },
  'mulholland-sign': { lang: 'zh-CN', text: '这条路真实存在，盘在好莱坞北面的山脊上。' },
  'mulholland-cube': { lang: 'zh-CN', text: '原创道具研究：一只不肯说明来历的蓝色立方体。' },
  'studio-easel': { lang: 'zh-CN', text: '他一生先是画家——每天画画，电影是画的延伸。' },
  'studio-radio': { lang: 'zh-CN', text: '他爱听天气预报，也曾亲自每天播一段。' },
  'studio-cushion': { lang: 'zh-CN', text: '他公开练习超越冥想逾五十年，每天两次，从不间断。' }
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
