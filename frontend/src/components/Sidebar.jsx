import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { Link, useLocation } from 'react-router-dom';
import {
  MdDashboard, MdSettings, MdHistory, MdClose, MdMenu, MdLogout,
  MdAdminPanelSettings, MdPerson, MdShield, MdList,
} from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { authAPI } from '../services/api';

const NavLink = ({ path, label, icon: Icon, desc, active, isAdmin: isAdminItem, onClick }) => (
  <Link
    to={path}
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
      ${active
        ? isAdminItem
          ? 'bg-amber-500/15 dark:bg-amber-500/20 border border-amber-400/30 dark:border-amber-500/30'
          : 'bg-blue-600 shadow-md shadow-blue-600/25'
        : 'hover:bg-gray-100 dark:hover:bg-slate-700/60'
      }`}
  >
    <Icon
      size={18}
      className={
        active
          ? isAdminItem ? 'text-amber-600 dark:text-amber-400' : 'text-white'
          : 'text-gray-400 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-200'
      }
    />
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold leading-tight
        ${active
          ? isAdminItem ? 'text-amber-700 dark:text-amber-300' : 'text-white'
          : 'text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white'
        }`}>
        {label}
      </p>
      {desc && (
        <p className={`text-xs leading-tight mt-0.5
          ${active
            ? isAdminItem ? 'text-amber-600/70 dark:text-amber-500/70' : 'text-blue-100'
            : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-400'
          }`}>
          {desc}
        </p>
      )}
    </div>
  </Link>
);

const SectionLabel = ({ children }) => (
  <p className="text-gray-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 pt-4 pb-1.5">
    {children}
  </p>
);

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin      = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const close = () => setIsOpen(false);
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const displayName  = user?.full_name || user?.username || 'User';
  const avatarLetter = displayName[0].toUpperCase();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl
          bg-white dark:bg-slate-800
          text-gray-700 dark:text-white
          border border-gray-200 dark:border-slate-700
          shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700
          transition-colors"
      >
        {isOpen ? <MdClose size={22} /> : <MdMenu size={22} />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={close} />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 z-40 flex flex-col
          bg-white dark:bg-slate-900
          border-r border-gray-200 dark:border-slate-700/50
          shadow-xl dark:shadow-2xl
          transform transition-transform duration-300 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-gray-100 dark:border-slate-700">
              <img src={logo} alt="TGDC" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-gray-900 dark:text-white font-bold text-base leading-tight">TGDC</h1>
              <p className="text-gray-400 dark:text-slate-400 text-xs">IoT Monitoring Platform</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <SectionLabel>Incubator</SectionLabel>
          <div className="space-y-0.5">
            <NavLink path="/"        label="Dashboard" icon={MdDashboard}        desc="Overview & live data"  active={isActive('/')}        onClick={close} />
            <NavLink path="/control" label="Control"   icon={MdSettings}         desc="Manage actuators"     active={isActive('/control')} onClick={close} />
            <NavLink path="/history" label="History"   icon={MdHistory}          desc="Sensor records"       active={isActive('/history')} onClick={close} />
          </div>

          <SectionLabel>Data Loggers</SectionLabel>
          <div className="space-y-0.5">
            <NavLink path="/data-loggers" label="All Loggers" icon={MdList} desc="View all stations" active={isActive('/data-loggers')} onClick={close} />
          </div>

          <SectionLabel>Account</SectionLabel>
          <div className="space-y-0.5">
            <NavLink path="/profile" label="Profile" icon={MdPerson}            desc="Account settings"       active={isActive('/profile')} onClick={close} />
            {isAdmin && (
              <NavLink path="/admin" label="Admin"   icon={MdAdminPanelSettings} desc="Users, devices & OTA"  active={isActive('/admin')} isAdmin onClick={close} />
            )}
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700/50 space-y-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              bg-gray-50 dark:bg-slate-700/50
              hover:bg-gray-100 dark:hover:bg-slate-700
              text-gray-600 dark:text-slate-300
              hover:text-gray-900 dark:hover:text-white
              transition-all text-sm font-medium"
          >
            <span className="text-base w-5 text-center">{darkMode ? '☀️' : '🌙'}</span>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* User row */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                {avatarLetter}
              </div>
              {isAdmin && (
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${isSuperAdmin ? 'bg-purple-500' : 'bg-amber-500'}`}>
                  <MdShield size={7} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">{displayName}</p>
                {isSuperAdmin && (
                  <span className="flex-shrink-0 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/25 px-1.5 py-0.5 rounded-md leading-none">
                    super admin
                  </span>
                )}
                {!isSuperAdmin && isAdmin && (
                  <span className="flex-shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/25 px-1.5 py-0.5 rounded-md leading-none">
                    admin
                  </span>
                )}
              </div>
              <p className="text-gray-400 dark:text-slate-400 text-xs truncate">{user?.email || user?.username}</p>
            </div>
            <button
              onClick={async () => { try { await authAPI.logout(); } catch {} logout(); }}
              className="p-1.5 rounded-lg text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0"
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
