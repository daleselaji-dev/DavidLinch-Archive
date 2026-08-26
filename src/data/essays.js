// ============================================================
// 展馆文案与旁白稿。
// 文案原则（v1.5 —— show, don't tell）：
//   1. 尽量让林奇自己解释自己：全站以其公开访谈与著作中的
//      短引语为唯一「解读」，不提供策展评述文章、不借理论名词；
//   2. 旁白配额：全馆 ≤8 条，每条 ≤16 字，总字数 ≤110；
//      只在首访、延迟出现一次；措辞为风格化空间提示
//      （光/质感/空间感受）或公开事实一行，禁止剧情叙述；
//   3. 引语立牌宁缺毋滥：每厅 ≤1 座，走近才显字；随行的
//      note（一句解释）与 aside（一句评述/公开趣闻）各 ≤36 字，
//      只写事实级内容，不写理论、不写剧情；
//   4. 气氛交给空间、光、声与静默，不用文字解释气氛；
//   5. 零原作叙事剧透：不复述任何电影/剧集情节，不引用影视
//      对白 verbatim（源码级单测扫描禁词）；
//   6. 制作方法不入作品：旁白/立牌/字幕不谈技术与工艺
//      （合规页的必要事实陈述除外，单测扫描禁词）。
// 短引语 + 出处类型（访谈/著作）属非商业粉丝纪念语境下的合理
// 使用；不摘抄任何受版权保护的长段文字。
// ============================================================

// ---------- 林奇原话短引语（访谈/著作，短句合理使用） ----------
// note  = 一句简短解释（这话从哪儿来/在说什么，事实级）
// aside = 一句评述或公开趣闻（克制，不展开）
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
    source: '公开访谈',
    note: '他一生几乎不解释自己的作品。',
    aside: '被追问含义时，他常常只是微笑。'
  },
  {
    id: 'sense',
    en: 'I don\u2019t know why people expect art to make sense. They accept the fact that life doesn\u2019t make sense.',
    zh: '我不明白为什么人们要求艺术讲得通——他们明明接受了生活讲不通这件事。',
    source: '公开访谈',
    note: '有人要一把钥匙，他给的总是沉默。',
    aside: '影碟版曾附过十条提示，谜照旧是谜。'
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
    source: '公开访谈',
    note: '最安稳的地方，他看得最久。',
    aside: '他反复回到普通人家的门廊与走廊。'
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
    source: '公开访谈',
    note: '他坚持冥想四十多年，一天两次。',
    aside: '据他自述，一次也没有落下过。'
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
    source: '公开访谈（多次提及）',
    note: '他在费城读过美术学院。',
    aside: '他说那座城市的不安一直跟着他。'
  },
  {
    id: 'darkness',
    en: 'I learned that just beneath the surface there\u2019s another world.',
    zh: '我学到的是：就在表面底下，还有另一个世界。',
    source: '公开访谈',
    note: '说的是他记忆里小城明亮的草坪。',
    aside: '小时候，他在树下见过成群的红蚂蚁。'
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
  }
];

export function quoteById(id) {
  return QUOTES.find((q) => q.id === id) || null;
}

// ---------- 旁白（v1.3 起保持 v1.0 克制量级。每厅一句 ≤16 字，
// 风格化空间提示，首访一次，迟到而安静） ----------
export const NARRATIONS = {
  welcome: { lang: 'zh-CN', text: '慢慢走。让眼睛先适应黑。' },
  lobby: { lang: 'zh-CN', text: '六扇门，六种深浅的黑。' },
  archive: { lang: 'zh-CN', text: '灯下只有年份和名字。' },
  eraserhead: { lang: 'zh-CN', text: '听，这栋楼在呼吸。' },
  bluevelvet: { lang: 'zh-CN', text: '灯只照亮歌者的一半。' },
  twinpeaks: { lang: 'zh-CN', text: '风穿过冷杉。咖啡还热。' },
  mulholland: { lang: 'zh-CN', text: '这条路只在夜里成立。' },
  studio: { lang: 'zh-CN', text: '他的房间。东西可以碰。' }
};

// 版权与合规声明（应用内页 + README 同步；只保留必要事实陈述——
// 「程序化生成」在此页是版权事实陈述，不属于展陈文案）
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
