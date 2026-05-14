'use client';

import { useState } from 'react';
import type { Comment } from '@/types';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export default function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDeleted = comment.status === 'DELETED';
  const isOwner = currentUserId !== undefined && currentUserId === comment.author.id;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleReply(content: string) {
    await onReply(comment.id, content);
    setShowReplyForm(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-lg bg-slate-800 px-4 py-3">
        {isDeleted ? (
          <p className="text-sm italic text-slate-500">[comment deleted]</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">
                {comment.author.name}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
            <div className="flex items-center gap-3 mt-1">
              {currentUserId && comment.depth < 5 && (
                <button
                  type="button"
                  onClick={() => setShowReplyForm((v) => !v)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Reply
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showReplyForm && (
        <div className="ml-6">
          <CommentForm
            onSubmit={handleReply}
            placeholder="Write a reply…"
            submitLabel="Post reply"
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="ml-6 flex flex-col gap-2 border-l-2 border-slate-700 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
