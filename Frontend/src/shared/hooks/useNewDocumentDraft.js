import { useEffect, useState } from "react";

import { useSubPageNavigation } from "./useSubPageNavigation";

/**
 * پیش‌نویسِ فرمِ «ثبتِ سندِ جدید» (خرید، فروش) که در storeِ خودِ فیچر
 * نگه داشته می‌شود.
 *
 * با ورود به صفحه پیش‌نویس پاک می‌شود، مگر کاربر از صفحه‌ی ساختِ کالا یا
 * طرف‌حسابِ تازه برگشته باشد (`useSubPageNavigation`). تصمیم فقط یک بار و
 * لحظه‌ی ورود گرفته می‌شود؛ پس اجرای دوباره‌ی افکت در StrictMode چیزی را
 * پاک نمی‌کند.
 *
 * @param {object} options
 * @param {() => void} options.reset      پاک‌کردنِ پیش‌نویس
 * @param {() => void} options.initialize آماده‌کردنِ فرمِ خالی (بی‌اثر اگر آماده است)
 * @returns `{ openSubPage, returned }` — همان `useSubPageNavigation`
 */
export function useNewDocumentDraft({ reset, initialize }) {
  const { openSubPage, returned, cameBack } = useSubPageNavigation();
  const [keepDraft] = useState(cameBack);

  useEffect(() => {
    if (!keepDraft) reset();
    initialize();
    // فقط لحظه‌ی ورود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { openSubPage, returned };
}
