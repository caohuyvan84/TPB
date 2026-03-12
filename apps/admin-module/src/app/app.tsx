import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider } from '../contexts/AdminAuthContext';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminPrivateRoute } from '../components/AdminPrivateRoute';
import { AdminDashboard } from '../pages/AdminDashboard';
import { UserManagement } from '../pages/UserManagement';
import { SystemSettings } from '../pages/SystemSettings';
import { RoleManagement } from '../pages/RoleManagement';
import { AuditLogViewer } from '../pages/AuditLogViewer';
import { CTIConfig } from '../pages/CTIConfig';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route
            path="/*"
            element={
              <AdminPrivateRoute>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<AdminDashboard />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/roles" element={<RoleManagement />} />
                  <Route path="/audit" element={<AuditLogViewer />} />
                  <Route path="/cti-config" element={<CTIConfig />} />
                  <Route path="/settings" element={<SystemSettings />} />
                </Routes>
              </AdminPrivateRoute>
            }
          />
        </Routes>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
