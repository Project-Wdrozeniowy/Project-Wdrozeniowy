import { CATEGORIES, CATEGORY_COLORS, isTopic } from '@/shared/constants/categories.const';
import type { Topic } from '@/shared/constants/categories.const';

const FALLBACK_CATEGORY_COLOR = 'border-line-strong text-fg-subtle';

type CategoryRef = { name: string; slug?: string | null };

/**
 * The known topic of a category, or `undefined` for any other category.
 * The slug is stable while the name can be edited ("AI / Tech" -> "Technology"), so it decides first;
 * the name is only used when the slug is not a known one.
 */
export function getCategoryTopic(category: CategoryRef): Topic | undefined {
  const bySlug = CATEGORIES.find((known) => known.key === category.slug)?.label;
  if (bySlug !== undefined && isTopic(bySlug)) return bySlug;
  // isTopic compares against the known labels only, so inherited names like "constructor" fall through.
  return isTopic(category.name) ? category.name : undefined;
}

/** Border and text color of a category chip. */
export function getCategoryColor(category: CategoryRef): string {
  const topic = getCategoryTopic(category);
  return topic === undefined ? FALLBACK_CATEGORY_COLOR : CATEGORY_COLORS[topic];
}
