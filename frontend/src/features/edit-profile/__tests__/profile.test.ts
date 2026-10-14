import { AxiosError } from 'axios';
import { buildUpdateRequest, getProfileSaveError, profileToFormValues } from '../profile';
import { profileSchema } from '../profile.schema';
import type { ProfileFormData } from '../profile.schema';
import type { MyProfile } from '@/shared/api/user/user.dto';

const profile: MyProfile = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: 'https://example.com/a.png',
  bio: 'Hello',
  role: 'USER',
  status: 'ACTIVE',
  postCount: 2,
  commentCount: 3,
  createdAt: '2026-10-01T10:00:00Z',
};

const unchanged: ProfileFormData = {
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: 'https://example.com/a.png',
  bio: 'Hello',
};

function apiError(status: number, data?: unknown) {
  return new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: {} as never,
    data,
  });
}

describe('profileToFormValues', () => {
  it('maps the profile to form values', () => {
    expect(profileToFormValues(profile)).toEqual(unchanged);
  });

  it('turns the API null (not set) into empty inputs', () => {
    expect(
      profileToFormValues({ ...profile, displayName: null, avatarUrl: null, bio: null })
    ).toEqual({ email: 'alice@example.com', displayName: '', avatarUrl: '', bio: '' });
  });
});

describe('buildUpdateRequest', () => {
  it('is empty when nothing changed', () => {
    expect(buildUpdateRequest(unchanged, profile)).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(buildUpdateRequest({ ...unchanged, displayName: 'Alice A.' }, profile)).toEqual({
      displayName: 'Alice A.',
    });
    expect(
      buildUpdateRequest({ ...unchanged, email: 'new@example.com', bio: 'Changed' }, profile)
    ).toEqual({ email: 'new@example.com', bio: 'Changed' });
  });

  it('sends an empty string to clear a field, as the API defines', () => {
    expect(buildUpdateRequest({ ...unchanged, bio: '', avatarUrl: '' }, profile)).toEqual({
      bio: '',
      avatarUrl: '',
    });
  });

  it('trims values and ignores whitespace-only differences', () => {
    expect(buildUpdateRequest({ ...unchanged, displayName: '  Alice  ' }, profile)).toEqual({});
    expect(buildUpdateRequest({ ...unchanged, displayName: '  Bob  ' }, profile)).toEqual({
      displayName: 'Bob',
    });
  });

  it('does not report a change for a stored value with stray whitespace the user did not touch', () => {
    const legacy = { ...profile, displayName: ' Alice ', bio: 'Hello\n' };
    // The form shows the stored text as it is, and validation trims it: still no change.
    expect(
      buildUpdateRequest({ ...unchanged, displayName: ' Alice ', bio: 'Hello\n' }, legacy)
    ).toEqual({});
  });

  it('does not treat an unset field and an empty input as a change', () => {
    const unset = { ...profile, displayName: null, avatarUrl: null, bio: null };
    expect(
      buildUpdateRequest({ email: unset.email, displayName: '', avatarUrl: '', bio: '' }, unset)
    ).toEqual({});
  });

  it('only ever contains fields of the contract', () => {
    const request = buildUpdateRequest(
      { ...unchanged, email: 'x@example.com', displayName: 'X', avatarUrl: '', bio: 'X' },
      profile
    );
    expect(Object.keys(request).sort()).toEqual(['avatarUrl', 'bio', 'displayName', 'email']);
  });
});

describe('getProfileSaveError', () => {
  it('maps 409 to the email field', () => {
    expect(getProfileSaveError(apiError(409, { detail: 'Email already registered' }))).toEqual({
      fields: { email: 'This email address is already in use.' },
    });
  });

  it('maps 400 field errors to our own messages, not the server text', () => {
    const result = getProfileSaveError(
      apiError(400, {
        detail: 'Validation failed',
        errors: { bio: 'size must be between 0 and 1000', avatarUrl: 'must be a valid URL' },
      })
    );
    expect(result.form).toBeUndefined();
    expect(result.fields.bio).toBe('Bio must be at most 1000 characters');
    expect(result.fields.avatarUrl).toBe(
      'Please enter a full link starting with http:// or https://'
    );
    expect(JSON.stringify(result)).not.toMatch(/size must be|must be a valid URL/);
  });

  it('ignores unknown fields and falls back to a form message', () => {
    expect(getProfileSaveError(apiError(400, { errors: { role: 'nope' } }))).toEqual({
      fields: {},
      form: 'We could not save your changes. Please try again.',
    });
  });

  it('falls back to a form message for a 400 without field errors', () => {
    expect(getProfileSaveError(apiError(400, { detail: 'Failed to convert' })).form).toBe(
      'We could not save your changes. Please try again.'
    );
  });

  it.each([500, 502, 503])(
    'uses a generic form message for %i and never the server text',
    (status) => {
      const result = getProfileSaveError(
        apiError(status, { detail: 'PSQLException at com.devpulse' })
      );
      expect(result.fields).toEqual({});
      expect(result.form).toBe('We could not save your changes. Please try again.');
      expect(JSON.stringify(result)).not.toContain('PSQLException');
    }
  );

  it('uses the generic message for network and unknown errors', () => {
    expect(getProfileSaveError(new AxiosError('Network Error')).form).toBeDefined();
    expect(getProfileSaveError(new Error('boom')).form).toBeDefined();
    expect(getProfileSaveError('weird').form).toBeDefined();
  });
});

describe('one wording for one rule', () => {
  function formMessage(field: keyof ProfileFormData, value: string) {
    const result = profileSchema.safeParse({ ...unchanged, [field]: value });
    return result.success
      ? undefined
      : result.error.issues.find((i) => i.path[0] === field)?.message;
  }

  it.each([
    ['displayName', 'x'.repeat(101)],
    ['bio', 'x'.repeat(1001)],
    ['avatarUrl', 'ftp://example.com/a.png'],
    ['email', 'nope'],
  ] as const)(
    'shows the same text for %s whether the form or the server rejects it',
    (field, value) => {
      const fromServer = getProfileSaveError(
        apiError(400, { errors: { [field]: 'raw server text' } })
      );
      expect(fromServer.fields[field]).toBe(formMessage(field, value));
    }
  );
});
