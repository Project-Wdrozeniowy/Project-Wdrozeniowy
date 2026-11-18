import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

type Page = { totalElements: number; content: { slug: string; category: { id: number } | null }[] };

// PWDRZ-184: the feed lists the posts behind a public analytics figure. A guest takes today's
// activity row and a category row of the 7-day window, and the matching feed queries return
// exactly as many posts, through the real gateway.
test('integration: feed drill-down matches the public activity and category rows', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const categoryId: number = categories[0].id;
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: { title: `Drill-down ${account.username}`, content: 'A post to find again.', categoryId },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  const guest = await apiRequest.newContext();
  try {
    const feed = async (params: Record<string, string>) => {
      const query = new URLSearchParams({ size: '100', ...params });
      const response = await guest.get(`${gatewayURL}/api/forum/posts?${query}`);
      expect(response.status()).toBe(200);
      return (await response.json()) as Page;
    };

    const activity = await (
      await guest.get(`${gatewayURL}/api/analytics/public/activity?period=7d`)
    ).json();
    const today = activity.days.at(-1);
    const dayStart = `${today.date}T00:00:00Z`;
    const dayEnd = activity.windowEnd;
    const day = await feed({ createdFrom: dayStart, createdTo: dayEnd });
    expect(day.totalElements).toBe(today.posts);
    expect(day.content.map((post) => post.slug)).toContain(slug);

    const window = await feed({ createdFrom: activity.windowStart, createdTo: activity.windowEnd });
    expect(window.totalElements).toBe(activity.totalPosts);

    const distribution = await (
      await guest.get(`${gatewayURL}/api/analytics/public/categories?period=7d`)
    ).json();
    const row = distribution.categories.find(
      (entry: { category: { id: number } | null }) => entry.category?.id === categoryId
    );
    const inCategory = await feed({
      createdFrom: distribution.windowStart,
      createdTo: distribution.windowEnd,
      categoryId: String(categoryId),
    });
    expect(inCategory.totalElements).toBe(row.posts);
    expect(inCategory.content.every((post) => post.category?.id === categoryId)).toBe(true);

    const uncategorized = await feed({
      createdFrom: distribution.windowStart,
      createdTo: distribution.windowEnd,
      uncategorized: 'true',
    });
    expect(uncategorized.totalElements).toBe(distribution.categories.at(-1).posts);

    const inverted = await guest.get(
      `${gatewayURL}/api/forum/posts?createdFrom=${dayEnd}&createdTo=${dayStart}`
    );
    expect(inverted.status()).toBe(400);
    const conflicting = await guest.get(
      `${gatewayURL}/api/forum/posts?uncategorized=true&categoryId=${categoryId}`
    );
    expect(conflicting.status()).toBe(400);
  } finally {
    await guest.dispose();
  }
});
