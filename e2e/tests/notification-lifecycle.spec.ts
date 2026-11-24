import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { request as apiRequest, type Page } from '@playwright/test';
import {
  test,
  expect,
  signIn,
  apiSignIn,
  csrfHeaders,
  signOutThroughMenu,
} from '../support/fixtures.js';

declare global {
  interface Window {
    notificationTestSockets: WebSocket[];
  }
}

async function track(page: Page) {
  await page.addInitScript(() => {
    const Original = window.WebSocket;
    window.notificationTestSockets = [];
    window.WebSocket = class extends Original {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        window.notificationTestSockets.push(this);
      }
    };
  });
  const observed = { ready: 0, events: [] as number[] };
  page.on('websocket', (socket) =>
    socket.on('framereceived', ({ payload }) => {
      const text = payload.toString();
      if (text.includes('stream.ready')) observed.ready++;
      const id = /\\?"notificationId\\?":(\d+)/.exec(text);
      if (id) observed.events.push(Number(id[1]));
    })
  );
  return observed;
}

async function protocol(
  page: Page,
  destination: string,
  invalidCsrf = false,
  command = 'SUBSCRIBE'
) {
  return page.evaluate(
    async ({ destination, invalidCsrf, command }) => {
      const csrf = await (await fetch('/api/auth/csrf')).json();
      return new Promise<{ kind: string; safe: boolean }>((resolve, reject) => {
        const socket = new WebSocket(
          `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/websocket`
        );
        const timeout = setTimeout(() => {
          socket.close();
          reject(new Error('Protocol acceptance timed out'));
        }, 8000);
        socket.onopen = () =>
          socket.send(
            `CONNECT\naccept-version:1.2\nheart-beat:0,0\n${csrf.headerName}:${invalidCsrf ? 'wrong-csrf' : csrf.token}\n\n\0`
          );
        socket.onmessage = ({ data }) => {
          const text = String(data);
          if (text.startsWith('CONNECTED'))
            socket.send(`${command}\nid:negative-test\ndestination:${destination}\n\n\0`);
          else {
            clearTimeout(timeout);
            resolve({
              kind: text.startsWith('ERROR') ? 'error' : 'message',
              safe:
                !text.includes(csrf.token) &&
                !text.includes('wrong-csrf') &&
                !text.includes('Exception'),
            });
            socket.close();
          }
        };
        socket.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Protocol transport failed'));
        };
      });
    },
    { destination, invalidCsrf, command }
  );
}

test('realtime: rejects invalid CONNECT CSRF and unauthorized destinations without exposing secrets', async ({
  page,
  request,
  account,
}) => {
  await signIn(page, account);
  for (const destination of [
    '/user/other/queue/notifications',
    '/queue/notifications',
    '/topic/activity',
    '/user/**',
  ])
    expect(await protocol(page, destination)).toEqual({ kind: 'error', safe: true });
  expect(await protocol(page, '/user/queue/notifications', true)).toEqual({
    kind: 'error',
    safe: true,
  });
  expect(await protocol(page, '/user/queue/notifications', false, 'SEND')).toEqual({
    kind: 'error',
    safe: true,
  });
  const guest = await apiRequest.newContext({ baseURL: process.env.E2E_BASE_URL });
  try {
    expect((await guest.get('/ws/info')).status()).toBe(401);
  } finally {
    await guest.dispose();
  }
  await apiSignIn(request, account);
  expect(
    (await request.get('/ws/info', { headers: { Origin: 'https://untrusted.example' } })).status()
  ).toBe(403);
  expect((await request.get('/ws/info', { headers: { Cookie: 'SESSION=invalid' } })).status()).toBe(
    401
  );
});

