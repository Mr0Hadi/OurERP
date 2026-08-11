import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/**
 * وضعیت یک ردیف ارسال.
 * برخلاف دریافت، حالت سوم اینجا «آماده‌نشده» است نه «نرسیده» —
 * یعنی انباردار هنوز چیزی از این قلم را برای این محموله جدا نکرده.
 */
export function getRowStatus(expectedQty, shippedQty) {
  const qty = shippedQty || 0;
  if (qty <= 0) return "pending";
  if (qty < expectedQty) return "partial";
  return "complete";
}

export const ROW_STATUS_CONFIG = {
  complete: {
    label: "کامل",
    icon: CheckCircle2,
    badgeClass:
      "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
    rowClass: "",
  },
  partial: {
    label: "ناقص",
    icon: AlertTriangle,
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
    rowClass: "bg-amber-50/40 dark:bg-amber-950/10",
  },
  pending: {
    label: "آماده‌نشده",
    icon: XCircle,
    badgeClass: "bg-destructive/5 text-destructive border-destructive/20",
    rowClass: "bg-destructive/[0.03]",
  },
};
