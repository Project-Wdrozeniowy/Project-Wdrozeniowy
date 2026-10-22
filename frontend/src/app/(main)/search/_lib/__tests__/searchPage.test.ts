import {
  collectItems,
  hasMorePages,
  parsePagesParam,
  parseSearchTerm,
  parseSearchType,
  totalMatches,
} from '../searchPage';
import type { SearchResults } from '@/shared/api/search/search.dto';

function page(ids: number[], last: boolean, total = 20): SearchResults {
  return {
    query: 'x',
    posts: null,
    users: null,
    tags: {
      content: ids.map((id) => ({ id, name: `t${id}`, slug: `t${id}`, postCount: 1 })),
      page: 0,
      size: 5,
      totalElements: total,
      totalPages: 4,
      first: true,
      last,
    },
  };
}

describe('URL parameters', () => {
  it('trims and limits the term', () => {
    expect(parseSearchTerm('  react ')).toBe('react');
    expect(parseSearchTerm(null)).toBe('');
    expect(parseSearchTerm('a'.repeat(150))).toHaveLength(100);
  });

  it('accepts only known kinds', () => {
    expect(parseSearchType('USER')).toBe('USER');
    expect(parseSearchType('user')).toBeUndefined();
    expect(parseSearchType(null)).toBeUndefined();
  });

  it('reads the pages as a bounded positive integer', () => {
    expect(parsePagesParam('3')).toBe(3);
    expect(parsePagesParam('0')).toBe(1);
    expect(parsePagesParam('-2')).toBe(1);
    expect(parsePagesParam('1.5')).toBe(1);
    expect(parsePagesParam('abc')).toBe(1);
    expect(parsePagesParam(null)).toBe(1);
    expect(parsePagesParam('999')).toBe(20);
  });
});

describe('result pages', () => {
  it('joins pages and drops a repeated item', () => {
    const items = collectItems([page([1, 2], false), undefined, page([2, 3], true)], 'tags');
    expect(items.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(collectItems([page([1], true)], 'posts')).toEqual([]);
  });

  it('knows whether a page is left', () => {
    expect(hasMorePages(page([1], false))).toBe(true);
    expect(hasMorePages(page([1], true))).toBe(false);
    expect(hasMorePages(undefined)).toBe(false);
  });

  it('sums the matches of the kinds asked for', () => {
    expect(totalMatches(page([1], false, 7))).toBe(7);
  });
});
