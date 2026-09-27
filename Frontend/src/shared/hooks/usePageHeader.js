import { useEffect, useLayoutEffect, useRef } from "react";

import { useHeaderStore } from "@/shared/store/headerStore";

/**
 * عنوان و دکمه‌ی «بازگشت» هدرِ اپ برای صفحه‌ی فعلی؛ با خروج از صفحه پاک می‌شود.
 *
 * جای الگوی تکراریِ `useEffect(() => { setHeader(...); return () => clearHeader(); }, [...])`
 * در صفحه‌ها. دو تفاوت عمدی با آن الگو:
 *  - پاک‌کردن فقط هنگامِ خروج است، نه با هر تغییرِ عنوان — عنوان وسطِ
 *    بارگذاری یک لحظه خالی نمی‌شود.
 *  - `onBack` معمولاً یک تابعِ inline است که در هر رندر عوض می‌شود؛ در ref
 *    نگه داشته می‌شود تا هر رندرِ صفحه دوباره store را آپدیت نکند.
 *
 * @param {object} header
 * @param {string} header.title
 * @param {boolean} [header.showBack]
 * @param {() => void} [header.onBack] پیش‌فرضِ هدر: برگشت در تاریخچه
 */
export function usePageHeader({ title, showBack = false, onBack = null }) {
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const onBackRef = useRef(onBack);
  useLayoutEffect(() => {
    onBackRef.current = onBack;
  });
  const hasOnBack = Boolean(onBack);

  useEffect(() => {
    setHeader({
      title,
      showBack,
      onBack: hasOnBack ? () => onBackRef.current?.() : null,
    });
  }, [setHeader, title, showBack, hasOnBack]);

  useEffect(() => clearHeader, [clearHeader]);
}
