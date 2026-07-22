import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // بعد از رفرش موفق فقط توکن‌ها آپدیت می‌شن
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          isAuthenticated: !!accessToken,
        }),

      // بعد از لاگین موفق، هم توکن‌ها و هم اطلاعات کاربر ست میشه
      loginSuccess: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      // بررسی دسترسی بر اساس permissions برگشتی از بک‌اند
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.isSuperAdmin) return true;
        return user.permissions?.includes(permission) ?? false;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);