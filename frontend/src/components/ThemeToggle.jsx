import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { MdDarkMode, MdLightMode } from 'react-icons/md';

export const ThemeToggle = () => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? (
        <MdLightMode className="text-2xl text-yellow-400" />
      ) : (
        <MdDarkMode className="text-2xl text-slate-700" />
      )}
    </button>
  );
};
