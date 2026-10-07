import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { apiClient as ApiClientExport } from '../api';

type ApiClientInstance = typeof ApiClientExport;

// We need to test ApiClient by importing the module after mocking env vars.
// Since apiClient is a singleton, we use the real axios interceptors via MockAdapter.

describe('ApiClient >-65 resolveBaseURL', () => {
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

describe('ApiClient >-65 HTTP methods', () => {
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

describe('ApiClient >-65 request interceptor (Authorization header)', () => {
  afterEach(() => {
    vi.resetModules();
  });

  async function setup() {
    vi.resetModules();
    const { tokenMemory } = await import('@/lib/tokenMemory');
    const { apiClient } = await import('../api');
    const mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
    return { tokenMemory, apiClient, mock };
  }

  it('attaches the Bearer token held in memory', async () => {
    const { tokenMemory, apiClient, mock } = await setup();
    tokenMemory.set('test-jwt-token');

    let capturedHeader: string | undefined;
    mock.onGet('/secure').reply((config) => {
      capturedHeader = config.headers?.Authorization as string;
      return [200, {}];
    });

    await apiClient.get('/secure');
    expect(capturedHeader).toBe('Bearer test-jwt-token');
    mock.restore();
  });

  it('does not attach Authorization when there is no token', async () => {
    const { apiClient, mock } = await setup();

    let capturedHeader: string | undefined;
    mock.onGet('/public').reply((config) => {
      capturedHeader = config.headers?.Authorization as string;
      return [200, {}];
    });

    await apiClient.get('/public');
    expect(capturedHeader).toBeUndefined();
    mock.restore();
  });

  it('never reads tokens from localStorage', async () => {
    const { apiClient, mock } = await setup();
    localStorage.setItem('accessToken', 'stale-token');

    let capturedHeader: string | undefined;
    mock.onGet('/public').reply((config) => {
      capturedHeader = config.headers?.Authorization as string;
      return [200, {}];
    });

    await apiClient.get('/public');
    expect(capturedHeader).toBeUndefined();
    localStorage.clear();
    mock.restore();
  });
});

describe('ApiClient >-65 session refresh', () => {
  afterEach(() => {
    vi.resetModules();
  });

  async function setup() {
    vi.resetModules();
    const { tokenMemory } = await import('@/lib/tokenMemory');
    const { apiClient } = await import('../api');
    const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
    const mock = new MockAdapter(axiosInstance);
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: '/current' },
    });
    return { tokenMemory, apiClient, mock, axiosInstance };
  }

  it('sends credentials so the httpOnly refresh cookie is included', async () => {
    const { axiosInstance } = await setup();
    expect(axiosInstance.defaults.withCredentials).toBe(true);
  });

  it('refreshAccessToken stores the new token in memory', async () => {
    const { tokenMemory, apiClient, mock } = await setup();
    mock.onPost('/auth/refresh').reply(200, { accessToken: 'new-token', tokenType: 'Bearer' });

    await expect(apiClient.refreshAccessToken()).resolves.toBe('new-token');
    expect(tokenMemory.get()).toBe('new-token');
  });

  it('shares one request between concurrent refresh calls', async () => {
    const { apiClient, mock } = await setup();
    mock.onPost('/auth/refresh').reply(200, { accessToken: 'new-token', tokenType: 'Bearer' });

    const [a, b] = await Promise.all([
      apiClient.refreshAccessToken(),
      apiClient.refreshAccessToken(),
    ]);

    expect(a).toBe('new-token');
    expect(b).toBe('new-token');
    expect(mock.history.post.filter((r) => r.url === '/auth/refresh')).toHaveLength(1);
  });

  it('starts a new request once the previous refresh has settled', async () => {
    const { apiClient, mock } = await setup();
    mock.onPost('/auth/refresh').reply(200, { accessToken: 'new-token', tokenType: 'Bearer' });

    await apiClient.refreshAccessToken();
    await apiClient.refreshAccessToken();

    expect(mock.history.post.filter((r) => r.url === '/auth/refresh')).toHaveLength(2);
  });

  it('refreshes and retries the request once after a 401', async () => {
    const { tokenMemory, apiClient, mock } = await setup();
    tokenMemory.set('expired-token');
    mock.onPost('/auth/refresh').reply(200, { accessToken: 'new-token', tokenType: 'Bearer' });
    let calls = 0;
    mock.onGet('/protected').reply((config) => {
      calls += 1;
      return calls === 1
        ? [401, {}]
        : [200, { ok: config.headers?.Authorization === 'Bearer new-token' }];
    });

    await expect(apiClient.get('/protected')).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
    expect(window.location.href).toBe('/current');
  });

  it('clears the token and redirects to /login when the refresh fails', async () => {
    const { tokenMemory, apiClient, mock } = await setup();
    tokenMemory.set('expired-token');
    mock.onPost('/auth/refresh').reply(401, {});
    mock.onGet('/protected').reply(401, {});

    await expect(apiClient.get('/protected')).rejects.toBeDefined();
    expect(tokenMemory.get()).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does not retry a request that already failed after a refresh', async () => {
    const { tokenMemory, apiClient, mock } = await setup();
    tokenMemory.set('token');
    mock.onPost('/auth/refresh').reply(200, { accessToken: 'new-token', tokenType: 'Bearer' });
    mock.onGet('/protected').reply(401, {});

    await expect(apiClient.get('/protected')).rejects.toBeDefined();
    expect(mock.history.get.filter((r) => r.url === '/protected')).toHaveLength(2);
  });

  it('does not refresh or redirect on 401 from /auth endpoints', async () => {
    const { apiClient, mock } = await setup();
    mock.onPost('/auth/login').reply(401, { detail: 'Bad credentials' });

    await expect(apiClient.post('/auth/login', {})).rejects.toBeDefined();
    expect(mock.history.post.filter((r) => r.url === '/auth/refresh')).toHaveLength(0);
    expect(window.location.href).toBe('/current');
  });
});
