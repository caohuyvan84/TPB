import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notificationsApi, GetNotificationsParams, UpdateNotificationStateRequest } from '../lib/notifications-api';
import { notificationChannel } from '../lib/notification-channel';
import { useAuth } from '../contexts/AuthContext';

export const useNotificationsApi = (params?: GetNotificationsParams) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.getAll(params),
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30s
  });
};

export const useUpdateNotificationState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateNotificationStateRequest }) =>
      notificationsApi.updateState(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// Real-time notification updates
export const useRealtimeNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.agentId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    notificationChannel.connect(user.agentId, token);

    notificationChannel.onNotification((event) => {
      // Invalidate queries on any notification event
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Show toast for new notifications
      if (event.type === 'new') {
        // Toast will be handled by NotificationContext
      }
    });

    return () => {
      notificationChannel.offNotification();
      notificationChannel.disconnect();
    };
  }, [user?.agentId, queryClient]);
};
