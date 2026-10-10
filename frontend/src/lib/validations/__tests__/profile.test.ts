import { profileSchema } from '../profile';

const valid = {
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: 'https://example.com/a.png',
  bio: 'Hello',
};

/** The first message per field, which is what the form shows. */
function errorsOf(input: Record<string, string>) {
  const result = profileSchema.safeParse({ ...valid, ...input });
  const errors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      if (!(field in errors)) errors[field] = issue.message;
    }
  }
  return errors;
}

describe('profileSchema', () => {
  it('accepts valid values', () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts empty optional fields', () => {
    expect(
      profileSchema.safeParse({ ...valid, displayName: '', avatarUrl: '', bio: '' }).success
    ).toBe(true);
  });

  it('trims every value', () => {
    const result = profileSchema.parse({
      email: '  a@b.co ',
      displayName: ' A ',
      avatarUrl: ' https://x.io/a.png ',
      bio: ' hi \n',
    });
    expect(result).toEqual({
      email: 'a@b.co',
      displayName: 'A',
      avatarUrl: 'https://x.io/a.png',
      bio: 'hi',
    });
  });

  describe('email', () => {
    it('is required', () => {
      expect(errorsOf({ email: '' }).email).toBe('Email is required');
      expect(errorsOf({ email: '   ' }).email).toBe('Email is required');
    });

    it('must look like an email', () => {
      expect(errorsOf({ email: 'nope' }).email).toBe('Please enter a valid email address');
    });

    it('allows 100 characters and rejects 101', () => {
      const local = 'a'.repeat(100 - '@example.com'.length);
      expect(errorsOf({ email: `${local}@example.com` }).email).toBeUndefined();
      expect(errorsOf({ email: `${local}a@example.com` }).email).toMatch(/at most 100/);
    });
  });

  describe('displayName', () => {
    it('allows 100 characters and rejects 101', () => {
      expect(errorsOf({ displayName: 'x'.repeat(100) }).displayName).toBeUndefined();
      expect(errorsOf({ displayName: 'x'.repeat(101) }).displayName).toMatch(/at most 100/);
    });
  });

  describe('bio', () => {
    it('allows 1000 characters and rejects 1001', () => {
      expect(errorsOf({ bio: 'x'.repeat(1000) }).bio).toBeUndefined();
      expect(errorsOf({ bio: 'x'.repeat(1001) }).bio).toMatch(/at most 1000/);
    });
  });

  describe('avatarUrl', () => {
    it.each(['http://example.com/a.png', 'https://example.com/a.png?x=1'])('accepts %s', (url) => {
      expect(errorsOf({ avatarUrl: url }).avatarUrl).toBeUndefined();
    });

    it.each([
      'not a url',
      'example.com/a.png',
      'javascript:alert(1)',
      'ftp://example.com/a.png',
      'data:image/png;base64,AAAA',
    ])('rejects %s', (url) => {
      expect(errorsOf({ avatarUrl: url }).avatarUrl).toBe(
        'Please enter a full link starting with http:// or https://'
      );
    });

    it('allows 500 characters and rejects 501', () => {
      const base = 'https://example.com/';
      expect(
        errorsOf({ avatarUrl: base + 'a'.repeat(500 - base.length) }).avatarUrl
      ).toBeUndefined();
      expect(errorsOf({ avatarUrl: base + 'a'.repeat(501 - base.length) }).avatarUrl).toMatch(
        /at most 500/
      );
    });
  });
});
