import { test, expect, gatewayURL, apiSignIn, signIn } from '../support/fixtures.js';

type Figures = { current: number };
type Comparison = { posts: Figures; comments: Figures };
type TrendingPost = { title: string; slug: string };

// The dashboard and the sidebar show what the public analytics API says, not fixed sample numbers.
// The numbers are compared with the API's own answer, so the spec does not depend on what other
// specs left in the shared database.
test('the dashboard and the sidebar show the public analytics of the API', async ({
  page,
  request,
  account,
}, testInfo) => {
  const analyticsRequests: string[] = [];
  page.on('request', (call) => {
    const { pathname, search } = new URL(call.url());
    if (call.url().startsWith(`${gatewayURL}/api/analytics`)) {
      analyticsRequests.push(`${call.method()} ${pathname}${search}`);
    }
  });

  // Some activity of the account: a post with a comment, so the window is not empty.
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get(`${gatewayURL}/api/forum/categories`)).json();
  const created = await request.post(`${gatewayURL}/api/forum/posts`, {
    headers,
    data: {
      title: `Counted ${account.username}`,
      content: 'A post that the analytics count.',
      categoryId: categories[0].id,
    },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();
  const comment = await request.post(`${gatewayURL}/api/forum/posts/${slug}/comments`, {
    headers,
    data: { content: 'A comment that the analytics count.' },
  });
  expect(comment.status()).toBe(201);

  const fetchComparison = async (period: string) =>
    (await (
      await request.get(`${gatewayURL}/api/analytics/public/comparison?period=${period}`)
    ).json()) as Comparison;
  const week = await fetchComparison('7d');
  expect(week.posts.current).toBeGreaterThanOrEqual(1);
  await testInfo.attach('comparison-7d.json', {
    body: JSON.stringify(week, null, 2),
    contentType: 'application/json',
  });

  await signIn(page, account);
  await page.goto('/dashboard');

  // The key figures and the sidebar both show the API's numbers for the last 7 days.
  const figures = page.getByRole('region', { name: 'Key figures' });
  await expect(figures).toContainText(String(week.posts.current));
  await expect(figures).toContainText(String(week.comments.current));
  const sidebar = page.getByRole('region', { name: 'Community activity' });
  await expect(sidebar).toContainText(String(week.posts.current));
  await expect(sidebar).toContainText(String(week.comments.current));

  // The list of the most active posts is the API's list, in the API's order.
  const trending = (await (
    await request.get(`${gatewayURL}/api/analytics/trending-posts?period=7d&limit=5`)
  ).json()) as TrendingPost[];
  const topPosts = page.getByRole('region', { name: 'Most active posts' });
  for (const post of trending) {
    await expect(topPosts.getByRole('link', { name: post.title })).toHaveAttribute(
      'href',
      `/forum/${post.slug}`
    );
  }

  // Nothing is presented that the platform cannot know.
  await expect(page.getByText('Online Users')).toHaveCount(0);
  await expect(page.getByText('Posts per minute')).toHaveCount(0);

  // The 30 day window is asked from the API and shown.
  const month = await fetchComparison('30d');
  const answered = page.waitForResponse(
    (response) =>
      response.url() === `${gatewayURL}/api/analytics/public/comparison?period=30d` &&
      response.request().method() === 'GET'
  );
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  expect((await answered).status()).toBe(200);
  await expect(figures).toContainText(String(month.posts.current));
  await expect(figures).toContainText('Last 30 days');

  // Only the documented, public analytics endpoints (and the user's own totals) were used.
  await testInfo.attach('analytics-requests.txt', {
    body: [...new Set(analyticsRequests)].join('\n'),
    contentType: 'text/plain',
  });
  for (const entry of analyticsRequests) {
    expect(entry).toMatch(
      /^GET \/api\/analytics\/(public\/(comparison|activity|categories)\?period=(7d|30d)|trending-posts\?period=(7d|30d)&limit=5|me)$/
    );
  }
});
