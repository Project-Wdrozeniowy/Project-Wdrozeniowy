import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { codegen, files } from '../apiCodegen.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('clean generation is deterministic and drift checks reject changed, missing, extra and invalid input', async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'orbita-codegen-test-'));
  try {
    for (const name of [
      'backend/openapi.json',
      'frontend/orval.config.mjs',
      'frontend/package.json',
      'frontend/tsconfig.json',
      'frontend/.prettierrc',
      'frontend/src/shared/api/client/orvalTransport.ts',
    ]) {
      const target = path.join(fixture, name);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(path.join(repository, name), target);
    }
    const output = path.join(fixture, 'frontend/src/shared/api/generated');
    await codegen('generate', fixture);
    const first = await files(output);
    await codegen('generate', fixture);
    assert.deepEqual(await files(output), first);
    await codegen('check', fixture);

    const target = path.join(output, 'orbita.api.ts');
    await fs.appendFile(target, '\n// stale\n');
    const stale = await fs.readFile(target, 'utf8');
    await assert.rejects(codegen('check', fixture), /API bindings drift/);
    assert.equal(await fs.readFile(target, 'utf8'), stale, 'check must never repair output');
    await fs.writeFile(target, first.get('orbita.api.ts'));
    await fs.unlink(target);
    await assert.rejects(codegen('check', fixture), /orbita.api.ts/);
    await fs.writeFile(target, first.get('orbita.api.ts'));
    await fs.writeFile(path.join(output, 'obsolete.ts'), '// obsolete');
    await assert.rejects(codegen('check', fixture), /obsolete.ts/);
    await codegen('generate', fixture);
    assert.deepEqual(await files(output), first, 'generation removes obsolete output');

    const contractPath = path.join(fixture, 'backend/openapi.json');
    const original = await fs.readFile(contractPath, 'utf8');
    const changed = JSON.parse(original);
    changed.components.schemas.CsrfResponse.properties.token.type = 'integer';
    await fs.writeFile(contractPath, JSON.stringify(changed));
    await assert.rejects(codegen('check', fixture), /csrfResponse.dto.ts/);
    const invalid = JSON.parse(original);
    invalid.paths['/auth/csrf'].get.responses['200'].content['application/json'].schema.$ref =
      '#/components/schemas/MissingCsrfResponse';
    await fs.writeFile(contractPath, JSON.stringify(invalid));
    await assert.rejects(codegen('generate', fixture));
    assert.deepEqual(await files(output), first, 'invalid input must preserve existing output');
    await fs.writeFile(contractPath, original);
    await codegen('check', fixture);
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
