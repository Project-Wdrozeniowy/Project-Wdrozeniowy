import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axios from 'axios';
import { sessionEvents } from '@/shared/auth/sessionEvents';
import { API_ERROR_TOAST_ID, toast } from '@/shared/lib/toast';
import { apiErrorMessage } from './apiError';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    sessionGeneration?: number;
  }
}

type RequestBody = object | FormData | null;
interface Csrf {
  token: string;
  headerName: string;
}
const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

class ApiClient {
  private client: AxiosInstance;
  private csrf: { generation: number; value: Promise<Csrf> } | null = null;
  private onUnauthorized: (() => void) | undefined;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      // Body budget (10s) + upstream budget (25s), with room to receive the Gateway error.
      timeout: 40000,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    this.client.interceptors.request.use(async (config) => {
      config.sessionGeneration ??= sessionEvents.current();
      const method = config.method?.toUpperCase() ?? 'GET';
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const csrf = await this.csrfToken();
        if (config.sessionGeneration !== sessionEvents.current())
          throw new axios.CanceledError('Session changed');
        config.headers.set(csrf.headerName, csrf.token);
      }
      return config;
    });
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if (response.config.sessionGeneration !== sessionEvents.current())
          throw new axios.CanceledError('Session changed');
        return response;
      },
      (error: AxiosError<unknown>) => {
        const config = error.config;
        if (
          axios.isCancel(error) ||
          (config?.sessionGeneration !== undefined &&
            config.sessionGeneration !== sessionEvents.current())
        ) {
          return Promise.reject(new axios.CanceledError('Session changed'));
        }
        const status = error.response?.status;
        if (status === 401 && !config?.url?.startsWith('/auth/')) this.onUnauthorized?.();
        if (status === 403) this.csrf = null; // next user action can bootstrap; this mutation is never replayed
        if (!config?.skipErrorToast && (status === undefined || status >= 500)) {
          toast.error(apiErrorMessage(error, FALLBACK_ERROR_MESSAGE), API_ERROR_TOAST_ID);
        }
        return Promise.reject(error);
      }
    );
  }

  public setUnauthorizedHandler(handler: (() => void) | undefined) {
    this.onUnauthorized = handler;
  }
  public clearCsrf() {
    this.csrf = null;
  }

  public csrfToken(): Promise<Csrf> {
    const generation = sessionEvents.current();
    if (!this.csrf || this.csrf.generation !== generation) {
      const value = this.request<Csrf>({ url: '/auth/csrf', method: 'GET', skipErrorToast: true });
      const pending = { generation, value };
      this.csrf = pending;
      void value.catch(() => {
        if (this.csrf === pending) this.csrf = null;
      });
    }
    return this.csrf.value;
  }

  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.status === 204 ? (undefined as T) : response.data;
  }
  public get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'GET' });
  }
  public post<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'POST', data });
  }
  public put<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'PUT', data });
  }
  public patch<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'PATCH', data });
  }
  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request({ ...config, url, method: 'DELETE' });
  }
}
export const apiClient = new ApiClient();
