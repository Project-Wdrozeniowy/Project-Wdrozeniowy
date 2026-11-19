import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ErrorCard from '../ErrorCard';

describe('ErrorCard', () => {
  it('shows the screen message as an alert with a retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorCard message="We could not load this." onRetry={onRetry} retrying={false} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We could not load this.');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a running retry and ignores activations', async () => {
    const onRetry = vi.fn();
    render(<ErrorCard message="Failed." onRetry={onRetry} retrying />);

    const button = screen.getByRole('button', { name: 'Trying again…' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.setup().click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('takes its padding from the screen, so each card keeps its own', () => {
    render(<ErrorCard message="Failed." onRetry={vi.fn()} retrying={false} className="p-6" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('p-6');
    expect(alert).not.toHaveClass('p-5');
  });
});
