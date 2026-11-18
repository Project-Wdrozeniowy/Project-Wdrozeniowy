import { getFieldControlProps, getFieldIds } from '../fieldA11y';

describe('getFieldIds', () => {
  it('derives the hint and error ids from the control id', () => {
    expect(getFieldIds('email')).toEqual({ hint: 'email-hint', error: 'email-error' });
  });
});

describe('getFieldControlProps', () => {
  it('has no description and is valid for a plain field', () => {
    expect(getFieldControlProps({ id: 'name' })).toEqual({
      id: 'name',
      'aria-invalid': false,
      'aria-describedby': undefined,
      'aria-required': undefined,
    });
  });

  it('marks the control as required only when asked', () => {
    expect(getFieldControlProps({ id: 'name', required: true })['aria-required']).toBe(true);
    expect(getFieldControlProps({ id: 'name', required: false })['aria-required']).toBeUndefined();
  });

  it('references only the nodes that are rendered', () => {
    expect(getFieldControlProps({ id: 'name', hasHint: true })['aria-describedby']).toBe(
      'name-hint'
    );
    expect(getFieldControlProps({ id: 'name', hasError: true })['aria-describedby']).toBe(
      'name-error'
    );
    expect(
      getFieldControlProps({ id: 'name', hasHint: true, hasError: true })['aria-describedby']
    ).toBe('name-hint name-error');
  });

  it('marks the control invalid when it has an error', () => {
    expect(getFieldControlProps({ id: 'name', hasError: true })['aria-invalid']).toBe(true);
  });

  it('lets invalid differ from the error node', () => {
    expect(getFieldControlProps({ id: 'name', hasError: true, invalid: false })).toMatchObject({
      'aria-invalid': false,
      'aria-describedby': 'name-error',
    });
    expect(getFieldControlProps({ id: 'name', invalid: true })).toMatchObject({
      'aria-invalid': true,
      'aria-describedby': undefined,
    });
  });
});
