// src/shared/store/navigationStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNavigationStore = create(
  persist(
    (set, get) => ({
      currentPath: null,
      previousPath: null,
      returnPath: null,

      setCurrentPath: (path) => {
        const { currentPath } = get();
        if (currentPath !== path) {
          set({ previousPath: currentPath, currentPath: path });
        }
      },

      setReturnPath: (path) => set({ returnPath: path }),
      clearReturnPath: () => set({ returnPath: null }),

      reset: () => set({ currentPath: null, previousPath: null, returnPath: null }),
    }),
    {
      name: 'navigation-storage',
      partialize: (state) => ({ returnPath: state.returnPath }),
    }
  )
);

export const isComingFrom = (path) =>
  useNavigationStore.getState().previousPath === path;
