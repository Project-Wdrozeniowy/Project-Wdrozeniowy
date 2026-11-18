import type { NotificationDto } from '@/shared/api/generated/models/notificationDto.dto';
import {
  filterHref,
  flattenNotifications,
  isUnreadFilter,
  notificationTarget,
  notificationText,
} from '../notificationView';

function notification(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id: 1,
    type: 'COMMENT_ON_POST',
    entityType: 'COMMENT',
    entityId: 5,
    senderUsername: 'bob',
    message: 'bob commented on your post',
    read: false,
    createdAt: '2026-10-10T10:00:00Z',
    destination: { available: true, postSlug: 'my-post', commentId: 5, unavailableReason: null },
    ...overrides,
  };
}

describe('notificationTarget', () => {
  it('links to the post when the server says the discussion is open', () => {
    expect(notificationTarget(notification())).toEqual({ kind: 'link', to: '/forum/my-post' });
  });

  it('encodes the slug', () => {
    const open = notification({
      destination: { available: true, postSlug: 'a b/c', commentId: 1, unavailableReason: null },
    });
    expect(notificationTarget(open)).toEqual({ kind: 'link', to: '/forum/a%20b%2Fc' });
  });

  it('has no link when the discussion is not available, whatever else the destination holds', () => {
    const gone = notification({
      destination: {
        available: false,
        postSlug: null,
        commentId: null,
        unavailableReason: 'COMMENT_UNAVAILABLE',
      },
    });
    expect(notificationTarget(gone)).toEqual({ kind: 'unavailable' });
    const inconsistent = notification({
      destination: { available: true, postSlug: null, commentId: null, unavailableReason: null },
    });
    expect(notificationTarget(inconsistent)).toEqual({ kind: 'unavailable' });
  });

  it('has no link for a type without a destination: an id alone does not open a page', () => {
    expect(
      notificationTarget(
        notification({ type: 'VOTE_ON_POST', entityType: 'POST', destination: null })
      )
    ).toEqual({ kind: 'none' });
  });
});

describe('notificationText', () => {
  it('uses the message of the server', () => {
    expect(notificationText(notification({ message: '  Hello  ' }))).toBe('Hello');
  });

  it('names the type when there is no message', () => {
    expect(notificationText(notification({ message: null, type: 'POST_LOCKED' }))).toBe(
      'Post locked'
    );
    expect(notificationText(notification({ message: '   ', type: 'SYSTEM' }))).toBe(
      'System message'
    );
  });
});

describe('the unread filter', () => {
  it('is on only for ?filter=unread', () => {
    expect(isUnreadFilter('unread')).toBe(true);
    expect(isUnreadFilter('all')).toBe(false);
    expect(isUnreadFilter(null)).toBe(false);
  });

  it('builds the links of both filters', () => {
    expect(filterHref(true)).toBe('?filter=unread');
    expect(filterHref(false)).toBe('?');
  });
});

describe('flattenNotifications', () => {
  it('joins the pages in order and drops a repeated item', () => {
    const items = flattenNotifications([
      { content: [notification({ id: 3 }), notification({ id: 2 })] },
      { content: [notification({ id: 2 }), notification({ id: 1 })] },
    ]);
    expect(items.map((n) => n.id)).toEqual([3, 2, 1]);
    expect(flattenNotifications(undefined)).toEqual([]);
  });
});
