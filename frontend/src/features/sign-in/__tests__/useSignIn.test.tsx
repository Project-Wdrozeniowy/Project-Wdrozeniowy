import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useSignIn } from '../useSignIn';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  loadProfile: vi.fn(),
  setAuth: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/shared/api/auth/authClient', () => ({
  authService: { login: mocks.login, loadProfile: mocks.loadProfile },
}));
vi.mock('@/store', () => ({
  useStore: (select: (state: { setAuth: typeof mocks.setAuth }) => unknown) =>
    select({ setAuth: mocks.setAuth }),
}));
vi.mock('@/shared/lib/toast', () => ({ toast: { success: mocks.success } }));

const credentials = { username: 'alice', password: 'Password123' };
const profile = { id: 1, username: 'alice', displayName: null };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.login.mockResolvedValue({ accessToken: 'access' });
  mocks.loadProfile.mockResolvedValue(profile);
});

describe('useSignIn', () => {
  it('logs in, loads the profile of the new token, then sets the shared session and leaves', async () => {
    const { result } = renderHook(() => useSignIn());
    await act(() => result.current.signIn(credentials));

    expect(mocks.login).toHaveBeenCalledWith(credentials);
    expect(mocks.loadProfile).toHaveBeenCalledWith('access');
    expect(mocks.setAuth).toHaveBeenCalledWith(profile, 'access');
    expect(mocks.success).toHaveBeenCalledWith('Welcome back, alice!');
    expect(mocks.push).toHaveBeenCalledWith('/');
    expect(result.current.serverError).toBeNull();
    // The session is only set once the profile is there.
    expect(mocks.loadProfile.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.setAuth.mock.invocationCallOrder[0]
    );
  });

  it('greets by the display name when there is one', async () => {
    mocks.loadProfile.mockResolvedValue({ ...profile, displayName: 'Alice A.' });
    const { result } = renderHook(() => useSignIn());
    await act(() => result.current.signIn(credentials));
    expect(mocks.success).toHaveBeenCalledWith('Welcome back, Alice A.!');
  });

  it('reports wrong credentials (401) in our words and does not set a session', async () => {
    mocks.login.mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
    const { result } = renderHook(() => useSignIn());
    await act(() => result.current.signIn(credentials));

    expect(result.current.serverError).toBe('Invalid username or password');
    expect(mocks.loadProfile).not.toHaveBeenCalled();
    expect(mocks.setAuth).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('reports any other failure with a fixed message', async () => {
    mocks.login.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useSignIn());
    await act(() => result.current.signIn(credentials));
    expect(result.current.serverError).toBe('Sign in failed. Please try again.');
  });

  it('does not establish a session when the profile cannot be loaded', async () => {
    mocks.loadProfile.mockRejectedValue(new Error('profile'));
    const { result } = renderHook(() => useSignIn());
    await act(() => result.current.signIn(credentials));

    expect(result.current.serverError).toBe('Sign in failed. Please try again.');
    expect(mocks.setAuth).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('clears the previous error when it tries again', async () => {
    mocks.login.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useSignIn());
    await act(() => result.current.signIn(credentials));
    expect(result.current.serverError).not.toBeNull();

    await act(() => result.current.signIn(credentials));
    expect(result.current.serverError).toBeNull();
  });
});
