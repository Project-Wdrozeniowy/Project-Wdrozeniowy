'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { COMMENT_MAX_LENGTH } from '@/constants/comments';
import { cn } from '@/lib/cn';

interface CommentFormProps {
  /** Resolves on success; a rejection keeps the text and shows the error. */
  onSubmit: (content: string) => Promise<void>;
  /** Maps a rejection to a user-facing message. */
  getErrorMessage: (error: unknown) => string;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
}

export default function CommentForm({
  onSubmit,
  getErrorMessage,
  label = 'Add a comment',
  placeholder = 'Write a comment…',
  submitLabel = 'Post comment',
  onCancel,
}: CommentFormProps) {
  const textareaId = useId();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = content.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setContent('');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor={textareaId} className="sr-only">
        {label}
      </label>
      <textarea
        id={textareaId}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        className="w-full resize-none rounded-lg bg-slate-700 px-3 py-2 text-sm text-gray-50 placeholder-slate-400 focus:outline-2 focus:outline-blue-500"
      />
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!trimmed || submitting}
          className={cn(
            'rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors',
            'hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {submitting ? 'Posting…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
