import { create } from 'zustand';

/**
 * هدرِ اپ برای صفحه‌ی فعلی: عنوان، دکمه‌ی بازگشت و جای دکمه‌های صفحه.
 *
 * `actionsSlot` گرهِ DOMِ همان جا در هدر است که `AppLayout` می‌سازد؛ صفحه‌ها
 * دکمه‌هایشان را با `PageHeaderActions` (پورتال) آن‌جا می‌گذارند. خودِ المانِ React در
 * store نمی‌رود — فقط گرهِ مقصد.
 */
export const useHeaderStore = create((set) => ({
  title: '',
  showBack: false,
  onBack: null,
  actionsSlot: null,
  setHeader: (config) => set((state) => ({ ...state, ...config })),
  setActionsSlot: (actionsSlot) => set({ actionsSlot }),
  clearHeader: () => set({ title: '', showBack: false, onBack: null }),
}));
