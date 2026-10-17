import { randomBytes } from 'node:crypto';
import { test as base, expect, type Page, type Response } from '@playwright/test';

export interface Identity {
  username: string;
  email: string;
  password: string;
}

export const gatewayURL = process.env.E2E_GATEWAY_URL!;

export function apiResponse(page: Page, route: string, method: string): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url() === `${gatewayURL}/api${route}` && response.request().method() === method
  );
}

export const test = base.extend<{ identity: Identity; account: Identity }>({
  identity: async ({}, use) => {
    const username = `e2e_${randomBytes(10).toString('hex')}`;
    await use({ username, email: `${username}@example.test`, password: 'E2ePassword123!' });
  },
  account: async ({ request, identity }, use) => {
    // API setup is not claimed as browser registration coverage. The independent
    // browser context has no session cookie; browser tests sign in through UI.
    const response = await request.post(`${gatewayURL}/api/auth/register`, { data: identity });
    expect(response.status()).toBe(201);
    await use(identity);
    // No user-delete backdoor: the managed database is destroyed after the run.
  },
});

export async function signIn(page: Page, identity: Identity): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(identity.username);
  await page.getByLabel('Password', { exact: true }).fill(identity.password);
  const login = apiResponse(page, '/auth/login', 'POST');
  const profile = apiResponse(page, '/users/me', 'GET');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await login).status()).toBe(200);
  const profileResponse = await profile;
  expect(profileResponse.status()).toBe(200);
  expect((await profileResponse.json()).username).toBe(identity.username);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}

export { expect };
