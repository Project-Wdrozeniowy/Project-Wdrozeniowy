import { fireEvent, render, screen } from '@testing-library/react';
import ProfileCard from '../ProfileCard';
import type { MyProfile } from '@/shared/api/user/user.dto';

const PROFILE: MyProfile = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: 'https://example.com/one.png',
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

describe('ProfileCard avatar', () => {
  it('shows the new image after a broken link is replaced by a working one', () => {
    const { rerender } = render(<ProfileCard profile={PROFILE} />);
    fireEvent.error(screen.getByRole('img', { name: 'Avatar of Alice' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    rerender(<ProfileCard profile={{ ...PROFILE, avatarUrl: 'https://example.com/two.png' }} />);

    expect(screen.getByRole('img', { name: 'Avatar of Alice' })).toHaveAttribute(
      'src',
      'https://example.com/two.png'
    );
  });

  it('stays on the initial for the same broken link', () => {
    const { rerender } = render(<ProfileCard profile={PROFILE} />);
    fireEvent.error(screen.getByRole('img'));

    rerender(<ProfileCard profile={{ ...PROFILE, postCount: 5 }} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('ProfileCard robustness', () => {
  it('does not crash on an invalid join date, it just leaves the date out', () => {
    render(<ProfileCard profile={{ ...PROFILE, createdAt: 'not-a-date' }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Alice' })).toBeInTheDocument();
    expect(screen.queryByText(/Joined/)).not.toBeInTheDocument();
  });

  it.each(['ftp://example.com/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA'])(
    'does not render an avatar from a stored value that is not http(s): %s',
    (avatarUrl) => {
      render(<ProfileCard profile={{ ...PROFILE, avatarUrl }} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
    }
  );
});

describe('ProfileCard role', () => {
  it.each([
    ['USER', 'Member'],
    ['MODERATOR', 'Moderator'],
    ['ADMIN', 'Admin'],
  ] as const)('shows %s as "%s", not the raw API value', (role, label) => {
    render(<ProfileCard profile={{ ...PROFILE, role }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText(role)).not.toBeInTheDocument();
  });
});
