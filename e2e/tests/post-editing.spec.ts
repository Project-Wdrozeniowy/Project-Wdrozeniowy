import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { request as apiRequest } from '@playwright/test';
import { test, expect, apiSignIn, csrfHeaders, signIn, gatewayURL } from '../support/fixtures.js';

/** Staff fixture only; the product still exposes no role-change endpoint. */
function promoteModerator(username: string) {
  const project = process.env.E2E_PROJECT ?? '';
  if (!/^orbita-e2e-\d+-[a-f0-9]+$/.test(project) || !/^e2e_[a-f0-9]+$/.test(username))
    throw new Error('Not an owned synthetic staff fixture');
  const result = spawnSync(
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
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    {
      input: `UPDATE users SET role='MODERATOR' WHERE username='${username}';\n`,
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
    }
  );
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('UPDATE 1');
}

/** PWDRZ-190: read-only measurement restricted to the managed disposable database. */
function storedOpenings(id: number) {
  const project = process.env.E2E_PROJECT ?? '';
  if (!/^orbita-e2e-\d+-[a-f0-9]+$/.test(project) || !Number.isSafeInteger(id) || id <= 0)
    throw new Error('Not an owned E2E fixture');
  const result = spawnSync(
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
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    {
      input: `SELECT p.view_count::text || ',' || (SELECT count(*) FROM activity_events a WHERE a.event_type='POST_VIEWED' AND a.entity_type='POST' AND a.entity_id=p.id)::text FROM posts p WHERE p.id=${id};\n`,
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
    }
  );
  expect(result.status, result.stderr).toBe(0);
  const counts = result.stdout.trim().split(',').map(Number);
  expect(counts).toHaveLength(2);
  expect(counts.every(Number.isSafeInteger)).toBe(true);
  return counts;
}

test('own post editing persists exact title/body, preserves discussion and counts, and Cancel writes nothing', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const token = `edit${randomUUID().slice(0, 8)}`;
  const created = await request.post('/api/forum/posts', {
    headers,
    data: {
      title: `Original ${token}`,
      content: 'Original **Markdown**.',
      categoryId: 1,
      tags: [token],
    },
  });
  expect(created.status()).toBe(201);
  const post = await created.json();
  const path = `/api/forum/posts/${post.slug}`;
  expect(
    (
      await request.post(`${path}/comments`, { headers, data: { content: 'Preserved discussion' } })
    ).status()
  ).toBe(201);
  expect(
    (
      await request.post('/api/forum/votes', {
        headers,
        data: { entityType: 'POST', entityId: post.id, voteType: 'UP' },
      })
    ).status()
  ).toBe(201);
  expect(
    (
      await request.post(`${path}/openings`, { headers, data: { openingId: randomUUID() } })
    ).status()
  ).toBe(204);
  await signIn(page, account);
  // Load the profile's independent list before editing to exercise its cached copy.
  await page.goto('/profile');
  await expect(page.getByRole('link', { name: post.title, exact: true })).toBeVisible();
  // Opening the page records its own opening (PWDRZ-166): wait for it, so what is compared below
  // is the stored state after it, and only an edit could change it from here on.
  const recorded = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url() === `${gatewayURL}${path}/openings`
  );
  await page.goto(`/forum/${post.slug}`);
  await expect(page.getByRole('button', { name: 'Edit post', exact: true })).toBeVisible();
  expect((await recorded).status()).toBe(204);
  const before = await (await request.get(path)).json();
  const openings = storedOpenings(post.id);
  const patches: object[] = [];
  const openingRequests: string[] = [];
  page.on('request', (call) => {
    if (call.method() === 'PATCH' && call.url() === `${gatewayURL}${path}`)
      patches.push(call.postDataJSON());
    if (call.method() === 'POST' && call.url().endsWith(`${path}/openings`))
      openingRequests.push(call.url());
  });
  await page.getByRole('button', { name: 'Edit post', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit post', exact: true });
  await expect(dialog.getByLabel('Title', { exact: false })).toBeFocused();
  await dialog.getByLabel('Title', { exact: false }).fill('Discard this');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(patches).toEqual([]);
  expect((await (await request.get(path)).json()).title).toBe(post.title);
  await page.getByRole('button', { name: 'Edit post', exact: true }).click();
  await expect(dialog.getByLabel('Title', { exact: false })).toHaveValue(post.title);
  const title = `Corrected ${token}`;
  const content = '  **Corrected**  \n\nPersisted Markdown\n';
  await dialog.getByLabel('Title', { exact: false }).fill(title);
  await dialog.getByLabel('Body', { exact: false }).fill(content);
  await testInfo.attach('desktop-editor.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit post', exact: true })).toBeFocused();
  expect(patches).toEqual([{ title, content }]);
  const after = await (await request.get(path)).json();
  expect(after).toMatchObject({
    id: before.id,
    slug: before.slug,
    title,
    content,
    category: before.category,
    tags: before.tags,
    status: before.status,
    pinned: before.pinned,
    voteScore: before.voteScore,
    commentCount: before.commentCount,
    viewCount: before.viewCount,
  });
  expect(storedOpenings(post.id)).toEqual(openings);
  expect(openingRequests).toEqual([]);
  await testInfo.attach('saved-post.json', {
    body: JSON.stringify({
      input: { title, content },
      expected: {
        preserved: ['id', 'slug', 'category', 'tags', 'status', 'votes', 'comments', 'openings'],
      },
      before,
      after,
      openings,
    }),
    contentType: 'application/json',
  });
  // A deliberate reload is outside the edit-only opening measurement.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('Preserved discussion', { exact: true })).toBeVisible();
  for (const route of ['/profile', '/forum', `/search?q=${token}`]) {
    await page.goto(route);
    await expect(page.getByRole('link', { name: new RegExp(`^${title}`) }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`^${post.title}`) })).toHaveCount(0);
  }
  await page.goto(`/forum/${post.slug}`);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole('button', { name: 'Edit post', exact: true }).click();
  await expect(dialog).toBeVisible();
  await testInfo.attach('mobile-dark-editor.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await testInfo.attach('mobile.png', { body: await page.screenshot(), contentType: 'image/png' });
});

