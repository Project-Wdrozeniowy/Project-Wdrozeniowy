import { AxiosError } from 'axios';
import { fullDate, isPostNotFound, postBadges } from '@/pages/post/lib/postView';

describe('postBadges', () => {
  it('has none for an ordinary published post', () => {
    expect(postBadges({ pinned: false, status: 'PUBLISHED' })).toEqual([]);
  });

  it('names a pinned, a locked and a draft post', () => {
    expect(postBadges({ pinned: true, status: 'PUBLISHED' })).toEqual(['pinned']);
    expect(postBadges({ pinned: false, status: 'LOCKED' })).toEqual(['locked']);
    expect(postBadges({ pinned: true, status: 'DRAFT' })).toEqual(['pinned', 'draft']);
  });
});

describe('isPostNotFound', () => {
  function failure(status: number) {
    return new AxiosError('x', undefined, undefined, undefined, {
      status,
      data: {},
      statusText: '',
      headers: {},
      config: {} as never,
    });
  }

  it('is true for a 404 only', () => {
    expect(isPostNotFound(failure(404))).toBe(true);
    expect(isPostNotFound(failure(500))).toBe(false);
    expect(isPostNotFound(new Error('Network Error'))).toBe(false);
    expect(isPostNotFound(undefined)).toBe(false);
  });
});

describe('fullDate', () => {
  it('writes the date for a tooltip', () => {
    expect(fullDate('2026-11-18T10:00:00Z')).toMatch(/18 November 2026/);
  });

  it('is empty for something that is not a date', () => {
    expect(fullDate('soon')).toBe('');
  });
});
