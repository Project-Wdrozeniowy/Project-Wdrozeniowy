import { render, screen } from '@testing-library/react';
import PostFeedSkeleton from '../PostFeedSkeleton';

describe('PostFeedSkeleton', () => {
  it('uses a default label', () => {
    render(<PostFeedSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading posts…' })).toBeInTheDocument();
  });

  it('shows the label and uses that same text as its name, so it is read once', () => {
    render(<PostFeedSkeleton label="Loading page 3…" />);
    const status = screen.getByRole('status', { name: 'Loading page 3…' });

    expect(status).toHaveTextContent('Loading page 3…');
    expect(status).not.toHaveAttribute('aria-label');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('hides the decorative cards from assistive technology', () => {
    const { container } = render(<PostFeedSkeleton />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6);
  });
});
