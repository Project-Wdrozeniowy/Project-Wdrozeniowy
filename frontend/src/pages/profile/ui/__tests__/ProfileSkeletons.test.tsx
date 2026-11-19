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
  it('is a busy status that names what is loading', () => {
    render(<PostsSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading your posts' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });
});
