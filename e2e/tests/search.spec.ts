import { test, expect, gatewayURL } from '../support/fixtures.js';

// PWDRZ-106: the header search and the results page against the real GET /api/search
// (PWDRZ-151). The request URL and the response payload are attached to the report, so the
// endpoint and parameters the UI used are on record.
test('searches through the one documented endpoint and shows the persisted user', async ({
  page,
  account,
}, testInfo) => {
  const searchRequests: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.includes('search')) searchRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto('/');
  const input = page.getByRole('combobox', { name: 'Search posts, users and tags' });

  const preview = page.waitForResponse(
    (response) =>
      response.url().startsWith(`${gatewayURL}/api/search?`) &&
      response.request().method() === 'GET'
  );
  await input.fill(account.username);
  const previewResponse = await preview;
  const previewURL = new URL(previewResponse.url());
  expect(previewURL.pathname).toBe('/api/search');
  expect(Object.fromEntries(previewURL.searchParams)).toEqual({ q: account.username, size: '3' });
  expect(previewResponse.status()).toBe(200);
  const previewBody = await previewResponse.json();
  expect(previewBody.users.content.map((u: { username: string }) => u.username)).toContain(
    account.username
  );
  await testInfo.attach('header-search-preview.json', {
    body: JSON.stringify({ request: previewResponse.url(), response: previewBody }, null, 2),
    contentType: 'application/json',
  });
  await expect(page.getByText(`@${account.username}`)).toBeVisible();

  const results = page.waitForResponse(
    (response) =>
      response.url().startsWith(`${gatewayURL}/api/search?`) &&
      new URL(response.url()).searchParams.get('size') === '5'
  );
  await input.press('Enter');
  await expect(page).toHaveURL(`/search?q=${encodeURIComponent(account.username)}`);
  const resultsResponse = await results;
  expect(Object.fromEntries(new URL(resultsResponse.url()).searchParams)).toEqual({
    q: account.username,
    page: '0',
    size: '5',
  });
  await testInfo.attach('search-page.json', {
    body: JSON.stringify(
      { request: resultsResponse.url(), response: await resultsResponse.json() },
      null,
      2
    ),
    contentType: 'application/json',
  });
  await expect(page.getByText(`@${account.username}`)).toBeVisible();

  // Only the documented endpoint was called, and always with GET.
  for (const entry of searchRequests) {
    expect(entry).toMatch(new RegExp(`^GET ${gatewayURL}/api/search\\?`));
  }
});
