import { test, expect, signIn, apiResponse, gatewayURL } from '../support/fixtures.js';

// PWDRZ-108: the settings page against the real backend. Account edits go through
// PATCH /api/users/me, the password change through POST /api/users/me/password.
test('saves account fields through PATCH /api/users/me and keeps them after a reload', async ({
  page,
  account,
}) => {
  await signIn(page, account);
  await page.goto('/settings');
  const form = page.getByRole('form', { name: 'Account settings' });
  const displayName = `E2E ${account.username}`.slice(0, 60);
  const avatarUrl = 'https://example.com/avatar.png';
  await form.getByLabel('Display name', { exact: true }).fill(displayName);
  await form.getByLabel('Avatar link', { exact: true }).fill(avatarUrl);

  const saved = apiResponse(page, '/users/me', 'PATCH');
  await form.getByRole('button', { name: 'Save changes', exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(JSON.parse(response.request().postData() ?? '{}')).toEqual({ displayName, avatarUrl });
  const profile = await response.json();
  expect(profile.displayName).toBe(displayName);
  expect(profile.avatarUrl).toBe(avatarUrl);

  await page.reload();
  const reloaded = page.getByRole('form', { name: 'Account settings' });
  await expect(reloaded.getByLabel('Display name', { exact: true })).toHaveValue(displayName);
  await expect(reloaded.getByLabel('Avatar link', { exact: true })).toHaveValue(avatarUrl);
});

test('changes the password through POST /api/users/me/password and forces a new sign-in', async ({
  page,
  account,
  request,
}) => {
  const newPassword = 'E2eNewPassword456!';
  await signIn(page, account);
  await page.goto('/settings');
  const form = page.getByRole('form', { name: 'Change password' });
  await form.getByLabel('Current password', { exact: true }).fill(account.password);
  await form.getByLabel('New password', { exact: true }).fill(newPassword);
  await form.getByLabel('Repeat new password', { exact: true }).fill(newPassword);
  await form.getByRole('button', { name: 'Change password', exact: true }).click();

  // The change ends every session, so it must be confirmed first.
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('signs you out on all devices');

  const changed = apiResponse(page, '/users/me/password', 'POST');
  await dialog.getByRole('button', { name: 'Change password and sign out' }).click();
  const response = await changed;
  expect(response.status()).toBe(204);
  expect(JSON.parse(response.request().postData() ?? '{}')).toEqual({
    currentPassword: account.password,
    newPassword,
  });

  await expect(page).toHaveURL(/\/login$/);
  // The session is gone: a reload of a protected page does not restore it.
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/login$/);

  const withOld = await request.post(`${gatewayURL}/api/auth/login`, {
    data: { username: account.username, password: account.password },
  });
  expect(withOld.status()).toBe(401);
  const withNew = await request.post(`${gatewayURL}/api/auth/login`, {
    data: { username: account.username, password: newPassword },
  });
  expect(withNew.status()).toBe(200);
});
