import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { filterHref } from '@/pages/notifications/lib/notificationView';

interface NotificationFilterProps {
  unreadOnly: boolean;
}

const FILTERS = [
  { label: 'All', unreadOnly: false },
  { label: 'Unread', unreadOnly: true },
] as const;

/** All / Unread. A link each, so the choice is in the URL and survives a reload. */
export default function NotificationFilter({ unreadOnly }: NotificationFilterProps) {
  return (
    <nav aria-label="Show notifications" className="flex border-b border-line">
      {FILTERS.map((filter) => {
        const current = filter.unreadOnly === unreadOnly;
        return (
          <Link
            key={filter.label}
            to={filterHref(filter.unreadOnly)}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 focus-visible:outline-2 focus-visible:outline-blue-500',
              current
                ? 'text-accent border-blue-500'
                : 'text-fg-subtle border-transparent hover:text-fg-soft'
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
