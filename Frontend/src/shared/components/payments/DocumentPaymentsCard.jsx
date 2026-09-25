import { useState } from "react";
import { Ban, Pencil, Plus, Undo2, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import PaymentFormDialog from "./PaymentFormDialog";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import {
  PaymentDirectionEnum,
  PaymentPurposeEnum,
} from "@/shared/domain/enums/paymentDirection";
import { gregorianToPersian } from "@/shared/lib/dateUtils";

const formatRial = (value) =>
  `${(Number(value) || 0).toLocaleString("fa-IR")} ریال`;

/**
 * ردیف‌های پرداختِ یک سندِ خرید یا فروش، و ثبت/اصلاح/ابطالِ آن‌ها
 * (`Add/Edit/Void{Purchase,Sale}Payment`).
 *
 * ردیفِ پرداخت هرگز پاک نمی‌شود: ابطال فقط `voidedAt` را پر می‌کند و
 * اصلاح یعنی ابطالِ ردیفِ قبلی و ثبتِ ردیفِ تازه. ردیف‌های باطل‌شده
 * خط‌خورده نشان داده می‌شوند و در جمع نمی‌آیند. `paidAmount` را سرور
 * حساب می‌کند و همان نمایش داده می‌شود.
 *
 * @param side             `{ direction, payLabel, refundLabel, refundHint }` — جهتِ
 *                         عادیِ پرداخت روی این سند و متن‌های هر جهت.
 * @param payableAmount    آنچه طرف در کل بدهکار است (فروش اقساطی: با سود؛
 *                         خرید: منهای قلم‌های بسته‌شده). بدهی = این − پرداخت‌شده.
 * @param canManage        دسترسیِ `PurchasePayment`/`SalePayment`.
 * @param refundOnly       سندِ لغوشده: فقط پولِ برگشتی پذیرفته می‌شود.
 * @param notice           متنِ راهنما بالای دکمه‌ها (مثلاً «اولین پرداخت فاکتور را صادر می‌کند»).
 */
export default function DocumentPaymentsCard({
  payments = [],
  side,
  totalAmount,
  payableAmount,
  paidAmount,
  canManage = false,
  refundOnly = false,
  notice,
  isPending = false,
  onAdd,
  onEdit,
  onVoid,
}) {
  // { mode: "pay" | "refund" | "edit", payment? }
  const [dialog, setDialog] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);

  const payable = Number(payableAmount ?? totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  const remaining = payable - paid;
  const refundDirection =
    side.direction === PaymentDirectionEnum.IN
      ? PaymentDirectionEnum.OUT
      : PaymentDirectionEnum.IN;

  // پولِ برگشتی نمی‌تواند از پرداخت‌شده بیشتر باشد (سرور همین را ۴۰۰ می‌دهد).
  const refundCap = Math.max(0, paid);

  const sorted = [...payments].sort(
    (a, b) => String(a.paidAt).localeCompare(String(b.paidAt)) || a.id - b.id,
  );

  const dialogTitle =
    dialog?.mode === "edit"
      ? "اصلاح پرداخت"
      : dialog?.mode === "refund"
        ? side.refundLabel
        : side.payLabel;
  const dialogDescription =
    dialog?.mode === "edit"
      ? "ردیفِ فعلی باطل و ردیفِ تازه‌ای با همین جهت ثبت می‌شود؛ هر دو در سابقه می‌مانند."
      : dialog?.mode === "refund"
        ? side.refundHint
        : undefined;

  // `?.` لازم است: React Compiler مسیرهای وابستگیِ این بستار (`dialog.mode`)
  // را هنگامِ رندر می‌خواند، وقتی `dialog` هنوز `null` است.
  const submitDialog = (values, close) => {
    const options = { onSuccess: close };
    if (dialog?.mode === "edit") {
      onEdit(dialog?.payment?.id, values, options);
    } else {
      onAdd(
        {
          ...values,
          direction:
            dialog?.mode === "refund" ? refundDirection : side.direction,
        },
        options,
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          پرداخت‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2 text-sm">
          <SummaryRow label="جمع فاکتور" value={formatRial(totalAmount)} />
          {payableAmount != null &&
            Number(payableAmount) !== Number(totalAmount) && (
              <SummaryRow
                label="مبلغ قابل پرداخت"
                value={formatRial(payableAmount)}
              />
            )}
          <SummaryRow label="پرداخت‌شده" value={formatRial(paid)} />
          <div className="flex justify-between items-center border-t border-border pt-2">
            <span className="text-muted-foreground">
              {remaining < 0 ? "اضافه پرداخت" : "مانده بدهی"}
            </span>
            <span
              className={`font-semibold ${
                remaining > 0
                  ? "text-destructive"
                  : "text-[oklch(0.50_0.16_152)]"
              }`}
            >
              {formatRial(Math.abs(remaining))}
            </span>
          </div>
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            هنوز پرداختی ثبت نشده است.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                isRefund={payment.direction === refundDirection}
                editable={
                  canManage &&
                  !payment.voidedAt &&
                  (payment.purpose ?? PaymentPurposeEnum.NORMAL) ===
                    PaymentPurposeEnum.NORMAL
                }
                disabled={isPending}
                onEdit={() => setDialog({ mode: "edit", payment })}
                onVoid={() => setVoidTarget(payment)}
              />
            ))}
          </ul>
        )}

        {notice && <p className="text-xs text-muted-foreground">{notice}</p>}

        {canManage && (
          <div className="flex flex-col sm:flex-row gap-2">
            {!refundOnly && (
              <Button
                type="button"
                size="sm"
                className="flex-1 gap-1.5"
                disabled={isPending}
                onClick={() => setDialog({ mode: "pay" })}
              >
                <Plus className="h-4 w-4" />
                {side.payLabel}
              </Button>
            )}
            {refundCap > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                disabled={isPending}
                onClick={() => setDialog({ mode: "refund" })}
              >
                <Undo2 className="h-4 w-4" />
                {side.refundLabel}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <PaymentFormDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialogTitle}
        description={dialogDescription}
        initial={dialog?.mode === "edit" ? dialog.payment : undefined}
        maxAmount={dialog?.mode === "refund" ? refundCap : undefined}
        isPending={isPending}
        onSubmit={submitDialog}
      />

      <AlertDialog
        open={voidTarget !== null}
        onOpenChange={(open) => !open && !isPending && setVoidTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ابطال پرداخت</AlertDialogTitle>
            <AlertDialogDescription>
              ردیفِ {voidTarget && formatRial(voidTarget.amount)} باطل می‌شود و
              از مبلغ پرداخت‌شده بیرون می‌رود، ولی در سابقه‌ی پرداخت‌ها می‌ماند.
              فقط پرداختی را باطل کنید که اشتباه ثبت شده است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                // دیالوگ تا پایانِ درخواست باز می‌ماند.
                event.preventDefault();
                onVoid(voidTarget?.id, {
                  onSuccess: () => setVoidTarget(null),
                });
              }}
            >
              {isPending ? "در حال ابطال..." : "باطل شود"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-card-foreground">{value}</span>
    </div>
  );
}

function PaymentRow({ payment, isRefund, editable, disabled, onEdit, onVoid }) {
  const voided = Boolean(payment.voidedAt);
  const reference = payment.checkNumber || payment.transferRef;

  return (
    <li
      className={`flex items-center gap-2 px-3 py-2 text-sm ${voided ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`font-medium ${voided ? "line-through" : ""}`}>
            {formatRial(payment.amount)}
          </span>
          <span className="text-xs text-muted-foreground">
            {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type}
          </span>
          {isRefund && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              برگشتی
            </Badge>
          )}
          {(payment.purpose ?? PaymentPurposeEnum.NORMAL) !==
            PaymentPurposeEnum.NORMAL && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              اقساط
            </Badge>
          )}
          {voided && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30"
            >
              باطل‌شده
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {gregorianToPersian(payment.paidAt)}
          {reference && <span dir="ltr"> · {reference}</span>}
        </p>
      </div>
      {editable && (
        <div className="flex gap-1 shrink-0">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="اصلاح پرداخت"
            disabled={disabled}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            aria-label="ابطال پرداخت"
            disabled={disabled}
            onClick={onVoid}
          >
            <Ban className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}
