import { apiClient } from '../api-client';

export const interactionsApi = {
  list: (params?: { status?: string; channel?: string; limit?: number }) =>
    apiClient.get('/api/v1/interactions', { params }),
  
  getById: (id: string) =>
    apiClient.get(`/api/v1/interactions/${id}`),
  
  updateStatus: (id: string, status: string) =>
    apiClient.put(`/api/v1/interactions/${id}/status`, { status }),
  
  assign: (id: string, agentId: string) =>
    apiClient.put(`/api/v1/interactions/${id}/assign`, { agentId }),
  
  transfer: (id: string, targetAgentId: string, reason?: string) =>
    apiClient.post(`/api/v1/interactions/${id}/transfer`, { targetAgentId, reason }),
  
  getTimeline: (id: string) =>
    apiClient.get(`/api/v1/interactions/${id}/timeline`),
  
  getNotes: (id: string) =>
    apiClient.get(`/api/v1/interactions/${id}/notes`),
  
  addNote: (id: string, content: string, tag?: string) =>
    apiClient.post(`/api/v1/interactions/${id}/notes`, { content, tag }),
};
