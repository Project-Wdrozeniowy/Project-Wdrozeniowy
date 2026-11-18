import { randomUUID } from 'node:crypto';
import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn, csrfHeaders } from '../support/fixtures.js';

test('integration: post summaries separate public and author access without recording openings', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Engagement ${account.username}`,
      content: 'Summary fixture',
      categoryId: categories[0].id,
    },
  });
  expect(created.status()).toBe(201);
  const { id, slug } = await created.json();
  const publicURL = `${gatewayURL}/api/analytics/public/posts/${id}`;
  const ownerURL = `${gatewayURL}/api/analytics/me/posts/${id}`;
  const postURL = `${gatewayURL}/api/forum/posts/${slug}`;
  const guest = await apiRequest.newContext();
  const reader = await apiRequest.newContext();
  try {
    const username = `e2e_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const other = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
    expect(
      (
        await reader.post(`${gatewayURL}/api/auth/register`, {
          headers: await csrfHeaders(reader),
          data: other,
        })
      ).status()
    ).toBe(201);
    const readerHeaders = await apiSignIn(reader, other);
    expect(
      (
        await reader.post(`${postURL}/comments`, {
          headers: readerHeaders,
          data: { content: 'Persisted visible reply' },
        })
      ).status()
    ).toBe(201);
    expect(
      (
        await reader.post(`${gatewayURL}/api/forum/votes`, {
          headers: readerHeaders,
          data: { entityType: 'POST', entityId: id, voteType: 'UP' },
        })
      ).status()
    ).toBe(201);
    const openingId = randomUUID();
    for (const identity of [openingId, openingId, randomUUID()]) {
      expect(
        (
          await request.post(`${postURL}/openings`, { headers, data: { openingId: identity } })
        ).status()
      ).toBe(204);
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await guest.get(publicURL);
      expect(result.status()).toBe(200);
      expect(result.headers()['cache-control']).toContain('no-store');
      const summary = await result.json();
      expect(Object.keys(summary).sort()).toEqual([
        'collectedFrom',
        'commentCount',
        'postId',
        'viewCount',
        'voteScore',
      ]);
      expect(summary).toMatchObject({ postId: id, viewCount: 2, commentCount: 1, voteScore: 1 });
      expect(summary.collectedFrom).toBeTruthy();
    }
    const head = await guest.head(publicURL);
    expect(head.status()).toBe(200);
    expect(await head.body()).toHaveLength(0);
    expect(head.headers()['cache-control']).toContain('no-store');
    expect((await guest.get(ownerURL)).status()).toBe(401);
    expect((await reader.get(ownerURL)).status()).toBe(404);
    const author = await (await request.get(ownerURL)).json();
    expect(Object.keys(author).sort()).toEqual([
      'collectedFrom',
      'commentCount',
      'downvoteCount',
      'postId',
      'upvoteCount',
      'viewCount',
      'voteScore',
    ]);
    expect(author).toMatchObject({ upvoteCount: 1, downvoteCount: 0, viewCount: 2 });

    expect((await request.patch(postURL, { headers, data: { status: 'DRAFT' } })).status()).toBe(
      200
    );
    expect((await guest.get(publicURL)).status()).toBe(404);
    expect((await request.get(publicURL)).status()).toBe(404);
    expect((await reader.get(ownerURL)).status()).toBe(404);
    expect(await (await request.get(ownerURL)).json()).toMatchObject({
      viewCount: 2,
      commentCount: 1,
    });
    expect(
      (await request.patch(postURL, { headers, data: { status: 'PUBLISHED' } })).status()
    ).toBe(200);
    expect(await (await guest.get(publicURL)).json()).toMatchObject({ viewCount: 2, voteScore: 1 });
    expect(await (await guest.get(postURL)).json()).toMatchObject({ viewCount: 2 });
    expect((await request.delete(postURL, { headers })).status()).toBe(204);
    expect((await guest.get(publicURL)).status()).toBe(404);
    expect((await request.get(ownerURL)).status()).toBe(404);
  } finally {
    await guest.dispose();
    await reader.dispose();
  }
});
