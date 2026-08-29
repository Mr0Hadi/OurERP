// src/shared/hooks/useReturnTo.js
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * مسیرِ بازگشتِ صفحه‌های «ایجاد جدید».
 *
 * صفحه‌ی مبدأ با `navigate(target, { state: { returnTo } })` می‌گوید که
 * بعد از ثبت (یا انصراف) کاربر باید کجا برگردد. اگر کسی مستقیم وارد
 * صفحه شده باشد، `returnTo` وجود ندارد و مسیرِ پیش‌فرضِ فیچر استفاده
 * می‌شود.
 *
 * `replace: true` عمدی است: صفحه‌ی «جدید» بعد از ثبت دیگر معنا ندارد و
 * نباید با دکمه‌ی Back دوباره باز شود.
 */
export function useReturnTo(fallback) {
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo ?? null;

  const goBack = useCallback(
    (state) => {
      if (returnTo) navigate(returnTo, { state, replace: true });
      else if (fallback) navigate(fallback);
      else navigate(-1);
    },
    [navigate, returnTo, fallback],
  );

  return { returnTo, hasReturnTo: Boolean(returnTo), goBack };
}
