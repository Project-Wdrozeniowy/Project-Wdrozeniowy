import { useQuery } from '@tanstack/react-query';
import { FEED_PAGE_SIZE, FEED_QUERY_KEY, FEED_SORT } from '@/shared/api/forum/feedQuery.const';
import { postService } from '@/shared/api/forum/forumClient';

interface FeedQuery {
  /** 0-based, as the API expects. */
  page: number;
  categorySlug?: string;
  /** Only posts that carry this tag (its slug). */
  tag?: string;
}

/**
 * One page of the forum feed.
 *
 * While another page of the same topic loads, the previous result is kept as `placeholderData`
 * (`isPlaceholderData` is true) only so the pagination can stay mounted and keep keyboard focus.
 * ForumFeed must never render that result's posts as if they were the new page.
 */
export function useForumPosts({ page, categorySlug, tag }: FeedQuery) {
  return useQuery({
    queryKey: [...FEED_QUERY_KEY, { page, categorySlug, tag }],
    queryFn: () =>
      postService.list(
        { page, size: FEED_PAGE_SIZE, sort: FEED_SORT, categorySlug, tag },
        // The feed shows its own fixed error message; the global toast would print server text.
        { skipErrorToast: true }
      ),
    // Never carry another topic's or tag's result over: it has a different number of pages.
    placeholderData: (previous, previousQuery) => {
      const previousFilter = previousQuery?.queryKey[1] as FeedQuery | undefined;
      return previousFilter?.categorySlug === categorySlug && previousFilter?.tag === tag
        ? previous
        : undefined;
    },
  });
}
