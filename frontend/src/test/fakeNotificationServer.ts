import type MockAdapter from 'axios-mock-adapter';
import type { NotificationDto } from '@/shared/api/generated/models/notificationDto.dto';

/**
 * A small stateful stand-in for the notification endpoints, behind the real ApiClient. It keeps
 * the notifications in memory and answers like the API documents, so a test can change something
 * and then see what the next request returns, as the screen does.
 */
export function fakeNotificationServer(mock: MockAdapter, initial: NotificationDto[]) {
  let items = [...initial];

  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });

  mock.onGet('/notifications').reply((config) => {
    const { page = 0, size = 20, unreadOnly = false } = config.params ?? {};
    const matching = unreadOnly ? items.filter((item) => !item.read) : items;
    const content = matching.slice(page * size, page * size + size);
    return [
      200,
      {
        content,
        page,
        size,
        totalElements: matching.length,
        totalPages: Math.ceil(matching.length / size),
        first: page === 0,
        last: (page + 1) * size >= matching.length,
      },
    ];
  });

  mock.onPatch(/\/notifications\/\d+\/read$/).reply((config) => {
    const id = Number(config.url?.split('/').at(-2));
    const found = items.find((item) => item.id === id);
    if (!found) return [404, { status: 404 }];
    found.read = true;
    return [200, found];
  });

  mock.onPatch('/notifications/read-all').reply(() => {
    items.forEach((item) => (item.read = true));
    return [204];
  });

  mock.onDelete(/\/notifications\/\d+$/).reply((config) => {
    const id = Number(config.url?.split('/').at(-1));
    if (!items.some((item) => item.id === id)) return [404, { status: 404 }];
    items = items.filter((item) => item.id !== id);
    return [204];
  });

  return {
    /** What the server holds right now. */
    items: () => items,
    /** Another device deleted it. */
    removeBehindTheScenes: (id: number) => {
      items = items.filter((item) => item.id !== id);
    },
  };
}

let nextId = 1;

export function makeNotification(overrides: Partial<NotificationDto> = {}): NotificationDto {
  const id = overrides.id ?? nextId++;
  return {
    id,
    type: 'COMMENT_ON_POST',
    entityType: 'COMMENT',
    entityId: id,
    senderUsername: 'bob',
    message: `bob commented on your post #${id}`,
    read: false,
    createdAt: '2026-10-10T10:00:00Z',
    destination: {
      available: true,
      postSlug: `post-${id}`,
      commentId: id,
      unavailableReason: null,
    },
    ...overrides,
  };
}
