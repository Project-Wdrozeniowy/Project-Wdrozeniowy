import { randomUUID } from 'node:crypto';
import { request as apiRequest } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn, csrfHeaders } from '../support/fixtures.js';

// PWDRZ-194: backend acceptance through the real gateway, independent of PostPage.
test('integration: unpublishing removes public activity and preserves private history', async ({
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const tag = `visibility-${randomUUID().slice(0, 8)}`;
  const content = 'Persisted body retained across publication changes.';
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: { title: tag, content, categoryId: categories[0].id, tags: [tag] },
  });
  expect(created.status()).toBe(201);
  const post = await created.json();
  const path = `${gatewayURL}/api/forum/posts/${post.slug}`;
  expect(
    (
      await request.post(`${path}/comments`, { headers, data: { content: 'Retained discussion' } })
    ).status()
  ).toBe(201);
  expect(
    (
      await request.post(`${path}/openings`, { headers, data: { openingId: randomUUID() } })
    ).status()
  ).toBe(204);
  const guest = await apiRequest.newContext();
  const stranger = await apiRequest.newContext();
  try {
    const username = `e2e_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const other = { username, email: `${username}@example.test`, password: 'E2ePassword123!' };
    expect(
      (
        await stranger.post(`${gatewayURL}/api/auth/register`, {
          headers: await csrfHeaders(stranger),
          data: other,
        })
      ).status()
    ).toBe(201);
    const strangerHeaders = await apiSignIn(stranger, other);
    expect(
      (await stranger.patch(path, { headers: strangerHeaders, data: { status: 'DRAFT' } })).status()
    ).toBe(403);
    expect((await request.patch(path, { data: { status: 'DRAFT' } })).status()).toBe(403);
    expect(
      (
        await stranger.post(`${gatewayURL}/api/forum/votes`, {
          headers: strangerHeaders,
          data: { entityType: 'POST', entityId: post.id, voteType: 'UP' },
        })
      ).status()
    ).toBe(201);
    const activityURL = `${gatewayURL}/api/analytics/public/activity?period=7d`;
    const profileURL = `${gatewayURL}/api/users/${account.username}`;
    const publicBefore = await (await guest.get(activityURL)).json();
    expect(await (await guest.get(profileURL)).json()).toMatchObject({
      postCount: 1,
      commentCount: 1,
    });
    expect(
      (
        await guest.patch(path, { headers: await csrfHeaders(guest), data: { status: 'DRAFT' } })
      ).status()
    ).toBe(401);

    const hidden = await request.patch(path, { headers, data: { status: 'DRAFT' } });
    expect(hidden.status()).toBe(200);
    expect(await hidden.json()).toMatchObject({
      id: post.id,
      slug: post.slug,
      title: post.title,
      content,
      category: { id: categories[0].id },
      tags: [{ slug: tag }],
      status: 'DRAFT',
    });
    expect((await guest.get(path)).status()).toBe(404);
    expect((await stranger.get(path)).status()).toBe(404);
    expect((await guest.get(`${path}/comments`)).status()).toBe(404);
    const publicHidden = await (await guest.get(activityURL)).json();
    expect(publicHidden.totalPosts).toBe(publicBefore.totalPosts - 1);
    expect(publicHidden.totalComments).toBe(publicBefore.totalComments - 1);
    expect(await (await guest.get(profileURL)).json()).toMatchObject({
      postCount: 0,
      commentCount: 0,
    });
    expect(await (await request.get(`${gatewayURL}/api/users/me`)).json()).toMatchObject({
      commentCount: 1,
    });
    const tags = await (await guest.get(`${gatewayURL}/api/forum/tags`)).json();
    expect(tags.map((item: { slug: string }) => item.slug)).not.toContain(tag);
    const feed = await (
      await guest.get(`${gatewayURL}/api/forum/posts?author=${account.username}`)
    ).json();
    expect(feed.totalElements).toBe(0);
    const search = await (await guest.get(`${gatewayURL}/api/search?q=${tag}`)).json();
    expect(search.posts.totalElements).toBe(0);
    const recommendations = await (
      await guest.get(`${gatewayURL}/api/recommendations/posts?limit=100`)
    ).json();
    expect(recommendations.map((item: { id: number }) => item.id)).not.toContain(post.id);
    expect(
      await (await request.get(`${gatewayURL}/api/analytics/me/posts/${post.id}/openings`)).json()
    ).toMatchObject({ totalOpenings: 1 });

    const published = await request.patch(path, { headers, data: { status: 'PUBLISHED' } });
    expect(published.status()).toBe(200);
    expect(await (await guest.get(path)).json()).toMatchObject({
      id: post.id,
      slug: post.slug,
      title: post.title,
      content,
      category: { id: categories[0].id },
      tags: [{ slug: tag }],
      viewCount: 1,
      voteScore: 1,
    });
    const discussion = await (await guest.get(`${path}/comments`)).json();
    expect(discussion.content[0].content).toBe('Retained discussion');
    expect(await (await guest.get(profileURL)).json()).toMatchObject({
      postCount: 1,
      commentCount: 1,
    });
    const restored = await (await guest.get(activityURL)).json();
    expect(restored.totalPosts).toBe(publicBefore.totalPosts);
    expect(restored.totalComments).toBe(publicBefore.totalComments);

    expect((await request.delete(path, { headers })).status()).toBe(204);
    expect((await guest.get(path)).status()).toBe(404);
    expect(await (await guest.get(profileURL)).json()).toMatchObject({
      postCount: 0,
      commentCount: 0,
    });
    expect(
      (await request.get(`${gatewayURL}/api/analytics/me/posts/${post.id}/openings`)).status()
    ).toBe(404);
  } finally {
    await guest.dispose();
    await stranger.dispose();
  }
});
