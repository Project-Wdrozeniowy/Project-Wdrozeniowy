import { useQuery } from '@tanstack/react-query';
import { FEED_PAGE_SIZE, FEED_SORT } from '@/shared/api/forum/feedQuery.const';
import { getListPostsQueryOptions } from '@/shared/api/generated/orbita.api';
import type { ListPostsSort } from '@/shared/api/generated/models/listPostsSort.dto';

interface FeedQuery {
  /** 0-based, as the API expects. */
  page: number;
  categorySlug?: string;
  /** Only posts that carry this tag (its slug). */
  tag?: string;
  /** The order, as the API names it. The feed's own order when it is left out. */
  sort?: ListPostsSort;
}

/**
 * One page of the forum feed.
 *
 * While another page of the same topic loads, the previous result is kept as `placeholderData`
 * (`isPlaceholderData` is true) only so the pagination can stay mounted and keep keyboard focus.
 * ForumFeed must never render that result's posts as if they were the new page.
 */
export function useForumPosts({ page, categorySlug, tag, sort = FEED_SORT }: FeedQuery) {
  return useQuery({
    ...getListPostsQueryOptions(
      { page, size: FEED_PAGE_SIZE, sort, categorySlug, tag },
      { request: { skipErrorToast: true } }
    ),
    // Never carry another topic's, tag's or order's result over: it has a different number of pages,
    // or the same posts in another order that would look like the new one.
    placeholderData: (previous, previousQuery) => {
      const previousFilter = previousQuery?.queryKey[1] as FeedQuery | undefined;
      return previousFilter?.categorySlug === categorySlug &&
        previousFilter?.tag === tag &&
        previousFilter?.sort === sort
        ? previous
        : undefined;
    },
  });
}
