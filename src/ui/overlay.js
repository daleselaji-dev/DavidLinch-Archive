// ============================================================
// UI Overlay — HUD / 信息面板 / 年表 / 留言墙 / 合规页 / 帮助 / 触屏控件
// 所有动态文本一律通过 textContent 注入（XSS 安全）。
// ============================================================
import { FILMS, filmById, filmsSorted, ARTIST } from '../data/filmography.js';
import { QUOTES, LEGAL } from '../data/essays.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export class UI {
  /**
   * opts: { audio, store, onGoHall(id), onOpenChange(bool), onAct(),
   *         onToggleMute()->bool, onToggleNarration()->bool, onToggleQuality()->string }
   */
  constructor(opts) {
    this.o = opts;
    this.hud = document.getElementById('hud');
    this.panels = document.getElementById('panels');
    this.fader = document.getElementById('fader');
    this._captionTimer = null;
    this._openCount = 0;
    this._buildHud();
    this._buildPanels();
  }

  get anyOpen() {
    return this._openCount > 0;
  }

  // ---------------- HUD ----------------
  _buildHud() {
    const title = el('div', 'hud-title');
    title.append(el('b', null, 'SMOKE & VELVET'), el('i', null, 'A LYNCHIAN MEMORIAL · 非官方粉丝纪念展'));
    this.hallLabel = el('div', 'hud-hall', '');
    this.crosshair = el('div', 'crosshair');
    this.hintBar = el('div', 'hud-hint', '');
    this.captionBar = el('div', 'hud-caption', '');
    this.fpsBar = el('div', 'hud-fps', 'FPS —');
    // 引语立牌卡片：走近立牌才浮现，走开即隐（show, don't tell）
    this.plaqueCard = el('div', 'plaque-card');
    this._plaqueId = null;

    const dock = el('div', 'hud-dock');
    const mkBtn = (label, key, fn) => {
      const b = el('button', 'dock-btn');
      b.append(document.createTextNode(label));
      if (key) b.append(el('small', null, key));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.o.audio.sfx('page');
        fn(b);
      });
      dock.append(b);
      return b;
    };
    mkBtn('大厅', 'L', () => this.o.onGoHall('lobby'));
    mkBtn('档案·年表', 'T', () => this.openTimeline());
    mkBtn('留言墙', 'G', () => this.openGuestbook());
    mkBtn('版权合规', 'C', () => this.openLegal());
    this.btnMute = mkBtn('声音 开', 'M', (b) => {
      const muted = this.o.onToggleMute();
      b.firstChild.textContent = muted ? '声音 关' : '声音 开';
      b.classList.toggle('active', muted);
    });
    this.btnNarr = mkBtn('旁白 字母', 'V', (b) => {
      const mode = this.o.onCycleNarration();
      b.firstChild.textContent = mode.label;
      b.classList.toggle('active', mode.id === 'off');
      this.caption(`旁白模式 → ${mode.desc}`, 2600);
    });
    this.btnQuality = mkBtn('画质 高', 'Q', (b) => {
      const q = this.o.onToggleQuality();
      b.firstChild.textContent = q === 'high' ? '画质 高' : '画质 低';
    });
    mkBtn('帮助', 'H', () => this.openHelp());

    // 触屏控件
    const touch = el('div', 'touch-ui');
    this.stick = el('div', 'stick');
    this.stickNub = el('div', 'stick-nub');
    this.stick.append(this.stickNub);
    const act = el('button', 'touch-act', '互动');
    act.addEventListener('click', () => this.o.onAct());
    touch.append(this.stick, act);

    this.hud.append(title, this.hallLabel, this.crosshair, this.hintBar, this.captionBar, this.fpsBar, this.plaqueCard, dock, touch);
    this._bindStick();
  }

  _bindStick() {
    let id = null;
    const R = 59;
    const setFromTouch = (t) => {
      const rect = this.stick.getBoundingClientRect();
      let dx = t.clientX - (rect.left + rect.width / 2);
      let dy = t.clientY - (rect.top + rect.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      this.stickNub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.o.onStick(dx / R, dy / R);
    };
    this.stick.addEventListener('touchstart', (e) => {
      id = e.changedTouches[0].identifier;
      setFromTouch(e.changedTouches[0]);
      e.preventDefault();
    }, { passive: false });
    this.stick.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) setFromTouch(t);
      e.preventDefault();
    }, { passive: false });
    const end = () => {
      id = null;
      this.stickNub.style.transform = 'translate(-50%, -50%)';
      this.o.onStick(0, 0);
    };
    this.stick.addEventListener('touchend', end);
    this.stick.addEventListener('touchcancel', end);
  }

  setHall(name) { this.hallLabel.textContent = name; }
  setHint(text) {
    if (text) { this.hintBar.textContent = text; this.hintBar.classList.add('on'); }
    else this.hintBar.classList.remove('on');
  }
  setCrosshairHot(hot) { this.crosshair.classList.toggle('hot', hot); }
  setFps(v) { this.fpsBar.textContent = `FPS ${v}`; }
  toggleFps() { this.fpsBar.classList.toggle('on'); }
  /** 外部（自动降档）改变画质后同步按钮文案 */
  syncQuality(q) { this.btnQuality.firstChild.textContent = q === 'high' ? '画质 高' : '画质 低'; }

  caption(text, ms = 5000) {
    clearTimeout(this._captionTimer);
    this.captionBar.textContent = text;
    this.captionBar.classList.add('on');
    this._captionTimer = setTimeout(() => this.captionBar.classList.remove('on'), ms);
  }

  /**
   * 走近引语立牌 → 浮现卡片：只有那句话与出处（v1.7）。
   * 背景与访谈语境不塞进弹层——由讲解旁白在你驻足后低声补上。
   * 不挂满墙，不先说话——你不走过去，它什么都不是。
   */
  showPlaque(q) {
    if (!q) return;
    if (this._plaqueId !== q.id) {
      this._plaqueId = q.id;
      this.plaqueCard.replaceChildren();
      this.plaqueCard.append(el('p', 'pc-zh', '「' + q.zh + '」'));
      this.plaqueCard.append(el('p', 'pc-en', q.en));
      this.plaqueCard.append(el('p', 'pc-src', '— DAVID LYNCH · ' + q.source));
    }
    if (!this.plaqueCard.classList.contains('on')) {
      this.plaqueCard.classList.add('on');
      this.o.audio.sfx('page', 0.35);
    }
  }

  hidePlaque() {
    this.plaqueCard.classList.remove('on');
  }

  fade(dark) { this.fader.classList.toggle('clear', !dark); }

  // ---------------- 面板骨架 ----------------
  _buildPanels() {
    this.panels.hidden = false;
    // 滑入式信息面板
    this.infoPanel = el('aside', 'panel');
    const head = el('div', 'panel-head');
    this.infoTitle = el('h2', null, '');
    this.infoTag = el('span', 'tag', '');
    const closeBtn = el('button', 'panel-close', '关闭 ✕');
    closeBtn.addEventListener('click', () => this.closeInfo());
    head.append(this.infoTitle, this.infoTag, closeBtn);
    this.infoBody = el('div', 'panel-body');
    this.infoPanel.append(head, this.infoBody);
    this.panels.append(this.infoPanel);

    this.modals = {};
    for (const name of ['timeline', 'guestbook', 'legal', 'help']) {
      const wrap = el('div', 'modal-wrap');
      const modal = el('div', 'modal');
      const mhead = el('div', 'modal-head');
      const h2 = el('h2', null, '');
      const close = el('button', 'panel-close', '关闭 ✕');
      close.addEventListener('click', () => this.closeModal(name));
      mhead.append(h2, close);
      const body = el('div', 'modal-body');
      modal.append(mhead, body);
      wrap.append(modal);
      wrap.addEventListener('click', (e) => { if (e.target === wrap) this.closeModal(name); });
      this.panels.append(wrap);
      this.modals[name] = { wrap, h2, body };
    }
  }

  _open() {
    this._openCount++;
    this.o.onOpenChange(true);
  }

  _close() {
    this._openCount = Math.max(0, this._openCount - 1);
    if (this._openCount === 0) this.o.onOpenChange(false);
  }

  closeInfo() {
    if (this.infoPanel.classList.contains('open')) {
      this.infoPanel.classList.remove('open');
      this.o.audio.sfx('page');
      this._close();
    }
  }

  closeModal(name) {
    const m = this.modals[name];
    if (m.wrap.classList.contains('open')) {
      m.wrap.classList.remove('open');
      this.o.audio.sfx('page');
      this._close();
    }
  }

  closeAll() {
    this.closeInfo();
    for (const name of Object.keys(this.modals)) this.closeModal(name);
  }

  _showInfo(title, tag) {
    this.infoTitle.textContent = title;
    this.infoTag.textContent = tag;
    this.infoBody.replaceChildren();
    if (!this.infoPanel.classList.contains('open')) {
      this.infoPanel.classList.add('open');
      this._open();
    }
    return this.infoBody;
  }

  _openModal(name, title) {
    const m = this.modals[name];
    m.h2.textContent = title;
    if (!m.wrap.classList.contains('open')) {
      m.wrap.classList.add('open');
      this._open();
    }
    return m.body;
  }

  // ---------------- 内容页 ----------------
  showFilm(id) {
    const f = filmById(id);
    if (!f) return;
    const body = this._showInfo(`${f.titleZh}`, `${f.title} · ${f.year}`);
    body.append(el('p', 'fact', f.oneliner));
    body.append(el('h3', null, '公开档案'));
    for (const fact of f.facts) body.append(el('p', null, '· ' + fact));
    if (f.hall) {
      const btn = el('button', 'link-hall', '⟶ 进入相关展厅');
      btn.addEventListener('click', () => {
        this.closeAll();
        this.o.onGoHall(f.hall);
      });
      body.append(btn);
    }
    body.append(el('p', 'quiet', '仅收录公开事实。本展不含任何受版权保护的影像、对白或原声。'));
  }

  /** 原话摘录墙 —— 全馆唯一的「解读」，全部是他自己的话 */
  showQuotes() {
    const body = this._showInfo('他自己的话', 'IN HIS WORDS');
    for (const q of QUOTES) {
      const card = el('div', 'quote-card');
      card.append(el('p', 'fact', '「' + q.zh + '」'));
      card.append(el('p', 'quote-en', q.en));
      card.append(el('p', 'quiet', '— DAVID LYNCH · ' + q.source));
      body.append(card);
    }
  }

  showArtist() {
    const body = this._showInfo(ARTIST.nameZh, 'IN MEMORIAM');
    body.append(el('p', 'fact', `${ARTIST.name} · ${ARTIST.roles}`));
    body.append(el('p', null, `出生：${ARTIST.born}`));
    body.append(el('p', null, `逝世：${ARTIST.died}`));
    body.append(el('h3', null, '公开荣誉（部分）'));
    for (const h of ARTIST.honors) body.append(el('p', null, '· ' + h));
  }

  openTimeline() {
    const body = this._openModal('timeline', '档案 · 年表 THE ARCHIVE');
    body.replaceChildren();
    body.append(el('p', 'quiet', `共 ${FILMS.length} 项条目 · 按年代排序 · 点击查看档案与相关展厅`));
    for (const f of filmsSorted()) {
      const row = el('div', 'tl-item');
      const year = el('div', 'tl-year', String(f.year));
      const name = el('div', 'tl-name');
      name.append(el('b', null, f.title), el('i', null, `${f.titleZh} — ${f.oneliner}`));
      const right = el('div');
      right.append(el('div', 'tl-type', f.type === 'tv' ? 'TV' : f.type === 'short' ? 'SHORTS' : 'FILM'));
      const openBtn = el('button', 'tl-open', '查看 ⟶');
      openBtn.addEventListener('click', () => {
        this.closeModal('timeline');
        this.showFilm(f.id);
      });
      right.append(openBtn);
      row.append(year, name, right);
      body.append(row);
    }
    const row = el('div', 'tl-item');
    row.append(el('div', 'tl-year', '话'), (() => {
      const n = el('div', 'tl-name');
      n.append(el('b', null, '他自己的话'), el('i', null, 'IN HIS WORDS · 原话摘录墙'));
      return n;
    })());
    const btn = el('button', 'tl-open', '打开 ⟶');
    btn.addEventListener('click', () => {
      this.closeModal('timeline');
      this.showQuotes();
    });
    const right = el('div');
    right.append(btn);
    row.append(right);
    body.append(row);
  }

  // ---------------- 留言墙 ----------------
  openGuestbook() {
    const body = this._openModal('guestbook', '留言墙 GUESTBOOK');
    body.replaceChildren();

    const form = el('form', 'gb-form');
    const nameIn = el('input');
    nameIn.placeholder = '昵称（可留空 → 匿名访客）';
    nameIn.maxLength = 24;
    const textIn = el('textarea');
    textIn.placeholder = '写下你与他的电影的一次相遇…';
    textIn.rows = 3;
    textIn.maxLength = 600;
    const submit = el('button', null, '发 布');
    submit.type = 'submit';
    form.append(nameIn, textIn, submit);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const post = this.o.store.addPost(nameIn.value, textIn.value);
      if (post) {
        this.o.audio.sfx('chime');
        textIn.value = '';
        this._renderPosts(listWrap);
      }
    });

    const listWrap = el('div');
    body.append(form, listWrap);
    this._renderPosts(listWrap);
  }

  _renderPosts(wrap) {
    wrap.replaceChildren();
    const posts = this.o.store.list();
    if (!posts.length) {
      wrap.append(el('div', 'gb-empty', '还没有留言 · 做第一个点亮火柴的人'));
      return;
    }
    for (const p of posts) {
      const card = el('div', 'gb-post');
      const meta = el('div', 'gb-meta');
      meta.append(el('span', 'who', p.name), el('span', 'when', new Date(p.ts).toLocaleString()));
      const text = el('div', 'gb-text', p.text);
      const acts = el('div', 'gb-acts');
      const likeBtn = el('button', p.liked ? 'liked' : null, `♥ ${p.likes}`);
      likeBtn.addEventListener('click', () => {
        this.o.store.toggleLike(p.id);
        this.o.audio.sfx('chime');
        this._renderPosts(wrap);
      });
      const replyBtn = el('button', null, `回复 (${p.replies.length})`);
      acts.append(likeBtn, replyBtn);
      card.append(meta, text, acts);

      const replies = el('div', 'gb-replies');
      replies.style.display = p.replies.length ? 'block' : 'none';
      for (const r of p.replies) {
        const line = el('div', 'gb-reply-item');
        line.append(el('span', 'who', r.name), document.createTextNode(r.text));
        replies.append(line);
      }
      const replyForm = el('form', 'gb-reply');
      replyForm.style.display = 'none';
      const rin = el('input');
      rin.placeholder = '回复这条留言…';
      rin.maxLength = 600;
      const rbtn = el('button', null, '发送');
      rbtn.type = 'submit';
      replyForm.append(rin, rbtn);
      replyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.o.store.reply(p.id, '访客', rin.value)) {
          this.o.audio.sfx('chime');
          this._renderPosts(wrap);
        }
      });
      replyBtn.addEventListener('click', () => {
        replyForm.style.display = replyForm.style.display === 'none' ? 'flex' : 'none';
        replies.style.display = 'block';
        rin.focus();
      });
      card.append(replies, replyForm);
      wrap.append(card);
    }
  }

  // ---------------- 合规 / 帮助 ----------------
  openLegal() {
    const body = this._openModal('legal', LEGAL.title);
    body.replaceChildren();
    body.append(el('div', 'legal-badge', LEGAL.badge));
    for (const p of LEGAL.paras) body.append(el('p', null, p));
  }

  openHelp() {
    const body = this._openModal('help', '操作指南 HOW TO WANDER');
    body.replaceChildren();
    body.append(el('p', null, '这是一间可以走进去的展馆。桌面端点击画面锁定视角开始漫游；触屏用左下摇杆移动、右半屏拖动环视。'));
    const grid = el('div', 'help-keys');
    const rows = [
      ['W A S D / 方向键', '行走（Shift 加速）'],
      ['鼠标 / 右半屏拖动', '环视'],
      ['E / 点击 / 互动键', '触发视线中的热点'],
      ['L', '回到大厅'],
      ['T', '档案·年表'],
      ['G', '留言墙'],
      ['C', '版权合规'],
      ['M', '静音开关'],
      ['V', '旁白模式：字母显现 → 低语+字母 → 爵士+字母 → 关'],
      ['Q', '画质高/低'],
      ['F', 'FPS 显示'],
      ['Esc', '关闭面板 / 解锁鼠标']
    ];
    for (const [k, v] of rows) {
      grid.append(el('b', null, k), el('span', null, v));
    }
    body.append(grid);
    body.append(el('p', 'quiet', '发光的物体大多可以对话。每个厅都有一件不在导览图上的东西。'));
  }
}
