import { apiErrorStatus } from '@/shared/api/client/apiError';

export function insightsError(error: unknown): string {
  switch (apiErrorStatus(error)) {
    case 401:
      return 'Your session ended. Sign in again to see author insights.';
    case 403:
      return 'These insights are not available to your account.';
    case 404:
      return 'These insights are no longer available. The post may have changed.';
    case 429:
      return 'Too many requests. Wait a moment, then try again.';
    default:
      return 'Insights could not be loaded. Please try again.';
  }
}

export function collectionDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export const insightsNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

const DAY_FORMAT = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const;

function utcDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** "Nov 12–18, 2026", "Feb 7–Mar 8, 2026" or "Dec 28, 2025–Jan 3, 2026" for two UTC days. */
export function dayRange(first: string, last: string): string {
  const from = utcDate(first);
  const to = utcDate(last);
  const day = (date: Date) => new Intl.DateTimeFormat('en-US', DAY_FORMAT).format(date);
  const year = (date: Date) => date.getUTCFullYear();
  if (year(from) !== year(to)) return `${day(from)}, ${year(from)}–${day(to)}, ${year(to)}`;
  if (from.getUTCMonth() !== to.getUTCMonth()) return `${day(from)}–${day(to)}, ${year(to)}`;
  return `${day(from)}–${to.getUTCDate()}, ${year(to)}`;
}

/** "14:30" in UTC for an instant. */
export function utcTime(instant: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(new Date(instant));
}

/** The UTC day of an instant, as `YYYY-MM-DD`. */
export function utcDay(instant: string): string {
  return new Date(instant).toISOString().slice(0, 10);
}
