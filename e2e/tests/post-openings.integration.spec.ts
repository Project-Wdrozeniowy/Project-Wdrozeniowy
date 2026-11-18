import { randomUUID } from 'node:crypto';
import { request as apiRequest, type APIRequestContext } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn, csrfHeaders } from '../support/fixtures.js';

// PWDRZ-165: an opening counts once per openingId, for members and guests, and reading a post
// counts nothing. API-level evidence through the real gateway and backend.
test('integration: openings count once per id and reads count nothing', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Opening check ${account.username}`,
      content: 'A post whose openings are counted.',
      categoryId: categories[0].id,
      tags: [`e2e-${account.username.slice(-8)}`],
    },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  const open = (
    context: APIRequestContext,
    openingHeaders: Record<string, string>,
    openingId: string
  ) =>
    context.post(`${gatewayURL}/api/forum/posts/${slug}/openings`, {
      headers: openingHeaders,
      data: { openingId },
    });
  const viewCount = async () =>
    (await (await request.get(`${gatewayURL}/api/forum/posts/${slug}`)).json()).viewCount;

  expect(await viewCount()).toBe(0);

  const memberOpening = randomUUID();
  expect((await open(request, headers, memberOpening)).status()).toBe(204);
  expect(await viewCount()).toBe(1);
  expect((await open(request, headers, memberOpening)).status()).toBe(204);
  expect(await viewCount()).toBe(1);

  const guest = await apiRequest.newContext();
  try {
    const guestHeaders = await csrfHeaders(guest);
    expect((await open(guest, guestHeaders, randomUUID())).status()).toBe(204);
    expect(await viewCount()).toBe(2);

    const missing = await guest.post(`${gatewayURL}/api/forum/posts/no-such-${slug}/openings`, {
      headers: guestHeaders,
      data: { openingId: randomUUID() },
    });
    expect(missing.status()).toBe(404);

    const invalid = await open(guest, guestHeaders, 'not-a-uuid');
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).errors.openingId).toBe('openingId must be a UUID');
  } finally {
    await guest.dispose();
  }
  expect(await viewCount()).toBe(2);
});
