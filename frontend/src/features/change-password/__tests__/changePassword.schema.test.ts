import { changePasswordSchema } from '../changePassword.schema';
import { PASSWORD_FIELD_ERRORS } from '../changePassword.const';

const valid = {
  currentPassword: 'old pass',
  newPassword: 'new-password',
  confirmPassword: 'new-password',
};

function messages(input: unknown) {
  const result = changePasswordSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('changePasswordSchema', () => {
  it('accepts a valid change', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('requires the current password', () => {
    expect(messages({ ...valid, currentPassword: '' })).toContain(
      PASSWORD_FIELD_ERRORS.currentRequired
    );
  });

  it('keeps the backend length limits for the new password', () => {
    expect(messages({ ...valid, newPassword: 'short', confirmPassword: 'short' })).toContain(
      PASSWORD_FIELD_ERRORS.newTooShort
    );
    const long = 'a'.repeat(129);
    expect(messages({ ...valid, newPassword: long, confirmPassword: long })).toContain(
      PASSWORD_FIELD_ERRORS.newTooLong
    );
    const edge = 'a'.repeat(128);
    expect(
      changePasswordSchema.safeParse({ ...valid, newPassword: edge, confirmPassword: edge }).success
    ).toBe(true);
  });

  it('requires the repeated password to match', () => {
    expect(messages({ ...valid, confirmPassword: 'other-password' })).toEqual([
      PASSWORD_FIELD_ERRORS.confirmMismatch,
    ]);
    expect(messages({ ...valid, confirmPassword: '' })).toContain(
      PASSWORD_FIELD_ERRORS.confirmRequired
    );
  });

  it('never trims: spaces belong to a password', () => {
    const padded = '  spaced out  ';
    expect(
      changePasswordSchema.safeParse({ ...valid, newPassword: padded, confirmPassword: padded })
        .success
    ).toBe(true);
    expect(messages({ ...valid, newPassword: '        ', confirmPassword: '        ' })).toEqual(
      []
    );
  });
});
