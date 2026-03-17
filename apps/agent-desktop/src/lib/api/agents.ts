import { apiClient } from '../api-client';

export const agentsApi = {
  getMe: () =>
    apiClient.get('/api/v1/agents/me'),
  
  getMyStatus: () =>
    apiClient.get('/api/v1/agents/me/status'),
  
  updateChannelStatus: (channel: string, status: string, reason?: string) =>
    apiClient.put(`/api/v1/agents/me/status/${channel}`, { status, reason }),
  
  updateAllStatus: (status: string, reason?: string) =>
    apiClient.put('/api/v1/agents/me/status/all', { status, reason }),
  
  sendHeartbeat: () =>
    apiClient.post('/api/v1/agents/me/heartbeat'),
  
  listAgents: () =>
    apiClient.get('/api/v1/agents'),
  
  getAgent: (agentId: string) =>
    apiClient.get(`/api/v1/agents/${agentId}`),
};
