import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  UNSAVED_LEAVE_LABEL,
  UNSAVED_STAY_LABEL,
  UNSAVED_TEXT,
  UNSAVED_TITLE,
} from '@/features/edit-profile/profile.const';

interface UnsavedChangesConfirmProps {
  onStay: () => void;
  onLeave: () => void;
}

/**
 * Shown when the user tries to leave a form with unsaved changes. "Keep editing" has the focus
 * when it opens, so a stray Enter does not throw the work away, and Escape keeps editing.
 */
export default function UnsavedChangesConfirm({ onStay, onLeave }: UnsavedChangesConfirmProps) {
  const titleId = useId();
  const textId = useId();
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    stayRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onStay();
    }
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      onKeyDown={handleKeyDown}
      className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3"
    >
      <p id={titleId} className="text-amber-900 font-semibold text-sm">
        {UNSAVED_TITLE}
      </p>
      <p id={textId} className="text-amber-800 text-sm">
        {UNSAVED_TEXT}
      </p>
      <div className="flex items-center gap-3">
        <button
          ref={stayRef}
          type="button"
          onClick={onStay}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded transition-colors"
        >
          {UNSAVED_STAY_LABEL}
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="text-red-700 hover:text-red-900 font-semibold text-sm px-3 py-2 rounded transition-colors"
        >
          {UNSAVED_LEAVE_LABEL}
        </button>
      </div>
    </div>
  );
}
