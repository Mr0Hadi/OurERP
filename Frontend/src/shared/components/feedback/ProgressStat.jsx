import { Progress } from "@/shared/components/ui/progress";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * پیشرفتِ یک کار شمارشی: «پیشرفت دریافت ۱۲ / ۲۰ (۶۰٪)» + نوار.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.done
 * @param {number} props.total
 * @param {number} [props.percent] اگر نیاید از done/total حساب می‌شود
 */
export default function ProgressStat({ label, done, total, percent }) {
  const value = percent ?? (total > 0 ? Math.round((done / total) * 100) : 0);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-card-foreground">
          {formatNumber(done)} / {formatNumber(total)} ({formatNumber(value)}٪)
        </span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
