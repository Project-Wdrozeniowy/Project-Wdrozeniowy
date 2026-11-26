import {
  BAR_WIDTH_SHARE,
  CHART_PADDING,
  CHART_SIZE,
  DEFAULT_CHART_COLOR,
  GRID_DASH,
  MIN_BAR_HEIGHT,
  TICK_LENGTH,
  ZERO_BAR_HEIGHT,
  type ChartKind,
} from '@/widgets/activity-chart/config/activityChart.const';
import {
  axisDay,
  axisLabelIndexes,
  dayText,
  measuredValues,
  monotonePath,
  unitText,
  yAxis,
  type ActivityMetric,
  type ActivityPointLink,
} from '@/widgets/activity-chart/lib/activityView';
import { Link } from 'react-router';

interface ActivityGraphProps {
  pointLinks?: Readonly<Record<string, ActivityPointLink>>;
  metric: ActivityMetric;
  kind: ChartKind;
  /** The graph in words: its text alternative. */
  summary: string;
  missingText: string;
}

const { width: w, height: h } = CHART_SIZE;
const pad = CHART_PADDING;

/**
 * The daily values as a smooth line of dots or as bars, on a dashed grid with axes and tick marks.
 * A measured value, zero included, is drawn at its level (a zero is a dot on the baseline, or a
 * thin bar). A day with no value has no dot or bar: the line breaks there and a dashed mark stands
 * in its place, so the difference does not depend on colour. The table next to it lists the same
 * points.
 */
export default function ActivityGraph({
  metric,
  kind,
  summary,
  missingText,
  pointLinks,
}: ActivityGraphProps) {
  const color = metric.color ?? DEFAULT_CHART_COLOR;
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const baseline = pad.top + ch;
  const count = metric.points.length;
  const { top, ticks } = yAxis(Math.max(0, ...measuredValues(metric.points)));

  // A line runs from edge to edge; a bar sits in the middle of its own slot.
  const slot = count > 0 ? cw / count : cw;
  const xOf = (index: number) =>
    kind === 'bar'
      ? pad.left + (index + 0.5) * slot
      : pad.left + (count > 1 ? (index / (count - 1)) * cw : cw / 2);
  const yOf = (value: number) => baseline - (value / top) * ch;
  const labelled = axisLabelIndexes(count);

  // The line is drawn in runs of days with a value: a missing day ends one and the next value
  // starts a new one, so the curve never crosses a day that has no value.
  const runs: { x: number; y: number }[][] = [];
  metric.points.forEach((point, index) => {
    if (point.value === null) return;
    const dot = { x: xOf(index), y: yOf(point.value) };
    if (index > 0 && metric.points[index - 1].value !== null) runs[runs.length - 1].push(dot);
    else runs.push([dot]);
  });
  const path = runs.map(monotonePath).join(' ');

  return (
    <div className="overflow-x-auto min-w-0">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role={pointLinks ? 'group' : 'img'}
        aria-label={summary}
        style={pointLinks ? { minWidth: `${Math.ceil((24 * count * w) / cw)}px` } : undefined}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              y1={yOf(tick)}
              x2={pad.left + cw}
              y2={yOf(tick)}
              className="stroke-line"
              strokeWidth="1"
              strokeDasharray={GRID_DASH}
            />
            <line
              x1={pad.left - TICK_LENGTH}
              y1={yOf(tick)}
              x2={pad.left}
              y2={yOf(tick)}
              className="stroke-line-strong"
              strokeWidth="1"
            />
            <text
              x={pad.left - TICK_LENGTH - 3}
              y={yOf(tick) + 3}
              textAnchor="end"
              className="fill-fg-subtle"
              fontSize="10"
            >
              {tick}
            </text>
          </g>
        ))}
        {metric.points.map(
          (point, index) =>
            labelled.has(index) && (
              <g key={`grid-${point.date}`}>
                <line
                  x1={xOf(index)}
                  y1={pad.top}
                  x2={xOf(index)}
                  y2={baseline}
                  className="stroke-line"
                  strokeWidth="1"
                  strokeDasharray={GRID_DASH}
                />
                <line
                  x1={xOf(index)}
                  y1={baseline}
                  x2={xOf(index)}
                  y2={baseline + TICK_LENGTH}
                  className="stroke-line-strong"
                  strokeWidth="1"
                />
              </g>
            )
        )}
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={baseline}
          className="stroke-line-strong"
          strokeWidth="1"
        />
        <line
          x1={pad.left}
          y1={baseline}
          x2={pad.left + cw}
          y2={baseline}
          className="stroke-line-strong"
          strokeWidth="1"
        />
        {kind === 'line' && path && (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {metric.points.map((point, index) => {
          const x = xOf(index);
          const link = point.value === null ? undefined : pointLinks?.[point.date];
          return (
            <g key={point.date}>
              {point.value === null ? (
                <>
                  <title>{`${dayText(point)}: ${missingText.toLowerCase()}`}</title>
                  <line
                    data-point="missing"
                    x1={kind === 'bar' ? x - (slot * BAR_WIDTH_SHARE) / 2 : x}
                    y1={kind === 'bar' ? baseline : pad.top}
                    x2={kind === 'bar' ? x + (slot * BAR_WIDTH_SHARE) / 2 : x}
                    y2={baseline}
                    className="stroke-fg-subtle"
                    strokeWidth="1.5"
                    strokeDasharray={GRID_DASH}
                  />
                </>
              ) : kind === 'bar' ? (
                <>
                  <title>{`${dayText(point)}: ${unitText(metric, point.value)}`}</title>
                  <rect
                    data-point="measured"
                    x={x - (slot * BAR_WIDTH_SHARE) / 2}
                    y={baseline - barHeight(point.value, top, ch)}
                    width={slot * BAR_WIDTH_SHARE}
                    height={barHeight(point.value, top, ch)}
                    fill={point.partial ? undefined : color}
                    className={point.partial ? 'fill-surface' : undefined}
                    stroke={point.partial ? color : undefined}
                    strokeWidth={point.partial ? 1.5 : undefined}
                    rx="2"
                  />
                </>
              ) : (
                <>
                  <title>{`${dayText(point)}: ${unitText(metric, point.value)}`}</title>
                  <circle
                    data-point="measured"
                    cx={x}
                    cy={yOf(point.value)}
                    r="3"
                    fill={point.partial ? undefined : color}
                    className={point.partial ? 'fill-surface' : undefined}
                    stroke={point.partial ? color : undefined}
                    strokeWidth={point.partial ? 1.5 : undefined}
                  />
                </>
              )}
              {labelled.has(index) && (
                <text
                  x={x}
                  y={baseline + TICK_LENGTH + 12}
                  textAnchor="middle"
                  className="fill-fg-subtle"
                  fontSize="10"
                >
                  {axisDay(point.date)}
                </text>
              )}
              {link && (
                <Link to={link.href} aria-label={link.label} className="group outline-none">
                  <rect
                    x={x - slot / 2}
                    y={pad.top}
                    width={slot}
                    height={ch}
                    fill="transparent"
                    className="cursor-pointer group-focus-visible:stroke-fg group-hover:stroke-fg-subtle"
                    strokeWidth="2"
                  />
                </Link>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** A zero is a thin line and any other value at least a few pixels, so a bar is never invisible. */
function barHeight(value: number, top: number, chartHeight: number): number {
  if (value === 0) return ZERO_BAR_HEIGHT;
  return Math.max(MIN_BAR_HEIGHT, (value / top) * chartHeight);
}
