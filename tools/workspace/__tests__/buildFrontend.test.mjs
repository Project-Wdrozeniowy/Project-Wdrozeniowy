import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../process.mjs';

test('production build refuses an absent API URL before invoking Next.js', async () => {
  await assert.rejects(
    run(process.execPath, ['tools/workspace/buildFrontend.mjs'], {
      capture: true,
      env: { ...process.env, NEXT_PUBLIC_API_URL: '' },
    }),
    (error) =>
      error.exitCode !== 0 && error.message.includes('requires an explicit NEXT_PUBLIC_API_URL')
  );
});

test('production build refuses a non-HTTP API endpoint', async () => {
  await assert.rejects(
    run(process.execPath, ['tools/workspace/buildFrontend.mjs'], {
      capture: true,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'file:///local/api' },
    }),
    (error) => error.exitCode !== 0 && error.message.includes('must use HTTP or HTTPS')
  );
});
