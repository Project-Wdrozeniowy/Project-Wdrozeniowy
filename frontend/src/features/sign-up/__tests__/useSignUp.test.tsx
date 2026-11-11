import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useSignUp } from '../useSignUp';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  loadProfile: vi.fn(),
  setAuth: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
}));

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({ useNavigate: () => mocks.push })
);
vi.mock('@/shared/api/generated/orbita.api', () => ({ register: mocks.register }));
vi.mock('@/shared/auth/session', () => ({
  authenticateSession: async (mutation: (signal: AbortSignal) => Promise<unknown>) => {
    await mutation(new AbortController().signal);
    const user = await mocks.loadProfile();
    mocks.setAuth(user);
    return user;
  },
}));
vi.mock('@/store', () => ({
  useStore: (select: (state: { setAuth: typeof mocks.setAuth }) => unknown) =>
    select({ setAuth: mocks.setAuth }),
}));
vi.mock('@/shared/lib/toast', () => ({ toast: { success: mocks.success } }));

const form = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Password123',
  confirmPassword: 'Password123',
  displayName: 'Alice',
  terms: true as const,
};
const profile = { id: 1, username: 'alice', displayName: 'Alice' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.register.mockResolvedValue(undefined);
  mocks.loadProfile.mockResolvedValue(profile);
});

describe('useSignUp', () => {
  it('registers with the API fields only, then sets the shared session and leaves', async () => {
    const onRejected = vi.fn();
    const { result } = renderHook(() => useSignUp(onRejected));
    await act(() => result.current.signUp(form));

    expect(mocks.register).toHaveBeenCalledWith(
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123',
        displayName: 'Alice',
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(mocks.loadProfile).toHaveBeenCalledWith();
    expect(mocks.setAuth).toHaveBeenCalledWith(profile);
    expect(mocks.success).toHaveBeenCalledWith('Your account has been created.');
    expect(mocks.push).toHaveBeenCalledWith('/');
    expect(onRejected).not.toHaveBeenCalled();
    expect(result.current.serverError).toBeNull();
  });

  it('hands the fields the server rejected to the form and shows no form message', async () => {
    mocks.register.mockRejectedValue({
      isAxiosError: true,
      config: { method: 'post', url: '/auth/register' },
      response: { status: 409, data: { detail: 'Username already taken' } },
    });
    const onRejected = vi.fn();
    const { result } = renderHook(() => useSignUp(onRejected));
    await act(() => result.current.signUp(form));

    expect(onRejected).toHaveBeenCalledWith({ username: 'This username is already taken' });
    expect(result.current.serverError).toBeNull();
    expect(mocks.setAuth).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('shows a fixed message for a failure no field is to blame for', async () => {
    mocks.register.mockRejectedValue(new Error('network'));
    const onRejected = vi.fn();
    const { result } = renderHook(() => useSignUp(onRejected));
    await act(() => result.current.signUp(form));

    expect(result.current.serverError).toBe('Registration failed. Please try again.');
    expect(onRejected).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('does not establish a session when the profile cannot be loaded', async () => {
    mocks.loadProfile.mockRejectedValue(new Error('profile'));
    const { result } = renderHook(() => useSignUp(vi.fn()));
    await act(() => result.current.signUp(form));

    expect(result.current.serverError).toBe('Registration failed. Please try again.');
    expect(mocks.setAuth).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('clears the previous error when it tries again', async () => {
    mocks.register.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useSignUp(vi.fn()));
    await act(() => result.current.signUp(form));
    expect(result.current.serverError).not.toBeNull();

    await act(() => result.current.signUp(form));
    expect(result.current.serverError).toBeNull();
  });
});
