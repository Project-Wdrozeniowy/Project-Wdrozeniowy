import { test, expect, apiResponse, signIn } from '../support/fixtures.js';

test('registers through the browser and displays the authenticated session', async ({
  page,
  identity,
}) => {
  await page.goto('/register');
  await page.getByLabel('Username', { exact: true }).fill(identity.username);
  // Provisional: PWDRZ-128 owns displayName mapping; PWDRZ-154 owns interests.
  // This scenario verifies implemented auth, not persistence of those fields.
  await page.getByLabel('Display Name', { exact: true }).fill('E2E User');
  await page.getByLabel('Email', { exact: true }).fill(identity.email);
  await page.getByLabel('Password', { exact: true }).fill(identity.password);
  await page.getByLabel('Confirm Password', { exact: true }).fill(identity.password);
  await page.getByRole('checkbox').check();
  const registration = apiResponse(page, '/auth/register', 'POST');
  const profile = apiResponse(page, '/users/me', 'GET');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  expect((await registration).status()).toBe(201);
  const loaded = await profile;
  expect(loaded.status()).toBe(200);
  expect((await loaded.json()).username).toBe(identity.username);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
});

test('signs in, restores the session after reload, and remains signed out after logout', async ({
  page,
  account,
}) => {
  await signIn(page, account);
  const refresh = apiResponse(page, '/auth/refresh', 'POST');
  const profile = apiResponse(page, '/users/me', 'GET');
  await page.reload();
  expect((await refresh).status()).toBe(200);
  const loaded = await profile;
  expect(loaded.status()).toBe(200);
  expect((await loaded.json()).username).toBe(account.username);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  const logout = apiResponse(page, '/auth/logout', 'POST');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  expect((await logout).status()).toBe(204);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
  const rejectedRefresh = apiResponse(page, '/auth/refresh', 'POST');
  await page.reload();
  expect((await rejectedRefresh).status()).toBe(401);
  await expect(page.getByRole('banner').getByRole('link', { name: /sign in/i })).toBeVisible();
  // No document.cookie, browser token storage, or inspection of HttpOnly values.
  // Stateless access JWT revocation is not asserted as a logout guarantee.
});

test('rejects wrong credentials without creating an authenticated browser session', async ({
  page,
  account,
}) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(account.username);
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword123!');
  const login = apiResponse(page, '/auth/login', 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await login).status()).toBe(401);
  await expect(page.getByText('Invalid username or password', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
});
