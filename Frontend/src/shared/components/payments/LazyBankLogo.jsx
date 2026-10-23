import { Suspense, lazy } from "react";

/**
 * آیکن‌های بانک (~۴۳۰KB) فقط وقتی بار می‌شوند که واقعاً بانکی برای نشان‌دادن هست؛ بدونِ lazy در باندلِ هر
 * صفحه‌ای که شماره‌ی کارت یا نامِ بانک نشان می‌دهد (فرم‌های پرداخت، صندوق و بانک) می‌نشست.
 */
const BankLogo = lazy(() =>
  import("@/shared/components/ui/bank-input").then((module) => ({ default: module.BankLogo })),
);

/**
 * لوگوی بانک برای جاهایی که شماره‌ی کارت، شبا یا نامِ بانک فقط نمایش داده می‌شود. بانک را مصرف‌کننده پیدا
 * می‌کند (`getIranianBank` از `src/shared/lib/iranian-bank.js`).
 *
 * @param bank     خروجیِ `getIranianBank*`؛ نبودنش یعنی `fallback`
 * @param fallback چیزی که بی‌بانک (صندوق، نامِ ناشناخته) یا تا رسیدنِ آیکن دیده می‌شود
 */
export default function LazyBankLogo({ bank, fallback = null, className }) {
  if (!bank) return fallback;
  return (
    <Suspense fallback={fallback}>
      <BankLogo bank={bank} className={className} />
    </Suspense>
  );
}
