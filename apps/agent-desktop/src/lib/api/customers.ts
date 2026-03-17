import { apiClient } from '../api-client';

export const customersApi = {
  search: (params?: { query?: string; limit?: number }) =>
    apiClient.get('/api/v1/customers', { params }),

  getById: (id: string) =>
    apiClient.get(`/api/v1/customers/${id}`),

  getInteractions: (id: string) =>
    apiClient.get('/api/v1/interactions', { params: { customerId: id } }),

  getTickets: (id: string) =>
    apiClient.get('/api/v1/tickets', { params: { customerId: id } }),

  getNotes: (id: string) =>
    apiClient.get(`/api/v1/customers/${id}/notes`),

  addNote: (id: string, content: string) =>
    apiClient.post(`/api/v1/customers/${id}/notes`, { content }),
};
