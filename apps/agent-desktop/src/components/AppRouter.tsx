import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoginPage from '@/pages/LoginPage';
import PrivateRoute from '@/components/PrivateRoute';

const AgentDesktop = lazy(() => import('@/App'));

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/agent',
    element: (
      <PrivateRoute>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
          <AgentDesktop />
        </Suspense>
      </PrivateRoute>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/agent" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
