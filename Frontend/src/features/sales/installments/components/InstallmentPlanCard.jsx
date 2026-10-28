import { useState } from "react";
import { Ban, CheckCheck, Pencil } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import SectionCard from "@/shared/components/forms/SectionCard";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import Notice from "@/shared/components/feedback/Notice";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import InstallmentSchedule from "./InstallmentSchedule";
import StatGrid from "@/shared/components/data/StatGrid";
import InstallmentPaymentDialog from "./InstallmentPaymentDialog";
import InstallmentPlanEditDialog from "./InstallmentPlanEditDialog";
import InstallmentPenaltyWaiveDialog from "./InstallmentPenaltyWaiveDialog";
import { InstallmentPlanStatusBadge } from "./InstallmentStatusBadge";
import { useInstallmentPlanQuery } from "../services/queries";
import { useCancelInstallmentPlanMutation } from "../services/mutations";
import { overdueOf, unpaidInstallments } from "../domain/installmentPlan";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

function summaryItems(plan, overdue) {
  const isActive = plan.status === SaleInstallmentPlanStatusEnum.ACTIVE;
  const remaining = Number(plan.remainingAmount) || 0;
  // قراردادِ ابطال‌شده دیگر طلبی ندارد: سودش از حساب برداشته شده و ماندهِ واقعیِ فروش در
  // «دریافت‌ها» است (`payableAmount − paidAmount`)؛ «مانده»ی قرارداد آن‌جا گمراه‌کننده بود.
  if (plan.status === SaleInstallmentPlanStatusEnum.CANCELLED) {
    return [
      { label: "پرداخت‌شده از قرارداد", value: plan.paidAmount },
      { label: "پیش‌پرداخت", value: plan.downPaymentAmount },
      {
        label: "اقساط پرداخت‌شده",
        value: `${formatNumber(plan.paidInstallmentCount)} از ${formatNumber(plan.installmentCount)}`,
      },
    ];
  }
  return [
    { label: "قابل پرداخت", value: plan.totalAmount },
    { label: "پرداخت‌شده", value: plan.paidAmount, tone: "success" },
    {
      label: "مانده",
      value: remaining === 0 ? "تسویه" : remaining,
      tone: remaining === 0 ? "success" : isActive ? "warning" : undefined,
    },
    {
      label: "اقساط پرداخت‌شده",
      value: `${formatNumber(plan.paidInstallmentCount)} از ${formatNumber(plan.installmentCount)}`,
    },
    {
      label: "سود اقساط",
      value: plan.installmentChargeAmount,
      hint: `${formatNumber(plan.markupPercentage)}٪ از ${formatNumber(plan.cashAmount)}`,
    },
    { label: "پیش‌پرداخت", value: plan.downPaymentAmount },
    Number(plan.earlySettlementDiscountAmount) > 0 && {
      label: "تخفیفِ تسویه‌ی زودهنگام",
      value: plan.earlySettlementDiscountAmount,
      tone: "success",
      hint: "از سودِ اقساط کم شده",
    },
    Number(plan.returnCreditAmount) > 0 && {
      label: "اعتبارِ مرجوعی",
      value: plan.returnCreditAmount,
      hint: "از انتهای قرارداد کم شده",
    },
    Number(plan.penaltyPaidAmount) > 0 && { label: "جریمه‌ی دریافت‌شده", value: plan.penaltyPaidAmount },
    isActive && Number(plan.penaltyDueAmount) > 0 && {
      label: "جریمه‌ی تا امروز",
      value: plan.penaltyDueAmount,
      tone: "danger",
      hint: "بیرون از مانده؛ با پرداخت گرفته می‌شود",
    },
    isActive && { label: "سررسیدِ بعدی", value: plan.nextDueDate ? gregorianToPersian(plan.nextDueDate) : "—" },
    isActive && {
      label: "سررسیدگذشته",
      value: overdue.count > 0 ? `${formatNumber(overdue.count)} قسط` : "ندارد",
      tone: overdue.count > 0 ? "danger" : "success",
    },
  ];
}

