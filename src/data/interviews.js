// ============================================================
// 访谈摘录（v1.13 新增）——「更多他自己的话」。
// 与 QUOTES（立牌名言库）分工：QUOTES 是厅内立牌的一句话；
// 这里是可主动翻阅的访谈/著作摘录册（HUD 面板 + 档案廊剪报盒）。
// 纪律与 QUOTES 相同并加严：
//   1. 只收公开访谈 / 著作 / 纪录片访谈 / 公开播报中的**短引语**
//      （合理使用：英文单条 ≤200 字符、中文 ≤120），注明出处类型；
//   2. context 为策展一句话（≤60 字、≤2 短句）：只写可查证的
//      事实语境，不解读、不理论、不复述任何影视剧情；
//   3. 零叙事剧透、零影视对白、零角色名（单测扫描）；
//   4. 不谈本馆制作方法（元叙述禁词扫描）；
//   5. 与 QUOTES 零重复（id 与英文原句都不重，单测扫描）。
// v1.15：28 条全部归入四个主题（点子/电影/心境/此生），面板可筛选。
// v1.16：28 → 32，补「点子」主题（5 → 9 条，四主题分布 9/9/8/6）。
// v1.17：32 → 34，补「此生」主题（6 → 8 条，四主题分布 9/9/8/8）。
// v1.18：34 → 38，四主题齐涨（10/10/9/9——单主题 ≥10 前先扩别的
//        的口径本轮起改为整排推进）。
// v1.20：38 持平——封顶 40 后转质量维护首轮：**替换弱条目而非
//        追加**（absurdity → detectives，见条目处留账）。
// ============================================================

/** 主题筛选口径（面板筛选片顺序即此顺序） */
export const INTERVIEW_THEMES = ['点子', '电影', '心境', '此生'];

