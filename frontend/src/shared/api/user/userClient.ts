import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '../client/api';
import type {
  ChangePasswordRequest,
  MyProfile,
  UpdateProfileRequest,
  UserProfile,
} from './user.dto';

export const userService = {
  getProfile: (username: string): Promise<UserProfile> =>
    apiClient.get<UserProfile>(`/users/${username}`),

  getMyProfile: (config?: AxiosRequestConfig): Promise<MyProfile> =>
    apiClient.get<MyProfile>('/users/me', config),

  updateMyProfile: (data: UpdateProfileRequest, config?: AxiosRequestConfig): Promise<MyProfile> =>
    apiClient.patch<MyProfile>('/users/me', data, config),

  changePassword: (data: ChangePasswordRequest, config?: AxiosRequestConfig): Promise<void> =>
    apiClient.post<void>('/users/me/password', data, config),
};
