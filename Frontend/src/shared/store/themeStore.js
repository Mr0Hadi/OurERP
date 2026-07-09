// src/shared/store/themeStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light', // 'light' | 'dark' | 'auto'
      
      setTheme: (theme) => {
        set({ theme });
        get().applyTheme(theme);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        get().applyTheme(newTheme);
      },

      applyTheme: (theme) => {
        const root = window.document.documentElement;
        
        if (theme === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', prefersDark);
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
      },

      initTheme: () => {
        const theme = get().theme;
        get().applyTheme(theme);

        // Listen for system theme changes when in auto mode
        if (theme === 'auto') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          mediaQuery.addEventListener('change', (e) => {
            if (get().theme === 'auto') {
              window.document.documentElement.classList.toggle('dark', e.matches);
            }
          });
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);



/* use

import { useThemeStore } from './shared/store/themeStore';
import { useEffect } from 'react';

function App() {
  const { theme, setTheme, toggleTheme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme(); // یک بار در شروع برنامه صدا بزنید
  }, []);

  return (
    <button onClick={toggleTheme}>
      تغییر تم (فعلی: {theme})
    </button>
  );
}
*/