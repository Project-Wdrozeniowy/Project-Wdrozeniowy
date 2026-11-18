import { Link, useLocation } from 'react-router';
import { useUnreadNotificationCount } from '@/shared/api/notifications/useUnreadNotificationCount';
import { UNREAD_BADGE_MAX } from '@/shared/api/notifications/notification.const';
import { BellIcon } from '@/shared/ui/icons';

/**
 * The bell: a link to the notification page with the number the server counts as unread. The
 * number is only shown once it is known and above zero, never guessed.
 */
export default function NotificationBell() {
  const { pathname } = useLocation();
  const { data: unread } = useUnreadNotificationCount();
  const hasUnread = unread !== undefined && unread > 0;

  return (
    <Link
      to="/notifications"
      aria-label={hasUnread ? `Notifications, ${unread} unread` : 'Notifications'}
      aria-current={pathname === '/notifications' ? 'page' : undefined}
      className="relative p-2 rounded text-fg hover:bg-raised transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      <BellIcon />
      {hasUnread && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center"
        >
          {unread > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : unread}
        </span>
      )}
    </Link>
  );
}
