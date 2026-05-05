import type { GatewayConfig } from '../types';

describe('Gateway config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Restore env to setup values before each test
    process.env.JWT_SECRET = 'dGVzdA==';
    process.env.CORS_ORIGINS = 'http://localhost:3001';
    delete process.env.PORT;
    delete process.env.BACKEND_URL;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  function loadConfig(): GatewayConfig {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../config') as { default: GatewayConfig };
    return mod.default;
  }

  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => loadConfig()).toThrow('Missing required environment variable: JWT_SECRET');
  });

  it('uses default port 3000 when PORT is not set', () => {
    const config = loadConfig();
    expect(config.port).toBe(3000);
  });

  it('uses custom PORT when set', () => {
    process.env.PORT = '4500';
    const config = loadConfig();
    expect(config.port).toBe(4500);
  });

  it('throws when PORT is not a valid integer', () => {
    process.env.PORT = 'not-a-number';
    expect(() => loadConfig()).toThrow('must be an integer');
  });

  it('uses default backendUrl when BACKEND_URL is not set', () => {
    const config = loadConfig();
    expect(config.backendUrl).toBe('http://localhost:8080');
  });

  it('uses custom BACKEND_URL when set', () => {
    process.env.BACKEND_URL = 'http://my-backend.example.com';
    const config = loadConfig();
    expect(config.backendUrl).toBe('http://my-backend.example.com');
  });

  it('parses CORS_ORIGINS correctly (comma-separated with spaces)', () => {
    process.env.CORS_ORIGINS = 'http://a.example.com, http://b.example.com, ';
    const config = loadConfig();
    expect(config.cors.origins).toEqual(['http://a.example.com', 'http://b.example.com']);
  });

  it('uses default CORS origin when CORS_ORIGINS is not set', () => {
    delete process.env.CORS_ORIGINS;
    const config = loadConfig();
    expect(config.cors.origins).toEqual(['http://localhost:3001']);
  });

  it('always includes POST /api/auth/login in publicRoutes', () => {
    const config = loadConfig();
    expect(config.publicRoutes).toContainEqual({ method: 'POST', path: '/api/auth/login' });
  });

  it('always includes POST /api/auth/register in publicRoutes', () => {
    const config = loadConfig();
    expect(config.publicRoutes).toContainEqual({ method: 'POST', path: '/api/auth/register' });
  });

  it('uses custom rate limit window', () => {
    process.env.RATE_LIMIT_WINDOW_MS = '30000';
    const config = loadConfig();
    expect(config.rateLimit.windowMs).toBe(30000);
  });

  it('uses custom rate limit max', () => {
    process.env.RATE_LIMIT_MAX = '50';
    const config = loadConfig();
    expect(config.rateLimit.max).toBe(50);
  });
});
