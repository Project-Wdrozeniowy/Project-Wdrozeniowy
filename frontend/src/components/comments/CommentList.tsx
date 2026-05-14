'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['comments', postId, page],
    queryFn: () => commentService.getComments(postId, page),
  });

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
        Comments {data ? `(${data.totalElements})` : ''}
      </h2>

      {isAuthenticated ? (
        <CommentForm onSubmit={handleAdd} />
      ) : (
        <p className="text-sm text-slate-400">Sign in to leave a comment.</p>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading comments…</p>}
      {isError && <p className="text-sm text-red-400">Failed to load comments.</p>}

      {data && data.content.length === 0 && !isLoading && (
        <p className="text-sm text-slate-500">No comments yet. Be the first!</p>
      )}

      {data && (
        <div className="flex flex-col gap-4">
          {data.content.map((comment) => (
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

      {data && !data.last && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="self-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Load more comments
        </button>
      )}
    </section>
  );
}
