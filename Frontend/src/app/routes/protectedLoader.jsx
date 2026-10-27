import { redirect } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/shared/constants/routes";

// تا وقتی نشست در همین بارگذاری تأیید نشده، هیچ صفحه‌ی محافظت‌شده‌ای رندر
// نمی‌شود: اول صفحه‌ی ورود، که توکنِ ذخیره‌شده را با سرور می‌سنجد.
// بعد از بازنشانیِ رمز توسطِ مدیر (`mustChangePassword`) سرور جز تغییرِ رمز چیزی
// نمی‌پذیرد؛ اول آن صفحه.
export function protectedLoader({ request }) {
  const { sessionVerified, mustChangePassword } = useAuthStore.getState();
  if (!sessionVerified || mustChangePassword) {
    const url = new URL(request.url);
    const params = new URLSearchParams({ from: url.pathname + url.search });
    const target = sessionVerified ? ROUTES.CHANGE_PASSWORD : ROUTES.LOGIN;
    return redirect(`${target}?${params.toString()}`);
  }

  return null;
}
