import path from 'node:path';

export function testPorts(env) {
  if (env.E2E_FRONTEND_PORT !== undefined) {
    throw new Error('E2E_FRONTEND_PORT is obsolete: the SPA uses E2E_GATEWAY_PORT.');
  }
  const defaults = { GATEWAY: 3100, BACKEND: 8180 };
  const ports = Object.fromEntries(
    Object.entries(defaults).map(([service, fallback]) => {
      const raw = env[`E2E_${service}_PORT`] ?? String(fallback);
      if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${service} test port`);
      const port = Number(raw);
      if (port < 1024 || port > 65535) throw new Error(`Invalid ${service} test port`);
      return [service, port];
    })
  );
  if (new Set(Object.values(ports)).size !== 2) throw new Error('Test ports must be distinct');
  return ports;
}

export function assertOwnedRuntime(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Refusing cleanup outside a child of the E2E runtime directory');
  }
}

export function includeInSnapshot(relative) {
  const parts = relative.split(/[\\/]/);
  return !parts.some(
    (part) =>
      ['node_modules', '.next', 'target', 'coverage', 'dist', '.git'].includes(part) ||
      part.startsWith('.env') ||
      part.endsWith('.tsbuildinfo') ||
      part.endsWith('.log')
  );
}
