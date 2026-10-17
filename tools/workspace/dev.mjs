import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { parseEnv } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { repository, run, runNpm, lifecycle } from './process.mjs';

function readEnv(relative) {
  const file = path.join(repository, relative);
  if (!fs.existsSync(file))
    throw new Error(`Missing ${relative}; copy its .env.example and configure it.`);
  return { ...parseEnv(fs.readFileSync(file, 'utf8')), ...process.env };
}

function freePort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () =>
      reject(new Error(`Port ${port} is occupied; stop its service before root dev.`))
    );
    server.listen(port, () => server.close(resolve));
  });
}

await lifecycle(async (signal) => {
  const root = readEnv('.env');
  const gateway = readEnv('gateway/.env');
  const frontend = readEnv('frontend/.env');
  if (!root.POSTGRES_PASSWORD || !root.JWT_SECRET || root.JWT_SECRET !== gateway.JWT_SECRET) {
    throw new Error(
      'Configure POSTGRES_PASSWORD and identical JWT_SECRET in .env and gateway/.env.'
    );
  }
  if (frontend.NEXT_PUBLIC_API_URL !== 'http://localhost:3000/api') {
    throw new Error(
      'Root dev expects frontend/.env NEXT_PUBLIC_API_URL=http://localhost:3000/api; use direct commands for custom ports.'
    );
  }
  if (
    (gateway.PORT || '3000') !== '3000' ||
    (gateway.BACKEND_URL || 'http://localhost:8080') !== 'http://localhost:8080'
  ) {
    throw new Error('Root dev expects gateway PORT=3000 and BACKEND_URL=http://localhost:8080.');
  }
  await Promise.all([freePort(3000), freePort(3001)]);
  await run('docker', ['compose', 'up', '--detach', '--build', 'postgres', 'redis', 'backend'], {
    label: 'Start development infrastructure/backend',
    signal,
  });
  const deadline = Date.now() + 240_000;
  while (true) {
    signal.throwIfAborted();
    try {
      const response = await fetch('http://localhost:8080/api/forum/categories', {
        signal: AbortSignal.timeout(3000),
      });
      await response.arrayBuffer();
      if (response.status === 200) break;
    } catch {
      /* Backend is starting. */
    }
    if (Date.now() >= deadline)
      throw new Error('Backend readiness timed out; inspect docker compose logs backend.');
    await delay(500, undefined, { signal });
  }
  console.log(
    '[workspace] Ctrl+C stops the owned frontend/gateway processes. Compose services/data remain available.'
  );
  await runNpm(
    ['exec', '--', 'nx', 'run-many', '-t', 'dev', '--projects=frontend,gateway', '--parallel=2'],
    {
      label: 'Run frontend and gateway with hot reload',
      signal,
      env: { ...process.env, NX_TUI: 'false', NX_DAEMON: 'false' },
    }
  );
});
