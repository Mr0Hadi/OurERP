import { useUserInfoQuery } from "../services/queries";

/**
 * کاربرِ واردشده.
 *
 * منبعش `useUserInfoQuery` است نه `authStore`: پاسخِ `Account/Login` فقط
 * توکن برمی‌گرداند، پس `store.user` بعد از ورودِ واقعی خالی می‌ماند.
 *
 * تا وقتی نشست نیامده `null` می‌دهد — همان قراردادِ قبلی، تا مصرف‌کننده‌ها
 * (`EmployeeDetailPage`) بدونِ تغییر کار کنند.
 */
export function useCurrentUser() {
  const { data: user } = useUserInfoQuery();

  return user ?? null;
}
