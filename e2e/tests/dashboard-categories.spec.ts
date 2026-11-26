import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Locator } from '@playwright/test';
import type { PublicCategoryDistributionDto } from '../../frontend/src/shared/api/generated/models/publicCategoryDistributionDto.dto.js';
import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

/** Synthetic setup only, following the existing fixture convention. Never accepts a developer DB. */
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

const formatShare = (share: number | null) =>
  share === null
    ? 'Not applicable'
    : new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(share);

async function checkTable(card: Locator, data: PublicCategoryDistributionDto) {
  await expect(
    card.getByText(
      `${data.totalPosts.toLocaleString('en-US')} public ${data.totalPosts === 1 ? 'post' : 'posts'}`,
      { exact: true }
    )
  ).toBeVisible();
  const toggle = card.getByRole('button', { name: 'Category data table' });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.focus();
    await toggle.press('Enter');
  }
  const table = card.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('rowheader')).toHaveCount(data.categories.length);
  for (const item of data.categories) {
    const row = table
      .getByRole('rowheader', { name: item.category?.name ?? 'No category', exact: true })
      .locator('..');
    await expect(row.getByRole('cell').nth(0)).toHaveText(item.posts.toLocaleString('en-US'));
    await expect(row.getByRole('cell').nth(1)).toHaveText(formatShare(item.share));
  }
  await expect(card.getByRole('group', { name: /^Posts by category,/ })).toHaveAccessibleName(
    `Posts by category, Last ${data.period === '7d' ? '7' : '30'} days, UTC. ${data.categories.map((row) => `${row.category?.name ?? 'No category'}: ${row.posts}`).join(', ')}`
  );
  expect(data.categories.reduce((sum, row) => sum + row.posts, 0)).toBe(data.totalPosts);
}

test('category distribution matches real public totals for guests, both windows, themes and narrow screens', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const marker = randomUUID().replaceAll('-', '').slice(0, 12);
  const categorySlug = `category-${marker}`;
  const longName = `Category ${marker} `.padEnd(100, 'W');
  const requests: string[] = [];
  page.on('request', (call) => {
    if (call.url().includes('/api/analytics/'))
      requests.push(`${call.method()} ${new URL(call.url()).pathname}`);
  });
  // Eleven rows including uncategorized: prove the old eight-bar aggregation is gone.
  fixtureSql(`INSERT INTO categories(name,slug,display_order,is_visible) VALUES
    ('${longName}','${categorySlug}',900,true),
    ('Extra ${marker} A','extra-a-${marker}',901,true),
    ('Extra ${marker} B','extra-b-${marker}',902,true);`);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const categoryId = categories.find((category: { slug: string }) => category.slug === categorySlug)
    .id as number;
  const posts: number[] = [];
  try {
    for (const category of [categoryId, categoryId, categoryId, categories[0].id as number]) {
      const created = await request.post(`${gatewayURL}/api/forum/posts`, {
        headers,
        data: {
          title: `Category fixture ${marker} ${posts.length}`,
          content: 'Synthetic category distribution fixture.',
          categoryId: category,
        },
      });
      expect(created.status()).toBe(201);
      posts.push((await created.json()).id);
    }
    const draft = await request.post(`${gatewayURL}/api/forum/posts`, {
      headers,
      data: {
        title: `Private category fixture ${marker}`,
        content: 'An author draft must not contribute to the public distribution.',
        categoryId,
        draft: true,
      },
    });
    expect(draft.status()).toBe(201);
    posts.push((await draft.json()).id);
    expect(posts.every((id) => Number.isSafeInteger(id) && id > 0)).toBe(true);
    // Creation requires a category. Model a historical missing/deleted association in this fixture.
    fixtureSql(`UPDATE posts SET category_id=NULL WHERE id=${posts[1]};
      UPDATE categories SET is_visible=false WHERE id=${categoryId};`);
    // Same real post in 30d but not 7d; preserve API-owned content/status and bypass no authorization.
    fixtureSql(
      `UPDATE posts SET created_at = (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') - interval '10 days' WHERE id=${posts[2]};`
    );
    const openingBefore = fixtureSql(
      `SELECT view_count FROM posts WHERE id IN (${posts.join(',')}) ORDER BY id;`
    );
    let weekTotal = 0;
    for (const period of ['7d', '30d'] as const) {
      const url = `${gatewayURL}/api/analytics/public/categories?period=${period}`;
      const answered = page.waitForResponse(
        (response) => response.url() === url && response.request().method() === 'GET'
      );
      if (period === '7d') await page.goto('/dashboard');
      else await page.getByRole('button', { name: 'Last 30 days' }).click();
      const response = await answered;
      expect(response.status()).toBe(200);
      const data = (await response.json()) as PublicCategoryDistributionDto;
      const activity = await (
        await request.get(`${gatewayURL}/api/analytics/public/activity?period=${period}`)
      ).json();
      expect(data.totalPosts).toBe(activity.totalPosts);
      expect(data.categories.length).toBeGreaterThan(8);
      expect(data.categories.find((row) => row.category?.id === categoryId)?.posts).toBe(
        period === '7d' ? 1 : 2
      );
      expect(data.categories.at(-1)?.category).toBeNull();
      if (period === '7d') weekTotal = data.totalPosts;
      else expect(data.totalPosts).toBeGreaterThan(weekTotal);
      const card = page.getByRole('region', { name: 'Posts by category' });
      await checkTable(card, data);
      await testInfo.attach(`category-response-${period}.json`, {
        body: JSON.stringify(data, null, 2),
        contentType: 'application/json',
      });
      if (period === '7d') {
        await card.screenshot({
          path: testInfo.outputPath('categories-light-desktop.png'),
          style: 'header, nav { visibility: hidden !important; }',
        });
        for (const theme of ['light', 'dark']) {
          await page.evaluate(
            (value) => document.documentElement.setAttribute('data-theme', value),
            theme
          );
          for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            await expect(
              card.getByRole('rowheader', { name: longName, exact: true })
            ).toBeVisible();
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            ).toBe(true);
            const box = await card.boundingBox();
            expect(box!.x + box!.width).toBeLessThanOrEqual(width);
            await card.screenshot({
              path: testInfo.outputPath(`categories-${theme}-${width}.png`),
              // Component-only visual QA; layout/overflow assertions above use the actual shell.
              style: 'header, nav { visibility: hidden !important; }',
            });
          }
        }
        await page.setViewportSize({ width: 1280, height: 900 });
      }
    }
    await page.reload();
    const card = page.getByRole('region', { name: 'Posts by category' });
    // PWDRZ-185: reload retains the selected window and table disclosure.
    await expect(card.getByText('Last 30 days', { exact: true })).toBeVisible();
    await expect(card.getByRole('table')).toBeVisible();
    expect(requests).not.toContain('GET /api/analytics/me');
    expect(requests.every((entry) => entry.startsWith('GET '))).toBe(true);
    expect(
      fixtureSql(`SELECT view_count FROM posts WHERE id IN (${posts.join(',')}) ORDER BY id;`)
    ).toBe(openingBefore);
  } finally {
    if (posts.length) fixtureSql(`DELETE FROM posts WHERE id IN (${posts.join(',')});`);
    fixtureSql(
      `DELETE FROM categories WHERE slug IN ('${categorySlug}','extra-a-${marker}','extra-b-${marker}');`
    );
  }
});

