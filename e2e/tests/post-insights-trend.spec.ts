import { randomUUID } from 'node:crypto';
import { request as apiRequest } from '@playwright/test';
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

type Day = { date: string; measured: boolean; openings: number | null };
type Trend = { postId: number; period: string; collectedFrom: string; days: Day[] };

// PWDRZ-171: the author's daily openings inside the post insights card, against the real stack.
// On a fresh stack collection started today: earlier days are "not measured" (no value), and the
// current day is partial. The table must list exactly what the owner-only endpoint answers.
test('the author reads the daily openings of a post, and nobody else sees them', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Trend ${account.username}`,
      content: 'A post whose daily openings its author inspects.',
      categoryId: categories[0].id,
    },
  });
  expect(created.status()).toBe(201);
  const { id, slug } = (await created.json()) as { id: number; slug: string };
  const trendPath = `/api/analytics/me/posts/${id}/openings`;
  const trendURL = `${gatewayURL}${trendPath}`;

  // Two different openings by the author (one repeated, which counts once) and one by a guest.
  const first = randomUUID();
  for (const openingId of [first, first, randomUUID()]) {
    const opened = await request.post(`${gatewayURL}/api/forum/posts/${slug}/openings`, {
      headers,
      data: { openingId },
    });
    expect(opened.status()).toBe(204);
  }
  const guest = await apiRequest.newContext();
  const username = `e2e_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
  const outsider: Identity = {
    username,
    email: `${username}@example.test`,
    password: 'E2ePassword123!',
  };
  try {
    expect(
      (
        await guest.post(`${gatewayURL}/api/forum/posts/${slug}/openings`, {
          headers: await csrfHeaders(guest),
          data: { openingId: randomUUID() },
        })
      ).status()
    ).toBe(204);
    expect(
      (
        await guest.post(`${gatewayURL}/api/auth/register`, {
          headers: await csrfHeaders(guest),
          data: outsider,
        })
      ).status()
    ).toBe(201);

    await signIn(page, account);
    const trendRequests: string[] = [];
    page.on('request', (call) => {
      if (call.url().startsWith(trendURL)) trendRequests.push(call.url());
    });
    const firstRead = page.waitForResponse(
      (r) => r.url() === `${trendURL}?period=7d` && r.request().method() === 'GET'
    );
    // The author's own visit records its opening (PWDRZ-166), a third one for today.
    const recorded = page.waitForResponse(
      (r) =>
        r.url() === `${gatewayURL}/api/forum/posts/${slug}/openings` &&
        r.request().method() === 'POST'
    );
    await page.goto(`/forum/${slug}`);
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    expect((await firstRead).status()).toBe(200);
    expect((await recorded).status()).toBe(204);
    const card = page.getByRole('region', { name: 'Author insights' });
    const trendSection = card.getByRole('region', { name: 'Daily openings' });
    await expect(trendSection).toHaveCount(0);
    // The first read may have come before that opening was counted: read the chart again, so the
    // table below shows what the API answers now.
    const reread = page.waitForResponse(
      (r) => r.url() === `${trendURL}?period=7d` && r.request().method() === 'GET'
    );
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    await card.getByRole('button', { name: 'Expand', exact: true }).click();
    expect((await reread).status()).toBe(200);

    // The table lists exactly the days the API answers: a measured zero as 0, a day before
    // collection as "Not measured", the current day marked partial.
    const answer = (await (await request.get(`${trendURL}?period=7d`)).json()) as Trend;
    expect(answer.days).toHaveLength(7);
    expect(answer.days.some((day) => !day.measured)).toBe(true);
    await trendSection.getByRole('button', { name: 'Data table' }).click();
    const rows = trendSection.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(8);
    for (const [index, day] of answer.days.entries()) {
      const row = rows.nth(index + 1);
      await expect(row.getByRole('cell')).toHaveText(
        day.measured ? String(day.openings) : 'Not measured'
      );
    }
    await expect(rows.last().getByRole('rowheader')).toContainText('(today, partial)');
    await expect(trendSection.getByText(/Openings were not collected before/)).toBeVisible();
    await expect(trendSection.getByText(/Those days are not zero/)).toBeVisible();
    await testInfo.attach('trend-7d-desktop.png', {
      body: await card.screenshot(),
      contentType: 'image/png',
    });

    // The window changes by keyboard and asks the API for the other window.
    const thirty = page.waitForResponse(
      (r) => r.url() === `${trendURL}?period=30d` && r.request().method() === 'GET'
    );
    await trendSection.getByRole('radio', { name: '7 days' }).focus();
    await page.keyboard.press('ArrowRight');
    expect((await thirty).status()).toBe(200);
    await expect(trendSection.getByRole('radio', { name: '30 days' })).toBeChecked();
    await expect(trendSection.getByRole('radio', { name: '30 days' })).toBeFocused();
    const answer30 = (await (await request.get(`${trendURL}?period=30d`)).json()) as Trend;
    expect(answer30.days).toHaveLength(30);
    await trendSection.getByRole('button', { name: 'Data table' }).focus();
    if ((await trendSection.getByRole('table').count()) === 0) await page.keyboard.press('Enter');
    await expect(trendSection.getByRole('table').getByRole('row')).toHaveCount(31);
    await expect(
      trendSection.getByRole('img', { name: /Openings per day, Last 30 days, UTC/ })
    ).toBeVisible();

    // The phone layout keeps the card inside the page.
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(trendSection).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), {
          message: `No horizontal page overflow at ${width}px`,
        })
        .toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await testInfo.attach('trend-30d-accessibility.txt', {
      body: await trendSection.ariaSnapshot(),
      contentType: 'text/plain',
    });

    // Signing out removes the author's series at once, and the page asks for it no more.
    const requestsBefore = trendRequests.length;
    await signOutThroughMenu(page);
    await expect(page.getByRole('region', { name: 'Daily openings' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Author insights' })).toHaveCount(0);
    expect(trendRequests.length).toBe(requestsBefore);

    // Another member sees the public summary only, asks for no series, and the API says 404.
    await signIn(page, outsider);
    await page.goto(`/forum/${slug}`);
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Post insights' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Daily openings' })).toHaveCount(0);
    expect(trendRequests.length).toBe(requestsBefore);
    const otherHeaders = await apiSignIn(guest, outsider);
    expect((await guest.get(trendURL, { headers: otherHeaders })).status()).toBe(404);

    await testInfo.attach('trend-evidence.json', {
      body: JSON.stringify({ postId: id, answer7: answer, days30: answer30.days.length }),
      contentType: 'application/json',
    });
  } finally {
    await guest.dispose();
  }
});
