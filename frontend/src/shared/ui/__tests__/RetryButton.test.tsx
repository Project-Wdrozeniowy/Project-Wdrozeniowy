import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import RetryButton from '../RetryButton';

describe('RetryButton', () => {
  it('starts one retry per activation', async () => {
    const onRetry = vi.fn();
    render(<RetryButton onRetry={onRetry} retrying={false} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('can be activated from the keyboard', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<RetryButton onRetry={onRetry} retrying={false} />);

    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('ignores activations while retrying, stays focusable and keeps its place', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<RetryButton onRetry={onRetry} retrying />);

    const button = screen.getByRole('button', { name: 'Trying again…' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    await user.click(button);
    expect(onRetry).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });

  it('announces a running retry through a status region that is there from the start', () => {
    const { rerender } = render(<RetryButton onRetry={vi.fn()} retrying={false} />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    rerender(<RetryButton onRetry={vi.fn()} retrying />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Trying again…');
  });

  it('announces that a retry failed when it ends and the button is still there', () => {
    const { rerender } = render(<RetryButton onRetry={vi.fn()} retrying />);
    expect(screen.getByRole('status')).toHaveTextContent('Trying again…');

    rerender(<RetryButton onRetry={vi.fn()} retrying={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('Still could not load.');

    rerender(<RetryButton onRetry={vi.fn()} retrying />);
    expect(screen.getByRole('status')).toHaveTextContent('Trying again…');
  });

  it('leaves the announcement to a RetryStatus placed elsewhere when status is off', () => {
    render(<RetryButton onRetry={vi.fn()} retrying status={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trying again…' })).toBeInTheDocument();
  });

  it('ignores further activations until the promise of the retry settles', async () => {
    let settle: () => void = () => {};
    const onRetry = vi.fn(() => new Promise<void>((resolve) => (settle = resolve)));
    const user = userEvent.setup();
    render(<RetryButton onRetry={onRetry} retrying={false} />);
    const button = screen.getByRole('button', { name: 'Try again' });

    await user.click(button);
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);

    settle();
    await Promise.resolve();
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('releases the guard when the retry rejects', async () => {
    const onRetry = vi.fn(() => Promise.reject(new Error('down')));
    const user = userEvent.setup();
    render(<RetryButton onRetry={onRetry} retrying={false} />);
    const button = screen.getByRole('button', { name: 'Try again' });

    await user.click(button);
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('uses the wording the screen gives it', () => {
    render(
      <RetryButton
        onRetry={vi.fn()}
        retrying
        label="Reload posts"
        retryingLabel="Reloading posts…"
      />
    );
    expect(screen.getByRole('button', { name: 'Reloading posts…' })).toBeInTheDocument();
  });
});
