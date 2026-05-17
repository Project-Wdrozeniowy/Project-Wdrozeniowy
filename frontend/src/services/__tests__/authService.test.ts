import { vi } from 'vitest';
import type { AuthResponse } from '@/shared/types';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

vi.mock('@/lib/tokenMemory', () => ({
  tokenMemory: { get: vi.fn(), set: vi.fn() },
}));

const { authService } = await import('@/services/authService');

const mockAuthResponse: AuthResponse = {
  accessToken: 'access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: '1', username: 'alice', email: 'alice@example.com', role: 'user' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService.login', () => {
  it('posts to /auth/login and returns AuthResponse', async () => {
    mockApiClient.post.mockResolvedValue(mockAuthResponse);
    const result = await authService.login({ email: 'alice@example.com', password: 'pass' });
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'alice@example.com',
      password: 'pass',
    });
    expect(result.accessToken).toBe('access-token');
    expect(result.user.username).toBe('alice');
  });
});

describe('authService.register', () => {
  it('posts to /auth/register and returns AuthResponse', async () => {
    mockApiClient.post.mockResolvedValue(mockAuthResponse);
    const result = await authService.register({
      username: 'alice',
      email: 'alice@example.com',
      password: 'pass123',
      displayName: 'Alice',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', expect.any(Object));
    expect(result.accessToken).toBe('access-token');
  });
});

describe('authService.refresh', () => {
  it('posts to /auth/refresh with no body', async () => {
    mockApiClient.post.mockResolvedValue(mockAuthResponse);
    const result = await authService.refresh();
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh');
    expect(result.accessToken).toBe('access-token');
  });
});

describe('authService.me', () => {
  it('gets /auth/me and returns AuthResponse', async () => {
    mockApiClient.get.mockResolvedValue(mockAuthResponse);
    const result = await authService.me();
    expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
    expect(result.user.username).toBe('alice');
  });
});

describe('authService.logout', () => {
  it('posts to /auth/logout', async () => {
    mockApiClient.post.mockResolvedValue(undefined);
    await authService.logout();
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
  });
});
