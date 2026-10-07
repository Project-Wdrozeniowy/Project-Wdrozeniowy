import axios from 'axios';
import type { ProblemDetail } from '@/shared/types';

/** HTTP status of a failed API call, or `undefined` for network errors and non-HTTP errors. */
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** The message to show for a failed API call: the server's ProblemDetail `detail`, or `fallback`. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ProblemDetail>(error)) {
    return error.response?.data?.detail ?? fallback;
  }
  return fallback;
}
