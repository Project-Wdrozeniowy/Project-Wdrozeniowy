import { randomUUID } from 'node:crypto';
import type { Page, Response } from '@playwright/test';
import type { PublicActivityComparisonDto } from '../../frontend/src/shared/api/generated/models/publicActivityComparisonDto.dto.js';
import type { PublicActivityDto } from '../../frontend/src/shared/api/generated/models/publicActivityDto.dto.js';
import type { PublicCategoryDistributionDto } from '../../frontend/src/shared/api/generated/models/publicCategoryDistributionDto.dto.js';
import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

type Period = '7d' | '30d';
const PUBLIC = `${gatewayURL}/api/analytics/public`;
const publicUrl = (endpoint: string, period: Period) => `${PUBLIC}/${endpoint}?period=${period}`;

const answerOf = (page: Page, endpoint: string, period: Period) =>
  page.waitForResponse(
    (response) =>
      response.url() === publicUrl(endpoint, period) && response.request().method() === 'GET'
  );

/** The three public answers the dashboard asks for one window, read from the browser's own calls. */
async function answersOf(responses: Response[]) {
  const [activity, comparison, categories] = await Promise.all(
    responses.map((response) => response.json())
  );
  return {
    activity: activity as PublicActivityDto,
    comparison: comparison as PublicActivityComparisonDto,
    categories: categories as PublicCategoryDistributionDto,
    bodies: await Promise.all(responses.map((response) => response.text())),
  };
}

