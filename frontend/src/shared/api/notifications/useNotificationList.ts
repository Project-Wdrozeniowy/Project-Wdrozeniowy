import { useInfiniteQuery } from '@tanstack/react-query';
import { getListNotificationsQueryKey, listNotifications } from '@/shared/api/generated/orbita.api';
import { NOTIFICATIONS_PAGE_SIZE } from '@/shared/api/notifications/notification.const';
import { useStore } from '@/store';

/**
 * The signed-in user's notifications, newest first, a page at a time. The key starts with the
 * generated `/notifications` key, so invalidating that one (as every notification change does)
 * refreshes this list and the unread count together.
 */
export function useNotificationList(unreadOnly: boolean) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  return useInfiniteQuery({
    queryKey: [...getListNotificationsQueryKey(), 'pages', { unreadOnly }],
    queryFn: ({ pageParam, signal }) =>
      listNotifications(
        { page: pageParam, size: NOTIFICATIONS_PAGE_SIZE, unreadOnly },
        // The page shows its own fixed message; the global toast would print server text.
        { skipErrorToast: true },
        signal
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: isAuthenticated,
    retry: false,
  });
}
