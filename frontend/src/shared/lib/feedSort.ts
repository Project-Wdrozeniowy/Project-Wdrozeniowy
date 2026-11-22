import { DEFAULT_FEED_SORT, FEED_SORTS, FEED_SORT_PARAM } from '@/shared/constants/feedSort.const';
import type { OpenFeedSortId } from '@/shared/constants/feedSort.const';
import type { ListPostsSort } from '@/shared/api/generated/models/listPostsSort.dto';

/** The order a `?sort=` value names, or `null` for a missing, unknown or not yet available one. */
export function openFeedSort(value: string | null): OpenFeedSortId | null {
  const found = FEED_SORTS.find((sort) => sort.id === value);
  return found?.available ? found.id : null;
}

/** Like `openFeedSort`, with the home page's default (new) for what it cannot read. */
export function parseFeedSort(value: string | null): OpenFeedSortId {
  return openFeedSort(value) ?? DEFAULT_FEED_SORT;
}

/** The API's `sort` value of an order. */
export function feedSortToApi(id: OpenFeedSortId): ListPostsSort {
  const found = FEED_SORTS.find((sort) => sort.id === id);
  if (found?.available) return found.apiSort;
  throw new Error(`The order ${id} has no API sort`);
}

/** `path` with the order of the feed. */
export function feedSortHref(path: string, id: OpenFeedSortId): string {
  return `${path}?${FEED_SORT_PARAM}=${id}`;
}
