import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RoleGuard from '@/app/router/guards/RoleGuard';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';
import { useStore } from '@/store';
import type { UserProfileDtoRole as UserRole } from '@/shared/api/generated/models/userProfileDtoRole.dto';

const mockReplace = vi.fn();

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({ useNavigate: () => mockReplace })
);
// A profile that is asked for and never answered: the guard must not decide before it is there.
const transport = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/shared/api/client/orvalTransport', () => ({ orvalTransport: transport.read }));

/**
 * The guard reads the lifecycle from the store and the role from the profile in the query cache,
 * as in the app, so these tests use both.
 */
function state(options: { initialized: boolean; authenticated?: boolean; role?: UserRole | null }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authenticated = options.authenticated ?? options.role != null;
  useStore.setState({
    isInitialized: options.initialized,
    isAuthenticated: authenticated,
    sessionStatus: !options.initialized ? 'checking' : authenticated ? 'authenticated' : 'guest',
  });
  if (options.role) client.setQueryData(currentUserQueryKey, { id: 1, role: options.role });
  return client;
}

function renderGuard(client: QueryClient, allowedRoles: UserRole[] = ['ADMIN']) {
  return render(
    <QueryClientProvider client={client}>
      <RoleGuard allowedRoles={allowedRoles}>
        <div>admin content</div>
      </RoleGuard>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockReplace.mockClear();
  transport.read.mockReset().mockReturnValue(new Promise(() => {}));
});

describe('RoleGuard – session still being restored (page reload)', () => {
  it('shows a loader and does not redirect', () => {
    renderGuard(state({ initialized: false }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('RoleGuard – signed in, but the role is not known yet', () => {
  it('waits with the loader instead of sending a signed-in user to /login or /', () => {
    renderGuard(state({ initialized: true, authenticated: true }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('RoleGuard – guest', () => {
  it('renders nothing and redirects to /login', () => {
    const { container } = renderGuard(state({ initialized: true }));
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('never shows a profile that is still in the cache after the session ended', () => {
    const client = state({ initialized: true, role: 'ADMIN' });
    useStore.setState({ isAuthenticated: false, sessionStatus: 'guest' });
    const { container } = renderGuard(client);
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).toHaveBeenCalledWith('/login', { replace: true });
  });
});

describe('RoleGuard – allowed role', () => {
  it('renders children without redirecting', () => {
    renderGuard(state({ initialized: true, role: 'ADMIN' }));
    expect(screen.getByText('admin content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('accepts any role from a multi-role list', () => {
    renderGuard(state({ initialized: true, role: 'ADMIN' }), ['MODERATOR', 'ADMIN']);
    expect(screen.getByText('admin content')).toBeInTheDocument();
  });
});

describe('RoleGuard – forbidden role', () => {
  it.each<UserRole>(['USER', 'MODERATOR'])(
    'redirects %s to / after a reload without showing the page',
    (role) => {
      const { container } = renderGuard(state({ initialized: true, role }), ['ADMIN']);
      expect(container).toBeEmptyDOMElement();
      expect(mockReplace).toHaveBeenCalledWith('/', { replace: true });
    }
  );
});
