import { test, expect, gatewayURL, apiSignIn, apiResponse, signIn } from '../support/fixtures.js';

// The post page shows the real post of the API, and the feed leads to it. A guest may read it;
// voting needs an account. Only documented endpoints are used.
test('the post page shows the real post, and the feed leads to it', async ({
  page,
  request,
  account,
}, testInfo) => {
  const calls: string[] = [];
  page.on('request', (call) => {
    const { pathname } = new URL(call.url());
    if (call.url().startsWith(`${gatewayURL}/api/forum`))
      calls.push(`${call.method()} ${pathname}`);
  });

  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const title = `Thread ${account.username}`;
  const content = 'The first line of the post.\nThe second line of the post.';
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: { title, content, categoryId: categories[0].id },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  // A guest can read the post: title, author, text, category and the comments below it.
  await page.goto(`/forum/${slug}`);
  const article = page.getByRole('article', { name: title });
  await expect(article.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(article).toContainText(account.username);
  await expect(article).toContainText('The first line of the post.');
  await expect(article).toContainText('The second line of the post.');
  await expect(article.getByText(categories[0].name, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Comments/ })).toBeVisible();
  await expect(page.getByText('Post slug')).toHaveCount(0);

  // A guest who votes is sent to sign in.
  await article.getByRole('button', { name: 'Upvote' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Signed in: the feed leads to the post, and the post can be voted on.
  await signIn(page, account);
  await page.goto('/forum');
  await page.getByRole('heading', { name: title, exact: true }).getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(`/forum/${slug}$`));
  const post = page.getByRole('article', { name: title });
  await expect(post).toBeVisible();

  const voted = page.waitForResponse(
    (response) =>
      response.url() === `${gatewayURL}/api/forum/votes` && response.request().method() === 'POST'
  );
  await post.getByRole('button', { name: 'Upvote' }).click();
  const vote = await voted;
  expect(vote.status()).toBe(201);
  expect((await vote.json()).newScore).toBe(1);
  await expect(post.getByRole('button', { name: 'Upvote' })).toHaveClass(/text-accent/);
  await expect(post.getByText('1', { exact: true })).toBeVisible();

  // The vote is the server's: it is there after a reload.
  const reloaded = apiResponse(page, `/forum/posts/${slug}`, 'GET');
  await page.reload();
  expect((await reloaded).status()).toBe(200);
  await expect(
    page.getByRole('article', { name: title }).getByRole('button', { name: 'Upvote' })
  ).toHaveClass(/text-accent/);

  // A post that does not exist is said not to exist.
  await page.goto('/forum/no-such-post-at-all');
  await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to the forum' })).toHaveAttribute(
    'href',
    '/forum'
  );

  await testInfo.attach('forum-requests.txt', {
    body: [...new Set(calls)].join('\n'),
    contentType: 'text/plain',
  });
  for (const entry of calls) {
    expect(entry).toMatch(
      /^(GET \/api\/forum\/(posts|categories)(\/[\w-]+(\/comments)?)?|POST \/api\/forum\/votes|DELETE \/api\/forum\/votes\/\d+)$/
    );
  }
});
