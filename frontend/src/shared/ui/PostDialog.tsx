import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
interface PostDialogProps {
  open: boolean;
  busy: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}
/** Shared presentation; callers own the draft lifecycle. */
export default function PostDialog({
  open,
  busy,
  title,
  description,
  onClose,
  children,
}: PostDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const pressStartedOnBackdrop = useRef(false);
  const pressEndedOnBackdrop = useRef(false);
  function close() {
    if (!busy) onClose();
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

  // A button that disables itself (Publish, Cancel, Close while busy) drops the focus to the
  // page behind the dialog; keep it inside so the keyboard trap keeps working.
  useEffect(() => {
    if (!open || !busy) return;
    const keepFocusInside = () => {
      if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    };
    keepFocusInside();
    // Some browsers drop the focus from a disabled button only after this effect has run.
    const frame = requestAnimationFrame(keepFocusInside);
    return () => cancelAnimationFrame(frame);
  }, [open, busy]);

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
        className="relative my-8 w-full max-w-2xl rounded-xl bg-surface p-6 shadow-2xl outline-none border border-line"
      >
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close"
          className="absolute right-4 top-4 text-fg-subtle transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✕
        </button>
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15 text-accent"
          >
            ✎
          </span>
          <div>
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            <p className="text-xs text-fg-subtle">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
