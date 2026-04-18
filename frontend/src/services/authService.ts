import { apiClient } from './api';
import type { AuthResponse, ApiResponse } from '@/types';
import type { LoginFormData, RegisterFormData } from '@/lib/validations/auth';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
// Lightweight session cookie (non-httpOnly) read by proxy for redirect decisions.
// The actual JWT is kept in localStorage; this cookie only signals "logged in".
const SESSION_COOKIE = 'orbita_session';

function setSessionCookie(value: string): void {
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; SameSite=Lax`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export const tokenStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setTokens: (token: string, refreshToken?: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      setSessionCookie('1');
    } catch {
      // ignore storage errors (e.g. privacy mode)
    }
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      clearSessionCookie();
    } catch {
      // ignore storage errors
    }
  },
};

export const authService = {
  login: (data: LoginFormData): Promise<ApiResponse<AuthResponse>> =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data),

  register: (
    data: Omit<RegisterFormData, 'confirmPassword' | 'terms'>,
  ): Promise<ApiResponse<AuthResponse>> =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data),

  refresh: (refreshToken: string): Promise<ApiResponse<AuthResponse>> =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }),

  logout: (): Promise<ApiResponse<null>> =>
    apiClient.post<ApiResponse<null>>('/auth/logout'),
};
