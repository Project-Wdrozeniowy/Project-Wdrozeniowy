import type { NotificationDto } from '@/shared/api/generated/models/notificationDto.dto';
import { postHref } from '@/shared/lib/searchUrl';
import {
  NOTIFICATION_FILTER_PARAM,
  NOTIFICATION_FILTER_UNREAD,
  NOTIFICATION_TYPE_LABELS,
} from '@/pages/notifications/config/notifications.const';

/** Where a notification leads. Only a discussion the server says is open has a link. */
export type NotificationTarget =
  | { kind: 'link'; to: string }
  | { kind: 'unavailable' }
  | { kind: 'none' };

/**
 * The server resolves the destination of comment notifications when they are read. A
 * notification of another type has none, and the post or comment of the others cannot be opened
 * from an id alone (pages are addressed by slug), so those are shown without a link.
 */
export function notificationTarget(notification: NotificationDto): NotificationTarget {
  const destination = notification.destination;
  if (!destination) return { kind: 'none' };
  if (!destination.available || !destination.postSlug) return { kind: 'unavailable' };
  return { kind: 'link', to: postHref(destination.postSlug) };
}

/** The server's message, or the name of the type when it sent none. */
export function notificationText(notification: NotificationDto): string {
  return notification.message?.trim() || NOTIFICATION_TYPE_LABELS[notification.type];
}

/** `?filter=unread` limits the list to unread notifications; anything else means all. */
export function isUnreadFilter(value: string | null): boolean {
  return value === NOTIFICATION_FILTER_UNREAD;
}

export function filterHref(unreadOnly: boolean): string {
  return unreadOnly ? `?${NOTIFICATION_FILTER_PARAM}=${NOTIFICATION_FILTER_UNREAD}` : '?';
}

/** Items of all loaded pages. Offset paging can repeat an item, so repeats are dropped. */
export function flattenNotifications(
  pages: readonly { content: NotificationDto[] }[] | undefined
): NotificationDto[] {
  const byId = new Map<number, NotificationDto>();
  for (const page of pages ?? []) {
    for (const item of page.content) byId.set(item.id, item);
  }
  return [...byId.values()];
}
