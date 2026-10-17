import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function npmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  ];
  const cli = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!cli) throw new Error('Use npm run from the repository root with Node 24/npm 11.');
  return cli;
}

export function stopTree(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.on('error', () => {});
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* Already exited. */
    }
  }
}

export function run(
  command,
  args,
  { label = command, cwd = repository, env = process.env, signal, capture = false } = {}
) {
  signal?.throwIfAborted();
  if (!capture) console.log(`[workspace] ${label}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let output = '';
    if (capture) {
      child.stdout.on('data', (data) => {
        output += data;
      });
      child.stderr.on('data', (data) => {
        output += data;
      });
    }
    const abort = () => stopTree(child);
    signal?.addEventListener('abort', abort, { once: true });
    child.once('error', (error) => {
      signal?.removeEventListener('abort', abort);
      reject(new Error(`${label}: ${error.message}`, { cause: error }));
    });
    child.once('close', (code) => {
      signal?.removeEventListener('abort', abort);
      if (code === 0 && !signal?.aborted) resolve(output.trim());
      else {
        const error = new Error(
          `${label} failed (exit ${code ?? 'signal'})${capture ? `: ${output.trim()}` : ''}`
        );
        error.exitCode = signal?.aborted ? 130 : code || 1;
        reject(error);
      }
    });
  });
}

export const runNpm = (args, options) => run(process.execPath, [npmCli(), ...args], options);

export async function lifecycle(action) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  try {
    await action(controller.signal);
  } catch (error) {
    console.error(`[workspace] ${error.message}`);
    process.exitCode = controller.signal.aborted ? 130 : error.exitCode || 1;
  } finally {
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
  }
}
