import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { gatewayURL } from '../support/fixtures.js';

// Consent banner: optional browser storage (the theme choice, recent searches)
// exists only after the visitor accepted it. These specs run as a brand-new visitor, so they do not
// use the shared fixture that pre-answers the question.
const BANNER = 'Your storage preferences';

async function newVisitor(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext({ baseURL: gatewayURL });
  const page = await context.newPage();
  return { context, page };
}

const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);

test('asks a new visitor first and stores nothing until they answer', async ({ browser }) => {
  const { context, page } = await newVisitor(browser);
  try {
    await page.goto('/');
    await expect(page.getByRole('region', { name: BANNER })).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);

    // The theme still switches for this visit, but nothing is remembered.
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect(await theme(page)).toBe('dark');
    expect(await stored(page, 'orbita.theme')).toBeNull();
    await page.reload();
    expect(await theme(page)).toBe('light');
  } finally {
    await context.close();
  }
});

test('accepting remembers the answer and the theme chosen before it', async ({ browser }) => {
  const { context, page } = await newVisitor(browser);
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();

    await page.getByRole('button', { name: 'Accept optional storage' }).click();
    await expect(page.getByRole('region', { name: BANNER })).toHaveCount(0);
    expect(await stored(page, 'orbita.consent')).toBe('granted');
    expect(await stored(page, 'orbita.theme')).toBe('dark');

    await page.reload();
    await expect(page.getByRole('region', { name: BANNER })).toHaveCount(0);
    expect(await theme(page)).toBe('dark');
  } finally {
    await context.close();
  }
});

test('rejecting stores no optional item, and the question is not asked again', async ({
  browser,
}) => {
  const { context, page } = await newVisitor(browser);
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Reject optional storage' }).click();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();

    expect(await stored(page, 'orbita.consent')).toBe('denied');
    expect(await stored(page, 'orbita.theme')).toBeNull();
    await page.reload();
    await expect(page.getByRole('region', { name: BANNER })).toHaveCount(0);
    expect(await theme(page)).toBe('light');
  } finally {
    await context.close();
  }
});

test('the answer can be withdrawn later, which deletes the stored items', async ({ browser }) => {
  const { context, page } = await newVisitor(browser);
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Accept optional storage' }).click();
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect(await stored(page, 'orbita.theme')).toBe('dark');

    await page.getByRole('button', { name: 'Storage settings' }).click();
    await expect(page.getByRole('heading', { name: BANNER })).toBeFocused();
    await page.getByRole('button', { name: 'Reject optional storage' }).click();

    expect(await stored(page, 'orbita.consent')).toBe('denied');
    expect(await stored(page, 'orbita.theme')).toBeNull();
    await expect(page.getByRole('button', { name: 'Storage settings' })).toBeFocused();
    await page.reload();
    expect(await theme(page)).toBe('light');
  } finally {
    await context.close();
  }
});
