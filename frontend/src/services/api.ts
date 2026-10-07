import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import axios from 'axios';
import { tokenMemory } from '@/lib/tokenMemory';
import type { AuthResponse } from '@/shared/types';

type RequestBody = object | FormData | null;

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean };

class ApiClient {
  private client: AxiosInstance;
  private refreshing: Promise<string> | null = null;

  private static resolveBaseURL(): string {
    const envURL = process.env.NEXT_PUBLIC_API_URL;
    if (envURL) return envURL;

    // Client-side: relative URL is fine — the browser resolves it against the origin
    if (typeof window !== 'undefined') return '/api';

    // Server-side in production: env var is required (relative URLs are invalid in Node.js)
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_API_URL must be set in production');
    }

    return 'http://localhost:3000/api';
  }

  constructor() {
    const baseURL = ApiClient.resolveBaseURL();
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
      async (error: AxiosError) => {
        const config = error.config as RetriableRequestConfig | undefined;
        // /auth endpoints return expected 401s (bad credentials, no session) that callers handle.
        const isAuthEndpoint = config?.url?.startsWith('/auth');

        if (
          error.response?.status === 401 &&
          config &&
          !config._retried &&
          !isAuthEndpoint &&
          typeof window !== 'undefined'
        ) {
          config._retried = true;
          try {
            const token = await this.refreshAccessToken();
            config.headers.Authorization = `Bearer ${token}`;
            return await this.client.request(config);
          } catch {
            tokenMemory.set(null);
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
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
