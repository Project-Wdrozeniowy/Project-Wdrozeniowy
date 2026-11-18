import { getCategoryTopic } from '@/shared/lib/categoryColor';

/**
 * The forum feed of a category's topic, or `undefined` for a category that is not a known topic
 * (the feed filters by the known topic labels). The slug decides first, so a renamed category
 * still finds its topic.
 */
export function topicHref(category: { name: string; slug?: string | null }): string | undefined {
  const topic = getCategoryTopic(category);
  return topic ? `/forum?${new URLSearchParams({ topic }).toString()}` : undefined;
}
