import { lifecycle, runNpm } from './process.mjs';

await lifecycle(async (signal) => {
  if (!process.env.NEXT_PUBLIC_API_URL?.trim()) {
    throw new Error(
      'frontend build requires an explicit NEXT_PUBLIC_API_URL (the gateway API URL).'
    );
  }
  const url = new URL(process.env.NEXT_PUBLIC_API_URL);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('NEXT_PUBLIC_API_URL must use HTTP or HTTPS.');
  await runNpm(['run', 'build', '--workspace', 'frontend'], {
    label: 'frontend production build',
    signal,
    env: { ...process.env, NODE_ENV: 'production' },
  });
});
