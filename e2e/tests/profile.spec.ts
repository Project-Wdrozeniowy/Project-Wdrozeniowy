import { test, expect, gatewayURL, apiSignIn, signIn } from '../support/fixtures.js';

type Listed = { content: Array<{ title: string; author: { username: string } }>; last: boolean };

// The profile lists the signed-in user's own published posts, a page at a time, and the sidebar card
// shows the counts the platform has for the user, not placeholders.
test("the profile lists the user's own posts and the sidebar shows real counts", async ({
  page,
  request,
  account,
}, testInfo) => {
  const authorRequests: string[] = [];
  page.on('request', (call) => {
    const url = new URL(call.url());
    if (call.url().startsWith(`${gatewayURL}/api/forum/posts`) && url.searchParams.has('author')) {
      authorRequests.push(`${call.method()} ${url.pathname}${url.search}`);
    }
  });

  // 11 posts, so that the second page (10 per page) exists.
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const titles: string[] = [];
  for (let i = 1; i <= 11; i += 1) {
    const title = `Profile post ${i} ${account.username}`;
    const created = await request.post(`${gatewayURL}/api/forum/posts`, {
      headers,
      data: { title, content: `Body of post ${i}.`, categoryId: categories[0].id },
    });
    expect(created.status()).toBe(201);
    titles.push(title);
  }

  // What the API says for this author, newest first: the page must show exactly that.
  const first = (await (
    await request.get(
      `${gatewayURL}/api/forum/posts?author=${account.username}&page=0&size=10&sort=createdAt`
    )
  ).json()) as Listed;
  expect(first.content).toHaveLength(10);
  expect(first.content.every((post) => post.author.username === account.username)).toBe(true);
  expect(first.content[0].title).toBe(titles[10]);
  await testInfo.attach('author-posts-page-0.json', {
    body: JSON.stringify(first, null, 2),
    contentType: 'application/json',
  });

  await signIn(page, account);
  await page.goto('/profile');

  const posts = page.getByRole('region', { name: 'Posts' });
  await expect(posts.getByRole('article')).toHaveCount(10);
  const shown = await posts.getByRole('article').getByRole('heading').allTextContents();
  expect(shown).toEqual(first.content.map((post) => post.title));

  await posts.getByRole('button', { name: 'Load more' }).click();
  await expect(posts.getByRole('article')).toHaveCount(11);
  await expect(posts.getByRole('heading', { name: titles[0], exact: true })).toBeVisible();
  await expect(posts.getByRole('button', { name: 'Load more' })).toHaveCount(0);

  // The sections without an API are shown as not available, not as a skeleton that never loads.
  // Posts and Activity are open (links); Comments and Saved are not.
  const tabs = page.getByRole('navigation', { name: 'Profile sections' });
  await expect(tabs.getByRole('link', { name: 'Posts', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(tabs.getByRole('link', { name: 'Activity', exact: true })).toBeVisible();
  for (const label of ['Comments', 'Saved']) {
    await expect(tabs).toContainText(`${label} (Not available yet)`);
  }

  // The sidebar card shows the user's real post count and no invented figures.
  const card = page.getByRole('complementary');
  await expect(card.getByText('11', { exact: true })).toBeVisible();
  await expect(card).not.toContainText('Followers');
  await expect(card).not.toContainText('Following');

  await testInfo.attach('author-posts-requests.txt', {
    body: [...new Set(authorRequests)].join('\n'),
    contentType: 'text/plain',
  });
  for (const entry of authorRequests) {
    expect(entry).toContain(`author=${account.username}`);
    expect(entry).toMatch(/^GET \/api\/forum\/posts\?/);
  }
});

// The sections of the profile (PWDRZ-60): the open ones have real content, the others say they are
// not available, and the open section and the way to the settings survive a reload.
test('the profile sections: Activity has content, the others are not available, Settings and back work', async ({
  page,
  account,
}) => {
  await signIn(page, account);
  await page.goto('/profile');
  const sections = page.getByRole('navigation', { name: 'Profile sections' });

  // A new account has no posts: a truthful empty text, not a skeleton that never ends.
  await expect(page.getByText('You have not published a post yet.')).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  for (const name of ['Comments', 'Saved']) {
    await expect(sections.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);
    await expect(sections.getByText(`${name} (Not available yet)`)).toBeVisible();
  }

  await sections.getByRole('link', { name: 'Activity', exact: true }).click();
  await expect(page).toHaveURL(/\/profile\?tab=activity$/);
  const activity = page.getByRole('region', { name: 'Your activity' });
  await expect(activity.getByText(/over time is not available yet/)).toBeVisible();
  await expect(activity.getByText('Posts', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Your activity' })).toBeVisible();

  // The sidebar has a Settings link too: this one is the profile's own.
  await page.getByRole('main').getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Your activity' })).toBeVisible();
  await sections.getByRole('link', { name: 'Posts', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('You have not published a post yet.')).toBeVisible();
});
