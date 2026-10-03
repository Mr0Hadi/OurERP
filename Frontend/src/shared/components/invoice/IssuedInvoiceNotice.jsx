import { CircleHelp } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

/**
 * راهنمای اصلاحِ اشتباه روی فاکتورِ صادرشده (قفل پیش‌فاکتور) — یک دکمه‌ی کوچک
 * که راهنما را در یک پنجره‌ی کوچک باز می‌کند. قبلاً یک کارتِ همیشه‌باز بود و
 * جای زیادی می‌گرفت.
 *
 * @param movedLabel «ارسال» برای فروش، «دریافت» برای خرید.
 */
export default function IssuedInvoiceNotice({ movedLabel }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          <CircleHelp className="h-3.5 w-3.5" />
          اصلاحِ اشتباه
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="space-y-1.5 text-xs text-muted-foreground">
        <p className="font-medium text-card-foreground">
          فاکتورِ صادرشده ویرایش نمی‌شود.
        </p>
        <ul className="list-disc pr-4 space-y-1">
          <li>
            اگر هنوز کالایی {movedLabel} نشده: فاکتور را لغو و فاکتورِ درست را
            دوباره ثبت کنید. پولِ جابه‌جاشده با «پول برگشتی» برگردانده می‌شود.
          </li>
          <li>اگر کالا جابه‌جا شده: از مسیر مرجوعی اقدام کنید.</li>
        </ul>
        <p>پرداخت‌ها، وضعیت، پیوست‌ها و سررسید همچنان قابل تغییرند.</p>
      </PopoverContent>
    </Popover>
  );
}
