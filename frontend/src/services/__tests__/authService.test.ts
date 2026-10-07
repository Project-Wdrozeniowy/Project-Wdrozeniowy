import { vi } from 'vitest';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

const { authService } = await import('@/services/authService');
const { tokenMemory } = await import('@/lib/tokenMemory');

const mockAuthResponse = {
  accessToken: 'access-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
};

beforeEach(() => {
  vi.clearAllMocks();
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
  it('sets the access token in memory before requesting the profile', async () => {
    const profile = { id: 1, username: 'john' };
    mockApiClient.get.mockImplementation(async () => {
      expect(tokenMemory.get()).toBe('fresh-access-token');
      return profile;
    });

    const result = await authService.loadProfile('fresh-access-token');

    expect(mockApiClient.get).toHaveBeenCalledWith('/users/me');
    expect(result).toEqual(profile);
  });
});
