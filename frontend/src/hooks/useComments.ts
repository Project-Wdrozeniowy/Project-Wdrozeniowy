import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '@/services/forumService';
import { COMMENTS_PAGE_SIZE } from '@/constants/comments';

export function useComments(slug: string) {
  const queryClient = useQueryClient();
  const queryKey = ['comments', slug];
  const refresh = () => queryClient.invalidateQueries({ queryKey });

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
