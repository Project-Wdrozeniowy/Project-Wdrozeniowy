import type { NotificationDtoType } from '@/shared/api/generated/models/notificationDtoType.dto';

export const NOTIFICATIONS_TITLE = 'Notifications';
export const NOTIFICATIONS_LOADING_LABEL = 'Loading notifications';
export const NOTIFICATIONS_LOAD_ERROR_TITLE = 'We could not load your notifications';
export const NOTIFICATIONS_LOAD_ERROR_HINT = 'Please try again in a moment.';
export const NOTIFICATIONS_REFRESH_ERROR =
  'We could not refresh the list. What you see may be out of date.';
export const NOTIFICATIONS_MORE_ERROR = 'We could not load more notifications. Try again.';
export const NOTIFICATIONS_EMPTY_ALL = 'You have no notifications yet.';
export const NOTIFICATIONS_EMPTY_UNREAD = 'You have no unread notifications.';
export const NOTIFICATIONS_UNAVAILABLE_LINK = 'This discussion is no longer available';
export const NOTIFICATIONS_OPEN_LINK = 'Open discussion';

export const NOTIFICATION_FILTER_PARAM = 'filter';
export const NOTIFICATION_FILTER_UNREAD = 'unread';

/** What a notification is, in words; also the text of one that has no message. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationDtoType, string> = {
  COMMENT_ON_POST: 'New comment',
  REPLY_TO_COMMENT: 'New reply',
  VOTE_ON_POST: 'Vote on your post',
  VOTE_ON_COMMENT: 'Vote on your comment',
  MENTION: 'Mention',
  POST_LOCKED: 'Post locked',
  SYSTEM: 'System message',
};
