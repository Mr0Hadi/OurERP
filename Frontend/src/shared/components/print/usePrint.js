// src/shared/components/print/usePrint.js
import { useCallback, useEffect } from "react";

/**
 * چاپ با پرینتر معمولی از طریق خود مرورگر.
 *
 * این تابع «مسیر خروجی» است و عمداً از محتوا بی‌خبر: هر چیزی که داخل
 * [data-print-root] باشد چاپ می‌شود. مسیر خروجی دوم (تولید PDF برای
 * پرینتر حرارتی) بعداً به‌صورت یک output دیگر با همین امضا اضافه
 * می‌شود و در shared/services/pdf می‌نشیند؛ مصرف‌کننده‌ها تغییری
 * نمی‌کنند.
 */
export function browserPrintOutput({ pageSize, pageMarginMm }) {
  const style = document.createElement("style");
  style.setAttribute("data-print-page-rule", "");
  style.textContent = `@page { size: ${pageSize}; margin: ${pageMarginMm}mm; }`;
  document.head.appendChild(style);
  document.body.classList.add("printing");

  const cleanup = () => {
    document.body.classList.remove("printing");
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();

  // اگر مرورگر afterprint را ندهد (بعضی محیط‌ها)، پاک‌سازی نباید معلق
  // بماند وگرنه بقیه‌ی برنامه نامرئی می‌ماند.
  setTimeout(cleanup, 1000);
}

export function usePrint(output = browserPrintOutput) {
  useEffect(() => () => document.body.classList.remove("printing"), []);

  return useCallback((options) => output(options), [output]);
}
