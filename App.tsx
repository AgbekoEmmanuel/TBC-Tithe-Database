import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useDataStore } from './store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Entry } from './pages/Entry';
import { Reconcile } from './pages/Reconcile';
import { Directory } from './pages/Directory';
import { Analytics } from './pages/Analytics';
import { Admin } from './pages/Admin';
import { Role } from './types';

// Auth Guard Component
const RequireAuth: React.FC<{ children: React.ReactNode, allowedRoles?: Role[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { fetchData } = useDataStore();
  const { checkAuth } = useAuthStore();

  React.useEffect(() => {
    checkAuth();
    fetchData();
  }, [fetchData, checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        } />

        <Route path="operations/entry" element={
          <RequireAuth>
            <Entry />
          </RequireAuth>
        } />

        <Route path="operations/reconcile" element={
          <RequireAuth allowedRoles={[Role.SUPERVISOR]}>
            <Reconcile />
          </RequireAuth>
        } />

        <Route path="directory" element={
          <RequireAuth>
            <Directory />
          </RequireAuth>
        } />

        <Route path="analytics" element={
          <RequireAuth>
            <Analytics />
          </RequireAuth>
        } />

        <Route path="admin" element={
          <RequireAuth>
            <Admin />
          </RequireAuth>
        } />
      </Route>
    </Routes>
  );
};

export default App;