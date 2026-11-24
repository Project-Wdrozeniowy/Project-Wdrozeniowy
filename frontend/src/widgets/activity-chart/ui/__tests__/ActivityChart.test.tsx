import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import type { LoadPhase } from '@/shared/lib/loadPhase';
import ActivityChart from '../ActivityChart';
import type { ActivityMetric } from '../../lib/activityView';

function day(offset: number) {
  return `2026-11-${String(10 + offset).padStart(2, '0')}`;
}

const POSTS: ActivityMetric = {
  id: 'posts',
  name: 'Posts',
  unit: { one: 'post', other: 'posts' },
  points: [
    { date: day(0), value: 3 },
    { date: day(1), value: 0 },
    { date: day(2), value: null },
    { date: day(3), value: 1 },
  ],
};

const COMMENTS: ActivityMetric = {
  id: 'comments',
  name: 'Comments',
  unit: { one: 'comment', other: 'comments' },
  points: [
    { date: day(0), value: 8 },
    { date: day(1), value: 5 },
    { date: day(2), value: 2 },
    { date: day(3), value: 9 },
  ],
};

interface Overrides {
  metrics?: ActivityMetric[];
  metricId?: string;
  phase?: LoadPhase;
  onMetricChange?: (id: string) => void;
  onRetry?: () => unknown;
  kind?: 'line' | 'bar';
  description?: string;
  missingNote?: string;
  actions?: React.ReactNode;
  embedded?: boolean;
}

function renderChart({
  metrics = [POSTS, COMMENTS],
  metricId = 'posts',
  phase = 'loaded',
  onMetricChange = vi.fn(),
  onRetry = vi.fn(),
  kind,
  description,
  missingNote,
  actions,
  embedded,
}: Overrides = {}) {
  return render(
    <ActivityChart
      title="Activity per day"
      metrics={metrics}
      metricId={metricId}
      onMetricChange={onMetricChange}
      periodLabel="Last 4 days"
      phase={phase}
      onRetry={onRetry}
      emptyText="Nothing to show for this window."
      kind={kind}
      description={description}
      missingNote={missingNote}
      actions={actions}
      embedded={embedded}
    />
  );
}

async function openTable() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Data table' }));
  return user;
}

describe('ActivityChart graph and table', () => {
  it('shows the same days and values in the graph, the table and the text alternative', async () => {
    const { container } = renderChart();
    await openTable();

    const table = screen.getByRole('table');
    const fromTable = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => [
        within(row).getByRole('rowheader').textContent,
        within(row).getByRole('cell').textContent,
      ]);
    expect(fromTable).toEqual([
      ['Nov 10, 2026', '3'],
      ['Nov 11, 2026', '0'],
      ['Nov 12, 2026', 'Not measured'],
      ['Nov 13, 2026', '1'],
    ]);

    const fromGraph = [...container.querySelectorAll('svg title')].map((node) => node.textContent);
    expect(fromGraph).toEqual([
      'Nov 10, 2026: 3 posts',
      'Nov 11, 2026: 0 posts',
      'Nov 12, 2026: not measured',
      'Nov 13, 2026: 1 post',
    ]);

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Posts per day, Last 4 days, UTC. Nov 10, 2026: 3 posts, Nov 11, 2026: 0 posts, Nov 12, 2026: not measured, Nov 13, 2026: 1 post'
    );
  });

  it('draws a measured zero as a point and a missing day as a dashed tick, not as a point', () => {
    const { container } = renderChart();

    expect(container.querySelectorAll('[data-point="measured"]')).toHaveLength(3);
    const missing = container.querySelectorAll('[data-point="missing"]');
    expect(missing).toHaveLength(1);
    expect(missing[0]).toHaveAttribute('stroke-dasharray');
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('breaks the line at a missing day instead of joining across it', () => {
    const { container } = renderChart();
    const path = container.querySelector('path')?.getAttribute('d') ?? '';

    // Two runs: the days 10 and 11 are joined by one curve, the day 13 stands alone.
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path.match(/C/g)).toHaveLength(1);
    expect(path.match(/L/g)).toBeNull();
  });

  it('draws a dashed grid with axes and tick marks, as in the dashboard frames', () => {
    const { container } = renderChart();

    const dashed = [...container.querySelectorAll('line[stroke-dasharray]')];
    expect(dashed.length).toBeGreaterThan(4);
    // The axes and the tick marks are solid and use the stronger line colour.
    expect(container.querySelectorAll('line.stroke-line-strong').length).toBeGreaterThan(4);
  });

  it('puts a legend under the graph that names the metric and explains a missing day', () => {
    renderChart();

    const legend = screen.getByText('posts').closest('p');
    expect(legend).toHaveAttribute('aria-hidden', 'true');
    expect(legend).toHaveTextContent('not measured');
  });

  it('leaves the explanation of a missing day out when no day is missing', () => {
    const complete: ActivityMetric = {
      ...POSTS,
      points: POSTS.points.map((point) => ({ ...point, value: point.value ?? 1 })),
    };
    renderChart({ metrics: [complete] });

    expect(screen.getByText('posts').closest('p')).not.toHaveTextContent('not measured');
  });

  it('names the metric, the window and the UTC zone', async () => {
    renderChart();
    await openTable();

    const table = screen.getByRole('table');
    expect(within(table).getByText('Posts per day, Last 4 days, UTC')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Date (UTC)' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Posts' })).toBeInTheDocument();
    expect(screen.getByText('Days are UTC days.')).toBeInTheDocument();
    expect(
      within(table)
        .getAllByText(/Nov 1\d, 2026/)[0]
        .closest('time')
    ).toHaveAttribute('datetime', '2026-11-10');
  });

  it('writes a day without a value in words, so it differs from zero without colour', async () => {
    renderChart();
    await openTable();

    expect(screen.getByText('Not measured')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '0' })).toBeInTheDocument();
  });

  it('labels the last day under the graph, also for a long window', () => {
    const long: ActivityMetric = {
      ...POSTS,
      points: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10),
        value: i,
      })),
    };
    const { container } = renderChart({ metrics: [long] });

    const labels = [...container.querySelectorAll('svg text')].map((node) => node.textContent);
    expect(labels).toContain('Nov 30');
    expect(labels.filter((text) => /^[A-Z][a-z]{2} \d+$/.test(text ?? '')).length).toBeLessThan(10);
  });
});

