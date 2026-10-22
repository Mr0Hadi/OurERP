import { useState } from "react";
import { Link } from "react-router-dom";

import { usePermission } from "@/features/auth/hooks/usePermission";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import { useReservationCountdown } from "@/features/sales/orders/hooks/useReservationCountdown";
import { isInPersonProforma } from "@/features/sales/orders/domain/proformaFlow";
import {
  useCompleteInPersonMutation,
  useSaleChangesSaver,
  useSalePosActions,
} from "@/features/sales/orders/services/mutations";
import { useSaleQuery } from "@/features/sales/orders/services/queries";
import Notice from "@/shared/components/feedback/Notice";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { newPosReference } from "@/shared/domain/pos/posSession";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import ReservationTimer from "./ReservationTimer";

/**
 * دریافتِ پولِ یک پیش‌فاکتورِ «آماده‌ی پرداخت» از صفِ صندوق، بی بازکردنِ صفحه‌ی فروش. اولین
 * دریافت فاکتور را صادر می‌کند (`AddSalePayment` از مسیرِ «ثبت تغییرات»). کارتخوان همان لحظه ثبت
 * می‌شود. فروشِ اقساطی (قرارداد و پیش‌پرداخت) از صفحه‌ی خودِ فروش.
 *
 * @param saleId خالی ⇒ بسته
 */
export default function CashierPaymentDialog({ saleId, onClose }) {
  return (
    <Dialog open={saleId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {saleId != null && <PaymentBody key={saleId} saleId={saleId} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentBody({ saleId, onClose }) {
  const { allows } = usePermission();
  const { data: sale, isLoading } = useSaleQuery(saleId);
  const payments = usePaymentDraft(sale?.paymentDetails || [], SALE_PAYMENT_SIDE.direction);
  const saver = useSaleChangesSaver(saleId);
  const completeMutation = useCompleteInPersonMutation(saleId);
  const posActions = useSalePosActions();
  const [posLocked, setPosLocked] = useState(false);
  const secondsLeft = useReservationCountdown(sale);

  if (isLoading || !sale) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const expired = secondsLeft === 0;
  const isInstallment = sale.paymentType === PaymentTypeEnum.INSTALLMENT;
  const busy = saver.isPending || completeMutation.isPending || posLocked;
  // فروشِ حضوری (کالا جلوی مشتری) با دریافتِ کلِ مبلغ همین‌جا تحویل می‌شود.
  const deliverNow = isInPersonProforma(sale) && payments.netPaid === Number(sale.totalAmount);

  const submit = () =>
    deliverNow
      ? completeMutation.mutate(
          { paymentRows: payments.rows.filter((row) => row.pending === "add") },
          { onSuccess: onClose },
        )
      : saver.mutate({ paymentDraft: payments }, { onSuccess: onClose });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          دریافت — {sale.customerName}
          <ReservationTimer key={`${sale.id}:${sale.reservationSecondsLeft}`} secondsLeft={secondsLeft} />
        </DialogTitle>
        <DialogDescription>
          پیش‌فاکتورِ #{sale.id} · {formatNumber(sale.items.length)} قلم · قابلِ پرداخت {formatRial(sale.payableAmount ?? sale.totalAmount)}
        </DialogDescription>
      </DialogHeader>

      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2 text-sm">
        {sale.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">
              {item.productName} × {formatNumber(item.quantity)}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{formatNumber(item.totalAmount)}</span>
          </li>
        ))}
      </ul>

      {expired ? (
        <Notice tone="danger">مهلتِ رزرو تمام شده و پرداخت پذیرفته نمی‌شود؛ پیش‌فاکتور باید دوباره از انبار بگذرد.</Notice>
      ) : isInstallment ? (
        <Notice tone="info">
          فروشِ اقساطی است؛ قرارداد و پیش‌پرداخت را از{" "}
          <Link className="font-medium underline" to={routeWithId(ROUTES.SALES_DETAIL, sale.id)}>
            صفحه‌ی همین فروش
          </Link>{" "}
          ثبت کنید.
        </Notice>
      ) : (
        <PaymentsCard
          title="دریافت‌ها"
          draft={payments}
          side={SALE_PAYMENT_SIDE}
          total={sale.totalAmount}
          payable={sale.payableAmount}
          canManage={allows("SalePayment")}
          allowRefund={false}
          emptyText="هنوز دریافتی ثبت نشده است."
          notice={
            isInPersonProforma(sale)
              ? "فروشِ حضوری: با دریافتِ کلِ مبلغ کالا همین‌جا تحویل می‌شود؛ با دریافتِ کمتر فاکتور صادر و کالا برای ارسالِ انبار رزرو می‌ماند."
              : "با اولین دریافت فاکتور صادر می‌شود؛ مانده بدهیِ مشتری است."
          }
          posPayment={
            allows("PosCharge")
              ? {
                  record: (_result, context) => posActions.recordPayment(sale.id, context),
                  onRecorded: posActions.apply,
                  onDone: onClose,
                  onLockChange: setPosLocked,
                  reference: () => newPosReference(`sale-${sale.id}`),
                  blockedReason: payments.hasChanges
                    ? "دریافت‌های ثبت‌نشده را اول ثبت کنید؛ بعد با کارتخوان دریافت کنید."
                    : undefined,
                }
              : undefined
          }
        />
      )}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          بستن
        </Button>
        {!expired && !isInstallment && (
          <Button type="button" onClick={submit} disabled={busy || !payments.hasChanges}>
            {busy ? "در حال ثبت…" : deliverNow ? "دریافت و تحویل" : "ثبت دریافت و صدور فاکتور"}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
