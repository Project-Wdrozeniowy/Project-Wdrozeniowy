import {
  activitySeries,
  categorySeries,
  chartSummary,
  dayLabel,
  isEmptySeries,
} from '@/pages/dashboard/lib/dashboardView';
import { makeActivity, makeCategories } from '@/test/fakeAnalyticsServer';

describe('dayLabel', () => {
  it('names the UTC day', () => {
    expect(dayLabel('2026-11-17')).toBe('Tue 17');
    expect(dayLabel('2026-11-01')).toBe('Sun 1');
  });

  it('shows anything that is not a day as it is', () => {
    expect(dayLabel('soon')).toBe('soon');
  });
});

describe('activitySeries', () => {
  it('labels every day of a week', () => {
    const series = activitySeries(
      makeActivity([
        ['2026-11-16', 2, 5],
        ['2026-11-17', 3, 8],
      ])
    );

    expect(series.days).toEqual(['Mon 16', 'Tue 17']);
    expect(series.labels).toEqual(['Mon 16', 'Tue 17']);
    expect(series.posts).toEqual([2, 3]);
    expect(series.comments).toEqual([5, 8]);
  });

  it('labels only every fifth day of a month, but keeps every day for the text alternative', () => {
    const days: Array<[string, number, number]> = Array.from({ length: 30 }, (_, i) => [
      `2026-10-${String(i + 1).padStart(2, '0')}`,
      i,
      i,
    ]);

    const series = activitySeries(makeActivity(days, '30d'));

    expect(series.days).toHaveLength(30);
    expect(series.labels.filter(Boolean)).toHaveLength(6);
    expect(series.labels[0]).toBe('Thu 1');
    expect(series.labels[1]).toBe('');
    expect(series.labels[5]).toBe('Tue 6');
  });

  it('copes with no days at all', () => {
    expect(activitySeries({ ...makeActivity([]), days: [] })).toEqual({
      days: [],
      labels: [],
      posts: [],
      comments: [],
    });
  });
});

describe('categorySeries', () => {
  it('keeps the server order and names a post without a category', () => {
    const series = categorySeries(
      makeCategories([
        ['AI / Tech', 40],
        ['Gaming', 20],
        [null, 5],
      ])
    );

    expect(series.labels).toEqual(['AI / Tech', 'Gaming', 'No category']);
    expect(series.values).toEqual([40, 20, 5]);
  });

  it('keeps up to eight bars as they are', () => {
    const rows: Array<[string, number]> = Array.from({ length: 8 }, (_, i) => [`C${i}`, 8 - i]);

    const series = categorySeries(makeCategories(rows));

    expect(series.labels).toHaveLength(8);
    expect(series.labels).not.toContain('Other');
  });

  it('adds up the rest as "Other" beyond eight, so the bars still sum to the total', () => {
    const rows: Array<[string | null, number]> = [
      ...Array.from({ length: 9 }, (_, i): [string, number] => [`C${i}`, 10 - i]),
      [null, 4],
    ];

    const series = categorySeries(makeCategories(rows));

    expect(series.labels).toHaveLength(8);
    expect(series.labels.slice(0, 7)).toEqual(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
    expect(series.labels[7]).toBe('Other');
    // C7 (3) + C8 (2) + the post without a category (4)
    expect(series.values[7]).toBe(3 + 2 + 4);
    expect(series.values.reduce((sum, value) => sum + value, 0)).toBe(
      rows.reduce((sum, row) => sum + row[1], 0)
    );
  });
});

describe('chartSummary', () => {
  it('says the values in words', () => {
    expect(chartSummary('Posts per day', ['Mon 16', 'Tue 17'], [2, 3])).toBe(
      'Posts per day. Mon 16: 2, Tue 17: 3'
    );
  });

  it('numbers a bar that has no label', () => {
    expect(chartSummary('Posts', ['', ''], [1, 2])).toBe('Posts. 1: 1, 2: 2');
  });
});

describe('isEmptySeries', () => {
  it.each([
    [[], true],
    [[0, 0], true],
    [[0, 1], false],
  ])('%j -> %s', (values, empty) => {
    expect(isEmptySeries(values)).toBe(empty);
  });
});
