import fs from 'node:fs';
import path from 'node:path';

/** Only committed workspace metadata: no .env, npm credentials or dependency trees. */
export function copyWorkspaceManifests(source, destination) {
  for (const relative of [
    'package.json',
    'package-lock.json',
    '.dockerignore',
    'frontend/package.json',
    'gateway/package.json',
    'e2e/package.json',
  ]) {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, relative), target);
  }
}
