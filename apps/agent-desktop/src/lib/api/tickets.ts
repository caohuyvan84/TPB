import { apiClient } from '../api-client';

export const ticketsApi = {
  list: (params?: { status?: string; priority?: string; limit?: number }) =>
    apiClient.get('/api/v1/tickets', { params }),
  
  getById: (id: string) =>
    apiClient.get(`/api/v1/tickets/${id}`),
  
  create: (data: {
    title: string;
    description: string;
    priority: string;
    category?: string;
    customerId: string;
    interactionId?: string;
  }) =>
    apiClient.post('/api/v1/tickets', data),
  
  update: (id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    assignedAgentId: string;
  }>) =>
    apiClient.patch(`/api/v1/tickets/${id}`, data),
  
  getComments: (id: string) =>
    apiClient.get(`/api/v1/tickets/${id}/comments`),
  
  addComment: (id: string, content: string, isInternal?: boolean) =>
    apiClient.post(`/api/v1/tickets/${id}/comments`, { content, isInternal }),
  
  getHistory: (id: string) =>
    apiClient.get(`/api/v1/tickets/${id}/history`),
};
