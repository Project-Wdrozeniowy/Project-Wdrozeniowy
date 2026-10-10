'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useComments } from '@/hooks/useComments';
import { getApiErrorMessage } from '@/lib/comments';
import { useStore } from '@/store';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

export default function CommentSection({ slug }: { slug: string }) {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const { query, addComment, deleteComment } = useComments(slug);

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const comments = data?.pages.flatMap((page) => page.content) ?? [];
  const totalRoots = data?.pages[0]?.totalElements ?? 0;

  const getErrorMessage = useCallback(
    (error: unknown) => getApiErrorMessage(error, 'Something went wrong. Please try again.'),
    []
  );

  async function handleAdd(content: string) {
    await addComment.mutateAsync({ content });
  }

  async function handleReply(parentId: number, content: string) {
    await addComment.mutateAsync({ content, parentId });
  }

  async function handleDelete(commentId: number) {
    await deleteComment.mutateAsync(commentId);
  }

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <h2 id="comments-heading" className="text-lg font-semibold text-gray-50">
        Comments{data ? ` (${totalRoots})` : ''}
      </h2>

      {isAuthenticated ? (
        <CommentForm onSubmit={handleAdd} getErrorMessage={getErrorMessage} />
      ) : (
        <p className="text-sm text-slate-400">
          <Link href="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>{' '}
          to leave a comment.
        </p>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading comments…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-400">
          Failed to load comments.
        </p>
      )}
      {!isLoading && !isError && comments.length === 0 && (
        <p className="text-sm text-slate-500">No comments yet. Be the first!</p>
      )}

      {comments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              onReply={handleReply}
              onDelete={handleDelete}
              getErrorMessage={getErrorMessage}
            />
          ))}
        </ul>
      )}

      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="self-center text-sm text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more comments'}
        </button>
      )}
    </section>
  );
}
