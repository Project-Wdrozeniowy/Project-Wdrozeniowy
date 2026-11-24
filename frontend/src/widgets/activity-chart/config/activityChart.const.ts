/** What the table says for a day that has no value: not collected, as opposed to a measured `0`. */
export const MISSING_VALUE_TEXT = 'Not measured';

export const METRIC_GROUP_LABEL = 'Metric';
/** Said for a day that is not over yet, in the table, the legend and the text alternative. */
export const PARTIAL_DAY_TEXT = 'today, partial';
export const MISSING_NOTE_TITLE = 'Not measured';
export const TABLE_TOGGLE_LABEL = 'Data table';
export const DATE_COLUMN_LABEL = 'Date (UTC)';
export const UTC_NOTE = 'Days are UTC days.';
export const CHART_LOADING_LABEL = 'Loading chart';
export const NOTHING_MEASURED_TEXT = 'Nothing was measured in this period.';

export const DEFAULT_CHART_COLOR = '#2563eb';

/** The most day labels drawn under the chart; the last day always has one. */
export const MAX_AXIS_LABELS = 7;

/** Geometry of the chart in its own coordinates; the SVG scales to the width of its card. */
export const CHART_SIZE = { width: 420, height: 200 } as const;
export const CHART_PADDING = { top: 16, right: 16, bottom: 32, left: 36 } as const;

/** The look of the graph: a line of dots, or one bar per day. Both read the same points. */
export const CHART_KINDS = ['line', 'bar'] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

/** Share of a day's slot a bar fills, and the heights that keep a zero and a small bar visible. */
export const BAR_WIDTH_SHARE = 0.6;
export const ZERO_BAR_HEIGHT = 2;
export const MIN_BAR_HEIGHT = 4;

/** At most this many intervals between the labelled values on the vertical axis. */
export const MAX_Y_INTERVALS = 5;

/** Dashes of the grid and of the mark for a day with no value, as in the dashboard frames. */
export const GRID_DASH = '3 3';
export const TICK_LENGTH = 4;
