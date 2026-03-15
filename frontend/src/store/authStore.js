import { create } from 'zustand';
import { storageService } from '../services/storage';

console.log('authStore.js loading...');

const initialToken = storageService.getToken();
const initialUser = storageService.getUser();
console.log('authStore initial state:', {
  token: !!initialToken, 
  user: initialUser?.username,
  isAuthenticated: !!initialToken 
});

export const useAuthStore = create((set) => {
  console.log('Creating auth store');
  
  return {
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
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      });
    },

    login: (user, token) => {
      storageService.setUser(user);
      storageService.setToken(token);
      set({
        user,
        token,
        isAuthenticated: true,
        error: null,
      });
    },
  };
});
