import {
  NOTIFICATIONS_LOAD_ERROR_HINT,
  NOTIFICATIONS_LOAD_ERROR_TITLE,
} from '@/pages/notifications/config/notifications.const';

interface NotificationsErrorProps {
  onRetry: () => void;
  /** A retry is in flight: the button shows it and ignores further clicks. */
  retrying: boolean;
}

/** A failed load. Never shows server details; the user can retry. */
export default function NotificationsError({ onRetry, retrying }: NotificationsErrorProps) {
  return (
    <div
      role="alert"
      className="bg-surface rounded-xl p-5 flex flex-col items-start gap-3 border border-line"
    >
      <p className="text-fg text-sm font-semibold">{NOTIFICATIONS_LOAD_ERROR_TITLE}</p>
      <p className="text-fg-subtle text-sm">{NOTIFICATIONS_LOAD_ERROR_HINT}</p>
      <button
        type="button"
        onClick={() => {
          if (!retrying) onRetry();
        }}
        aria-disabled={retrying}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors aria-disabled:opacity-60 aria-disabled:cursor-not-allowed"
      >
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  );
}
