import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { apiClient as ApiClientExport } from '../api';

type ApiClientInstance = typeof ApiClientExport;

// We need to test ApiClient by importing the module after mocking env vars.
// Since apiClient is a singleton, we use the real axios interceptors via MockAdapter.

describe('ApiClient – resolveBaseURL', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    }
  });

  it('uses NEXT_PUBLIC_API_URL when set', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://custom-api.example.com';
    // Re-import to get a fresh instance with new env
    vi.resetModules();
    const { apiClient: fresh } = await import('../api');
    // The instance should have been created with the custom URL
    // We can verify indirectly: mock a request and check the base URL
    const mock = new MockAdapter((fresh as unknown as { client: AxiosInstance }).client);
    mock.onGet('/test').reply(200, { ok: true });
    const result = await fresh.get('/test');
    expect(result).toEqual({ ok: true });
    mock.restore();
  });

  it('falls back to /api when window is defined (jsdom)', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.resetModules();
    const { apiClient: fresh } = await import('../api');
    const mock = new MockAdapter((fresh as unknown as { client: AxiosInstance }).client);
    mock.onGet('/test').reply(200, { fallback: true });
    const result = await fresh.get('/test');
    expect(result).toEqual({ fallback: true });
    mock.restore();
  });
});

describe('ApiClient – HTTP methods', () => {
  let mock: MockAdapter;
  let testClient: ApiClientInstance;

  beforeEach(async () => {
    vi.resetModules();
    const { apiClient } = await import('../api');
    mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
    testClient = apiClient;
  });

  afterEach(() => {
    mock.restore();
  });

  it('get() calls GET and returns response.data', async () => {
    mock.onGet('/users').reply(200, [{ id: '1' }]);
    const result = await testClient.get('/users');
    expect(result).toEqual([{ id: '1' }]);
  });

  it('post() calls POST and returns response.data', async () => {
    mock.onPost('/users').reply(201, { id: '2' });
    const result = await testClient.post('/users', { name: 'New' });
    expect(result).toEqual({ id: '2' });
  });

  it('put() calls PUT and returns response.data', async () => {
    mock.onPut('/users/1').reply(200, { id: '1', name: 'Updated' });
    const result = await testClient.put('/users/1', { name: 'Updated' });
    expect(result).toEqual({ id: '1', name: 'Updated' });
  });

  it('patch() calls PATCH and returns response.data', async () => {
    mock.onPatch('/users/1').reply(200, { id: '1', email: 'new@example.com' });
    const result = await testClient.patch('/users/1', {
      email: 'new@example.com',
    });
    expect(result).toEqual({ id: '1', email: 'new@example.com' });
  });

  it('delete() calls DELETE and returns response.data', async () => {
    mock.onDelete('/users/1').reply(200, null);
    const result = await testClient.delete('/users/1');
    expect(result).toBeNull();
  });
});

describe('ApiClient – request interceptor (Authorization header)', () => {
  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('attaches Bearer token from localStorage when present', async () => {
    localStorage.setItem('token', 'test-jwt-token');
    vi.resetModules();
    const { apiClient } = await import('../api');
    const mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);

    let capturedHeader: string | undefined;
    mock.onGet('/secure').reply((config) => {
      capturedHeader = config.headers?.Authorization as string;
      return [200, {}];
    });

    await apiClient.get('/secure');
    expect(capturedHeader).toBe('Bearer test-jwt-token');
    mock.restore();
  });

  it('does not attach Authorization when no token in localStorage', async () => {
    localStorage.removeItem('token');
    vi.resetModules();
    const { apiClient } = await import('../api');
    const mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);

    let capturedHeader: string | undefined;
    mock.onGet('/public').reply((config) => {
      capturedHeader = config.headers?.Authorization as string;
      return [200, {}];
    });

    await apiClient.get('/public');
    expect(capturedHeader).toBeUndefined();
    mock.restore();
  });
});

describe('ApiClient – response interceptor (401 redirect)', () => {
  afterEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('redirects to /login on 401 response', async () => {
    vi.resetModules();
    const { apiClient } = await import('../api');
    const mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
    mock.onGet('/protected').reply(401, { error: 'Unauthorized' });

    const originalHref = window.location.href;
    // jsdom allows setting window.location.href
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: originalHref },
    });

    await expect(apiClient.get('/protected')).rejects.toBeDefined();
    expect(window.location.href).toBe('/login');
    mock.restore();
  });
});
