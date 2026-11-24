import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

if (process.env.E2E_MANAGED_RUN !== '1' || !process.env.E2E_ARTIFACTS) {
  throw new Error('Use npm test from e2e/: tests require an isolated managed stack.');
}

export default defineConfig({
  testDir: './tests',
  testMatch: process.env.E2E_FAILURE_PROBE === '1' ? '**/*.probe.ts' : '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  // Optional local diagnostic selection; normal local/CI gates still run every scenario.
  grep: process.env.E2E_TEST_GREP ? new RegExp(process.env.E2E_TEST_GREP) : undefined,
  retries: 0,
  forbidOnly: true,
  failOnFlakyTests: true,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: path.join(process.env.E2E_ARTIFACTS, 'test-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(process.env.E2E_ARTIFACTS, 'report'), open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
