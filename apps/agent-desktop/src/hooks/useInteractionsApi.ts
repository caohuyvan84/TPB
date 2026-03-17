import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interactionApi, type Interaction, type InteractionFilters } from '../lib/interactions-api';
import { toast } from 'sonner';

// Query keys
export const interactionKeys = {
  all: ['interactions'] as const,
  lists: () => [...interactionKeys.all, 'list'] as const,
  list: (filters?: InteractionFilters) => [...interactionKeys.lists(), filters] as const,
  details: () => [...interactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...interactionKeys.details(), id] as const,
  timeline: (id: string) => [...interactionKeys.detail(id), 'timeline'] as const,
  notes: (id: string) => [...interactionKeys.detail(id), 'notes'] as const,
};

// Hooks

/**
 * Get all interactions with filters
 */
export function useInteractions(filters?: InteractionFilters) {
  return useQuery({
    queryKey: interactionKeys.list(filters),
    queryFn: () => interactionApi.getAll(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get single interaction by ID
 */
export function useInteraction(id: string) {
  return useQuery({
    queryKey: interactionKeys.detail(id),
    queryFn: () => interactionApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Get interaction timeline
 */
export function useInteractionTimeline(id: string) {
  return useQuery({
    queryKey: interactionKeys.timeline(id),
    queryFn: () => interactionApi.getTimeline(id),
    enabled: !!id,
  });
}

/**
 * Get interaction notes
 */
export function useInteractionNotes(id: string) {
  return useQuery({
    queryKey: interactionKeys.notes(id),
    queryFn: () => interactionApi.getNotes(id),
    enabled: !!id,
  });
}

/**
 * Update interaction status
 */
export function useUpdateInteractionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Interaction['status'] }) =>
      interactionApi.updateStatus(id, status),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: interactionKeys.lists() });
      queryClient.setQueryData(interactionKeys.detail(data.id), data);
      toast.success('Status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });
}

/**
 * Assign interaction to agent
 */
export function useAssignInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, agentId }: { id: string; agentId: string }) =>
      interactionApi.assign(id, agentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.lists() });
      queryClient.setQueryData(interactionKeys.detail(data.id), data);
      toast.success('Interaction assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign interaction');
    },
  });
}

/**
 * Transfer interaction to another agent
 */
export function useTransferInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetAgentId, reason }: { id: string; targetAgentId: string; reason?: string }) =>
      interactionApi.transfer(id, targetAgentId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.lists() });
      queryClient.setQueryData(interactionKeys.detail(data.id), data);
      toast.success('Interaction transferred successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to transfer interaction');
    },
  });
}

/**
 * Add note to interaction
 */
export function useAddInteractionNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content, tag }: { id: string; content: string; tag?: string }) =>
      interactionApi.addNote(id, content, tag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.notes(variables.id) });
      toast.success('Note added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add note');
    },
  });
}
