import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import { repository, run, lifecycle } from './process.mjs';
import { maven } from './maven.mjs';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--external-db'))
  throw new Error('Only --external-db is supported.');

await lifecycle(async (signal) => {
  if (args.includes('--external-db')) {
    for (const key of [
      'SPRING_DATASOURCE_URL',
      'SPRING_DATASOURCE_USERNAME',
      'SPRING_DATASOURCE_PASSWORD',
    ]) {
      if (!process.env[key])
        throw new Error(`External DB mode requires ${key}; use the managed default locally.`);
    }
    await maven('verify', { signal });
    return;
  }

  await run('docker', ['info', '--format', '{{.ServerVersion}}'], {
    capture: true,
    signal,
    label: 'Docker readiness',
  });
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  const container = `orbita-unit-${id}`;
  const password = randomBytes(24).toString('hex');
  const evidence = path.join(repository, '.workspace-artifacts', 'backend', id);
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(
    path.join(evidence, 'run.json'),
    JSON.stringify({ container, startedAt: new Date().toISOString() })
  );
  let attempted = false;
  let failed;
  try {
    attempted = true;
    await run(
      'docker',
      [
        'run',
        '--detach',
        '--name',
        container,
        '--label',
        'orbita.task=PWDRZ-126',
        '--tmpfs',
        '/var/lib/postgresql/data',
        '--publish',
        '127.0.0.1::5432',
        '--env',
        'POSTGRES_DB=orbita_test',
        '--env',
        'POSTGRES_USER=orbita_test',
        '--env',
        `POSTGRES_PASSWORD=${password}`,
        'postgres:16-alpine',
      ],
      { signal, capture: true, label: 'Create owned test PostgreSQL' }
    );
    const port = await run(
      'docker',
      [
        'inspect',
        '--format',
        '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}',
        container,
      ],
      { signal, capture: true, label: 'Read owned PostgreSQL port' }
    );
    if (!/^\d+$/.test(port)) throw new Error('Docker did not return a numeric PostgreSQL port.');
    const deadline = Date.now() + 90_000;
    while (true) {
      signal.throwIfAborted();
      try {
        await run(
          'docker',
          [
            'exec',
            container,
            'pg_isready',
            '-h',
            '127.0.0.1',
            '-U',
            'orbita_test',
            '-d',
            'orbita_test',
          ],
          { signal, capture: true }
        );
        break;
      } catch (error) {
        if (signal.aborted || Date.now() >= deadline) throw error;
        await delay(500, undefined, { signal });
      }
    }
    await maven('verify', {
      signal,
      env: {
        ...process.env,
        SPRING_DATASOURCE_URL: `jdbc:postgresql://127.0.0.1:${port}/orbita_test`,
        SPRING_DATASOURCE_USERNAME: 'orbita_test',
        SPRING_DATASOURCE_PASSWORD: password,
        POSTGRES_DB: 'orbita_test',
        POSTGRES_USER: 'orbita_test',
        POSTGRES_PASSWORD: password,
      },
    });
  } catch (error) {
    failed = error;
  } finally {
    // Exact random name owned by this invocation; never remove the developer stack.
    if (attempted) {
      try {
        await run('docker', ['rm', '--force', container], {
          capture: true,
          label: 'Remove owned PostgreSQL',
        });
      } catch (error) {
        failed ||= error;
        console.error(`[workspace] Cleanup required for ${container}: ${error.message}`);
      }
    }
    fs.writeFileSync(
      path.join(evidence, 'result.json'),
      JSON.stringify({ passed: !failed, interrupted: signal.aborted })
    );
  }
  if (failed) throw failed;
});
