import { useState } from "react";

import { Collapsible, CollapsibleContent } from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/lib/utils";

/**
 * پنلِ بازشونده‌ی فیلترها با انیمیشنِ ارتفاع (`Collapsible`ِ Radix: ارتفاعِ واقعی را اندازه می‌گیرد و بعد از
 * انیمیشنِ بستن unmount می‌کند، پس فیلترهای بسته هزینه‌ی رندر ندارند).
 *
 * `overflow-hidden` فقط *در حینِ* انیمیشن است: تقویمِ `PersianDatePicker` پورتال ندارد و داخلِ همین پنل
 * باز می‌شود؛ پنلِ بازِ بُریده آن را می‌بُرید.
 *
 * @param open      باز یا بسته — state دستِ والد است (دکمه‌ی «فیلترها» جای دیگری است)
 * @param className کلاسِ قابِ محتوا (حاشیه، پس‌زمینه، چیدمان)
 */
export default function FilterCollapse({ open, className, children }) {
  // انیمیشن تمام شده و پنل باز مانده — فقط آن وقت محتوا می‌تواند از قاب بیرون بزند.
  const [settled, setSettled] = useState(open);

  // رویدادِ انیمیشنِ فرزندان (اسپینر، پاپ‌اورِ پورتال‌شده) هم تا اینجا bubble می‌کند.
  const own = (handler) => (event) => {
    if (event.target === event.currentTarget) handler();
  };

  return (
    <Collapsible open={open}>
      <CollapsibleContent
        onAnimationStart={own(() => setSettled(false))}
        onAnimationEnd={own(() => setSettled(open))}
        className={cn(
          "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
          // بی انیمیشن رویدادِ پایان هم نمی‌آید؛ پنلِ باز همان لحظه آزاد است.
          "motion-reduce:animate-none motion-reduce:data-[state=open]:overflow-visible",
          !(open && settled) && "overflow-hidden",
        )}
      >
        <div
          className={cn(
            "transition-opacity duration-200 motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
            className,
          )}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
