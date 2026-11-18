import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';

type Window = { start: string; end: string; posts: number; comments: number };
type Change = { current: number; previous: number; change: number; changePercent: number | null };
type Comparison = {
  period: string;
  generatedAt: string;
  current: Window;
  previous: Window;
  posts: Change;
  comments: Change;
};

// PWDRZ-180: the public activity window against the equally long window right before it,
// read by a guest through the real gateway. A new post moves only the current window.
test('integration: public comparison uses adjacent windows of equal length', async ({
  request,
  account,
}) => {
  const guest = await apiRequest.newContext();
  try {
    const read = async (period = '7d') => {
      const response = await guest.get(
        `${gatewayURL}/api/analytics/public/comparison?period=${period}`
      );
      expect(response.status()).toBe(200);
      return (await response.json()) as Comparison;
    };
    const before = await read();

    const categories = await (await guest.get(`${gatewayURL}/api/forum/categories`)).json();
    const headers = await apiSignIn(request, account);
    const created = await request.post(`${gatewayURL}/api/forum/posts`, {
      headers,
      data: {
        title: `Comparison ${account.username}`,
        content: 'A post in the current window.',
        categoryId: categories[0].id,
      },
    });
    expect(created.status()).toBe(201);

    for (const period of ['7d', '30d']) {
      const comparison = await read(period);
      const activity = await (
        await guest.get(`${gatewayURL}/api/analytics/public/activity?period=${period}`)
      ).json();
      expect(comparison.period).toBe(period);
      expect(comparison.current.start).toBe(activity.windowStart);
      expect(comparison.current.end).toBe(comparison.generatedAt);
      expect(comparison.previous.end).toBe(comparison.current.start);
      const length = (window: Window) => Date.parse(window.end) - Date.parse(window.start);
      expect(length(comparison.previous)).toBe(length(comparison.current));
      expect(comparison.current.posts).toBe(activity.totalPosts);
      expect(comparison.current.comments).toBe(activity.totalComments);
      for (const [figure, change] of [
        ['posts', comparison.posts],
        ['comments', comparison.comments],
      ] as const) {
        expect(change.current).toBe(comparison.current[figure]);
        expect(change.previous).toBe(comparison.previous[figure]);
        expect(change.change).toBe(change.current - change.previous);
        if (change.previous === 0) {
          expect(change.changePercent).toBeNull();
        } else {
          expect(change.changePercent).toBeCloseTo((change.change / change.previous) * 100, 0);
        }
      }
    }
    const after = await read();
    expect(after.posts.current).toBe(before.posts.current + 1);
    expect(after.posts.previous).toBe(before.posts.previous);

    const invalid = await guest.get(`${gatewayURL}/api/analytics/public/comparison?period=24h`);
    expect(invalid.status()).toBe(400);
  } finally {
    await guest.dispose();
  }
});