/**
 * قرارداد اقساطیِ یک فروشِ صادرشده: خلاصه، جدولِ اقساط با «دریافت»، تسویه‌ی کامل، ویرایش و
 * ابطال. همه‌ی کارها همان لحظه روی سرور ثبت می‌شوند (نه در «ثبت تغییرات»ِ فاکتور).
 *
 * دسترسی‌ها: دیدن `SaleInstallmentView`، دریافت/تسویه `SaleInstallmentPay`، ویرایش/ابطال
 * `SaleInstallmentManage`، بخشودگیِ جریمه `SaleInstallmentPenaltyWaive`.
 */
export default function InstallmentPlanCard({ saleId }) {
  const { allows } = usePermission();
  const query = useInstallmentPlanQuery(saleId);
  const cancel = useCancelInstallmentPlanMutation();
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [waiveTarget, setWaiveTarget] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const plan = query.data;

  if (query.isLoading) {
    return (
      <SectionCard title="قرارداد اقساط">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </SectionCard>
    );
  }
  if (query.isError || !plan) {
    return (
      <SectionCard title="قرارداد اقساط">
        <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
      </SectionCard>
    );
  }

  const isActive = plan.status === SaleInstallmentPlanStatusEnum.ACTIVE;
  const canPay = isActive && allows("SaleInstallmentPay");
  const canManage = isActive && allows("SaleInstallmentManage");
  const canWaive = isActive && allows("SaleInstallmentPenaltyWaive");
  const overdue = overdueOf(plan.installments);
  const unpaid = unpaidInstallments(plan.installments);

  return (
    <>
      <SectionCard
        title="قرارداد اقساط"
        action={<InstallmentPlanStatusBadge status={plan.status} />}
      >
        {overdue.count > 0 && isActive && (
          <Notice tone="danger">
            {formatNumber(overdue.count)} قسط به مبلغِ {formatRial(overdue.amount)} از سررسید گذشته و پرداخت نشده است
            {Number(plan.penaltyDueAmount) > 0 && `؛ جریمه‌ی دیرکردِ تا امروز ${formatRial(plan.penaltyDueAmount)}`}.
          </Notice>
        )}
        {plan.status === SaleInstallmentPlanStatusEnum.CANCELLED && (
          <Notice tone="neutral">
            قرارداد ابطال شده و اقساطِ پرداخت‌نشده لغو شده‌اند. پرداخت‌های ثبت‌شده سرِ جایشان‌اند و ماندهِ فاکتور از «دریافت‌ها» گرفته می‌شود.
          </Notice>
        )}

        <StatGrid className="@container/summary grid-cols-2 @md/summary:grid-cols-4" items={summaryItems(plan, overdue)} />

        <InstallmentSchedule
          installments={plan.installments}
          onPay={canPay ? (installment) => setPaymentTarget({ kind: "pay", saleId: plan.saleId, installment }) : undefined}
          onWaive={canWaive ? setWaiveTarget : undefined}
          emptyText="قسطی برای این قرارداد ثبت نشده است."
        />

        {(canPay || canManage) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {canPay && unpaid.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setPaymentTarget({ kind: "settle", saleId: plan.saleId })}
              >
                <CheckCheck className="size-3.5" />
                تسویه‌ی کامل
              </Button>
            )}
            {canManage && (
              <>
                <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                  ویرایشِ قرارداد
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                >
                  <Ban className="size-3.5" />
                  ابطالِ قرارداد
                </Button>
              </>
            )}
          </div>
        )}
      </SectionCard>

      <InstallmentPaymentDialog
        target={paymentTarget && { ...paymentTarget, invoiceNumber: plan.invoiceNumber, customerName: plan.customerName }}
        onOpenChange={(open) => !open && setPaymentTarget(null)}
      />
      <InstallmentPenaltyWaiveDialog installment={waiveTarget} onOpenChange={(open) => !open && setWaiveTarget(null)} />
      <InstallmentPlanEditDialog plan={plan} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="ابطالِ قرارداد اقساط"
        description="اقساطِ پرداخت‌نشده لغو می‌شوند و سودِ اقساط از حسابِ مشتری برداشته می‌شود. پرداخت‌های ثبت‌شده می‌مانند و ماندهِ فاکتور بعد از آن با دریافتِ عادی گرفته می‌شود. این کار برگشت‌پذیر نیست."
        confirmLabel="ابطالِ قرارداد"
        pendingLabel="در حال ابطال..."
        isPending={cancel.isPending}
        onConfirm={() => cancel.mutate(plan.id, { onSuccess: () => setConfirmCancel(false) })}
      />
    </>
  );
}
