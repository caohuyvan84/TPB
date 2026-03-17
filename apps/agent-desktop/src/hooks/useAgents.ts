import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '../lib/api/agents';

export function useAgentProfile() {
  return useQuery({
    queryKey: ['agent', 'me'],
    queryFn: () => agentsApi.getMe().then(res => res.data),
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ['agent', 'status'],
    queryFn: () => agentsApi.getMyStatus().then(res => res.data),
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

export function useAgentList() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.listAgents().then(res => res.data),
  });
}
