import { useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/shared/api/notifications/useNotificationActions';
import { useNotificationList } from '@/shared/api/notifications/useNotificationList';
import { useUnreadNotificationCount } from '@/shared/api/notifications/useUnreadNotificationCount';
import {
  NOTIFICATIONS_EMPTY_ALL,
  NOTIFICATIONS_EMPTY_UNREAD,
  NOTIFICATIONS_MORE_ERROR,
  NOTIFICATIONS_REFRESH_ERROR,
  NOTIFICATIONS_TITLE,
  NOTIFICATION_FILTER_PARAM,
} from '@/pages/notifications/config/notifications.const';
import { flattenNotifications, isUnreadFilter } from '@/pages/notifications/lib/notificationView';
import NotificationFilter from './NotificationFilter';
import NotificationItem from './NotificationItem';
import NotificationsError from './NotificationsError';
import NotificationsSkeleton from './NotificationsSkeleton';

/**
 * The signed-in user's notifications. What is shown is what the server returned: every change
 * (mark read, mark all read, delete) is followed by a reload of the list and the unread count.
 * The notification stream also refreshes this list/count after creation and reconnect.
 */
export default function NotificationsView() {
  const [searchParams] = useSearchParams();
  const unreadOnly = isUnreadFilter(searchParams.get(NOTIFICATION_FILTER_PARAM));
  const listRef = useRef<HTMLElement>(null);

  const list = useNotificationList(unreadOnly);
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  // One change at a time: the actions of every item wait for it, so two requests never race.
  const busy = markRead.isPending || markAll.isPending || remove.isPending;
  const items = flattenNotifications(list.data?.pages);
  const unreadCount = unread.data;

  function handleDelete(id: number) {
    // The item is gone afterwards, so the keyboard focus goes to the list, not to the page body.
    remove.mutate(id, { onSuccess: () => listRef.current?.focus() });
  }

  let body;
  if (list.isLoadingError) {
    body = <NotificationsError onRetry={() => void list.refetch()} retrying={list.isFetching} />;
  } else if (list.isPending) {
    body = <NotificationsSkeleton />;
  } else if (items.length === 0) {
    body = (
      <p role="status" className="text-fg-subtle text-sm">
        {unreadOnly ? NOTIFICATIONS_EMPTY_UNREAD : NOTIFICATIONS_EMPTY_ALL}
      </p>
    );
  } else {
    body = (
      <>
        <ul className="flex flex-col gap-3">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              busy={busy}
              onMarkRead={(id) => markRead.mutate(id)}
              onDelete={handleDelete}
            />
          ))}
        </ul>
        {list.hasNextPage && (
          <button
            type="button"
            onClick={() => {
              if (!list.isFetchingNextPage) void list.fetchNextPage();
            }}
            aria-disabled={list.isFetchingNextPage}
            className="self-center rounded border border-line-strong px-4 py-2 text-sm font-semibold text-fg-soft hover:bg-raised aria-disabled:opacity-60 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </>
    );
  }

  return (
    <section
      ref={listRef}
      tabIndex={-1}
      aria-label={NOTIFICATIONS_TITLE}
      className="flex flex-col gap-4 outline-none"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p aria-live="polite" className="text-sm text-fg-subtle">
          {unreadCount === undefined
            ? ''
            : unreadCount === 0
              ? 'All caught up'
              : `${unreadCount} unread`}
        </p>
        <button
          type="button"
          // Disabled only when the server says there is nothing unread; unknown counts stay usable.
          aria-disabled={busy || unreadCount === 0}
          onClick={() => {
            if (!busy && unreadCount !== 0) markAll.mutate();
          }}
          className="text-sm font-semibold px-3 py-1.5 rounded border border-line-strong text-fg-soft hover:bg-raised aria-disabled:opacity-50 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          Mark all as read
        </button>
      </div>
      <NotificationFilter unreadOnly={unreadOnly} />
      {/* A failed refresh or a failed "Load more" must show whatever the list holds: even an empty one. */}
      {(list.isRefetchError || list.isFetchNextPageError) && (
        <p role="alert" className="text-warning text-sm">
          {list.isFetchNextPageError ? NOTIFICATIONS_MORE_ERROR : NOTIFICATIONS_REFRESH_ERROR}
        </p>
      )}
      {body}
    </section>
  );
}
