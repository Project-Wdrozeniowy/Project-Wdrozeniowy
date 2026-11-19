import { CATEGORIES } from '@/shared/constants/categories.const';

/**
 * URL pages are 1-based (`?page=2`), the API's are 0-based.
 * Anything that is not a positive integer of at most 6 digits means the first page
 * (a huge number would only make the API reject the request).
 */
export function parsePageParam(value: string | null): number {
  if (value === null || !/^\d{1,6}$/.test(value)) return 0;
  const page = Number.parseInt(value, 10);
  return page >= 1 ? page - 1 : 0;
}

/**
 * The feed filters by the topic label from the URL (`?topic=AI+%2F+Tech`, which the sidebar links to).
 * The API filters by category slug. The slug of a known topic is the `key` of the known categories.
 * Only these topics can be filtered by: a category created through the API is not a known topic, so
 * the feed cannot be filtered by it. Reading `GET /forum/categories` would change that; it is not
 * done yet.
 */
export function topicToCategorySlug(topic: string): string | undefined {
  return CATEGORIES.find((category) => category.label === topic)?.key;
}

/**
 * The tag of the URL (`?tag=spring-boot`). Blank means no tag filter. Whatever else is there is
 * passed on as it is: an unknown tag is answered by the API with an empty page, which the feed shows
 * as "no posts with this tag". It is never cut or ignored, as that would change which tag is shown.
 */
export function parseTagParam(value: string | null): string | undefined {
  const tag = value?.trim();
  return tag ? tag : undefined;
}
