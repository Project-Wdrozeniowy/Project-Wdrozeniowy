import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AuthProvider from '@/app/providers/AuthProvider';
import { useStore } from '@/store';
import { tokenMemory } from '@/shared/auth/tokenMemory';
import { apiClient } from '@/shared/api/client/api';
import { loadProfile } from '@/shared/auth/loadProfile';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';

vi.mock('@/shared/api/client/api', () => ({
  apiClient: { refreshAccessToken: vi.fn() },
}));

vi.mock('@/shared/auth/loadProfile', () => ({ loadProfile: vi.fn() }));

const mockUser: MyProfileDto = {
  id: 1,
  username: 'alice',
  email: 'alice@example.test',
  displayName: null,
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  tokenMemory.set(null);
  useStore.setState({ user: null, isAuthenticated: false, isInitialized: false });
});

function renderProvider() {
  return render(
    <AuthProvider>
      <div>app</div>
    </AuthProvider>
  );
}

describe('AuthProvider', () => {
  it('renders children immediately', () => {
    vi.mocked(apiClient.refreshAccessToken).mockReturnValue(new Promise(() => {}));
    renderProvider();
    expect(screen.getByText('app')).toBeInTheDocument();
  });

  it('restores the session from the refresh cookie', async () => {
    vi.mocked(apiClient.refreshAccessToken).mockResolvedValue('fresh-token');
    vi.mocked(loadProfile).mockResolvedValue(mockUser);

    renderProvider();

    await waitFor(() => expect(useStore.getState().isAuthenticated).toBe(true));
    expect(loadProfile).toHaveBeenCalledWith('fresh-token');
    expect(useStore.getState().user).toEqual(mockUser);
    expect(useStore.getState().isInitialized).toBe(true);
    expect(tokenMemory.get()).toBe('fresh-token');
  });

  it('stays a guest but marks the app initialised when there is no valid session', async () => {
    vi.mocked(apiClient.refreshAccessToken).mockRejectedValue(new Error('401'));

    renderProvider();

    await waitFor(() => expect(useStore.getState().isInitialized).toBe(true));
    expect(useStore.getState().isAuthenticated).toBe(false);
    expect(loadProfile).not.toHaveBeenCalled();
  });

  it('stays a guest when the profile cannot be loaded', async () => {
    vi.mocked(apiClient.refreshAccessToken).mockResolvedValue('fresh-token');
    vi.mocked(loadProfile).mockRejectedValue(new Error('500'));

    renderProvider();

    await waitFor(() => expect(useStore.getState().isInitialized).toBe(true));
    expect(useStore.getState().isAuthenticated).toBe(false);
  });
});
