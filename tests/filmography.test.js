import { describe, it, expect } from 'vitest';
import { FILMS, ARTIST, filmById, filmsSorted } from '../src/data/filmography.js';

const HALL_IDS = ['lobby', 'archive', 'eraserhead', 'bluevelvet', 'twinpeaks', 'mulholland'];

describe('作品年表数据完整性', () => {
  it('至少收录 10 项条目', () => {
    expect(FILMS.length).toBeGreaterThanOrEqual(10);
  });

  it('每项条目字段齐备且年份合法', () => {
    for (const f of FILMS) {
      expect(f.id).toBeTruthy();
      expect(f.title).toBeTruthy();
      expect(f.titleZh).toBeTruthy();
      expect(f.oneliner.length).toBeGreaterThan(8);
      expect(Array.isArray(f.facts)).toBe(true);
      expect(f.facts.length).toBeGreaterThan(0);
      expect(f.year).toBeGreaterThanOrEqual(1966);
      expect(f.year).toBeLessThanOrEqual(2017);
      expect(['feature', 'tv', 'short', 'doc']).toContain(f.type);
      expect(f.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('id 唯一', () => {
    const ids = FILMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('展厅关联指向真实展厅', () => {
    for (const f of FILMS) {
      if (f.hall) expect(HALL_IDS).toContain(f.hall);
    }
  });

  it('代表作均已收录', () => {
    for (const id of ['eraserhead', 'blue-velvet', 'twin-peaks', 'mulholland-drive', 'inland-empire']) {
      expect(filmById(id)).toBeTruthy();
    }
  });

  it('filmsSorted 按年代升序', () => {
    const years = filmsSorted().map((f) => f.year);
    for (let i = 1; i < years.length; i++) expect(years[i]).toBeGreaterThanOrEqual(years[i - 1]);
  });

  it('艺术家生平信息齐备', () => {
    expect(ARTIST.name).toBe('David Lynch');
    expect(ARTIST.born).toContain('1946');
    expect(ARTIST.died).toContain('2025');
    expect(ARTIST.honors.length).toBeGreaterThanOrEqual(4);
  });
});
