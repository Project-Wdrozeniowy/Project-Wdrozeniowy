import { topicHref } from '@/shared/lib/topicUrl';

describe('topicHref', () => {
  it('links the feed of a known topic, with the label encoded', () => {
    expect(topicHref({ name: 'AI / Tech', slug: 'ai' })).toBe('/forum?topic=AI+%2F+Tech');
    expect(topicHref({ name: 'Gaming' })).toBe('/forum?topic=Gaming');
  });

  it('finds the topic of a renamed category by its slug', () => {
    expect(topicHref({ name: 'Technology', slug: 'ai' })).toBe('/forum?topic=AI+%2F+Tech');
  });

  it('has no link for a category that is not a known topic', () => {
    expect(topicHref({ name: 'Chess club', slug: 'chess' })).toBeUndefined();
    expect(topicHref({ name: 'constructor', slug: null })).toBeUndefined();
  });
});
