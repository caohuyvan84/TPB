import { apiClient } from '../api-client';

export const notificationsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    apiClient.get('/api/v1/notifications', { params }),
  
  getUnreadCount: () =>
    apiClient.get('/api/v1/notifications/unread-count'),
  
  updateState: (id: string, state: string) =>
    apiClient.patch(`/api/v1/notifications/${id}/state`, { state }),
  
  markAllRead: () =>
    apiClient.post('/api/v1/notifications/mark-all-read'),
};
