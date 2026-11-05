import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
const profile: MyProfileDto = {
  id: 1,
  username: 'john',
  email: 'john@example.test',
  displayName: null,
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
};
import { vi } from 'vitest';
import { loadProfile } from '@/shared/auth/loadProfile';
import { currentProfile } from '@/shared/api/generated/orbita.api';
import { tokenMemory } from '@/shared/auth/tokenMemory';
vi.mock('@/shared/api/generated/orbita.api', () => ({ currentProfile: vi.fn() }));
const mockApiClient = { get: vi.mocked(currentProfile) };
beforeEach(() => {
  vi.resetAllMocks();
  tokenMemory.set(null);
});
describe('loadProfile >-65 GET /users/me', () => {
  it('clears the pending token and preserves the profile error (PWDRZ-155)', async () => {
    const error = new Error('profile unavailable');
    mockApiClient.get.mockRejectedValueOnce(error);

    await expect(loadProfile('pending-token')).rejects.toBe(error);

    expect(tokenMemory.get()).toBeNull();
  });

  it('does not clear a newer session when an older profile request fails (PWDRZ-155)', async () => {
    let rejectProfile!: (reason: Error) => void;
    mockApiClient.get.mockImplementationOnce(
      () => new Promise((_, reject) => (rejectProfile = reject))
    );
    const profileRequest = loadProfile('old-token');
    tokenMemory.set('new-token');
    const error = new Error('older request failed');
    rejectProfile(error);

    await expect(profileRequest).rejects.toBe(error);
    expect(tokenMemory.get()).toBe('new-token');
  });

  it('sets the access token in memory before requesting the profile', async () => {
    mockApiClient.get.mockImplementation(async () => {
      expect(tokenMemory.get()).toBe('fresh-access-token');
      return profile;
    });

    const result = await loadProfile('fresh-access-token');

    expect(mockApiClient.get).toHaveBeenCalledWith();
    expect(result).toEqual(profile);
  });

  it('keeps the issued token in memory once the profile has loaded (PWDRZ-155)', async () => {
    mockApiClient.get.mockResolvedValue(profile);

    await expect(loadProfile('issued-token')).resolves.toEqual(profile);

    expect(tokenMemory.get()).toBe('issued-token');
  });

  it.each([
    ['a server error', Object.assign(new Error('Request failed'), { response: { status: 500 } })],
    ['a network failure', new Error('Network Error')],
  ])(
    'clears the pending token and rejects with the original error after %s (PWDRZ-155)',
    async (_name, error) => {
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(loadProfile('pending-token')).rejects.toBe(error);

      expect(tokenMemory.get()).toBeNull();
    }
  );

  it('keeps a newer token when an older profile request succeeds later (PWDRZ-155)', async () => {
    let resolveProfile!: (profile: MyProfileDto) => void;
    mockApiClient.get.mockImplementationOnce(
      () => new Promise((resolve) => (resolveProfile = resolve))
    );
    const profileRequest = loadProfile('old-token');
    tokenMemory.set('new-token');
    resolveProfile(profile);

    await profileRequest;
    expect(tokenMemory.get()).toBe('new-token');
  });

  it('never writes the token to browser storage, whether the profile loads or not (PWDRZ-155)', async () => {
    // Start from empty storage so only what loadProfile does is measured.
    localStorage.clear();
    sessionStorage.clear();
    mockApiClient.get.mockResolvedValueOnce(profile);
    await loadProfile('stored-nowhere-1');
    mockApiClient.get.mockRejectedValueOnce(new Error('profile unavailable'));
    await expect(loadProfile('stored-nowhere-2')).rejects.toThrow();

    for (const storage of [localStorage, sessionStorage]) {
      expect(storage.length).toBe(0);
    }
  });
});
