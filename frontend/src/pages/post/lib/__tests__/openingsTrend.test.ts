import { dayRange, utcDay, utcTime } from '@/pages/post/lib/postInsights';
import { missingDaysNote, openingsMetric, trendDescription } from '@/pages/post/lib/openingsTrend';
import type { PostOpeningTrendDto } from '@/shared/api/generated/models/postOpeningTrendDto.dto';

const trend: PostOpeningTrendDto = {
  postId: 5,
  period: '7d',
  collectedFrom: '2026-11-08T10:15:00Z',
  generatedAt: '2026-11-11T14:30:00Z',
  windowStart: '2026-11-05T00:00:00Z',
  windowEnd: '2026-11-12T00:00:00Z',
  totalOpenings: 12,
  days: [
    { date: '2026-11-07', measured: false, openings: null },
    { date: '2026-11-08', measured: true, openings: 4 },
    { date: '2026-11-09', measured: true, openings: 0 },
    { date: '2026-11-11', measured: true, openings: 8 },
  ],
};

describe('dayRange', () => {
  it.each([
    ['2026-11-12', '2026-11-18', 'Nov 12–18, 2026'],
    ['2026-02-07', '2026-03-08', 'Feb 7–Mar 8, 2026'],
    ['2025-12-28', '2026-01-03', 'Dec 28, 2025–Jan 3, 2026'],
  ])('%s to %s is "%s"', (first, last, text) => {
    expect(dayRange(first, last)).toBe(text);
  });
});

describe('UTC instants', () => {
  it('names the time and the day in UTC, whatever the time zone of the browser', () => {
    expect(utcTime('2026-11-11T14:30:00Z')).toBe('14:30');
    expect(utcTime('2026-11-11T23:05:00-02:00')).toBe('01:05');
    expect(utcDay('2026-11-11T23:05:00-02:00')).toBe('2026-11-12');
  });
});

describe('openingsMetric', () => {
  it('keeps a day before collection as no value and a measured zero as zero', () => {
    const points = openingsMetric(trend).points;

    expect(points.map((point) => point.value)).toEqual([null, 4, 0, 8]);
  });

  it('marks only the current day as partial', () => {
    expect(openingsMetric(trend).points.map((point) => point.partial)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('has no days, and names the metric, before there is an answer', () => {
    const metric = openingsMetric(undefined);

    expect(metric.points).toEqual([]);
    expect(metric.name).toBe('Openings');
  });

  it('does not take an unmeasured day with a number as a value', () => {
    const odd = { ...trend, days: [{ date: '2026-11-11', measured: false, openings: 3 }] };

    expect(openingsMetric(odd).points[0].value).toBeNull();
  });
});

describe('texts of the trend', () => {
  it('describes the window, the zone and the partial day', () => {
    expect(trendDescription(trend)).toBe(
      'Nov 7–11, 2026 · UTC · daily openings. Today is partial, counted up to 14:30 UTC.'
    );
  });

  it('does not talk about a partial day when the window does not end with today', () => {
    expect(trendDescription({ ...trend, generatedAt: '2026-11-20T10:00:00Z' })).toBe(
      'Nov 7–11, 2026 · UTC · daily openings.'
    );
  });

  it('says since when openings are collected and that earlier days are not zero', () => {
    expect(missingDaysNote(trend)).toBe(
      'Openings were not collected before Nov 8, 2026 UTC. Those days are not zero.'
    );
  });
});
