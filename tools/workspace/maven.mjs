import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repository, run, lifecycle } from './process.mjs';

export function maven(phase, options = {}) {
  if (!['build', 'verify'].includes(phase)) throw new Error('Maven phase must be build or verify.');
  const args =
    phase === 'build' ? ['--batch-mode', 'package', '-DskipTests'] : ['--batch-mode', 'verify'];
  const command = process.platform === 'win32' ? 'cmd.exe' : './mvnw';
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'mvnw.cmd', ...args] : args;
  return run(command, commandArgs, {
    ...options,
    cwd: path.join(repository, 'backend'),
    label: `backend Maven ${phase}`,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await lifecycle((signal) => maven(process.argv[2], { signal }));
}
