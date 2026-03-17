import { useQuery } from '@tanstack/react-query';
import { interactionsApi } from '../lib/api/interactions';
import { Interaction } from '../types/api';

export function useInteractions(filters?: { status?: string; channel?: string }) {
  return useQuery<Interaction[]>({
    queryKey: ['interactions', filters],
    queryFn: () => interactionsApi.list(filters).then(res => res.data),
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useInteraction(id: string | null) {
  return useQuery<Interaction>({
    queryKey: ['interaction', id],
    queryFn: () => interactionsApi.getById(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useInteractionNotes(id: string | null) {
  return useQuery({
    queryKey: ['interaction', id, 'notes'],
    queryFn: () => interactionsApi.getNotes(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useInteractionTimeline(id: string | null) {
  return useQuery({
    queryKey: ['interaction', id, 'timeline'],
    queryFn: () => interactionsApi.getTimeline(id!).then(res => res.data),
    enabled: !!id,
  });
}
