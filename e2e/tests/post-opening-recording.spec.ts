import { randomBytes } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import {
  test,
  expect,
  gatewayURL,
  apiSignIn,
  csrfHeaders,
  signIn,
  type Identity,
} from '../support/fixtures.js';

// PWDRZ-166: the SPA reports an opening when a reader really opens a post, and only then. What is
// counted is read from the API (`viewCount`), not from the page; what the browser sent is read from
// its own requests.

const openingPath = (slug: string) => `/api/forum/posts/${slug}/openings`;

/** The id of every opening the page sent for this post, in order. */
function watchOpenings(page: Page, slug: string): string[] {
  const ids: string[] = [];
  page.on('request', (call) => {
    if (call.method() === 'POST' && new URL(call.url()).pathname === openingPath(slug)) {
      ids.push(JSON.parse(call.postData() ?? '{}').openingId);
    }
  });
  return ids;
}

const opened = (page: Page, slug: string) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === openingPath(slug)
  );

/** Time for a request that should not be sent to show up if it were; the page has no other cue. */
const quiet = (page: Page) => page.waitForTimeout(1500);

async function publish(request: APIRequestContext, author: Identity, title: string) {
  const headers = await apiSignIn(request, author);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: { title, content: 'A post whose openings are counted.', categoryId: categories[0].id },
  });
  expect(created.status()).toBe(201);
  return (await created.json()).slug as string;
}

const viewCount = async (request: APIRequestContext, slug: string) =>
  (await (await request.get(`${gatewayURL}/api/forum/posts/${slug}`)).json()).viewCount as number;

async function registerReader(request: APIRequestContext): Promise<Identity> {
  const username = `e2e_${randomBytes(10).toString('hex')}`;
  const reader = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
  const response = await request.post(`${gatewayURL}/api/auth/register`, {
    headers: await csrfHeaders(request),
    data: reader,
  });
  expect(response.status()).toBe(201);
  return reader;
}

