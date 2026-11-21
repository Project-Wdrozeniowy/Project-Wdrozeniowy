import {
  test,
  expect,
  apiResponse,
  signIn,
  expectSignedIn,
  signOutThroughMenu,
} from '../support/fixtures.js';

test('registers through the browser and displays the authenticated session', async ({
  page,
  identity,
}) => {
  await page.goto('/register');
  await page.getByLabel('Username', { exact: true }).fill(identity.username);
  // Interests are unavailable until the backend has a contract (PWDRZ-154): never sent.
  await page.getByLabel('Display Name', { exact: true }).fill('E2E User');
  await page.getByLabel('Email', { exact: true }).fill(identity.email);
  await page.getByLabel('Password', { exact: true }).fill(identity.password);
  await page.getByLabel('Confirm Password', { exact: true }).fill(identity.password);
  await page.getByRole('checkbox').check();
  const registration = apiResponse(page, '/auth/register', 'POST');
  const profile = apiResponse(page, '/users/me', 'GET');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  const registered = await registration;
  expect(registered.status()).toBe(201);
  // The display name goes out as `displayName`, and nothing else beyond the API's fields.
  expect(JSON.parse(registered.request().postData() ?? '{}')).toEqual({
    username: identity.username,
    email: identity.email,
    password: identity.password,
    displayName: 'E2E User',
  });
  const loaded = await profile;
  expect(loaded.status()).toBe(200);
  const me = await loaded.json();
  expect(me.username).toBe(identity.username);
  expect(me.displayName).toBe('E2E User');
  await expectSignedIn(page);
});

test('signs in, restores the session after reload, and remains signed out after logout', async ({
  page,
  account,
}) => {
  await signIn(page, account);
  const profile = apiResponse(page, '/users/me', 'GET');
  await page.reload();
  const loaded = await profile;
  expect(loaded.status()).toBe(200);
  expect((await loaded.json()).username).toBe(account.username);
  await expectSignedIn(page);
  const logout = apiResponse(page, '/auth/logout', 'POST');
  await signOutThroughMenu(page);
  expect((await logout).status()).toBe(204);
  // Signed out: the header offers to sign in again (the buttons show from 768px up).
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Sign in', exact: true })
  ).toBeVisible();
  const rejectedProfile = apiResponse(page, '/users/me', 'GET');
  await page.reload();
  expect((await rejectedProfile).status()).toBe(401);
  await expect(page.getByRole('banner').getByRole('link', { name: /sign in/i })).toBeVisible();
  // No document.cookie, browser token storage, or inspection of HttpOnly values.
  // Reusing the server session after logout is rejected; no automatic restoration exists.
});

test('corrects rejected credentials and reconciles both tabs after each submission', async ({
  page,
  context,
  account,
}) => {
  const other = await context.newPage();
  await other.goto('/');
  const guestLink = other.getByRole('banner').getByRole('link', { name: /sign in/i });
  await expect(guestLink).toBeVisible();
  let loginCount = 0;
  context.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/login') {
      loginCount++;
    }
  });
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(account.username);
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword123!');
  const login = apiResponse(page, '/auth/login', 'POST');
  const otherGuest = apiResponse(other, '/users/me', 'GET');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await login).status()).toBe(401);
  await expect(page.getByText('Invalid username or password', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect((await otherGuest).status()).toBe(401);
  await expect(guestLink).toBeVisible();
  for (const tab of [page, other]) {
    await expect(tab.getByText(/Unable to verify your session/)).toHaveCount(0);
    await expect(tab.getByRole('button', { name: 'Retry session check' })).toHaveCount(0);
  }
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue(account.username);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('WrongPassword123!');
  expect(loginCount).toBe(1);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  const corrected = apiResponse(page, '/auth/login', 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await corrected).status()).toBe(204);
  await expect(page).toHaveURL(/\/$/);
  for (const tab of [page, other]) {
    // The name is in the account menu now, so check the menu says who is signed in.
    await tab.getByRole('button', { name: 'Account menu' }).click();
    await expect(tab.getByText(`Signed in as ${account.username}`, { exact: true })).toBeVisible();
    await tab.keyboard.press('Escape');
  }
  expect(loginCount).toBe(2);
});

test('rejects an unknown username with the same local credential error', async ({
  page,
  identity,
}) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(identity.username);
  await page.getByLabel('Password', { exact: true }).fill(identity.password);
  const login = apiResponse(page, '/auth/login', 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await login).status()).toBe(401);
  await expect(page.getByText('Invalid username or password', { exact: true })).toBeVisible();
  await expect(page.getByText(/Unable to verify your session/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry session check' })).toHaveCount(0);
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue(identity.username);
});

test('retains registration fields after an occupied username is rejected', async ({
  page,
  account,
}) => {
  await page.goto('/register');
  const email = 'new-' + account.email;
  await page.getByLabel('Username', { exact: true }).fill(account.username);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByLabel('Confirm Password', { exact: true }).fill(account.password);
  await page.getByRole('checkbox').check();
  const registration = apiResponse(page, '/auth/register', 'POST');
  await page.getByRole('button', { name: 'Create Account' }).click();
  expect((await registration).status()).toBe(409);
  await expect(page.getByText('This username is already taken', { exact: true })).toBeVisible();
  await expect(page.getByText(/Unable to verify your session/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry session check' })).toHaveCount(0);
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue(account.username);
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(email);
  await expect(page.getByLabel('Confirm Password', { exact: true })).toHaveValue(account.password);
  await expect(page.getByRole('checkbox')).toBeChecked();
});

for (const [name, size] of [
  ['on a desktop', { width: 1440, height: 900 }],
  ['on a phone', { width: 390, height: 844 }],
] as const) {
  test(`the sign-in and sign-up pages have no dead ends ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    for (const [path, other] of [
      ['/login', '/register'],
      ['/register', '/login'],
    ] as const) {
      await page.goto(path);
      await expect(page.locator('form')).toBeVisible();

      // No recovery link ending in a 404; the form says recovery is not available.
      await expect(page.getByRole('link', { name: /forgot/i })).toHaveCount(0);
      if (path === '/login') {
        await expect(page.getByText('Password recovery is not available yet.')).toBeVisible();
      }

      // The social providers are shown as unavailable, not as buttons that do nothing.
      for (const provider of ['Google', 'GitHub', 'Discord']) {
        await expect(page.getByRole('button', { name: provider })).toHaveCount(0);
        await expect(page.getByRole('link', { name: provider })).toHaveCount(0);
      }
      await expect(page.getByText(/is not available yet\. Use the form above\./)).toBeVisible();

      // Every link in the form goes to a page that exists.
      const links = page.locator('form a[href]');
      await expect(links).toHaveCount(1);
      await links.first().click();
      await expect(page).toHaveURL(other);
      await expect(page.locator('form')).toBeVisible();
      await expect(page.getByText(/page not found/i)).toHaveCount(0);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
    }
  });
}
