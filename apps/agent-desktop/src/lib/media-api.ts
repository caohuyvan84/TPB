import { apiClient } from './api-client';

export interface MediaFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface CallRecording {
  id: string;
  interactionId: string;
  filename: string;
  duration: number;
  quality: 'low' | 'medium' | 'high';
  size: number;
  recordedAt: string;
}

export interface UploadResponse {
  file: MediaFile;
  uploadUrl?: string;
}

export const mediaApi = {
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await apiClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  getFileUrl: async (id: string): Promise<{ url: string; expiresAt: string }> => {
    const { data } = await apiClient.get(`/media/${id}/url`);
    return data;
  },

  getRecordings: async (interactionId: string): Promise<CallRecording[]> => {
    const { data } = await apiClient.get(`/media/recordings/${interactionId}`);
    return data;
  },

  getRecordingStream: async (id: string): Promise<{ streamUrl: string; expiresAt: string }> => {
    const { data } = await apiClient.get(`/media/recordings/${id}/stream`);
    return data;
  },
};
