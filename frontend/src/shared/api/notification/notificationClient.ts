// PROVISIONAL (PWDRZ-144/152): backend is a 501 stub; no live notification-center contract is certified here.
import { apiClient } from '../client/api';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import type { Notification } from './notification.dto';

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
