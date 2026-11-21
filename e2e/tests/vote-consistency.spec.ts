import { test, expect, apiSignIn, signIn } from '../support/fixtures.js';
import type { Page } from '@playwright/test';

// PWDRZ-97: a vote is the server's, and the feed and the post page show the same one. The post is
// created through the API; everything else is the real browser against the real backend.
const votesUrl = (page: Page, method: string) =>
  page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.startsWith('/api/forum/votes') &&
      response.request().method() === method
  );

test('a vote in the feed and on the post page agree, persist, and are sent once', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get('/api/forum/categories')).json();
  const title = `Vote ${account.username}`;
  const created = await request.post('/api/forum/posts', {
    headers,
    data: { title, content: 'A post to vote on.', categoryId: categories[0].id },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  const sent: string[] = [];
  page.on('request', (call) => {
    const { pathname } = new URL(call.url());
    if (pathname.startsWith('/api/forum/votes')) sent.push(`${call.method()} ${pathname}`);
  });

  const feedCard = () =>
    page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  const detail = () => page.getByRole('article', { name: title });

  // Cast in the feed, with a double click: one request, not two. The real request is held back for
  // a moment (and then sent unchanged), so the second click certainly comes while it is pending.
  await signIn(page, account);
  await page.goto('/forum');
  await page.route('**/api/forum/votes', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  const cast = votesUrl(page, 'POST');
  await feedCard().getByRole('button', { name: 'Upvote', exact: true }).dblclick();
  const castResponse = await cast;
  expect(castResponse.status()).toBe(201);
  expect((await castResponse.json()).newScore).toBe(1);
  await expect(feedCard().getByRole('button', { name: 'Upvote' })).toHaveClass(/text-accent/);
  await expect(feedCard().getByText('1', { exact: true })).toBeVisible();
  expect(sent.filter((entry) => entry.startsWith('POST'))).toHaveLength(1);
  await page.unroute('**/api/forum/votes');
  await testInfo.attach('1-feed-after-cast.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // The post page, reached from the card without a reload, shows the same vote.
  await feedCard().getByRole('heading', { name: title, exact: true }).getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`/forum/${slug}$`));
  await expect(detail().getByRole('button', { name: 'Upvote' })).toHaveClass(/text-accent/);
  await expect(detail().getByText('1', { exact: true })).toBeVisible();

  // Switching on the post page is the feed's vote too, when the user goes back.
  const switched = votesUrl(page, 'POST');
  await detail().getByRole('button', { name: 'Downvote', exact: true }).click();
  const switchedResponse = await switched;
  expect(switchedResponse.status()).toBe(200);
  expect((await switchedResponse.json()).newScore).toBe(-1);
  await expect(detail().getByRole('button', { name: 'Downvote' })).toHaveClass(/text-danger/);
  await testInfo.attach('2-detail-after-switch.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.goBack();
  await expect(page).toHaveURL(/\/forum$/);
  await expect(feedCard().getByRole('button', { name: 'Downvote' })).toHaveClass(/text-danger/);
  await expect(feedCard().getByText('-1', { exact: true })).toBeVisible();

  // It is the server's: a reload shows the same.
  await page.reload();
  await expect(feedCard().getByRole('button', { name: 'Downvote' })).toHaveClass(/text-danger/);
  await expect(feedCard().getByText('-1', { exact: true })).toBeVisible();

  // Taking it back in the feed leaves no vote on the post page either.
  const retracted = votesUrl(page, 'DELETE');
  await feedCard().getByRole('button', { name: 'Downvote', exact: true }).click();
  expect((await retracted).status()).toBe(204);
  await expect(feedCard().getByRole('button', { name: 'Downvote' })).not.toHaveClass(/text-danger/);
  await expect(feedCard().getByText('0', { exact: true })).toBeVisible();
  await page.goto(`/forum/${slug}`);
  await expect(detail().getByRole('button', { name: 'Downvote' })).not.toHaveClass(/text-danger/);
  await expect(detail().getByRole('button', { name: 'Upvote' })).not.toHaveClass(/text-accent/);
  await expect(detail().getByText('0', { exact: true })).toBeVisible();
  const stored = await request.get(`/api/forum/posts/${slug}`);
  expect((await stored.json()).voteScore).toBe(0);

  await testInfo.attach('vote-requests.txt', { body: sent.join('\n'), contentType: 'text/plain' });
  // Cast once, switched once, retracted once: three requests for three clicks (the double click
  // counted as one).
  expect(sent).toHaveLength(3);
});
