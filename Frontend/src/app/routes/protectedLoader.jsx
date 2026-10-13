import { redirect } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/shared/constants/routes";

// تا وقتی نشست در همین بارگذاری تأیید نشده، هیچ صفحه‌ی محافظت‌شده‌ای رندر
// نمی‌شود: اول صفحه‌ی ورود، که توکنِ ذخیره‌شده را با سرور می‌سنجد.
export function protectedLoader({ request }) {
  if (!useAuthStore.getState().sessionVerified) {
    const url = new URL(request.url);
    const params = new URLSearchParams({ from: url.pathname + url.search });
    return redirect(`${ROUTES.LOGIN}?${params.toString()}`);
  }

  return null;
}
