import { authorName, initialOf } from '@/shared/lib/author';

describe('authorName', () => {
  it('prefers the display name, and falls back to the username', () => {
    expect(authorName({ displayName: 'Alice A.', username: 'alice' })).toBe('Alice A.');
    expect(authorName({ displayName: null, username: 'alice' })).toBe('alice');
    expect(authorName({ displayName: '   ', username: 'alice' })).toBe('alice');
  });
});

describe('initialOf', () => {
  it('takes the whole first character, even an emoji, in capitals', () => {
    expect(initialOf('alice')).toBe('A');
    expect(initialOf('😀 Bob')).toBe('😀');
    expect(initialOf('')).toBe('');
  });
});
