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
  }
];

export function interviewById(id) {
  return INTERVIEWS.find((v) => v.id === id) || null;
}
