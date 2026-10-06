import { Ban, Pencil, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { PAYMENT_PURPOSE_LABELS } from "@/shared/domain/enums/paymentDirection";
import { isNormalPayment } from "@/shared/domain/payments/paymentRows";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatRial } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/** برچسبِ تغییرِ در انتظارِ یک ردیف (`usePaymentDraft`). */
const PENDING_BADGES = {
  add: { tone: "info", label: "ثبت‌نشده" },
  edit: { tone: "warning", label: "اصلاح می‌شود" },
  void: { tone: "danger", label: "باطل می‌شود" },
};

/**
 * یک ردیف در فهرستِ پرداخت‌های `PaymentsCard`: مبلغ، روش، تاریخ و مرجع؛ ردیفِ در
 * انتظار برچسب و دکمه‌ی «برگرداندن» دارد، ردیفِ قابلِ مدیریت «اصلاح» و «ابطال».
 *
 * @param isRefund   پولِ برگشتی (جهتِ مخالفِ سند)؛ با «−» نشان داده می‌شود
 * @param manageable اصلاح/ابطال مجاز است
 */
export default function PaymentRow({ row, isRefund, manageable, onEdit, onVoid, onUndo }) {
  const voided = Boolean(row.voidedAt) || row.pending === "void";
  const reference = row.checkNumber || row.transferRef;
  const badge = PENDING_BADGES[row.pending];
  // ردیفِ ثبت‌نشده «حذف» می‌شود؛ ردیفِ سرور «ابطال» (در دفتر می‌ماند).
  const voidLabel = row.pending === "add" ? "حذف" : "ابطال";

  return (
    <li className={cn("flex items-center gap-2 px-3 py-2.5 text-sm", row.pending && "bg-primary/3")}>
      <div className={cn("min-w-0 flex-1 space-y-0.5", voided && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("font-semibold tabular-nums", voided && "line-through")}>
            {isRefund && "− "}
            {formatRial(row.amount)}
          </span>
          {isRefund && <StatusBadge tone="info" size="sm">برگشتی</StatusBadge>}
          {!isNormalPayment(row) && (
            <StatusBadge tone="special" size="sm">{PAYMENT_PURPOSE_LABELS[row.purpose] ?? "اقساط"}</StatusBadge>
          )}
          {row.voidedAt && <StatusBadge tone="danger" size="sm">باطل‌شده</StatusBadge>}
          {badge && <StatusBadge tone={badge.tone} size="sm">{badge.label}</StatusBadge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {PAYMENT_TYPE_LABELS[row.type] ?? row.type}
          {" · "}
          {row.paidAt ? gregorianToPersian(row.paidAt) : "امروز"}
          {reference && <span dir="ltr"> · {reference}</span>}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        {row.pending && row.pending !== "add" ? (
          <Button type="button" size="icon-sm" variant="ghost" aria-label="برگرداندنِ تغییر" title="برگرداندنِ تغییر" onClick={onUndo}>
            <RotateCcw className="size-3.5" />
          </Button>
        ) : (
          manageable && (
            <>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="اصلاح" title="اصلاح" onClick={onEdit}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={voidLabel}
                title={voidLabel}
                onClick={onVoid}
              >
                <Ban className="size-3.5" />
              </Button>
            </>
          )
        )}
      </div>
    </li>
  );
}
