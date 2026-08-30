// src/shared/components/charts/useChartSize.js
import { useEffect, useRef, useState } from "react";

/**
 * عرضِ واقعیِ ظرفِ نمودار بر حسبِ پیکسل.
 *
 * جایگزینِ ساده‌اش این بود که SVG یک `viewBox` ثابت داشته باشد و با
 * `width:100%` کش بیاید. ولی آن‌وقت *همه‌چیز* کش می‌آید: ضخامتِ خطوط،
 * اندازه‌ی فونتِ برچسب‌ها و شعاعِ نقطه‌ها. در یک داشبورد که کارت‌ها
 * عرض‌های مختلف دارند، نتیجه نمودارهایی با فونت‌های ناهم‌اندازه است.
 *
 * پس اندازه را اندازه می‌گیریم و SVG را با پیکسلِ واقعی می‌کشیم.
 * مقدارِ اولیه‌ی غیرصفر عمدی است تا در اولین رندر (قبل از اجرای
 * ObserverـResize) نمودار با عرضِ صفر یک‌بار بپرد.
 */
export function useChartSize(initialWidth = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
