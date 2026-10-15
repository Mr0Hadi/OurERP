import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { useActiveFilterCount } from "@/shared/hooks/useActiveFilterCount";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * پوسته‌ی واکنش‌گرای فیلترها.
 *
 * دسکتاپ: همان کارتِ فیلترِ همیشگی (`children`).
 * موبایل (مثلِ صفحه‌ی دانه‌ها): `primary` بالا در تمامِ عرض، زیرش `secondary` کنارِ
 * دکمه‌ی «فیلترها» (با نشانِ تعدادِ فیلترهای فعال)، و بقیه‌ی فیلترها در پنلِ
 * بازشونده‌ی زیرِ همان ردیف — نه شیتِ کشوییِ پایینِ صفحه.
 * بدونِ `secondary`، خودِ `primary` کنارِ دکمه می‌نشیند.
 *
 * @param primary   کنترلی که در موبایل همیشه دیده می‌شود (معمولاً جست‌وجو)
 * @param secondary کنترلِ دومِ همیشه‌پیدا (موبایل)، کنارِ دکمه‌ی فیلترها
 * @param store     استورِ `createFilterStore` برای شمارشِ فیلترهای فعال
 * @param onReset   پاک کردنِ همه‌ی فیلترها
 */
export function ResponsiveFilters({ primary, secondary, store, onReset, children, className = "" }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const activeCount = useActiveFilterCount(store);

  if (!isMobile) {
    return (
      <div className={`p-3 bg-card border border-border rounded-xl shadow-sm space-y-3 ${className}`}>
        {primary}
        {secondary}
        {children}
      </div>
    );
  }

  const besideToggle = secondary ?? primary;
  const toggle = (
    <Button
      type="button"
      variant={open ? "secondary" : "outline"}
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      className="h-10 shrink-0 gap-1.5 rounded-xl px-3"
    >
      <SlidersHorizontal className="size-4" />
      فیلترها
      {activeCount > 0 && (
        <span className="min-w-5 rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground tabular-nums">
          {formatNumber(activeCount)}
        </span>
      )}
      <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </Button>
  );

  return (
    // برچسب‌ها در نوارِ فشرده جا نمی‌گیرند؛ placeholder کافی است.
    <div className="space-y-2">
      {secondary && <div className="[&_label]:sr-only">{primary}</div>}

      <div className="flex items-center gap-2">
        {besideToggle && (
          <div className="min-w-0 flex-1 [&_input]:h-10 [&_input]:rounded-xl [&_label]:sr-only">
            {besideToggle}
          </div>
        )}
        {toggle}
      </div>

      {open && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-3">
          {children}
          {onReset && (
            <div className="flex gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onReset} disabled={!activeCount}>
                حذف فیلترها
              </Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
                بستن
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * پوسته‌ی مشترک نوار فیلترها.
 *
 * children  - ردیف اول (جست‌وجو، انتخاب‌ها)
 * dateRow   - ردیف دوم (بازه‌ی تاریخ)؛ دکمه‌ی ریست خودکار به انتهای آن اضافه می‌شود
 * onReset   - پاک کردن همه‌ی فیلترها
 * primary/store - رفتارِ موبایل (`ResponsiveFilters`)
 */
export default function FilterPanel({
  children,
  dateRow,
  onReset,
  primary,
  store,
  firstRowClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  dateRowClassName = "grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-border",
  resetWrapperClassName = "flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end",
  resetButtonClassName = "w-full px-4",
}) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveFilters primary={isMobile ? primary : null} store={store} onReset={onReset}>
      <div className={firstRowClassName}>
        {!isMobile && primary}
        {children}
      </div>

      {(dateRow || !isMobile) && (
        <div className={dateRowClassName}>
          {dateRow}
          {/* در موبایل ریست در پایینِ پنلِ بازشونده است. */}
          {!isMobile && (
            <div className={resetWrapperClassName}>
              <Button
                type="button"
                variant="outline"
                onClick={onReset}
                className={resetButtonClassName}
              >
                حذف همه فیلترها
              </Button>
            </div>
          )}
        </div>
      )}
    </ResponsiveFilters>
  );
}
