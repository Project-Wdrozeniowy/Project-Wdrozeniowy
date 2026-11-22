import {
  test,
  expect,
  signIn,
  expectSignedIn,
  apiResponse,
  gatewayURL,
  csrfHeaders,
} from '../support/fixtures.js';

// PWDRZ-108: the settings page against the real backend. Profile edits go through
// PATCH /api/users/me, the password change through POST /api/users/me/password.
test('saves account fields through PATCH /api/users/me and keeps them after a reload', async ({
  page,
  account,
}) => {
  await signIn(page, account);
  await page.goto('/settings/profile');
  const form = page.getByRole('form', { name: 'Profile information' });
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
  const reloaded = page.getByRole('form', { name: 'Profile information' });
  await expect(reloaded.getByLabel('Display name', { exact: true })).toHaveValue(displayName);
  await expect(reloaded.getByLabel('Avatar link', { exact: true })).toHaveValue(avatarUrl);

  // The saved name is the same on every screen that shows it: the profile, the account menu and the
  // sidebar card (PWDRZ-60).
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: displayName })).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByText(`Signed in as ${displayName}`, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('complementary').getByText(displayName, { exact: true })
  ).toBeVisible();
});

test('changes the password through POST /api/users/me/password and forces a new sign-in', async ({
  page,
  account,
  request,
}) => {
  const newPassword = 'E2eNewPassword456!';
  await signIn(page, account);
  await page.goto('/settings/account');
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
    headers: await csrfHeaders(request),
    data: { username: account.username, password: account.password },
  });
  expect(withOld.status()).toBe(401);
  const withNew = await request.post(`${gatewayURL}/api/auth/login`, {
    headers: await csrfHeaders(request),
    data: { username: account.username, password: newPassword },
  });
  expect(withNew.status()).toBe(204);

  // Signing in again through the page works with the new password.
  await signIn(page, { ...account, password: newPassword });
  await expectSignedIn(page);
});

// PWDRZ-108: the profile section against the real backend, as a person uses it: a rejected value is
// said and corrected, a draft can be discarded, leaving with a draft asks first, and the way back
// to the profile shows the saved name. Nothing is mocked.
test('validation, correction, discard, leaving with a draft, and the way back to the profile', async ({
  page,
  account,
}) => {
  await signIn(page, account);
  await page.goto('/settings/profile');
  // The settings use the whole width: no sidebar.
  await expect(page.getByRole('complementary')).toHaveCount(0);
  const form = page.getByRole('form', { name: 'Profile information' });

  // A rejected value is said next to its field, nothing is sent, and the draft is kept.
  const patches: string[] = [];
  page.on('request', (call) => {
    if (call.method() === 'PATCH' && new URL(call.url()).pathname === '/api/users/me') {
      patches.push(call.url());
    }
  });
  await form.getByLabel('Avatar link', { exact: true }).fill('not a link');
  await form.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    form.getByText('Please enter a full link starting with http:// or https://')
  ).toBeVisible();
  expect(patches).toHaveLength(0);
  await expect(form.getByLabel('Avatar link', { exact: true })).toHaveValue('not a link');

  // Corrected, it is saved.
  const saved = apiResponse(page, '/users/me', 'PATCH');
  await form.getByLabel('Avatar link', { exact: true }).fill('https://example.com/me.png');
  await form.getByRole('button', { name: 'Save changes', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText('Profile saved.')).toBeVisible();

  // Discard throws the draft away and disables Save again.
  const bio = form.getByLabel('Bio', { exact: true });
  const before = await bio.inputValue();
  await bio.fill(`${before} a draft`);
  await form.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(bio).toHaveValue(before);
  await expect(form.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();

  // Leaving with a draft asks first; staying keeps it, leaving drops it.
  await bio.fill(`${before} another draft`);
  await page.getByRole('link', { name: 'View profile', exact: true }).click();
  await expect(page.getByText('Leave without saving?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(bio).toHaveValue(`${before} another draft`);
  await page.getByRole('link', { name: 'View profile', exact: true }).click();
  await page.getByRole('button', { name: 'Leave and discard changes' }).click();
  await expect(page).toHaveURL(/\/profile$/);

  // The profile shows what was saved, and the way to the settings is there.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Edit profile', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(
    page
      .getByRole('form', { name: 'Profile information' })
      .getByLabel('Avatar link', { exact: true })
  ).toHaveValue('https://example.com/me.png');
});

test('a wrong current password is said, nothing is changed, and the session stays', async ({
  page,
  account,
}) => {
  await signIn(page, account);
  await page.goto('/settings/account');
  const form = page.getByRole('form', { name: 'Change password' });
  await form.getByLabel('Current password', { exact: true }).fill('NotMyPassword123!');
  await form.getByLabel('New password', { exact: true }).fill('E2eNewPassword456!');
  await form.getByLabel('Repeat new password', { exact: true }).fill('E2eNewPassword456!');
  await form.getByRole('button', { name: 'Change password', exact: true }).click();

  const changed = apiResponse(page, '/users/me/password', 'POST');
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Change password and sign out' })
    .click();
  expect((await changed).status()).toBeGreaterThanOrEqual(400);
  await expect(page.getByText('Your current password is incorrect')).toBeVisible();

  // Still on the page and still signed in, also after a reload: the old password still works.
  await expect(page).toHaveURL(/\/settings\/account$/);
  await page.reload();
  await expectSignedIn(page);
});
