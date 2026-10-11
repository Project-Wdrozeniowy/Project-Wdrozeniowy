import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PostFeedError from '../PostFeedError';

describe('PostFeedError', () => {
  it('shows only the fixed message as an alert', () => {
    render(<PostFeedError onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not load the posts. Please try again.'
    );
  });

  it('calls onRetry when the button is clicked', async () => {
    const onRetry = vi.fn();
    render(<PostFeedError onRetry={onRetry} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows progress and ignores clicks while a retry is running', async () => {
    const onRetry = vi.fn();
    render(<PostFeedError onRetry={onRetry} retrying />);

    const button = screen.getByRole('button', { name: 'Trying again…' });
    expect(button).toBeDisabled();
    await userEvent.setup().click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
