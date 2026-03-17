import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queueChannel } from '../lib/interaction-queue-channel';
import { interactionKeys } from './useInteractionsApi';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook to enable real-time queue updates via WebSocket
 * Automatically subscribes/unsubscribes based on auth state
 */
export function useRealtimeQueue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.agentId) return;

    // Subscribe to queue updates
    queueChannel.subscribe(user.agentId);

    // Handle queue events
    const unsubQueue = queueChannel.onQueueEvent((event) => {
      console.log('[Queue Event]', event.type, event.interaction.displayId);

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: interactionKeys.lists() });

      // Show toast notification
      switch (event.type) {
        case 'new':
          toast.info(`New ${event.interaction.channel} interaction`, {
            description: event.interaction.customerName,
          });
          break;
        case 'assigned':
          toast.success('Interaction assigned to you', {
            description: event.interaction.displayId,
          });
          break;
        case 'removed':
          // Silent update
          break;
      }
    });

    // Handle SLA warnings
    const unsubSLA = queueChannel.onSLAWarning((event) => {
      console.log('[SLA Warning]', event.interactionId, event.remainingSeconds);
      
      toast.warning('SLA Warning', {
        description: `${Math.floor(event.remainingSeconds / 60)} minutes remaining`,
      });
    });

    // Handle SLA breaches
    const unsubBreach = queueChannel.onSLABreached((event) => {
      console.log('[SLA Breached]', event.interactionId);
      
      toast.error('SLA Breached', {
        description: `Interaction ${event.interactionId}`,
      });

      // Invalidate to update UI
      queryClient.invalidateQueries({ queryKey: interactionKeys.lists() });
    });

    // Cleanup
    return () => {
      unsubQueue();
      unsubSLA();
      unsubBreach();
      queueChannel.unsubscribe();
    };
  }, [user?.agentId, queryClient]);
}
