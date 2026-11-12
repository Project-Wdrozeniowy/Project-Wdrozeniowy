import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

type Share = {
  category: { id: number; slug: string; name: string; visible: boolean } | null;
  posts: number;
  share: number | null;
};
type Distribution = { period: string; totalPosts: number; categories: Share[] };

// PWDRZ-178: public posts by category for the window of the public activity. Guests read it
// through the real gateway; a new post moves its category and the total by one, and the rows
// always add up to the public activity's posts.
test('integration: public posts by category add up to the public activity', async ({
  request,
  account,
}) => {
  const guest = await apiRequest.newContext();
  try {
    const read = async (period = '7d') => {
      const response = await guest.get(
        `${gatewayURL}/api/analytics/public/categories?period=${period}`
      );
      expect(response.status()).toBe(200);
      return (await response.json()) as Distribution;
    };
    const activityPosts = async (period = '7d') =>
      (
        await (
          await guest.get(`${gatewayURL}/api/analytics/public/activity?period=${period}`)
        ).json()
      ).totalPosts as number;
    const postsOf = (distribution: Distribution, categoryId: number) =>
      distribution.categories.find((row) => row.category?.id === categoryId)?.posts;

    const categories = await (await guest.get(`${gatewayURL}/api/forum/categories`)).json();
    const categoryId: number = categories[0].id;
    const before = await read();

    const headers = await apiSignIn(request, account);
    const created = await request.post(`${gatewayURL}/api/forum/posts`, {
      headers,
      data: {
        title: `Category share ${account.username}`,
        content: 'A post counted in its category.',
        categoryId,
      },
    });
    expect(created.status()).toBe(201);

    for (const period of ['7d', '30d']) {
      const after = await read(period);
      expect(after.period).toBe(period);
      expect(after.categories.at(-1)?.category).toBeNull();
      expect(after.categories.reduce((sum, row) => sum + row.posts, 0)).toBe(after.totalPosts);
      expect(after.totalPosts).toBe(await activityPosts(period));
      for (const row of after.categories) {
        expect(row.share).toBeCloseTo(row.posts / after.totalPosts, 4);
      }
    }
    const after = await read();
    expect(after.totalPosts).toBe(before.totalPosts + 1);
    expect(postsOf(after, categoryId)).toBe((postsOf(before, categoryId) ?? 0) + 1);

    const invalid = await guest.get(`${gatewayURL}/api/analytics/public/categories?period=90d`);
    expect(invalid.status()).toBe(400);
  } finally {
    await guest.dispose();
  }
});
