import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { ThemeToggle } from './ThemeToggle';
import { MdLogout } from 'react-icons/md';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const wsConnected = useUIStore((state) => state.wsConnected);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-blue-400">
            🥚 Incubator Dashboard
          </h1>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            wsConnected 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {wsConnected ? 'Connected' : 'Offline'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && <span className="text-dark-100">👤 {user.username}</span>}
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="btn btn-danger flex items-center gap-2"
          >
            <MdLogout />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
