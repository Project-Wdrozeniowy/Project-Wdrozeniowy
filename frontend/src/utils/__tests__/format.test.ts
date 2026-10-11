import { formatTimeAgo, toPercent } from '../format';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe('formatTimeAgo', () => {
  it.each([
    [0, 'just now'],
    [59, 'just now'],
    [60, '1 minute ago'],
    [5 * 60, '5 minutes ago'],
    [3600, '1 hour ago'],
    [2 * 3600, '2 hours ago'],
    [24 * 3600, '1 day ago'],
    [3 * 24 * 3600, '3 days ago'],
  ])('%i seconds -> %s', (seconds, expected) => {
    expect(formatTimeAgo(ago(seconds), NOW)).toBe(expected);
  });

  it('uses a date after a week', () => {
    const iso = ago(8 * 24 * 3600);
    expect(formatTimeAgo(iso, NOW)).toBe(new Date(iso).toLocaleDateString('en-US'));
  });

  it('never goes negative for timestamps slightly in the future (clock skew)', () => {
    expect(formatTimeAgo(ago(-30), NOW)).toBe('just now');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatTimeAgo('not-a-date', NOW)).toBe('');
  });
});

describe('toPercent', () => {
  it('formats a ratio', () => {
    expect(toPercent(0.256, 1)).toBe('25.6%');
  });
});
