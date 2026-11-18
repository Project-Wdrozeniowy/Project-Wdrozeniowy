import { randomBytes, randomUUID } from 'node:crypto';
import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn, csrfHeaders } from '../support/fixtures.js';

type Day = { date: string; measured: boolean; openings: number | null };
type Trend = {
  postId: number;
  period: string;
  windowStart: string;
  collectedFrom: string;
  totalOpenings: number;
  days: Day[];
};

// PWDRZ-170: an author's daily openings of their own post through the real gateway. Openings by
// the author and a guest count on the current UTC day; on this fresh stack collection started
// today, so earlier days are not measured. Guests get 401, another member 404.
test('integration: only the author gets the daily openings of a post', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Opening trend ${account.username}`,
      content: 'A post whose openings are charted.',
      categoryId: categories[0].id,
    },
  });
  expect(created.status()).toBe(201);
  const { id, slug } = await created.json();
  const path = `${gatewayURL}/api/analytics/me/posts/${id}/openings`;

  const empty = (await (await request.get(path)).json()) as Trend;
  expect(empty.totalOpenings).toBe(0);
  expect(empty.days.at(-1)).toMatchObject({ measured: true, openings: 0 });

  const authorOpening = randomUUID();
  for (const openingId of [authorOpening, authorOpening, randomUUID()]) {
    const opened = await request.post(`${gatewayURL}/api/forum/posts/${slug}/openings`, {
      headers,
      data: { openingId },
    });
    expect(opened.status()).toBe(204);
  }

  const guest = await apiRequest.newContext();
  const stranger = await apiRequest.newContext();
  try {
    const guestOpening = await guest.post(`${gatewayURL}/api/forum/posts/${slug}/openings`, {
      headers: await csrfHeaders(guest),
      data: { openingId: randomUUID() },
    });
    expect(guestOpening.status()).toBe(204);

    for (const period of ['7d', '30d']) {
      const response = await request.get(`${path}?period=${period}`);
      expect(response.status()).toBe(200);
      const trend = (await response.json()) as Trend;
      expect(trend.postId).toBe(id);
      expect(trend.days).toHaveLength(period === '7d' ? 7 : 30);
      expect(trend.days.at(-1)).toMatchObject({ measured: true, openings: 3 });
      expect(trend.totalOpenings).toBe(3);
      const collectionDay = trend.collectedFrom.slice(0, 10);
      for (const day of trend.days) {
        expect(day.measured).toBe(day.date >= collectionDay);
        if (!day.measured) {
          expect(day.openings).toBeNull();
        }
      }
    }

    expect((await guest.get(path)).status()).toBe(401);

    const username = `e2e_${randomBytes(10).toString('hex')}`;
    const other = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
    const registered = await stranger.post(`${gatewayURL}/api/auth/register`, {
      headers: await csrfHeaders(stranger),
      data: other,
    });
    expect(registered.status()).toBe(201);
    await apiSignIn(stranger, other);
    expect((await stranger.get(path)).status()).toBe(404);

    expect((await request.get(`${path}?period=90d`)).status()).toBe(400);
  } finally {
    await guest.dispose();
    await stranger.dispose();
  }
});
