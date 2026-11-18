import { render, screen } from '@testing-library/react';
import FieldError from '../FieldError';
import FieldHint from '../FieldHint';

describe('FieldError', () => {
  it('announces the message as an alert with the given id', () => {
    render(<FieldError id="name-error">Name is required</FieldError>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Name is required');
    expect(alert).toHaveAttribute('id', 'name-error');
  });

  it.each([undefined, null, false, ''])('renders nothing for %j', (message) => {
    const { container } = render(<FieldError id="name-error">{message}</FieldError>);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('FieldHint', () => {
  it('renders the hint with the given id and no alert role', () => {
    render(<FieldHint id="name-hint">Shown on your profile</FieldHint>);
    expect(screen.getByText('Shown on your profile')).toHaveAttribute('id', 'name-hint');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
