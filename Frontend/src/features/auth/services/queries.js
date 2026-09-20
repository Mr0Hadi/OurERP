import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { login, logout, getUserInfo } from "./api-v1";
import { authKeys } from "./queryKeys";
import { useAuthStore } from "../store/authStore";

export function useLoginMutation() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  return useMutation({
    mutationFn: login,
    // فقط توکن‌ها: پاسخِ `Account/Login` هیچ اطلاعاتی از کاربر ندارد و
    // نباید هم داشته باشد — هویت از `GetUserInfo` می‌آید
    // (`useUserInfoQuery`)، که همیشه تازه است.
    onSuccess: ({ accessToken, refreshToken }) =>
      loginSuccess({ accessToken, refreshToken }),
  });
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    // `onSettled` و نه `onSuccess`: اگر درخواستِ خروج شکست بخورد (سرور
    // خواب است، توکن منقضی شده) کاربر باید باز هم از این دستگاه خارج
    // شود. نگه‌داشتنِ نشستِ محلی بعد از «خروج» بدترین حالتِ ممکن است.
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

/**
 * کاربرِ واردشده — `UserInfoDto`ی `GET api/User/GetUserInfo`، همان‌طور که
 * سرور می‌فرستد.
 *
 * `POST api/Account/Login` فقط توکن است و قرار هم نیست هویت بدهد؛ برای
 * همین `authStore` اصلاً فیلدِ `user` ندارد و هویت داده‌ی سرور است با کشِ
 * React Query، نه localStorage.
 *
 * `enabled` به توکن گره خورده تا قبل از ورود درخواستِ ۴۰۱ فرستاده نشود.
 *
 * برخلافِ `staleTime: 0`ِ سراسری، اینجا یک `staleTime` مشخص گذاشته شده:
 * هویتِ کاربر و واحدش برخلافِ داده‌های تراکنشی به‌ندرت تغییر می‌کنند، پس
 * نیازی نیست هر mount/focus دوباره از سرور خوانده شود. هر جایی که ممکن
 * است جایگاهِ یک کارمند عوض شود (`useUpdateUserMutation`,
 * `useChangeUserTeamMutation`) این کوئری را صریحاً invalidate می‌کند؛
 * `useLogoutMutation` هم با `queryClient.clear()` کاملاً پاکش می‌کند.
 */
export function useUserInfoQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: getUserInfo,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 10 * 60 * 1000, // ۱۰ دقیقه
  });
}
