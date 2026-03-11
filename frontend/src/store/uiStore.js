import { create } from 'zustand';
import { storageService } from '../services/storage';

export const useUIStore = create((set) => ({
  darkMode: storageService.getTheme() === 'dark',
  showCommandHistory: false,
  wsConnected: false,
  connectionStatus: 'disconnected',
  lastConnectionError: null,

  toggleTheme: () => {
    set((state) => {
      const newDarkMode = !state.darkMode;
      storageService.setTheme(newDarkMode ? 'dark' : 'light');
      return { darkMode: newDarkMode };
    });
  },

  setDarkMode: (darkMode) => {
    storageService.setTheme(darkMode ? 'dark' : 'light');
    set({ darkMode });
  },

  toggleCommandHistory: () => {
    set((state) => ({ showCommandHistory: !state.showCommandHistory }));
  },

  setWSConnected: (connected) => {
    set({
      wsConnected: connected,
      connectionStatus: connected ? 'connected' : 'disconnected',
    });
  },

  setConnectionError: (error) => {
    set({
      wsConnected: false,
      connectionStatus: 'error',
      lastConnectionError: error,
    });
  },
}));
