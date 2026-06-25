// src/shared/store/navigationStore.js
import { create } from 'zustand';

export const useNavigationStore = create((set) => ({
  currentPath: null,
  previousPath: null,
  returnPath: null, // مسیری که می‌خوایم به‌صورت دستی ثبت کنیم

  setCurrentPath: (path) =>
    set((state) => ({
      currentPath: path,
      previousPath: state.currentPath,
    })),

  setReturnPath: (path) => set({ returnPath: path }),
  clearReturnPath: () => set({ returnPath: null }),

  reset: () =>
    set({
      currentPath: null,
      previousPath: null,
      returnPath: null,
    }),
}));

export const isComingFrom = (path) =>
  useNavigationStore.getState().previousPath === path;
