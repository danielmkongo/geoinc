import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ControlPage } from './pages/ControlPage';
import { HistoryPage } from './pages/HistoryPage';
import { DevicesPage } from './pages/DevicesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { DataLoggersPage } from './pages/DataLoggersPage';
import { DataLoggerDetailPage } from './pages/DataLoggerDetailPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'super_admin') return <Navigate to="/" replace />;
  return <MainLayout>{children}</MainLayout>;
};

// Welcome toast shown once after login
const WelcomeToast = () => {
  const [name, setName] = useState(null);

  useEffect(() => {
    const welcome = sessionStorage.getItem('welcomeUser');
    if (welcome) {
      setName(welcome);
      sessionStorage.removeItem('welcomeUser');
      const t = setTimeout(() => setName(null), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!name) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-slideIn">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-black/40">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {name[0].toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Welcome back, {name}!</p>
          <p className="text-slate-400 text-xs">You are now logged in</p>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  useTheme();

  return (
    <Router>
      <WelcomeToast />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/devices" element={<ProtectedRoute><DevicesPage /></ProtectedRoute>} />
        <Route path="/control" element={<ProtectedRoute><ControlPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/data-loggers" element={<ProtectedRoute><DataLoggersPage /></ProtectedRoute>} />
        <Route path="/data-loggers/:id" element={<ProtectedRoute><DataLoggerDetailPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return <AppContent />;
}

export default App;
