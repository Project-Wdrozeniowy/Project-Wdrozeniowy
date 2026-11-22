import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import MobileTabBar from '@/widgets/header/ui/MobileTabBar';
import { useStore } from '@/store';

let pathname = '/';

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useLocation: () => ({ pathname, search: '', hash: '', state: null, key: 'test' }),
  })
);

beforeEach(() => {
  pathname = '/';
  useStore.setState({ isAuthenticated: false });
});

describe('MobileTabBar', () => {
  it('links the main pages for a guest, in a labelled navigation', () => {
    render(<MobileTabBar />);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Forum' })).toHaveAttribute('href', '/forum');
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
  });

  it('adds the profile for a signed-in user', () => {
    useStore.setState({ isAuthenticated: true });

    render(<MobileTabBar />);

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
  });

  it('marks the current page, and a post still counts as the forum', () => {
    pathname = '/forum/some-post';

    render(<MobileTabBar />);

    expect(screen.getByRole('link', { name: 'Forum' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('marks only the home page for "/"', () => {
    render(<MobileTabBar />);

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Forum' })).not.toHaveAttribute('aria-current');
  });
});
