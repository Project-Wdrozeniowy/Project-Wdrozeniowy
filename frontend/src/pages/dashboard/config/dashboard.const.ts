export const DASHBOARD_TITLE = 'Analytics Dashboard';
export const DASHBOARD_SUBTITLE = 'Public activity of the community, from the platform data.';
export const PERIOD_SWITCH_LABEL = 'Time window';

export const ACTIVITY_CHART_TITLE = 'Activity per day';
export const ACTIVITY_CHART_DESCRIPTION = 'Public posts and comments per UTC day.';
export const NO_ACTIVITY_TEXT = 'No public posts or comments in this window yet.';
export const NO_TOP_POSTS_TEXT = 'No post has had activity in this window yet.';
export const NO_EARLIER_DATA_TEXT = 'No earlier data to compare';
export const UNAVAILABLE_TEXT = 'Not available';

/** Colours of the line and bar charts (the chart text and grid follow the theme). */
export const CHART_COLORS = {
  posts: '#2563eb',
  comments: '#10b981',
  categories: '#8b5cf6',
} as const;

/** The most category bars shown; the chart stays readable and the server order is kept. Any
 * further categories are added up in one "Other" bar. */
export const MAX_CATEGORY_BARS = 8;
export const NO_CATEGORY_LABEL = 'No category';
export const OTHER_CATEGORIES_LABEL = 'Other';
