import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import type { PublicActivityDto } from '../../frontend/src/shared/api/generated/models/publicActivityDto.dto.js';
import type { PublicCategoryDistributionDto } from '../../frontend/src/shared/api/generated/models/publicCategoryDistributionDto.dto.js';
import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

/** Historical/uncategorized fixtures only inside the launcher's disposable migrated database. */
function fixtureSql(sql: string) {
  const project = process.env.E2E_PROJECT ?? '';
  if (!/^orbita-e2e-\d+-[a-f0-9]+$/.test(project)) throw new Error('Not an owned E2E database');
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
    { input: sql, encoding: 'utf8', timeout: 10_000, windowsHide: true }
  );
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

const feedResponse = (page: Page) =>
  page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/forum/posts' &&
      response.request().method() === 'GET'
  );

test('analytics drill-down preserves exact windows, pagination, reload, Back and current visibility', async ({
  page,
  request,
  account,
}, testInfo) => {
  test.setTimeout(90_000);
  const headers = await apiSignIn(request, account);
  const marker = randomUUID().replaceAll('-', '').slice(0, 12);
  const name = `Drill-down ${marker}`;
  const categoryId = Number(
    fixtureSql(`INSERT INTO categories(name,slug,display_order,is_visible)
    VALUES ('${name}','drill-${marker}',950,true) RETURNING id;`).split('\n')[0]
  );
  expect(Number.isSafeInteger(categoryId) && categoryId > 0).toBe(true);
  const ids: number[] = [];
  const slugs: string[] = [];
  const calls: string[] = [];
  page.on('request', (call) => {
    if (call.url().includes('/api/'))
      calls.push(`${call.method()} ${new URL(call.url()).pathname}`);
  });
  const day = fixtureSql("SELECT to_char((now() AT TIME ZONE 'UTC')::date - 2,'YYYY-MM-DD');");
  const next = fixtureSql("SELECT to_char((now() AT TIME ZONE 'UTC')::date - 1,'YYYY-MM-DD');");
  try {
    for (let i = 0; i < 19; i++) {
      const response = await request.post(`${gatewayURL}/api/forum/posts`, {
        headers,
        data: {
          title: `Drill ${marker} ${i}`,
          content: 'Synthetic publication drill-down fixture.',
          categoryId,
          draft: i === 15,
        },
      });
      expect(response.status()).toBe(201);
      const post = await response.json();
      ids.push(post.id);
      slugs.push(post.slug);
    }
    expect(ids.every((id) => Number.isSafeInteger(id) && id > 0)).toBe(true);
    fixtureSql(`UPDATE posts SET created_at='${day}T12:00:00Z' WHERE id IN (${ids});
      UPDATE posts SET created_at='${day}T00:00:00Z' WHERE id=${ids[0]};
      UPDATE posts SET created_at='${next}T00:00:00Z'::timestamptz - interval '1 microsecond' WHERE id=${ids[11]};
      UPDATE posts SET created_at=(date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') - interval '10 days' WHERE id=${ids[12]};
      UPDATE posts SET created_at='${day}T00:00:00Z'::timestamptz - interval '1 microsecond' WHERE id=${ids[13]};
      UPDATE posts SET created_at='${next}T00:00:00Z' WHERE id=${ids[14]};
      UPDATE posts SET status='DELETED' WHERE id=${ids[16]};
      UPDATE posts SET category_id=NULL WHERE id=${ids[17]};
      UPDATE posts SET status='LOCKED' WHERE id=${ids[18]};
      UPDATE categories SET is_visible=false WHERE id=${categoryId};`);
    const openingBefore = fixtureSql(
      `SELECT view_count FROM posts WHERE id IN (${ids}) ORDER BY id;`
    );
    await page.goto('/dashboard?period=30d&metric=posts&activityTable=1&categoryTable=1');
    const chart = page.getByRole('region', { name: 'Posts and comments by day' });
    const categoryCard = page.getByRole('region', { name: 'Posts by category' });
    const table = categoryCard.getByRole('table');
    const categoryLink = table.getByRole('link', { name: new RegExp(`Open 16 posts in ${name}`) });
    await expect(categoryLink).toBeVisible();
    const distribution = (await (
      await request.get(`${gatewayURL}/api/analytics/public/categories?period=30d`)
    ).json()) as PublicCategoryDistributionDto;
    const activity = (await (
      await request.get(`${gatewayURL}/api/analytics/public/activity?period=30d`)
    ).json()) as PublicActivityDto;
    expect(distribution.categories.find((row) => row.category?.id === categoryId)?.posts).toBe(16);
    await categoryLink.scrollIntoViewIfNeeded();
    await categoryLink.focus();
    const sourceY = await page.evaluate(() => window.scrollY);
    await testInfo.attach('scroll-departure.json', {
      body: JSON.stringify(
        await page.evaluate(() => ({
          y: scrollY,
          key: history.state?.key,
          positions: sessionStorage.getItem('orbita.dashboard.positions'),
        }))
      ),
      contentType: 'application/json',
    });
    const dashboardUrl = page.url();
    let answered = feedResponse(page);
    await categoryLink.press('Enter');
    let response = await answered;
    let body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.totalElements).toBe(16);
    expect(
      body.content.every((post: { category: { id: number } }) => post.category.id === categoryId)
    ).toBe(true);
    const selection = new URL(page.url()).searchParams;
    expect(selection.get('createdFrom')).toBe(distribution.windowStart);
    expect(selection.get('createdTo')).toBe(distribution.windowEnd);
    expect(selection.get('categoryId')).toBe(String(categoryId));
    expect(selection.get('categoryName')).toBe(name);
    await expect(page.getByRole('region', { name: 'Publication filters' })).toContainText(name);
    const firstIds = body.content.map((post: { id: number }) => post.id);
    answered = feedResponse(page);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    body = await (await answered).json();
    expect(body.page).toBe(1);
    expect(body.content).toHaveLength(6);
    expect(body.content.some((post: { id: number }) => firstIds.includes(post.id))).toBe(false);
    expect(new URL(page.url()).searchParams.get('createdFrom')).toBe(distribution.windowStart);
    answered = feedResponse(page);
    await page.reload();
    expect((await (await answered).json()).page).toBe(1);
    const shared = await page.context().newPage();
    try {
      answered = feedResponse(shared);
      await shared.goto(page.url());
      expect((await (await answered).json()).totalElements).toBe(16);
      await expect(shared.getByText('Page 2 of 2')).toBeVisible();
    } finally {
      await shared.close();
    }
    await page.goBack(); // first page of the same selection
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(dashboardUrl);
    await expect(table).toBeVisible();
    await expect(chart.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await testInfo.attach('scroll-return.json', {
      body: JSON.stringify(
        await page.evaluate(() => ({
          y: scrollY,
          key: history.state?.key,
          positions: sessionStorage.getItem('orbita.dashboard.positions'),
        }))
      ),
      contentType: 'application/json',
    });
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - sourceY))
      .toBeLessThan(8);

    // Daily graph and semantic table encode the same UTC bounds, including both edges.
    const dayLabel = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const dayLinks = chart.getByRole('link', { name: new RegExp(` on ${dayLabel}, UTC$`) });
    await expect(dayLinks).toHaveCount(2);
    expect(await dayLinks.nth(0).getAttribute('href')).toBe(
      await dayLinks.nth(1).getAttribute('href')
    );
    answered = feedResponse(page);
    await dayLinks.nth(0).focus();
    await dayLinks.nth(0).press('Enter');
    body = await (await answered).json();
    expect(body.totalElements).toBe(activity.days.find((row) => row.date === day)!.posts);
    expect(new URL(page.url()).searchParams.get('createdTo')).toBe(`${next}T00:00:00Z`);
    const exact = await request.get(
      `${gatewayURL}/api/forum/posts?${new URLSearchParams({ createdFrom: `${day}T00:00:00Z`, createdTo: `${next}T00:00:00Z`, categoryId: String(categoryId), size: '100' })}`
    );
    const daily = await exact.json();
    expect(daily.totalElements).toBe(13);
    expect(
      daily.content.map((post: { id: number }) => post.id).sort((a: number, b: number) => a - b)
    ).toEqual([...ids.slice(0, 12), ids[18]].sort((a, b) => a - b));
    await page.goBack();

    // Current visibility is applied at read time; the page explains why the old count can differ.
    const removed = await request.delete(`${gatewayURL}/api/forum/posts/${slugs[1]}`, { headers });
    expect(removed.status()).toBe(204);
    answered = feedResponse(page);
    await table.getByRole('link', { name: new RegExp(` in ${name},`) }).click();
    body = await (await answered).json();
    expect(body.totalElements).toBe(15);
    const afterDeletion = body.totalElements;
    await expect(page.getByRole('region', { name: 'Publication filters' })).toContainText(
      'currently public'
    );
    await page.goBack();
    const uncategorized = table.getByRole('link', { name: / in No category,/ });
    answered = feedResponse(page);
    await uncategorized.click();
    body = await (await answered).json();
    expect(body.content.every((post: { category: unknown }) => post.category === null)).toBe(true);
    expect(new URL(page.url()).searchParams.get('uncategorized')).toBe('true');
    expect(body.totalElements).toBe(
      distribution.categories.find((row) => row.category === null)!.posts
    );
    expect(calls).not.toContain('GET /api/analytics/me');
    expect(calls.every((call) => call.startsWith('GET '))).toBe(true);
    expect(fixtureSql(`SELECT view_count FROM posts WHERE id IN (${ids}) ORDER BY id;`)).toBe(
      openingBefore
    );
    await testInfo.attach('control.json', {
      body: JSON.stringify({
        day,
        next,
        categoryId,
        expectedMonth: 16,
        observedMonth: 16,
        expectedDay: 13,
        observedDay: daily.totalElements,
        afterDeletion,
        distribution,
        activity,
      }),
      contentType: 'application/json',
    });
  } finally {
    if (ids.length) fixtureSql(`DELETE FROM posts WHERE id IN (${ids});`);
    fixtureSql(`DELETE FROM categories WHERE id=${categoryId};`);
  }
});

