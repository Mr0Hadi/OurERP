import { useLayoutEffect, useRef } from "react";

import { pxToMm } from "./paper";

/**
 * برگه‌ی «جاری»: محتوایی که مرورگر خودش بینِ صفحه‌ها می‌شکند (لیست قیمت‌ها،
 * گزارش، …)، روی کاغذی که `geometry` (`pageGeometryOf`) می‌گوید.
 *
 * روی صفحه‌نمایش یک ورقِ سفید به عرضِ کاغذ با حاشیه‌ی واقعی است و جای
 * شکستِ هر صفحه با خطِ‌چین نشان داده می‌شود. در چاپ حاشیه را `@page` می‌دهد
 * (`flowPrintOptions`) و خودِ ورق بی‌حاشیه است (`print.css`)؛ پس حاشیه دو
 * بار حساب نمی‌شود.
 *
 * ارتفاعِ محتوا اندازه گرفته و با `onMeasure(heightMm)` گزارش می‌شود: شمارِ
 * صفحه‌ها و طولِ کاغذِ رول از همین عدد می‌آید. `transform`ِ بزرگ‌نماییِ
 * پیش‌نمایش روی `offsetHeight` اثر ندارد، پس عدد همیشه اندازه‌ی واقعی است.
 */
export default function FlowSheet({ geometry, pageCount = 1, onMeasure, children }) {
  const contentRef = useRef(null);
  const onMeasureRef = useRef(onMeasure);

  useLayoutEffect(() => {
    onMeasureRef.current = onMeasure;
  });

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;
    const report = () => onMeasureRef.current?.(pxToMm(node.offsetHeight));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div data-print-root>
      <div
        className="print-flow relative bg-white text-black shadow-sm"
        style={{
          width: `${geometry.widthMm}mm`,
          minHeight: geometry.isRoll ? undefined : `${geometry.heightMm}mm`,
          padding: `${geometry.marginMm}mm`,
        }}
      >
        <div ref={contentRef} className="print-flow__content">
          {children}
        </div>

        {/* جای شکستِ صفحه‌ها؛ فقط روی صفحه‌نمایش. */}
        {!geometry.isRoll &&
          Array.from({ length: pageCount - 1 }, (_, index) => (
            <div
              key={index}
              aria-hidden
              className="print-flow__break pointer-events-none absolute inset-x-0 border-t border-dashed border-primary"
              style={{ top: `${geometry.marginMm + (index + 1) * geometry.contentHeightMm}mm` }}
            >
              <span className="absolute -top-2.5 start-1 rounded bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
                صفحه‌ی {(index + 2).toLocaleString("fa-IR")}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
