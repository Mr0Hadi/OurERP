import { useMatches } from "react-router-dom";

import { satisfies, usePermission } from "@/features/auth/hooks/usePermission";
import ForbiddenPage from "../layouts/ForbiddenPage";

/**
 * گاردِ مسیر بر پایه‌ی `handle.permission` هر route.
 *
 * فیلترِ منو کافی نیست: کاربر می‌تواند آدرس را مستقیم تایپ کند یا
 * بوکمارک داشته باشد. عمیق‌ترین routeی که `handle.permission` دارد
 * تعیین‌کننده است؛ routeِ بدون آن برای هر کاربرِ واردشده باز است.
 *
 * مثل `sessionConfirmed` در `AppLayout`: تا دسترسی‌ها نیامده‌اند چیزی
 * رندر نمی‌شود، وگرنه برای لحظه‌ای «دسترسی ندارید» دیده می‌شد.
 *
 * این فقط UX است؛ بررسیِ واقعی روی endpointها در سرور است.
 */
export default function PermissionGate({ children }) {
  const matches = useMatches();
  const { names, isPending, isError } = usePermission();

  const required = matches.findLast(
    (match) => match.handle?.permission != null,
  )?.handle.permission;

  if (required == null) return children;
  if (isPending) return null;

  // خطای شبکه در گرفتنِ دسترسی‌ها «دسترسی ندارید» نیست؛ صفحه باز می‌شود
  // و خودِ سرور با ۴۰۳ جواب می‌دهد اگر واقعاً دسترسی نباشد.
  if (isError) return children;

  return satisfies(names, required) ? children : <ForbiddenPage />;
}
