import { utcDay, utcMoment } from '@/pages/dashboard/lib/utcTime';

describe('the UTC wording of the dashboard', () => {
  it('names the UTC day of an instant', () => {
    expect(utcDay('2026-11-12T00:00:00Z')).toBe('Nov 12, 2026');
    // Late evening in UTC stays on its own day, whatever the reader's zone is.
    expect(utcDay('2026-11-12T23:59:00Z')).toBe('Nov 12, 2026');
  });

  it('names an instant to the minute on a 24 hour clock', () => {
    expect(utcMoment('2026-11-18T10:00:00Z')).toBe('Nov 18, 2026, 10:00');
    expect(utcMoment('2026-11-18T00:05:00Z')).toBe('Nov 18, 2026, 00:05');
  });
});
