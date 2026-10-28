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
 * error   - آبجکت خطای react-hook-form (`errors.fieldName`)، یا متنِ خطا (فرم‌های بی‌RHF)
 * size    - `"sm"` برای فرم‌های فشرده (کارتِ سند، دیالوگ): برچسب و راهنمای کوچک‌تر
 */
export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  size = "md",
  className = "space-y-1.5",
}) {
  const compact = size === "sm";
  const message = typeof error === "string" ? error : error?.message;

  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className={compact ? "text-xs" : "text-sm font-medium"}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      {children}

      {message ? (
        <span className="text-xs text-destructive block mt-1 font-medium">
          {message}
        </span>
      ) : (
        hint && (
          <span className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground block mt-1`}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
