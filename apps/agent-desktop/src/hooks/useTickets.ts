import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../lib/api/tickets';
import { toast } from 'sonner';

export function useTickets(params?: { status?: string; priority?: string; limit?: number }) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsApi.list(params).then(res => res.data),
  });
}

export function useTicket(id: string | null) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useTicketComments(id: string | null) {
  return useQuery({
    queryKey: ['ticket', id, 'comments'],
    queryFn: () => ticketsApi.getComments(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useTicketHistory(id: string | null) {
  return useQuery({
    queryKey: ['ticket', id, 'history'],
    queryFn: () => ticketsApi.getHistory(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof ticketsApi.create>[0]) =>
      ticketsApi.create(data).then(res => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId, 'tickets'] });
      }
      toast.success('Ticket đã được tạo thành công');
    },
    onError: () => {
      toast.error('Failed to create ticket');
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ticketsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket updated successfully');
    },
    onError: () => {
      toast.error('Failed to update ticket');
    },
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, content, isInternal }: { id: string; content: string; isInternal?: boolean }) =>
      ticketsApi.addComment(id, content, isInternal),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id, 'comments'] });
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });
}
