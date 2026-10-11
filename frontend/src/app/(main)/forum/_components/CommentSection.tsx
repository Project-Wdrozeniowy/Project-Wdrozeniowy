'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useComments } from '@/hooks/useComments';
import { apiErrorMessage, apiErrorStatus } from '@/lib/apiError';
import { useStore } from '@/store';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface CommentSectionProps {
  slug: string;
}

export function CommentSection({ slug }: CommentSectionProps) {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  // False until the session restore after a reload has finished. Until then we do not know yet
  // whether the visitor is signed in, so the sign-in prompt must not flash.
  const isInitialized = useStore((state) => state.isInitialized);
  const { query, addComment, deleteComment } = useComments(slug);

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const comments = data?.pages.flatMap((page) => page.content) ?? [];
  const totalRoots = data?.pages[0]?.totalElements ?? 0;

  const getErrorMessage = useCallback((error: unknown) => {
    // The server explains client errors usefully (for example the nesting depth limit). Anything
    // else (5xx, network) could expose internals, so it gets a fixed message.
    const status = apiErrorStatus(error);
    return status !== undefined && status < 500
      ? apiErrorMessage(error, GENERIC_ERROR_MESSAGE)
      : GENERIC_ERROR_MESSAGE;
  }, []);

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
        {/* totalElements counts the top-level comments only, replies are not in it. */}
        Comments{data ? ` (${totalRoots} ${totalRoots === 1 ? 'thread' : 'threads'})` : ''}
      </h2>

      {isAuthenticated ? (
        <CommentForm onSubmit={handleAdd} getErrorMessage={getErrorMessage} />
      ) : (
        isInitialized && (
          <p className="text-sm text-slate-400">
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>{' '}
            to leave a comment.
          </p>
        )
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
