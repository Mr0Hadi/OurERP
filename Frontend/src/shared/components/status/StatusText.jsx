import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * وضعیت به‌صورت آیکن + متنِ رنگی، بدونِ قاب — برای گزینه‌های Select و
 * جاهایی که badge زیادی سنگین است.
 */
export default function StatusText({ tone = "neutral", icon: Icon, className, children }) {
  return (
    <span className={cn("flex items-center gap-2", toneText(tone), className)}>
      {Icon && <Icon className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}
