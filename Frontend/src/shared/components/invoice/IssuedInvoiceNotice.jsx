import { ChevronDown, Lock } from "lucide-react";

/**
 * فاکتورِ صادرشده ویرایش نمی‌شود (قفل پیش‌فاکتور). این راهنما به کاربر
 * می‌گوید اشتباه را چطور اصلاح کند — بخش ۳ راهنمای فرانت.
 *
 * بسته است تا وقتی کاربر بخواهد: قبلاً یک کارتِ همیشه‌باز بالای ستونِ
 * کناری بود و پرداخت و وضعیت را پایین می‌برد.
 *
 * @param movedLabel «ارسال» برای فروش، «دریافت» برای خرید.
 */
export default function IssuedInvoiceNotice({ movedLabel }) {
  return (
    <details className="group rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-card-foreground [&::-webkit-details-marker]:hidden">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        فاکتور صادر شده و قفل است؛ اشتباه را چطور اصلاح کنم؟
        <ChevronDown className="h-3.5 w-3.5 shrink-0 ms-auto transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 space-y-1.5">
        <ul className="list-disc pr-4 space-y-1">
          <li>
            اگر هنوز کالایی {movedLabel} نشده: فاکتور را لغو و فاکتورِ درست را
            دوباره ثبت کنید. پولِ جابه‌جاشده روی فاکتورِ لغوشده می‌ماند و باید با
            «پول برگشتی» برگردانده شود.
          </li>
          <li>اگر کالا جابه‌جا شده: از مسیر مرجوعی اقدام کنید.</li>
        </ul>
        <p>پرداخت‌ها، وضعیت، پیوست‌ها و مهلت پرداخت همچنان قابل تغییرند.</p>
      </div>
    </details>
  );
}
