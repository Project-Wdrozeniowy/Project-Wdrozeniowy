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
