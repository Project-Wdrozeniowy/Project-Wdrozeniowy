import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { LoadPhase } from '@/shared/lib/loadPhase';
import ChoiceSwitch from '@/shared/ui/ChoiceSwitch';
import PanelError from '@/shared/ui/PanelError';
import { PANEL_ERROR_TEXT } from '@/shared/ui/panelError.const';
import {
  METRIC_GROUP_LABEL,
  DEFAULT_CHART_COLOR,
  MISSING_NOTE_TITLE,
  MISSING_VALUE_TEXT,
  NOTHING_MEASURED_TEXT,
  TABLE_TOGGLE_LABEL,
  UTC_NOTE,
  type ChartKind,
} from '@/widgets/activity-chart/config/activityChart.const';
import {
  chartSummary,
  hasMissingDay,
  hasPartialDay,
  measuredValues,
  seriesTitle,
  type ActivityMetric,
  type ActivityPointLink,
} from '@/widgets/activity-chart/lib/activityView';
import ActivityChartSkeleton from './ActivityChartSkeleton';
import ActivityGraph from './ActivityGraph';
import ActivityLegend from './ActivityLegend';
import ActivityTable from './ActivityTable';

interface ActivityChartProps {
  pointLinks?: Readonly<Record<string, ActivityPointLink>>;
  tableOpen?: boolean;
  onTableOpenChange?: (open: boolean) => void;
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
  /**
   * Said when some day has no value, for example since when the figures are collected. Without it
   * a missing day is still marked in the graph, the table and the text alternative.
   */
  missingNote?: string;
  /**
   * What the screen knows about the figures and shows with them, such as the window, the read
   * time and a failed refresh. Shown only while there are points; the widget does not read it.
   */
  meta?: ReactNode;
  /** Controls the screen owns, such as the choice of the window, shown beside the heading. */
  actions?: ReactNode;
  /** Inside a card of the screen: no frame or padding of its own, and a smaller heading. */
  embedded?: boolean;
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
  missingNote,
  meta,
  actions,
  embedded = false,
  pointLinks,
  tableOpen: controlledTableOpen,
  onTableOpenChange,
}: ActivityChartProps) {
  const headingId = useId();
  const tableId = useId();
  const [localTableOpen, setLocalTableOpen] = useState(false);
  const tableOpen = controlledTableOpen ?? localTableOpen;
  const metric = metrics.find((candidate) => candidate.id === metricId) ?? metrics[0];

  const measured = metric ? measuredValues(metric.points) : [];
  const someMissing = metric ? hasMissingDay(metric.points) : false;
  const allZero = measured.length > 0 && measured.every((value) => value === 0);

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
        {meta && <div className="text-sm text-fg-subtle space-y-1">{meta}</div>}
        {someMissing && missingNote ? (
          <div className="text-sm text-fg bg-raised rounded-lg px-3 py-2">
            <p className="font-semibold">{MISSING_NOTE_TITLE}</p>
            <p>{missingNote}</p>
          </div>
        ) : (
          measured.length === 0 && (
            <p className="text-sm text-fg bg-raised rounded-lg px-3 py-2">
              {NOTHING_MEASURED_TEXT}
            </p>
          )
        )}
        {allZero && (
          <p className="text-sm text-fg bg-raised rounded-lg px-3 py-2">
            {`No ${metric.name.toLowerCase()} recorded in this period.`}
          </p>
        )}
        <ActivityGraph
          metric={metric}
          kind={kind}
          summary={chartSummary(metric, periodLabel, MISSING_VALUE_TEXT)}
          missingText={MISSING_VALUE_TEXT}
          pointLinks={pointLinks}
        />
        <ActivityLegend
          metric={metric}
          hasMissing={someMissing}
          hasPartial={hasPartialDay(metric.points)}
          color={metric.color ?? DEFAULT_CHART_COLOR}
        />
        <p className="text-xs text-fg-subtle">{UTC_NOTE}</p>
        <button
          type="button"
          onClick={() =>
            onTableOpenChange ? onTableOpenChange(!tableOpen) : setLocalTableOpen(!tableOpen)
          }
          aria-expanded={tableOpen}
          aria-controls={tableId}
          className="self-start rounded border border-line-strong px-3 py-1.5 text-sm font-semibold text-fg hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          {TABLE_TOGGLE_LABEL}
        </button>
        <div id={tableId} hidden={!tableOpen}>
          <ActivityTable metric={metric} title={tableTitle} pointLinks={pointLinks} />
        </div>
      </>
    );
  }

  const Heading = embedded ? 'h3' : 'h2';
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-4',
        !embedded && 'bg-surface rounded-xl p-5 border border-line'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading
            id={headingId}
            className={cn('text-fg font-semibold', embedded ? 'text-base' : 'text-xl')}
          >
            {title}
          </Heading>
          {description && <p className="text-fg-subtle text-sm mt-1">{description}</p>}
        </div>
        {actions}
      </div>
      {metrics.length > 1 && (
        <ChoiceSwitch
          legend={METRIC_GROUP_LABEL}
          options={metrics.map((candidate) => ({ id: candidate.id, label: candidate.name }))}
          value={metric?.id ?? ''}
          onChange={onMetricChange}
        />
      )}
      {body}
    </section>
  );
}
