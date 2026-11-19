import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SettingsPage from '@/pages/settings/ui/SettingsPage';

let params: Record<string, string | undefined> = {};

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useParams: () => params,
    Navigate: ({ to }: { to: string }) => <p data-testid="redirect">{to}</p>,
  })
);

vi.mock('@/pages/settings/ui/SettingsView', () => ({
  default: ({ section }: { section: string }) => <p data-testid="view">{section}</p>,
}));

beforeEach(() => {
  params = {};
});

describe('the settings sections', () => {
  it('shows every tab of the design, with a link for each section that can be opened', () => {
    params = { section: 'profile' };
    render(<SettingsPage />);

    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(nav).toHaveTextContent(/Profile.*Account.*Notifications.*Appearance.*Privacy.*Content/);
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/settings/profile'
    );
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/settings/account'
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('marks the current section for assistive technology', () => {
    params = { section: 'account' };
    render(<SettingsPage />);

    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('view')).toHaveTextContent('account');
  });

  it('shows the other tabs as not available yet, and they cannot be opened', () => {
    params = { section: 'profile' };
    render(<SettingsPage />);

    for (const name of ['Notifications', 'Appearance', 'Privacy', 'Content']) {
      expect(screen.queryByRole('link', { name: new RegExp(name) })).not.toBeInTheDocument();
      const tab = screen.getByText(name).closest('[aria-disabled]');
      expect(tab).toHaveAttribute('aria-disabled', 'true');
      expect(tab).toHaveTextContent('Not available yet');
      expect(tab).toHaveAttribute('title', 'Not available yet');
    }
  });

  it.each([undefined, 'privacy', 'nonsense'])(
    'sends "%s" to the profile section instead of showing an empty page',
    (section) => {
      params = { section };
      render(<SettingsPage />);

      expect(screen.getByTestId('redirect')).toHaveTextContent('/settings/profile');
      expect(screen.queryByTestId('view')).not.toBeInTheDocument();
    }
  );
});
