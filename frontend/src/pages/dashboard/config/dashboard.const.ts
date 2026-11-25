export const DASHBOARD_TITLE = 'Analytics Dashboard';
export const DASHBOARD_SUBTITLE = 'Public activity of the community, from the platform data.';
export const PERIOD_SWITCH_LABEL = 'Time window';

export const ACTIVITY_CHART_TITLE = 'Posts and comments by day';
export const ACTIVITY_CHART_DESCRIPTION = 'Public posts and comments per UTC day.';
export const NO_ACTIVITY_TEXT = 'No public posts or comments in this window yet.';
export const NO_TOP_POSTS_TEXT = 'No post has had activity in this window yet.';
export const NO_EARLIER_DATA_TEXT = 'No earlier data to compare';
export const UNAVAILABLE_TEXT = 'Not available';

/** Colours of the line and bar charts (the chart text and grid follow the theme). */
export const CHART_COLORS = {
  posts: '#2563eb',
  comments: '#10b981',
} as const;

export const NO_CATEGORY_LABEL = 'No category';
export const CATEGORY_CHART_TITLE = 'Posts by category';
export const NO_CATEGORY_POSTS_TEXT = 'No public posts in this window yet.';

/** Said beside every figure that includes the current UTC day: it is read at one moment, not live. */
export const TODAY_MAY_GROW_TEXT = 'Counts for today may grow.';
/** The fixed words of a failed background refresh; the last loaded values stay on screen. */
export const REFRESH_FAILED_SUFFIX = 'Showing the last loaded data.';
