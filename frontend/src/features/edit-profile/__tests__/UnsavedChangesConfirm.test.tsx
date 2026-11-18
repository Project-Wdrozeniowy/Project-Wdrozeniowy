import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import UnsavedChangesConfirm from '@/features/edit-profile/UnsavedChangesConfirm';

function renderConfirm() {
  const onStay = vi.fn();
  const onLeave = vi.fn();
  render(<UnsavedChangesConfirm onStay={onStay} onLeave={onLeave} />);
  return { onStay, onLeave };
}

describe('UnsavedChangesConfirm', () => {
  it('is a labelled alert dialog and puts the focus on the safe choice', () => {
    renderConfirm();

    const dialog = screen.getByRole('alertdialog', { name: 'Leave without saving?' });
    expect(dialog).toHaveAccessibleDescription(/not saved/);
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
  });

  it('does not discard anything on a stray Enter', async () => {
    const { onStay, onLeave } = renderConfirm();

    await userEvent.keyboard('{Enter}');

    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('keeps editing on Escape', async () => {
    const { onStay, onLeave } = renderConfirm();

    await userEvent.keyboard('{Escape}');

    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('leaves only when that is chosen', async () => {
    const { onStay, onLeave } = renderConfirm();

    await userEvent.click(screen.getByRole('button', { name: 'Leave and discard changes' }));

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onStay).not.toHaveBeenCalled();
  });
});
