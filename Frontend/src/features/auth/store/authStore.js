import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * استورِ احراز هویت — فقط چیزهایی که *فقط* اینجا می‌توانند باشند:
 * توکن‌ها و انتخابِ کاربر.
 *
 * ⚠️ هویتِ کاربر (نام، واحد، تیم، مجوزها) عمداً اینجا **نیست**. پاسخِ
 * `POST api/Account/Login` فقط `TokenDto` است و هیچ اطلاعاتی از کاربر
 * ندارد؛ آن اطلاعات از `GET api/User/GetUserInfo` می‌آید و جایش
 * React Query است (`useSessionQuery`). نگه‌داشتنِ کپی‌اش در localStorage
 * یعنی بعد از هر `UpdateUser`/`ChangeUserTeam` یک نسخه‌ی کهنه بماند که
 * هیچ‌چیز باطلش نمی‌کند.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      /**
       * عضویتِ سازمانیِ *انتخاب‌شده* — فقط یک شناسه، نه خودِ رکورد.
       * خودِ فهرستِ عضویت‌ها از سرور می‌آید و هر بار تازه خوانده می‌شود.
       */
      activeMembershipId: null,

      // بعد از رفرش موفق فقط توکن‌ها آپدیت می‌شن
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          isAuthenticated: !!accessToken,
        }),

      loginSuccess: ({ accessToken, refreshToken }) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          // انتخابِ کاربرِ قبلی به کاربرِ جدید به ارث نمی‌رسد.
          activeMembershipId: null,
        }),

      setActiveMembership: (membershipId) =>
        set({ activeMembershipId: membershipId }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          activeMembershipId: null,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        activeMembershipId: state.activeMembershipId,
      }),
    }
  )
);
