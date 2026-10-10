import { useQuery } from '@tanstack/react-query';
import { FEED_PAGE_SIZE, FEED_SORT } from '@/constants/forum';
import { postService } from '@/services/forumService';

interface FeedQuery {
  /** 0-based, as the API expects. */
  page: number;
  categorySlug?: string;
}

export function useForumPosts({ page, categorySlug }: FeedQuery) {
  return useQuery({
    queryKey: ['forum-posts', { page, categorySlug }],
    queryFn: () =>
      postService.list(
        { page, size: FEED_PAGE_SIZE, sort: FEED_SORT, categorySlug },
        // The feed shows its own fixed error message; the global toast would print server text.
        { skipErrorToast: true }
      ),
    // Keep the current page on screen while the next one loads, but never show another topic's posts.
    placeholderData: (previous, previousQuery) => {
      const previousFilter = previousQuery?.queryKey[1] as FeedQuery | undefined;
      return previousFilter?.categorySlug === categorySlug ? previous : undefined;
    },
  });
}
