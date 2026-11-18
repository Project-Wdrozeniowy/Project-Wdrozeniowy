import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

// PWDRZ-183: feed cards carry their tags, so tag navigation can start from a real card.
// API-level evidence through the real gateway and backend.
test('integration: the paginated feed lists each post with its tags', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const suffix = account.username.slice(-8);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const create = (title: string, tags: string[]) =>
    request.post(`${gatewayURL}/api/forum/posts`, {
      headers,
      data: { title, content: 'A post listed in the feed.', categoryId: categories[0].id, tags },
    });

  expect((await create(`Tagged ${suffix}`, [`zeta-${suffix}`, `alpha-${suffix}`])).status()).toBe(
    201
  );
  expect((await create(`Untagged ${suffix}`, [])).status()).toBe(201);

  const byTag = await request.get(`${gatewayURL}/api/forum/posts`, {
    params: { tag: `alpha-${suffix}` },
  });
  expect(byTag.status()).toBe(200);
  const tagged = await byTag.json();
  expect(tagged.totalElements).toBe(1);
  expect(tagged.content[0].tags.map((t: { slug: string }) => t.slug)).toEqual([
    `alpha-${suffix}`,
    `zeta-${suffix}`,
  ]);

  const byAuthor = await (
    await request.get(`${gatewayURL}/api/forum/posts`, {
      params: { author: account.username, sort: 'createdAt' },
    })
  ).json();
  expect(byAuthor.content.map((p: { tags: unknown[] }) => p.tags.length)).toEqual([0, 2]);
  expect(byAuthor.content[0].viewCount).toBe(0);
});
