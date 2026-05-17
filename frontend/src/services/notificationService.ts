import { apiClient } from './api';
import type { Notification, PagedResponse } from '../types';

export interface ListNotificationsParams {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
}

export const notificationService = {
  list: (params: ListNotificationsParams = {}): Promise<PagedResponse<Notification>> =>
    apiClient.get<PagedResponse<Notification>>('/notifications', { params }),

  markRead: (id: number): Promise<Notification> =>
    apiClient.patch<Notification>(`/notifications/${id}/read`, null),

  markAllRead: (): Promise<void> => apiClient.patch<void>('/notifications/read-all', null),

  delete: (id: number): Promise<void> => apiClient.delete<void>(`/notifications/${id}`),
};
