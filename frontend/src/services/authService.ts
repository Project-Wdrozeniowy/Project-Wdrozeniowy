import { apiClient } from './api';
import type {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
} from '../types';

export const authService = {
  register: (data: RegisterRequest): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/login', data),

  refresh: (data: RefreshRequest): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/refresh', data),

  logout: (data: LogoutRequest): Promise<void> => apiClient.post<void>('/auth/logout', data),
};
