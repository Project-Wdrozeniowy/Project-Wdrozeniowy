import { AxiosError } from 'axios';
import { getPasswordChangeError, toChangePasswordRequest } from '../changePassword';
import { PASSWORD_CHANGE_ERROR_MESSAGE, PASSWORD_FIELD_ERRORS } from '../changePassword.const';

function httpError(status: number, data?: unknown) {
  const error = new AxiosError('failed');
  error.response = { status, data } as AxiosError['response'];
  return error;
}

describe('toChangePasswordRequest', () => {
  it('sends only what the API takes, without the repeated password', () => {
    expect(
      toChangePasswordRequest({ currentPassword: 'a', newPassword: 'b', confirmPassword: 'b' })
    ).toEqual({ currentPassword: 'a', newPassword: 'b' });
  });
});

describe('getPasswordChangeError', () => {
  it('reads a 400 without fields as the wrong current password', () => {
    expect(
      getPasswordChangeError(
        httpError(400, { status: 400, detail: 'Current password is incorrect' })
      )
    ).toEqual({ fields: { currentPassword: PASSWORD_FIELD_ERRORS.currentIncorrect } });
  });

  it('puts a rejected field under that field, in our words', () => {
    const error = httpError(400, {
      status: 400,
      errors: { newPassword: 'size must be between 8 and 128' },
    });
    const result = getPasswordChangeError(error);
    expect(result.fields).toEqual({ newPassword: PASSWORD_FIELD_ERRORS.newRejected });
    expect(JSON.stringify(result)).not.toContain('size must be');
  });

  it('maps a rejected current password field too', () => {
    expect(
      getPasswordChangeError(
        httpError(400, { status: 400, errors: { currentPassword: 'must not be blank' } })
      ).fields
    ).toEqual({ currentPassword: PASSWORD_FIELD_ERRORS.currentRequired });
  });

  it('shows a fixed form message for a 400 naming only unknown fields', () => {
    expect(getPasswordChangeError(httpError(400, { status: 400, errors: { other: 'x' } }))).toEqual(
      { fields: {}, form: PASSWORD_CHANGE_ERROR_MESSAGE }
    );
  });

  it('shows a fixed form message for server and network failures', () => {
    expect(getPasswordChangeError(httpError(500, { detail: 'stack trace at db:5432' }))).toEqual({
      fields: {},
      form: PASSWORD_CHANGE_ERROR_MESSAGE,
    });
    expect(getPasswordChangeError(new Error('Network Error'))).toEqual({
      fields: {},
      form: PASSWORD_CHANGE_ERROR_MESSAGE,
    });
  });
});
