import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import MobileMenu from '@/widgets/header/ui/MobileMenu';
import type { UserProfileDto as UserProfile } from '@/shared/api/generated/models/userProfileDto.dto';

const user = { username: 'alice', displayName: 'Alice A.' } as UserProfile;

function renderMenu(isAuthenticated = true, logout = vi.fn()) {
  render(
    <>
      <MobileMenu
        isAuthenticated={isAuthenticated}
        user={isAuthenticated ? user : null}
        logout={logout}
      />
      <button type="button">Elsewhere</button>
    </>
  );
  return { logout, button: screen.getByRole('button', { name: 'Account menu' }) };
}

describe('MobileMenu', () => {
  it('is closed until the button is pressed', () => {
    const { button } = renderMenu();

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows the account links of a signed-in user', async () => {
    const { button } = renderMenu();

    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls');
    expect(screen.getByText('Signed in as Alice A.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('falls back to the username when there is no display name', async () => {
    render(
      <MobileMenu
        isAuthenticated
        user={{ username: 'alice', displayName: null } as UserProfile}
        logout={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(screen.getByText('Signed in as alice')).toBeInTheDocument();
  });

  it('shows sign in and sign up to a guest, and no account links', async () => {
    const { button } = renderMenu(false);

    await userEvent.click(button);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('signs out and closes', async () => {
    const { button, logout } = renderMenu();
    await userEvent.click(button);

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when a link is followed', async () => {
    const { button } = renderMenu();
    await userEvent.click(button);

    await userEvent.click(screen.getByRole('link', { name: 'Settings' }));

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and returns the focus to the button', async () => {
    const { button } = renderMenu();
    await userEvent.click(button);
    screen.getByRole('link', { name: 'Profile' }).focus();

    await userEvent.keyboard('{Escape}');

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes when the focus leaves it', async () => {
    const { button } = renderMenu();
    await userEvent.click(button);

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays open while the focus moves between its own items', async () => {
    const { button } = renderMenu();
    await userEvent.click(button);

    await userEvent.tab();
    await userEvent.tab();

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles closed when the button is pressed again', async () => {
    const { button } = renderMenu();

    await userEvent.click(button);
    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on a tap outside even when no focus changes (touch browsers)', async () => {
    const { button } = renderMenu();
    await userEvent.click(button);

    fireEvent.pointerDown(document.body);

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('stays open for a tap on its own items', async () => {
    const { button } = renderMenu();
    await userEvent.click(button);

    fireEvent.pointerDown(screen.getByRole('link', { name: 'Profile' }));

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not close on a blur that has no target, which is what a touch browser sends', async () => {
    const { button } = renderMenu();
    await userEvent.click(button);

    fireEvent.blur(button, { relatedTarget: null });

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows no name line while the profile is not there', async () => {
    render(<MobileMenu isAuthenticated user={null} logout={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