test('guest and another author have no edit action and their real PATCH cannot change the post', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const created = await request.post('/api/forum/posts', {
    headers,
    data: { title: `Protected edit ${account.username}`, content: 'Keep this body', categoryId: 1 },
  });
  expect(created.status()).toBe(201);
  const post = await created.json();
  await page.goto(`/forum/${post.slug}`);
  await expect(page.getByRole('heading', { name: post.title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit post', exact: true })).toHaveCount(0);
  const stranger = await apiRequest.newContext({ baseURL: gatewayURL });
  try {
    const path = `/api/forum/posts/${post.slug}`;
    expect(
      (
        await stranger.patch(path, {
          headers: await csrfHeaders(stranger),
          data: { title: 'Forbidden' },
        })
      ).status()
    ).toBe(401);
    const username = `e2e_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const identity = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
    expect(
      (
        await stranger.post('/api/auth/register', {
          headers: await csrfHeaders(stranger),
          data: identity,
        })
      ).status()
    ).toBe(201);
    const otherHeaders = await apiSignIn(stranger, identity);
    expect(
      (
        await stranger.patch(path, { headers: otherHeaders, data: { content: 'Forbidden' } })
      ).status()
    ).toBe(403);
    expect((await request.patch(path, { data: { title: 'Missing CSRF' } })).status()).toBe(403);
    await signIn(page, identity);
    await page.goto(`/forum/${post.slug}`);
    await expect(page.getByRole('heading', { name: post.title })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit post', exact: true })).toHaveCount(0);
    expect(await (await request.get(path)).json()).toMatchObject({
      title: post.title,
      content: post.content,
    });
  } finally {
    await stranger.dispose();
  }
});

test('own drafts remain drafts after editing, and a concurrent moderation lock rejects the open editor', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const created = await request.post('/api/forum/posts', {
    headers,
    data: {
      title: `Draft edit ${account.username}`,
      content: 'Private draft body',
      categoryId: 1,
      draft: true,
    },
  });
  expect(created.status()).toBe(201);
  const post = await created.json();
  const path = `/api/forum/posts/${post.slug}`;
  await signIn(page, account);
  await page.goto(`/forum/${post.slug}`);
  await page.getByRole('button', { name: 'Edit post', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Title', { exact: false })
    .fill('Corrected draft title');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await (await request.get(path)).json()).toMatchObject({
    title: 'Corrected draft title',
    status: 'DRAFT',
    content: 'Private draft body',
  });
  expect((await request.patch(path, { headers, data: { status: 'PUBLISHED' } })).status()).toBe(
    200
  );
  await page.reload();
  await page.getByRole('button', { name: 'Edit post', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Body', { exact: false }).fill('Rejected correction');
  const staff = await apiRequest.newContext({ baseURL: gatewayURL });
  try {
    const username = `e2e_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const identity = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
    expect(
      (
        await staff.post('/api/auth/register', {
          headers: await csrfHeaders(staff),
          data: identity,
        })
      ).status()
    ).toBe(201);
    promoteModerator(username);
    const staffHeaders = await apiSignIn(staff, identity);
    expect(
      (await staff.patch(path, { headers: staffHeaders, data: { status: 'LOCKED' } })).status()
    ).toBe(200);
    const rejected = page.waitForResponse(
      (response) =>
        response.url() === `${gatewayURL}${path}` && response.request().method() === 'PATCH'
    );
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    expect((await rejected).status()).toBe(403);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit post', exact: true })).toHaveCount(0);
    await expect(page.getByText('locked', { exact: true })).toBeVisible();
    expect(await (await request.get(path)).json()).toMatchObject({
      content: 'Private draft body',
      status: 'LOCKED',
    });
    await expect(
      page.getByText('This change was not allowed. Check your access and try again.')
    ).toBeVisible();
  } finally {
    await staff.dispose();
  }
});
