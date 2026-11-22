import { test, expect, apiSignIn } from '../support/fixtures.js';

// PWDRZ-107 (with PWDRZ-183): tag browsing starts from a tag on a real feed card, not from a direct
// URL or the search. The posts are created through the API; the rest is the real browser and backend.
test('a tag on a real feed card opens the posts of that tag, with paging, Back, categories and states', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const categories = (await (await request.get('/api/forum/categories')).json()) as Array<{
    id: number;
    slug: string;
  }>;
  const ai = categories.find((category) => category.slug === 'ai');
  expect(ai, 'the seeded AI / Tech category').toBeDefined();
  const suffix = account.username.slice(-8);
  const tag = `qa-${suffix}`;
  const extra = `extra-${suffix}`;
  const other = `other-${suffix}`;

  const create = async (title: string, tags: string[]) => {
    const created = await request.post('/api/forum/posts', {
      headers,
      data: { title, content: `Body of ${title}.`, categoryId: ai!.id, tags },
    });
    expect(created.status()).toBe(201);
  };
  // One post with another tag, then 11 with the tag (two pages), the newest also with a second tag.
  await create(`Other ${suffix}`, [other]);
  for (let index = 0; index < 11; index += 1) {
    await create(`Tagged ${suffix} ${index}`, index === 10 ? [tag, extra] : [tag]);
  }
  const newest = `Tagged ${suffix} 10`;

  // The tags come with the feed page: no post is fetched on its own just to show its tags.
  const singlePostReads: string[] = [];
  page.on('request', (call) => {
    const { pathname } = new URL(call.url());
    if (/^\/api\/forum\/posts\/[^/]+$/.test(pathname)) singlePostReads.push(pathname);
  });

  const cards = () => page.getByRole('article');
  const withTag = (name: string) => page.getByRole('link', { name: `#${name}`, exact: true });

  // The feed, after a reload: the newest tagged post shows its tags on its card.
  await page.goto('/forum');
  await page.reload();
  const card = cards().filter({ has: page.getByRole('heading', { name: newest, exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.getByRole('list', { name: 'Tags' })).toBeVisible();
  await expect(card.getByRole('link', { name: `#${extra}`, exact: true })).toBeVisible();
  await testInfo.attach('1-feed-card-with-tags.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Click the tag on the card: the tag address, and only the posts of that tag.
  await card.getByRole('link', { name: `#${tag}`, exact: true }).click();
  await expect(page).toHaveURL(`/forum?tag=${tag}`);
  await expect(page.getByText(`Posts tagged #${tag}`)).toBeVisible();
  await expect(cards()).toHaveCount(10);
  await expect(cards().filter({ hasNot: withTag(tag) })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `Other ${suffix}`, exact: true })).toHaveCount(0);
  await testInfo.attach('2-tag-feed.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Paging keeps the tag; Back and Forward move between the pages of the same tag.
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(`/forum?tag=${tag}&page=2`);
  await expect(cards()).toHaveCount(1);
  await expect(cards().filter({ hasNot: withTag(tag) })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(`/forum?tag=${tag}&page=2`);
  await expect(cards()).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(`/forum?tag=${tag}`);
  await expect(cards()).toHaveCount(10);
  await page.goForward();
  await expect(page).toHaveURL(`/forum?tag=${tag}&page=2`);
  await expect(cards()).toHaveCount(1);

  // A category on top of the tag: the same posts in their own category, none in another.
  await page.goto(`/forum?tag=${tag}`);
  await page.getByRole('button', { name: 'Gaming', exact: true }).click();
  await expect(page).toHaveURL(`/forum?tag=${tag}&topic=Gaming`);
  await expect(page.getByText(`No posts with the tag #${tag} in this topic yet.`)).toBeVisible();
  await expect(cards()).toHaveCount(0);
  await page.getByRole('button', { name: 'AI / Tech', exact: true }).click();
  await expect(page).toHaveURL(`/forum?tag=${tag}&topic=AI+%2F+Tech`);
  await expect(cards()).toHaveCount(10);

  // A tag nobody used says so, and shows no other posts; it is not an error.
  await page.goto(`/forum?tag=no-such-tag-${suffix}`);
  await expect(page.getByText(`No posts with the tag #no-such-tag-${suffix} yet.`)).toBeVisible();
  await expect(cards()).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);

  expect(singlePostReads).toEqual([]);

  // The way back to every post.
  await page.getByRole('link', { name: 'Show all posts', exact: true }).click();
  await expect(page).toHaveURL('/forum');
});
