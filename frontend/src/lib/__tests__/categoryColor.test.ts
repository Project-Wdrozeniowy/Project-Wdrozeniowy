import { getCategoryColor } from '../categoryColor';

const FALLBACK = 'border-slate-500 text-slate-400';

describe('getCategoryColor', () => {
  it('uses the color of the category slug, whatever the category is called', () => {
    expect(getCategoryColor({ name: 'Technology', slug: 'ai' })).toBe('border-cat-ai text-cat-ai');
    expect(getCategoryColor({ name: 'gaming', slug: 'gaming' })).toBe(
      'border-cat-gaming text-cat-gaming'
    );
  });

  it('falls back to a known topic name when there is no slug (home page fixtures)', () => {
    expect(getCategoryColor({ name: 'Science' })).toBe('border-cat-science text-cat-science');
  });

  it('prefers the slug over the name', () => {
    expect(getCategoryColor({ name: 'Science', slug: 'gaming' })).toBe(
      'border-cat-gaming text-cat-gaming'
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
