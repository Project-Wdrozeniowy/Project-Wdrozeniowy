import {
  axisDay,
  axisLabelIndexes,
  chartSummary,
  fullDay,
  hasMissingDay,
  measuredValues,
  monotonePath,
  seriesTitle,
  unitText,
  yAxis,
  type ActivityMetric,
} from '../activityView';

const posts: ActivityMetric = {
  id: 'posts',
  name: 'Posts',
  unit: { one: 'post', other: 'posts' },
  points: [
    { date: '2026-11-16', value: 1 },
    { date: '2026-11-17', value: 0 },
    { date: '2026-11-18', value: null },
  ],
};

describe('day labels', () => {
  it('names the UTC day, whatever the time zone of the browser', () => {
    expect(axisDay('2026-11-17')).toBe('Nov 17');
    expect(fullDay('2026-11-17')).toBe('Nov 17, 2026');
    expect(fullDay('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('shows anything that is not a day as it is', () => {
    expect(axisDay('yesterday')).toBe('yesterday');
    expect(fullDay('yesterday')).toBe('yesterday');
  });
});

describe('axisLabelIndexes', () => {
  it('labels every day of a short window', () => {
    expect([...axisLabelIndexes(7)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('thins a long window but always labels the last day', () => {
    const indexes = axisLabelIndexes(30);
    expect(indexes.has(29)).toBe(true);
    expect(indexes.size).toBeLessThanOrEqual(7);
    expect(indexes.size).toBeGreaterThan(2);
  });

  it('has nothing to label without days', () => {
    expect(axisLabelIndexes(0).size).toBe(0);
  });
});

describe('text of values', () => {
  it('uses the unit in the right number', () => {
    expect(unitText(posts, 1)).toBe('1 post');
    expect(unitText(posts, 0)).toBe('0 posts');
    expect(unitText(posts, 12)).toBe('12 posts');
  });

  it('does not count a missing day as a value', () => {
    expect(measuredValues(posts.points)).toEqual([1, 0]);
  });

  it('says metric, window and zone in the title', () => {
    expect(seriesTitle(posts, 'Last 7 days')).toBe('Posts per day, Last 7 days, UTC');
  });

  it('lists every day in the summary, a measured zero apart from a missing day', () => {
    expect(chartSummary(posts, 'Last 3 days', 'Not measured')).toBe(
      'Posts per day, Last 3 days, UTC. Nov 16, 2026: 1 post, Nov 17, 2026: 0 posts, Nov 18, 2026: not measured'
    );
  });
});

describe('yAxis', () => {
  it('counts in whole numbers from zero up to a top that holds the largest value', () => {
    expect(yAxis(0)).toEqual({ top: 1, ticks: [0, 1] });
    expect(yAxis(1)).toEqual({ top: 1, ticks: [0, 1] });
    expect(yAxis(3)).toEqual({ top: 3, ticks: [0, 1, 2, 3] });
    expect(yAxis(5)).toEqual({ top: 5, ticks: [0, 1, 2, 3, 4, 5] });
  });

  it('takes larger steps for larger values, with a few labels', () => {
    expect(yAxis(7)).toEqual({ top: 8, ticks: [0, 2, 4, 6, 8] });
    expect(yAxis(42)).toEqual({ top: 50, ticks: [0, 10, 20, 30, 40, 50] });
    expect(yAxis(200)).toEqual({ top: 200, ticks: [0, 50, 100, 150, 200] });
    expect(yAxis(1234).ticks.at(-1)).toBeGreaterThanOrEqual(1234);
    expect(yAxis(1234).ticks.length).toBeLessThanOrEqual(6);
  });

  it('never leaves a value above the top', () => {
    for (const max of [1, 2, 9, 11, 26, 99, 101, 480, 999, 12000]) {
      expect(yAxis(max).top).toBeGreaterThanOrEqual(max);
    }
  });
});

describe('monotonePath', () => {
  const at = (x: number, y: number) => ({ x, y });

  it('draws nothing for no points and a start for one', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([at(10, 20)])).toBe('M10.0,20.0');
  });

  it('joins two points with one curve', () => {
    const path = monotonePath([at(0, 0), at(10, 10)]);

    expect(path.startsWith('M0.0,0.0 C')).toBe(true);
    expect(path.endsWith('10.0,10.0')).toBe(true);
    expect(path.match(/C/g)).toHaveLength(1);
  });

  it('keeps every control point between the heights of its two neighbours, so there is no overshoot', () => {
    const points = [at(0, 100), at(10, 20), at(20, 20), at(30, 90), at(40, 10)];
    const path = monotonePath(points);

    const numbers = [...path.matchAll(/C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) /g)];
    numbers.forEach((match, i) => {
      const low = Math.min(points[i].y, points[i + 1].y);
      const high = Math.max(points[i].y, points[i + 1].y);
      for (const y of [Number(match[2]), Number(match[4])]) {
        expect(y).toBeGreaterThanOrEqual(low - 0.1);
        expect(y).toBeLessThanOrEqual(high + 0.1);
      }
    });
    expect(path).not.toContain('NaN');
  });

  it('stays flat across equal values', () => {
    const path = monotonePath([at(0, 50), at(10, 50), at(20, 50)]);

    expect(path).not.toContain('NaN');
    expect([...path.matchAll(/(\d+\.\d),(\d+\.\d)/g)].every((match) => match[2] === '50.0')).toBe(
      true
    );
  });
});

describe('hasMissingDay', () => {
  it('tells a day without a value from a measured zero', () => {
    expect(hasMissingDay(posts.points)).toBe(true);
    expect(hasMissingDay([{ date: '2026-11-17', value: 0 }])).toBe(false);
  });
});
