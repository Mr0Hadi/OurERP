import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * مبلغِ ریالیِ یک خانه‌ی جدول: رقمِ فارسی با جداکننده، ستونی (`tabular-nums`) تا رقم‌ها
 * زیرِ هم بنشینند. صفر کم‌رنگ است تا چشم روی خانه‌های پُر بماند.
 *
 * @param tone   رنگِ معنایی (مثلاً `danger` برای مانده‌ی معوق)؛ صفر همیشه بی‌رنگ است
 * @param strong عددِ اصلیِ ردیف (جمع، مانده) پررنگ‌تر
 */
export default function Amount({ value, tone, strong = false, className }) {
  const number = Number(value) || 0;
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        number === 0 ? "text-muted-foreground" : tone && toneText(tone),
        strong && number !== 0 && "font-semibold",
        className,
      )}
    >
      {number < 0 ? `−${formatNumber(-number)}` : formatNumber(number)}
    </span>
  );
}
