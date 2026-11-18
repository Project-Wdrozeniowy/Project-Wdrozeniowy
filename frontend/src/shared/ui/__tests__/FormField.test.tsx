import { render, screen } from '@testing-library/react';
import { cloneElement } from 'react';
import userEvent from '@testing-library/user-event';
import FormField from '../FormField';
import { getFieldControlProps } from '../fieldA11y';

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

  it('shows the required marker and the counter on the label row', () => {
    render(
      <FormField label="Title" id="title" required counter={{ used: 2, max: 10 }}>
        <input id="title" />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('2/10')).toBeInTheDocument();
  });

  it('keeps working for a consumer that wires nothing but the id', () => {
    render(
      <FormField label="Email" hint="A hint">
        <input />
      </FormField>
    );
    expect(screen.getByText('A hint')).not.toHaveAttribute('id');
  });

  describe.each([
    ['input', <input key="i" />],
    ['select', <select key="s" />],
    ['textarea', <textarea key="t" />],
  ])('with a %s', (_name, control) => {
    function renderField(options: { hint?: string; error?: string }) {
      const props = getFieldControlProps({
        id: 'field',
        hasHint: Boolean(options.hint),
        hasError: Boolean(options.error),
      });
      render(
        <FormField label="Field" id="field" hint={options.hint} error={options.error}>
          {cloneElement(control, props)}
        </FormField>
      );
      return screen.getByLabelText('Field');
    }

    it('is named by the label and focused by clicking it', async () => {
      const control = renderField({});
      await userEvent.setup().click(screen.getByText('Field'));
      expect(control).toHaveFocus();
    });

    it('is described by the hint and the error, and only by those rendered', () => {
      const control = renderField({ hint: 'The hint', error: 'The error' });
      expect(control).toHaveAttribute('aria-describedby', 'field-hint field-error');
      expect(control).toHaveAttribute('aria-invalid', 'true');
      expect(control).toHaveAccessibleDescription('The hint The error');
    });

    it('has no description when neither node is rendered', () => {
      const control = renderField({});
      expect(control).not.toHaveAttribute('aria-describedby');
      expect(control).toHaveAttribute('aria-invalid', 'false');
    });

    it('announces one error node', () => {
      renderField({ error: 'The error' });
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });
  });
});
