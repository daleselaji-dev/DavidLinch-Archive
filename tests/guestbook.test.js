import { describe, it, expect, beforeEach } from 'vitest';
import { GuestbookStore, escapeHtml } from '../src/ui/guestbook-store.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

describe('留言墙 Store', () => {
  let storage;
  let store;

  beforeEach(() => {
    storage = memoryStorage();
    store = new GuestbookStore(storage);
  });

  it('首次初始化写入策展种子留言', () => {
    expect(store.list().length).toBeGreaterThanOrEqual(3);
  });

  it('发帖 → 列表 → 数据持久化 闭环', () => {
    const post = store.addPost('访客甲', '在午夜场看完《橡皮头》，走出影院时全世界都在嗡嗡响。');
    expect(post).toBeTruthy();
    expect(store.list()[0].id).toBe(post.id);

    // 重新用同一 storage 构造 → 数据保留
    const store2 = new GuestbookStore(storage);
    expect(store2.list().find((p) => p.id === post.id)).toBeTruthy();
  });

  it('空内容拒绝发帖，空昵称回落为匿名', () => {
    expect(store.addPost('某人', '   ')).toBeNull();
    const p = store.addPost('', '有内容');
    expect(p.name).toBe('匿名访客');
  });

  it('超长输入被截断', () => {
    const p = store.addPost('n'.repeat(100), 'x'.repeat(2000));
    expect(p.name.length).toBeLessThanOrEqual(24);
    expect(p.text.length).toBeLessThanOrEqual(600);
  });

  it('点赞可切换且不为负', () => {
    const p = store.addPost('a', 'b');
    expect(store.toggleLike(p.id).likes).toBe(1);
    expect(store.toggleLike(p.id).likes).toBe(0);
    expect(store.toggleLike('不存在')).toBeNull();
  });

  it('回复闭环并持久化', () => {
    const p = store.addPost('a', '主贴');
    const r = store.reply(p.id, '访客乙', '回复内容');
    expect(r).toBeTruthy();
    const store2 = new GuestbookStore(storage);
    const found = store2.list().find((x) => x.id === p.id);
    expect(found.replies.length).toBe(1);
    expect(found.replies[0].text).toBe('回复内容');
  });

  it('损坏的存储数据可安全恢复', () => {
    storage.setItem('sv_guestbook_v1', '{{{ 不是 JSON');
    const s = new GuestbookStore(storage);
    expect(Array.isArray(s.list())).toBe(true);
  });

  it('escapeHtml 阻断脚本注入', () => {
    const out = escapeHtml('<script>alert("x")</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });
});
