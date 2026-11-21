import { randomBytes } from 'node:crypto';
import {
  test as base,
  expect,
  type Page,
  type Response,
  type APIRequestContext,
} from '@playwright/test';

export interface Identity {
  username: string;
  email: string;
  password: string;
}

export const gatewayURL = process.env.E2E_GATEWAY_URL!;

export async function csrfHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const response = await request.get(`${gatewayURL}/api/auth/csrf`);
  expect(response.status()).toBe(200);
  const csrf = (await response.json()) as { token: string; headerName: string };
  return { [csrf.headerName]: csrf.token };
}

export async function apiSignIn(
  request: APIRequestContext,
  identity: Identity
): Promise<Record<string, string>> {
  const response = await request.post(`${gatewayURL}/api/auth/login`, {
    headers: await csrfHeaders(request),
    data: { username: identity.username, password: identity.password },
  });
  expect(response.status()).toBe(204);
  return csrfHeaders(request);
}

export function apiResponse(page: Page, route: string, method: string): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url() === `${gatewayURL}/api${route}` && response.request().method() === method
  );
}

export const test = base.extend<{ identity: Identity; account: Identity }>({
  // The storage banner has its own spec (consent.spec.ts). Every other spec runs as a returning
  // visitor who already answered, so the banner does not sit above the page under test.
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        if (localStorage.getItem('orbita.consent') === null) {
          localStorage.setItem('orbita.consent', 'denied');
        }
      } catch {
        // Storage blocked: the banner would show, which these specs tolerate.
      }
    });
    await use(page);
  },
  identity: async ({}, use) => {
    const username = `e2e_${randomBytes(10).toString('hex')}`;
    await use({ username, email: `${username}@example.test`, password: 'E2ePassword123!' });
  },
  account: async ({ request, identity }, use) => {
    // API setup is not claimed as browser registration coverage. The independent
    // browser context has no session cookie; browser tests sign in through UI.
    const response = await request.post(`${gatewayURL}/api/auth/register`, {
      headers: await csrfHeaders(request),
      data: identity,
    });
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
  expect((await login).status()).toBe(204);
  const profileResponse = await profile;
  expect(profileResponse.status()).toBe(200);
  expect((await profileResponse.json()).username).toBe(identity.username);
  await expectSignedIn(page);
}

/**
 * A signed-in user has the account menu, and "Sign out" in it. (The menu is behind the user icon at
 * every width, so the page itself has no "Sign out" until it is opened.)
 */
export async function expectSignedIn(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
}

/** Signs out through the account menu. */
export async function signOutThroughMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
}

export { expect };
