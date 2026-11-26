import { test, expect, type Page } from '@playwright/test';
import { gatewayURL } from '../support/fixtures.js';
import { readFileSync } from 'node:fs';

// Independent approved reference, not an application-generated screenshot baseline.
const referenceHtml = readFileSync(
  new URL('../../docs/design/storage-preferences-prototype.html', import.meta.url),
  'utf8'
).replace(
  '/font.woff2',
  'data:font/woff2;base64,' +
    readFileSync(
      new URL(
        '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
        import.meta.url
      )
    ).toString('base64')
);

const PANEL = 'Your storage preferences';
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const theme = (page: Page) => page.locator('html');
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Storage settings' });
const panel = (page: Page) => page.getByRole('region', { name: PANEL });

async function preferences(page: Page) {
  await page.getByRole('button', { name: 'Storage settings', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
}
async function choices(page: Page) {
  return JSON.parse((await stored(page, 'orbita.consent'))!) as {
    version: number;
    decidedAt: number;
    permissions: { theme: boolean; recentSearches: boolean };
  };
}

test.describe('storage preferences', () => {
  // Independent fresh contexts: these cases intentionally bypass the returning-visitor fixture.
  test.use({ baseURL: gatewayURL, colorScheme: 'light' });

  test('first visit, scrolling and cancelling never imply permission', async ({ page }) => {
    await page.goto('/');
    await expect(panel(page)).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    await expect(page.getByRole('button', { name: 'Customize' })).not.toBeFocused();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect(await stored(page, 'orbita.theme')).toBeNull();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(panel(page)).toBeInViewport();
    await page.getByRole('button', { name: 'Customize' }).click();
    await expect(dialog(page).getByRole('heading', { name: 'Storage settings' })).toBeFocused();
    await page.getByRole('switch', { name: 'Remember theme' }).check();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Customize' })).toBeFocused();
    expect(await stored(page, 'orbita.consent')).toBeNull();
    await page.reload();
    await expect(theme(page)).toHaveAttribute('data-theme', 'light');
    await expect(panel(page)).toBeVisible();
  });

  for (const rememberTheme of [false, true]) {
    for (const recentSearches of [false, true]) {
      test(`persists independent permissions theme=${rememberTheme} searches=${recentSearches}`, async ({
        page,
      }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
        await page.getByRole('button', { name: 'Customize' }).click();
        await page.getByRole('switch', { name: 'Remember theme' }).setChecked(rememberTheme);
        await page.getByRole('switch', { name: 'Recent searches' }).setChecked(recentSearches);
        await page.getByRole('button', { name: 'Save choices' }).click();
        await expect(panel(page)).toHaveCount(0);
        await expect(page.getByRole('main')).toBeFocused();
        const first = await choices(page);
        expect(first.version).toBe(2);
        expect(first.permissions).toEqual({ theme: rememberTheme, recentSearches });
        const search = page.getByRole('combobox', { name: 'Search posts, users and tags' });
        await search.fill('consent example');
        await search.press('Enter');
        await expect(page).toHaveURL(/\/search\?/);
        expect(await stored(page, 'orbita.recentSearches')).toBe(
          recentSearches ? '["consent example"]' : null
        );
        expect(await stored(page, 'orbita.theme')).toBe(rememberTheme ? 'dark' : null);
        await page.reload();
        await expect(panel(page)).toHaveCount(0);
        await expect(theme(page)).toHaveAttribute('data-theme', rememberTheme ? 'dark' : 'light');
        expect((await choices(page)).decidedAt).toBe(first.decidedAt);
        await preferences(page);
        await expect(page.getByRole('switch', { name: 'Remember theme' })).toBeChecked({
          checked: rememberTheme,
        });
        await expect(page.getByRole('switch', { name: 'Recent searches' })).toBeChecked({
          checked: recentSearches,
        });
      });
    }
  }

  test('all actions, selective withdrawal and cancelling an existing answer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Accept all' }).click();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    const search = page.getByRole('combobox', { name: 'Search posts, users and tags' });
    await search.fill('retained term');
    await search.press('Enter');
    await expect(page).toHaveURL(/\/search\?/);
    await preferences(page);
    await page.getByRole('switch', { name: 'Remember theme' }).uncheck();
    await page.getByRole('button', { name: 'Save choices' }).click();
    await expect(page.getByRole('button', { name: 'Storage settings', exact: true })).toBeFocused();
    await expect(theme(page)).toHaveAttribute('data-theme', 'light');
    expect(await stored(page, 'orbita.theme')).toBeNull();
    expect(await stored(page, 'orbita.recentSearches')).toBe('["retained term"]');
    await preferences(page);
    await page.getByRole('switch', { name: 'Recent searches' }).uncheck();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    expect((await choices(page)).permissions.recentSearches).toBe(true);
    await preferences(page);
    await page.getByRole('switch', { name: 'Recent searches' }).uncheck();
    await page.getByRole('button', { name: 'Save choices' }).click();
    expect(await stored(page, 'orbita.recentSearches')).toBeNull();
    await page.reload();
    await expect(panel(page)).toHaveCount(0);
  });

  test('reject all remembers a refusal without retaining optional data', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Reject all' }).click();
    expect((await choices(page)).permissions).toEqual({ theme: false, recentSearches: false });
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect(await stored(page, 'orbita.theme')).toBeNull();
    await page.reload();
    await expect(panel(page)).toHaveCount(0);
    await expect(theme(page)).toHaveAttribute('data-theme', 'light');
  });

  for (const [index, old] of [
    'granted',
    'denied',
    '{bad',
    JSON.stringify({ version: 9 }),
    JSON.stringify({
      version: 2,
      decidedAt: Date.now() - 180 * 86400000,
      permissions: { theme: true, recentSearches: true },
    }),
  ].entries()) {
    test(`invalidates legacy or expired answer case ${index}`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate((answer) => {
        localStorage.setItem('orbita.consent', answer);
        localStorage.setItem('orbita.theme', 'dark');
        localStorage.setItem('orbita.recentSearches', '["old"]');
      }, old);
      await page.reload();
      await expect(panel(page)).toBeVisible();
      await expect(theme(page)).toHaveAttribute('data-theme', 'light');
      expect(await stored(page, 'orbita.theme')).toBeNull();
      expect(await stored(page, 'orbita.recentSearches')).toBeNull();
      expect(await stored(page, 'orbita.consent')).toBeNull();
    });
  }

  test('applies another tab’s withdrawal and resets a stale open draft', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Accept all' }).click();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    const other = await context.newPage();
    await other.goto('/');
    await expect(theme(other)).toHaveAttribute('data-theme', 'dark');
    await preferences(other);
    await preferences(page);
    await page.getByRole('switch', { name: 'Remember theme' }).uncheck();
    await page.getByRole('switch', { name: 'Recent searches' }).uncheck();
    await page.getByRole('button', { name: 'Save choices' }).click();
    await expect(other.getByRole('switch', { name: 'Remember theme' })).not.toBeChecked();
    await expect(other.getByRole('switch', { name: 'Recent searches' })).not.toBeChecked();
    await expect(other.getByRole('status')).toContainText('another tab');
    await expect(theme(other)).toHaveAttribute('data-theme', 'light');
    await other.close();
  });

  test('expires an active decision and resets an open draft without extending retention', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-11-01T00:00:00Z') });
    await page.goto('/');
    await page.getByRole('button', { name: 'Accept all' }).click();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await preferences(page);
    // The pinned Playwright clock coerces each fast-forward delta to a signed 32-bit integer.
    for (let period = 0; period < 9; period++) await page.clock.fastForward(20 * 86400000);
    await expect(dialog(page).getByRole('status')).toContainText('no longer valid');
    await expect(dialog(page).getByRole('heading', { name: 'Storage settings' })).toBeFocused();
    await expect(page.getByRole('switch', { name: 'Remember theme' })).not.toBeChecked();
    await expect(theme(page)).toHaveAttribute('data-theme', 'light');
    expect(await stored(page, 'orbita.consent')).toBeNull();
    expect(await stored(page, 'orbita.theme')).toBeNull();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeVisible();
  });

  test('a blocked save shows an error, stays off and can be retried', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Object.defineProperty(window, 'restoreStorageForTest', {
        configurable: true,
        value: () => {
          Storage.prototype.setItem = original;
        },
      });
      Storage.prototype.setItem = () => {
        throw new DOMException('Blocked', 'QuotaExceededError');
      };
    });
    await page.getByRole('button', { name: 'Accept all' }).click();
    await expect(dialog(page).getByRole('alert')).toContainText("couldn't save");
    expect(await stored(page, 'orbita.consent')).toBeNull();
    await page.evaluate(() => {
      (window as unknown as { restoreStorageForTest: () => void }).restoreStorageForTest();
    });
    await page.getByRole('button', { name: 'Save choices' }).click();
    await expect(dialog(page)).not.toBeVisible();
    expect((await choices(page)).permissions).toEqual({ theme: true, recentSearches: true });
  });

  test('native modal contains keyboard focus, Escape restores it; all layouts expose settings', async ({
    page,
  }) => {
    for (const route of ['/', '/login', '/register']) {
      await page.goto(route);
      await expect(panel(page)).toBeVisible();
      await preferences(page);
      await expect(dialog(page).getByRole('heading', { name: 'Storage settings' })).toBeFocused();
      expect(await dialog(page).innerText()).not.toMatch(/orbita\.|SESSION/);
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => ({
          inside: !!document.activeElement?.closest('dialog'),
          browserChrome: !document.hasFocus() && document.activeElement === document.body,
          active: document.activeElement?.outerHTML.slice(0, 150),
        }));
        // Native modality excludes background page controls; browser chrome remains reachable.
        expect(focus.inside || focus.browserChrome, JSON.stringify(focus)).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Storage settings', exact: true })
      ).toBeFocused();
      expect(await stored(page, 'orbita.consent')).toBeNull();
    }
  });

  for (const width of [1440, 768, 390, 320]) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`responsive evidence ${width}px ${colorScheme}`, async ({ page, context }, info) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        await page.goto('/');
        await expect(panel(page)).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        const bounds = (await panel(page).boundingBox())!;
        expect(bounds.x).toBe(0);
        expect(bounds.width).toBe(width);
        const footerSettings = page.getByRole('button', { name: 'Storage settings', exact: true });
        await footerSettings.focus();
        const focusedBounds = (await footerSettings.boundingBox())!;
        expect(focusedBounds.y + focusedBounds.height).toBeLessThanOrEqual(bounds.y);
        await page.evaluate(() => window.scrollTo(0, 0));
        if (width < 768) {
          const nav = page.getByRole('navigation', { name: 'Main navigation' });
          // The existing mobile tab bar retains its own independently measured height.
          const actual = await nav.boundingBox();
          if (actual) expect(bounds.y + bounds.height).toBeLessThanOrEqual(actual.y + 1);
        }
        await info.attach('bottom-panel', {
          body: await page.screenshot({ path: info.outputPath('bottom-panel.png') }),
          contentType: 'image/png',
        });
        await page.getByRole('button', { name: 'Customize' }).click();
        await expect(dialog(page)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await page.getByRole('switch', { name: 'Remember theme' }).check();
        const actualDialogBounds = (await dialog(page).boundingBox())!;
        // Compare the component interior, excluding rounded corners that reveal different page backgrounds.
        const interior = {
          x: actualDialogBounds.x + 16,
          y: actualDialogBounds.y + 16,
          width: actualDialogBounds.width - 32,
          height: actualDialogBounds.height - 32,
        };
        const actualInterior = await page.screenshot({ clip: interior });
        await info.attach('mixed-preferences', {
          body: await page.screenshot({ path: info.outputPath('mixed-preferences.png') }),
          contentType: 'image/png',
        });
        await page.getByRole('button', { name: 'Save choices' }).click();
        await expect(dialog(page)).not.toBeVisible();
        await preferences(page);
        await expect(page.getByRole('switch', { name: 'Remember theme' })).toBeChecked();
        await info.attach('reopened-preferences', {
          body: await page.screenshot({ path: info.outputPath('reopened-preferences.png') }),
          contentType: 'image/png',
        });
        // Static reference rendering is separate from the real-stack behaviour above.
        const reference = await context.newPage();
        await reference.setViewportSize({ width, height: 900 });
        await reference.setContent(referenceHtml);
        await reference.evaluate((scheme) => {
          document.documentElement.dataset.theme = scheme;
        }, colorScheme);
        await reference.evaluate(() => document.fonts.ready);
        await info.attach('reference-panel', {
          body: await reference.screenshot({ path: info.outputPath('reference-panel.png') }),
          contentType: 'image/png',
        });
        await reference.getByRole('button', { name: 'Customize' }).click();
        await reference.getByRole('switch', { name: 'Remember theme' }).check();
        expect(await reference.getByRole('dialog').boundingBox()).toEqual(actualDialogBounds);
        expect((await reference.screenshot({ clip: interior })).equals(actualInterior)).toBe(true);
        await info.attach('reference-mixed-preferences', {
          body: await reference.screenshot({
            path: info.outputPath('reference-mixed-preferences.png'),
          }),
          contentType: 'image/png',
        });
        await reference.close();
      });
    }
  }
});
