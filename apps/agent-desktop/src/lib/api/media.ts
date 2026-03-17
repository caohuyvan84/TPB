import { apiClient } from '../api-client';

export const mediaApi = {
  upload: (file: File, category?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    
    return apiClient.post('/api/v1/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getUrl: (id: string) =>
    apiClient.get(`/api/v1/media/${id}/url`),
  
  getRecordings: (interactionId: string) =>
    apiClient.get(`/api/v1/media/recordings/${interactionId}`),
  
  getStreamUrl: (id: string) =>
    apiClient.get(`/api/v1/media/recordings/${id}/stream`),
};
