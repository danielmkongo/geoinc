import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MdDashboard, MdSettings, MdHistory, MdClose, MdMenu, MdLogout,
  MdAdminPanelSettings, MdPerson, MdShield,
} from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useDeviceStore } from '../store/deviceStore';

const LIVE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

const getNavItems = (isAdmin) => [
  { path: '/', label: 'Dashboard', icon: MdDashboard, desc: 'Overview & Live Data' },
  { path: '/control', label: 'Control', icon: MdSettings, desc: 'Manage Actuators' },
  { path: '/history', label: 'History', icon: MdHistory, desc: 'Sensor Records' },
  { path: '/profile', label: 'Profile', icon: MdPerson, desc: 'Account Settings' },
  ...(isAdmin
    ? [{ path: '/admin', label: 'Admin', icon: MdAdminPanelSettings, desc: 'User & Device Mgmt' }]
    : []),
];

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const lastUpdate = useDeviceStore((state) => state.lastUpdate);
  const isLive = lastUpdate && (Date.now() - new Date(lastUpdate).getTime()) < LIVE_THRESHOLD_MS;

  const isAdmin = user?.role === 'admin';
  const navItems = getNavItems(isAdmin);

  const isActive = (path) => location.pathname === path;

  const displayName = user?.full_name || user?.username || 'User';
  const avatarLetter = displayName[0].toUpperCase();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-colors"
      >
        {isOpen ? <MdClose size={22} /> : <MdMenu size={22} />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 z-40 flex flex-col
          bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800
          border-r border-slate-700/50 shadow-2xl
          transform transition-transform duration-300 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/40 flex-shrink-0">
              <span className="text-xl">🥚</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base leading-tight">Geothermal</h1>
              <p className="text-slate-400 text-xs">Egg Incubation System</p>
            </div>
          </div>
          {/* Live status */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border
              ${isLive
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-red-500/10 border-red-500/25 text-red-400'
              }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span>{isLive ? 'Live · Device Active' : 'Offline · No Recent Data'}</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Menu</p>
          {navItems.map(({ path, label, icon: Icon, desc }) => {
            const active = isActive(path);
            const isAdminItem = path === '/admin';
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${active
                    ? isAdminItem
                      ? 'bg-amber-500/20 shadow-lg shadow-amber-500/10 border border-amber-500/30'
                      : 'bg-blue-600 shadow-lg shadow-blue-600/30'
                    : 'hover:bg-slate-700/60'
                  }`}
              >
                <Icon
                  size={20}
                  className={
                    active
                      ? isAdminItem
                        ? 'text-amber-400'
                        : 'text-white'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      active
                        ? isAdminItem
                          ? 'text-amber-300'
                          : 'text-white'
                        : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-xs leading-tight mt-0.5 ${
                      active
                        ? isAdminItem
                          ? 'text-amber-500/70'
                          : 'text-blue-200'
                        : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {desc}
                  </p>
                </div>
                {active && !isAdminItem && (
                  <div className="w-1.5 h-6 rounded-full bg-white/40 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-700/50 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-sm font-medium"
          >
            <span className="text-base w-5 text-center">{darkMode ? '☀️' : '🌙'}</span>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <div className="flex items-center gap-3 px-3 py-2">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                {avatarLetter}
              </div>
              {isAdmin && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center">
                  <MdShield size={7} className="text-slate-900" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{displayName}</p>
                {isAdmin && (
                  <span className="flex-shrink-0 text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-md leading-none">
                    admin
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs truncate">{user?.email || user?.username}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
              title="Logout"
            >
              <MdLogout size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  );
};
