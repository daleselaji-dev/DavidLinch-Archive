// ============================================================
// 大卫·林奇 作品年表 — 仅收录公开事实（片名/年份/类型/奖项等），
// 所有评述文字（oneliner / note）均为本展馆原创文案。
// 不含任何受版权保护的对白、剧照或原声内容。
// ============================================================

export const ARTIST = {
  name: 'David Lynch',
  nameZh: '大卫·林奇',
  born: '1946年1月20日 · 美国蒙大拿州米苏拉',
  died: '2025年1月15日 · 享年78岁',
  roles: '导演 / 编剧 / 画家 / 音乐人 / 家具匠人 / 冥想倡导者',
  honors: [
    '1990 戛纳电影节 金棕榈奖（《我心狂野》）',
    '2001 戛纳电影节 最佳导演奖（《穆赫兰道》）',
    '2006 威尼斯电影节 终身成就金狮奖',
    '2019 奥斯卡终身成就荣誉奖',
    '三次奥斯卡最佳导演提名（1980 / 1986 / 2001）',
    '法国荣誉军团骑士勋章'
  ]
};

// type: feature 长片 / tv 剧集 / short 短片集 / doc 纪录
export const FILMS = [
  {
    id: 'eraserhead', year: 1977, type: 'feature',
    title: 'Eraserhead', titleZh: '橡皮头',
    hall: 'eraserhead', accent: '#9fb4c7',
    oneliner: '黑白粗颗粒的工业梦魇：为人父的恐惧被铸成一台永不停歇的机器。',
    facts: [
      '林奇的长片处女作，在美国电影学会（AFI）资助下断续拍摄约五年完成。',
      '全片以黑白摄影与致密的环境音床构筑不安，成为午夜场电影的传奇。',
      '声音设计与 Alan Splet 合作完成，确立了林奇标志性的"房间的嗡鸣"。'
    ]
  },
  {
    id: 'elephant-man', year: 1980, type: 'feature',
    title: 'The Elephant Man', titleZh: '象人',
    hall: null, accent: '#c7c2b8',
    oneliner: '维多利亚时代的黑白挽歌：畸形的皮囊之下，是最温柔的灵魂。',
    facts: [
      '获八项奥斯卡提名，包括最佳影片与最佳导演。',
      '黑白摄影向早期工业城市影像致意，蒸汽与烟囱成为重要视觉母题。'
    ]
  },
  {
    id: 'dune', year: 1984, type: 'feature',
    title: 'Dune', titleZh: '沙丘',
    hall: null, accent: '#c9a35c',
    oneliner: '一次庞大而痛苦的太空歌剧尝试；林奇此后坚持"最终剪辑权"底线。',
    facts: [
      '改编自 Frank Herbert 的同名科幻小说。',
      '商业失利促使林奇转向完全作者性的创作道路。'
    ]
  },
  {
    id: 'blue-velvet', year: 1986, type: 'feature',
    title: 'Blue Velvet', titleZh: '蓝丝绒',
    hall: 'bluevelvet', accent: '#26418f',
    oneliner: '修剪整齐的草坪之下，蚂蚁在黑暗里沸腾——小镇美国的双面显影。',
    facts: [
      '为林奇赢得第二次奥斯卡最佳导演提名。',
      '与摄影师 Frederick Elmes、作曲家 Angelo Badalamenti 的合作自此展开。',
      '"歌者与夜总会"成为林奇宇宙反复回响的空间原型。'
    ]
  },
  {
    id: 'wild-at-heart', year: 1990, type: 'feature',
    title: 'Wild at Heart', titleZh: '我心狂野',
    hall: null, accent: '#d4243c',
    oneliner: '公路、火焰与蛇皮夹克：一场横穿美国南方的炽烈狂想。',
    facts: [
      '获1990年戛纳电影节金棕榈奖。',
      '公路片外壳下嵌套着童话结构的黑色变奏。'
    ]
  },
  {
    id: 'twin-peaks', year: 1990, type: 'tv',
    title: 'Twin Peaks (TV)', titleZh: '双峰（剧集）',
    hall: 'twinpeaks', accent: '#1f5c3d',
    oneliner: '一桩小镇悬案撕开了美国客厅的墙纸；电视叙事从此被重写。',
    facts: [
      '与 Mark Frost 共同创作，1990–1991 播出两季。',
      '将超现实主义带入黄金时段电视，影响其后三十年的剧集美学。',
      '红色帷幕、黑白折线地板与倒放语声成为大众文化符号。'
    ]
  },
  {
    id: 'fire-walk-with-me', year: 1992, type: 'feature',
    title: 'Twin Peaks: Fire Walk with Me', titleZh: '双峰：与火同行',
    hall: 'twinpeaks', accent: '#7a3b12',
    oneliner: '回到悬案之前：一部关于痛苦本身的、灼热而悲悯的前传。',
    facts: [
      '首映时毁誉参半，其后三十年间被重新评价为林奇最深情的作品之一。'
    ]
  },
  {
    id: 'lost-highway', year: 1997, type: 'feature',
    title: 'Lost Highway', titleZh: '妖夜慌踪',
    hall: null, accent: '#2b2b33',
    oneliner: '深夜公路的黄色虚线吞噬了身份：一条莫比乌斯环般的叙事。',
    facts: [
      '与作家 Barry Gifford 共同编剧。',
      '"心理迷游"（psychogenic fugue）结构的第一次完整实验。'
    ]
  },
  {
    id: 'straight-story', year: 1999, type: 'feature',
    title: 'The Straight Story', titleZh: '史崔特先生的故事',
    hall: null, accent: '#7d8a4c',
    oneliner: '林奇最安静的电影：一位老人骑着割草机横越州界去见兄弟。',
    facts: [
      '基于真实人物 Alvin Straight 的旅程。',
      '证明林奇的温柔与他的黑暗同样深邃。'
    ]
  },
  {
    id: 'mulholland-drive', year: 2001, type: 'feature',
    title: 'Mulholland Drive', titleZh: '穆赫兰道',
    hall: 'mulholland', accent: '#3ec5ff',
    oneliner: '好莱坞之梦在午夜对折：前一半是愿望，后一半是账单。',
    facts: [
      '获2001年戛纳电影节最佳导演奖，及第三次奥斯卡最佳导演提名。',
      '多家影评机构评选的"21世纪最佳影片"榜单常年首位。',
      '由夭折的电视试播集重构为电影——结构本身即是一场梦的证词。'
    ]
  },
  {
    id: 'inland-empire', year: 2006, type: 'feature',
    title: 'Inland Empire', titleZh: '内陆帝国',
    hall: null, accent: '#5d3a6e',
    oneliner: '手持DV潜入表演者的意识深处：三小时的数字迷宫。',
    facts: [
      '林奇首部全数字拍摄长片，宣告其后期创作转向。',
      '大量场景在没有完整剧本的状态下逐日生长。'
    ]
  },
  {
    id: 'twin-peaks-return', year: 2017, type: 'tv',
    title: 'Twin Peaks: The Return', titleZh: '双峰：回归',
    hall: 'twinpeaks', accent: '#0f2f4c',
    oneliner: '十八小时的告别曲：电视史上最接近纯粹艺术的时刻之一。',
    facts: [
      '全部十八集由林奇亲自执导。',
      '第八集常被论者称为"在黄金时段播出的实验电影"。',
      '多家媒体将其评为2010年代最佳影视作品。'
    ]
  },
  {
    id: 'shorts', year: 1966, type: 'short',
    title: 'Short Works & Paintings', titleZh: '短片与绘画（1966年起）',
    hall: null, accent: '#8f8f8f',
    oneliner: '一切始于一幅"会动的画"：费城美术学院时期的实验短片与终生不辍的绘画。',
    facts: [
      '费城宾夕法尼亚美术学院求学期间开始拍摄实验动画与短片。',
      '绘画贯穿其一生，晚年持续举办个展；他始终自认首先是画家。',
      '同时以音乐人身份发行多张专辑，并每日发布天气预报短视频多年。'
    ]
  }
];

export function filmById(id) {
  return FILMS.find((f) => f.id === id) || null;
}

export function filmsSorted() {
  return [...FILMS].sort((a, b) => a.year - b.year);
}
