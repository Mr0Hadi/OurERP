import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/** وضعیت یک ردیف دریافت بر اساس نسبت دریافتی به مورد انتظار. */
export function getRowStatus(expectedQty, receivedQty) {
  const qty = receivedQty || 0;
  if (qty <= 0) return "missing";
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
  missing: {
    label: "نرسیده",
    icon: XCircle,
    badgeClass: "bg-destructive/5 text-destructive border-destructive/20",
    rowClass: "bg-destructive/[0.03]",
  },
};