test('a guest opening counts once for direct entry, a reload, the feed and Back/Forward, and never for anything else', async ({
  page,
  request,
  account,
}) => {
  const title = `Opened ${account.username}`;
  const slug = await publish(request, account, title);
  const sent = watchOpenings(page, slug);
  expect(await viewCount(request, slug)).toBe(0);

  // Direct entry: one opening, delivered once the post is on screen.
  const entry = opened(page, slug);
  await page.goto(`/forum/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect((await entry).status()).toBe(204);
  expect(await viewCount(request, slug)).toBe(1);

  // Nothing that is not an opening adds one: focus, the tab coming back, the page's own comments
  // link (a hash change on the same page), and the statistics the page reads.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page
    .getByRole('article')
    .getByRole('link', { name: /Comments?$/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/forum/${slug}#comments$`));
  await quiet(page);
  expect(sent).toHaveLength(1);
  expect(await viewCount(request, slug)).toBe(1);

  // An explicit reload is a new opening, with a new id.
  const reload = opened(page, slug);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect((await reload).status()).toBe(204);
  expect(await viewCount(request, slug)).toBe(2);
  expect(new Set(sent).size).toBe(2);

  // A user navigation from the feed is another one.
  await page.goto('/forum');
  const fromFeed = opened(page, slug);
  await page
    .getByRole('article')
    .filter({ hasText: title })
    .getByRole('link', { name: title, exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect((await fromFeed).status()).toBe(204);
  expect(await viewCount(request, slug)).toBe(3);

  // Back leaves the post and counts nothing; going Forward opens it again.
  await page.goBack();
  await expect(page).toHaveURL(/\/forum$/);
  await quiet(page);
  expect(await viewCount(request, slug)).toBe(3);
  const forward = opened(page, slug);
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect((await forward).status()).toBe(204);
  expect(await viewCount(request, slug)).toBe(4);
  expect(new Set(sent).size).toBe(4);
});

test('a member opening counts once, and the author toggling insights counts nothing', async ({
  page,
  request,
  browser,
  account,
}) => {
  const title = `Opened by a member ${account.username}`;
  const slug = await publish(request, account, title);
  const reader = await registerReader(await (await browser.newContext()).request);

  await signIn(page, reader);
  const sent = watchOpenings(page, slug);
  const entry = opened(page, slug);
  await page.goto(`/forum/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect((await entry).status()).toBe(204);
  expect(await viewCount(request, slug)).toBe(1);
  await quiet(page);
  expect(sent).toHaveLength(1);

  // The author opens it (their own opening counts, as the contract says) and refreshes the
  // statistics: analytics reads do not open the post again.
  const author = await browser.newPage();
  await signIn(author, account);
  const authorSent = watchOpenings(author, slug);
  const authorEntry = opened(author, slug);
  await author.goto(`/forum/${slug}`);
  await expect(author.getByRole('heading', { level: 1, name: title })).toBeVisible();
  expect((await authorEntry).status()).toBe(204);
  expect(await viewCount(request, slug)).toBe(2);

  const refreshed = author.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && response.url().includes('/api/analytics/me/posts/')
  );
  const analytics = author.getByRole('button', { name: 'Analytics', exact: true });
  await analytics.click();
  await refreshed;
  await expect(author.getByRole('region', { name: 'Author insights' })).toBeVisible();
  await analytics.click();
  await analytics.click();
  await expect(author.getByRole('region', { name: 'Author insights' })).toBeVisible();
  await quiet(author);
  expect(authorSent).toHaveLength(1);
  expect(await viewCount(request, slug)).toBe(2);
  await author.close();
});

test('a post that cannot be read records nothing', async ({ page }) => {
  const slug = `no-such-post-${randomBytes(6).toString('hex')}`;
  const sent = watchOpenings(page, slug);

  await page.goto(`/forum/${slug}`);
  await expect(page.getByText(/not found/i).first()).toBeVisible();
  await quiet(page);

  expect(sent).toHaveLength(0);
});

test('a recording that does not work never stops the post from being read', async ({
  page,
  request,
  account,
}) => {
  const title = `Unrecorded ${account.username}`;
  const slug = await publish(request, account, title);
  const sent = watchOpenings(page, slug);
  await page.route(`**${openingPath(slug)}`, (route) => route.abort('connectionrefused'));

  await page.goto(`/forum/${slug}`);

  // Read as usual, with no message about the recording.
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('A post whose openings are counted.')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // It is tried again, always as the same opening, and then let go.
  await expect.poll(() => sent.length, { timeout: 15_000 }).toBe(3);
  await quiet(page);
  expect(sent).toHaveLength(3);
  expect(new Set(sent).size).toBe(1);
  expect(await viewCount(request, slug)).toBe(0);
});

test('a retry after a failed delivery cannot count the opening twice', async ({
  page,
  request,
  account,
}) => {
  const title = `Retried ${account.username}`;
  const slug = await publish(request, account, title);
  const sent = watchOpenings(page, slug);
  let attempts = 0;
  // The first two deliveries are refused by the "gateway"; the third reaches the real backend.
  await page.route(`**${openingPath(slug)}`, (route) =>
    ++attempts <= 2 ? route.fulfill({ status: 503, body: '' }) : route.continue()
  );

  await page.goto(`/forum/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect.poll(() => sent.length, { timeout: 15_000 }).toBe(3);
  await expect.poll(() => viewCount(request, slug), { timeout: 15_000 }).toBe(1);
  await quiet(page);

  expect(new Set(sent).size).toBe(1);
  expect(sent).toHaveLength(3);
  expect(await viewCount(request, slug)).toBe(1);

  // The real backend also counts a repeat of that id once.
  const headers = await csrfHeaders(request);
  const repeat = await request.post(`${gatewayURL}${openingPath(slug)}`, {
    headers,
    data: { openingId: sent[0] },
  });
  expect(repeat.status()).toBe(204);
  expect(await viewCount(request, slug)).toBe(1);
});
