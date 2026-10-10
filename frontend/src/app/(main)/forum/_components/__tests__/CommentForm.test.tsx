import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CommentForm from '../CommentForm';

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const getErrorMessage = vi.fn(() => 'Could not post');
  render(<CommentForm onSubmit={onSubmit} getErrorMessage={getErrorMessage} />);
  return { onSubmit, getErrorMessage, user: userEvent.setup() };
}

describe('CommentForm', () => {
  it('associates the label with the textarea', () => {
    setup();
    expect(screen.getByLabelText('Add a comment')).toBeInTheDocument();
  });

  it('disables submit while the text is blank', async () => {
    const { user } = setup();
    const submit = screen.getByRole('button', { name: 'Post comment' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Add a comment'), '   ');
    expect(submit).toBeDisabled();
  });

  it('submits trimmed text and clears the field', async () => {
    const { user, onSubmit } = setup();
    const textarea = screen.getByLabelText('Add a comment');

    await user.type(textarea, '  hello world  ');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hello world'));
    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('keeps the text and shows the error when submitting fails', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new Error('500')));
    const textarea = screen.getByLabelText('Add a comment');

    await user.type(textarea, 'draft');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not post');
    expect(textarea).toHaveValue('draft');
  });

  it('gives each form instance a unique textarea id', () => {
    render(
      <>
        <CommentForm onSubmit={vi.fn()} getErrorMessage={() => ''} label="First" />
        <CommentForm onSubmit={vi.fn()} getErrorMessage={() => ''} label="Second" />
      </>
    );
    const ids = [screen.getByLabelText('First').id, screen.getByLabelText('Second').id];
    expect(new Set(ids).size).toBe(2);
  });
});
