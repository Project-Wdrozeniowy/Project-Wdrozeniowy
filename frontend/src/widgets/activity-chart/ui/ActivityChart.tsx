import { useId, useState } from 'react';
import type { LoadPhase } from '@/shared/lib/loadPhase';
import PanelError from '@/shared/ui/PanelError';
import { PANEL_ERROR_TEXT } from '@/shared/ui/panelError.const';
import {
  DEFAULT_CHART_COLOR,
  MISSING_VALUE_TEXT,
  NOTHING_MEASURED_TEXT,
  TABLE_TOGGLE_LABEL,
  UTC_NOTE,
  type ChartKind,
} from '@/widgets/activity-chart/config/activityChart.const';
import {
  chartSummary,
  hasMissingDay,
  measuredValues,
  seriesTitle,
  type ActivityMetric,
} from '@/widgets/activity-chart/lib/activityView';
import ActivityChartSkeleton from './ActivityChartSkeleton';
import ActivityGraph from './ActivityGraph';
import ActivityLegend from './ActivityLegend';
import ActivityTable from './ActivityTable';
import MetricSwitch from './MetricSwitch';

interface ActivityChartProps {
  /** The card's heading. */
  title: string;
  /** A line under the heading saying what the card shows. */
  description?: string;
  /** Everything that can be chosen. Names stay while the data loads; `points` is empty then. */
  metrics: ActivityMetric[];
  /** The chosen metric; the first one when it is not among `metrics`. */
  metricId: string;
  onMetricChange: (id: string) => void;
  /** The window as the screen words it ("Last 7 days"); the window itself is chosen there. */
  periodLabel: string;
  /** Where the screen's query is, from `getLoadPhase`. The fetching stays with the screen. */
  phase: LoadPhase;
  onRetry: () => unknown;
  /** Shown when the window has no days at all (not when its days are zero). */
  emptyText: string;
  /** Defaults to the shared fixed message; never the server's text. */
  errorText?: string;
  /** A line of dots (the dashboard's look, the default) or one bar per day. */
  kind?: ChartKind;
}

/**
 * Daily counts in a card: a graph and a table of the same points, a choice of metric, and the
 * loading, empty and failed states. The screen fetches and passes the points in; this component
 * shows nothing it was not given. Zero (`0`) and no value (`null`) look different in the graph,
 * in the table and in the text alternative.
 */
export default function ActivityChart({
  title,
  description,
  metrics,
  metricId,
  onMetricChange,
  periodLabel,
  phase,
  onRetry,
  emptyText,
  errorText = PANEL_ERROR_TEXT,
  kind = 'line',
}: ActivityChartProps) {
  const headingId = useId();
  const tableId = useId();
  const [tableOpen, setTableOpen] = useState(false);
  const metric = metrics.find((candidate) => candidate.id === metricId) ?? metrics[0];

  const measured = metric ? measuredValues(metric.points) : [];
  const note =
    measured.length === 0
      ? NOTHING_MEASURED_TEXT
      : measured.every((value) => value === 0)
        ? `No ${metric?.name.toLowerCase()} recorded in this period.`
        : null;

  let body;
  if (phase === 'failed' || phase === 'retrying') {
    // Kept on screen while the retry runs, so the keyboard user keeps their place.
    body = <PanelError message={errorText} onRetry={onRetry} retrying={phase === 'retrying'} />;
  } else if (phase === 'loading' || !metric) {
    body = <ActivityChartSkeleton />;
  } else if (metric.points.length === 0) {
    body = <p className="text-sm text-fg-subtle">{emptyText}</p>;
  } else {
    const tableTitle = seriesTitle(metric, periodLabel);
    body = (
      <>
        {note && <p className="text-sm text-fg bg-raised rounded-lg px-3 py-2">{note}</p>}
        <ActivityGraph
          metric={metric}
          kind={kind}
          summary={chartSummary(metric, periodLabel, MISSING_VALUE_TEXT)}
          missingText={MISSING_VALUE_TEXT}
        />
        <ActivityLegend
          metric={metric}
          hasMissing={hasMissingDay(metric.points)}
          color={metric.color ?? DEFAULT_CHART_COLOR}
        />
        <p className="text-xs text-fg-subtle">{UTC_NOTE}</p>
        <button
          type="button"
          onClick={() => setTableOpen((open) => !open)}
          aria-expanded={tableOpen}
          aria-controls={tableId}
          className="self-start rounded border border-line-strong px-3 py-1.5 text-sm font-semibold text-fg hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          {TABLE_TOGGLE_LABEL}
        </button>
        <div id={tableId} hidden={!tableOpen}>
          <ActivityTable metric={metric} title={tableTitle} />
        </div>
      </>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="bg-surface rounded-xl p-5 flex flex-col gap-4 border border-line"
    >
      <div>
        <h2 id={headingId} className="text-fg font-semibold text-xl">
          {title}
        </h2>
        {description && <p className="text-fg-subtle text-sm mt-1">{description}</p>}
      </div>
      {metrics.length > 1 && (
        <MetricSwitch metrics={metrics} activeId={metric?.id ?? ''} onChange={onMetricChange} />
      )}
      {body}
    </section>
  );
}
