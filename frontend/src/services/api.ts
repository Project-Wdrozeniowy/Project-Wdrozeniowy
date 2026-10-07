import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axios from 'axios';
import type { ProblemDetail } from '@/shared/types';
import { toast } from '@/lib/toast';

type RequestBody = object | FormData | null;

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';
// A fixed id makes sonner replace the toast instead of stacking one per failed request.
const API_ERROR_TOAST_ID = 'api-error';

class ApiClient {
  private client: AxiosInstance;

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
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('accessToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError<ProblemDetail>) => {
        if (typeof window !== 'undefined') {
          const status = error.response?.status;
          // /auth endpoints return expected 401s (bad credentials, no session) that callers handle.
          const isAuthEndpoint = error.config?.url?.startsWith('/auth/');

          if (status === 401 && !isAuthEndpoint) {
            window.location.href = '/login';
          } else if (status === undefined || status >= 500) {
            // 4xx errors are handled by the caller (form errors etc.); only unexpected failures toast.
            toast.error(error.response?.data?.detail ?? FALLBACK_ERROR_MESSAGE, API_ERROR_TOAST_ID);
          }
        }
        return Promise.reject(error);
      }
    );
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
