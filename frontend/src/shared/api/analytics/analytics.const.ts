import type { GetPublicActivityPeriod } from '@/shared/api/generated/models/getPublicActivityPeriod.dto';

/** The windows the public analytics endpoints offer (`7d` and `30d` for all of them). */
export const ANALYTICS_PERIODS = [
  '7d',
  '30d',
] as const satisfies readonly GetPublicActivityPeriod[];
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];
export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = '7d';

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

/** The figures change slowly and the sidebar shows them on every page: do not ask again at once. */
export const ANALYTICS_STALE_MS = 60_000;

/** How many posts the "top posts" list asks for. */
export const TOP_POSTS_LIMIT = 5;

/** The pages show their own fixed states, so the global toast must not print server text. */
export const ANALYTICS_REQUEST = { skipErrorToast: true } as const;
