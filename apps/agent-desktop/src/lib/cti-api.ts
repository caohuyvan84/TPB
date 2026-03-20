import { apiClient } from './api-client';

export interface CallControlRequest {
  callId?: string;
  agentId?: string;
  targetNumber?: string;
  transferType?: 'blind' | 'attended';
}

export interface CallControlResponse {
  success: boolean;
  callId?: string;
  message?: string;
}

export interface CtiConfig {
  id: string;
  provider: 'genesys' | 'avaya' | 'asterisk';
  endpoint: string;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  isActive: boolean;
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';
const t = `tenantId=${DEFAULT_TENANT}`;

export const ctiApi = {
  answerCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post(`/api/v1/cti/calls/answer?${t}`, request);
    return data;
  },

  hangupCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post(`/api/v1/cti/calls/hangup?${t}`, request);
    return data;
  },

  transferCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post(`/api/v1/cti/calls/transfer?${t}`, request);
    return data;
  },

  holdCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post(`/api/v1/cti/calls/hold?${t}`, request);
    return data;
  },

  makeCall: async (request: { agentId: string; destination: string }): Promise<CallControlResponse> => {
    const { data } = await apiClient.post(`/api/v1/cti/calls/make?${t}`, request);
    return data;
  },

  getConfig: async (): Promise<CtiConfig> => {
    const { data } = await apiClient.get('/api/v1/admin/cti/config');
    return data;
  },

  updateConfig: async (config: Partial<CtiConfig>): Promise<CtiConfig> => {
    const { data } = await apiClient.patch('/api/v1/admin/cti/config', config);
    return data;
  },
};
