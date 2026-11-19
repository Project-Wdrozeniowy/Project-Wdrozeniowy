import { CATEGORIES, CATEGORY_STYLES, isTopic } from '@/shared/constants/categories.const';
import type { Topic } from '@/shared/constants/categories.const';

const FALLBACK_CATEGORY_COLOR = 'border-line-strong bg-raised text-fg-subtle';
const FALLBACK_CATEGORY_DOT = 'bg-fg-subtle';

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

/** Tint, border and text colour of a category chip. */
export function getCategoryColor(category: CategoryRef): string {
  const topic = getCategoryTopic(category);
  return topic === undefined ? FALLBACK_CATEGORY_COLOR : CATEGORY_STYLES[topic].chip;
}

/** The solid dot colour of a category in a list; neutral for a category that is not a known topic. */
export function getCategoryDotColor(category: CategoryRef): string {
  const topic = getCategoryTopic(category);
  return topic === undefined ? FALLBACK_CATEGORY_DOT : CATEGORY_STYLES[topic].dot;
}
