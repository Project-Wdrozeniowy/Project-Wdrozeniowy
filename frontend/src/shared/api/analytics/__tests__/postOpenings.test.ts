import { getGetMyPostOpeningsQueryKey } from '@/shared/api/generated/orbita.api';
import { authorOpeningsKey } from '../postOpenings';

describe('authorOpeningsKey', () => {
  it('keeps the generated prefix, so invalidating the post reaches every account and window', () => {
    const [url, params] = getGetMyPostOpeningsQueryKey(5, { period: '7d' });

    expect(authorOpeningsKey(5, 1, '7d').slice(0, 2)).toEqual([url, params]);
  });

  it('never shares a copy between accounts', () => {
    expect(authorOpeningsKey(5, 1, '7d')).not.toEqual(authorOpeningsKey(5, 2, '7d'));
    expect(authorOpeningsKey(5, undefined, '7d')).not.toEqual(authorOpeningsKey(5, 1, '7d'));
  });

  it('never shares a copy between windows or posts', () => {
    expect(authorOpeningsKey(5, 1, '7d')).not.toEqual(authorOpeningsKey(5, 1, '30d'));
    expect(authorOpeningsKey(5, 1, '7d')).not.toEqual(authorOpeningsKey(6, 1, '7d'));
  });
});
