import type { AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';

export const TREND_TITLE = 'Daily openings';
export const TREND_WINDOW_LABEL = 'Time window';

export const TREND_WINDOW_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];
