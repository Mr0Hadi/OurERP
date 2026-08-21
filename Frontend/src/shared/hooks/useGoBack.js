import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

/**
 * برگشت به صفحه‌ی *قبلی*، نه به لیستِ خودِ صفحه.
 *
 * قبلاً هر صفحه‌ی جزئیات، دکمه‌ی برگشتش را به لیستِ خودش سیم‌کشی
 * می‌کرد. نتیجه‌اش این بود که مثلاً از «صف ارسال انبار» وارد جزئیات یک
 * مرجوعی می‌شدید و دکمه‌ی برگشت شما را به لیستِ مرجوعی‌های فروش
 * می‌برد — جایی که اصلاً از آن نیامده بودید.
 *
 * fallback فقط برای وقتی است که تاریخچه‌ای وجود ندارد (باز کردن مستقیم
 * لینک در تب تازه). React Router روی هر ورودی تاریخچه یک idx می‌گذارد؛
 * idx صفر یعنی همین ورودی، اولین ورودیِ این تب بوده و navigate(-1)
 * کاربر را از اپ بیرون می‌برد.
 */
export function useGoBack(fallback = ROUTES.DASHBOARD) {
  const navigate = useNavigate();

  return useCallback(() => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
