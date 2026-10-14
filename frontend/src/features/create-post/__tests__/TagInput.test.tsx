import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TagInput } from '../TagInput';

function Harness({ initial = [] as string[] }) {
  const [tags, setTags] = useState(initial);
  return <TagInput tags={tags} onChange={setTags} />;
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

  it('disables the input at five tags', () => {
    render(<Harness initial={['1', '2', '3', '4', '5']} />);
    expect(screen.getByLabelText('Tags')).toBeDisabled();
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
});
