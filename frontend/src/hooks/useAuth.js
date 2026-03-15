import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const setError = useAuthStore((state) => state.setError);
  const setLoading = useAuthStore((state) => state.setLoading);

  return { user, token, isAuthenticated, login, logout, setError, setLoading };
};
