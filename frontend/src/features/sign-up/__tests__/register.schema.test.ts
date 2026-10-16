import { registerSchema } from '../register.schema';

// Local form safeguards only; these are not proof of backend validation parity.
// PWDRZ-128 reconciles backend-owned registration fields, PWDRZ-131 owns form
// extraction, and PWDRZ-154 marks interests as provisional and unsaved.
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
