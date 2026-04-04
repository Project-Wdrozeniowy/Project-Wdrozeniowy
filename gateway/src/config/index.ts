import 'dotenv/config';
import type { GatewayConfig } from '../types';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const config: GatewayConfig = {
  port: parseInt(getEnv('PORT', '3000'), 10),
  backendUrl: getEnv('BACKEND_URL', 'http://localhost:8080'),
  jwtSecret: requireEnv('JWT_SECRET'),
  cors: {
    origins: getEnv('CORS_ORIGINS', 'http://localhost:3001').split(','),
  },
  rateLimit: {
    windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    max: parseInt(getEnv('RATE_LIMIT_MAX', '100'), 10),
  },
  publicRoutes: [
    { method: 'POST', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/register' },
  ],
};

export default config;
