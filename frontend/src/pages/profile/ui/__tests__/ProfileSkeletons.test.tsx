import { render, screen } from '@testing-library/react';
import PostsSkeleton from '../PostsSkeleton';
import ProfileSkeleton from '../ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('is a busy status that names what is loading', () => {
    render(<ProfileSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading your profile' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });
});

describe('PostsSkeleton', () => {
  it('says the posts are not available as plain text instead of claiming to load', () => {
    const { container } = render(<PostsSkeleton />);

    expect(screen.getByText('Your posts are not available yet.')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('hides the placeholder blocks from assistive technology', () => {
    const { container } = render(<PostsSkeleton />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
