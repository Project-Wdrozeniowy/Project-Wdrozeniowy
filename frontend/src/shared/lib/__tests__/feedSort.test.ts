import { feedSortHref, feedSortToApi, openFeedSort, parseFeedSort } from '@/shared/lib/feedSort';

describe('parseFeedSort', () => {
  it.each(['new', 'top'])('reads %s', (id) => {
    expect(parseFeedSort(id)).toBe(id);
  });

  it.each([null, '', 'NEW', 'best', 'lastActivityAt', 'constructor', '__proto__'])(
    'is the default (new) for %j',
    (value) => {
      expect(parseFeedSort(value)).toBe('new');
    }
  );

  it('does not accept hot: it is shown and not open, so the API is never asked for it', () => {
    expect(parseFeedSort('hot')).toBe('new');
  });
});

describe('openFeedSort', () => {
  it('is the order, or null when there is none to give (so a caller can keep its own)', () => {
    expect(openFeedSort('top')).toBe('top');
    expect(openFeedSort('hot')).toBeNull();
    expect(openFeedSort('nonsense')).toBeNull();
    expect(openFeedSort(null)).toBeNull();
  });
});

describe('feedSortToApi', () => {
  it('maps each open order to the API sort it is, and no two to the same one', () => {
    expect(feedSortToApi('new')).toBe('createdAt');
    expect(feedSortToApi('top')).toBe('voteScore');
  });

  it('refuses an order with no API sort, instead of sending a made-up one', () => {
    expect(() => feedSortToApi('hot' as never)).toThrow();
  });
});

describe('feedSortHref', () => {
  it('puts the order in the address', () => {
    expect(feedSortHref('/', 'top')).toBe('/?sort=top');
    expect(feedSortHref('/forum', 'new')).toBe('/forum?sort=new');
  });

  it('gives a link that parseFeedSort reads back as the same order', () => {
    for (const id of ['new', 'top'] as const) {
      const value = new URL(feedSortHref('/', id), 'http://test').searchParams.get('sort');
      expect(parseFeedSort(value)).toBe(id);
    }
  });
});
