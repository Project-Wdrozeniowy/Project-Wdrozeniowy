import { render, screen } from '@testing-library/react';
import SkeletonStatus from '../SkeletonStatus';

describe('SkeletonStatus', () => {
  it('is a busy status region named by its label', () => {
    render(
      <SkeletonStatus label="Loading things…">
        <div>block</div>
      </SkeletonStatus>
    );
    const status = screen.getByRole('status', { name: 'Loading things…' });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).not.toHaveAttribute('aria-label');
  });

  it('keeps the label for assistive technology only by default', () => {
    render(
      <SkeletonStatus label="Loading things…">
        <div>block</div>
      </SkeletonStatus>
    );
    expect(screen.getByText('Loading things…')).toHaveClass('sr-only');
  });

  it('shows the label to everyone when asked', () => {
    render(
      <SkeletonStatus label="Loading things…" showLabel>
        <div>block</div>
      </SkeletonStatus>
    );
    expect(screen.getByText('Loading things…')).not.toHaveClass('sr-only');
  });

  it('is not busy when it stands for content that is not loading', () => {
    render(
      <SkeletonStatus label="Not available yet." busy={false}>
        <div>block</div>
      </SkeletonStatus>
    );
    expect(screen.getByRole('status', { name: 'Not available yet.' })).toHaveAttribute(
      'aria-busy',
      'false'
    );
  });

  it('hides the placeholder blocks from assistive technology', () => {
    render(
      <SkeletonStatus label="Loading things…">
        <div>block</div>
      </SkeletonStatus>
    );
    expect(screen.getByText('block').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('passes the layout class to the region', () => {
    render(
      <SkeletonStatus label="Loading things…" className="flex gap-3">
        <div>block</div>
      </SkeletonStatus>
    );
    expect(screen.getByRole('status')).toHaveClass('flex', 'gap-3');
  });
});
