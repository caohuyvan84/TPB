import { useQuery, useMutation } from '@tanstack/react-query';
import { mediaApi } from '../lib/media-api';

export const useUploadFile = () => {
  return useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
  });
};

export const useFileUrl = (id: string) => {
  return useQuery({
    queryKey: ['media', 'file', id],
    queryFn: () => mediaApi.getFileUrl(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRecordings = (interactionId: string) => {
  return useQuery({
    queryKey: ['media', 'recordings', interactionId],
    queryFn: () => mediaApi.getRecordings(interactionId),
    enabled: !!interactionId,
  });
};

export const useRecordingStream = (id: string) => {
  return useQuery({
    queryKey: ['media', 'recording-stream', id],
    queryFn: () => mediaApi.getRecordingStream(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
