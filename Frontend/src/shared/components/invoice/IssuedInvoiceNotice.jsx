import { Lock } from "lucide-react";

/**
 * فاکتورِ صادرشده ویرایش نمی‌شود (قفل پیش‌فاکتور). این پیام به کاربر
 * می‌گوید اشتباه را چطور اصلاح کند — بخش ۳ راهنمای فرانت.
 *
 * @param movedLabel «ارسال» برای فروش، «دریافت» برای خرید.
 */
export default function IssuedInvoiceNotice({ movedLabel }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5 font-medium text-card-foreground">
        <Lock className="h-3.5 w-3.5" />
        این فاکتور صادر شده و قابل ویرایش نیست.
      </p>
      <p>برای اصلاحِ اشتباه:</p>
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
  );
}
