import { activityMetrics, categorySeries, chartSummary } from '@/pages/dashboard/lib/dashboardView';
import { makeActivity, makeCategories } from '@/test/fakeAnalyticsServer';

describe('activityMetrics', () => {
  it('offers posts and comments per UTC day, oldest first, as the API gives them', () => {
    const metrics = activityMetrics(
      makeActivity([
        ['2026-11-16', 2, 5],
        ['2026-11-17', 0, 8],
      ])
    );

    expect(metrics.map((metric) => metric.id)).toEqual(['posts', 'comments']);
    expect(metrics[0].points).toEqual([
      { date: '2026-11-16', value: 2 },
      { date: '2026-11-17', value: 0 },
    ]);
    expect(metrics[1].points).toEqual([
      { date: '2026-11-16', value: 5 },
      { date: '2026-11-17', value: 8 },
    ]);
  });

  it('keeps the metrics, with no points, while there is no answer yet', () => {
    const metrics = activityMetrics(undefined);

    expect(metrics.map((metric) => metric.name)).toEqual(['Posts', 'Comments']);
    expect(metrics.every((metric) => metric.points.length === 0)).toBe(true);
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
