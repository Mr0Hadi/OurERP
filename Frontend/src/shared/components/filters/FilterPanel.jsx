import { Button } from "@/shared/components/ui/button";

/**
 * پوسته‌ی مشترک نوار فیلترها.
 *
 * children  - ردیف اول (جست‌وجو، انتخاب‌ها)
 * dateRow   - ردیف دوم (بازه‌ی تاریخ)؛ دکمه‌ی ریست خودکار به انتهای آن اضافه می‌شود
 * onReset   - پاک کردن همه‌ی فیلترها
 */
export default function FilterPanel({
  children,
  dateRow,
  onReset,
  firstRowClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  dateRowClassName = "grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-border",
  resetWrapperClassName = "flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end",
  resetButtonClassName = "w-full px-4",
}) {
  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <div className={firstRowClassName}>{children}</div>

      <div className={dateRowClassName}>
        {dateRow}
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
      </div>
    </div>
  );
}
