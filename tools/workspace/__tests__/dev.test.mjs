import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { repository } from '../process.mjs';

for (const [key, value, expected] of [
  ['PORT', '3999', 'gateway PORT=3000'],
  [
    'NEXT_PUBLIC_API_URL',
    'https://example.invalid/api',
    'NEXT_PUBLIC_API_URL=http://localhost:3000/api',
  ],
]) {
  test(`dev rejects an incompatible ${key} environment override before starting Docker`, () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'orbita-dev-config-'));
    try {
      fs.mkdirSync(path.join(fixture, 'tools/workspace'), { recursive: true });
      for (const name of ['dev.mjs', 'process.mjs']) {
        fs.copyFileSync(
          path.join(repository, 'tools/workspace', name),
          path.join(fixture, 'tools/workspace', name)
        );
      }
      fs.mkdirSync(path.join(fixture, 'gateway'));
      fs.mkdirSync(path.join(fixture, 'frontend'));
      fs.writeFileSync(path.join(fixture, '.env'), 'POSTGRES_PASSWORD=test\nJWT_SECRET=test\n');
      fs.writeFileSync(
        path.join(fixture, 'gateway/.env'),
        'PORT=3000\nBACKEND_URL=http://localhost:8080\nJWT_SECRET=test\n'
      );
      fs.writeFileSync(
        path.join(fixture, 'frontend/.env'),
        'NEXT_PUBLIC_API_URL=http://localhost:3000/api\n'
      );
      const result = spawnSync(process.execPath, ['tools/workspace/dev.mjs'], {
        cwd: fixture,
        encoding: 'utf8',
        timeout: 5000,
        env: {
          ...process.env,
          PORT: '3000',
          BACKEND_URL: 'http://localhost:8080',
          JWT_SECRET: 'test',
          POSTGRES_PASSWORD: 'test',
          NEXT_PUBLIC_API_URL: 'http://localhost:3000/api',
          [key]: value,
        },
      });
      assert.ifError(result.error);
      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes(expected), result.stderr);
      assert.ok(!result.stdout.includes('Start development infrastructure'));
    } finally {
      const resolved = path.resolve(fixture);
      if (
        path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
        !path.basename(resolved).startsWith('orbita-dev-config-')
      ) {
        throw new Error('Refusing cleanup outside the owned temporary dev fixture.');
      }
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  });
}
