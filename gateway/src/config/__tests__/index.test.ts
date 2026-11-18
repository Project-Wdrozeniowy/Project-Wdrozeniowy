import type { GatewayConfig } from '../../types';
jest.mock('dotenv/config', () => ({}));
function loadConfig(): GatewayConfig {
  jest.resetModules();
  return jest.requireActual<{ default: GatewayConfig }>('../index').default;
}

beforeEach(() => {
  for (const key of [
    'JWT_SECRET',
    'PORT',
    'BACKEND_URL',
    'TRUSTED_PROXY_CIDRS',
    'API_MAX_BODY_BYTES',
    'UPSTREAM_TIMEOUT_MS',
    'LOGIN_RATE_LIMIT_MAX',
    'CSRF_RATE_LIMIT_MAX',
  ]) {
    Reflect.deleteProperty(process.env, key);
  }
});

test('starts without a JWT secret or a public-route access policy', () => {
  const config = loadConfig();
  expect(config).not.toHaveProperty('jwtSecret');
  expect(config).not.toHaveProperty('publicRoutes');
  expect(config.trustedProxies).toEqual([]);
  expect(config.port).toBe(3000);
});

test.each(['0', '-1', '1.5', '12junk', 'NaN', '9007199254740992'])(
  'rejects invalid positive-integer budgets: %s',
  (value) => {
    process.env.UPSTREAM_TIMEOUT_MS = value;
    expect(loadConfig).toThrow('positive integer');
  }
);

test.each(['true', '*', '1', 'proxy.example', '127.0.0.1/99', '::1/129', '::1/', '::1/64/1'])(
  'rejects unrestricted or ambiguous proxy trust: %s',
  (value) => {
    process.env.TRUSTED_PROXY_CIDRS = value;
    expect(loadConfig).toThrow('explicit IP');
  }
);

test('accepts explicit proxy addresses and subnets', () => {
  process.env.TRUSTED_PROXY_CIDRS = '127.0.0.1,10.0.0.0/24,::1,::/64';
  expect(loadConfig().trustedProxies).toHaveLength(4);
});

test.each([
  'file:///tmp',
  'http://user:pass@localhost',
  'http://localhost/api',
  'http://localhost?target=other',
  'http://:password@localhost',
  'http://localhost#fragment',
])('rejects a non-origin upstream: %s', (value) => {
  process.env.BACKEND_URL = value;
  expect(loadConfig).toThrow('fixed HTTP(S) origin');
});
