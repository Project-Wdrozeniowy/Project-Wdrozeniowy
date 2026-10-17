import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { assertOwnedRuntime, includeInSnapshot, testPorts } from './environment.mjs';

const e2e = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(e2e, '..');
const runtimeRoot = path.join(e2e, '.runtime');
const runId = `${Date.now()}-${randomBytes(4).toString('hex')}`;
const project = `orbita-e2e-${runId}`;
const runtime = path.join(runtimeRoot, runId);
const artifacts = path.join(e2e, 'artifacts', runId);
const ports = testPorts(process.env);
const probe = process.argv.includes('--probe-failure');
if (process.argv.slice(2).some((arg) => arg !== '--probe-failure')) {
  throw new Error('Only --probe-failure is supported; use E2E_*_PORT to change test ports.');
}
const npmCli = process.env.npm_execpath;
if (!npmCli || !fs.existsSync(npmCli)) throw new Error('Start this launcher with npm test.');
const env = {
  ...process.env,
  E2E_PROJECT: project,
  E2E_RUNTIME: runtime.replaceAll('\\', '/'),
  E2E_FRONTEND_PORT: String(ports.FRONTEND),
  E2E_GATEWAY_PORT: String(ports.GATEWAY),
  E2E_BACKEND_PORT: String(ports.BACKEND),
  E2E_DB_PASSWORD: randomBytes(24).toString('hex'),
  E2E_JWT_SECRET: randomBytes(48).toString('base64'),
  E2E_MANAGED_RUN: '1',
  E2E_BASE_URL: `http://127.0.0.1:${ports.FRONTEND}`,
  E2E_GATEWAY_URL: `http://127.0.0.1:${ports.GATEWAY}`,
  E2E_ARTIFACTS: artifacts,
  E2E_FAILURE_PROBE: probe ? '1' : '0',
  NEXT_PUBLIC_API_URL: `http://127.0.0.1:${ports.GATEWAY}/api`,
  NEXT_TELEMETRY_DISABLED: '1',
};
fs.mkdirSync(runtime, { recursive: true });
fs.mkdirSync(artifacts, { recursive: true });
const emptyEnv = path.join(runtime, 'empty.env');
fs.writeFileSync(emptyEnv, '');
const composeArgs = [
  'compose',
  '--env-file',
  emptyEnv,
  '-f',
  path.join(e2e, 'compose.yml'),
  '-p',
  project,
];
let activeChild;
let frontend;
let frontendExit;
let composeAttempted = false;
let interrupted = false;
const stoppedChildren = new WeakSet();

function stopTree(child) {
  if (
    !child?.pid ||
    child.exitCode !== null ||
    child.signalCode !== null ||
    stoppedChildren.has(child)
  )
    return;
  stoppedChildren.add(child);
  if (process.platform === 'win32') {
    const result = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    result.on('error', () => {});
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* Already exited. */
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    interrupted = true;
    stopTree(activeChild);
    stopTree(frontend);
  });
}

function command(executable, args, label, cwd = e2e, extraEnv = {}) {
  console.log(`[E2E] ${label}`);
  const fd = fs.openSync(path.join(artifacts, `${label}.log`), 'a');
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: { ...env, ...extraEnv },
      stdio: ['ignore', fd, fd],
      detached: process.platform !== 'win32',
      windowsHide: true,
    });
    activeChild = child;
    child.once('error', reject);
    child.once('close', (code) => {
      fs.closeSync(fd);
      if (activeChild === child) activeChild = undefined;
      if (code === 0) resolve();
      else
        reject(new Error(`${label} exited ${code}; see ${path.join(artifacts, `${label}.log`)}`));
    });
  });
}

async function ensureFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () =>
      reject(new Error(`Port ${port} is occupied; no existing server is reused.`))
    );
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

