import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { useActiveFilterCount } from "@/shared/hooks/useActiveFilterCount";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * پوسته‌ی واکنش‌گرای فیلترها.
 *
 * دسکتاپ: همان کارتِ فیلترِ همیشگی (`children`).
 * موبایل: فقط `primary` (معمولاً جست‌وجو) در صفحه می‌ماند و بقیه در یک
 * bottom-sheet پشتِ دکمه‌ی «فیلترها» با نشانِ تعدادِ فیلترهای فعال — قبلاً
 * فیلترها کلِ صفحه‌ی گوشی را می‌گرفتند و جدول زیرشان گم می‌شد.
 *
 * فیلترها زنده اعمال می‌شوند؛ «نمایش نتایج» فقط شیت را می‌بندد.
 *
 * @param primary   کنترلی که در موبایل بیرونِ شیت می‌ماند (در دسکتاپ بالای کارت)
 * @param store     استورِ `createFilterStore` برای شمارشِ فیلترهای فعال
 * @param onReset   پاک کردنِ همه‌ی فیلترها
 */
export function ResponsiveFilters({ primary, store, onReset, children, className = "" }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const activeCount = useActiveFilterCount(store);

  if (!isMobile) {
    return (
      <div className={`p-3 bg-card border border-border rounded-xl shadow-sm space-y-3 ${className}`}>
        {primary}
        {children}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-end gap-2">
        {/* برچسبِ «جستجو» در نوارِ فشرده‌ی موبایل جا می‌گیرد؛ placeholder کافی است. */}
        {primary && (
          <div className="min-w-0 flex-1 [&_input]:h-10 [&_input]:rounded-xl [&_input]:bg-muted/40 [&_label]:sr-only">
            {primary}
          </div>
        )}
        <Button
          type="button"
          variant={activeCount ? "secondary" : "outline"}
          onClick={() => setOpen(true)}
          className={`relative h-10 gap-2 rounded-xl ${primary ? "w-10 shrink-0 px-0" : "w-full"}`}
          aria-label="فیلترها"
        >
          <SlidersHorizontal className="size-4" />
          {/* کنارِ جست‌وجو فقط آیکن، تا جست‌وجو عرضِ بیشتری داشته باشد. */}
          {!primary && "فیلترها"}
          {activeCount > 0 && (
            <span
              className={`min-w-5 rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground ${
                primary ? "absolute -top-1.5 -left-1.5 ring-2 ring-background" : ""
              }`}
            >
              {formatNumber(activeCount)}
            </span>
          )}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 rounded-t-2xl p-0"
          showCloseButton={false}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3">
            <SheetTitle>فیلترها</SheetTitle>
            {activeCount > 0 && onReset && (
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                حذف همه
              </Button>
            )}
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 custom-scroll">
            {children}
          </div>

          <SheetFooter className="flex-row gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {onReset && (
              <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
                حذف فیلترها
              </Button>
            )}
            <Button type="button" className="flex-[2]" onClick={() => setOpen(false)}>
              نمایش نتایج
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
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
          {/* در موبایل ریست در فوترِ شیت است. */}
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
