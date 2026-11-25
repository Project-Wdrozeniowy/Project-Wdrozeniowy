import { activityMetrics, categorySeries, countLabel } from '@/pages/dashboard/lib/dashboardView';
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

    expect(series).toMatchObject([
      { key: 'category-1', label: 'AI / Tech', posts: 40, share: 0.6154, barPercent: 100 },
      { key: 'category-2', label: 'Gaming', posts: 20, share: 0.3077, barPercent: 50 },
      {
        key: 'uncategorized',
        category: null,
        label: 'No category',
        posts: 5,
        share: 0.0769,
        barPercent: 12.5,
      },
    ]);
  });

  it('keeps eight categories and the zero uncategorized row', () => {
    const rows: Array<[string, number]> = Array.from({ length: 8 }, (_, i) => [`C${i}`, 8 - i]);

    const series = categorySeries(makeCategories(rows));

    expect(series).toHaveLength(9);
  });

  it('keeps every category and the separate uncategorized row beyond eight', () => {
    const rows: Array<[string | null, number]> = [
      ...Array.from({ length: 9 }, (_, i): [string, number] => [`C${i}`, 10 - i]),
      [null, 4],
    ];

    const series = categorySeries(makeCategories(rows));

    expect(series).toMatchObject(
      rows.map(([name, posts], index) => ({
        key: name === null ? 'uncategorized' : `category-${index + 1}`,
        label: name ?? 'No category',
        posts,
      }))
    );
  });

  it('preserves identities, hidden categories and API shares without renormalizing', () => {
    const distribution = makeCategories([
      ['Same', 1],
      ['Same', 2],
      [null, 0],
    ]);
    distribution.categories[0].category!.id = 42;
    distribution.categories[0].category!.visible = false;
    distribution.categories[0].share = 0.3333;
    expect(categorySeries(distribution)).toMatchObject([
      { key: 'category-42', category: { id: 42, visible: false }, share: 0.3333 },
      { key: 'category-2', category: { id: 2 }, share: 0.6667 },
      { key: 'uncategorized', category: null, share: 0 },
    ]);
  });

  it('keeps zero counts and undefined shares without invalid bar widths', () => {
    expect(categorySeries(makeCategories([['Quiet', 0]]))).toMatchObject([
      { label: 'Quiet', posts: 0, share: null, barPercent: 0 },
      { label: 'No category', posts: 0, share: null, barPercent: 0 },
    ]);
  });
});

describe('countLabel', () => {
  it('uses the singular for exactly one and the plural for zero and many', () => {
    expect(countLabel(1, 'post', 'posts')).toBe('1 post');
    expect(countLabel(0, 'post', 'posts')).toBe('0 posts');
    expect(countLabel(2, 'post', 'posts')).toBe('2 posts');
  });

  it('groups thousands as the rest of the dashboard does', () => {
    expect(countLabel(12345, 'comment', 'comments')).toBe('12,345 comments');
  });
});
