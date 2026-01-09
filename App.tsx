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
  const { logout, checkAuth } = useAuthStore();
  const [isIdleWarningOpen, setIsIdleWarningOpen] = React.useState(false);
  const [idleTime, setIdleTime] = React.useState(0);
  const IDLE_LIMIT = 600000; // 10 minutes
  const WARNING_LIMIT = 540000; // 9 minutes (Show warning 1 minute before)

  React.useEffect(() => {
    checkAuth();
    fetchData();

    // Idle Timer Logic
    let idleInterval: NodeJS.Timeout;
    let lastActivity = Date.now();

    const updateActivity = () => {
      lastActivity = Date.now();
      setIsIdleWarningOpen(false);
    };

    const checkIdle = () => {
      const now = Date.now();
      const diff = now - lastActivity;

      if (diff >= IDLE_LIMIT) {
        logout();
      } else if (diff >= WARNING_LIMIT) {
        setIsIdleWarningOpen(true);
      }
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Attach listeners
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Start interval
    idleInterval = setInterval(checkIdle, 1000);

    // Cleanup
    return () => {
      clearInterval(idleInterval);
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [fetchData, checkAuth, logout]);

  const handleStayLoggedIn = () => {
    setIsIdleWarningOpen(false);
    // lastActivity is updated by click event propagation or explicit reset if needed, 
    // but the click listener on document handles it.
  };

  return (
    <>
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

      {/* Inactivity Warning Modal */}
      {isIdleWarningOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600 animate-[loading_60s_linear_forwards]"></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Are you still there?</h3>
            <p className="text-slate-500 font-medium text-sm mb-6">
              For security, your session will time out in less than a minute due to inactivity.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => logout()}
                className="flex-1 py-3 text-slate-500 font-bold bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Logout Now
              </button>
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;