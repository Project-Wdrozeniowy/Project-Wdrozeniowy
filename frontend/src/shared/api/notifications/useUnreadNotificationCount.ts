import { useListNotifications } from '@/shared/api/generated/orbita.api';
import { UNREAD_COUNT_PARAMS } from '@/shared/api/notifications/notification.const';
import { useStore } from '@/store';

/**
 * How many notifications of the signed-in user are unread, as the server counts them.
 *
 * Nothing is requested for a guest: the notifications are private. It is read when the app opens,
 * when the window gets the focus again and after every notification change (those invalidate the
 * `/notifications` keys). The PWDRZ-104 stream invalidates these queries on notification creation and reconnect. While
 * the count is unknown or the request failed, `data` is undefined and no number is shown.
 */
export function useUnreadNotificationCount() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  return useListNotifications(UNREAD_COUNT_PARAMS, {
    query: {
      enabled: isAuthenticated,
      select: (page) => page.totalElements,
      // A failing count must not retry in a loop or stay stale: the bell just shows no number.
      retry: false,
    },
    // The bell shows its own fixed state; the global toast would print server text.
    request: { skipErrorToast: true },
  });
}
