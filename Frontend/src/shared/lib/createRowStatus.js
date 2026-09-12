import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/**
 * وضعیت ردیف‌های «مقدار مورد انتظار در برابر مقدار واقعی» در انبار.
 *
 * دریافت، ارسال و دریافت مرجوعی هر سه همین سه حالت را دارند با همان
 * آستانه‌ها و همان ظاهر؛ فقط متن‌ها و نام حالت سوم فرق می‌کند:
 * در دریافت «نرسیده»، در ارسال «آماده‌نشده».
 *
 * emptyKey - نام حالت سوم، چون مصرف‌کننده‌ها با همان نام به config و به
 *            شمارنده‌ی totals دسترسی دارند
 */
export function createRowStatus({
  completeLabel,
  partialLabel,
  emptyKey,
  emptyLabel,
}) {
  const getRowStatus = (expectedQuantity, actualQuantity) => {
    const quantity = actualQuantity || 0;
    if (quantity <= 0) return emptyKey;
    if (quantity < expectedQuantity) return "partial";
    return "complete";
  };

  const ROW_STATUS_CONFIG = {
    complete: {
      label: completeLabel,
      icon: CheckCircle2,
      badgeClass:
        "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
      rowClass: "",
    },
    partial: {
      label: partialLabel,
      icon: AlertTriangle,
      badgeClass:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
      rowClass: "bg-amber-50/40 dark:bg-amber-950/10",
    },
    [emptyKey]: {
      label: emptyLabel,
      icon: XCircle,
      badgeClass: "bg-destructive/5 text-destructive border-destructive/20",
      rowClass: "bg-destructive/[0.03]",
    },
  };

  return { getRowStatus, ROW_STATUS_CONFIG };
}
