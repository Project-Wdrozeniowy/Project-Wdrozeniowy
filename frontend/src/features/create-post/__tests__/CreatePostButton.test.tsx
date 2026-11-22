import type { ApiRequestOptions } from '@/shared/api/client/orvalTransport';
import type { AxiosRequestConfig } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CreatePostButton } from '../CreatePostButton';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';
import { useStore } from '@/store';

const push = vi.fn();
vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({ useNavigate: () => push })
);
const fixtureOperations = vi.hoisted(() => ({
  categoryService: { list: vi.fn().mockResolvedValue([]) },
  postService: { create: vi.fn() },
}));
vi.mock('@/shared/api/client/orvalTransport', async () => {
  const { mockApiOperations } = await import('@/test/mockApiOperations');
  return {
    orvalTransport: (config: AxiosRequestConfig, options: ApiRequestOptions) =>
      mockApiOperations(config, options, fixtureOperations),
  };
});

// Who is signed in is the profile in the query cache, as in the app; the store holds the lifecycle.
let client: QueryClient;
const asUser = (id: number) => client.setQueryData(currentUserQueryKey, { id });

function setup(state: { isAuthenticated: boolean; isInitialized: boolean }) {
  client = new QueryClient();
  useStore.setState(state);
  render(
    <QueryClientProvider client={client}>
      <CreatePostButton />
    </QueryClientProvider>
  );
  return userEvent.setup();
}

beforeEach(() => push.mockClear());
afterEach(() => useStore.setState({ isAuthenticated: false, isInitialized: false }));

describe('CreatePostButton', () => {
  it('is disabled until the session has been restored', async () => {
    const user = setup({ isAuthenticated: false, isInitialized: false });
    const button = screen.getByRole('button', { name: /Create Post/ });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(push).not.toHaveBeenCalled();
  });

  it('sends a guest to the login page', async () => {
    const user = setup({ isAuthenticated: false, isInitialized: true });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    expect(push).toHaveBeenCalledWith('/login');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog for a signed-in user', async () => {
    const user = setup({ isAuthenticated: true, isInitialized: true });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    expect(screen.getByRole('dialog', { name: 'Create a post' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not show one user's unpublished draft to the next user", async () => {
    const user = setup({ isAuthenticated: true, isInitialized: true });
    act(() => {
      asUser(1);
    });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    await user.type(screen.getByLabelText(/^Title/), 'private draft');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    act(() => {
      asUser(2);
    });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    expect(screen.getByLabelText(/^Title/)).toHaveValue('');
  });

  it('closes the dialog when the signed-in user changes', async () => {
    const user = setup({ isAuthenticated: true, isInitialized: true });
    act(() => {
      asUser(1);
    });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => useStore.setState({ isAuthenticated: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not reopen by itself when the same user signs back in', async () => {
    const user = setup({ isAuthenticated: true, isInitialized: true });
    act(() => {
      asUser(1);
    });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    act(() => useStore.setState({ isAuthenticated: false }));
    act(() => {
      asUser(1);
      useStore.setState({ isAuthenticated: true });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
