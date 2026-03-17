import { apiClient } from './api-client';

export interface Notification {
  id: string;
  type: 'call' | 'chat' | 'ticket' | 'sla' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  state: 'new' | 'viewed' | 'actioned' | 'dismissed';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  autoHideSeconds?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsParams {
  state?: 'new' | 'viewed' | 'actioned' | 'dismissed';
  type?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface GetNotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateNotificationStateRequest {
  state: 'viewed' | 'actioned' | 'dismissed';
}

export const notificationsApi = {
  getAll: async (params?: GetNotificationsParams): Promise<GetNotificationsResponse> => {
    const { data } = await apiClient.get('/notifications', { params });
    return data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.get('/notifications/unread-count');
    return data;
  },

  updateState: async (id: string, request: UpdateNotificationStateRequest): Promise<Notification> => {
    const { data } = await apiClient.patch(`/notifications/${id}/state`, request);
    return data;
  },

  markAllRead: async (): Promise<{ updated: number }> => {
    const { data } = await apiClient.post('/notifications/mark-all-read');
    return data;
  },
};
