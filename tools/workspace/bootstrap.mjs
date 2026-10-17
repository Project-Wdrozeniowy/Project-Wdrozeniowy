import { lifecycle, run, runNpm } from './process.mjs';

await lifecycle(async (signal) => {
  if (Number(process.versions.node.split('.')[0]) !== 24)
    throw new Error('Use Node 24 (the CI version).');
  await runNpm(['ci'], { label: 'Install locked workspace dependencies', signal });
  const java = await run('java', ['--version'], {
    label: 'Java prerequisite',
    signal,
    capture: true,
  });
  if (!/\b17[.\s]/.test(java)) throw new Error('Use Java 17 (the CI version).');
  console.log('[workspace] Java 17 prerequisite verified.');
  await run('docker', ['compose', 'version'], { label: 'Docker Compose prerequisite', signal });
  console.log(
    '[workspace] Dependencies installed. Configure the documented .env files before npm run dev.'
  );
  console.log(
    '[workspace] For browser tests, install Chromium with npm exec --workspace orbita-e2e -- playwright install chromium.'
  );
});
