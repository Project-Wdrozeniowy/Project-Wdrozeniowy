import 'dotenv/config';
import path from 'node:path';
import { isIP } from 'node:net';
import type { GatewayConfig } from '../types';

function integer(key: string, fallback: number): number {
  const raw = process.env[key] ?? String(fallback);
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new Error(`${key} must be a positive integer`);
  }
  return Number(raw);
}

function list(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const trustedProxies = list(process.env.TRUSTED_PROXY_CIDRS ?? '');
for (const proxy of trustedProxies) {
  const parts = proxy.split('/');
  const address = parts[0];
  const mask = parts.length === 2 ? parts[1] : undefined;
  const family = isIP(address);
  if (
    parts.length > 2 ||
    !family ||
    (mask !== undefined && (!/^\d+$/.test(mask) || Number(mask) > (family === 4 ? 32 : 128)))
  ) {
    throw new Error('TRUSTED_PROXY_CIDRS must contain explicit IP addresses or CIDRs');
  }
}
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
const target = new URL(backendUrl);
if (
  !['http:', 'https:'].includes(target.protocol) ||
  target.username ||
  target.password ||
  target.search ||
  target.hash ||
  target.pathname !== '/'
) {
  throw new Error('BACKEND_URL must be a fixed HTTP(S) origin');
}

const config: GatewayConfig = {
  spa: {
    enabled: process.argv.includes('--spa') || process.env.SERVE_SPA === 'true',
    directory: path.resolve(
      process.env.SPA_DIST_DIR ?? path.join(__dirname, '../../../frontend/dist')
    ),
  },
  port: integer('PORT', 3000),
  backendUrl,
  production: process.env.NODE_ENV === 'production',
  trustedProxies,
  cors: { origins: list(process.env.CORS_ORIGINS ?? 'http://localhost:3001') },
  rateLimit: {
    windowMs: integer('RATE_LIMIT_WINDOW_MS', 60000),
    max: integer('RATE_LIMIT_MAX', 100),
    loginMax: integer('LOGIN_RATE_LIMIT_MAX', 10),
    csrfMax: integer('CSRF_RATE_LIMIT_MAX', 30),
  },
  http: {
    maxBodyBytes: integer('API_MAX_BODY_BYTES', 1048576),
    upstreamTimeoutMs: integer('UPSTREAM_TIMEOUT_MS', 25000),
    bodyTimeoutMs: integer('BODY_TIMEOUT_MS', 10000),
  },
};
export default config;
