import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

export const useTheme = () => {
  const darkMode = useUIStore((state) => state.darkMode);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return { darkMode, toggleTheme };
};
