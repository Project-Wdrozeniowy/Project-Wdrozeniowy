import type { AxiosError, AxiosRequestConfig } from 'axios';
import { apiClient } from './api';

/** Generated operations own the route, method, parameters and payload. */
export type ApiRequestOptions = Pick<
  AxiosRequestConfig,
  'signal' | 'headers' | 'timeout' | 'skipErrorToast' | 'skipUnauthorizedHandler'
>;

export function orvalTransport<T>(
  config: AxiosRequestConfig,
  options?: ApiRequestOptions
): Promise<T> {
  return apiClient.request<T>({ ...config, ...options });
}

// Backend ProblemDetail, gateway failures and network errors have different shapes.
// Consumers must narrow response data before reading fields.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required generic interface of Orval mutators.
export type ErrorType<ContractError> = AxiosError<unknown>;
export type BodyType<T> = T;
