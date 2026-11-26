// Controlled visual fixtures only. Real-stack API acceptance remains in tests/*.spec.ts.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const artifacts = path.join(root, '.workspace-artifacts/pwdrz-169-design');
await fs.mkdir(artifacts, { recursive: true });
const cases = [
  ['public-desktop-compact', '280', 672, 171],
  ['public-desktop-expanded', '337', 672, 233],
  ['public-loading', '418', 297, 293],
  ['public-zero', '463', 297, 378],
  ['public-error', '543', 297, 253],
  ['author-desktop-compact', '601', 672, 269],
  ['author-desktop-expanded', '700', 672, 631],
  ['author-table', '875', 672, 934.5],
  ['author-table-partial', '1099', 672, 1038.5],
  ['author-desktop-30', '1332', 672, 631],
  ['author-loading', '1555', 297, 309],
  ['author-zero', '1607', 297, 906],
  ['author-partial', '1782', 297, 951],
  ['author-error', '1965', 297, 269],
  ['public-mobile-compact', '2021', 360, 171],
  ['public-mobile-expanded', '2076', 360, 264],
  ['public-mobile-loading', '2149', 360, 293],
  ['public-mobile-zero', '2194', 360, 336],
  ['public-mobile-error', '2274', 360, 253],
  ['author-mobile-compact', '2325', 360, 406],
  ['author-mobile-expanded', '2426', 360, 824],
  ['author-mobile-30', '2595', 360, 824],
  ['author-mobile-partial', '2808', 360, 896],
  ['author-mobile-loading', '2992', 360, 309],
  ['author-mobile-zero', '3047', 360, 867],
  ['author-mobile-error', '3223', 360, 269],
];
const values = [12, 18, 16, 42, 19, 21, 14];
const values30 = [11, 16, 13, 18, 24, 20, 17, 28, 31, 25];
const summary = {
  postId: 5,
  viewCount: 1284,
  commentCount: 45,
  voteScore: 330,
  collectedFrom: '2026-11-08T00:00:00Z',
  upvoteCount: 342,
  downvoteCount: 12,
};
const browser = await chromium.launch();
const results = [];
try {
  for (const [name, node, width, expectedHeight] of cases) {
    const mobile = name.includes('mobile');
    const author = name.startsWith('author');
    const zero = name.includes('zero');
    const missing = name.includes('partial');
    const page = await browser.newPage({
      viewport: { width: mobile ? 402 : 1280, height: 1200 },
      deviceScaleFactor: 1,
    });
    page.on('pageerror', (error) => console.error(name, error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(message.text());
    });
    await page.clock.install({ time: new Date('2026-03-08T14:30:00Z') });
    await page.route(/^http:\/\/127\.0\.0\.1:3199\/api\//, async (route) => {
      if (name.includes('loading')) return; // Deliberately pending fixture, not a backend claim.
      if (name.includes('error'))
        return route.fulfill({ status: 500, json: { detail: 'internal text must not render' } });
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/openings')) {
        const period = url.searchParams.get('period') ?? '7d';
        const days =
          period === '30d'
            ? Array.from({ length: 30 }, (_, i) => ({
                date: new Date(Date.UTC(2026, 1, 7 + i)).toISOString().slice(0, 10),
                measured: true,
                openings: values30[i % 10],
              }))
            : values.map((value, i) => ({
                date: '2026-03-0' + (i + 2),
                measured: !missing || i > 2,
                openings:
                  missing && i < 3
                    ? null
                    : zero
                      ? 0
                      : missing
                        ? [0, 0, 0, 14, 0, 24, 14][i]
                        : value,
              }));
        return route.fulfill({
          json: {
            postId: 5,
            period,
            days,
            totalOpenings: days.reduce((n, d) => n + (d.openings ?? 0), 0),
            windowStart: days[0].date + 'T00:00:00Z',
            windowEnd: '2026-03-09T00:00:00Z',
            collectedFrom: summary.collectedFrom,
            generatedAt: '2026-03-08T14:30:00Z',
          },
        });
      }
      return route.fulfill({
        json: zero
          ? {
              ...summary,
              viewCount: 0,
              commentCount: 0,
              voteScore: 0,
              upvoteCount: 0,
              downvoteCount: 0,
            }
          : summary,
      });
    });
    await page.goto(
      'http://127.0.0.1:3199/src/test/insights-preview.html?audience=' +
        (author ? 'author' : 'public') +
        '&width=' +
        width
    );
    const card = page.locator('.post-insights');
    await card.waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (!name.includes('loading') && !name.includes('error')) {
      await card
        .getByRole('button', { name: mobile ? 'Details' : 'Expand', exact: true })
        .waitFor();
      if (!name.includes('compact'))
        await card
          .getByRole('button', { name: mobile ? 'Details' : 'Expand', exact: true })
          .click();
      if (name.endsWith('-30')) {
        await card.getByRole('radio', { name: '30 days' }).click();
        await card.getByRole('img', { name: /Last 30 days/ }).waitFor();
      }
      if (name.includes('table')) await card.getByRole('button', { name: 'Data table' }).click();
    }
    await card.screenshot({ path: path.join(artifacts, name + '.png') });
    const box = await card.boundingBox();
    const geometry = await card.evaluate((el) =>
      [
        ...el.querySelectorAll(
          'header,.insights-stats,.insights-compact,.insights-trend-heading,.insights-graph,.insights-table-wrap,.insights-privacy'
        ),
      ].map((e) => ({
        class: e.className,
        box: JSON.parse(JSON.stringify(e.getBoundingClientRect())),
      }))
    );
    results.push({
      name,
      node: '400:' + node,
      width,
      expectedHeight,
      actualHeight: box.height,
      heightDifference: box.height - expectedHeight,
      geometry,
      status: 'unreviewed',
    });
    await page.close();
  }
  for (const width of [1280, 768, 390, 320]) {
    for (const disabled of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', (error) =>
        console.error('page fixture', width, disabled, error.message)
      );
      let analyticsReads = 0;
      await page.route(/^http:\/\/127\.0\.0\.1:3199\/api\//, async (route) => {
        const url = new URL(route.request().url()).pathname;
        if (url.includes('/analytics/')) analyticsReads++;
        if (route.request().method() === 'POST') return route.fulfill({ status: 204 });
        if (url.endsWith('/comments'))
          return route.fulfill({
            json: {
              content: [],
              first: true,
              last: true,
              page: 0,
              size: 20,
              totalElements: 0,
              totalPages: 0,
            },
          });
        if (url.includes('/forum/posts/'))
          return route.fulfill({
            json: {
              id: 5,
              slug: 'visual-fixture',
              title: 'A readable post',
              content: 'The discussion follows the post. Analytics opens only when requested.',
              author: {
                id: 1,
                username: 'alice',
                displayName: 'Alice',
                avatarUrl: null,
                role: 'USER',
              },
              status: disabled ? 'DRAFT' : 'PUBLISHED',
              category: null,
              tags: [],
              createdAt: '2026-03-08T12:00:00Z',
              commentCount: 0,
              viewCount: 1284,
              voteScore: 330,
              myVote: null,
            },
          });
        return route.fulfill({ json: summary });
      });
      await page.goto(
        'http://127.0.0.1:3199/src/test/insights-preview.html?page=true&width=' +
          Math.min(width, 720) +
          '&audience=' +
          (disabled ? 'staff' : 'public')
      );
      await page.evaluate(() => document.fonts.ready);
      const toggle = page.getByRole('button', { name: 'Analytics', exact: true });
      try {
        await toggle.waitFor();
      } catch (error) {
        console.error(await page.locator('body').innerText());
        throw error;
      }
      if (analyticsReads !== 0) throw new Error('Analytics requested before activation');
      const prefix = 'page-' + width + (disabled ? '-disabled' : '-enabled');
      await page.screenshot({ path: path.join(artifacts, prefix + '-closed.png'), fullPage: true });
      await toggle.focus();
      await page.keyboard.press('Enter');
      if (disabled) {
        await page.getByRole('tooltip').waitFor();
        if (analyticsReads !== 0) throw new Error('Disabled trigger requested analytics');
        await page.screenshot({
          path: path.join(artifacts, prefix + '-explanation.png'),
          fullPage: true,
        });
        await page.keyboard.press('Escape');
      } else {
        await page.getByRole('region', { name: 'Post insights', exact: true }).waitFor();
        if (!(await toggle.evaluate((el) => el === document.activeElement)))
          throw new Error('Toggle lost focus');
        await page.screenshot({ path: path.join(artifacts, prefix + '-open.png'), fullPage: true });
        await toggle.click();
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        throw new Error('Page overflow at ' + width);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(artifacts, 'manifest.json'), JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results.map(({ name, heightDifference }) => ({ name, heightDifference })),
    null,
    2
  )
);
