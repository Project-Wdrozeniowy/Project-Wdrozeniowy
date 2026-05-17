import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axios from 'axios';
import { toast } from '@/lib/toast';

type RequestBody = Record<string, unknown> | FormData | null;

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

    // Server-side in development: hit the local gateway directly
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
          const token = localStorage.getItem('token');
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
      (error: AxiosError<{ message?: string }>) => {
        if (typeof window !== 'undefined') {
          if (error.response?.status === 401) {
            window.location.href = '/login';
          } else if (!error.response || error.response.status >= 500) {
            const message =
              error.response?.data?.message ?? 'Something went wrong. Please try again.';
            toast.error(message);
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
