import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { TagInput } from '../TagInput';

function Harness({ initial = [] as string[], disabled = false }) {
  const [tags, setTags] = useState(initial);
  return <TagInput tags={tags} onChange={setTags} disabled={disabled} />;
}

describe('TagInput', () => {
  it('adds on Enter and on comma, normalizing the text', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Tags'), '#One,Two{Enter}');
    expect(screen.getByText('#one')).toBeInTheDocument();
    expect(screen.getByText('#two')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toHaveValue('');
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('adds the pending text on blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Tags'), 'blurred');
    await user.tab();
    expect(screen.getByText('#blurred')).toBeInTheDocument();
  });

  it('shows an error for an invalid tag and keeps the text', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Tags'), 'bad_tag{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('letters, numbers and single hyphens');
    expect(screen.getByLabelText('Tags')).toHaveValue('bad_tag');
  });

  it('rejects a duplicate', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a']} />);
    await user.type(screen.getByLabelText('Tags'), 'A{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('already added');
  });

  it('removes a tag with its button and with Backspace on empty text', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a', 'b', 'c']} />);
    await user.click(screen.getByRole('button', { name: 'Remove tag a' }));
    expect(screen.queryByText('#a')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Tags'));
    await user.keyboard('{Backspace}');
    expect(screen.queryByText('#c')).not.toBeInTheDocument();
    expect(screen.getByText('#b')).toBeInTheDocument();
  });

  it('stops accepting text at five tags', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['1', '2', '3', '4', '5']} />);
    await user.type(screen.getByLabelText('Tags'), 'six{Enter}');
    expect(screen.getByLabelText('Tags')).toHaveValue('');
    expect(screen.queryByText('#six')).not.toBeInTheDocument();
  });

  it('leaves a bad tag alone on blur, without an error', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Tags'), 'bad_tag');
    await user.tab();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('#bad_tag')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toHaveValue('bad_tag');
  });

  it('keeps the input focusable (readOnly) at five tags, so focus is not thrown out of a dialog', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['1', '2', '3', '4']} />);
    await user.type(screen.getByLabelText('Tags'), '5{Enter}');
    const input = screen.getByLabelText('Tags');
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveFocus();
  });

  it('moves focus to the input after a tag is removed from the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a', 'b']} />);
    screen.getByRole('button', { name: 'Remove tag a' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Tags')).toHaveFocus();
  });

  it('leaves the focus alone when a tag is removed by tapping, so no on-screen keyboard opens', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a', 'b']} />);
    await user.click(screen.getByRole('button', { name: 'Remove tag a' }));
    expect(screen.queryByText('#a')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).not.toHaveFocus();
  });

  it('ignores keys while disabled (a post is being published)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a', 'b']} disabled />);
    const input = screen.getByLabelText('Tags');
    input.focus();
    await user.keyboard('{Backspace}');
    expect(screen.getByText('#a')).toBeInTheDocument();
    expect(screen.getByText('#b')).toBeInTheDocument();
  });

  it('does not let Enter submit the surrounding form while disabled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness initial={['a']} disabled />
      </form>
    );
    screen.getByLabelText('Tags').focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
