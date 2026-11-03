import { test, expect, signIn, gatewayURL, apiResponse } from '../support/fixtures.js';

test('publishes a persisted post and casts, switches and retracts its vote through generated bindings', async ({
  page,
  account,
  request,
}) => {
  await signIn(page, account);
  await page.goto('/forum');
  await page.getByRole('button', { name: 'Create Post', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const title = `E2E published ${account.username}`;
  const content = 'A real browser publication persisted by the backend in the isolated database.';
  await dialog.getByRole('textbox', { name: /^Title/ }).fill(title);
  await dialog.getByRole('textbox', { name: /^Title/ }).press('Tab');
  await dialog.getByRole('combobox', { name: /^Category/ }).selectOption({ label: 'AI / Tech' });
  await dialog.getByRole('combobox', { name: /^Category/ }).press('Tab');
  await dialog.getByRole('textbox', { name: /^Body/ }).fill(content);
  await dialog.getByRole('textbox', { name: /^Body/ }).press('Tab');
  const publication = page.waitForResponse(
    (response) =>
      response.url() === `${gatewayURL}/api/forum/posts` && response.request().method() === 'POST'
  );
  await dialog.getByRole('button', { name: 'Publish post', exact: true }).click();
  const response = await publication;
  expect(response.status()).toBe(201);
  const post = await response.json();
  expect(post.title).toBe(title);
  expect(post.content).toBe(content);
  await expect(dialog.getByRole('status')).toContainText('Post published!');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const stored = await request.get(`${gatewayURL}/api/forum/posts/${post.slug}`);
  expect(stored.status()).toBe(200);
  expect((await stored.json()).content).toBe(content);
  expect(post.subscribed).toBe(false);

  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  const cast = apiResponse(page, '/forum/votes', 'POST');
  await card.getByRole('button', { name: 'Upvote', exact: true }).click();
  const castResponse = await cast;
  expect(castResponse.status()).toBe(201);
  const vote = await castResponse.json();
  expect(vote.newScore).toBe(1);
  expect(vote.voteType).toBe('UP');
  await expect(card.getByRole('button', { name: 'Upvote' })).toHaveClass(/text-blue-400/);

  // Reload proves the personal vote comes back through the generated feed query and bearer.
  await page.reload();
  await expect(card.getByRole('button', { name: 'Upvote' })).toHaveClass(/text-blue-400/);
  const switched = apiResponse(page, '/forum/votes', 'POST');
  await card.getByRole('button', { name: 'Downvote', exact: true }).click();
  const switchedResponse = await switched;
  expect(switchedResponse.status()).toBe(200);
  expect((await switchedResponse.json()).newScore).toBe(-1);
  await expect(card.getByRole('button', { name: 'Downvote' })).toHaveClass(/text-red-400/);

  const retracted = apiResponse(page, `/forum/votes/${vote.id}`, 'DELETE');
  await card.getByRole('button', { name: 'Downvote', exact: true }).click();
  expect((await retracted).status()).toBe(204);
  await expect(card.getByRole('button', { name: 'Downvote' })).not.toHaveClass(/text-red-400/);
  const afterRetract = await request.get(`${gatewayURL}/api/forum/posts/${post.slug}`);
  expect((await afterRetract.json()).voteScore).toBe(0);
  // The detail page is still a placeholder. Do not present it as implemented
  // or mock comments (PWDRZ-142/67) to make a detail-page scenario pass.
});
