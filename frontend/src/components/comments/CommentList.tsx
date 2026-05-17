'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '@/services/commentService';
import { toast } from '@/lib/toast';
import { useStore } from '@/store';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface CommentListProps {
  postId: string;
}

export default function CommentList({ postId }: CommentListProps) {
  const queryClient = useQueryClient();
  const user = useStore((s) => s.user);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['comments', postId],
      queryFn: ({ pageParam }) => commentService.getComments(postId, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, _pages, lastPageParam) =>
        lastPage.last ? undefined : lastPageParam + 1,
    });

  const comments = data?.pages.flatMap((p) => p.content) ?? [];
  const totalElements = data?.pages[0]?.totalElements ?? 0;

  const addMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string | null }) =>
      commentService.addComment(postId, { content, parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Comment posted.');
    },
    onError: () => toast.error('Failed to post comment.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Comment deleted.');
    },
    onError: () => toast.error('Failed to delete comment.'),
  });

  async function handleAdd(content: string) {
    await addMutation.mutateAsync({ content, parentId: null });
  }

  async function handleReply(parentId: string, content: string) {
    await addMutation.mutateAsync({ content, parentId });
  }

  async function handleDelete(commentId: string) {
    await deleteMutation.mutateAsync(commentId);
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-slate-100">
        Comments {data ? `(${totalElements})` : ''}
      </h2>

      {isAuthenticated ? (
        <CommentForm onSubmit={handleAdd} />
      ) : (
        <p className="text-sm text-slate-400">Sign in to leave a comment.</p>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading comments…</p>}
      {isError && <p className="text-sm text-red-400">Failed to load comments.</p>}

      {comments.length === 0 && !isLoading && (
        <p className="text-sm text-slate-500">No comments yet. Be the first!</p>
      )}

      {comments.length > 0 && (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="self-center text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more comments'}
        </button>
      )}
    </section>
  );
}
