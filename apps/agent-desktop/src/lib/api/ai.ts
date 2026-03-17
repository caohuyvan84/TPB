import { apiClient } from '../api-client';

export const aiApi = {
  suggest: (data: { context: string; conversationHistory?: any[] }) =>
    apiClient.post('/api/v1/ai/suggest', data),
  
  summarize: (data: { text: string; maxLength?: number }) =>
    apiClient.post('/api/v1/ai/summarize', data),
  
  sentiment: (data: { text: string }) =>
    apiClient.post('/api/v1/ai/sentiment', data),
  
  classify: (data: { text: string; categories: string[] }) =>
    apiClient.post('/api/v1/ai/classify', data),
};
