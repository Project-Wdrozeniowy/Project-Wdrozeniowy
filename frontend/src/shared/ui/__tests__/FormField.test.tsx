import { render, screen } from '@testing-library/react';
import FormField from '../FormField';

describe('FormField', () => {
  it('associates the label with its input', () => {
    render(
      <FormField label="Email" id="email">
        <input id="email" />
      </FormField>
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('gives the hint and the error ids that inputs can reference', () => {
    render(
      <FormField label="Email" id="email" hint="We never share it" error="Required">
        <input id="email" />
      </FormField>
    );
    expect(screen.getByText('We never share it')).toHaveAttribute('id', 'email-hint');
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'email-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders no alert without an error', () => {
    render(
      <FormField label="Email" id="email">
        <input id="email" />
      </FormField>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
