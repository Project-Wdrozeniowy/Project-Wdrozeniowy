import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import VoteButton from '../VoteButton';

describe('VoteButton', () => {
  it('ignores clicks while busy but stays focusable', async () => {
    const onClick = vi.fn();
    render(
      <VoteButton direction="up" active={false} onClick={onClick} busy>
        +
      </VoteButton>
    );
    const button = screen.getByRole('button', { name: /./ });

    await userEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).not.toBeDisabled();
  });
});
