import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import axios from 'axios';
import { tokenMemory } from '@/shared/auth/tokenMemory';
import { API_ERROR_TOAST_ID, toast } from '@/shared/lib/toast';
import type { AuthResponse } from '@/shared/api/generated/models/authResponse.dto';
import { apiErrorMessage } from './apiError';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Skip the global error toast. Use it when the caller shows its own message,
     * so server error text never reaches the screen through the toast.
     */
    skipErrorToast?: boolean;
  }
}

type RequestBody = object | FormData | null;

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

class ApiClient {
  private client: AxiosInstance;
  private refreshing: Promise<string> | null = null;

  constructor() {
    // Same-origin in production; Vite forwards this prefix to the gateway in development.
    const baseURL = '/api';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      // Sends and stores the httpOnly refresh cookie on cross-origin gateway calls.
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = tokenMemory.get();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<unknown>) => {
        if (axios.isCancel(error)) return Promise.reject(error);
        if (typeof window === 'undefined') {
          return Promise.reject(error);
        }
        const config = error.config as RetriableRequestConfig | undefined;
        const status = error.response?.status;
        // /auth endpoints return expected 401s (bad credentials, no session) that callers handle.
        const isAuthEndpoint = config?.url?.startsWith('/auth/') ?? false;

        if (status === 401 && config && !isAuthEndpoint) {
          if (config._retried) {
            // Even a freshly refreshed token was rejected: the session is gone.
            this.endSession();
            return Promise.reject(error);
          }
          // The access token expired: get a new one from the refresh cookie and repeat once.
          config._retried = true;
          let token: string;
          try {
            token = await this.refreshAccessToken();
          } catch {
            this.endSession();
            return Promise.reject(error);
          }
          config.headers.Authorization = `Bearer ${token}`;
          // Errors of the repeated request (403, 5xx, ...) reach the caller as they are.
          return this.client.request(config);
        }

        if (!config?.skipErrorToast && (status === undefined || status >= 500)) {
          // 4xx errors are handled by the caller (form errors etc.); only unexpected failures toast.
          toast.error(apiErrorMessage(error, FALLBACK_ERROR_MESSAGE), API_ERROR_TOAST_ID);
        }
        return Promise.reject(error);
      }
    );
  }

  /** Drops the in-memory access token and sends the user to the login page. */
  private endSession() {
    tokenMemory.set(null);
    window.location.href = '/login';
  }

  /**
   * Exchanges the httpOnly refresh cookie for a new access token and stores it in memory.
   * Concurrent callers share one request: the server rotates the cookie on every call.
   */
  public refreshAccessToken(): Promise<string> {
    this.refreshing ??= this.client
      .post<AuthResponse>('/auth/refresh')
      .then((response) => {
        tokenMemory.set(response.data.accessToken);
        return response.data.accessToken;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  /** Entry point for generated operations; all interceptors remain shared. */
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    // Axios may represent a real empty 204 response as an empty string.
    return response.status === 204 ? (undefined as T) : response.data;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: RequestBody, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
