import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { request as apiRequest, type APIRequestContext, type Locator } from '@playwright/test';
import {
  test,
  expect,
  gatewayURL,
  apiSignIn,
  csrfHeaders,
  signIn,
  signOutThroughMenu,
} from '../support/fixtures.js';
import type { Identity } from '../support/fixtures.js';

function metric(card: Locator, label: string) {
  return card.getByText(label, { exact: true }).locator('..').locator('dd').first();
}

async function reader() {
  const context = await apiRequest.newContext();
  const username = `e2e_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
  const identity: Identity = {
    username,
    email: `${username}@example.test`,
    password: 'E2ePassword123!',
  };
  expect(
    (
      await context.post(`${gatewayURL}/api/auth/register`, {
        headers: await csrfHeaders(context),
        data: identity,
      })
    ).status()
  ).toBe(201);
  const headers = await apiSignIn(context, identity);
  return { context, identity, headers };
}

async function createPost(request: APIRequestContext, account: Identity, draft = false) {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const title = `Insights ${account.username}`;
  const response = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title,
      content: 'A persisted post with public and author insights.',
      categoryId: categories[0].id,
      draft,
    },
  });
  expect(response.status()).toBe(201);
  return { ...(await response.json()), title, headers } as {
    id: number;
    slug: string;
    title: string;
    headers: Record<string, string>;
  };
}

/** Read-only evidence, restricted to the launcher's owned disposable database. */
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
      timeout: 10_000,
      windowsHide: true,
    }
  );
  expect(result.status, result.stderr).toBe(0);
  const counts = result.stdout.trim().split(',').map(Number);
  expect(counts).toHaveLength(2);
  expect(counts.every(Number.isSafeInteger)).toBe(true);
  return counts;
}

test('post insights follow persisted votes, replies, account changes and safe refresh', async ({
  page,
  request,
  account,
}, testInfo) => {
  const post = await createPost(request, account);
  const first = await reader();
  const second = await reader();
  const path = `${gatewayURL}/api/forum/posts/${post.slug}`;
  const publicURL = `${gatewayURL}/api/analytics/public/posts/${post.id}`;
  const ownerURL = `${gatewayURL}/api/analytics/me/posts/${post.id}`;
  try {
    for (const [context, headers, voteType] of [
      [request, post.headers, 'UP'],
      [second.context, second.headers, 'DOWN'],
    ] as const) {
      expect(
        (
          await context.post(`${gatewayURL}/api/forum/votes`, {
            headers,
            data: { entityType: 'POST', entityId: post.id, voteType },
          })
        ).status()
      ).toBe(201);
    }
    for (let index = 0; index < 2; index++)
      expect(
        (
          await request.post(`${path}/openings`, {
            headers: post.headers,
            data: { openingId: randomUUID() },
          })
        ).status()
      ).toBe(204);
    const ownerRequests: string[] = [];
    const openingRequests: string[] = [];
    page.on('request', (call) => {
      if (call.url() === ownerURL) ownerRequests.push(call.url());
      if (call.url() === `${path}/openings` && call.method() === 'POST')
        openingRequests.push(call.url());
    });
    await page.goto(`/forum/${post.slug}`);
    const publicCard = page.getByRole('region', { name: 'Post insights' });
    await expect(metric(publicCard, 'Score')).toHaveText('0');
    expect(ownerRequests).toEqual([]);
    await publicCard.getByRole('button', { name: 'Details', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(publicCard.getByRole('button', { name: 'Hide details' })).toBeFocused();
    await expect(publicCard.getByText(/They are not unique readers/)).toBeVisible();
    await testInfo.attach('insights-public-desktop.png', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    await signIn(page, first.identity);
    await page.goto(`/forum/${post.slug}`);
    const article = page.getByRole('article', { name: post.title });
    await article.getByRole('button', { name: 'Upvote' }).click();
    await expect(metric(publicCard, 'Score')).toHaveText('1');
    const rootText = `Root ${first.identity.username}`;
    await page.getByLabel('Add a comment').fill(rootText);
    await page.getByRole('button', { name: 'Post comment', exact: true }).click();
    await expect(metric(publicCard, 'Visible comments')).toHaveText('1');
    await page.getByRole('button', { name: 'Reply', exact: true }).click();
    await page.getByLabel(`Reply to ${first.identity.username}`).fill('A visible nested reply');
    await page.getByRole('button', { name: 'Post reply' }).click();
    await expect(metric(publicCard, 'Visible comments')).toHaveText('2');
    await expect(page.getByRole('heading', { name: 'Comments (1 thread)' })).toBeVisible();
    expect(ownerRequests).toEqual([]);
    expect((await first.context.get(ownerURL)).status()).toBe(404);
    await signOutThroughMenu(page);
    await signIn(page, account);
    await page.goto(`/forum/${post.slug}`);
    const authorCard = page.getByRole('region', { name: 'Author insights' });
    await expect(authorCard.getByText('2 upvotes · 1 downvote')).toBeVisible();
    await expect(metric(authorCard, 'Visible comments')).toHaveText('2');
    const before = storedOpenings(post.id);
    expect(before[0]).toBeGreaterThanOrEqual(2);
    expect(before[1]).toBeGreaterThanOrEqual(2);
    const openingsBefore = openingRequests.length;
    for (let index = 0; index < 3; index++) {
      const summaryRead = page.waitForResponse(
        (r) => r.url() === ownerURL && r.request().method() === 'GET'
      );
      const postRead = page.waitForResponse(
        (r) => r.url() === path && r.request().method() === 'GET'
      );
      await authorCard.getByRole('button', { name: 'Refresh insights' }).click();
      expect((await summaryRead).status()).toBe(200);
      expect((await postRead).status()).toBe(200);
      await expect(
        authorCard.getByRole('button', { name: 'Refresh insights' })
      ).not.toHaveAttribute('aria-disabled', 'true');
    }
    const afterRefresh = storedOpenings(post.id);
    expect(afterRefresh).toEqual(before);
    expect(openingRequests).toHaveLength(openingsBefore);
    await testInfo.attach('insights-author-desktop.png', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(authorCard).toBeVisible();
      try {
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), {
            message: `No horizontal page overflow at ${width}px`,
          })
          .toBe(true);
      } catch (error) {
        await testInfo.attach(`overflow-${width}.json`, {
          body: JSON.stringify(
            await page.evaluate(() => ({
              viewport: innerWidth,
              page: document.documentElement.scrollWidth,
              elements: [...document.querySelectorAll<HTMLElement>('body *')]
                .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
                .map((element) => ({
                  tag: element.tagName,
                  className: element.className,
                  text: element.textContent?.slice(0, 80),
                  right: element.getBoundingClientRect().right,
                })),
            }))
          ),
          contentType: 'application/json',
        });
        throw error;
      }
    }
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const accessibleCard = await authorCard.ariaSnapshot();
    expect(accessibleCard).toContain('Author insights');
    expect(accessibleCard).toContain('Refresh insights');
    expect(accessibleCard).toContain('Visible comments');
    await testInfo.attach('insights-accessibility.txt', {
      body: accessibleCard,
      contentType: 'text/plain',
    });
    // Center the card between the fixed header and bottom navigation before capturing it.
    await authorCard.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await testInfo.attach('insights-author-phone-dark.png', {
      body: await authorCard.screenshot(),
      contentType: 'image/png',
    });
    await page.reload();
    await expect(authorCard.getByText('2 upvotes · 1 downvote')).toBeVisible();
    await signOutThroughMenu(page);
    await signIn(page, first.identity);
    await page.goto(`/forum/${post.slug}`);
    await expect(publicCard).toBeVisible();
    await expect(page.getByText('2 upvotes · 1 downvote')).toHaveCount(0);
    // Delete the root through UI: the visible nested reply still counts under its placeholder.
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await expect(metric(publicCard, 'Visible comments')).toHaveText('1');
    await expect(page.getByText('[comment deleted]')).toBeVisible();
    await expect(page.getByText('A visible nested reply')).toBeVisible();
    const persisted = await (await request.get(ownerURL)).json();
    expect(persisted).toMatchObject({
      voteScore: 1,
      upvoteCount: 2,
      downvoteCount: 1,
      commentCount: 1,
    });
    expect(await (await first.context.get(publicURL)).json()).toMatchObject({
      voteScore: 1,
      commentCount: 1,
    });
    await testInfo.attach('insights-evidence.json', {
      body: JSON.stringify({
        postId: post.id,
        beforeRefresh: before,
        afterRefresh,
        persisted,
      }),
      contentType: 'application/json',
    });
  } finally {
    await first.context.dispose();
    await second.context.dispose();
  }
});

test('insights recover from a real failed request without replacing the post or comment draft', async ({
  page,
  request,
  account,
}, testInfo) => {
  const post = await createPost(request, account);
  await signIn(page, account);
  const ownerPath = `**/api/analytics/me/posts/${post.id}`;
  await page.route(ownerPath, (route) => route.abort('failed'));
  await page.goto(`/forum/${post.slug}`);
  const card = page.getByRole('region', { name: 'Author insights' });
  await expect(card.getByRole('alert')).toContainText('Insights could not be loaded');
  await expect(page.getByRole('article', { name: post.title })).toBeVisible();
  await page.getByLabel('Add a comment').fill('Keep my unsent draft');
  await testInfo.attach('insights-error.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.unroute(ownerPath);
  await card.getByRole('button', { name: 'Try again' }).focus();
  await page.keyboard.press('Enter');
  await expect(card.getByRole('button', { name: 'Refresh insights' })).toBeFocused();
  await expect(metric(card, 'Score')).toHaveText('0');
  await expect(page.getByLabel('Add a comment')).toHaveValue('Keep my unsent draft');
  // Change the persisted score from another session; one refresh updates both article and summary.
  const other = await reader();
  try {
    expect(
      (
        await other.context.post(`${gatewayURL}/api/forum/votes`, {
          headers: other.headers,
          data: { entityType: 'POST', entityId: post.id, voteType: 'UP' },
        })
      ).status()
    ).toBe(201);
    await card.getByRole('button', { name: 'Refresh insights' }).click();
    await expect(metric(card, 'Score')).toHaveText('1');
    await expect(
      page.getByRole('article', { name: post.title }).getByText('1', { exact: true })
    ).toBeVisible();
    await expect(page.getByLabel('Add a comment')).toHaveValue('Keep my unsent draft');
  } finally {
    await other.context.dispose();
  }
  expect(
    (
      await request.patch(`${gatewayURL}/api/forum/posts/${post.slug}`, {
        headers: post.headers,
        data: { status: 'DRAFT' },
      })
    ).status()
  ).toBe(200);
  await card.getByRole('button', { name: 'Refresh insights' }).click();
  await expect(card).toBeVisible();
  await expect(
    page.getByRole('article', { name: post.title }).getByText('draft', { exact: true })
  ).toBeVisible();
  await signOutThroughMenu(page);
  await page.goto(`/forum/${post.slug}`);
  await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
  await expect(page.getByRole('region', { name: /insights/ })).toHaveCount(0);
});