test('realtime: isolates two open recipients, recovers offline notifications and clears an account switch', async ({
  page,
  browser,
  request,
  account,
}) => {
  const observed = await track(page);
  const headers = await apiSignIn(request, account);
  const post = await request.post('/api/forum/posts', {
    headers,
    data: { title: `Recovery ${account.username}`, content: 'Recovery check', categoryId: 1 },
  });
  expect(post.status()).toBe(201);
  const { slug } = await post.json();
  const parent = await request.post(`/api/forum/posts/${slug}/comments`, {
    headers,
    data: { content: 'A parent comment' },
  });
  const parentId = (await parent.json()).id;
  const other = await apiRequest.newContext({ baseURL: process.env.E2E_BASE_URL });
  const contextB = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
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
    const pageB = await contextB.newPage();
    const otherObserved = await track(pageB);
    await signIn(pageB, identity);
    otherObserved.ready = 0;
    await pageB.goto(`${process.env.E2E_BASE_URL}/notifications`);
    await expect.poll(() => otherObserved.ready).toBeGreaterThan(0);
    await signIn(page, account);
    observed.ready = 0;
    await page.goto('/notifications');
    await expect.poll(() => observed.ready).toBeGreaterThan(0);
    const reply = async () => {
      const response = await other.post(`/api/forum/posts/${slug}/comments`, {
        headers: otherHeaders,
        data: { content: 'Another actual reply', parentId },
      });
      expect(response.status()).toBe(201);
    };
    await reply();
    const item = page.getByRole('listitem').filter({ hasText: `${username} replied` });
    await expect(item).toHaveCount(1);
    await expect(pageB.getByText('You have no notifications yet.')).toBeVisible();
    expect(otherObserved.events).toEqual([]);
    const readyBefore = observed.ready;
    await page.context().setOffline(true);
    await page.evaluate(() => window.notificationTestSockets.forEach((socket) => socket.close()));
    await reply();
    await page.context().setOffline(false);
    await expect.poll(() => observed.ready).toBeGreaterThan(readyBefore);
    await expect(item).toHaveCount(2);
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Notifications, 2 unread' })
    ).toBeVisible();
    await signOutThroughMenu(page);
    await signIn(page, identity);
    await page.goto('/notifications');
    await expect(page.getByText('You have no notifications yet.')).toBeVisible();
    await expect(page.getByText(`${username} replied`, { exact: false })).toHaveCount(0);
  } finally {
    await contextB.close();
    await other.dispose();
  }
});

for (const revocation of ['password', 'idle'] as const) {
  test(`realtime: closes an established connection after ${revocation} revocation`, async ({
    page,
    request,
    account,
  }) => {
    const observed = await track(page);
    await signIn(page, account);
    await expect.poll(() => observed.ready).toBeGreaterThan(0);
    if (revocation === 'password') {
      const headers = await apiSignIn(request, account);
      expect(
        (
          await request.post('/api/users/me/password', {
            headers,
            data: { currentPassword: account.password, newPassword: 'ChangedE2ePassword123!' },
          })
        ).status()
      ).toBe(204);
    } else {
      const project = process.env.E2E_PROJECT ?? '';
      if (
        !/^orbita-e2e-\d+-[a-f0-9]{8}$/.test(project) ||
        !/^e2e_[a-f0-9]{20}$/.test(account.username)
      )
        throw new Error('Refusing session expiry outside the managed synthetic fixture');
      const expired = spawnSync(
        'docker',
        [
          'compose',
          '-f',
          'compose.yml',
          '-p',
          project,
          'exec',
          '-T',
          'postgres',
          'psql',
          '-U',
          'orbita_e2e',
          '-d',
          'orbita_e2e',
          '-v',
          'ON_ERROR_STOP=1',
        ],
        {
          input: `UPDATE spring_session SET last_access_time=0, expiry_time=0 WHERE primary_id IN (SELECT session_primary_id FROM spring_session_attributes WHERE attribute_name='SPRING_SECURITY_CONTEXT' AND position(convert_to('${account.username}', 'UTF8') in attribute_bytes)>0);\n`,
          encoding: 'utf8',
          timeout: 10000,
          windowsHide: true,
        }
      );
      expect(expired.status, expired.stderr).toBe(0);
      expect(expired.stdout).toMatch(/UPDATE [1-9]/);
    }
    // Observe server closure/probe, rather than waiting a fixed interval or weakening production TTLs.
    await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0, {
      timeout: 25000,
    });
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Sign in', exact: true })
    ).toBeVisible();
  });
}
