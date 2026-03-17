import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface InteractionStats {
  total: number;
  new: number;
  inProgress: number;
  resolved: number;
  avgHandleTime: number; // seconds
  slaCompliance: number; // percentage
}

/**
 * Fetch interaction statistics from API
 */
async function fetchInteractionStats(): Promise<InteractionStats> {
  const { data } = await apiClient.get<InteractionStats>('/api/interactions/stats');
  return data;
}

/**
 * Hook to get interaction statistics
 * Refetches every 30 seconds for real-time updates
 */
export function useInteractionStats() {
  return useQuery({
    queryKey: ['interaction-stats'],
    queryFn: fetchInteractionStats,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });
}
