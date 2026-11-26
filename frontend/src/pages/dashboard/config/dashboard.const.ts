export const DASHBOARD_TITLE = 'Analytics Dashboard';
export const DASHBOARD_SUBTITLE = 'Public activity of the community, from the platform data.';
export const PERIOD_SWITCH_LABEL = 'Time window';

export const ACTIVITY_CHART_TITLE = 'Posts and comments by day';
export const ACTIVITY_CHART_DESCRIPTION = 'Public posts and comments per UTC day.';
export const NO_ACTIVITY_TEXT = 'No public posts or comments in this window yet.';
export const TOP_POSTS_TITLE = 'Most active posts';
export const NO_TOP_POSTS_TEXT = 'No post has had activity in this window yet.';
/** The trending window is the span before the request, not whole UTC days like the charts. */
export const TOP_POSTS_WINDOW_HOURS = { '7d': 168, '30d': 720 } as const;
/** What each kind of activity adds to a post's score, from the trending-posts contract. */
export const TOP_POSTS_WEIGHTS = { opening: 1, vote: 2, comment: 3 } as const;
export const TOP_POSTS_FORMULA = `openings + ${TOP_POSTS_WEIGHTS.vote} × votes + ${TOP_POSTS_WEIGHTS.comment} × comments`;
export const TOP_POSTS_TOTALS_NOTE = 'Numbers under each title are totals over all time.';
export const TOP_POSTS_RULES_SUMMARY = 'How posts are ranked';
/** What the ranking counts, from the trending-posts contract; each line is one rule. */
export const TOP_POSTS_RULES = [
  `Each opening of a post counts ${TOP_POSTS_WEIGHTS.opening}, each vote cast on it (up or down) counts ${TOP_POSTS_WEIGHTS.vote} and each visible comment counts ${TOP_POSTS_WEIGHTS.comment}, all made inside the window.`,
  'The window is the span before the page asked, not whole UTC days like the charts.',
  'Posts with the same score are ordered by the higher vote score, then the more recent activity, then the newer post.',
  'Only published or locked posts with some activity in the window are listed, so there can be fewer than {limit}.',
  'The score itself is not published, and the numbers under each title are not the score.',
] as const;
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
