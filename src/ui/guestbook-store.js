// ============================================================
// GuestbookStore — 访客留言墙数据层。
// 注入式 storage（localStorage 或测试用内存对象），可持久化。
// ============================================================

const KEY = 'sv_guestbook_v1';
const MAX_NAME = 24;
const MAX_TEXT = 600;

export class GuestbookStore {
  constructor(storage) {
    this.storage = storage;
    this.posts = this._load();
    if (this.posts.length === 0) {
      this._seed();
    }
  }

  _load() {
    try {
      const raw = this.storage.getItem(KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  _save() {
    try {
      this.storage.setItem(KEY, JSON.stringify(this.posts));
    } catch {
      // 存储不可用时仅保留内存态
    }
  }

  _seed() {
    const seeds = [
      {
        name: '守夜的策展人',
        text: '欢迎来到留言墙。请留下你与他的电影相遇的时刻——哪一个画面在你身体里住了下来？'
      },
      {
        name: '来自双峰镇的访客',
        text: '看完《回归》第八集的那个夜晚，我在阳台上站了很久。原来电视机也可以是一座教堂。'
      },
      {
        name: 'silencio',
        text: '第一次看《穆赫兰道》没看懂，第二次看哭了。有些电影不是用来懂的，是用来住进去的。'
      }
    ];
    const now = Date.now();
    seeds.forEach((s, i) => {
      this.posts.push({
        id: `seed-${i}`,
        name: s.name,
        text: s.text,
        ts: now - (seeds.length - i) * 3600 * 1000 * 26,
        likes: 3 + i * 2,
        liked: false,
        replies: []
      });
    });
    this._save();
  }

  list() {
    return [...this.posts].sort((a, b) => b.ts - a.ts);
  }

  addPost(name, text) {
    const n = String(name ?? '').trim().slice(0, MAX_NAME) || '匿名访客';
    const t = String(text ?? '').trim().slice(0, MAX_TEXT);
    if (!t) return null;
    const post = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: n,
      text: t,
      ts: Date.now(),
      likes: 0,
      liked: false,
      replies: []
    };
    this.posts.push(post);
    this._save();
    return post;
  }

  toggleLike(id) {
    const p = this.posts.find((x) => x.id === id);
    if (!p) return null;
    p.liked = !p.liked;
    p.likes += p.liked ? 1 : -1;
    if (p.likes < 0) p.likes = 0;
    this._save();
    return p;
  }

  reply(id, name, text) {
    const p = this.posts.find((x) => x.id === id);
    const t = String(text ?? '').trim().slice(0, MAX_TEXT);
    if (!p || !t) return null;
    const r = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(name ?? '').trim().slice(0, MAX_NAME) || '匿名访客',
      text: t,
      ts: Date.now()
    };
    p.replies.push(r);
    this._save();
    return r;
  }
}

/** 供渲染层/测试使用的转义（渲染层实际用 textContent，双保险） */
export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
