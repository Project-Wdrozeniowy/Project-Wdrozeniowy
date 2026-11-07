import { lifecycle, runNpm } from './process.mjs';

await lifecycle(async (signal) => {
  // The browser uses /api both behind Express and behind the Vite development proxy.
  await runNpm(['run', 'build', '--workspace', 'frontend'], {
    label: 'frontend production build',
    signal,
    env: { ...process.env, NODE_ENV: 'production' },
  });
});
