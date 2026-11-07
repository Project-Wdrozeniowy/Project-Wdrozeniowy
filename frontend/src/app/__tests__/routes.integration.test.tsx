import { transferableAbortController } from 'node:util';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { apiClient } from '@/shared/api/client/api';
import { orvalTransport } from '@/shared/api/client/orvalTransport';
import { routes } from '@/app/routes';
import { useStore } from '@/store';
import type { UserProfileDto } from '@/shared/api/generated/models/userProfileDto.dto';

vi.unmock('react-router');
vi.mock('@/shared/api/client/api', () => ({
  apiClient: { refreshAccessToken: vi.fn().mockRejectedValue(new Error('No session')) },
}));
vi.mock('@/shared/api/client/orvalTransport', () => ({
  orvalTransport: vi.fn().mockRejectedValue(new Error('Network is isolated in this routing test')),
}));
vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }));

const user: UserProfileDto = {
  id: 1,
  username: 'route-user',
  displayName: 'Route User',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
};
// jsdom's controller is incompatible with Node 24's native Request used by the data router.
vi.stubGlobal('AbortController', transferableAbortController().constructor);
afterAll(() => vi.unstubAllGlobals());

const routers: ReturnType<typeof createMemoryRouter>[] = [];
async function open(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  routers.push(router);
  render(<RouterProvider router={router} />);
  // Route modules must finish loading before asserting guard/navigation behavior.
  await waitFor(() => expect(router.state.initialized).toBe(true), { timeout: 5000 });
  return router;
}
beforeEach(() => {
  vi.mocked(apiClient.refreshAccessToken).mockRejectedValue(new Error('No session'));
  vi.mocked(orvalTransport).mockRejectedValue({ response: { status: 401 } });
  useStore.setState({ user: null, isInitialized: true, isAuthenticated: false });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach((router) => router.dispose());
  vi.restoreAllMocks();
});

it.each(['/login', '/register', '/', '/forum?tag=react&page=2', '/search?q=react'])(
  'resolves the actual public route %s without a Next runtime',
  async (path) => {
    const router = await open(path);
    await waitFor(() => expect(router.state.navigation.state).toBe('idle'));
    await waitFor(() => expect(router.state.initialized).toBe(true), { timeout: 5000 });
    expect(router.state.errors).toBeNull();
    await waitFor(() => expect(document.querySelector('form, header')).not.toBeNull());
    expect(router.state.location.search).toBe(new URL(path, 'http://test').search);
  }
);
it('reads the dynamic post slug from the browser route', async () => {
  await open('/forum/a-real-slug');
  expect(await screen.findByText('Post slug: a-real-slug')).toBeVisible();
});
it.each(['/profile', '/settings', '/dashboard', '/admin'])(
  'redirects a guest opening %s directly',
  async (path) => {
    const router = await open(path);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  }
);
it.each(['/profile', '/settings', '/dashboard', '/admin'])(
  'renders the implemented protected route %s for its permitted user',
  async (path) => {
    useStore.setState({ user: { ...user, role: 'ADMIN' }, isAuthenticated: true });
    const router = await open(path);
    await waitFor(() => expect(router.state.initialized).toBe(true));
    expect(router.state.errors).toBeNull();
    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeVisible();
    expect(router.state.location.pathname).toBe(path);
  }
);
it('rejects the admin page for an ordinary authenticated user', async () => {
  useStore.setState({ user, isAuthenticated: true });
  const router = await open('/admin');
  await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
});
it('renders a client not-found view with a way home', async () => {
  await open('/not-a-route');
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
});
