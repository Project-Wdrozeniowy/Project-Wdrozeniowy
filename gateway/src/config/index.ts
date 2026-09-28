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

function getIntEnv(key: string, fallback: string): number {
  const raw = getEnv(key, fallback);
  const value = parseInt(raw, 10);
  if (isNaN(value)) {
    throw new Error(`Environment variable ${key} must be an integer, got: "${raw}"`);
  }
  return value;
}

function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

const config: GatewayConfig = {
  port: getIntEnv('PORT', '3000'),
  backendUrl: getEnv('BACKEND_URL', 'http://localhost:8080'),
  jwtSecret: requireEnv('JWT_SECRET'),
  cors: {
    origins: parseOrigins(getEnv('CORS_ORIGINS', 'http://localhost:3001')),
  },
  rateLimit: {
    windowMs: getIntEnv('RATE_LIMIT_WINDOW_MS', '60000'),
    max: getIntEnv('RATE_LIMIT_MAX', '100'),
  },
  publicRoutes: [
    // Auth — login, register, refresh, and logout are all public
    // (logout revokes by refreshToken value, no access token needed)
    { method: 'POST', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/register' },
    { method: 'POST', path: '/api/auth/refresh' },
    { method: 'POST', path: '/api/auth/logout' },

    // Forum — browsing is public; mutations require auth (enforced by Spring Security)
    { method: 'GET', pathPrefix: '/api/forum/categories' },
    { method: 'GET', pathPrefix: '/api/forum/posts' },
    { method: 'GET', pathPrefix: '/api/forum/tags' },
    { method: 'GET', pathPrefix: '/api/forum/comments' },

    // User profiles — public read
    { method: 'GET', pathPrefix: '/api/users' },

    // Recommendations — always public
    { method: 'GET', pathPrefix: '/api/recommendations' },

    // Analytics trending posts — public (aggregate data, no PII)
    { method: 'GET', path: '/api/analytics/trending-posts' },

    // OpenAPI / Swagger UI
    { method: 'GET', pathPrefix: '/api/swagger-ui' },
    { method: 'GET', pathPrefix: '/api/v3/api-docs' },
  ],
};

export default config;
