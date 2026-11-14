import { randomBytes } from 'node:crypto';
import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn, csrfHeaders } from '../support/fixtures.js';

type Destination = {
  available: boolean;
  postSlug: string | null;
  commentId: number | null;
  unavailableReason: string | null;
};
type Notification = { id: number; type: string; destination: Destination | null };

// PWDRZ-182: a reply notification leads its recipient to the reply, through the real gateway.
// Once the reply is deleted, the same notification is unavailable and names neither the post
// nor the comment; another member cannot read the notification.
test('integration: a reply notification leads to the reply until it is deleted', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Notified ${account.username}`,
      content: 'A discussion to come back to.',
      categoryId: categories[0].id,
    },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();
  const parent = await request.post(`${gatewayURL}/api/forum/posts/${slug}/comments`, {
    headers,
    data: { content: 'A comment someone will answer.' },
  });
  expect(parent.status()).toBe(201);
  const parentId: number = (await parent.json()).id;

  const replier = await apiRequest.newContext();
  try {
    const username = `e2e_${randomBytes(10).toString('hex')}`;
    const identity = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
    const registered = await replier.post(`${gatewayURL}/api/auth/register`, {
      headers: await csrfHeaders(replier),
      data: identity,
    });
    expect(registered.status()).toBe(201);
    const replierHeaders = await apiSignIn(replier, identity);
    const reply = await replier.post(`${gatewayURL}/api/forum/posts/${slug}/comments`, {
      headers: replierHeaders,
      data: { content: 'An answer.', parentId },
    });
    expect(reply.status()).toBe(201);
    const replyId: number = (await reply.json()).id;

    const replyNotification = async () => {
      const response = await request.get(`${gatewayURL}/api/notifications`);
      expect(response.status()).toBe(200);
      const page = (await response.json()) as { content: Notification[] };
      return page.content.find((item) => item.type === 'REPLY_TO_COMMENT');
    };

    const notification = await replyNotification();
    expect(notification?.destination).toEqual({
      available: true,
      postSlug: slug,
      commentId: replyId,
      unavailableReason: null,
    });
    const opened = await request.get(`${gatewayURL}/api/forum/posts/${slug}/comments`);
    expect(JSON.stringify(await opened.json())).toContain(`"id":${replyId}`);

    const foreign = await replier.patch(
      `${gatewayURL}/api/notifications/${notification!.id}/read`,
      {
        headers: replierHeaders,
      }
    );
    expect(foreign.status()).toBe(403);

    const deleted = await replier.delete(`${gatewayURL}/api/forum/comments/${replyId}`, {
      headers: replierHeaders,
    });
    expect(deleted.status()).toBe(204);
    expect((await replyNotification())?.destination).toEqual({
      available: false,
      postSlug: null,
      commentId: null,
      unavailableReason: 'COMMENT_UNAVAILABLE',
    });

    const read = await request.patch(`${gatewayURL}/api/notifications/${notification!.id}/read`, {
      headers,
    });
    expect(read.status()).toBe(200);
    expect((await read.json()).destination.unavailableReason).toBe('COMMENT_UNAVAILABLE');
  } finally {
    await replier.dispose();
  }
});
