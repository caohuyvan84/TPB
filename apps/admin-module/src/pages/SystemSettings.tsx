import React from 'react';
import { AdminLayout } from '../components/AdminLayout';

export const SystemSettings: React.FC = () => {
  const settings = [
    {
      category: 'Authentication',
      items: [
        { name: 'Session Timeout', value: '15 minutes', description: 'Auto-logout after inactivity' },
        { name: 'MFA Required', value: 'Enabled', description: 'Multi-factor authentication for all users' },
        { name: 'Password Policy', value: 'Strong', description: 'Minimum 8 characters with special chars' },
      ],
    },
    {
      category: 'System',
      items: [
        { name: 'API Rate Limit', value: '1000/hour', description: 'Maximum API requests per user per hour' },
        { name: 'File Upload Limit', value: '10 MB', description: 'Maximum file size for uploads' },
        { name: 'Backup Schedule', value: 'Daily 2:00 AM', description: 'Automated system backup' },
      ],
    },
    {
      category: 'Notifications',
      items: [
        { name: 'Email Notifications', value: 'Enabled', description: 'System alerts via email' },
        { name: 'Slack Integration', value: 'Disabled', description: 'Send alerts to Slack channels' },
        { name: 'SMS Alerts', value: 'Critical Only', description: 'SMS for critical system events' },
      ],
    },
  ];

  return (
    <AdminLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">System Settings</h1>
            <p className="mt-2 text-sm text-gray-700">
              Configure system-wide settings and preferences.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {settings.map((category) => (
            <div key={category.category} className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {item.name}
                            </h4>
                            <p className="text-sm text-gray-500">{item.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center">
                        <span className="text-sm text-gray-900 mr-4">{item.value}</span>
                        <button className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              System Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Version</dt>
                <dd className="mt-1 text-sm text-gray-900">v1.0.0</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Environment</dt>
                <dd className="mt-1 text-sm text-gray-900">Development</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Database</dt>
                <dd className="mt-1 text-sm text-gray-900">PostgreSQL 18.3</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Uptime</dt>
                <dd className="mt-1 text-sm text-gray-900">7 days, 14 hours</dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
