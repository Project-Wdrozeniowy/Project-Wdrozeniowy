// Diagnostic overlays/diffs, never an automatic waiver for a visible mismatch.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Use the PNG decoder already bundled with the pinned Playwright toolchain.
const { PNG } = require(
  path.join(path.dirname(require.resolve('playwright-core')), 'lib/utilsBundle.js')
);
const dir = path.resolve(import.meta.dirname, '../../.workspace-artifacts/pwdrz-169-design');
const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
const diagnostics = [];
for (const row of manifest) {
  const ref = PNG.sync.read(
    await fs.readFile(path.join(dir, 'reference-' + row.node.split(':')[1] + '.png'))
  );
  const actual = PNG.sync.read(await fs.readFile(path.join(dir, row.name + '.png')));
  const width = Math.max(ref.width, actual.width),
    height = Math.max(ref.height, actual.height);
  const overlay = new PNG({ width, height }),
    diff = new PNG({ width, height });
  const pair = new PNG({ width: ref.width + actual.width + 16, height });
  pair.data.fill(255);
  PNG.bitblt(ref, pair, 0, 0, ref.width, ref.height, 0, 0);
  PNG.bitblt(actual, pair, 0, 0, actual.width, actual.height, ref.width + 16, 0);
  await fs.writeFile(path.join(dir, row.name + '-pair.png'), PNG.sync.write(pair));
  let changedPixels = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const out = (y * width + x) * 4;
      let changed = false;
      for (let c = 0; c < 3; c++) {
        const a = x < ref.width && y < ref.height ? ref.data[(y * ref.width + x) * 4 + c] : 255;
        const b =
          x < actual.width && y < actual.height ? actual.data[(y * actual.width + x) * 4 + c] : 255;
        overlay.data[out + c] = Math.round((a + b) / 2);
        diff.data[out + c] = 255 - Math.abs(a - b);
        if (a !== b) changed = true;
      }
      overlay.data[out + 3] = diff.data[out + 3] = 255;
      if (changed) changedPixels++;
    }
  await fs.writeFile(path.join(dir, row.name + '-overlay.png'), PNG.sync.write(overlay));
  await fs.writeFile(path.join(dir, row.name + '-diff.png'), PNG.sync.write(diff));
  diagnostics.push({
    name: row.name,
    reference: [ref.width, ref.height],
    actual: [actual.width, actual.height],
    changedPixels,
    status: 'requires direct visual review; no tolerance applied',
  });
}
await fs.writeFile(path.join(dir, 'comparison.json'), JSON.stringify(diagnostics, null, 2));
console.log(
  JSON.stringify(
    diagnostics.map((r) => ({
      name: r.name,
      reference: r.reference,
      actual: r.actual,
      changedPixels: r.changedPixels,
    })),
    null,
    2
  )
);
