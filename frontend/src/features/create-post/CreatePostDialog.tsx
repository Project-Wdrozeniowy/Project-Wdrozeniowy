'use client';

import { useIsMutating } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import { CreatePostForm } from '@/features/create-post/CreatePostForm';
import { createPostMutationKey } from '@/shared/api/forum/useCreatePost';

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

export function CreatePostDialog({ open, onClose }: CreatePostDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const publishing = useIsMutating({ mutationKey: createPostMutationKey }) > 0;
  // A published post starts the next draft from a clean form; an unpublished draft survives a close.
  const [formKey, setFormKey] = useState(0);
  const publishedRef = useRef(false);
  // A press that starts on the scrollbar of the overlay must not count as a click on the backdrop.
  const pressStartedOnBackdrop = useRef(false);
  const pressEndedOnBackdrop = useRef(false);
  // Nothing is mounted (and no category request is made) until the dialog is first opened.
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);

  function close() {
    // Closing mid-publish would hide the outcome (success link or error) from the user.
    if (publishing) return;
    if (publishedRef.current) {
      publishedRef.current = false;
      setFormKey((key) => key + 1);
    }
    onClose();
  }

  // Focus moves into the dialog on open and returns to the opener on close.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    panelRef.current?.querySelector<HTMLElement>('input, textarea')?.focus();
    return () => {
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    // Keep Tab inside the dialog.
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    // The panel itself holds focus when a button disabled itself: Tab goes to the first control.
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === panelRef.current)) {
      event.preventDefault();
      first.focus();
    }
  }

  // A button that disables itself (Publish, Cancel, Close while publishing) drops the focus to the
  // page behind the dialog; keep it inside so the keyboard trap keeps working.
  useEffect(() => {
    if (!open || !publishing) return;
    const keepFocusInside = () => {
      if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    };
    keepFocusInside();
    // Some browsers drop the focus from a disabled button only after this effect has run.
    const frame = requestAnimationFrame(keepFocusInside);
    return () => cancelAnimationFrame(frame);
  }, [open, publishing]);

  if (!everOpened) return null;

  return (
    <div
      hidden={!open}
      className={cn(
        'fixed inset-0 z-50 items-start justify-center overflow-y-auto bg-black/50 p-4',
        open ? 'flex' : 'hidden'
      )}
      onMouseDown={(event) => {
        const overlay = event.currentTarget;
        const scrollbarWidth = overlay.offsetWidth - overlay.clientWidth;
        // The scrollbar sits on the right, or on the left in right-to-left layouts.
        const onScrollbar =
          scrollbarWidth > 0 &&
          (event.clientX < overlay.clientLeft ||
            event.clientX >= overlay.clientLeft + overlay.clientWidth);
        pressStartedOnBackdrop.current = event.target === overlay && !onScrollbar;
        pressEndedOnBackdrop.current = false;
      }}
      onMouseUp={(event) => {
        pressEndedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a press that starts AND ends on the bare backdrop counts as a click on it.
        if (
          event.target === event.currentTarget &&
          pressStartedOnBackdrop.current &&
          pressEndedOnBackdrop.current
        ) {
          close();
        }
        pressStartedOnBackdrop.current = false;
        pressEndedOnBackdrop.current = false;
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={close}
          disabled={publishing}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-500 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✕
        </button>
        <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
          >
            ✎
          </span>
          <div>
            <h2 id={titleId} className="text-base font-semibold text-gray-900">
              Create a post
            </h2>
            <p className="text-xs text-gray-500">Share your thoughts with the community</p>
          </div>
        </div>
        <CreatePostForm
          key={formKey}
          onCancel={close}
          onViewPost={close}
          onPublished={() => {
            publishedRef.current = true;
          }}
        />
      </div>
    </div>
  );
}