test('analytics drill-down handles zero, invalid links, real transport retry and narrow layouts', async ({
  page,
}, testInfo) => {
  const marker = randomUUID().replaceAll('-', '').slice(0, 12);
  const name = `Quiet ${marker}`;
  const categoryId = Number(
    fixtureSql(
      `INSERT INTO categories(name,slug,display_order,is_visible) VALUES ('${name}','quiet-${marker}',951,true) RETURNING id;`
    ).split('\n')[0]
  );
  try {
    await page.goto('/dashboard?categoryTable=1&activityTable=1&period=30d');
    const card = page.getByRole('region', { name: 'Posts by category' });
    const graph = card.getByRole('group', { name: /^Posts by category,/ });
    const zero = graph.getByRole('link', { name: `Open 0 posts in ${name}, Last 30 days, UTC` });
    await expect(zero).toBeVisible();
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => {
        document.documentElement.setAttribute('data-theme', value);
      }, theme);
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 850 });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true);
        const dayGraph = page.getByRole('group', { name: /^Posts per day,/ });
        const link = dayGraph.getByRole('link').last();
        await link.focus();
        const rect = await link.locator('rect').boundingBox();
        expect(rect!.width).toBeGreaterThanOrEqual(23.9);
        expect(rect!.height).toBeGreaterThanOrEqual(24);
        await expect(card.getByRole('table')).toBeVisible();
        await card.screenshot({
          path: testInfo.outputPath(`drilldown-${theme}-${width}.png`),
          style: 'header, nav { visibility: hidden !important; }',
        });
      }
    }
    await zero.focus();
    let answered = feedResponse(page);
    await zero.press('Enter');
    expect((await (await answered).json()).totalElements).toBe(0);
    await expect(page.getByText('No public posts match these filters.')).toBeVisible();
    await page.setViewportSize({ width: 320, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({ path: testInfo.outputPath('filtered-forum-320.png'), fullPage: true });
    const selectedUrl = page.url();
    await page.route('**/api/forum/posts?*', (route) => route.abort('failed'));
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Publication filters' })).toContainText(name);
    await page.unroute('**/api/forum/posts?*');
    answered = feedResponse(page);
    await page.getByRole('button', { name: 'Try again' }).focus();
    await page.keyboard.press('Enter');
    expect((await answered).status()).toBe(200);
    await expect(page.getByText('No public posts match these filters.')).toBeVisible();
    answered = feedResponse(page);
    await page.getByRole('link', { name: 'Clear category' }).click();
    expect((await answered).status()).toBe(200);
    expect(new URL(page.url()).searchParams.has('categoryId')).toBe(false);
    expect(new URL(page.url()).searchParams.has('createdFrom')).toBe(true);
    const requests: string[] = [];
    page.on('request', (call) => {
      if (new URL(call.url()).pathname === '/api/forum/posts') requests.push(call.url());
    });
    await page.goto('/forum?createdFrom=2020-02-30T00:00:00Z&categoryId=42&uncategorized=true');
    await expect(page.getByRole('alert')).toContainText('This publication filter is invalid');
    expect(requests).toHaveLength(0);
    expect(new URL(selectedUrl).searchParams.get('categoryId')).toBe(String(categoryId));
    await page.getByRole('link', { name: 'Clear publication filters' }).click();
    await expect(page).toHaveURL(/\/forum$/);
  } finally {
    fixtureSql(`DELETE FROM categories WHERE id=${categoryId};`);
  }
});
