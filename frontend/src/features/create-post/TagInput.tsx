'use client';

import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { addTag, removeTag } from '@/features/create-post/createPost';
import { FieldLabel } from '@/features/create-post/FieldLabel';
import {
  MAX_TAGS,
  TAG_MAX_LENGTH,
  TAG_SEPARATOR_KEYS,
} from '@/features/create-post/createPost.const';
import { cn } from '@/shared/lib/cn';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** A problem the server reported for the tags. */
  serverError?: string;
  disabled?: boolean;
}

export function TagInput({ tags, onChange, serverError, disabled }: TagInputProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);
  const error = typedError ?? serverError;
  const full = tags.length >= MAX_TAGS;

  function commit() {
    const result = addTag(tags, text);
    if (result.error) {
      setTypedError(result.error);
      return;
    }
    setTypedError(null);
    setText('');
    if (result.tags !== tags) onChange(result.tags);
  }

  // Leaving the field adds what is typed when it is a good tag. A bad one is left alone and
  // reported only on Enter, so clicking Publish or Cancel never raises an error as a side effect.
  function commitIfValid() {
    const result = addTag(tags, text);
    if (result.error || result.tags === tags) return;
    setText('');
    onChange(result.tags);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((TAG_SEPARATOR_KEYS as readonly string[]).includes(event.key)) {
      // Enter must not submit the form; a comma must not end up in the text.
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && text === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label="Tags" counter={{ used: tags.length, max: MAX_TAGS }} />
      <p id={`${id}-hint`} className="text-xs text-gray-500">
        Press <kbd className="rounded bg-gray-100 px-1 font-mono">Enter</kbd> or{' '}
        <kbd className="rounded bg-gray-100 px-1 font-mono">,</kbd> to add. Max {MAX_TAGS} tags ·{' '}
        {TAG_MAX_LENGTH} chars each
      </p>
      <div
        className={cn('input flex flex-wrap items-center gap-1.5', error && 'ring-2 ring-red-500')}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-sm text-blue-700"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(removeTag(tags, tag))}
              disabled={disabled}
              aria-label={`Remove tag ${tag}`}
              className="text-blue-400 hover:text-blue-700 disabled:opacity-50"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setTypedError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={commitIfValid}
          disabled={disabled || full}
          placeholder={full ? '' : 'Add tags and press Enter'}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={cn(`${id}-hint`, error && `${id}-error`)}
          className="min-w-32 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
