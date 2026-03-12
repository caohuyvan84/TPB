import React, { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { adminAuditApi } from '../lib/admin-api';

const RESOURCE_TYPES = ['', 'user', 'role', 'ticket', 'interaction', 'customer', 'knowledge', 'cti', 'session'];

const EVENT_TYPE_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-gray-100 text-gray-800',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function truncate(str: string, len = 20) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export const AuditLogViewer: React.FC = () => {
  const { user } = useAdminAuth();
  const [resourceType, setResourceType] = useState('');
  const [actorId, setActorId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);

  const filters = {
    ...(resourceType && { resourceType }),
    ...(actorId && { actorId }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data, isLoading, error, page, setPage, limit } = useAuditLogs(filters);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleVerifyChain = async () => {
    if (!user?.tenantId) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await adminAuditApi.verifyChain(user.tenantId);
      setVerifyResult(result);
    } catch {
      setVerifyResult({ valid: false, message: 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-0">
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Audit Log Viewer</h1>
            <p className="mt-1 text-sm text-gray-600">
              Immutable audit trail — {total} records
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16">
            <button
              onClick={handleVerifyChain}
              disabled={verifying}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify Chain'}
            </button>
          </div>
        </div>

        {verifyResult && (
          <div className={`mb-4 p-3 rounded-md text-sm ${verifyResult.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {verifyResult.valid ? '✓' : '✗'} {verifyResult.message}
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Resource Type</label>
              <select
                value={resourceType}
                onChange={e => { setResourceType(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {RESOURCE_TYPES.map(rt => (
                  <option key={rt} value={rt}>{rt || 'All'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Actor ID</label>
              <input
                type="text"
                value={actorId}
                onChange={e => { setActorId(e.target.value); setPage(1); }}
                placeholder="Filter by actor ID"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {isLoading && <div className="text-center py-8 text-gray-500">Loading audit logs...</div>}
        {error && <div className="text-center py-8 text-red-500">Failed to load audit logs.</div>}

        {!isLoading && !error && (
          <>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No audit logs found.</td>
                    </tr>
                  )}
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.occurredAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${EVENT_TYPE_COLORS[log.eventType] ?? 'bg-gray-100 text-gray-700'}`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{log.action}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div>{truncate(log.actorId)}</div>
                        <div className="text-gray-400">{log.actorRole}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{log.resourceType}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{truncate(log.resourceId, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};
