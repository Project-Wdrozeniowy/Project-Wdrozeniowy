import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AuthProvider from '@/app/_providers/AuthProvider';
import { SIGN_IN_FAILED_MESSAGE } from '@/features/sign-in/login.const';
import { useSignIn } from '@/features/sign-in/useSignIn';
import { REGISTER_ERROR_MESSAGE } from '@/features/sign-up/register.const';
import { useSignUp } from '@/features/sign-up/useSignUp';
import { tokenMemory } from '@/shared/auth/tokenMemory';
import { useStore } from '@/store';

/**
 * The real `authService.loadProfile` behind the three places that call it (session restore,
 * sign-in, sign-up). Only the transport is faked, so these show that a failed profile load leaves
 * no token behind and is never reported as a success (PWDRZ-155).
 */

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  refreshAccessToken: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/shared/api/client/api', () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    refreshAccessToken: mocks.refreshAccessToken,
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/shared/lib/toast', () => ({ toast: { success: mocks.success } }));

const profile = { id: 1, username: 'alice', displayName: null };
const signInForm = { username: 'alice', password: 'Password123' };
const signUpForm = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Password123',
  confirmPassword: 'Password123',
  displayName: '',
  terms: true as const,
};

beforeEach(() => {
  vi.resetAllMocks();
  tokenMemory.set(null);
  useStore.setState({ user: null, isAuthenticated: false, isInitialized: false });
});

describe('restoring the session on load', () => {
  function renderProvider() {
    return render(
      <AuthProvider>
        <div>app</div>
      </AuthProvider>
    );
  }

  it('keeps the token and signs in when the profile loads', async () => {
    mocks.refreshAccessToken.mockImplementation(async () => {
      tokenMemory.set('restored-token');
      return 'restored-token';
    });
    mocks.get.mockResolvedValue(profile);
    renderProvider();

    await waitFor(() => expect(useStore.getState().isAuthenticated).toBe(true));
    expect(tokenMemory.get()).toBe('restored-token');
  });

  it('stays a guest and sends no token afterwards when the profile cannot be loaded', async () => {
    mocks.refreshAccessToken.mockImplementation(async () => {
      tokenMemory.set('restored-token');
      return 'restored-token';
    });
    mocks.get.mockRejectedValue(new Error('500'));
    renderProvider();

    await waitFor(() => expect(useStore.getState().isInitialized).toBe(true));
    expect(screen.getByText('app')).toBeInTheDocument();
    expect(useStore.getState().isAuthenticated).toBe(false);
    expect(tokenMemory.get()).toBeNull();
  });
});

describe('signing in', () => {
  it('leaves no token and no success when the profile cannot be loaded', async () => {
    mocks.post.mockResolvedValue({ accessToken: 'issued-token' });
    mocks.get.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useSignIn());

    await act(() => result.current.signIn(signInForm));

    expect(tokenMemory.get()).toBeNull();
    expect(useStore.getState().isAuthenticated).toBe(false);
    expect(result.current.serverError).toBe(SIGN_IN_FAILED_MESSAGE);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('keeps the issued token and signs in when the profile loads', async () => {
    mocks.post.mockResolvedValue({ accessToken: 'issued-token' });
    mocks.get.mockResolvedValue(profile);
    const { result } = renderHook(() => useSignIn());

    await act(() => result.current.signIn(signInForm));

    expect(tokenMemory.get()).toBe('issued-token');
    expect(useStore.getState().isAuthenticated).toBe(true);
    expect(mocks.push).toHaveBeenCalledWith('/');
  });
});

describe('signing up', () => {
  it('leaves no token and no success when the profile cannot be loaded', async () => {
    mocks.post.mockResolvedValue({ accessToken: 'issued-token' });
    mocks.get.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useSignUp(vi.fn()));

    await act(() => result.current.signUp(signUpForm));

    expect(tokenMemory.get()).toBeNull();
    expect(useStore.getState().isAuthenticated).toBe(false);
    expect(result.current.serverError).toBe(REGISTER_ERROR_MESSAGE);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
