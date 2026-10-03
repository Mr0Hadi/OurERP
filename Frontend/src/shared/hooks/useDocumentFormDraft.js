import { useEffect, useState } from "react";

import { useSubPageNavigation } from "./useSubPageNavigation";

/**
 * چرخه‌ی پیش‌نویسِ فرمِ سندِ خرید/فروش در storeِ فیچر — هم ثبتِ تازه و هم
 * ویرایشِ پیش‌فاکتور.
 *
 *  - سندِ تازه (`doc` خالی): با ورود پیش‌نویس پاک می‌شود، مگر کاربر از صفحه‌ی
 *    ساختِ کالا/طرف‌حساب برگشته باشد (`useSubPageNavigation`). تصمیم فقط
 *    لحظه‌ی ورود گرفته می‌شود؛ اجرای دوباره در StrictMode چیزی را پاک نمی‌کند.
 *  - پیش‌فاکتور: فرم وقتی از سرور پر می‌شود که سند یا نسخه‌اش (`updatedAt`)
 *    عوض شود — ویرایش‌های نذخیره‌شده با برگشت از صفحه‌ی فرعی می‌مانند.
 *
 * @param doc   سندِ ذخیره‌شده، یا `undefined` برای ثبتِ تازه
 * @param store state و کارهای `createDocumentFormStore`
 * @returns `{ openSubPage, returned, ready }` — تا `ready` نشده فرم رندر نشود.
 */
export function useDocumentFormDraft(doc, store) {
  const { initializedForId, resetForm, initializeForNew, initializeFrom } = store;
  const { openSubPage, returned, cameBack } = useSubPageNavigation();
  const [keepDraft] = useState(cameBack);
  const version = doc ? `${doc.id}:${doc.updatedAt}` : "new";

  useEffect(() => {
    if (doc) {
      initializeFrom(doc);
      return;
    }
    if (!keepDraft) resetForm();
    initializeForNew();
    // فقط با عوض شدنِ سند/نسخه؛ نه با هر رندر.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return { openSubPage, returned, ready: initializedForId === version };
}
