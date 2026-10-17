import { lifecycle, runNpm } from './process.mjs';

// Preserve the npm CLI that launched Nx instead of a different global npm on PATH.
await lifecycle((signal) => runNpm(process.argv.slice(2), { signal, label: 'npm workspace task' }));
