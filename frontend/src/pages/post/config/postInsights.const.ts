import type { AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';

export const TREND_TITLE = 'Daily openings';
export const TREND_WINDOW_LABEL = 'Time window';
export const TREND_EMPTY_TEXT = 'No days to show for this window.';
export const TREND_REFRESH_ERROR_TEXT =
  'The daily openings could not be refreshed. What you see may be out of date.';

export const TREND_WINDOW_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];
