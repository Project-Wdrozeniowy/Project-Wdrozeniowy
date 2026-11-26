import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

type Period = '7d' | '30d';
interface Ranked {
  id: number;
  slug: string;
  title: string;
}

const trendingURL = (period: Period, limit = 5) =>
  `${gatewayURL}/api/analytics/trending-posts?period=${period}&limit=${limit}`;

const trendingAnswer = (page: Page, period: Period) =>
  page.waitForResponse(
    (response) => response.url() === trendingURL(period) && response.request().method() === 'GET'
  );

const ranked = async (request: APIRequestContext, period: Period, limit = 5) =>
  (await (await request.get(trendingURL(period, limit))).json()) as Ranked[];

// PWDRZ-175: the dashboard lists the posts the platform ranks as most active, and says how. What is
// listed is compared with the API's own answer for the same window, since other specs leave their
// own activity in the shared database.
test('a guest sees the ranked posts of each window, reads how they are ranked and opens one by keyboard', async ({
  page,
  request,
  account,
}, testInfo) => {
  const marker = randomUUID().replaceAll('-', '').slice(0, 12);
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const publish = async (title: string, draft = false) => {
    const created = await request.post(`${gatewayURL}/api/forum/posts`, {
      headers,
      data: {
        title,
        content: 'A post whose activity is ranked.',
        categoryId: categories[0].id,
        draft,
      },
    });
    expect(created.status()).toBe(201);
    return (await created.json()) as Ranked;
  };
  // Enough comments (3 points each) to rank. A draft cannot take comments, so it has no activity.
  const busy = await publish(`Busy ${marker}`);
  const draft = await publish(`Private draft ${marker}`, true);
  for (let index = 0; index < 12; index++) {
    const comment = await request.post(`${gatewayURL}/api/forum/posts/${busy.slug}/comments`, {
      headers,
      data: { content: `Activity ${index}` },
    });
    expect(comment.status()).toBe(201);
  }
  const week = await ranked(request, '7d');
  expect(week.map((post) => post.slug)).toContain(busy.slug);
  expect(week.map((post) => post.slug)).not.toContain(draft.slug);
  await testInfo.attach('trending-7d.json', {
    body: JSON.stringify(week, null, 2),
    contentType: 'application/json',
  });

  const requests: string[] = [];
  page.on('request', (call) => {
    if (call.url().includes('/api/analytics/')) {
      requests.push(`${call.method()} ${new URL(call.url()).pathname}`);
    }
  });
  const card = page.getByRole('region', { name: 'Most active posts' });
  const list = card.getByRole('list', { name: /ranked/ });

  // Direct entry as a guest: the API's list, in the API's order, each title a link to its slug.
  const answered = trendingAnswer(page, '7d');
  await page.goto('/dashboard');
  expect((await answered).status()).toBe(200);
  const titles = list.getByRole('link');
  await expect(titles).toHaveCount(week.length);
  for (const [index, post] of week.entries()) {
    await expect(titles.nth(index)).toHaveText(post.title);
    await expect(titles.nth(index)).toHaveAttribute(
      'href',
      `/forum/${encodeURIComponent(post.slug)}`
    );
  }
  await expect(card).not.toContainText(draft.title);

  // It leads the page, under the window choice.
  const topOfCard = (await card.boundingBox())!.y;
  const topOfFigures = (await page.getByRole('region', { name: 'Key figures' }).boundingBox())!.y;
  expect(topOfCard).toBeLessThan(topOfFigures);

  // The formula, the span and the ties, from the contract, in words.
  await expect(card).toContainText(
    'Ranked by openings + 2 × votes + 3 × comments, counted over the 7 days (168 hours) before now.'
  );
  const summary = card.getByText('How posts are ranked');
  await summary.focus();
  await page.keyboard.press('Enter');
  const rules = card.locator('details');
  await expect(rules).toHaveAttribute('open', '');
  await expect(rules).toContainText('then the more recent activity, then the newer post');
  await expect(rules).toContainText('not whole UTC days');
  await expect(rules).toContainText('fewer than 5');
  await page.keyboard.press('Enter');
  await expect(rules).not.toHaveAttribute('open', '');

  // The other window is asked from the API and shown, by keyboard.
  const monthAnswer = trendingAnswer(page, '30d');
  const month = page.getByRole('button', { name: 'Last 30 days' });
  await month.focus();
  await page.keyboard.press('Enter');
  expect((await monthAnswer).status()).toBe(200);
  const monthRanked = await ranked(request, '30d');
  await expect(card).toContainText('30 days (720 hours)');
  await expect(titles).toHaveCount(monthRanked.length);
  for (const [index, post] of monthRanked.entries()) {
    await expect(titles.nth(index)).toHaveText(post.title);
  }

  // A title is reached with Tab and opened with Enter, and it opens its own post.
  const first = monthRanked[0];
  await titles.first().focus();
  await expect(titles.first()).toBeFocused();
  const opened = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === `/api/forum/posts/${first.slug}/openings`
  );
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/forum/${first.slug}$`));
  await expect(page.getByRole('heading', { level: 1, name: first.title })).toBeVisible();
  expect((await opened).status()).toBe(204);

  // Only the public trending endpoint was used for this card, and nothing was written but openings.
  expect(requests).not.toContain('GET /api/analytics/me');
});

test('the ranked list fits narrow screens, and a long title wraps', async ({
  page,
  request,
  account,
}, testInfo) => {
  const marker = randomUUID().replaceAll('-', '').slice(0, 12);
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Long ${marker} `.padEnd(110, 'W'),
      content: 'A post with a long title.',
      categoryId: categories[0].id,
    },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();
  for (let index = 0; index < 14; index++) {
    expect(
      (
        await request.post(`${gatewayURL}/api/forum/posts/${slug}/comments`, {
          headers,
          data: { content: `Activity ${index}` },
        })
      ).status()
    ).toBeLessThan(300);
  }

  await page.goto('/dashboard');
  const card = page.getByRole('region', { name: 'Most active posts' });
  const link = card.getByRole('link', { name: new RegExp(`Long ${marker}`) });
  await expect(link).toBeVisible();

  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme
    );
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      const box = (await link.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await card.screenshot({
        path: testInfo.outputPath(`top-posts-${theme}-${width}.png`),
        style: 'header, nav { visibility: hidden !important; }',
      });
    }
  }
});

test('an empty window and a failing endpoint show no post', async ({ page }) => {
  const card = page.getByRole('region', { name: 'Most active posts' });
  const trending = '**/api/analytics/trending-posts?*';

  await page.route(trending, (route) => route.fulfill({ status: 200, json: [] }));
  await page.goto('/dashboard');
  await expect(card.getByText('No post has had activity in this window yet.')).toBeVisible();
  await expect(card.getByRole('link')).toHaveCount(0);

  await page.unroute(trending);
  await page.route(trending, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ status: 500, detail: 'PSQLException secret-host:5432' }),
    })
  );
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await expect(card.getByRole('alert')).toContainText('We could not load this. Please try again.');
  await expect(card.getByRole('link')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PSQLException');

  // Once the backend answers again, Retry shows the real list.
  await page.unroute(trending);
  const answered = page.waitForResponse(
    (response) =>
      response.url().includes('/api/analytics/trending-posts') &&
      response.request().method() === 'GET'
  );
  await card.getByRole('button', { name: 'Try again' }).click();
  expect((await answered).status()).toBe(200);
  await expect(card.getByRole('alert')).toHaveCount(0);
});
