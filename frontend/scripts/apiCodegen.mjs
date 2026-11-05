import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from 'orval';
import { format, resolveConfig } from 'prettier';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.dirname(frontend);
const relativeOutput = 'src/shared/api/generated';

export async function files(directory) {
  const result = new Map();
  async function visit(current, prefix = '') {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) await visit(path.join(current, entry.name), name + '/');
      else result.set(name, await fs.readFile(path.join(current, entry.name), 'utf8'));
    }
  }
  try {
    await visit(directory);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return result;
}

export function differences(expected, actual) {
  return [...new Set([...expected.keys(), ...actual.keys()])]
    .sort()
    .filter((name) => expected.get(name) !== actual.get(name));
}

/** Both commands generate outside the checkout first; failures never damage committed output. */
export async function codegen(mode, root = repository) {
  if (!['generate', 'check'].includes(mode)) throw new Error('Use generate or check.');
  const workspace = path.join(root, 'frontend');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'orbita-api-'));
  try {
    const mirror = path.join(temporary, 'frontend');
    const output = path.join(mirror, relativeOutput);
    await fs.mkdir(path.join(temporary, 'backend'), { recursive: true });
    await fs.mkdir(path.join(mirror, 'src/shared/api/client'), { recursive: true });
    await fs.copyFile(
      path.join(root, 'backend/openapi.json'),
      path.join(temporary, 'backend/openapi.json')
    );
    await fs.copyFile(
      path.join(workspace, 'orval.config.mjs'),
      path.join(mirror, 'orval.config.mjs')
    );
    await fs.copyFile(
      path.join(workspace, 'src/shared/api/client/orvalTransport.ts'),
      path.join(mirror, 'src/shared/api/client/orvalTransport.ts')
    );
    // Orval needs the installed Query version when selecting generated v5 signatures.
    await fs.copyFile(path.join(workspace, 'package.json'), path.join(mirror, 'package.json'));
    await fs.copyFile(path.join(workspace, 'tsconfig.json'), path.join(mirror, 'tsconfig.json'));
    await generate(path.join(mirror, 'orval.config.mjs'), mirror);
    const formatting = await resolveConfig(path.join(workspace, '.prettierrc'));
    const generated = await files(output);
    if (!generated.size) throw new Error('Orval produced no bindings.');
    for (const [name, content] of generated) {
      generated.set(
        name,
        await format(content, { ...formatting, parser: 'typescript', endOfLine: 'lf' })
      );
    }
    const destination = path.join(workspace, relativeOutput);
    if (mode === 'check') {
      const changed = differences(generated, await files(destination));
      if (changed.length)
        throw new Error(`API bindings drift: ${changed.join(', ')}. Run npm run api:generate.`);
    } else {
      await fs.rm(destination, { recursive: true, force: true });
      for (const [name, content] of generated) {
        const target = path.join(destination, name);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content);
      }
    }
    console.log(`API bindings ${mode}: ${generated.size} files match the validated contract.`);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await codegen(process.argv[2]);
}
