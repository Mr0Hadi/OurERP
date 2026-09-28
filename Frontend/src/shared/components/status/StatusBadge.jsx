import { Badge } from "@/shared/components/ui/badge";
import { toneSoft } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * برچسبِ وضعیت با رنگِ معنایی — تنها راهِ نمایشِ وضعیت در جدول‌ها و کارت‌ها.
 *
 * هر فیچر فقط نگاشتِ «وضعیت → { tone، متن، آیکن }» را نگه می‌دارد و ظاهر
 * این‌جا یک‌جا تعریف می‌شود؛ پس همه‌ی وضعیت‌ها در همه‌ی تم‌ها (از جمله تیره
 * و دسترس‌پذیر) یک شکل دارند.
 *
 * @param {object} props
 * @param {string} [props.tone] یکی از `TONES` در `shared/lib/tone.js`
 * @param {React.ComponentType} [props.icon] آیکنِ lucide؛ رنگ به‌تنهایی معنا را منتقل نکند
 * @param {"sm"|"md"} [props.size] `sm` برای جاهای فشرده (کنار عنوانِ قلم)
 */
export default function StatusBadge({
  tone = "neutral",
  icon: Icon,
  size = "md",
  className,
  children,
  ...props
}) {
  return (
    <Badge
      variant="outline"
      className={cn(toneSoft(tone), size === "sm" && "h-4 px-1.5 text-[10px]", className)}
      {...props}
    >
      {Icon && <Icon data-icon="inline-start" />}
      {children}
    </Badge>
  );
}
