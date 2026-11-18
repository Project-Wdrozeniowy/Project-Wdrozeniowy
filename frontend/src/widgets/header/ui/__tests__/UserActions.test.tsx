import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import UserActions from '../UserActions';

let pathname = '/';
vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useLocation: () => ({ pathname, search: '', hash: '', state: null, key: 'test' }),
  })
);

// The bell fetches the unread count and has its own tests; here it is only a marker.
vi.mock('../NotificationBell', () => ({
  default: () => <a href="/notifications">Notifications</a>,
}));

const user = {
  id: 1,
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  role: 'USER',
} as const;

describe('UserActions', () => {
  it('links a signed-in user to the settings page', () => {
    render(
      <UserActions
        isAuthenticated
        user={{
          ...user,
          bio: null,
          status: 'ACTIVE',
          postCount: 0,
          commentCount: 0,
          createdAt: '2026-10-01T10:00:00Z',
        }}
        logout={() => {}}
      />
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('shows a guest no settings link', () => {
    render(<UserActions isAuthenticated={false} user={null} logout={() => {}} />);
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('shows the notification bell to a signed-in user only', () => {
    const { rerender } = render(
      <UserActions isAuthenticated={false} user={null} logout={() => {}} />
    );
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();

    rerender(
      <UserActions
        isAuthenticated
        user={{
          ...user,
          bio: null,
          status: 'ACTIVE',
          postCount: 0,
          commentCount: 0,
          createdAt: '2026-10-01T10:00:00Z',
        }}
        logout={() => {}}
      />
    );
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('always offers the account menu for small screens, next to the text links of large ones', () => {
    render(<UserActions isAuthenticated={false} user={null} logout={() => {}} />);

    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('closes the account menu when the page changes', async () => {
    pathname = '/';
    const { rerender } = render(
      <UserActions isAuthenticated={false} user={null} logout={() => {}} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    pathname = '/forum';
    rerender(<UserActions isAuthenticated={false} user={null} logout={() => {}} />);

    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
