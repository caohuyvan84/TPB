import React, { useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { AdminRole } from '../lib/admin-api';
import {
  useAdminRoles,
  useCreateAdminRole,
  useUpdateAdminRole,
  useDeleteAdminRole,
} from '../hooks/useAdminRoles';

const PERMISSIONS_LIST = [
  'users:read', 'users:create', 'users:update', 'users:delete',
  'roles:read', 'roles:create', 'roles:update', 'roles:delete',
  'tickets:read', 'tickets:create', 'tickets:update', 'tickets:delete',
  'interactions:read', 'interactions:create', 'interactions:update',
  'customers:read', 'customers:create', 'customers:update',
  'knowledge:read', 'knowledge:create', 'knowledge:update', 'knowledge:delete',
  'audit:read', 'reports:read', 'settings:read', 'settings:update',
  'cti:read', 'cti:update',
];

interface RoleFormState {
  name: string;
  description: string;
  permissions: string[];
}

const defaultForm: RoleFormState = { name: '', description: '', permissions: [] };

export const RoleManagement: React.FC = () => {
  const { data: roles = [], isLoading, error } = useAdminRoles();
  const createRole = useCreateAdminRole();
  const updateRole = useUpdateAdminRole();
  const deleteRole = useDeleteAdminRole();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [form, setForm] = useState<RoleFormState>(defaultForm);

  const openCreate = () => {
    setEditingRole(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (role: AdminRole) => {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description ?? '', permissions: role.permissions });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setForm(defaultForm);
  };

  const togglePermission = (perm: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, data: form });
      } else {
        await createRole.mutateAsync(form);
      }
      closeModal();
    } catch {
      // errors surfaced via mutation state
    }
  };

  const handleDelete = async (role: AdminRole) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    await deleteRole.mutateAsync(role.id);
  };

  const isPending = createRole.isPending || updateRole.isPending;

  return (
    <AdminLayout>
      <div className="px-4 sm:px-0">
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Role Management</h1>
            <p className="mt-1 text-sm text-gray-600">Manage roles and their permissions.</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16">
            <button
              onClick={openCreate}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              + Create Role
            </button>
          </div>
        </div>

        {isLoading && <div className="text-center py-8 text-gray-500">Loading roles...</div>}
        {error && <div className="text-center py-8 text-red-500">Failed to load roles.</div>}

        {!isLoading && !error && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No roles found.</td>
                  </tr>
                )}
                {roles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{role.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{role.description || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 5).map(p => (
                          <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {p}
                          </span>
                        ))}
                        {role.permissions.length > 5 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            +{role.permissions.length - 5} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEdit(role)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(role)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteRole.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">
                {editingRole ? 'Edit Role' : 'Create Role'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. SUPERVISOR"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-3">
                  {PERMISSIONS_LIST.map(perm => (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-gray-700">{perm}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">{form.permissions.length} permissions selected</p>
              </div>

              {(createRole.error || updateRole.error) && (
                <div className="text-sm text-red-600">
                  {(createRole.error as Error)?.message || (updateRole.error as Error)?.message || 'An error occurred'}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
