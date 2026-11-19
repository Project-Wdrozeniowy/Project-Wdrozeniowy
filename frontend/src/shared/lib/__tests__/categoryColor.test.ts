import {
  getCategoryColor,
  getCategoryDotColor,
  getCategoryTopic,
} from '@/shared/lib/categoryColor';

const FALLBACK = 'border-line-strong bg-raised text-fg-subtle';

describe('getCategoryColor', () => {
  it('uses the color of the category slug, whatever the category is called', () => {
    expect(getCategoryColor({ name: 'Technology', slug: 'ai' })).toBe(
      'border-cat-ai/40 bg-cat-ai/10 text-cat-ai'
    );
    expect(getCategoryColor({ name: 'gaming', slug: 'gaming' })).toBe(
      'border-cat-gaming/40 bg-cat-gaming/10 text-cat-gaming'
    );
  });

  it('falls back to a known topic name when there is no slug (home page fixtures)', () => {
    expect(getCategoryColor({ name: 'Science' })).toBe(
      'border-cat-science/40 bg-cat-science/10 text-cat-science'
    );
  });

  it('prefers the slug over the name', () => {
    expect(getCategoryColor({ name: 'Science', slug: 'gaming' })).toBe(
      'border-cat-gaming/40 bg-cat-gaming/10 text-cat-gaming'
    );
  });

  it('falls back for unknown categories', () => {
    expect(getCategoryColor({ name: 'Something New', slug: 'something-new' })).toBe(FALLBACK);
    expect(getCategoryColor({ name: 'Something New' })).toBe(FALLBACK);
  });

  it.each(['constructor', 'toString', '__proto__'])('is safe for the name/slug "%s"', (value) => {
    expect(getCategoryColor({ name: value, slug: value })).toBe(FALLBACK);
  });
});

describe('getCategoryTopic', () => {
  it('finds the topic by slug, even when the category was renamed', () => {
    expect(getCategoryTopic({ name: 'Technology', slug: 'ai' })).toBe('AI / Tech');
  });

  it('falls back to the name when the slug is unknown or missing', () => {
    expect(getCategoryTopic({ name: 'Gaming', slug: 'something-else' })).toBe('Gaming');
    expect(getCategoryTopic({ name: 'Science' })).toBe('Science');
  });

  it('has no topic for another category, nor for inherited object names', () => {
    expect(getCategoryTopic({ name: 'Chess club', slug: 'chess' })).toBeUndefined();
    expect(getCategoryTopic({ name: 'constructor', slug: null })).toBeUndefined();
  });
});

describe('getCategoryDotColor', () => {
  it('is the solid colour of the topic, found by slug first', () => {
    expect(getCategoryDotColor({ name: 'Technology', slug: 'ai' })).toBe('bg-cat-ai');
    expect(getCategoryDotColor({ name: 'Gaming' })).toBe('bg-cat-gaming');
  });

  it('is neutral for another category, and for inherited object names', () => {
    expect(getCategoryDotColor({ name: 'Chess club', slug: 'chess' })).toBe('bg-fg-subtle');
    expect(getCategoryDotColor({ name: 'constructor' })).toBe('bg-fg-subtle');
  });
});
