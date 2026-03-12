import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminAuditApi, GetAuditLogsParams } from '../lib/admin-api';

export function useAuditLogs(filters: Omit<GetAuditLogsParams, 'limit' | 'offset'> = {}) {
  const [page, setPage] = useState(1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const query = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: () => adminAuditApi.getLogs({ ...filters, limit, offset }),
    placeholderData: (prev) => prev,
  });

  return {
    ...query,
    page,
    setPage,
    limit,
  };
}
