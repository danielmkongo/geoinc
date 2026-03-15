import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

console.log('App.jsx loading...');

import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { ErrorBoundary } from './components/ErrorBoundary';
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

console.log('All imports loaded');

const ProtectedRoute = ({ children }) => {
  console.log('ProtectedRoute checking auth...');
  const { isAuthenticated } = useAuth();
  console.log('ProtectedRoute auth check:', { isAuthenticated });

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const AppContent = () => {
  console.log('AppContent: Initializing');

  try {
    // Initialize theme
    useTheme();
    console.log('Theme initialized');
  } catch (err) {
    console.error('Theme init error:', err);
  }

  console.log('AppContent: Rendering Router');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/devices"
          element={
            <ProtectedRoute>
              <DevicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/control"
          element={
            <ProtectedRoute>
              <ControlPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/data-loggers"
          element={
            <ProtectedRoute>
              <DataLoggersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-loggers/:id"
          element={
            <ProtectedRoute>
              <DataLoggerDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  console.log('App: Rendering');
  return (
    <AppContent />
  );
}

export default App;
