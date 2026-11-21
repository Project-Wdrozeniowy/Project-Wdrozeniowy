import { formatDate } from '@/shared/lib/formatDate';

const format = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

describe('formatDate', () => {
  it('formats a date', () => {
    expect(formatDate('2026-11-08T10:00:00.000Z', format)).toBe('November 8, 2026');
  });

  it.each([null, '', 'not a date'])('is null for %j, which formatting would throw on', (value) => {
    expect(formatDate(value, format)).toBeNull();
  });
});
