import { useState } from "react";
import toast from "react-hot-toast";

import { usePermission } from "@/features/auth/hooks/usePermission";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import { useReservationCountdown } from "@/features/sales/orders/hooks/useReservationCountdown";
import { isInPersonProforma, proformaPaymentType } from "@/features/sales/orders/domain/proformaFlow";
import InstallmentPlanDraftCard from "@/features/sales/installments/components/InstallmentPlanDraftCard";
import ProformaPlanNotice from "@/features/sales/installments/components/ProformaPlanNotice";
import {
  EMPTY_PLAN_DRAFT,
  addMonthsIso,
  planDraftErrors,
  previewInstallmentPlan,
  toApiCreatePlan,
} from "@/features/sales/installments/domain/installmentPlan";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { todayIso } from "@/shared/lib/dateUtils";
import {
  ensureProformaPaymentType,
  useCompleteInPersonMutation,
  useIssueInstallmentSaleMutation,
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
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { newPosReference } from "@/shared/domain/pos/posSession";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import ReservationTimer from "./ReservationTimer";

/** «شیوه‌ی پرداخت» هنگامِ دریافت: یکجا (نقد/نسیه) یا اقساطی (قرارداد با پیش‌پرداخت). */
const PAYMENT_TERMS_OPTIONS = [
  { value: false, label: "نقد / نسیه" },
  { value: true, label: "اقساطی", hint: "پیش‌پرداخت و قرارداد اقساط همین‌جا ثبت و فاکتور صادر می‌شود." },
];

/**
 * دریافتِ پولِ یک پیش‌فاکتورِ «آماده‌ی پرداخت» از صفِ صندوق، بی بازکردنِ صفحه‌ی فروش. صندوقدار شیوه‌ی
 * پرداخت را همین‌جا انتخاب می‌کند (`ensureProformaPaymentType` پیش از دریافت ثبتش می‌کند):
 *  - نقد/نسیه: دریافت‌ها؛ اولین دریافت فاکتور را صادر می‌کند. کارتخوان همان لحظه ثبت می‌شود.
 *  - اقساطی: قرارداد با پیش‌پرداخت، که فاکتور را صادر می‌کند.
 * فروشِ حضوری با پرداختِ کامل (یا قرارداد) همان‌جا تحویل می‌شود (`CompleteInPersonSale`).
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
  const issueMutation = useIssueInstallmentSaleMutation(saleId);
  const posActions = useSalePosActions();
  const [posLocked, setPosLocked] = useState(false);
  const [switchingType, setSwitchingType] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // `null` ⇒ همان شیوه‌ی ذخیره‌شده.
  const [installmentChoice, setInstallmentChoice] = useState(null);
  const [planDraft, setPlanDraft] = useState(() => ({ ...EMPTY_PLAN_DRAFT, firstDueDate: addMonthsIso(todayIso(), 1) }));
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
  const isInstallment = installmentChoice ?? sale.paymentType === PaymentTypeEnum.INSTALLMENT;
  // قراردادِ بی‌پیش‌پرداختی که از قبل روی پیش‌فاکتور است: شیوه قفل است تا ابطالش (صفحه‌ی فروش).
  const existingPlan =
    sale.installmentSummary?.status === SaleInstallmentPlanStatusEnum.ACTIVE ? sale.installmentSummary : null;
  const canChooseTerms = !existingPlan && (isInstallment || allows("SaleInstallmentManage"));
  const inPerson = isInPersonProforma(sale);
  const planPreview = isInstallment ? previewInstallmentPlan(Number(sale.totalAmount), planDraft) : null;
  const planErrors = isInstallment
    ? planDraftErrors(planDraft, { payable: planPreview?.totalAmount, withDownPayment: true })
    : {};
  const busy = saver.isPending || completeMutation.isPending || issueMutation.isPending || posLocked || switchingType;
  // فروشِ حضوری (کالا جلوی مشتری) با دریافتِ کلِ مبلغ یا قرارداد همین‌جا تحویل می‌شود.
  const deliverNow = inPerson && (isInstallment || payments.netPaid === Number(sale.totalAmount));
  const canSubmit = isInstallment ? !existingPlan && allows("SaleInstallmentManage") : payments.hasChanges;

  const submit = async () => {
    if (isInstallment && Object.keys(planErrors).length > 0) return setShowErrors(true);
    setSwitchingType(true);
    try {
      await ensureProformaPaymentType(sale, proformaPaymentType(isInstallment, sale));
    } catch (error) {
      toast.error(getErrorMessage(error, "ثبتِ شیوه‌ی پرداخت انجام نشد"));
      return;
    } finally {
      setSwitchingType(false);
    }
    if (isInstallment) {
      const plan = toApiCreatePlan(planDraft);
      if (inPerson) completeMutation.mutate({ installmentPlan: plan }, { onSuccess: onClose });
      else issueMutation.mutate({ plan }, { onSuccess: onClose });
      return;
    }
    if (deliverNow) {
      completeMutation.mutate({ paymentRows: payments.rows.filter((row) => row.pending === "add") }, { onSuccess: onClose });
      return;
    }
    saver.mutate({ paymentDraft: payments }, { onSuccess: onClose });
  };

  const submitLabel = busy
    ? "در حال ثبت…"
    : isInstallment
      ? deliverNow
        ? "ثبت قرارداد و تحویل"
        : "ثبت قرارداد و صدور فاکتور"
      : deliverNow
        ? "دریافت و تحویل"
        : "ثبت دریافت و صدور فاکتور";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          دریافت — {sale.customerName}
          <ReservationTimer key={`${sale.id}:${sale.reservationSecondsLeft}`} secondsLeft={secondsLeft} />
        </DialogTitle>
        <DialogDescription>
          پیش‌فاکتورِ #{sale.id} · {formatNumber(sale.items.length)} قلم · جمع {formatRial(sale.totalAmount)}
          {inPerson && " · فروشِ حضوری"}
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
      ) : (
        <div className="space-y-4">
          {canChooseTerms && (
            <StatusChoice
              label="شیوه‌ی پرداخت"
              options={PAYMENT_TERMS_OPTIONS}
              value={isInstallment}
              onChange={(value) => {
                setInstallmentChoice(value);
                setShowErrors(false);
              }}
              disabled={busy}
            />
          )}

          {isInstallment ? (
            existingPlan ? (
              <ProformaPlanNotice plan={existingPlan} />
            ) : (
              <InstallmentPlanDraftCard
                draft={planDraft}
                onChange={(patch) => setPlanDraft((draft) => ({ ...draft, ...patch }))}
                preview={planPreview}
                errors={showErrors ? planErrors : {}}
                blockedReason={
                  allows("SaleInstallmentManage") ? null : "ثبتِ قرارداد اقساط دسترسیِ «مدیریت قرارداد اقساطی» می‌خواهد."
                }
              />
            )
          ) : (
            <PaymentsCard
              title="دریافت‌ها"
              draft={payments}
              side={SALE_PAYMENT_SIDE}
              total={sale.totalAmount}
              canManage={allows("SalePayment")}
              allowRefund={false}
              emptyText="هنوز دریافتی ثبت نشده است."
              notice={
                inPerson
                  ? "فروشِ حضوری: با دریافتِ کلِ مبلغ کالا همین‌جا تحویل می‌شود؛ با دریافتِ کمتر فاکتور صادر و کالا برای ارسالِ انبار رزرو می‌ماند."
                  : "با اولین دریافت فاکتور صادر می‌شود؛ مانده بدهیِ مشتری است."
              }
              posPayment={
                allows("PosCharge")
                  ? {
                      // شیوه‌ی انتخاب‌شده پیش از کشیدنِ کارت ثبت می‌شود.
                      prepare: () => ensureProformaPaymentType(sale, proformaPaymentType(false, sale)),
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
        </div>
      )}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          بستن
        </Button>
        {!expired && (
          <Button type="button" onClick={submit} disabled={busy || !canSubmit}>
            {submitLabel}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
