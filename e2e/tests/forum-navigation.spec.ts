import { test, expect, apiSignIn, signIn } from '../support/fixtures.js';

// PWDRZ-81: from a real feed card to its own post and discussion, and back. The feed keeps its page
// and filter in the URL, so Back returns to the same place. Only documented endpoints are used.
test('a feed card opens its own post and discussion, and Back restores the page and filter', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get('/api/forum/categories')).json();
  const tag = `nav-${account.username.slice(-10)}`;

  // 11 posts with one tag: the feed has two pages (10 per page).
  for (let index = 0; index < 11; index += 1) {
    const created = await request.post('/api/forum/posts', {
      headers,
      data: {
        title: `Nav ${tag} ${index}`,
        content: `Body **${index}**.`,
        categoryId: categories[0].id,
        tags: [tag],
      },
    });
    expect(created.status()).toBe(201);
  }
  const feedUrl = `/forum?tag=${tag}&page=2`;

  // The post the feed shows on page 2 is whatever the API ranks there, not an assumed one.
  const listed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/forum/posts' &&
      response.request().method() === 'GET'
  );
  await page.goto(feedUrl);
  const { content } = (await (await listed).json()) as {
    content: Array<{ title: string; slug: string }>;
  };
  expect(content.length).toBeGreaterThan(0);
  const { title, slug } = content[0];

  for (const signedIn of [false, true]) {
    if (signedIn) await signIn(page, account);
    for (const size of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);

      // The title opens the card's own post.
      await page.goto(feedUrl);
      const card = page.getByRole('article').filter({ hasText: title });
      await expect(card).toBeVisible();
      // The tag of the post is on its card, as a link.
      await expect(card.getByRole('link', { name: `#${tag}`, exact: true })).toBeVisible();
      await card.getByRole('link', { name: title, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/forum/${slug}$`));
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      // The body is the persisted Markdown, shown formatted.
      await expect(page.getByRole('article').locator('strong')).toBeVisible();

      // Back is the same page of the same filter, not the first page of everything.
      await page.goBack();
      await expect(page).toHaveURL(feedUrl);
      await expect(page.getByRole('article').filter({ hasText: title })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeEnabled();

      // By keyboard: the comments link of the same card goes to that post's discussion.
      const comments = page
        .getByRole('article')
        .filter({ hasText: title })
        .getByRole('link', { name: /^\d+ Comments? on / });
      await comments.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/forum/${slug}#comments$`));
      await expect(page.getByRole('heading', { name: /^Comments/ })).toBeInViewport();

      // A direct address and a reload work, and Back still leads to the feed context.
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await page.goto(`/forum/${slug}`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    }
  }
});
