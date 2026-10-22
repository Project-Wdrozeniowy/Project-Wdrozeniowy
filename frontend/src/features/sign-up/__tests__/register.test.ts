import { AxiosError } from 'axios';
import { getRegisterError, toRegisterRequest } from '../register';
import { REGISTER_ERROR_MESSAGE, REGISTER_FIELD_ERRORS } from '../register.const';

const values = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Password123',
  confirmPassword: 'Password123',
  displayName: 'Alice',
  terms: true as const,
};

function httpError(status: number, data?: unknown) {
  const error = new AxiosError('failed');
  error.response = { status, data } as AxiosError['response'];
  return error;
}

describe('toRegisterRequest', () => {
  it('maps the form to the fields of the API, with the agreed displayName name', () => {
    expect(toRegisterRequest(values)).toEqual({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123',
      displayName: 'Alice',
    });
  });

  it('never sends the repeated password, the terms or interests: the API has no such field', () => {
    const request = toRegisterRequest(values);
    expect(request).not.toHaveProperty('confirmPassword');
    expect(request).not.toHaveProperty('terms');
    expect(request).not.toHaveProperty('interests');
  });

  it('leaves out an empty or blank display name', () => {
    expect(toRegisterRequest({ ...values, displayName: '' })).not.toHaveProperty('displayName');
    expect(toRegisterRequest({ ...values, displayName: '  ' })).not.toHaveProperty('displayName');
  });

  it('trims the display name', () => {
    expect(toRegisterRequest({ ...values, displayName: ' Alice ' }).displayName).toBe('Alice');
  });
});

describe('getRegisterError', () => {
  it('maps the fields of a 400 to our wording', () => {
    const result = getRegisterError(
      httpError(400, { status: 400, errors: { displayName: 'must not be blank', other: 'x' } })
    );
    expect(result).toEqual({ fields: { displayName: REGISTER_FIELD_ERRORS.invalid.displayName } });
  });

  it('shows a fixed form message for a 400 without known fields', () => {
    expect(getRegisterError(httpError(400, { status: 400 }))).toEqual({
      fields: {},
      form: REGISTER_ERROR_MESSAGE,
    });
  });

  it('tells a taken username from a taken email, without showing the server text', () => {
    const username = getRegisterError(httpError(409, { detail: 'Username already taken' }));
    expect(username.fields).toEqual({ username: REGISTER_FIELD_ERRORS.usernameTaken });
    const email = getRegisterError(httpError(409, { detail: 'Email already registered' }));
    expect(email.fields).toEqual({ email: REGISTER_FIELD_ERRORS.emailTaken });
  });

  it('shows a fixed form message for a 409 it cannot place, and for other failures', () => {
    expect(getRegisterError(httpError(409, { detail: 'Conflict' })).form).toBe(
      REGISTER_ERROR_MESSAGE
    );
    expect(getRegisterError(httpError(500, { detail: 'stack trace' })).form).toBe(
      REGISTER_ERROR_MESSAGE
    );
    expect(getRegisterError(new Error('Network Error')).form).toBe(REGISTER_ERROR_MESSAGE);
  });
});
