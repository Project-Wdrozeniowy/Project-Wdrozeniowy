import { randomBytes } from 'node:crypto';
import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn, csrfHeaders, signIn } from '../support/fixtures.js';

type Notification = {
  id: number;
  message: string | null;
  read: boolean;
  destination: { available: boolean; postSlug: string | null } | null;
};

// PWDRZ-152: the notification center against the real notifications API (PWDRZ-144/182).
// Another member replies to the account's comment, so the account has an unread notification (a
// top-level comment would only notify the post's subscribers, and the author is not one). The
// browser then shows it, leads to the discussion, marks everything read and deletes it, and every
// request the page makes for notifications goes to the documented /api/notifications endpoints.
test('shows, reads and deletes a notification through the notification API', async ({
  page,
  request,
  account,
}, testInfo) => {
  const notificationRequests: string[] = [];
  page.on('request', (call) => {
    const { pathname } = new URL(call.url());
    if (call.url().startsWith(`${gatewayURL}/api/`) && pathname.includes('notifications')) {
      notificationRequests.push(`${call.method()} ${pathname}`);
    }
  });

  // Setup through the API: a post and a comment of the account, and the reply of another member.
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Notified ${account.username}`,
      content: 'A post with a discussion.',
      categoryId: categories[0].id,
    },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();
  const parent = await request.post(`${gatewayURL}/api/forum/posts/${slug}/comments`, {
    headers,
    data: { content: 'A comment somebody will answer.' },
  });
  expect(parent.status()).toBe(201);
  const parentId: number = (await parent.json()).id;

  const commenter = await apiRequest.newContext();
  try {
    const username = `e2e_${randomBytes(10).toString('hex')}`;
    const identity = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
    const registered = await commenter.post(`${gatewayURL}/api/auth/register`, {
      headers: await csrfHeaders(commenter),
      data: identity,
    });
    expect(registered.status()).toBe(201);
    const commenterHeaders = await apiSignIn(commenter, identity);
    const reply = await commenter.post(`${gatewayURL}/api/forum/posts/${slug}/comments`, {
      headers: commenterHeaders,
      data: { content: 'Nice comment.', parentId },
    });
    expect(reply.status()).toBe(201);
  } finally {
    await commenter.dispose();
  }

  const listed = await request.get(`${gatewayURL}/api/notifications`);
  expect(listed.status()).toBe(200);
  const stored = ((await listed.json()) as { content: Notification[] }).content;
  expect(stored).toHaveLength(1);
  const message = stored[0].message as string;
  expect(stored[0].read).toBe(false);
  await testInfo.attach('notifications-before.json', {
    body: JSON.stringify(stored, null, 2),
    contentType: 'application/json',
  });

  // The bell shows the number of the server.
  const count = page.waitForResponse(
    (response) =>
      response.url().startsWith(`${gatewayURL}/api/notifications?`) &&
      new URL(response.url()).searchParams.get('unreadOnly') === 'true'
  );
  await signIn(page, account);
  expect((await count).status()).toBe(200);
  await expect(page.getByRole('link', { name: 'Notifications, 1 unread' })).toBeVisible();

  // The page lists it as unread and leads to the discussion.
  await page.getByRole('link', { name: 'Notifications, 1 unread' }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  const item = page.getByRole('listitem').filter({ hasText: message });
  await expect(item).toBeVisible();
  await expect(item.getByText('Unread', { exact: true })).toBeVisible();
  await expect(item.getByRole('link', { name: 'Open discussion' })).toHaveAttribute(
    'href',
    `/forum/${slug}`
  );

  // Mark all as read: the server's answer, then the list and the bell follow it.
  const markedAll = page.waitForResponse(
    (response) =>
      response.url() === `${gatewayURL}/api/notifications/read-all` &&
      response.request().method() === 'PATCH'
  );
  await page.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  expect((await markedAll).status()).toBe(204);
  await expect(page.getByText('All caught up')).toBeVisible();
  await expect(item.getByText('Unread', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();

  // It stays read after a reload: the state is the server's.
  await page.reload();
  await expect(item).toBeVisible();
  await expect(item.getByText('Unread', { exact: true })).toHaveCount(0);
  await expect(page.getByText('All caught up')).toBeVisible();

  // Delete it.
  const deleted = page.waitForResponse(
    (response) =>
      response.url().startsWith(`${gatewayURL}/api/notifications/`) &&
      response.request().method() === 'DELETE'
  );
  await item.getByRole('button', { name: 'Delete' }).click();
  expect((await deleted).status()).toBe(204);
  await expect(page.getByText('You have no notifications yet.')).toBeVisible();
  const after = await request.get(`${gatewayURL}/api/notifications`);
  expect(((await after.json()) as { content: Notification[] }).content).toHaveLength(0);

  // Only the documented endpoints were used, and only these operations.
  await testInfo.attach('notification-requests.txt', {
    body: [...new Set(notificationRequests)].join('\n'),
    contentType: 'text/plain',
  });
  for (const entry of notificationRequests) {
    expect(entry).toMatch(
      /^(GET \/api\/notifications|PATCH \/api\/notifications\/read-all|DELETE \/api\/notifications\/\d+)$/
    );
  }
});
