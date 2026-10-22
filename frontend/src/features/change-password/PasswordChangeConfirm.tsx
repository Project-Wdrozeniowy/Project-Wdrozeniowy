import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  PASSWORD_CONFIRM_TEXT,
  PASSWORD_CONFIRM_TITLE,
} from '@/features/change-password/changePassword.const';

interface PasswordChangeConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  /** The change is being sent: both buttons ignore clicks. */
  pending: boolean;
}

/**
 * The warning before a password change, which signs the user out everywhere. Cancel has the
 * focus when it opens, so a stray Enter does not end the session, and Escape cancels.
 */
export default function PasswordChangeConfirm({
  onConfirm,
  onCancel,
  pending,
}: PasswordChangeConfirmProps) {
  const titleId = useId();
  const textId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !pending) {
      event.stopPropagation();
      onCancel();
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
        {PASSWORD_CONFIRM_TITLE}
      </p>
      <p id={textId} className="text-amber-800 text-sm">
        {PASSWORD_CONFIRM_TEXT}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!pending) onConfirm();
          }}
          // aria-disabled (not disabled) while sending: the button keeps keyboard focus.
          aria-disabled={pending}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded transition-colors aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
        >
          {pending ? 'Changing…' : 'Change password and sign out'}
        </button>
        <button
          ref={cancelRef}
          type="button"
          onClick={() => {
            // Once sent, the change cannot be called off: the session ends when it succeeds.
            if (!pending) onCancel();
          }}
          aria-disabled={pending}
          className="text-gray-600 hover:text-gray-900 font-semibold text-sm px-3 py-2 rounded transition-colors aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
