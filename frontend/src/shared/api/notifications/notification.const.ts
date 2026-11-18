import type { ListNotificationsParams } from '@/shared/api/generated/models/listNotificationsParams.dto';

/** Notifications per request on the notification page. The API accepts 1-50. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/**
 * The unread count has no endpoint of its own. A list of only the unread ones answers with
 * `totalElements` = the unread count (documented in the API), so one item is enough to read it.
 */
export const UNREAD_COUNT_PARAMS: ListNotificationsParams = { unreadOnly: true, size: 1, page: 0 };

/** Largest number the bell shows as it is; more is shown as "99+". */
export const UNREAD_BADGE_MAX = 99;

/** Same id for every notification failure toast: a new one replaces the previous one. */
export const NOTIFICATION_TOAST_ID = 'notification-action';

export const NOTIFICATION_MARK_READ_ERROR =
  'We could not mark the notification as read. Try again.';
export const NOTIFICATION_MARK_ALL_ERROR =
  'We could not mark all notifications as read. Try again.';
export const NOTIFICATION_DELETE_ERROR = 'We could not delete the notification. Try again.';
export const NOTIFICATION_GONE_MESSAGE =
  'That notification no longer exists. The list was refreshed.';
