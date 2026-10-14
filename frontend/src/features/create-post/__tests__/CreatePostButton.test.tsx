import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
});
