import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// The published comments API is implemented; full integration acceptance remains PWDRZ-67.
import { commentService } from '@/shared/api/forum/forumClient';
import { COMMENTS_PAGE_SIZE } from '@/shared/api/forum/commentQuery.const';
import { FEED_QUERY_KEY } from '@/shared/api/forum/feedQuery.const';
import { getGetPostQueryKey } from '@/shared/api/generated/orbita.api';
import { invalidatePostEngagement } from '@/shared/api/analytics/postEngagement';

export function useComments(slug: string, postId: number) {
  const queryClient = useQueryClient();
  const queryKey = ['comments', slug];
  // A comment also changes the count the post page and the feed show for this post.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(slug) }),
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY }),
      invalidatePostEngagement(queryClient, postId),
    ]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => commentService.list(slug, pageParam, COMMENTS_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });

  const addComment = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: number }) =>
      commentService.create(slug, { content, parentId }),
    onSuccess: refresh,
  });

  const deleteComment = useMutation({
    mutationFn: (id: number) => commentService.delete(id),
    onSuccess: refresh,
  });

  return { query, addComment, deleteComment };
}
