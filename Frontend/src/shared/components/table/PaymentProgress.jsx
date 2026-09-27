import { formatNumber } from "@/shared/lib/numberFormat";
import { toneSolid } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * پرداخت‌شده از کل، برای ستونِ جدول: «۱٬۰۰۰ / ۹٬۰۰۰» + نوارِ باریک.
 * رنگ: کامل سبز، بخشی کهربایی، هیچ قرمز.
 */
export default function PaymentProgress({ paid, total }) {
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const tone = percent === 100 ? "success" : percent > 0 ? "warning" : "danger";

  return (
    <div className="flex flex-col gap-1 items-end min-w-[100px]">
      <span className="tabular-nums text-xs">
        {formatNumber(paid)} / {formatNumber(total)}
      </span>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", toneSolid(tone))}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
