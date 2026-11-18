import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldLabel from '../FieldLabel';

describe('FieldLabel', () => {
  it('focuses its control when clicked', async () => {
    render(
      <>
        <FieldLabel htmlFor="title" label="Title" />
        <input id="title" />
      </>
    );
    await userEvent.setup().click(screen.getByText('Title'));
    expect(screen.getByLabelText('Title')).toHaveFocus();
  });

  it('shows a required marker that assistive technology does not read', () => {
    render(<FieldLabel htmlFor="title" label="Title" required />);
    const marker = screen.getByText('*');
    expect(marker).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows no marker by default', () => {
    render(<FieldLabel htmlFor="title" label="Title" />);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('shows the counter as used/max, hidden from assistive technology', () => {
    render(<FieldLabel htmlFor="title" label="Title" counter={{ used: 3, max: 120 }} />);
    expect(screen.getByText('3/120')).toHaveAttribute('aria-hidden', 'true');
  });

  it('turns the counter red only above the limit', () => {
    const { rerender } = render(
      <FieldLabel htmlFor="title" label="Title" counter={{ used: 120, max: 120 }} />
    );
    expect(screen.getByText('120/120')).not.toHaveClass('text-red-500');
    rerender(<FieldLabel htmlFor="title" label="Title" counter={{ used: 121, max: 120 }} />);
    expect(screen.getByText('121/120')).toHaveClass('text-red-500');
  });
});
