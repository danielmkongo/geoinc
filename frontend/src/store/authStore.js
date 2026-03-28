import { create } from 'zustand';
import { storageService } from '../services/storage';

const initialToken = storageService.getToken();
const initialUser = storageService.getUser();

export const useAuthStore = create((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!initialToken,
  isLoading: false,
  error: null,

  setUser: (user) => {
    storageService.setUser(user);
    set({ user });
  },

  setToken: (token) => {
    storageService.setToken(token);
    set({ token, isAuthenticated: !!token });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  logout: () => {
    storageService.removeToken();
    storageService.removeUser();
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  login: (user, token) => {
    storageService.setUser(user);
    storageService.setToken(token);
    set({ user, token, isAuthenticated: true, error: null });
  },
}));
