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

export const ctiApi = {
  answerCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post('/cti/calls/answer', request);
    return data;
  },

  hangupCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post('/cti/calls/hangup', request);
    return data;
  },

  transferCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post('/cti/calls/transfer', request);
    return data;
  },

  holdCall: async (request: CallControlRequest): Promise<CallControlResponse> => {
    const { data } = await apiClient.post('/cti/calls/hold', request);
    return data;
  },

  getConfig: async (): Promise<CtiConfig> => {
    const { data } = await apiClient.get('/admin/cti/config');
    return data;
  },

  updateConfig: async (config: Partial<CtiConfig>): Promise<CtiConfig> => {
    const { data } = await apiClient.patch('/admin/cti/config', config);
    return data;
  },
};
