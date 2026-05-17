import { apiClient } from './api';
import type { AuthResponse } from '@/shared/types';
import type { LoginFormData, RegisterFormData } from '@/lib/validations/auth';

export const authService = {
  login: (data: LoginFormData): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/login', data),

  register: (data: Omit<RegisterFormData, 'confirmPassword' | 'terms'>): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/register', data),

  /**
   * Exchanges the httpOnly refresh cookie for a new access token.
   * No request body needed — the cookie is sent automatically by the browser.
   */
  refresh: (): Promise<AuthResponse> => apiClient.post<AuthResponse>('/auth/refresh'),

  /**
   * Restores the session on page load using the httpOnly refresh cookie.
   * Returns the current user and a fresh access token.
   */
  me: (): Promise<AuthResponse> => apiClient.get<AuthResponse>('/auth/me'),

  /**
   * Logs out — the server invalidates the refresh token and clears the cookie.
   */
  logout: (): Promise<void> => apiClient.post<void>('/auth/logout'),
};
