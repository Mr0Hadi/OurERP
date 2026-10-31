import { useLayoutEffect, useRef, useState } from "react";

/**
 * جدول در عرضِ قابش جا می‌شود یا نه — برای اینکه `DataTable` به‌جای جدولی که از قاب بیرون می‌زند (تبلت، یا
 * دسکتاپ با سایدبارِ باز) کارت نشان دهد. قابِ `custom-scroll` به سمتِ چپ اسکرول نمی‌شود، پس جدولِ پهن نیمه‌دیدنی بود.
 *
 * عرضِ در دسترس با ResizeObserver روی `wrapRef` (همیشه رندرشده) خوانده می‌شود. وقتی جدول رندر شده، layout effect
 * سرریزش را پیش از نقاشی می‌سنجد و «عرضِ لازم» را نگه می‌دارد؛ تا عرضِ قاب کمتر از آن است کارت‌ها می‌آیند و با بزرگ
 * شدنِ قاب جدول برمی‌گردد. با عوض‌شدنِ `resetKey` (صفحه، تعدادِ ردیف، ستون‌ها) دوباره سنجیده می‌شود.
 *
 * @param {string} resetKey
 * @returns {{ wrapRef, scrollerRef, tableRef, tooNarrow: boolean }}
 */
export function useTableFit(resetKey) {
  const wrapRef = useRef(null);
  const scrollerRef = useRef(null);
  const tableRef = useRef(null);
  const [width, setWidth] = useState(null);
  const [needed, setNeeded] = useState(null);
  const [measuredKey, setMeasuredKey] = useState(resetKey);

  if (measuredKey !== resetKey) {
    setMeasuredKey(resetKey);
    setNeeded(null);
  }

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tooNarrow = needed != null && width != null && width < needed;

  // بعد از تغییرِ عرض، داده (`measuredKey`) یا برگشت از حالتِ کارت، سرریزِ جدول دوباره سنجیده می‌شود.
  useLayoutEffect(() => {
    if (tooNarrow) return;
    const table = tableRef.current;
    const scroller = scrollerRef.current;
    if (!table || !scroller) return;
    const overflow = table.offsetWidth - scroller.clientWidth;
    if (overflow > 1) setNeeded(scroller.offsetWidth + overflow);
  }, [tooNarrow, width, measuredKey]);

  return { wrapRef, scrollerRef, tableRef, tooNarrow };
}
