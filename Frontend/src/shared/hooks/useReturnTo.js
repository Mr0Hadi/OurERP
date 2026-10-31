import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useFormDraftStore } from "@/shared/store/formDraftStore";

/** کلیدِ `formDraftStore` برای داده‌ای که به صفحه‌ی مبدأ برمی‌گردد. */
export const returnedDataKey = (path) => `returned:${path}`;

/**
 * مسیرِ بازگشتِ صفحه‌های «ایجاد جدید».
 *
 * صفحه‌ی مبدأ با `navigate(target, { state: { returnTo } })` می‌گوید که
 * بعد از ثبت (یا انصراف) کاربر باید کجا برگردد. اگر کسی مستقیم وارد
 * صفحه شده باشد، `returnTo` وجود ندارد و مسیرِ پیش‌فرضِ فیچر استفاده
 * می‌شود.
 *
 * دو شیوه‌ی برگشت:
 *
 *  - `returnVia: "back"` (از `useSubPageNavigation`): یک قدم عقب در تاریخچه،
 *    و داده (مثلاً `{ newProductId }`) از راهِ `formDraftStore` به مبدأ
 *    می‌رسد. تاریخچه همان می‌ماند که بود؛ با `replace` یک ورودیِ تکراری از
 *    فرمِ مبدأ ساخته می‌شد و «بازگشت» یا «انصراف» دوباره به همان فرم می‌رسید.
 *  - پیش‌فرض: `navigate(returnTo, { state, replace: true })` — صفحه‌ی «جدید»
 *    بعد از ثبت دیگر معنا ندارد و نباید با Back دوباره باز شود.
 */
export function useReturnTo(fallback) {
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo ?? null;
  const viaHistory = location.state?.returnVia === "back";

  const goBack = useCallback(
    (state) => {
      if (returnTo && viaHistory) {
        // حتی بی‌داده (انصراف): خودِ رسیدنِ آن به مبدأ یعنی «برگشته‌ایم».
        useFormDraftStore.getState().saveDraft(returnedDataKey(returnTo), state ?? {});
        navigate(-1);
      } else if (returnTo) navigate(returnTo, { state, replace: true });
      else if (fallback) navigate(fallback);
      else navigate(-1);
    },
    [navigate, returnTo, viaHistory, fallback],
  );

  return { returnTo, hasReturnTo: Boolean(returnTo), goBack };
}
