import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../lib/api/customers';
import { toast } from 'sonner';

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getById(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useCustomerInteractions(id: string | null) {
  return useQuery({
    queryKey: ['customer', id, 'interactions'],
    queryFn: async () => {
      const res = await customersApi.getInteractions(id!);
      const d = res.data;
      // Backend returns { data: [], nextCursor, hasMore } (cursor-based pagination)
      return Array.isArray(d) ? d : (d?.data ?? []);
    },
    enabled: !!id,
  });
}

export function useCustomerTickets(id: string | null) {
  return useQuery({
    queryKey: ['customer', id, 'tickets'],
    queryFn: () => customersApi.getTickets(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useCustomerNotes(id: string | null) {
  return useQuery({
    queryKey: ['customer', id, 'notes'],
    queryFn: () => customersApi.getNotes(id!).then(res => res.data),
    enabled: !!id,
  });
}

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ['customers', 'search', query],
    queryFn: () => customersApi.search({ query }).then(res => res.data),
    enabled: query.length > 2,
  });
}

export function useAddCustomerNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      customersApi.addNote(id, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id, 'notes'] });
      toast.success('Note added successfully');
    },
    onError: () => {
      toast.error('Failed to add note');
    },
  });
}
