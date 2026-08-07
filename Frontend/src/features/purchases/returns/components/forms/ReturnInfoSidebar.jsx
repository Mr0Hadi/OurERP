import { useMemo } from "react";
import { Undo2, Store, FileText, Tag, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  PURCHASE_RETURN_REASON_LABELS,
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_STATUS_LABELS,
  RESOLUTION_TYPES,
  RESOLUTION_LINE_STATUSES,
} from "../../services/mockData";
import { gregorianToPersian } from "@/shared/utils/dateUtils";

const STATUS_CONFIG = {
  [PURCHASE_RETURN_STATUSES.PENDING]: {
    icon: Undo2,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  [PURCHASE_RETURN_STATUSES.COORDINATING]: {
    icon: Undo2,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
};

export default function ReturnInfoSidebar({ purchaseReturn }) {
  const statusConfig =
    STATUS_CONFIG[purchaseReturn.status] ??
    STATUS_CONFIG[PURCHASE_RETURN_STATUSES.PENDING];
  const StatusIcon = statusConfig.icon;

  const totals = useMemo(() => {
    const allLines = purchaseReturn.items.flatMap((i) => i.resolutions || []);
    const resolvedLines = allLines.filter(
      (l) => l.status === RESOLUTION_LINE_STATUSES.RESOLVED,
    );
    const refundedAmount = resolvedLines
      .filter((l) => l.type === RESOLUTION_TYPES.REFUND)
      .reduce((s, l) => s + (Number(l.refundAmount) || 0), 0);
    const writeOffAmount = resolvedLines
      .filter((l) => l.type === RESOLUTION_TYPES.WRITE_OFF)
      .reduce((s, l) => s + Number(l.qty || 0), 0);
    const allocatedQty = allLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    const totalQty = purchaseReturn.items.reduce((s, i) => s + i.qty, 0);
    return {
      refundedAmount,
      writeOffAmount,
      pendingQty: Math.max(0, totalQty - allocatedQty),
    };
  }, [purchaseReturn]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Undo2 className="h-4 w-4 text-muted-foreground" />
            مرجوعی {purchaseReturn.returnNumber ?? `#${purchaseReturn.id}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`gap-1.5 ${statusConfig.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {PURCHASE_RETURN_STATUS_LABELS[purchaseReturn.status] ??
                purchaseReturn.status}
            </Badge>
            <Badge variant="outline">
              {gregorianToPersian(purchaseReturn.returnDate)}
            </Badge>
          </div>

          <div className="flex items-start gap-2">
            <Store className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">تامین‌کننده</p>
              <p className="font-medium text-card-foreground">
                {purchaseReturn.supplierName}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">
                فاکتور خرید مبدا
              </p>
              <p className="font-medium text-card-foreground">
                {purchaseReturn.purchaseInvoiceNumber}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">دلیل غالب</p>
              <p className="font-medium text-card-foreground">
                {PURCHASE_RETURN_REASON_LABELS[purchaseReturn.reason] ??
                  purchaseReturn.reason}
              </p>
            </div>
          </div>
          {purchaseReturn.description && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-1">توضیحات</p>
              <p className="text-card-foreground">
                {purchaseReturn.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-card-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            خلاصه مالی مرجوعی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">جمع کل مرجوعی</span>
              <span className="font-medium text-card-foreground">
                {purchaseReturn.totalAmount.toLocaleString("fa-IR")} ریال
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                بازگشت وجه نهایی‌شده
              </span>
              <span className="font-medium text-[oklch(0.50_0.16_152)]">
                {totals.refundedAmount.toLocaleString("fa-IR")} ریال
              </span>
            </div>
            {totals.writeOffAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  زیان پذیرفته‌شده
                </span>
                <span className="font-medium text-muted-foreground">
                  {totals.writeOffAmount.toLocaleString("fa-IR")} عدد
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-border pt-2">
              <span className="text-muted-foreground">
                مانده در انتظار تصمیم
              </span>
              <span
                className={`font-semibold ${
                  totals.pendingQty > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-[oklch(0.50_0.16_152)]"
                }`}
              >
                {totals.pendingQty.toLocaleString("fa-IR")} عدد
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
