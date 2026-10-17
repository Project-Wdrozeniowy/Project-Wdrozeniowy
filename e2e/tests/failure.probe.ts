import { test, expect } from '../support/fixtures.js';

test('controlled failure: a wrong browser assertion must reject the E2E gate', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome Back', exact: true })).toBeVisible();
  // Only selected by npm run test:probe. This is a genuine failed assertion in
  // a ready browser/application, not a startup failure or an expected-failure test.
  await expect(
    page.getByRole('heading', { name: 'PWDRZ-117 deliberately wrong heading' })
  ).toBeVisible();
});
