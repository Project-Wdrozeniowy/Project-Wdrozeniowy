import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AuthProvider from '../AuthProvider';
import { useStore } from '@/store';
import { tokenMemory } from '@/lib/tokenMemory';
import { apiClient } from '@/services/api';
import { authService } from '@/services/authService';
import type { UserProfile } from '@/shared/types';

vi.mock('@/services/api', () => ({
  apiClient: { refreshAccessToken: vi.fn() },
}));

vi.mock('@/services/authService', () => ({
  authService: { loadProfile: vi.fn() },
}));

const mockUser = { id: 1, username: 'alice', role: 'USER' } as UserProfile;

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
    vi.mocked(authService.loadProfile).mockResolvedValue(mockUser);

    renderProvider();

    await waitFor(() => expect(useStore.getState().isAuthenticated).toBe(true));
    expect(authService.loadProfile).toHaveBeenCalledWith('fresh-token');
    expect(useStore.getState().user).toEqual(mockUser);
    expect(useStore.getState().isInitialized).toBe(true);
    expect(tokenMemory.get()).toBe('fresh-token');
  });

  it('stays a guest but marks the app initialised when there is no valid session', async () => {
    vi.mocked(apiClient.refreshAccessToken).mockRejectedValue(new Error('401'));

    renderProvider();

    await waitFor(() => expect(useStore.getState().isInitialized).toBe(true));
    expect(useStore.getState().isAuthenticated).toBe(false);
    expect(authService.loadProfile).not.toHaveBeenCalled();
  });

  it('stays a guest when the profile cannot be loaded', async () => {
    vi.mocked(apiClient.refreshAccessToken).mockResolvedValue('fresh-token');
    vi.mocked(authService.loadProfile).mockRejectedValue(new Error('500'));

    renderProvider();

    await waitFor(() => expect(useStore.getState().isInitialized).toBe(true));
    expect(useStore.getState().isAuthenticated).toBe(false);
  });
});
