import { transferableAbortController } from 'node:util';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { orvalTransport } from '@/shared/api/client/orvalTransport';
import { routes } from '@/app/router/routes';
import { useStore } from '@/store';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';

vi.unmock('react-router');
vi.mock('@/shared/api/client/api', () => ({
  apiClient: { clearCsrf: vi.fn(), setUnauthorizedHandler: vi.fn() },
}));
vi.mock('@/shared/api/client/orvalTransport', () => ({
  orvalTransport: vi.fn().mockRejectedValue(new Error('Network is isolated in this routing test')),
}));
vi.mock('@tanstack/react-query-devtools', () => ({ ReactQueryDevtools: () => null }));

const user: MyProfileDto = {
  id: 1,
  username: 'route-user',
  email: 'route-user@example.test',
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
  vi.mocked(orvalTransport).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  useStore.setState({ isInitialized: true, isAuthenticated: false });
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
it.each(['/login', '/register'])(
  'every link on %s leads to a page that exists (no dead ends)',
  async (path) => {
    await open(path);
    await waitFor(() => expect(document.querySelector('form')).not.toBeNull());

    const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(matchRoutes(routes, href), `${href} has no route`).not.toBeNull();
    }
  }
);

it('reads the dynamic post slug from the browser route and asks the API for that post', async () => {
  await open('/forum/a-real-slug');
  await waitFor(() =>
    expect(vi.mocked(orvalTransport)).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/forum/posts/a-real-slug', method: 'GET' }),
      expect.anything()
    )
  );
});
it.each(['/profile', '/settings', '/settings/account', '/notifications', '/admin'])(
  'redirects a guest opening %s directly',
  async (path) => {
    const router = await open(path);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(await screen.findByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  }
);
it('opens the dashboard for a guest too: its figures are public', async () => {
  const router = await open('/dashboard');
  await waitFor(() => expect(router.state.navigation.state).toBe('idle'));
  expect(router.state.location.pathname).toBe('/dashboard');
  expect(router.state.errors).toBeNull();
  expect(await screen.findByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible();
  // The user's own totals need a session, so a guest is not offered them.
  expect(screen.queryByText('Your posts')).not.toBeInTheDocument();
});
it.each([
  ['/settings/profile', false],
  ['/settings/account', false],
  ['/profile', true],
  ['/forum', true],
])(
  '%s has the sidebar: %s (the settings use the whole width, as in the design)',
  async (path, hasSidebar) => {
    useStore.setState({ isAuthenticated: true });
    vi.mocked(orvalTransport).mockImplementation(async (config) => {
      if (config.url === '/users/me') return user as never;
      throw new Error('Network is isolated in this routing test');
    });
    const router = await open(path);
    await waitFor(() => expect(router.state.initialized).toBe(true));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Account menu' })).toBeVisible());
    expect(router.state.location.pathname).toBe(path);
    if (hasSidebar) expect(screen.getByRole('complementary')).toBeInTheDocument();
    else expect(screen.queryByRole('complementary')).toBeNull();
  }
);

it.each([
  '/profile',
  '/settings/profile',
  '/settings/account',
  '/notifications',
  '/dashboard',
  '/admin',
])('renders the implemented protected route %s for its permitted user', async (path) => {
  useStore.setState({ isAuthenticated: true });
  vi.mocked(orvalTransport).mockImplementation(async (config) => {
    if (config.url === '/users/me') return { ...user, role: 'ADMIN' } as never;
    throw new Error('Network is isolated in this routing test');
  });
  const router = await open(path);
  await waitFor(() => expect(router.state.initialized).toBe(true));
  expect(router.state.errors).toBeNull();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Account menu' })).toBeVisible());
  expect(router.state.location.pathname).toBe(path);
});
it.each(['/settings', '/settings/privacy', '/settings/nonsense'])(
  'sends %s to the profile section of the settings',
  async (path) => {
    useStore.setState({ isAuthenticated: true });
    vi.mocked(orvalTransport).mockImplementation(async (config) => {
      if (config.url === '/users/me') return user as never;
      throw new Error('Network is isolated in this routing test');
    });
    const router = await open(path);
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings/profile'));
    expect(router.state.errors).toBeNull();
    expect(await screen.findByRole('form', { name: 'Profile information' })).toBeVisible();
  }
);
describe('leaving a settings section with unsaved changes', () => {
  async function openProfileSection() {
    useStore.setState({ isAuthenticated: true });
    vi.mocked(orvalTransport).mockImplementation(async (config) => {
      if (config.url === '/users/me') return user as never;
      throw new Error('Network is isolated in this routing test');
    });
    const router = await open('/settings/profile');
    await screen.findByRole('form', { name: 'Profile information' });
    return router;
  }

  it('asks first, and keeps the edits when the user stays', async () => {
    const router = await openProfileSection();
    const person = userEvent.setup();
    await person.type(screen.getByLabelText('Bio'), 'Unsaved words');

    await person.click(screen.getByRole('link', { name: 'Account' }));

    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/settings/profile');
    await person.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings/profile');
    expect(screen.getByLabelText('Bio')).toHaveValue('Unsaved words');
  });

  it('leaves and drops the edits when the user chooses to', async () => {
    const router = await openProfileSection();
    const person = userEvent.setup();
    await person.type(screen.getByLabelText('Bio'), 'Unsaved words');

    await person.click(screen.getByRole('link', { name: 'Account' }));
    await person.click(await screen.findByRole('button', { name: 'Leave and discard changes' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/settings/account'));
    expect(await screen.findByRole('form', { name: 'Account settings' })).toBeVisible();
  });

  it('does not ask when nothing was changed', async () => {
    const router = await openProfileSection();

    await userEvent.setup().click(screen.getByRole('link', { name: 'Account' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/settings/account'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
it('rejects the admin page for an ordinary authenticated user', async () => {
  useStore.setState({ isAuthenticated: true });
  vi.mocked(orvalTransport).mockImplementation(async (config) => {
    if (config.url === '/users/me') return user as never;
    throw new Error('Network is isolated in this routing test');
  });
  const router = await open('/admin');
  await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
});
it('renders a client not-found view with a way home', async () => {
  await open('/not-a-route');
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
});
