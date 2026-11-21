import type { Page } from '@playwright/test';
import { test, expect, gatewayURL, apiSignIn, signIn } from '../support/fixtures.js';

// PWDRZ-28: the application shell at the widths the design is compared at. At each width, for a
// guest and for a member with a very long name and a focused search: every agreed destination is
// reachable, "Create Post" is whole on screen, focus is visible, and the page never scrolls sideways.
const WIDTHS = [1440, 1024, 768, 390, 320] as const;
const LONG_NAME =
  'Bartholomew-Maximilian-Konstantinopolsky-Wolfeschlegelstein-the-Third-of-Valhalla';

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function destinationsReachable(page: Page, width: number, member: boolean) {
  if (width >= 768) {
    // The page links are in the top bar, each with a name; focus lands on them in turn.
    const nav = page.getByRole('banner').getByRole('navigation');
    for (const name of ['Home', 'Forum', 'Analytics']) {
      const link = nav.getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();
      await link.focus();
      await expect(link).toBeFocused();
    }
  } else {
    // Below 768px the page links are a bottom bar, with the profile for a member.
    const bar = page.getByRole('navigation', { name: 'Main navigation' });
    const names = member
      ? ['Home', 'Forum', 'Analytics', 'Profile']
      : ['Home', 'Forum', 'Analytics'];
    for (const name of names) {
      const link = bar.getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();
      await link.focus();
      await expect(link).toBeFocused();
    }
  }
  // The logo link has a name at every width.
  await expect(page.getByRole('link', { name: 'Orbita', exact: true })).toBeVisible();
}

async function createPostWhole(page: Page) {
  const button = page.getByRole('button', { name: /Create Post/ });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
}

async function focusSearchIfShown(page: Page, width: number) {
  // Below 640px the search is an icon that opens its page; from there it is a field that grows.
  if (width < 640) return;
  const search = page.getByRole('combobox');
  await search.click();
  await expect(search).toBeFocused();
}

test('the shell works for a guest at every width the design is compared at', async ({
  page,
}, testInfo) => {
  for (const width of WIDTHS) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/forum', '/dashboard']) {
        await page.goto(path);
        await expect(page).toHaveURL(path);
        await destinationsReachable(page, width, false);
        await focusSearchIfShown(page, width);
        expect(await noSideScroll(page)).toBe(true);
        if (path !== '/dashboard') await createPostWhole(page);
      }
      // A guest has Sign in and Sign up: as buttons from 768px, in the account menu on a phone.
      if (width >= 768) {
        await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeVisible();
      } else {
        await page.getByRole('button', { name: 'Account menu' }).click();
        await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
      }
      await page.goto('/');
      await testInfo.attach(`guest-${width}.png`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    });
  }
});

test('the shell works for a member with a very long name at every width, with a focused search', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const named = await request.patch(`${gatewayURL}/api/users/me`, {
    headers,
    data: { displayName: LONG_NAME.slice(0, 100) },
  });
  expect(named.status()).toBe(200);
  await signIn(page, account);

  for (const width of WIDTHS) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/forum', '/dashboard', '/profile']) {
        await page.goto(path);
        await expect(page).toHaveURL(path);
        await destinationsReachable(page, width, true);
        await focusSearchIfShown(page, width);
        expect(await noSideScroll(page)).toBe(true);
        if (path === '/' || path === '/forum') await createPostWhole(page);
      }

      // The account menu holds the long name without widening the page, and is reachable by keyboard.
      await page.goto('/');
      const menu = page.getByRole('button', { name: 'Account menu' });
      await menu.focus();
      await page.keyboard.press('Enter');
      const signedInAs = page.getByText(/^Signed in as /);
      await expect(signedInAs).toBeVisible();
      await expect(signedInAs).toContainText(LONG_NAME.slice(0, 20));
      expect(await noSideScroll(page)).toBe(true);
      // (The sidebar card has its own Settings and Profile links, so these are the header's.)
      const header = page.getByRole('banner');
      const settings = await header
        .getByRole('link', { name: 'Settings', exact: true })
        .boundingBox();
      expect(settings!.x + settings!.width).toBeLessThanOrEqual(width);
      await expect(header.getByRole('link', { name: 'Profile', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();

      await testInfo.attach(`member-long-name-${width}.png`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    });
  }
});
