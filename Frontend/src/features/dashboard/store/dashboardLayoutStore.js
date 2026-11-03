import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * چیدمانِ داشبوردِ هر کاربر: `{ [userId]: { order, hidden } }`.
 *
 * کلید `userId` است نه «کاربرِ این مرورگر»: یک سیستمِ فروشگاهی معمولاً
 * چند نفر پشتِ یک کامپیوتر دارد و هرکس باید با ورود، داشبوردِ *خودش* را
 * ببیند. `useLogoutMutation` این استور را پاک نمی‌کند — چیدمان ترجیحِ
 * کاربر است، نه دادهٔ نشست.
 *
 * فقط *انتخاب‌ها* اینجاست، نه چیدمانِ نهایی: `resolveLayout` هر بار آن را
 * با دسترسی‌های امروزِ کاربر تطبیق می‌دهد. برای همین ذخیره‌ی یک ویجتِ
 * از دست‌رفته بی‌خطر است.
 *
 * نسخه‌ی اصلی روی سرور است (`useDashboardLayout`، بندِ ۶.۳)؛ این‌جا فقط کشِ مرورگر برای نمایشِ فوری
 * و وقتی سرور در دسترس نیست.
 */
export const useDashboardLayoutStore = create(
  persist(
    (set) => ({
      layouts: {},

      saveLayout: (userId, layout) =>
        set((state) => ({
          layouts: { ...state.layouts, [userId]: layout },
        })),

      resetLayout: (userId) =>
        set((state) => {
          const layouts = { ...state.layouts };
          delete layouts[userId];
          return { layouts };
        }),
    }),
    {
      name: "dashboard-layout",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
