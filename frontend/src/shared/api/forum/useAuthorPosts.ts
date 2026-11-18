import { useInfiniteQuery } from '@tanstack/react-query';
import {
  AUTHOR_POSTS_PAGE_SIZE,
  AUTHOR_POSTS_QUERY_KEY,
  AUTHOR_POSTS_SORT,
} from '@/shared/api/forum/authorPosts.const';
import { listPosts } from '@/shared/api/generated/orbita.api';

/**
 * The published and locked posts of one author, newest first, a page at a time (`GET
 * /forum/posts?author=`). Kept under its own key, not the feed's: it is an infinite list, and a
 * vote reaches it through `useVotePost`. Nothing is asked for an empty username.
 */
export function useAuthorPosts(username: string) {
  return useInfiniteQuery({
    queryKey: [...AUTHOR_POSTS_QUERY_KEY, username],
    queryFn: ({ pageParam, signal }) =>
      listPosts(
        {
          author: username,
          page: pageParam,
          size: AUTHOR_POSTS_PAGE_SIZE,
          sort: AUTHOR_POSTS_SORT,
        },
        // The profile shows its own message; the global toast would print server text.
        { skipErrorToast: true },
        signal
      ),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: username !== '',
    retry: false,
  });
}
