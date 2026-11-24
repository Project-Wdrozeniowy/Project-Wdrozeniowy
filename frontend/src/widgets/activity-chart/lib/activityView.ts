import {
  MAX_AXIS_LABELS,
  MAX_Y_INTERVALS,
  PARTIAL_DAY_TEXT,
} from '@/widgets/activity-chart/config/activityChart.const';

/** One UTC day. `null` is "no value" (not collected); `0` is a measured zero. */
export interface ActivityPoint {
  /** The UTC day, `YYYY-MM-DD`. */
  date: string;
  value: number | null;
  /** The day is not over yet (today): its value can still grow. */
  partial?: boolean;
}

/** One thing that is counted per day: posts, comments, openings. */
export interface ActivityMetric {
  id: string;
  /** Plural noun as shown: "Posts". */
  name: string;
  /** What one value counts: `{ one: 'post', other: 'posts' }`. */
  unit: { one: string; other: string };
  /** Oldest day first, one point per day of the window. Empty while there is nothing to show. */
  points: ActivityPoint[];
  color?: string;
}

function parseDay(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "Nov 17": the label under the chart. Anything that is not a day is shown as it is. */
export function axisDay(date: string): string {
  const parsed = parseDay(date);
  if (!parsed) return date;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** "Nov 17, 2026": the day in the table and in the text alternative. */
export function fullDay(date: string): string {
  const parsed = parseDay(date);
  if (!parsed) return date;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Which days get a label under the chart. Up to `MAX_AXIS_LABELS` days all do; for more, every
 * n-th day counted back from the last, so the last day is never left out.
 */
export function axisLabelIndexes(count: number): Set<number> {
  const step = Math.max(1, Math.ceil(count / MAX_AXIS_LABELS));
  const indexes = new Set<number>();
  for (let i = count - 1; i >= 0; i -= step) indexes.add(i);
  return indexes;
}

/** "Nov 17, 2026", and "Nov 17, 2026 (today, partial)" for a day that is not over yet. */
export function dayText(point: ActivityPoint): string {
  return point.partial ? `${fullDay(point.date)} (${PARTIAL_DAY_TEXT})` : fullDay(point.date);
}

export function unitText(metric: ActivityMetric, value: number): string {
  return `${value} ${value === 1 ? metric.unit.one : metric.unit.other}`;
}

/** The measured values only; a missing day is not a value. */
export function measuredValues(points: ActivityPoint[]): number[] {
  return points.flatMap((point) => (point.value === null ? [] : [point.value]));
}

/** True when some day is not over yet. */
export function hasPartialDay(points: ActivityPoint[]): boolean {
  return points.some((point) => point.partial);
}

/** True when some day has no value. */
export function hasMissingDay(points: ActivityPoint[]): boolean {
  return points.some((point) => point.value === null);
}

/** The caption of the graph and the table: what is counted, over which window, in which zone. */
export function seriesTitle(metric: ActivityMetric, periodLabel: string): string {
  return `${metric.name} per day, ${periodLabel}, UTC`;
}

/** The graph in words, from the same points the table lists: "Posts per day, …. Nov 17, 2026: 3". */
export function chartSummary(
  metric: ActivityMetric,
  periodLabel: string,
  missingText: string
): string {
  const days = metric.points.map(
    (point) =>
      `${dayText(point)}: ${point.value === null ? missingText.toLowerCase() : unitText(metric, point.value)}`
  );
  return `${seriesTitle(metric, periodLabel)}. ${days.join(', ')}`;
}

/**
 * The vertical axis: whole-number steps from 0 to a top that holds the largest value, with at most
 * `MAX_Y_INTERVALS` intervals ("0, 50, 100, 150, 200"). Counts are whole numbers, so is the step.
 */
export function yAxis(max: number): { top: number; ticks: number[] } {
  const largest = Math.max(1, Math.ceil(max));
  // The steps go 1, 2, 5, 10, 20, 50, 100, ...
  let step = 1;
  while (Math.ceil(largest / step) > MAX_Y_INTERVALS) {
    step = String(step).startsWith('2') ? step * 2.5 : step * 2;
  }
  const top = Math.ceil(largest / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, index) => index * step) };
}

interface Coordinates {
  x: number;
  y: number;
}

/**
 * A smooth path through the points that never goes above the higher or below the lower of two
 * neighbours (monotone cubic), so the curve invents no peak or dip between days. The points must
 * have increasing x. Used for a run of days that all have a value.
 */
export function monotonePath(points: Coordinates[]): string {
  const count = points.length;
  const at = (point: Coordinates) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  if (count === 0) return '';
  if (count === 1) return `M${at(points[0])}`;

  const widths = points.slice(1).map((point, i) => point.x - points[i].x);
  const slopes = points.slice(1).map((point, i) => (point.y - points[i].y) / widths[i]);
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === count - 1) return slopes[count - 2];
    return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  });
  slopes.forEach((slope, i) => {
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      return;
    }
    const a = tangents[i] / slope;
    const b = tangents[i + 1] / slope;
    const size = a * a + b * b;
    if (size > 9) {
      const scale = 3 / Math.sqrt(size);
      tangents[i] = scale * a * slope;
      tangents[i + 1] = scale * b * slope;
    }
  });

  const segments = widths.map((width, i) => {
    const from = points[i];
    const to = points[i + 1];
    const first = { x: from.x + width / 3, y: from.y + (tangents[i] * width) / 3 };
    const second = { x: to.x - width / 3, y: to.y - (tangents[i + 1] * width) / 3 };
    return `C${at(first)} ${at(second)} ${at(to)}`;
  });
  return `M${at(points[0])} ${segments.join(' ')}`;
}
