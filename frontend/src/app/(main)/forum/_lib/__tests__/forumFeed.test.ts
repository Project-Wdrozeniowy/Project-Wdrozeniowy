import { parsePageParam, topicToCategorySlug } from '../forumFeed';

describe('parsePageParam', () => {
  it('converts the 1-based URL page to the 0-based API page', () => {
    expect(parsePageParam('1')).toBe(0);
    expect(parsePageParam('2')).toBe(1);
    expect(parsePageParam('10')).toBe(9);
  });

  it.each([
    null,
    '',
    '0',
    '-1',
    'abc',
    '1.5',
    ' 2',
    '2 ',
    '1e3',
    '99999999999999999999',
    '1000000',
  ])('falls back to the first page for %s', (value) => {
    expect(parsePageParam(value)).toBe(0);
  });
});

describe('topicToCategorySlug', () => {
  it('maps a topic label to its category slug', () => {
    expect(topicToCategorySlug('AI / Tech')).toBe('ai');
    expect(topicToCategorySlug('Gaming')).toBe('gaming');
  });

  it('returns undefined for unknown labels', () => {
    expect(topicToCategorySlug('Nonsense')).toBeUndefined();
    expect(topicToCategorySlug('')).toBeUndefined();
  });
});
