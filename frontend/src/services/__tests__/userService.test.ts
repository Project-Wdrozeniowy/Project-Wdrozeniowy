import { vi } from 'vitest';
import type { UserProfile } from '@/types';

// Mock the apiClient singleton
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

// Import after mock is in place
const { userService } = await import('@/services/userService');

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('userService.getProfile', () => {
  it('calls apiClient.get with /users/:username', async () => {
    mockApiClient.get.mockResolvedValue(mockProfile);
    const result = await userService.getProfile('johndoe');
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/johndoe');
    expect(result).toEqual(mockProfile);
  });
});

describe('userService.getMyProfile', () => {
  it('calls apiClient.get with /users/me', async () => {
    mockApiClient.get.mockResolvedValue(mockProfile);
    const result = await userService.getMyProfile();
    expect(mockApiClient.get).toHaveBeenCalledWith('/users/me');
    expect(result).toEqual(mockProfile);
  });
});

describe('userService.updateMyProfile', () => {
  it('calls apiClient.patch with /users/me and data', async () => {
    const updateData = { displayName: 'Jane Doe' };
    const updated = { ...mockProfile, displayName: 'Jane Doe' };
    mockApiClient.patch.mockResolvedValue(updated);
    const result = await userService.updateMyProfile(updateData);
    expect(mockApiClient.patch).toHaveBeenCalledWith('/users/me', updateData);
    expect(result.displayName).toBe('Jane Doe');
  });
});
