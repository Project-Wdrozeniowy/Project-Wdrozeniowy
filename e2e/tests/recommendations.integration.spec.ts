import { test, expect, gatewayURL, apiSignIn } from '../support/fixtures.js';
import { request as apiRequest } from '@playwright/test';

// PWDRZ-146: recommendations are public and ranked by documented rules; a bearer
// token personalises them. API-level evidence through the real gateway and backend.
test('integration: recommendations answer for anonymous callers and check the limit', async ({
  request,
}) => {
  for (const kind of ['posts', 'tags']) {
    const response = await request.get(`${gatewayURL}/api/recommendations/${kind}`, {
      params: { limit: 10 },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(10);

    const invalid = await request.get(`${gatewayURL}/api/recommendations/${kind}`, {
      params: { limit: 0 },
    });
    expect(invalid.status()).toBe(400);
    expect(invalid.headers()['content-type']).toContain('application/problem+json');
    expect((await invalid.json()).detail).toBe('limit must be between 1 and 100');
  }
});

test('integration: signed-in callers are not recommended their own posts', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);

  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Recommendation check ${account.username}`,
      content: 'A post its own author must not be recommended.',
      categoryId: categories[0].id,
      tags: [`e2e-${account.username.slice(-8)}`],
    },
  });
  expect(created.status()).toBe(201);
  const post = await created.json();

  const guest = await apiRequest.newContext();
  let anonymous: { id: number; reason: string }[];
  try {
    anonymous = await (
      await guest.get(`${gatewayURL}/api/recommendations/posts`, { params: { limit: 100 } })
    ).json();
  } finally {
    await guest.dispose();
  }
  expect(anonymous.map((p: { id: number }) => p.id)).toContain(post.id);
  expect(anonymous.every((p: { reason: string }) => p.reason === 'trending')).toBe(true);

  const personal = await request.get(`${gatewayURL}/api/recommendations/posts`, {
    headers,
    params: { limit: 100 },
  });
  expect(personal.status()).toBe(200);
  expect((await personal.json()).map((p: { id: number }) => p.id)).not.toContain(post.id);
});
