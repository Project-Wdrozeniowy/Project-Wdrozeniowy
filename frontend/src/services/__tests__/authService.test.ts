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

const mockAuthResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
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

describe('authService.refresh >-65 POST /auth/refresh', () => {
  it('calls apiClient.post with /auth/refresh and refresh token', async () => {
    const data = { refreshToken: 'old-refresh-token' };
    const renewed = { ...mockAuthResponse, accessToken: 'new-access-token' };
    mockApiClient.post.mockResolvedValue(renewed);

    const result = await authService.refresh(data);

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', data);
    expect(result).toEqual(renewed);
  });
});

describe('authService.logout >-65 POST /auth/logout', () => {
  it('calls apiClient.post with /auth/logout and refresh token', async () => {
    const data = { refreshToken: 'refresh-token' };
    mockApiClient.post.mockResolvedValue(undefined);

    await authService.logout(data);

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout', data);
  });
});
