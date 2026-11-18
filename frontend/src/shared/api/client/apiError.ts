import axios from 'axios';

/** HTTP status of a failed API call, or `undefined` for network errors and non-HTTP errors. */
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** CSRF bootstrap and the profile read can fail inside the same form submission. */
export function authPostStatus(
  error: unknown,
  operation: 'login' | 'register'
): number | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const request = error.config;
  if (request?.method !== 'post' || request.url !== `/auth/${operation}`) return undefined;
  return error.response?.status;
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
