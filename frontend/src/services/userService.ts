import type { AxiosRequestConfig } from 'axios';
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

  getMyProfile: (config?: AxiosRequestConfig): Promise<MyProfile> =>
    apiClient.get<MyProfile>('/users/me', config),

  updateMyProfile: (data: UpdateProfileRequest, config?: AxiosRequestConfig): Promise<MyProfile> =>
    apiClient.patch<MyProfile>('/users/me', data, config),

  changePassword: (data: ChangePasswordRequest): Promise<void> =>
    apiClient.post<void>('/users/me/password', data),
};