// A guest has no session: the dashboard is the public analytics, and nothing else.
test('a guest opens the dashboard directly and after a reload, and sees what the public API counts', async ({
  page,
  request,
  account,
}, testInfo) => {
  // Real activity of an account: a public post with a comment, and a draft that must stay private.
  const marker = randomUUID().replaceAll('-', '').slice(0, 12);
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  for (const [title, draft] of [
    [`Guest dashboard ${marker}`, false],
    [`Private draft ${marker}`, true],
  ] as const) {
    const created = await request.post(`${gatewayURL}/api/forum/posts`, {
      headers,
      data: {
        title,
        content: 'Counted by the guest dashboard.',
        categoryId: categories[0].id,
        draft,
      },
    });
    expect(created.status()).toBe(201);
    if (!draft) {
      const { slug } = await created.json();
      const comment = await request.post(`${gatewayURL}/api/forum/posts/${slug}/comments`, {
        headers,
        data: { content: 'A comment the guest dashboard counts.' },
      });
      expect(comment.status()).toBe(201);
    }
  }

  const calls: string[] = [];
  page.on('request', (call) => {
    if (call.url().includes('/api/'))
      calls.push(`${call.method()} ${new URL(call.url()).pathname}`);
  });

  const figures = page.getByRole('region', { name: 'Key figures' });
  const chart = page.getByRole('region', { name: 'Posts and comments by day' });
  const categoryCard = page.getByRole('region', { name: 'Posts by category' });

  async function checkWindow(period: Period, responses: Response[], label: string) {
    const { activity, comparison, categories: byCategory, bodies } = await answersOf(responses);
    await testInfo.attach(`${period}-activity.json`, {
      body: JSON.stringify(activity, null, 2),
      contentType: 'application/json',
    });

    // The control data: the same operations, asked outside the page. Nothing else is counting.
    const control = (await (
      await request.get(publicUrl('activity', period))
    ).json()) as PublicActivityDto;
    expect(control.totalPosts).toBe(activity.totalPosts);
    expect(control.totalComments).toBe(activity.totalComments);
    expect(activity.totalPosts).toBeGreaterThanOrEqual(1);
    expect(activity.totalComments).toBeGreaterThanOrEqual(1);

    // One total for the window everywhere it appears.
    expect(comparison.posts.current).toBe(activity.totalPosts);
    expect(comparison.comments.current).toBe(activity.totalComments);
    expect(byCategory.totalPosts).toBe(activity.totalPosts);
    await expect(figures).toContainText(label);
    // The figure itself, not any text that happens to contain the digits.
    await expect(
      figures.getByText(activity.totalPosts.toLocaleString('en-US'), { exact: true }).first()
    ).toBeVisible();
    await expect(
      figures.getByText(activity.totalComments.toLocaleString('en-US'), { exact: true }).first()
    ).toBeVisible();
    await expect(chart).toContainText(
      `${activity.totalPosts.toLocaleString('en-US')} public ${activity.totalPosts === 1 ? 'post' : 'posts'} and ${activity.totalComments.toLocaleString('en-US')} ${activity.totalComments === 1 ? 'comment' : 'comments'} in this window`
    );
    await expect(categoryCard).toContainText(
      `${activity.totalPosts.toLocaleString('en-US')} public ${activity.totalPosts === 1 ? 'post' : 'posts'}`
    );

    // The window and the read time are the response's, in UTC, and nothing says it is live.
    await expect(chart.locator('time[datetime]', { hasText: 'UTC' })).toHaveAttribute(
      'datetime',
      activity.generatedAt
    );
    await expect(chart).toContainText('(end exclusive), UTC');
    await expect(chart).toContainText('Counts for today may grow.');
    await expect(figures).toContainText('Counts for today may grow.');
    // The page's own words (the top posts list holds other people's titles).
    for (const region of [figures, chart, categoryCard]) {
      await expect(region).not.toContainText(/real-time|realtime|\blive\b/i);
    }

    // One bar per day of the window, as in the design.
    await expect(chart.locator('rect[data-point="measured"]')).toHaveCount(activity.days.length);

    // The table lists the response's days and adds up to the same total.
    const toggle = chart.getByRole('button', { name: 'Data table' });
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    const table = chart.getByRole('table');
    await expect(table.getByRole('row')).toHaveCount(activity.days.length + 1);
    const posts = await table.locator('tbody td').allTextContents();
    expect(posts.map(Number).reduce((sum, value) => sum + value, 0)).toBe(activity.totalPosts);
    await chart.getByRole('radio', { name: 'Posts' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(chart.getByRole('radio', { name: 'Comments' })).toBeChecked();
    await expect(table.getByRole('columnheader', { name: 'Comments' })).toBeVisible();
    const comments = await table.locator('tbody td').allTextContents();
    expect(comments.map(Number).reduce((sum, value) => sum + value, 0)).toBe(
      activity.totalComments
    );
    await chart.getByRole('radio', { name: 'Comments' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(chart.getByRole('radio', { name: 'Posts' })).toBeChecked();

    // Public data only: no draft, no reader or author identity.
    for (const body of bodies) {
      expect(body).not.toContain(marker);
      expect(body).not.toContain(account.username);
      expect(body).not.toContain(account.email);
    }
    return activity;
  }

  // Direct entry: no sign-in, no redirect.
  let answered = [
    answerOf(page, 'activity', '7d'),
    answerOf(page, 'comparison', '7d'),
    answerOf(page, 'categories', '7d'),
  ];
  await page.goto('/dashboard');
  expect(new URL(page.url()).pathname).toBe('/dashboard');
  await expect(page.getByRole('heading', { name: 'Analytics Dashboard', level: 1 })).toBeVisible();
  const week = await checkWindow('7d', await Promise.all(answered), 'Last 7 days');

  // The longer notes fit narrow screens, in both themes: nothing pushes the page sideways.
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme
    );
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`dashboard-guest-${theme}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  // A reload is the same page, again for a guest and again with the week.
  answered = [
    answerOf(page, 'activity', '7d'),
    answerOf(page, 'comparison', '7d'),
    answerOf(page, 'categories', '7d'),
  ];
  await page.reload();
  expect(new URL(page.url()).pathname).toBe('/dashboard');
  expect(new URL(page.url()).searchParams.get('activityTable')).toBe('1');
  expect(new URL(page.url()).searchParams.get('metric')).toBe('posts');
  const reloaded = await checkWindow('7d', await Promise.all(answered), 'Last 7 days');
  expect(reloaded.totalPosts).toBe(week.totalPosts);

  // The 30 day window is chosen with the keyboard and asked from the API.
  answered = [
    answerOf(page, 'activity', '30d'),
    answerOf(page, 'comparison', '30d'),
    answerOf(page, 'categories', '30d'),
  ];
  const month = page.getByRole('button', { name: 'Last 30 days' });
  await month.focus();
  await page.keyboard.press('Enter');
  await expect(month).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  const longWindow = await checkWindow('30d', await Promise.all(answered), 'Last 30 days');
  expect(longWindow.totalPosts).toBeGreaterThanOrEqual(week.totalPosts);
  expect(longWindow.days).toHaveLength(30);

  // A guest asked for the public figures only, with reads only.
  expect(calls).not.toContain('GET /api/analytics/me');
  expect(calls.filter((entry) => entry.startsWith('GET /api/analytics/'))).toEqual(
    expect.arrayContaining([
      'GET /api/analytics/public/activity',
      'GET /api/analytics/public/comparison',
      'GET /api/analytics/public/categories',
    ])
  );
  expect(calls.some((entry) => !entry.startsWith('GET '))).toBe(false);
});

test('a failing analytics backend shows fixed failure states and never a success figure', async ({
  page,
}) => {
  const fail = (endpoint: string) =>
    page.route(`${PUBLIC}/${endpoint}?*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 500, detail: 'PSQLException secret-host:5432' }),
      })
    );
  await fail('activity');
  await fail('comparison');

  await page.goto('/dashboard');
  const figures = page.getByRole('region', { name: 'Key figures' });
  const chart = page.getByRole('region', { name: 'Posts and comments by day' });

  // No number, no graph and no server text: fixed words, an alert and a way to retry.
  await expect(figures.getByText('Not available')).toHaveCount(2);
  await expect(figures.getByText(/^\d[\d,]*$/)).toHaveCount(0);
  await expect(chart.getByRole('alert')).toContainText('We could not load this. Please try again.');
  await expect(chart.getByRole('group', { name: /^Posts per day,/ })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PSQLException');
  await expect(page.locator('body')).not.toContainText('secret-host');

  // The category card is a separate source: it still answers.
  await expect(page.getByRole('region', { name: 'Posts by category' })).toContainText(
    /public posts?/
  );

  // Once the backend answers again, Retry shows the real chart.
  await page.unroute(`${PUBLIC}/activity?*`);
  const answered = answerOf(page, 'activity', '7d');
  await chart.getByRole('button', { name: 'Try again' }).click();
  expect((await answered).status()).toBe(200);
  await expect(chart.getByRole('group', { name: /^Posts per day,/ })).toBeVisible();
  await expect(chart.getByRole('alert')).toHaveCount(0);
});