describe('ActivityChart kinds', () => {
  it('draws a line of dots by default', () => {
    const { container } = renderChart();

    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(container.querySelectorAll('rect')).toHaveLength(0);
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('draws one bar per measured day, a thin bar for zero and a dashed mark for a missing day', () => {
    const { container } = renderChart({ kind: 'bar' });

    const bars = [...container.querySelectorAll('rect[data-point="measured"]')];
    expect(bars).toHaveLength(3);
    expect(container.querySelector('path')).toBeNull();
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    const [three, zero, one] = bars.map((bar) => Number(bar.getAttribute('height')));
    expect(zero).toBeGreaterThan(0);
    expect(zero).toBeLessThan(one);
    expect(one).toBeLessThan(three);
    const missing = container.querySelectorAll('[data-point="missing"]');
    expect(missing).toHaveLength(1);
    expect(missing[0]).toHaveAttribute('stroke-dasharray');
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('lists the same days and values for bars as for the line', async () => {
    const { container } = renderChart({ kind: 'bar' });
    await openTable();

    expect([...container.querySelectorAll('svg title')].map((node) => node.textContent)).toEqual([
      'Nov 10, 2026: 3 posts',
      'Nov 11, 2026: 0 posts',
      'Nov 12, 2026: not measured',
      'Nov 13, 2026: 1 post',
    ]);
    expect(screen.getByRole('cell', { name: 'Not measured' })).toBeInTheDocument();
  });

  it('labels the vertical axis with whole numbers from 0', () => {
    const { container } = renderChart();

    const labels = [...container.querySelectorAll('svg text')]
      .map((node) => node.textContent ?? '')
      .filter((text) => /^\d+$/.test(text));
    expect(labels).toEqual(['0', '1', '2', '3']);
  });
});

describe('ActivityChart partial day', () => {
  const partial: ActivityMetric = {
    ...COMMENTS,
    points: COMMENTS.points.map((point, i) => ({ ...point, partial: i === 3 })),
  };

  it('marks a day that is not over in the graph, the table, the legend and the text alternative', async () => {
    const { container } = renderChart({ metrics: [partial], metricId: 'comments', kind: 'bar' });
    await openTable();

    const bars = container.querySelectorAll('rect[data-point="measured"]');
    expect(bars[3]).toHaveAttribute('stroke');
    expect(bars[3]).not.toHaveAttribute('fill');
    expect(bars[2]).not.toHaveAttribute('stroke');
    expect(screen.getByRole('rowheader', { name: 'Nov 13, 2026 (today, partial)' })).toBeVisible();
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /Nov 13, 2026 \(today, partial\): 9 comments$/
    );
    expect(container.querySelector('svg title:last-of-type')).toBeTruthy();
    expect(screen.getByText('today, partial').closest('p')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws a partial dot hollow in the line', () => {
    const { container } = renderChart({ metrics: [partial], metricId: 'comments' });

    const dots = container.querySelectorAll('circle[data-point="measured"]');
    expect(dots[3]).toHaveAttribute('stroke');
    expect(dots[0]).not.toHaveAttribute('stroke');
  });

  it('says nothing about a partial day when no day is partial', () => {
    renderChart();

    expect(screen.queryByText('today, partial')).not.toBeInTheDocument();
  });
});

describe('ActivityChart note for days without a value', () => {
  it('says why a day has no value, in a titled note, when the screen gives the reason', () => {
    renderChart({ missingNote: 'Collection began on Nov 12.' });

    expect(screen.getByText('Not measured', { selector: 'p' })).toBeVisible();
    expect(screen.getByText('Collection began on Nov 12.')).toBeVisible();
  });

  it('shows no note when every day has a value', () => {
    const complete: ActivityMetric = {
      ...POSTS,
      points: POSTS.points.map((point) => ({ ...point, value: point.value ?? 1 })),
    };
    renderChart({ metrics: [complete], missingNote: 'Collection began on Nov 12.' });

    expect(screen.queryByText('Collection began on Nov 12.')).not.toBeInTheDocument();
  });

  it('gives the reason instead of the general text when nothing was measured', () => {
    const none: ActivityMetric = {
      ...POSTS,
      points: POSTS.points.map((point) => ({ ...point, value: null })),
    };
    renderChart({ metrics: [none], missingNote: 'Collection began later.' });

    expect(screen.getByText('Collection began later.')).toBeVisible();
    expect(screen.queryByText('Nothing was measured in this period.')).not.toBeInTheDocument();
  });
});

describe('ActivityChart placement', () => {
  it('shows controls the screen owns beside the heading', () => {
    renderChart({ actions: <button type="button">Window</button> });

    expect(screen.getByRole('button', { name: 'Window' })).toBeInTheDocument();
  });

  it('is a card with a level-two heading, or embedded in a card with a level-three heading', () => {
    const card = renderChart();
    expect(screen.getByRole('heading', { level: 2, name: 'Activity per day' })).toBeVisible();
    expect(card.container.querySelector('section')?.className).toContain('border');
    card.unmount();

    const embedded = renderChart({ embedded: true });
    expect(screen.getByRole('heading', { level: 3, name: 'Activity per day' })).toBeVisible();
    expect(embedded.container.querySelector('section')?.className).not.toContain('border');
  });
});

describe('ActivityChart heading', () => {
  it('shows a line under the heading when the screen gives one', () => {
    renderChart({ description: 'Public posts and comments per UTC day.' });

    expect(screen.getByText('Public posts and comments per UTC day.')).toBeInTheDocument();
  });
});

describe('ActivityChart table disclosure', () => {
  it('keeps the table closed at first and opens it from the button', async () => {
    renderChart();
    const toggle = screen.getByRole('button', { name: 'Data table' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    const user = await openTable();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute(
      'aria-controls',
      screen.getByRole('table').parentElement?.parentElement?.id
    );
    expect(screen.getByRole('table')).toBeVisible();

    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('ActivityChart metric selection', () => {
  it('offers the metrics as radio buttons with the chosen one checked', () => {
    renderChart({ metricId: 'comments' });

    const group = screen.getByRole('group', { name: 'Metric' });
    expect(within(group).getByRole('radio', { name: 'Comments' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Posts' })).not.toBeChecked();
    expect(screen.getByRole('img')).toHaveAccessibleName(/^Comments per day/);
  });

  it('reports a click on another metric', async () => {
    const onMetricChange = vi.fn();
    renderChart({ onMetricChange });

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Comments' }));
    expect(onMetricChange).toHaveBeenCalledWith('comments');
  });

  it('moves between metrics with the arrow keys', async () => {
    const onMetricChange = vi.fn();
    const user = userEvent.setup();
    renderChart({ onMetricChange });

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Posts' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(onMetricChange).toHaveBeenCalledWith('comments');
  });

  it('shows the other metric when the screen switches it', async () => {
    function Screen() {
      const [metricId, setMetricId] = useState('posts');
      return (
        <ActivityChart
          title="Activity per day"
          metrics={[POSTS, COMMENTS]}
          metricId={metricId}
          onMetricChange={setMetricId}
          periodLabel="Last 4 days"
          phase="loaded"
          onRetry={vi.fn()}
          emptyText="Nothing"
        />
      );
    }
    render(<Screen />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Data table' }));
    expect(screen.getByRole('columnheader', { name: 'Posts' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Comments' }));

    expect(screen.getByRole('columnheader', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '9' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Data table' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('shows no switch for a single metric', () => {
    renderChart({ metrics: [POSTS] });

    expect(screen.queryByRole('group', { name: 'Metric' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Activity per day' })).toBeInTheDocument();
  });
});

describe('ActivityChart zero and missing', () => {
  it('says a window of zeros is recorded zeros, and still lists them', async () => {
    const zeros: ActivityMetric = {
      ...POSTS,
      points: POSTS.points.map((point) => ({ ...point, value: 0 })),
    };
    renderChart({ metrics: [zeros] });
    await openTable();

    expect(screen.getByText('No posts recorded in this period.')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: '0' })).toHaveLength(4);
    expect(screen.queryByText('Not measured')).not.toBeInTheDocument();
  });

  it('says a window with nothing measured is not zero', async () => {
    const none: ActivityMetric = {
      ...POSTS,
      points: POSTS.points.map((point) => ({ ...point, value: null })),
    };
    const { container } = renderChart({ metrics: [none] });
    await openTable();

    expect(screen.getByText('Nothing was measured in this period.')).toBeInTheDocument();
    expect(screen.queryByText('No posts recorded in this period.')).not.toBeInTheDocument();
    expect(screen.getAllByText('Not measured')).toHaveLength(4);
    expect(container.querySelectorAll('[data-point="measured"]')).toHaveLength(0);
    expect(container.querySelector('path')).toBeNull();
  });

  it('shows one point without failing', () => {
    const one: ActivityMetric = { ...POSTS, points: [{ date: day(0), value: 4 }] };
    const { container } = renderChart({ metrics: [one] });

    expect(container.querySelectorAll('[data-point="measured"]')).toHaveLength(1);
    expect(container.innerHTML).not.toContain('NaN');
  });
});

describe('ActivityChart states', () => {
  it('shows a busy, named status while it loads, and no values', () => {
    const loading = { ...POSTS, points: [] };
    renderChart({ metrics: [loading, { ...COMMENTS, points: [] }], phase: 'loading' });

    expect(screen.getByRole('status', { name: 'Loading chart' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Data table' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Posts' })).toBeInTheDocument();
  });

  it('says there is nothing to show for a window without days, not that it is zero', () => {
    renderChart({
      metrics: [
        { ...POSTS, points: [] },
        { ...COMMENTS, points: [] },
      ],
    });

    expect(screen.getByText('Nothing to show for this window.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a fixed message and asks to retry once per activation after a failure', async () => {
    const onRetry = vi.fn();
    renderChart({ phase: 'failed', onRetry });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We could not load this. Please try again.');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the error and its focused button while the retry runs', async () => {
    const onRetry = vi.fn();
    const { rerender } = renderChart({ phase: 'failed', onRetry });
    const user = userEvent.setup();
    const retry = screen.getByRole('button', { name: 'Try again' });
    await user.click(retry);

    rerender(
      <ActivityChart
        title="Activity per day"
        metrics={[POSTS, COMMENTS]}
        metricId="posts"
        onMetricChange={vi.fn()}
        periodLabel="Last 4 days"
        phase="retrying"
        onRetry={onRetry}
        emptyText="Nothing"
      />
    );

    const running = screen.getByRole('button', { name: 'Trying again…' });
    expect(running).toBe(retry);
    expect(running).toHaveFocus();
    expect(screen.queryByRole('status', { name: 'Loading chart' })).not.toBeInTheDocument();
    await user.click(running);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a custom error text when the screen words it', () => {
    render(
      <ActivityChart
        title="Activity per day"
        metrics={[POSTS]}
        metricId="posts"
        onMetricChange={vi.fn()}
        periodLabel="Last 4 days"
        phase="failed"
        onRetry={vi.fn()}
        emptyText="Nothing"
        errorText="Activity could not be loaded."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Activity could not be loaded.');
  });
});
