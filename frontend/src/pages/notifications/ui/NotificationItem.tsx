import { useId } from 'react';
import { Link } from 'react-router';
import { formatTimeAgo } from '@/utils/format';
import type { NotificationDto } from '@/shared/api/generated/models/notificationDto.dto';
import { cn } from '@/shared/lib/cn';
import {
  NOTIFICATIONS_OPEN_LINK,
  NOTIFICATIONS_UNAVAILABLE_LINK,
  NOTIFICATION_TYPE_LABELS,
} from '@/pages/notifications/config/notifications.const';
import { notificationTarget, notificationText } from '@/pages/notifications/lib/notificationView';

interface NotificationItemProps {
  notification: NotificationDto;
  /** A change is being sent: the actions ignore clicks. */
  busy: boolean;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}

const ACTION_CLASS =
  'text-sm font-semibold px-2 py-1 rounded focus-visible:outline-2 focus-visible:outline-blue-500 aria-disabled:opacity-50 aria-disabled:cursor-not-allowed';

/** One notification: what happened, who did it, whether it is unread, where it leads, and what can be done. */
export default function NotificationItem({
  notification,
  busy,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  const textId = useId();
  const target = notificationTarget(notification);
  const text = notificationText(notification);

  return (
    <li
      data-unread={!notification.read}
      className={cn(
        'rounded-xl p-4 flex flex-col gap-2 bg-surface border',
        notification.read ? 'border-line' : 'border-blue-500/60'
      )}
    >
      <div className="flex items-center gap-2 text-xs text-fg-subtle">
        {!notification.read && (
          <>
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="font-semibold text-accent">Unread</span>
          </>
        )}
        <span>{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
        {notification.senderUsername && <span>· from @{notification.senderUsername}</span>}
        <time dateTime={notification.createdAt}>· {formatTimeAgo(notification.createdAt)}</time>
      </div>

      <p
        id={textId}
        className={cn(
          'text-sm break-words',
          notification.read ? 'text-fg-muted' : 'text-fg font-medium'
        )}
      >
        {text}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {target.kind === 'link' && (
          <Link
            to={target.to}
            // Following a notification is reading it, even while another change is being sent.
            onClick={() => {
              if (!notification.read) onMarkRead(notification.id);
            }}
            aria-describedby={textId}
            className={cn(ACTION_CLASS, 'text-accent hover:text-accent-hover')}
          >
            {NOTIFICATIONS_OPEN_LINK}
          </Link>
        )}
        {target.kind === 'unavailable' && (
          <span className="text-xs text-fg-subtle">{NOTIFICATIONS_UNAVAILABLE_LINK}</span>
        )}
        {!notification.read && (
          <button
            type="button"
            aria-disabled={busy}
            aria-describedby={textId}
            onClick={() => {
              if (!busy) onMarkRead(notification.id);
            }}
            className={cn(ACTION_CLASS, 'text-fg-soft hover:bg-raised')}
          >
            Mark as read
          </button>
        )}
        <button
          type="button"
          aria-disabled={busy}
          aria-describedby={textId}
          onClick={() => {
            if (!busy) onDelete(notification.id);
          }}
          className={cn(ACTION_CLASS, 'text-red-700 dark:text-red-300 hover:bg-red-400/10')}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
