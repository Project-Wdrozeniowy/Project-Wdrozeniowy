import { vi } from 'vitest';
import type { ApiResponse, User } from '@/types';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

const { userService } = await import('@/services/userService');

const mockUser: User = {
  id: '1',
  username: 'userone',
  email: 'user@example.com',
  displayName: 'User One',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  message: 'OK',
  status: 200,
  success: true,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('userService.getUsers', () => {
  it('calls apiClient.get with /users', async () => {
    mockApiClient.get.mockResolvedValue(mockResponse([mockUser]));
    const result = await userService.getUsers();
    expect(mockApiClient.get).toHaveBeenCalledWith('/users');
    expect(result.data).toEqual([mockUser]);
  });
});

describe('userService.getUser', () => {
  it('calls apiClient.get with /users/:id', async () => {
    mockApiClient.get.mockResolvedValue(mockResponse(mockUser));
    const result = await userService.getUser('1');
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/1');
    expect(result.data).toEqual(mockUser);
  });
});

describe('userService.createUser', () => {
  it('calls apiClient.post with /users and data', async () => {
    const newUserData = { email: 'new@example.com', username: 'newuser', displayName: 'New User' };
    mockApiClient.post.mockResolvedValue(mockResponse(mockUser));
    const result = await userService.createUser(newUserData);
    expect(mockApiClient.post).toHaveBeenCalledWith('/users', newUserData);
    expect(result.data).toEqual(mockUser);
  });
});

describe('userService.updateUser', () => {
  it('calls apiClient.patch with /users/:id and data', async () => {
    const updateData = { displayName: 'Updated Name' };
    mockApiClient.patch.mockResolvedValue(mockResponse({ ...mockUser, ...updateData }));
    const result = await userService.updateUser('1', updateData);
    expect(mockApiClient.patch).toHaveBeenCalledWith('/users/1', updateData);
    expect(result.data.displayName).toBe('Updated Name');
  });
});

describe('userService.deleteUser', () => {
  it('calls apiClient.delete with /users/:id', async () => {
    mockApiClient.delete.mockResolvedValue(mockResponse(null));
    const result = await userService.deleteUser('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/users/1');
    expect(result.data).toBeNull();
  });
});
