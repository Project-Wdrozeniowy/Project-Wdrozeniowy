import { test, expect, apiSignIn, gatewayURL } from '../support/fixtures.js';

// PWDRZ-111: the Home tabs are server orders. Three posts differ in age and score, so New and Top
// put them in different places; what the page shows is compared with what the API answers for the
// same order, and Hot (no ranking contract) is shown as not available.
test('the Home tabs ask the server for New and Top, and Hot is not available', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get('/api/forum/categories')).json();
  const suffix = account.username.slice(-8);
  const create = async (title: string) => {
    const created = await request.post('/api/forum/posts', {
      headers,
      data: { title, content: `Body of ${title}.`, categoryId: categories[0].id },
    });
    expect(created.status()).toBe(201);
    return (await created.json()) as { id: number; title: string };
  };
  // Created oldest to newest: the oldest has the best score, the newest the worst.
  const oldest = await create(`Sort oldest ${suffix}`);
  await create(`Sort middle ${suffix}`);
  const newest = await create(`Sort newest ${suffix}`);
  const vote = async (postId: number, voteType: 'UP' | 'DOWN') => {
    const cast = await request.post(`${gatewayURL}/api/forum/votes`, {
      headers,
      data: { entityType: 'POST', entityId: postId, voteType },
    });
    expect(cast.status()).toBe(201);
  };
  await vote(oldest.id, 'UP');
  await vote(newest.id, 'DOWN');

  // What the API says for each order: the page must show exactly that.
  const titlesOf = async (sort: string) =>
    (
      (await (
        await request.get('/api/forum/posts', { params: { page: 0, size: 10, sort } })
      ).json()) as { content: Array<{ title: string }> }
    ).content.map((post) => post.title);
  const byNew = await titlesOf('createdAt');
  const byTop = await titlesOf('voteScore');
  expect(byNew[0]).toBe(newest.title);
  expect(byTop[0]).toBe(oldest.title);
  // The two orders are different, so a page that did not follow the tab would be seen.
  expect(byNew).not.toEqual(byTop);

  const headings = page.getByRole('article').getByRole('heading', { level: 2 });
  const sorted = new Set<string>();
  page.on('request', (call) => {
    const url = new URL(call.url());
    if (url.pathname === '/api/forum/posts' && !url.searchParams.has('author')) {
      sorted.add(url.searchParams.get('sort') ?? '');
    }
  });

  // Home opens on New: the bare address, the newest first.
  await page.goto('/forum');
  await page.goto('/');
  const tabs = page.getByRole('navigation', { name: 'Sort posts' });
  await expect(tabs.getByRole('link', { name: 'New' })).toHaveAttribute('aria-current', 'page');
  await expect(headings).toHaveText(byNew);

  // Top: the address, the selected tab and the posts follow, and the request asked for the score.
  await tabs.getByRole('link', { name: 'Top' }).click();
  await expect(page).toHaveURL('/?sort=top');
  await expect(tabs.getByRole('link', { name: 'Top' })).toHaveAttribute('aria-current', 'page');
  await expect(headings).toHaveText(byTop);
  await testInfo.attach('1-home-top.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // A reload keeps the order, and so does a shared link.
  await page.reload();
  await expect(tabs.getByRole('link', { name: 'Top' })).toHaveAttribute('aria-current', 'page');
  await expect(headings).toHaveText(byTop);

  // Hot is shown and cannot be opened: no link, and it says so.
  await expect(tabs.getByRole('link', { name: /Hot/ })).toHaveCount(0);
  await expect(tabs.locator('[aria-disabled="true"]')).toHaveText(/^Hot/);
  await expect(tabs).toContainText('Hot (Not available yet)');

  // "See all posts" keeps the order in the forum.
  await page.getByRole('link', { name: /See all posts/ }).click();
  await expect(page).toHaveURL('/forum?sort=top');
  await expect(headings).toHaveText(byTop);
  // The forum says which order it is in, and the way back to its usual one is there.
  await expect(page.getByText('The highest score first, of all time')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the usual order', exact: true }).click();
  await expect(page).toHaveURL('/forum');
  await expect(page.getByText(/^Order:/)).toHaveCount(0);

  // Picking an order does not add history entries: Back from Home leaves it.
  await page.goto('/forum');
  await page.goto('/');
  await tabs.getByRole('link', { name: 'Top' }).click();
  await tabs.getByRole('link', { name: 'New' }).click();
  await expect(page).toHaveURL('/');
  await page.goBack();
  await expect(page).toHaveURL(/\/forum$/);

  // Only the two orders of the API were asked for by the tabs (the forum's own is the default).
  expect([...sorted].filter((sort) => sort !== 'lastActivityAt').sort()).toEqual([
    'createdAt',
    'voteScore',
  ]);
});
