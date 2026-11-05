import axios from 'axios';

/** HTTP status of a failed API call, or `undefined` for network errors and non-HTTP errors. */
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** The message to show for a failed API call: the server's ProblemDetail `detail`, or `fallback`. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<unknown>(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') {
      return data.detail;
    }
  }
  return fallback;
}
