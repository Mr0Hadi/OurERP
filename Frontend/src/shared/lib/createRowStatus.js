import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

import { toneRow, toneSoft } from "@/shared/lib/tone";

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
      tone: "success",
      badgeClass: toneSoft("success"),
      rowClass: toneRow("success"),
    },
    partial: {
      label: partialLabel,
      icon: AlertTriangle,
      tone: "warning",
      badgeClass: toneSoft("warning"),
      rowClass: toneRow("warning"),
    },
    [emptyKey]: {
      label: emptyLabel,
      icon: XCircle,
      tone: "danger",
      badgeClass: toneSoft("danger"),
      rowClass: toneRow("danger"),
    },
  };

  return { getRowStatus, ROW_STATUS_CONFIG };
}
