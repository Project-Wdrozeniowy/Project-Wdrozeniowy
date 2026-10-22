import { registerSchema } from '../register.schema';

// Local form safeguards. The email, password and display name limits mirror the API;
// the username character rule and the password letter/number rule are UI-only.
// PWDRZ-154 marks interests as provisional and unsaved.
const valid = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'Password123',
  confirmPassword: 'Password123',
  displayName: 'Alice',
  terms: true,
};

it('rejects a password confirmation mismatch at the confirmation field', () => {
  const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Different123' });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ['confirmPassword'] })])
    );
  }
});

it('requires the local terms acknowledgement before submission', () => {
  expect(registerSchema.safeParse({ ...valid, terms: false }).success).toBe(false);
});

it('rejects an invalid email before submission', () => {
  expect(registerSchema.safeParse({ ...valid, email: 'invalid' }).success).toBe(false);
});

describe('display name', () => {
  it('is optional, as in the API', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: '' }).success).toBe(true);
  });

  it('is trimmed, so a blank value becomes empty', () => {
    const result = registerSchema.safeParse({ ...valid, displayName: '   ' });
    expect(result.success && result.data.displayName).toBe('');
  });

  it('allows up to 100 characters and no more', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: 'a'.repeat(100) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, displayName: 'a'.repeat(101) }).success).toBe(
      false
    );
  });
});

describe('limits of the API', () => {
  it('rejects a password over 128 characters and an email over 100', () => {
    const long = 'a1' + 'b'.repeat(127);
    expect(
      registerSchema.safeParse({ ...valid, password: long, confirmPassword: long }).success
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...valid, email: `${'a'.repeat(95)}@example.com` }).success
    ).toBe(false);
  });
});
