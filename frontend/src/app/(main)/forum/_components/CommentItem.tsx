'use client';

import { useState } from 'react';
import { canDeleteComment, canReplyToComment, isCommentDeleted } from '@/lib/comments';
import type { Comment, UserProfile } from '@/shared/types';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: Comment;
  user: UserProfile | null;
  onReply: (parentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  getErrorMessage: (error: unknown) => string;
}

export default function CommentItem({
  comment,
  user,
  onReply,
  onDelete,
  getErrorMessage,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleted = isCommentDeleted(comment);
  const authorName = comment.author?.displayName ?? comment.author?.username ?? 'Unknown';

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(comment.id);
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleReply(content: string) {
    await onReply(comment.id, content);
    setShowReplyForm(false);
  }

  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-lg bg-slate-800 px-4 py-3">
        {deleted ? (
          <p className="text-sm italic text-slate-500">[comment deleted]</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">{authorName}</span>
              <time dateTime={comment.createdAt} className="text-xs text-slate-500">
                {new Date(comment.createdAt).toLocaleDateString('en-US')}
              </time>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-200">
              {comment.content}
            </p>
            <div className="mt-1 flex items-center gap-3">
              {canReplyToComment(comment, user) && (
                <button
                  type="button"
                  onClick={() => setShowReplyForm((open) => !open)}
                  aria-expanded={showReplyForm}
                  className="text-xs text-slate-400 transition-colors hover:text-slate-200"
                >
                  Reply
                </button>
              )}
              {canDeleteComment(comment, user) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
            {deleteError && (
              <p role="alert" className="text-xs text-red-400">
                {deleteError}
              </p>
            )}
          </>
        )}
      </div>

      {showReplyForm && (
        <div className="ml-6">
          <CommentForm
            onSubmit={handleReply}
            getErrorMessage={getErrorMessage}
            label={`Reply to ${authorName}`}
            placeholder="Write a reply…"
            submitLabel="Post reply"
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <ul className="ml-6 flex flex-col gap-2 border-l-2 border-slate-700 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              user={user}
              onReply={onReply}
              onDelete={onDelete}
              getErrorMessage={getErrorMessage}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
