import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCtiApi, CtiConfig } from '../lib/admin-api';

export function useCTIConfig(tenantId: string) {
  return useQuery({
    queryKey: ['cti-config', tenantId],
    queryFn: () => adminCtiApi.getConfig(tenantId),
    enabled: !!tenantId,
    retry: false,
  });
}

export function useUpdateCTIConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: Partial<CtiConfig> }) =>
      adminCtiApi.updateConfig(tenantId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cti-config', variables.tenantId] });
    },
  });
}
