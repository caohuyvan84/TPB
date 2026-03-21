import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCallEvents } from './useCallEvents';

export interface TimelineEvent {
  id: string;
  callId: string;
  interactionId?: string;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface TimelineSummary {
  totalDurationMs: number;
  talkTimeMs: number;
  ivrTimeMs: number;
  waitTimeMs: number;
  holdCount: number;
  transferCount: number;
  missedAgentCount: number;
}

export interface CallTimelineData {
  interactionId?: string;
  callId?: string;
  events: TimelineEvent[];
  summary: TimelineSummary;
}

/**
 * Fetch call timeline events.
 * - By callId: for active calls (gets IVR/queue events before interaction exists)
 * - By interactionId: for completed calls
 * Always queries by interactionId as primary, callId as secondary.
 */
export function useCallTimeline(
  interactionId: string | undefined,
  isLive = false,
  callId?: string,
) {
  const queryClient = useQueryClient();

  // Always use interactionId-based key for consistency.
  // The queryFn fetches by callId first (faster, gets all events), falls back to interactionId.
  const queryKey = ['call-timeline', interactionId || callId || 'none'];

  const { data, isLoading, error } = useQuery<CallTimelineData>({
    queryKey,
    queryFn: async () => {
      // Try callId first (gets orphan events + linked events)
      if (callId) {
        try {
          const resp = await apiClient.get(`/api/v1/interactions/call-timeline-by-call/${callId}`);
          if (resp.data?.events?.length > 0) return resp.data;
        } catch { /* fall through */ }
      }
      // Fall back to interactionId
      if (interactionId) {
        const resp = await apiClient.get(`/api/v1/interactions/${interactionId}/call-timeline`);
        return resp.data;
      }
      return { events: [], summary: { totalDurationMs: 0, talkTimeMs: 0, ivrTimeMs: 0, waitTimeMs: 0, holdCount: 0, transferCount: 0, missedAgentCount: 0 } };
    },
    enabled: !!(callId || interactionId),
    staleTime: isLive ? 2000 : 10000,
    refetchInterval: isLive ? 5000 : false,
  });

  // Realtime: invalidate on WS events
  useCallEvents({
    onIncomingCall: () => {
      queryClient.invalidateQueries({ queryKey: ['call-timeline'] });
    },
    onCallAnswered: () => {
      queryClient.invalidateQueries({ queryKey: ['call-timeline'] });
    },
    onCallEnded: () => {
      // Invalidate ALL call-timeline queries with delays for DB writes
      queryClient.invalidateQueries({ queryKey: ['call-timeline'] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['call-timeline'] }), 1500);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['call-timeline'] }), 3000);
    },
  });

  return {
    events: data?.events || [],
    summary: data?.summary || null,
    isLoading,
    error,
  };
}
