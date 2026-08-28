// ============================================================
// 访谈摘录（v1.13 新增）——「更多他自己的话」。
// 与 QUOTES（立牌名言库）分工：QUOTES 是厅内立牌的一句话；
// 这里是可主动翻阅的访谈/著作摘录册（HUD 面板 + 档案廊剪报盒）。
// 纪律与 QUOTES 相同并加严：
//   1. 只收公开访谈 / 著作 / 纪录片访谈中的**短引语**（合理使用：
//      英文单条 ≤200 字符、中文 ≤120），注明出处类型；
//   2. context 为策展一句话（≤60 字、≤2 短句）：只写可查证的
//      事实语境，不解读、不理论、不复述任何影视剧情；
//   3. 零叙事剧透、零影视对白、零角色名（单测扫描）；
//   4. 不谈本馆制作方法（元叙述禁词扫描）。
// ============================================================

export const INTERVIEWS = [
  {
    id: 'anotherworld',
    topic: '拍电影',
    en: 'I like to make films because I like to go into another world. I like to get lost in another world.',
    zh: '我拍电影，是因为我喜欢走进另一个世界——喜欢在那个世界里迷路。',
    source: '公开访谈',
    context: '被问到为什么坚持拍片时，他多次给出这个答案。'
  },
  {
    id: 'fragments',
    topic: '点子的形状',
    en: 'Ideas come in fragments. The first fragment is like the Rosetta Stone.',
    zh: '点子是一片一片来的。第一片就像罗塞塔石碑，其余由它解开。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他形容创作从碎片开始，拼合靠等待与直觉。'
  },
  {
    id: 'cinemalanguage',
    topic: '电影这种语言',
    en: 'Cinema is a language. It can say big, abstract things.',
    zh: '电影是一种语言，它能说出巨大而抽象的事。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他以此解释为何有些感受只能拍出来、说不出来。'
  },
  {
    id: 'negativity',
    topic: '工作状态',
    en: 'Negativity is the enemy of creativity.',
    zh: '消极是创造力的敌人。',
    source: '公开访谈',
    context: '他谈创作环境时反复强调的一句。'
  },
  {
    id: 'suffering',
    topic: '受苦的神话',
    en: 'You don\u2019t have to suffer to show suffering.',
    zh: '不必真的受苦，才能拍出受苦。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '他不认同「艺术家必须痛苦」的流行想象。'
  },
  {
    id: 'artlife',
    topic: '艺术生活',
    en: 'You drink coffee, you smoke cigarettes, and you paint. That\u2019s the art life.',
    zh: '喝咖啡，抽烟，画画——这就是艺术生活。',
    source: '纪录片访谈 · 2016',
    context: '他回忆美术学院时代对「画家的一生」的全部想象。'
  },
  {
    id: 'absurdity',
    topic: '看世界',
    en: 'I look at the world and I see absurdity all around me.',
    zh: '我看这个世界，满眼都是荒诞。',
    source: '公开访谈',
    context: '被问到素材从哪里来时，他先说的是日常本身。'
  },
  {
    id: 'happiness',
    topic: '快乐在哪里',
    en: 'True happiness is not out there. True happiness lies within.',
    zh: '真正的快乐不在外面，在里面。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '这也是他坚持冥想四十余年的理由。'
  },
  {
    id: 'continuing',
    topic: '讲不完的故事',
    en: 'I love a continuing story.',
    zh: '我爱讲不完的故事。',
    source: '公开访谈',
    context: '谈电视剧集这种形式时他说的偏爱。'
  },
  {
    id: 'paintmove',
    topic: '起点',
    en: 'I wanted to see my paintings move.',
    zh: '我想看见我的画动起来。',
    source: '公开访谈',
    context: '他多次复述从画布走向胶片的那个起点。'
  },
  {
    id: 'dreamlogic',
    topic: '梦的走法',
    en: 'I love dream logic. I just like the way dreams go.',
    zh: '我爱梦的逻辑——我就是喜欢梦行进的方式。',
    source: '公开访谈',
    context: '他谈的是叙事的走法，而不是任何一部具体作品。'
  },
  {
    id: 'complicated',
    topic: '复杂的权利',
    en: 'Life is very, very complicated, and so films should be allowed to be, too.',
    zh: '生活非常非常复杂，电影也应当被允许如此。',
    source: '公开访谈',
    context: '面对「看不懂」的追问，他把问题还给了生活。'
  },
  // ---------- v1.14 扩容（12 → 20）：同一纪律，八个新话题 ----------
  {
    id: 'eaglescout',
    topic: '自我介绍',
    en: 'Eagle Scout, Missoula, Montana.',
    zh: '鹰级童子军，蒙大拿州米苏拉。',
    source: '公开访谈',
    context: '他最著名的个人简介只有这一行，此后反复沿用。'
  },
  {
    id: 'differentthing',
    topic: '每个观众',
    en: 'Every viewer is going to get a different thing. That\u2019s the beauty of cinema.',
    zh: '每个观众得到的东西都不一样——这正是电影的美妙之处。',
    source: '公开访谈',
    context: '他谢绝为作品给出标准答案时常这样回答。'
  },
  {
    id: 'opposites',
    topic: '对立面',
    en: 'We live in a world of opposites. The trick is to reconcile those opposing things.',
    zh: '我们住在一个满是对立面的世界里，诀窍是让相反的两端和解。',
    source: '公开访谈',
    context: '谈到明与暗为何总是同时出现时他说的。'
  },
  {
    id: 'poison',
    topic: '毒药',
    en: 'Anger and depression and sorrow are beautiful things in a story, but they\u2019re like poison to the filmmaker or artist.',
    zh: '愤怒、抑郁、悲伤放进故事里很美，但对拍电影的人和艺术家本人，它们是毒药。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '与「不必受苦」互为一体的另一半论证。'
  },
  {
    id: 'darkplaces',
    topic: '幽暗处',
    en: 'I like things that go into hidden, mysterious places, places I want to explore that are very disturbing.',
    zh: '我喜欢通往隐秘神秘之处的东西——那些令人不安、我却想去探索的地方。',
    source: '公开访谈',
    context: '被问到题材偏好时他给过的方向感。'
  },
  {
    id: 'industry',
    topic: '工业',
    en: 'I love industry. Pipes. I love fluid and smoke. I love man-made things.',
    zh: '我爱工业。管道。我爱流体和烟。我爱人造的东西。',
    source: '《Lynch on Lynch》访谈录 · 1997',
    context: '这份对管道与烟的偏爱始于费城年代。'
  },
  {
    id: 'nevermissed',
    topic: '从不缺席',
    en: 'I have never missed a meditation in thirty-three years. I meditate once in the morning and again in the afternoon.',
    zh: '三十三年来我没有漏掉过一次冥想。早晨一次，下午再一次。',
    source: '《Catching the Big Fish》著作 · 2006',
    context: '书出版时他已保持每日两次冥想三十余年。'
  },
  {
    id: 'firstidea',
    topic: '第一个点子',
    en: 'You fall in love with the first idea, that little tiny piece. And once you\u2019ve got it, the rest will come in time.',
    zh: '你会爱上第一个点子，那一小片。一旦抓住它，其余的会随时间到来。',
    source: '公开访谈',
    context: '与「碎片与罗塞塔石碑」一说互为注脚。'
  }
];

export function interviewById(id) {
  return INTERVIEWS.find((v) => v.id === id) || null;
}
