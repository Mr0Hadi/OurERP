// src/features/auth/services/queries.js
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ─── درزِ تعویضِ mock و سرور ──────────────────────────────────────────────
// همان قراردادی که `employees`/`departments`/`teams` دارند: مهاجرت به
// بک‌اند یعنی عوض‌کردنِ همین یک خط. دو ماژول سطحِ دقیقاً یکسانی دارند.
import { login, logout, fetchSession } from "./api-mockData";
// import { login, logout, fetchSession } from "./api-v1";

import { authKeys } from "./queryKeys";
import { useAuthStore } from "../store/authStore";

export function useLoginMutation() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  return useMutation({
    mutationFn: login,
    // فقط توکن‌ها: پاسخِ `Account/Login` هیچ اطلاعاتی از کاربر ندارد و
    // نباید هم داشته باشد — هویت از `GetUserInfo` می‌آید
    // (`useSessionQuery`)، که همیشه تازه است.
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
 * کاربرِ واردشده به‌همراه عضویت‌های سازمانی‌اش.
 *
 * منبعش `GET api/User/GetUserInfo` است — همان چیزی که تیم بکند گفت:
 * پاسخِ `POST api/Account/Login` فقط توکن است و قرار هم نیست هویت
 * بدهد. برای همین `authStore` اصلاً فیلدِ `user` ندارد؛ هویت داده‌ی
 * سرور است و جایش کش React Query، نه localStorage.
 *
 * `enabled` به توکن گره خورده تا قبل از ورود درخواستِ ۴۰۱ فرستاده نشود.
 * `staleTime` بلند است چون عضویتِ یک کاربر در طولِ یک نشست عوض نمی‌شود؛
 * اگر شد (`ChangeUserTeam`)، همان mutation باید این کلید را باطل کند.
 */
export function useSessionQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: authKeys.session(),
    queryFn: fetchSession,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * نشست + عضویتِ *انتخاب‌شده*، برای هر کامپوننتی که به «کاربر الان در چه
 * جایگاهی است» کار دارد.
 *
 * انتخاب در استور فقط یک شناسه است، پس اگر آن عضویت دیگر وجود نداشته
 * باشد (کاربر جابه‌جا شده و انتخابِ کهنه در localStorage مانده) بی‌سروصدا
 * به اولین عضویت برمی‌گردیم — نه خطا، و نه یک هدرِ خالی.
 */
export function useActiveMembership() {
  const query = useSessionQuery();
  const activeMembershipId = useAuthStore((s) => s.activeMembershipId);

  const memberships = query.data?.memberships ?? [];
  const active =
    memberships.find((item) => item.id === activeMembershipId) ??
    memberships[0] ??
    null;

  return { ...query, memberships, activeMembership: active };
}