test('category transport failures recover through keyboard retry with real server data', async ({
  page,
}) => {
  await page.goto('/dashboard');
  const card = page.getByRole('region', { name: 'Posts by category' });
  await expect(card.getByRole('group', { name: /^Posts by category,/ })).toBeVisible();
  try {
    // Abort transport only; never fulfil a request with a fabricated API response.
    await page.route('**/api/analytics/public/categories?period=30d', (route) =>
      route.abort('failed')
    );
    await page.getByRole('button', { name: 'Last 30 days' }).click();
    const alert = card.getByRole('alert');
    await expect(alert).toContainText('We could not load this. Please try again.');
    await expect(card.getByRole('group', { name: /^Posts by category,/ })).toHaveCount(0);
    await page.unroute('**/api/analytics/public/categories?period=30d');
    const retry = alert.getByRole('button', { name: 'Try again' });
    await retry.focus();
    await retry.press('Enter');
    await expect(card.getByRole('group', { name: /^Posts by category,/ })).toBeVisible();
    await expect(card.getByText('Last 30 days', { exact: true })).toBeVisible();
  } finally {
    await page.unroute('**/api/analytics/public/categories?period=30d');
  }
});

test('a real empty window shows zero counts and inapplicable shares, then restores synthetic history', async ({
  page,
  request,
}, testInfo) => {
  // All writes are restricted to synthetic accounts inside the launcher's disposable database.
  // Preserve timestamps because the full suite shares this owned database sequentially.
  const original = JSON.parse(
    fixtureSql(`SELECT coalesce(json_agg(json_build_object('id',p.id,'createdAt',p.created_at))::text,'[]')
    FROM posts p JOIN users u ON u.id=p.user_id
    WHERE starts_with(u.username,'e2e_') AND p.created_at >= (date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') - interval '29 days';`)
  ) as Array<{ id: number; createdAt: string }>;
  expect(
    original.every(
      (row) =>
        Number.isSafeInteger(row.id) && row.id > 0 && Number.isFinite(Date.parse(row.createdAt))
    )
  ).toBe(true);
  try {
    if (original.length)
      fixtureSql(
        `UPDATE posts SET created_at=now()-interval '90 days' WHERE id IN (${original.map((row) => row.id).join(',')});`
      );
    const response = await request.get(`${gatewayURL}/api/analytics/public/categories?period=7d`);
    expect(response.status()).toBe(200);
    const data = (await response.json()) as PublicCategoryDistributionDto;
    expect(data.totalPosts).toBe(0);
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.categories.every((row) => row.posts === 0 && row.share === null)).toBe(true);
    await page.goto('/dashboard');
    const card = page.getByRole('region', { name: 'Posts by category' });
    await expect(card.getByText('No public posts in this window yet.')).toBeVisible();
    await checkTable(card, data);
    await testInfo.attach('empty-category-response.json', {
      body: JSON.stringify(data, null, 2),
      contentType: 'application/json',
    });
  } finally {
    if (original.length)
      fixtureSql(
        `UPDATE posts p SET created_at=v.created_at FROM (VALUES ${original.map((row) => `(${row.id},'${new Date(row.createdAt).toISOString()}'::timestamptz)`).join(',')}) AS v(id,created_at) WHERE p.id=v.id;`
      );
  }
});
