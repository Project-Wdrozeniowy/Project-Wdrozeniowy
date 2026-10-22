import { render, screen } from '@testing-library/react';
import UserActions from '../UserActions';

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
});
