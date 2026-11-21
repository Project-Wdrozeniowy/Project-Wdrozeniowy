import { parseProfileTab, profileTabHref } from '@/pages/profile/lib/profileTab';

describe('parseProfileTab', () => {
  it.each(['posts', 'activity'])('opens %s', (id) => {
    expect(parseProfileTab(id)).toBe(id);
  });

  it.each([null, '', 'comments', 'saved', 'Activity', 'constructor', '__proto__'])(
    'falls back to the posts for %j: missing, unknown, or without data behind it',
    (value) => {
      expect(parseProfileTab(value)).toBe('posts');
    }
  );
});

describe('profileTabHref', () => {
  it('links the default section to the bare profile and the others to ?tab=', () => {
    expect(profileTabHref('posts')).toBe('/profile');
    expect(profileTabHref('activity')).toBe('/profile?tab=activity');
  });

  it('gives a link that parseProfileTab reads back as the same section', () => {
    for (const id of ['posts', 'activity'] as const) {
      const tab = new URL(profileTabHref(id), 'http://test').searchParams.get('tab');
      expect(parseProfileTab(tab)).toBe(id);
    }
  });
});
