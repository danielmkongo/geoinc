import { useAuthStore } from '../store/authStore';

console.log('useAuth.js loading...');

export const useAuth = () => {
  console.log('useAuth hook called');
  try {
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const setError = useAuthStore((state) => state.setError);
    const setLoading = useAuthStore((state) => state.setLoading);

    console.log('useAuth values retrieved', { isAuthenticated, user: user?.username });

    return {
      user,
      token,
      isAuthenticated,
      login,
      logout,
      setError,
      setLoading,
    };
  } catch (error) {
    console.error('useAuth error:', error);
    throw error;
  }
};
