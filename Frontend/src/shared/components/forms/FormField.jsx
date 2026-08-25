import { Label } from "@/shared/components/ui/label";

/**
 * برچسب + کنترل + پیام خطا، با همان فاصله‌گذاری و رنگ‌بندیِ فرم‌های موجود.
 *
 * عمداً خودش `Input` را رندر نمی‌کند و ورودی را به‌صورت `children`
 * می‌گیرد: بعضی فیلدها Textarea اند، بعضی Select و بعضی
 * PersianDatePicker — پوششی که همه‌ی این‌ها را با props پرچمی مدیریت
 * کند، از خودِ تکرار بدتر می‌شد.
 *
 * htmlFor - باید با `id` کنترلِ داخلی یکی باشد تا کلیک روی برچسب کار کند
 * error   - آبجکت خطای react-hook-form (`errors.fieldName`) یا undefined
 */
export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = "space-y-1.5",
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      {children}

      {error ? (
        <span className="text-xs text-destructive block mt-1 font-medium">
          {error.message}
        </span>
      ) : (
        hint && (
          <span className="text-xs text-muted-foreground block mt-1">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
