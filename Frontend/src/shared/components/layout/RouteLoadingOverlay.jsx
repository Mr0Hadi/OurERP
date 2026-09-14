import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { Spinner } from "@/shared/components/ui/spinner";
import { onNavigationStart } from "@/shared/lib/routeTransitionBus";

/**
 * تا وقتی مسیرِ URL واقعاً عوض نشده، `location.pathname` هیچ سیگنالی
 * نمی‌دهد — یعنی دقیقاً همان تاخیرِ بینِ کلیک و بالاآمدنِ صفحه‌ی جدید که
 * کاربر می‌بیند و باعث چندبار کلیک‌کردن می‌شود. برای همین این اورلی از
 * لحظه‌ی خودِ کلیک (رویِ `router.navigate`، نگاه کن به routers.jsx) شروع
 * می‌شود، نه از لحظه‌ای که آدرس عوض شده — و به‌محضِ عوض‌شدنِ آدرس هم
 * بی‌درنگ خاموش می‌شود؛ حداقلِ زمانِ نمایشِ ساختگی ندارد تا برایِ
 * صفحاتی که سریع بالا می‌آیند کندیِ الکی ایجاد نکند.
 *
 * سقفِ نمایش صرفاً یک شبکه‌ی ایمنی است: اگر ناوبری به هر دلیلی کامل
 * نشد (خطا، ریدایرکتِ لغوشده)، اسپینر برای همیشه روی صفحه نمی‌ماند.
 */
const MAX_VISIBLE_MS = 4000;

export default function RouteLoadingOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return onNavigationStart(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => setVisible(false), MAX_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    setVisible(false);
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in duration-150">
      <Spinner className="size-10 text-primary drop-shadow-md" />
    </div>
  );
}
