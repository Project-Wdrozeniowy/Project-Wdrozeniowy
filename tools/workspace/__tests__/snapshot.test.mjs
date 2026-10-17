import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { copyWorkspaceManifests } from '../snapshot.mjs';

test('workspace snapshot includes the shared lock and manifests without copying secrets or source', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'orbita-snapshot-'));
  const source = path.join(temporary, 'source');
  const target = path.join(temporary, 'target');
  try {
    for (const file of [
      'package.json',
      'package-lock.json',
      '.dockerignore',
      'frontend/package.json',
      'gateway/package.json',
      'e2e/package.json',
      '.env',
      '.npmrc',
      'frontend/.env',
      'gateway/src/index.ts',
    ]) {
      const absolute = path.join(source, file);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, file);
    }
    copyWorkspaceManifests(source, target);
    assert.equal(
      fs.readFileSync(path.join(target, 'package-lock.json'), 'utf8'),
      'package-lock.json'
    );
    assert.equal(fs.existsSync(path.join(target, 'frontend/package.json')), true);
    for (const forbidden of ['.env', '.npmrc', 'frontend/.env', 'gateway/src']) {
      assert.equal(fs.existsSync(path.join(target, forbidden)), false, forbidden);
    }
  } finally {
    const resolved = path.resolve(temporary);
    if (
      path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
      !path.basename(resolved).startsWith('orbita-snapshot-')
    ) {
      throw new Error('Refusing cleanup outside the owned temporary snapshot directory.');
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
