import { apiClient } from './api';
import type {
  ChangePasswordRequest,
  MyProfile,
  UpdateProfileRequest,
  UserProfile,
} from '@/shared/types';

export const userService = {
  getProfile: (username: string): Promise<UserProfile> =>
    apiClient.get<UserProfile>(`/users/${username}`),

  getMyProfile: (): Promise<MyProfile> => apiClient.get<MyProfile>('/users/me'),

  updateMyProfile: (data: UpdateProfileRequest): Promise<MyProfile> =>
    apiClient.patch<MyProfile>('/users/me', data),

  changePassword: (data: ChangePasswordRequest): Promise<void> =>
    apiClient.post<void>('/users/me/password', data),
};