async function waitFor(url, timeout = 240_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (interrupted) throw new Error('Run interrupted');
    if (frontendExit !== undefined) throw new Error(`Frontend exited ${frontendExit}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      await response.arrayBuffer();
      if (response.status === 200) return;
    } catch {
      /* The owned service is still starting. */
    }
    await delay(500);
  }
  throw new Error(`Readiness timeout: ${url}`);
}

let exitCode = 0;
try {
  for (const port of Object.values(ports)) await ensureFree(port);
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repository,
    encoding: 'utf8',
  }).trim();
  fs.writeFileSync(
    path.join(artifacts, 'run.json'),
    JSON.stringify(
      {
        runId,
        project,
        sha,
        node: process.version,
        ports,
        probe,
        baseURL: env.E2E_BASE_URL,
        gatewayURL: env.E2E_GATEWAY_URL,
        note: 'Working-tree source snapshot; credentials intentionally omitted.',
      },
      null,
      2
    )
  );
  for (const service of ['frontend', 'gateway', 'backend']) {
    const source = path.join(repository, service);
    fs.cpSync(source, path.join(runtime, service), {
      recursive: true,
      filter: (entry) => includeInSnapshot(path.relative(source, entry)),
    });
  }
  const frontendDir = path.join(runtime, 'frontend');
  await command(
    process.execPath,
    [npmCli, 'ci', '--include=dev', '--no-audit', '--no-fund'],
    'frontend-install',
    frontendDir
  );
  composeAttempted = true;
  await command('docker', [...composeArgs, 'up', '--build', '--detach'], 'stack-start');
  await waitFor(`http://127.0.0.1:${ports.BACKEND}/api/forum/categories`);
  await waitFor(`${env.E2E_GATEWAY_URL}/health`);
  await waitFor(`${env.E2E_GATEWAY_URL}/api/forum/categories`);
  await command(process.execPath, [npmCli, 'run', 'build'], 'frontend-build', frontendDir, {
    NODE_ENV: 'production',
  });
  const fd = fs.openSync(path.join(artifacts, 'frontend-server.log'), 'a');
  frontend = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(ports.FRONTEND),
    ],
    {
      cwd: frontendDir,
      env: { ...env, NODE_ENV: 'production' },
      stdio: ['ignore', fd, fd],
      detached: process.platform !== 'win32',
      windowsHide: true,
    }
  );
  frontend.once('error', (error) => {
    frontendExit = error.message;
  });
  frontend.once('close', (code) => {
    frontendExit = code;
    fs.closeSync(fd);
  });
  await waitFor(`${env.E2E_BASE_URL}/login`);
  await command(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test'],
    'browser-tests'
  );
} catch (error) {
  console.error(`[E2E] ${error.message}`);
  exitCode = interrupted ? 130 : 1;
} finally {
  stopTree(frontend);
  if (frontend && frontendExit === undefined) {
    await Promise.race([new Promise((resolve) => frontend.once('close', resolve)), delay(10_000)]);
  }
  if (composeAttempted) {
    try {
      await command('docker', [...composeArgs, 'logs', '--no-color'], 'stack-logs');
    } catch {
      /* Preserve the original error; teardown below is still required. */
    }
    try {
      await command(
        'docker',
        [...composeArgs, 'down', '--volumes', '--remove-orphans', '--rmi', 'local'],
        'stack-cleanup'
      );
    } catch (error) {
      console.error(`[E2E] Cleanup failed: ${error.message}. Project: ${project}`);
      exitCode = 1;
    }
  }
  // Resolve/check the exact owned child before recursive Windows cleanup.
  assertOwnedRuntime(runtimeRoot, runtime);
  try {
    fs.rmSync(runtime, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch (error) {
    console.error(`[E2E] Runtime cleanup failed: ${error.message}`);
    exitCode = 1;
  }
  fs.writeFileSync(path.join(artifacts, 'result.json'), JSON.stringify({ exitCode, interrupted }));
  console.log(`[E2E] Exit ${exitCode}. Evidence: ${artifacts}`);
}
process.exitCode = exitCode;
