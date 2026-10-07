import { apiClient } from './api';
import { userService } from './userService';
import { tokenMemory } from '@/lib/tokenMemory';
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '@/shared/types';

export const authService = {
  register: (data: RegisterRequest): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/login', data),

  /**
   * Revokes the session server-side. The refresh token is an httpOnly cookie, so the
   * browser sends it automatically and the server clears it in the response.
   */
  logout: (): Promise<void> => apiClient.post<void>('/auth/logout'),

  /**
   * Makes `accessToken` the active token and loads the signed-in user's profile.
   * The token is set first because the profile request is authenticated with it.
   */
  loadProfile: (accessToken: string): Promise<UserProfile> => {
    tokenMemory.set(accessToken);
    return userService.getMyProfile();
  },
};
