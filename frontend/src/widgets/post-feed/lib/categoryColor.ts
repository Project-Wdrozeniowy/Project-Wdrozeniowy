import { CATEGORIES, CATEGORY_COLORS, isTopic } from '@/shared/constants/categories.const';

const FALLBACK_CATEGORY_COLOR = 'border-line-strong text-fg-subtle';

/**
 * Border and text color of a category chip.
 * The slug is stable while the name can be edited ("AI / Tech" -> "Technology"), so it decides first;
 * the name is only used when there is no slug.
 */
export function getCategoryColor(category: { name: string; slug?: string | null }): string {
  const bySlug = CATEGORIES.find((known) => known.key === category.slug)?.label;
  if (bySlug !== undefined && isTopic(bySlug)) return CATEGORY_COLORS[bySlug];

  // isTopic compares against the known labels only, so inherited names like "constructor" fall through.
  return isTopic(category.name) ? CATEGORY_COLORS[category.name] : FALLBACK_CATEGORY_COLOR;
}
