import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CreatePostButton } from '../CreatePostButton';
import { useStore } from '@/store';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/shared/api/forum/forumClient', () => ({
  categoryService: { list: vi.fn().mockResolvedValue([]) },
  postService: { create: vi.fn() },
}));

function setup(state: { isAuthenticated: boolean; isInitialized: boolean }) {
  useStore.setState(state);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CreatePostButton />
    </QueryClientProvider>
  );
  return userEvent.setup();
}

beforeEach(() => push.mockClear());
afterEach(() => useStore.setState({ user: null, isAuthenticated: false, isInitialized: false }));

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
    useStore.setState({ user: { id: 1 } as never });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    await user.type(screen.getByLabelText(/^Title/), 'private draft');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    act(() => useStore.setState({ user: { id: 2 } as never }));
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    expect(screen.getByLabelText(/^Title/)).toHaveValue('');
  });

  it('closes the dialog when the signed-in user changes', async () => {
    const user = setup({ isAuthenticated: true, isInitialized: true });
    useStore.setState({ user: { id: 1 } as never });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => useStore.setState({ user: null, isAuthenticated: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not reopen by itself when the same user signs back in', async () => {
    const user = setup({ isAuthenticated: true, isInitialized: true });
    useStore.setState({ user: { id: 1 } as never });
    await user.click(screen.getByRole('button', { name: /Create Post/ }));
    act(() => useStore.setState({ user: null, isAuthenticated: false }));
    act(() => useStore.setState({ user: { id: 1 } as never, isAuthenticated: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
