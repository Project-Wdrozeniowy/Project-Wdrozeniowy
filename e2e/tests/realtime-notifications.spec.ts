import { randomBytes } from 'node:crypto';
import { request as apiRequest } from '@playwright/test';
import {
  test,
  expect,
  apiSignIn,
  csrfHeaders,
  signIn,
  signOutThroughMenu,
} from '../support/fixtures.js';

// Fault injection blocks transports, never supplies a mocked successful API/frame response.
for (const transport of ['websocket', 'xhr-streaming', 'xhr-polling'] as const) {
  test(`realtime: an open notification center receives a persisted reply over ${transport}`, async ({
    page,
    request,
    account,
  }, testInfo) => {
    const frames: string[] = [];
    const paths: string[] = [];
    if (transport !== 'websocket') {
      await page.routeWebSocket('**/ws/**', (socket) => socket.close());
      if (transport === 'xhr-polling')
        await page.route(/\/ws\/[^/]+\/[^/]+\/xhr_streaming(?:\?|$)/, (route) => route.abort());
    }
    page.on('websocket', (socket) =>
      socket.on('framereceived', ({ payload }) => frames.push(payload.toString()))
    );
    let subscribed = false;
    let reconciled = false;
    page.on('request', (call) => {
      const path = new URL(call.url()).pathname;
      if (path.startsWith('/ws/')) paths.push(path);
      if (path.endsWith('/xhr_send') && call.postData()?.includes('SUBSCRIBE')) subscribed = true;
      if (subscribed && path === '/api/notifications') reconciled = true;
    });
    const headers = await apiSignIn(request, account);
    const created = await request.post('/api/forum/posts', {
      headers,
      data: {
        title: `Live ${account.username}`,
        content: 'Live notification acceptance.',
        categoryId: 1,
      },
    });
    expect(created.status()).toBe(201);
    const { slug } = await created.json();
    const parent = await request.post(`/api/forum/posts/${slug}/comments`, {
      headers,
      data: { content: 'Reply to me.' },
    });
    expect(parent.status()).toBe(201);
    const parentId = (await parent.json()).id;
    await signIn(page, account);
    subscribed = false;
    reconciled = false;
    frames.length = 0;
    await page.goto('/notifications');
    await expect(page.getByText('You have no notifications yet.')).toBeVisible();
    await expect
      .poll(() =>
        transport === 'websocket'
          ? frames.some((frame) => frame.includes('stream.ready'))
          : reconciled
      )
      .toBe(true);
    const other = await apiRequest.newContext({ baseURL: process.env.E2E_BASE_URL });
    try {
      const username = `e2e_${randomBytes(10).toString('hex')}`;
      const identity = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
      expect(
        (
          await other.post('/api/auth/register', {
            headers: await csrfHeaders(other),
            data: identity,
          })
        ).status()
      ).toBe(201);
      const otherHeaders = await apiSignIn(other, identity);
      const reply = await other.post(`/api/forum/posts/${slug}/comments`, {
        headers: otherHeaders,
        data: { content: `Actual reply ${transport}`, parentId },
      });
      expect(reply.status()).toBe(201);
      // No reload, focus change or manual refresh after the producer.
      const item = page.getByRole('listitem').filter({ hasText: `${username} replied` });
      await expect(item).toBeVisible();
      await expect(
        page.getByRole('banner').getByRole('link', { name: 'Notifications, 1 unread' })
      ).toBeVisible();
      await expect(item).toHaveCount(1);
      const own = await request.get('/api/notifications');
      const saved = (await own.json()).content[0];
      expect(saved.type).toBe('REPLY_TO_COMMENT');
      expect((await (await other.get('/api/notifications')).json()).totalElements).toBe(0);
      const guest = await apiRequest.newContext({ baseURL: process.env.E2E_BASE_URL });
      try {
        expect((await guest.get('/ws/info')).status()).toBe(401);
      } finally {
        await guest.dispose();
      }
      const rejected = await other.patch(`/api/notifications/${saved.id}/read`, {
        headers: otherHeaders,
      });
      expect(rejected.status()).toBe(403);
      await testInfo.attach('realtime-path.json', {
        body: JSON.stringify({ transport, paths, notificationId: saved.id }),
        contentType: 'application/json',
      });
      if (transport === 'xhr-polling')
        expect(paths.some((path) => path.endsWith('/xhr'))).toBe(true);
      if (transport === 'xhr-streaming')
        expect(paths.some((path) => path.endsWith('/xhr_streaming'))).toBe(true);
      await signOutThroughMenu(page);
      await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0);
    } finally {
      await other.dispose();
    }
  });
}
