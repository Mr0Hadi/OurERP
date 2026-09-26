import { useMemo } from "react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { buildDashboardContext } from "../domain/dashboardContext";

/**
 * زمینه‌ی داشبورد برای کاربرِ واردشده.
 *
 * `isPending` جدا برگردانده می‌شود: تا دسترسی‌ها نیامده‌اند، زمینه
 * «کاربرِ بی‌دسترسی» است و اگر صفحه همان لحظه رندر شود، یک داشبوردِ
 * خالی چشمک می‌زند و بعد پر می‌شود.
 */
export function useDashboardContext() {
  const user = useCurrentUser();
  const { names, isPending } = usePermission();

  const context = useMemo(
    () => buildDashboardContext(user, names),
    [user, names],
  );

  return { context, isPending: isPending || !user };
}
