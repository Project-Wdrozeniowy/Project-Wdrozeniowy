import { apiClient } from './api';
import type { UserProfile, UpdateProfileRequest } from '@/shared/types';

export const userService = {
  getProfile: (username: string): Promise<UserProfile> =>
    apiClient.get<UserProfile>(`/users/${username}`),

  getMyProfile: (): Promise<UserProfile> => apiClient.get<UserProfile>('/users/me'),

  updateMyProfile: (data: UpdateProfileRequest): Promise<UserProfile> =>
    apiClient.patch<UserProfile>('/users/me', data),
};
