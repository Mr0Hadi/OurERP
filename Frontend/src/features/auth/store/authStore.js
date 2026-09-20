import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * استورِ احراز هویت — فقط چیزی که *فقط* اینجا می‌تواند باشد: توکن‌ها.
 *
 * ⚠️ هویتِ کاربر (نام، واحد، تیم، مجوزها) عمداً اینجا **نیست**. پاسخِ
 * `POST api/Account/Login` فقط `TokenDto` است و هیچ اطلاعاتی از کاربر
 * ندارد؛ آن اطلاعات از `GET api/User/GetUserInfo` می‌آید و جایش
 * React Query است (`useUserInfoQuery`). نگه‌داشتنِ کپی‌اش در localStorage
 * یعنی بعد از هر `UpdateUser`/`ChangeUserTeam` یک نسخه‌ی کهنه بماند که
 * هیچ‌چیز باطلش نمی‌کند.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      // تا rehydrate از localStorage تمام نشده، isAuthenticated پیش‌فرضِ
      // false غیرقابل‌اعتماده — رندر کردنِ روت‌ها قبل از این یعنی کاربرِ
      // واردشده هم برای یک لحظه به لاگین پرتاب بشه (یا برعکس).
      hasHydrated: false,

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
        }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// وقتی تبِ دیگری همین اپ توکن‌ها را رفرش/logout می‌کند، `auth-storage` در
// localStorage عوض می‌شود ولی state زوستاندِ این تب خودش را sync نمی‌کند
// (zustand persist بین تب‌ها هیچ ارتباطی برقرار نمی‌کند). بدون این listener،
// این تب با یک refreshToken قدیمی که سرور همین الان rotate کرده دوباره
// رفرش می‌زند، رد می‌شود، و کاربر را از یک تبِ کاملاً معتبر هم بیرون می‌اندازد.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "auth-storage" && event.storageArea === localStorage) {
      useAuthStore.persist.rehydrate();
    }
  });
}
