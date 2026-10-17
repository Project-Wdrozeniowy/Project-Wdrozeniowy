import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../process.mjs';

test('child failure preserves a non-zero exit and identifies its service', async () => {
  await assert.rejects(
    run(process.execPath, ['-e', 'process.exit(7)'], { capture: true, label: 'gateway coverage' }),
    (error) => error.exitCode === 7 && error.message.includes('gateway coverage')
  );
});

test('cancellation terminates a running child rather than reporting success', async () => {
  const started = Date.now();
  const controller = new AbortController();
  const task = run(process.execPath, ['-e', 'setTimeout(() => process.exit(99), 5000)'], {
    capture: true,
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 200);
  await assert.rejects(task, (error) => error.exitCode === 130);
  assert.ok(Date.now() - started < 3000, 'child must terminate before its watchdog');
});
