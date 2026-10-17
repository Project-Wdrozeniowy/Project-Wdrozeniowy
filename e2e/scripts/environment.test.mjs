import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { testPorts, assertOwnedRuntime, includeInSnapshot } from './environment.mjs';

test('runtime cleanup refuses root, sibling and parent paths', () => {
  const root = path.resolve('e2e/.runtime');
  for (const target of [root, path.join(root, '..'), `${root}-other/run`]) {
    assert.throws(() => assertOwnedRuntime(root, target));
  }
  assert.doesNotThrow(() => assertOwnedRuntime(root, path.join(root, 'owned-run')));
});

test('source snapshots exclude local secrets, dependencies and generated build trees', () => {
  for (const file of [
    '.env',
    '.env.local',
    '.env.example',
    'node_modules/lib/x.js',
    'src/.env',
    '.next/BUILD_ID',
    'target/jacoco.exec',
    'dist/index.js',
    'x.tsbuildinfo',
  ]) {
    assert.equal(includeInSnapshot(file), false, file);
  }
  for (const file of [
    'src/app/page.tsx',
    'package-lock.json',
    'Dockerfile',
    'src/main/resources/application.properties',
    'src/main/resources/db/migration/V1.sql',
  ]) {
    assert.equal(includeInSnapshot(file), true, file);
  }
});

test('test endpoints cannot be external URLs or collide within a managed run', () => {
  assert.deepEqual(testPorts({}), { FRONTEND: 3101, GATEWAY: 3100, BACKEND: 8180 });
  for (const env of [
    { E2E_FRONTEND_PORT: 'http://production' },
    { E2E_FRONTEND_PORT: '0' },
    { E2E_BACKEND_PORT: '65536' },
    { E2E_GATEWAY_PORT: '3101' },
  ])
    assert.throws(() => testPorts(env));
});
