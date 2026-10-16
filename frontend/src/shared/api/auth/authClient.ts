import { apiClient } from '../client/api';
import { userService } from '../user/userClient';
import { tokenMemory } from '@/shared/auth/tokenMemory';
import type { AuthResponse, LoginRequest, RegisterRequest } from './auth.dto';
import type { UserProfile } from '@/shared/api/user/user.dto';

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
  loadProfile: async (accessToken: string): Promise<UserProfile> => {
    tokenMemory.set(accessToken);
    try {
      return await userService.getMyProfile();
    } catch (error) {
      // PWDRZ-155: a failed bootstrap must not leave a guest sending this token.
      // A newer session may have replaced it while the profile request was pending.
      if (tokenMemory.get() === accessToken) tokenMemory.set(null);
      throw error;
    }
  },
};
