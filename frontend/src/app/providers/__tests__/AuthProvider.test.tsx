import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AuthProvider from '@/app/providers/AuthProvider';
import { useStore } from '@/store';
import { currentProfile } from '@/shared/api/generated/orbita.api';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';

vi.mock('@/shared/api/generated/orbita.api', () => ({
  currentProfile: vi.fn(),
  logout: vi.fn(),
  getCurrentProfileQueryKey: () => ['/users/me'],
  useCurrentProfile: vi.fn(),
}));
vi.mock('@/shared/api/client/api', () => ({
  apiClient: { clearCsrf: vi.fn(), setUnauthorizedHandler: vi.fn() },
}));

let client: QueryClient;
function renderApp(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient();
  useStore.setState({
    isAuthenticated: false,
    isInitialized: false,
    sessionStatus: 'checking',
  });
});

it('restores presentation from the existing session profile without refresh', async () => {
  vi.mocked(currentProfile).mockResolvedValue({ id: 1, username: 'alice' } as Awaited<
    ReturnType<typeof currentProfile>
  >);
  renderApp(<div>app</div>);
  await waitFor(() => expect(useStore.getState().isAuthenticated).toBe(true));
  expect(client.getQueryData<{ username: string }>(currentUserQueryKey)?.username).toBe('alice');
});

it('defers page queries until the initial cookie identity has been verified', () => {
  vi.mocked(currentProfile).mockReturnValue(new Promise(() => {}));
  renderApp(<div>app</div>);
  expect(screen.queryByText('app')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeVisible();
  expect(useStore.getState().isInitialized).toBe(false);
});

it('keeps an entered draft mounted during later authentication transitions', async () => {
  vi.mocked(currentProfile).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  renderApp(<input aria-label="Draft" defaultValue="Unsaved input" />);
  const input = await screen.findByRole('textbox', { name: 'Draft' });
  act(() => {
    useStore.getState().setSessionStatus('checking');
  });
  expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(input);
  expect(input).toHaveValue('Unsaved input');
});

it('treats a verified 401 as guest', async () => {
  vi.mocked(currentProfile).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  renderApp(<div>app</div>);
  await waitFor(() => expect(useStore.getState().sessionStatus).toBe('guest'));
});

it.each([undefined, 500, 502, 504])(
  'keeps %s failures recoverable instead of reporting confirmed logout',
  async (status) => {
    vi.mocked(currentProfile).mockRejectedValue({
      isAxiosError: true,
      response: status ? { status } : undefined,
    });
    renderApp(<div>app</div>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to verify your session');
    expect(useStore.getState().sessionStatus).toBe('error');
    expect(screen.getByRole('button', { name: 'Retry session check' })).toBeVisible();
  }
);
