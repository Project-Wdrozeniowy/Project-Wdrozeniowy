import { act, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AuthProvider from '@/app/providers/AuthProvider';
import { useStore } from '@/store';
import { currentProfile } from '@/shared/api/generated/orbita.api';

vi.mock('@/shared/api/generated/orbita.api', () => ({ currentProfile: vi.fn(), logout: vi.fn() }));
vi.mock('@/shared/api/client/api', () => ({
  apiClient: { clearCsrf: vi.fn(), setUnauthorizedHandler: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    sessionStatus: 'checking',
  });
});

it('restores presentation from the existing session profile without refresh', async () => {
  vi.mocked(currentProfile).mockResolvedValue({ id: 1, username: 'alice' } as Awaited<
    ReturnType<typeof currentProfile>
  >);
  render(
    <AuthProvider>
      <div>app</div>
    </AuthProvider>
  );
  await waitFor(() => expect(useStore.getState().isAuthenticated).toBe(true));
  expect(useStore.getState().user?.username).toBe('alice');
});

it('defers page queries until the initial cookie identity has been verified', () => {
  vi.mocked(currentProfile).mockReturnValue(new Promise(() => {}));
  render(
    <AuthProvider>
      <div>app</div>
    </AuthProvider>
  );
  expect(screen.queryByText('app')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeVisible();
  expect(useStore.getState().isInitialized).toBe(false);
});

it('keeps an entered draft mounted during later authentication transitions', async () => {
  vi.mocked(currentProfile).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  render(
    <AuthProvider>
      <input aria-label="Draft" defaultValue="Unsaved input" />
    </AuthProvider>
  );
  const input = await screen.findByRole('textbox', { name: 'Draft' });
  act(() => {
    useStore.getState().setSessionStatus('checking');
  });
  expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(input);
  expect(input).toHaveValue('Unsaved input');
});

it('treats a verified 401 as guest', async () => {
  vi.mocked(currentProfile).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  render(
    <AuthProvider>
      <div>app</div>
    </AuthProvider>
  );
  await waitFor(() => expect(useStore.getState().sessionStatus).toBe('guest'));
});

it.each([undefined, 500, 502, 504])(
  'keeps %s failures recoverable instead of reporting confirmed logout',
  async (status) => {
    vi.mocked(currentProfile).mockRejectedValue({
      isAxiosError: true,
      response: status ? { status } : undefined,
    });
    render(
      <AuthProvider>
        <div>app</div>
      </AuthProvider>
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to verify your session');
    expect(useStore.getState().sessionStatus).toBe('error');
    expect(screen.getByRole('button', { name: 'Retry session check' })).toBeVisible();
  }
);
