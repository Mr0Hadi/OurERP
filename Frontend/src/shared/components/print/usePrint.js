import { useCallback, useEffect } from "react";

/** پاک‌کردنِ قاعده‌ی @page و کلاسِ printing که چاپِ قبلی گذاشته. */
function clearPrintState() {
  document.body.classList.remove("printing");
  document.querySelectorAll("style[data-print-page-rule]").forEach((node) => node.remove());
}

/**
 * چاپ با پرینتر معمولی از طریق خود مرورگر.
 *
 * این تابع «مسیر خروجی» است و عمداً از محتوا بی‌خبر: هر چیزی که داخل
 * [data-print-root] باشد چاپ می‌شود. مسیر خروجی دوم (تولید PDF برای
 * پرینتر حرارتی) بعداً به‌صورت یک output دیگر با همین امضا اضافه
 * می‌شود و در shared/services/pdf می‌نشیند؛ مصرف‌کننده‌ها تغییری
 * نمی‌کنند.
 *
 * حالتِ چاپ تا بسته‌شدنِ پورتال (unmountِ هوک) می‌ماند، نه تا afterprint:
 * در کرومِ اندروید window.print() منتظر نمی‌ماند و afterprint فوراً می‌آید،
 * پس پیش‌نمایشِ چاپ بعد از پاک‌سازی ساخته می‌شد و به‌جای ورق‌ها دیالوگِ
 * تأییدِ چاپ بیرون می‌آمد. قواعد فقط در `@media print` اثر دارند، پس
 * ماندنشان روی صفحه‌نمایش بی‌اثر است.
 */
function browserPrintOutput({ pageSize, pageMarginMm }) {
  clearPrintState();
  const style = document.createElement("style");
  style.setAttribute("data-print-page-rule", "");
  style.textContent = `@page { size: ${pageSize}; margin: ${pageMarginMm}mm; }`;
  document.head.appendChild(style);
  document.body.classList.add("printing");
  window.print();
}

export function usePrint(output = browserPrintOutput) {
  useEffect(() => clearPrintState, []);

  return useCallback((options) => output(options), [output]);
}
