// src/shared/store/headerStore.js
import { create } from 'zustand';

export const useHeaderStore = create((set) => ({
  title: '',
  showBack: false,
  onBack: null,
  setHeader: (config) => set((state) => ({ ...state, ...config })),
  clearHeader: () => set({ title: '', showBack: false, onBack: null }),
}));
