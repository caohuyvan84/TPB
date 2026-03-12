import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useCTIConfig, useUpdateCTIConfig } from '../hooks/useCTIConfig';

const VENDORS = [
  { value: 'MOCK', label: 'Mock (Development)' },
  { value: 'GENESYS_CLOUD', label: 'Genesys Cloud' },
  { value: 'AVAYA_CM', label: 'Avaya CM' },
  { value: 'ASTERISK', label: 'Asterisk' },
];

const VENDOR_FIELDS: Record<string, { key: string; label: string; type: string; placeholder: string }[]> = {
  MOCK: [],
  GENESYS_CLOUD: [
    { key: 'orgId', label: 'Organization ID', type: 'text', placeholder: 'your-org-id' },
    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'OAuth client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'OAuth client secret' },
    { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
  ],
  AVAYA_CM: [
    { key: 'host', label: 'Host', type: 'text', placeholder: 'avaya.example.com' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '443' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'admin' },
    { key: 'password', label: 'Password', type: 'password', placeholder: 'password' },
    { key: 'switchName', label: 'Switch Name', type: 'text', placeholder: 'CM01' },
  ],
  ASTERISK: [
    { key: 'host', label: 'Host', type: 'text', placeholder: 'asterisk.example.com' },
    { key: 'port', label: 'AMI Port', type: 'number', placeholder: '5038' },
    { key: 'username', label: 'AMI Username', type: 'text', placeholder: 'admin' },
    { key: 'password', label: 'AMI Password', type: 'password', placeholder: 'password' },
  ],
};

export const CTIConfig: React.FC = () => {
  const { user } = useAdminAuth();
  const tenantId = user?.tenantId ?? '';

  const { data: config, isLoading, error } = useCTIConfig(tenantId);
  const updateConfig = useUpdateCTIConfig();

  const [vendor, setVendor] = useState('MOCK');
  const [isActive, setIsActive] = useState(true);
  const [vendorConfig, setVendorConfig] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setVendor(config.vendor);
      setIsActive(config.isActive);
      const strConfig: Record<string, string> = {};
      for (const [k, v] of Object.entries(config.config ?? {})) {
        strConfig[k] = String(v);
      }
      setVendorConfig(strConfig);
    }
  }, [config]);

  const handleVendorChange = (v: string) => {
    setVendor(v);
    setVendorConfig({});
  };

  const handleFieldChange = (key: string, value: string) => {
    setVendorConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    try {
      await updateConfig.mutateAsync({
        tenantId,
        data: { vendor, isActive, config: vendorConfig },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // errors surfaced via mutation state
    }
  };

  const fields = VENDOR_FIELDS[vendor] ?? [];

  return (
    <AdminLayout>
      <div className="px-4 sm:px-0 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">CTI Configuration</h1>
          <p className="mt-1 text-sm text-gray-600">Configure telephony integration settings.</p>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-gray-500">Loading CTI configuration...</div>
        )}

        {error && !isLoading && (
          <div className="mb-4 p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm">
            No CTI configuration found. Configure below to create one.
          </div>
        )}

        {!isLoading && (
          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg divide-y divide-gray-200">
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <select
                  value={vendor}
                  onChange={e => handleVendorChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {VENDORS.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>

              {fields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 border-t pt-3">
                    {VENDORS.find(v => v.value === vendor)?.label} Settings
                  </h3>
                  {fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={vendorConfig[field.key] ?? ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {vendor === 'MOCK' && (
                <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                  Mock mode — no external connection required. Suitable for development/testing.
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
                <label className="text-sm font-medium text-gray-700">
                  Integration {isActive ? 'Active' : 'Disabled'}
                </label>
              </div>
            </div>

            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                {saveSuccess && (
                  <span className="text-sm text-green-600">Configuration saved successfully.</span>
                )}
                {updateConfig.error && (
                  <span className="text-sm text-red-600">
                    {(updateConfig.error as Error)?.message || 'Save failed'}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={updateConfig.isPending || !tenantId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateConfig.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};
