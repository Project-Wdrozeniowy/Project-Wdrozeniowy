import { vi } from 'vitest';
import type { MyProfile, UserProfile } from '@/shared/api/user/user.dto';

// Mock the apiClient singleton used by userClient.
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/shared/api/client/api', () => ({
  apiClient: mockApiClient,
}));

// Import after mock is in place
const { userService } = await import('@/shared/api/user/userClient');

const mockProfile: UserProfile = {
  id: 1,
  username: 'johndoe',
  displayName: 'John Doe',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockMyProfile: MyProfile = { ...mockProfile, email: 'john@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('userService.getProfile >-65 GET /users/:username', () => {
  it('calls apiClient.get with /users/:username', async () => {
    mockApiClient.get.mockResolvedValue(mockProfile);
    const result = await userService.getProfile('johndoe');
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/johndoe');
    expect(result).toEqual(mockProfile);
  });
});

describe('userService.getMyProfile >-65 GET /users/me', () => {
  it('calls apiClient.get with /users/me', async () => {
    mockApiClient.get.mockResolvedValue(mockMyProfile);
    const result = await userService.getMyProfile();
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/me', undefined);
    expect(result.email).toBe('john@example.com');
  });

  it('forwards request options', async () => {
    mockApiClient.get.mockResolvedValue(mockMyProfile);
    await userService.getMyProfile({ skipErrorToast: true });
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/me', { skipErrorToast: true });
  });
});

describe('userService.updateMyProfile >-65 PATCH /users/me', () => {
  it('calls apiClient.patch with /users/me and data', async () => {
    const updateData = { displayName: 'Jane Doe' };
    const updated = { ...mockMyProfile, displayName: 'Jane Doe' };
    mockApiClient.patch.mockResolvedValue(updated);
    const result = await userService.updateMyProfile(updateData);
    expect(mockApiClient.patch).toHaveBeenCalledWith('/users/me', updateData, undefined);
    expect(result.displayName).toBe('Jane Doe');
  });

  it('forwards request options', async () => {
    mockApiClient.patch.mockResolvedValue(mockMyProfile);
    await userService.updateMyProfile({ bio: '' }, { skipErrorToast: true });
    expect(mockApiClient.patch).toHaveBeenCalledWith(
      '/users/me',
      { bio: '' },
      { skipErrorToast: true }
    );
  });
});

describe('userService.changePassword >-65 POST /users/me/password', () => {
  it('calls apiClient.post with /users/me/password and both passwords', async () => {
    const data = { currentPassword: 'old-password', newPassword: 'new-password' };
    mockApiClient.post.mockResolvedValue(undefined);
    await userService.changePassword(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/users/me/password', data, undefined);
  });

  it('passes the request config on, e.g. to skip the global error toast', async () => {
    const data = { currentPassword: 'old-password', newPassword: 'new-password' };
    mockApiClient.post.mockResolvedValue(undefined);
    await userService.changePassword(data, { skipErrorToast: true });
    expect(mockApiClient.post).toHaveBeenCalledWith('/users/me/password', data, {
      skipErrorToast: true,
    });
  });
});