export const INTERVIEWS = [
  {
    id: 'anotherworld',
    topic: '拍电影',
    theme: '电影',
    en: 'I like to make films because I like to go into another world. I like to get lost in another world.',
    zh: '我拍电影，是因为我喜欢走进另一个世界——喜欢在那个世界里迷路。',
    source: '公开访谈',
    context: '被问到为什么坚持拍片时，他多次给出这个答案。'
  },
  {
    id: 'fragments',
    topic: '点子的形状',
    theme: '点子',
    en: 'Ideas come in fragments. The first fragment is like the Rosetta Stone.',
    zh: '点子是一片一片来的。第一片就像罗塞塔石碑，其余由它解开。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他形容创作从碎片开始，拼合靠等待与直觉。'
  },
  {
    id: 'cinemalanguage',
    topic: '电影这种语言',
    theme: '电影',
    en: 'Cinema is a language. It can say big, abstract things.',
    zh: '电影是一种语言，它能说出巨大而抽象的事。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他以此解释为何有些感受只能拍出来、说不出来。'
  },
  {
    id: 'negativity',
    topic: '工作状态',
    theme: '心境',
    en: 'Negativity is the enemy of creativity.',
    zh: '消极是创造力的敌人。',
    source: '公开访谈',
    context: '他谈创作环境时反复强调的一句。'
  },
  {
    id: 'suffering',
    topic: '受苦的神话',
    theme: '心境',
    en: 'You don\u2019t have to suffer to show suffering.',
    zh: '不必真的受苦，才能拍出受苦。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他不认同「艺术家必须痛苦」的流行想象。'
  },
  {
    id: 'artlife',
    topic: '艺术生活',
    theme: '此生',
    en: 'You drink coffee, you smoke cigarettes, and you paint. That\u2019s the art life.',
    zh: '喝咖啡，抽烟，画画——这就是艺术生活。',
    source: '纪录片访谈 · 2016',
    context: '他回忆美术学院时代对「画家的一生」的全部想象。'
  },
  // v1.20 质量维护（替换不追加）：原「看世界」（absurdity——满眼
  // 荒诞）退役：与立牌 sense（「生活讲不通」）领地重叠、语义最薄。
  // 换入同主题（心境）侦探句——条数 38 与四主题 10/10/9/9 双持平。
  // 防撞记录：detective(s) 全库（QUOTES/INTERVIEWS/DOCENT）零出现，
  // 逐句比对零重复。
  {
    id: 'detectives',
    topic: '都在找的东西',
    theme: '心境',
    en: 'We\u2019re all like detectives in life. There\u2019s something at the end of the trail that we\u2019re all looking for.',
    zh: '我们在生活里都像侦探——小路的尽头有个东西，我们都在找它。',
    source: '公开访谈',
    context: '他谈人对谜团的天然亲近时说过这句，被反复转述。'
  },
  {
    id: 'happiness',
    topic: '快乐在哪里',
    theme: '心境',
    en: 'True happiness is not out there. True happiness lies within.',
    zh: '真正的快乐不在外面，在里面。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '这也是他坚持冥想四十余年的理由。'
  },
  {
    id: 'continuing',
    topic: '讲不完的故事',
    theme: '电影',
    en: 'I love a continuing story.',
    zh: '我爱讲不完的故事。',
    source: '公开访谈',
    context: '谈电视剧集这种形式时他说的偏爱。'
  },
  {
    id: 'paintmove',
    topic: '起点',
    theme: '此生',
    en: 'I wanted to see my paintings move.',
    zh: '我想看见我的画动起来。',
    source: '公开访谈',
    context: '他多次复述从画布走向胶片的那个起点。'
  },
  {
    id: 'dreamlogic',
    topic: '梦的走法',
    theme: '点子',
    en: 'I love dream logic. I just like the way dreams go.',
    zh: '我爱梦的逻辑——我就是喜欢梦行进的方式。',
    source: '公开访谈',
    context: '他谈的是叙事的走法，而不是任何一部具体作品。'
  },
  {
    id: 'complicated',
    topic: '复杂的权利',
    theme: '电影',
    en: 'Life is very, very complicated, and so films should be allowed to be, too.',
    zh: '生活非常非常复杂，电影也应当被允许如此。',
    source: '公开访谈',
    context: '面对「看不懂」的追问，他把问题还给了生活。'
  },
  // ---------- v1.14 扩容（12 → 20）：同一纪律，八个新话题 ----------
  {
    id: 'eaglescout',
    topic: '自我介绍',
    theme: '此生',
    en: 'Eagle Scout, Missoula, Montana.',
    zh: '鹰级童子军，蒙大拿州米苏拉。',
    source: '公开访谈',
    context: '他最著名的个人简介只有这一行，此后反复沿用。'
  },
  {
    id: 'differentthing',
    topic: '每个观众',
    theme: '电影',
    en: 'Every viewer is going to get a different thing. That\u2019s the beauty of cinema.',
    zh: '每个观众得到的东西都不一样——这正是电影的美妙之处。',
    source: '公开访谈',
    context: '他谢绝为作品给出标准答案时常这样回答。'
  },
  {
    id: 'opposites',
    topic: '对立面',
    theme: '心境',
    en: 'We live in a world of opposites. The trick is to reconcile those opposing things.',
    zh: '我们住在一个满是对立面的世界里，诀窍是让相反的两端和解。',
    source: '公开访谈',
    context: '谈到明与暗为何总是同时出现时他说的。'
  },
  {
    id: 'poison',
    topic: '毒药',
    theme: '心境',
    en: 'Anger and depression and sorrow are beautiful things in a story, but they\u2019re like poison to the filmmaker or artist.',
    zh: '愤怒、抑郁、悲伤放进故事里很美，但对拍电影的人和艺术家本人，它们是毒药。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '与「不必受苦」互为一体的另一半论证。'
  },
  {
    id: 'darkplaces',
    topic: '幽暗处',
    theme: '电影',
    en: 'I like things that go into hidden, mysterious places, places I want to explore that are very disturbing.',
    zh: '我喜欢通往隐秘神秘之处的东西——那些令人不安、我却想去探索的地方。',
    source: '公开访谈',
    context: '被问到题材偏好时他给过的方向感。'
  },
  {
    id: 'industry',
    topic: '工业',
    theme: '此生',
    en: 'I love industry. Pipes. I love fluid and smoke. I love man-made things.',
    zh: '我爱工业。管道。我爱流体和烟。我爱人造的东西。',
    source: '《Lynch on Lynch》访谈录 · 1997',
    context: '这份对管道与烟的偏爱始于费城年代。'
  },
  {
    id: 'nevermissed',
    topic: '从不缺席',
    theme: '心境',
    en: 'I have never missed a meditation in thirty-three years. I meditate once in the morning and again in the afternoon.',
    zh: '三十三年来我没有漏掉过一次冥想。早晨一次，下午再一次。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '书出版时他已保持每日两次冥想三十余年。'
  },
  {
    id: 'firstidea',
    topic: '第一个点子',
    theme: '点子',
    en: 'You fall in love with the first idea, that little tiny piece. And once you\u2019ve got it, the rest will come in time.',
    zh: '你会爱上第一个点子，那一小片。一旦抓住它，其余的会随时间到来。',
    source: '公开访谈',
    context: '与「碎片与罗塞塔石碑」一说互为注脚。'
  },
  // ---------- v1.15 扩容（20 → 28）：同一纪律，八个新话题 ----------
  {
    id: 'trueidea',
    topic: '忠于点子',
    theme: '点子',
    en: 'The idea is the whole thing. If you stay true to the idea, it tells you everything you need to know, really.',
    zh: '点子就是全部。只要忠于那个点子，它会告诉你需要知道的一切。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他把点子当成可以反复核对的蓝图。'
  },
  {
    id: 'mystery',
    topic: '谜',
    theme: '点子',
    en: 'The more unknowable the mystery, the more beautiful it is.',
    zh: '谜越是不可知，就越美。',
    source: '公开访谈',
    context: '被追问答案时，他更愿意保住问题本身。'
  },
  {
    id: 'redcurtain',
    topic: '红帷幕',
    theme: '电影',
    en: 'It\u2019s so magical \u2014 I don\u2019t know why \u2014 to go into a theater and have the lights go down. Then the curtains start to open. Maybe they\u2019re red. And you go into a world.',
    zh: '走进影院，灯暗下来，帷幕开始拉开——也许是红色的。然后你走进一个世界。这有多神奇，我说不清。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他描述的是影院本身；红帷幕后来成了他的签名意象。'
  },
  {
    id: 'filmdead',
    topic: '胶片之后',
    theme: '电影',
    en: 'I\u2019m through with film as a medium. For me, film is dead.',
    zh: '胶片这个媒介，对我来说结束了——胶片死了。',
    source: '公开访谈',
    context: '转用数字拍摄后，他公开表明过这个立场。'
  },
  {
    id: 'finalcut',
    topic: '最终剪辑权',
    theme: '电影',
    en: 'I would rather not make a film than make one where I don\u2019t have final cut.',
    zh: '宁可不拍，也不拍一部我没有最终剪辑权的电影。',
    source: '公开访谈',
    context: '那次失去最终剪辑权的经历之后，他再没让步。'
  },
  {
    id: 'golfball',
    topic: '高尔夫球',
    theme: '心境',
    en: 'If you have a golf-ball-sized consciousness, when you read a book, you\u2019ll have a golf-ball-sized understanding.',
    zh: '如果你的意识只有高尔夫球那么大，读一本书，就只有高尔夫球那么大的理解。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他讲扩大意识时最常用的比方，讲座里也反复讲。'
  },
  {
    id: 'selfish',
    topic: '自私的权利',
    theme: '此生',
    en: 'You gotta be selfish. And it\u2019s a terrible thing.',
    zh: '你必须自私。这是件可怕的事。',
    source: '纪录片访谈 · 2016',
    context: '他回顾艺术生活对身边人的代价时说的。'
  },
  {
    id: 'weathersign',
    topic: '天气播报',
    theme: '此生',
    en: 'Blue skies and golden sunshine all along the way.',
    zh: '一路蓝天，一路金色的阳光。',
    source: '每日天气播报 · 2020-2022',
    context: '他晚年每天早晨向公众播报天气，这是他的收尾语。'
  },
  // ---------- v1.16 扩容（28 → 32）：补「点子」主题，同一纪律 ----------
  // 防撞记录：doughnut（甜甜圈）与 beneath the surface（表面之下）
  // 两句候选均已是 QUOTES 立牌语录，本轮弃用；四条全部取自
  // 《钓大鱼》可查证原文，与 bigfish 立牌句零重复（逐句比对）。
  {
    id: 'baitpatience',
    topic: '钓点子要等',
    theme: '点子',
    en: 'Desire for an idea is like bait. When you\u2019re fishing, you have to have patience. You bait your hook, and then you wait.',
    zh: '对点子的渴望就像鱼饵。钓鱼这件事要有耐心——把饵挂好，然后等。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他把「等」当成钓点子的基本功，急不来。'
  },
  {
    id: 'ideaspark',
    topic: '接住的一瞬',
    theme: '点子',
    en: 'An idea is a thought. It\u2019s a thought that holds more than you think it does when you receive it.',
    zh: '点子是一个念头——在你接住它的那一刻，它装着的东西比你以为的多。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '书中「点子」一章的开头几句。'
  },
  {
    id: 'puzzleroom',
    topic: '隔壁的拼图',
    theme: '点子',
    en: 'In the other room, the puzzle is all put together. But they keep flipping in just one piece at a time.',
    zh: '在隔壁房间里，拼图早已拼好；只是他们一次只肯扔进来一片。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '与「碎片与罗塞塔石碑」一说同章，讲等点子的耐心。'
  },
  {
    id: 'littlefish',
    topic: '小鱼与大鱼',
    theme: '点子',
    en: 'Little fish swim on the surface, but the big ones swim down below.',
    zh: '小鱼游在水面，大鱼沉在深处。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '书名的出处段落，与立牌上那句大鱼互为上下句。'
  },
  // ---------- v1.17 扩容（32 → 34）：补「此生」主题（6 → 8），同一纪律 ----------
  // 防撞记录：QUOTES 与既有条目逐句比对零重复（'retire'/'the past'
  // 两关键词全库不存在）；「艺术生活」与「自私的权利」同为纪录片
  // 语源但原句不同段。
  {
    id: 'pastcolors',
    topic: '过去上的色',
    theme: '此生',
    en: 'Sometimes the past can conjure those ideas and color them. Even if they\u2019re new ideas, the past colors them.',
    zh: '有时是过去把点子召来，又给它们上色——哪怕是新点子，过去也会给它上色。',
    source: '纪录片访谈 · 2016',
    context: '他回望童年与费城岁月如何渗进后来的一切时说的。'
  },
  {
    id: 'neverretire',
    topic: '不退休',
    theme: '此生',
    en: 'I am filled with happiness, and I will never retire.',
    zh: '我心里满是幸福，而且我永远不会退休。',
    source: '公开播报 · 2024',
    context: '公开确认肺气肿诊断时，他用这句话向公众收尾。'
  },
  // ---------- v1.18 扩容（34 → 38）：四主题齐涨（9/9/8/8 → 10/10/9/9） ----------
  // 防撞记录：候选「五五开的声画」（sound5050）/「直觉是钥匙」
  // （intuition）/「越来越像你自己」（you）三句均已是 QUOTES 立牌
  // 语录，本轮弃用换句；四条与既有 34 条及 QUOTES 逐句比对零重复。
  {
    id: 'ideasdictate',
    topic: '点子说了算',
    theme: '点子',
    en: 'Ideas dictate everything. You have to be true to that or you\u2019re dead.',
    zh: '一切都由点子说了算。你必须忠于它，不然你就完了。',
    source: '公开访谈',
    context: '他谈创作决策时，把最终决定权交还给点子本身。'
  },
  {
    id: 'telephone',
    topic: '在电话上看电影',
    theme: '电影',
    en: 'If you\u2019re playing the movie on a telephone, you will never in a trillion years experience the film. You\u2019ll think you have experienced it, but you\u2019ll be cheated.',
    zh: '在电话那么大的屏幕上放电影，一万亿年也体验不到那部片子——你以为你看过了，其实你被骗了。',
    source: '公开访谈',
    context: '他坚持电影要在大银幕和好声音里看完，这段话后来广为流传。'
  },
  {
    id: 'abstractions',
    topic: '生活的抽象',
    theme: '心境',
    en: 'Life is filled with abstractions, and the only way we make heads or tails of it is through intuition.',
    zh: '生活里满是抽象的东西，我们唯一能理出头绪的办法，是靠直觉。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '与立牌上那句「直觉」互为上下文：这里说的是生活，不是创作。'
  },
  {
    id: 'milkman',
    topic: '五十年代的小城',
    theme: '此生',
    en: 'My childhood was elegant homes, tree-lined streets, the milkman, building forts, droning airplanes, blue skies, picket fences, green grass, cherry trees.',
    zh: '我的童年是雅致的屋子、成排的绿树、送奶人、搭堡垒、嗡嗡掠过的飞机、蓝天、白篱笆、绿草、樱桃树。',
    source: '《Lynch on Lynch》访谈录 · 1997',
    context: '他常这样一口气罗列自己的小城童年；那之后的话才是转折。'
  }
];

export function interviewById(id) {
  return INTERVIEWS.find((v) => v.id === id) || null;
}
