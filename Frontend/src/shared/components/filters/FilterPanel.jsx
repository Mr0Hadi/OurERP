import { Button } from "@/shared/components/ui/button";

/**
 * پوسته‌ی مشترک نوار فیلترها.
 *
 * children      - ردیف اول (جست‌وجو، انتخاب‌ها)
 * dateRow       - ردیف دوم (بازه‌ی تاریخ یا هر فیلتر دیگر)
 * onReset       - پاک کردن همه‌ی فیلترها
 * separateReset - وقتی true، دکمه‌ی ریست دیگر داخلِ همان ردیفِ `dateRow`
 *                 نمی‌نشیند؛ ردیفِ سومِ جداگانه‌ی خودش را می‌گیرد (برای
 *                 وقتی `dateRow` خودش پر است و جاسازیِ دکمه در کنارش
 *                 فشرده‌اش می‌کند).
 */
export default function FilterPanel({
  children,
  dateRow,
  onReset,
  firstRowClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  dateRowClassName = "grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 pt-3 border-t border-border",
  resetWrapperClassName = "flex items-end xs:col-span-2 lg:col-span-1 lg:justify-end",
  resetButtonClassName = "w-full px-4",
  separateReset = false,
  // `justify-end` نه `justify-start`: در RTL یعنی سمتِ چپِ صفحه — همان
  // سمتی که دکمه‌ی ریست همیشه در حالتِ معمولیِ این کامپوننت می‌نشیند.
  resetRowClassName = "flex justify-end pt-3 border-t border-border",
}) {
  const resetButton = (
    <Button
      type="button"
      variant="outline"
      onClick={onReset}
      className={resetButtonClassName}
    >
      حذف همه فیلترها
    </Button>
  );

  return (
    <div className="p-3 bg-card border border-border rounded-xl shadow-sm space-y-3">
      <div className={firstRowClassName}>{children}</div>

      <div className={dateRowClassName}>
        {dateRow}
        {!separateReset && (
          <div className={resetWrapperClassName}>{resetButton}</div>
        )}
      </div>

      {separateReset && <div className={resetRowClassName}>{resetButton}</div>}
    </div>
  );
}
