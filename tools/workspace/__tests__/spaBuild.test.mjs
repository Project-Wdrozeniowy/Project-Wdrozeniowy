import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repository } from '../process.mjs';

test('static build delegates to the frontend workspace in production without a public API URL', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'orbita-spa-build-'));
  try {
    fs.mkdirSync(path.join(fixture, 'tools/workspace'), { recursive: true });
    for (const name of ['buildFrontend.mjs', 'process.mjs']) {
      fs.copyFileSync(
        path.join(repository, 'tools/workspace', name),
        path.join(fixture, 'tools/workspace', name)
      );
    }
    const npmCli = path.join(fixture, 'npm-probe.cjs');
    fs.writeFileSync(
      npmCli,
      'console.log(JSON.stringify({args:process.argv.slice(2),mode:process.env.NODE_ENV}));'
    );
    const run = spawnSync(process.execPath, ['tools/workspace/buildFrontend.mjs'], {
      cwd: fixture,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_execpath: npmCli,
        NEXT_PUBLIC_API_URL: '',
        NODE_ENV: 'development',
      },
    });
    assert.equal(run.status, 0, run.stderr);
    const output = JSON.parse(run.stdout.trim().split('\n').at(-1));
    assert.deepEqual(output, {
      args: ['run', 'build', '--workspace', 'frontend'],
      mode: 'production',
    });
  } finally {
    if (
      path.dirname(path.resolve(fixture)) !== path.resolve(os.tmpdir()) ||
      !path.basename(fixture).startsWith('orbita-spa-build-')
    )
      throw new Error('Unowned fixture');
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
