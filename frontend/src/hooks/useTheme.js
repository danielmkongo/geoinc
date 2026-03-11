import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

console.log('📦 useTheme.js loading...');

export const useTheme = () => {
  console.log('🎨 useTheme hook called');
  
  try {
    const darkMode = useUIStore((state) => state.darkMode);
    const toggleTheme = useUIStore((state) => state.toggleTheme);

    console.log('✅ useTheme values retrieved', { darkMode });

    useEffect(() => {
      console.log('🎨 Applying theme:', { darkMode });
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, [darkMode]);

    return { darkMode, toggleTheme };
  } catch (error) {
    console.error('❌ useTheme error:', error);
    throw error;
  }
};
