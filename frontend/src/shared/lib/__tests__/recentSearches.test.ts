import { vi } from 'vitest';
import {
  RECENT_SEARCHES_KEY,
  RECENT_SEARCHES_LIMIT,
  addRecentSearch,
  readRecentSearches,
  removeRecentSearch,
} from '../recentSearches';

describe('recentSearches', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the newest first and drops a repeat regardless of case', () => {
    addRecentSearch('react');
    addRecentSearch('rust');
    expect(addRecentSearch('REACT')).toEqual(['REACT', 'rust']);
  });

  it('keeps at most the limit and ignores blank terms', () => {
    for (let i = 0; i < RECENT_SEARCHES_LIMIT + 3; i++) addRecentSearch(`term ${i}`);
    addRecentSearch('   ');
    expect(readRecentSearches()).toHaveLength(RECENT_SEARCHES_LIMIT);
    expect(readRecentSearches()[0]).toBe(`term ${RECENT_SEARCHES_LIMIT + 2}`);
  });

  it('removes one term', () => {
    addRecentSearch('a1');
    addRecentSearch('b2');
    expect(removeRecentSearch('a1')).toEqual(['b2']);
  });

  it('reads nothing from damaged storage', () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, '{not json');
    expect(readRecentSearches()).toEqual([]);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify({ a: 1 }));
    expect(readRecentSearches()).toEqual([]);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['ok', 5]));
    expect(readRecentSearches()).toEqual(['ok']);
  });

  it('still works when storage refuses to write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(addRecentSearch('react')).toEqual(['react']);
    setItem.mockRestore();
  });
});

describe('recentSearches with edited storage', () => {
  it('drops blanks and repeats', () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['a1', ' a1 ', '', 'b2']));
    expect(readRecentSearches()).toEqual(['a1', 'b2']);
  });
});
