import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ChoiceSwitch from '../ChoiceSwitch';

const OPTIONS = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

describe('ChoiceSwitch', () => {
  it('is a named group of radio buttons with the chosen one checked', () => {
    render(<ChoiceSwitch legend="Time window" options={OPTIONS} value="30d" onChange={vi.fn()} />);

    const group = screen.getByRole('group', { name: 'Time window' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '7 days' })).not.toBeChecked();
  });

  it('reports a click on another option', async () => {
    const onChange = vi.fn();
    render(<ChoiceSwitch legend="Time window" options={OPTIONS} value="7d" onChange={onChange} />);

    await userEvent.setup().click(screen.getByRole('radio', { name: '30 days' }));
    expect(onChange).toHaveBeenCalledWith('30d');
  });

  it('moves between options with the arrow keys after Tab enters the group', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ChoiceSwitch legend="Time window" options={OPTIONS} value="7d" onChange={onChange} />);

    await user.tab();
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('30d');
  });

  it('reports nothing when the chosen option is clicked again', async () => {
    const onChange = vi.fn();
    render(<ChoiceSwitch legend="Time window" options={OPTIONS} value="7d" onChange={onChange} />);

    await userEvent.setup().click(screen.getByRole('radio', { name: '7 days' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
