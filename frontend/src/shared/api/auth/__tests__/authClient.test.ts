import { vi } from 'vitest';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/shared/api/client/api', () => ({
  apiClient: mockApiClient,
}));

const { authService } = await import('@/shared/api/auth/authClient');
const { tokenMemory } = await import('@/shared/auth/tokenMemory');

const mockAuthResponse = {
  accessToken: 'access-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
};

beforeEach(() => {
  vi.clearAllMocks();
  tokenMemory.set(null);
});

describe('authService.register >-65 POST /auth/register', () => {
  it('calls apiClient.post with /auth/register and request body', async () => {
    const data = { username: 'john', email: 'john@example.com', password: 'secret123' };
    mockApiClient.post.mockResolvedValue(mockAuthResponse);

    const result = await authService.register(data);

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', data);
    expect(result).toEqual(mockAuthResponse);
  });
});

describe('authService.register with a display name', () => {
  it('sends displayName with that exact field name', async () => {
    const data = {
      username: 'john',
      email: 'john@example.com',
      password: 'secret123',
      displayName: 'John Doe',
    };
    mockApiClient.post.mockResolvedValue(mockAuthResponse);

    await authService.register(data);

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', data);
  });

  it('sends no displayName key when there is none', async () => {
    mockApiClient.post.mockResolvedValue(mockAuthResponse);
    await authService.register({
      username: 'john',
      email: 'john@example.com',
      password: 'secret123',
    });
    expect(mockApiClient.post.mock.calls[0][1]).not.toHaveProperty('displayName');
  });
});

describe('other auth endpoints', () => {
  it('never carry a display name', async () => {
    mockApiClient.post.mockResolvedValue(mockAuthResponse);
    await authService.login({ username: 'john', password: 'secret123' });
    await authService.logout();
    for (const [url, body] of mockApiClient.post.mock.calls) {
      expect(url).not.toBe('/auth/register');
      expect(JSON.stringify(body ?? {})).not.toContain('displayName');
    }
  });
});

describe('authService.login >-65 POST /auth/login', () => {
  it('calls apiClient.post with /auth/login and credentials', async () => {
    const data = { username: 'john', password: 'secret123' };
    mockApiClient.post.mockResolvedValue(mockAuthResponse);

    const result = await authService.login(data);

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', data);
    expect(result).toEqual(mockAuthResponse);
  });
});

describe('authService.logout >-65 POST /auth/logout', () => {
  it('calls apiClient.post with /auth/logout and no body (the refresh cookie identifies the session)', async () => {
    mockApiClient.post.mockResolvedValue(undefined);

    await authService.logout();

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
  });
});

describe('authService.loadProfile >-65 GET /users/me', () => {
  it('clears the pending token and preserves the profile error (PWDRZ-155)', async () => {
    const error = new Error('profile unavailable');
    mockApiClient.get.mockRejectedValueOnce(error);

    await expect(authService.loadProfile('pending-token')).rejects.toBe(error);

    expect(tokenMemory.get()).toBeNull();
  });

  it('does not clear a newer session when an older profile request fails (PWDRZ-155)', async () => {
    let rejectProfile!: (reason: Error) => void;
    mockApiClient.get.mockImplementationOnce(
      () => new Promise((_, reject) => (rejectProfile = reject))
    );
    const profileRequest = authService.loadProfile('old-token');
    tokenMemory.set('new-token');
    const error = new Error('older request failed');
    rejectProfile(error);

    await expect(profileRequest).rejects.toBe(error);
    expect(tokenMemory.get()).toBe('new-token');
  });

  it('sets the access token in memory before requesting the profile', async () => {
    const profile = { id: 1, username: 'john' };
    mockApiClient.get.mockImplementation(async () => {
      expect(tokenMemory.get()).toBe('fresh-access-token');
      return profile;
    });

    const result = await authService.loadProfile('fresh-access-token');

    expect(mockApiClient.get).toHaveBeenCalledWith('/users/me', undefined);
    expect(result).toEqual(profile);
  });

  it('keeps the issued token in memory once the profile has loaded (PWDRZ-155)', async () => {
    const profile = { id: 1, username: 'john' };
    mockApiClient.get.mockResolvedValue(profile);

    await expect(authService.loadProfile('issued-token')).resolves.toEqual(profile);

    expect(tokenMemory.get()).toBe('issued-token');
  });

  it.each([
    ['a server error', Object.assign(new Error('Request failed'), { response: { status: 500 } })],
    ['a network failure', new Error('Network Error')],
  ])(
    'clears the pending token and rejects with the original error after %s (PWDRZ-155)',
    async (_name, error) => {
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(authService.loadProfile('pending-token')).rejects.toBe(error);

      expect(tokenMemory.get()).toBeNull();
    }
  );

  it('keeps a newer token when an older profile request succeeds later (PWDRZ-155)', async () => {
    let resolveProfile!: (profile: unknown) => void;
    mockApiClient.get.mockImplementationOnce(
      () => new Promise((resolve) => (resolveProfile = resolve))
    );
    const profileRequest = authService.loadProfile('old-token');
    tokenMemory.set('new-token');
    resolveProfile({ id: 1, username: 'john' });

    await profileRequest;
    expect(tokenMemory.get()).toBe('new-token');
  });

  it('never writes the token to browser storage, whether the profile loads or not (PWDRZ-155)', async () => {
    // Start from empty storage so only what loadProfile does is measured.
    localStorage.clear();
    sessionStorage.clear();
    mockApiClient.get.mockResolvedValueOnce({ id: 1, username: 'john' });
    await authService.loadProfile('stored-nowhere-1');
    mockApiClient.get.mockRejectedValueOnce(new Error('profile unavailable'));
    await expect(authService.loadProfile('stored-nowhere-2')).rejects.toThrow();

    for (const storage of [localStorage, sessionStorage]) {
      expect(storage.length).toBe(0);
    }
  });
});
