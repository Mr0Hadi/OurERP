import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Ban, Link2, Unlink } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusBadge from "@/shared/components/status/StatusBadge";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import Notice from "@/shared/components/feedback/Notice";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian, gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePartyPaymentQuery } from "../services/queries";
import { useRemoveAllocationMutation, useVoidPartyPaymentMutation } from "../services/mutations";
import AllocateDialog from "../components/AllocateDialog";
import { directionLabel, isActiveAllocation, partyKindOf } from "../domain/partyPayment";

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

const partyRoute = (payment) =>
  payment.supplierId
    ? routeWithId(ROUTES.SUPPLIERS_DETAIL, payment.supplierId)
    : routeWithId(ROUTES.CUSTOMERS_DETAIL, payment.customerId);

const documentRoute = (allocation) =>
  allocation.saleId
    ? routeWithId(ROUTES.SALES_DETAIL, allocation.saleId)
    : routeWithId(ROUTES.PURCHASES_DETAIL, allocation.purchaseId);

/**
 * یک دریافت/پرداختِ علی‌الحساب (`GetPartyPaymentDetail`): مشخصات، مبلغِ تخصیص‌یافته و مانده، تخصیص‌ها (فعال و
 * برداشته‌شده) با «برداشتن»، «تخصیص» و «ابطال». ابطال تا وقتی تخصیصِ فعال هست بسته است (قاعده‌ی سرور).
 */
export default function PartyPaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { allows } = usePermission();
  const query = usePartyPaymentQuery(id);
  const removeAllocation = useRemoveAllocationMutation();
  const voidPayment = useVoidPartyPaymentMutation();
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [confirmVoid, setConfirmVoid] = useState(false);

  usePageHeader({ title: "دریافت/پرداختِ علی‌الحساب", showBack: true, onBack: () => navigate(ROUTES.TREASURY_PARTY_PAYMENTS) });

  if (query.isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (query.isError || !query.data) {
    return (
      <DetailErrorState
        error={query.error}
        notFoundMessage="این دریافت/پرداخت پیدا نشد."
        onRetry={() => query.refetch()}
        onBack={() => navigate(ROUTES.TREASURY_PARTY_PAYMENTS)}
      />
    );
  }

  const payment = query.data;
  const voided = Boolean(payment.voidedAt);
  const active = payment.allocations.filter(isActiveAllocation);
  const canCreate = allows("PartyPaymentCreate");
  const canAllocate = canCreate && payment.canAllocate && Number(payment.unallocatedAmount) > 0;
  const canVoid = allows("PartyPaymentVoid") && !voided;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <SectionCard
        title={directionLabel(partyKindOf(payment), payment.direction)}
        action={
          voided ? (
            <StatusBadge tone="danger">ابطال‌شده</StatusBadge>
          ) : (
            <StatusBadge tone={payment.direction === PaymentDirectionEnum.IN ? "success" : "info"}>
              {formatRial(payment.amount)}
            </StatusBadge>
          )
        }
      >
        {voided && (
          <Notice tone="neutral">ابطال شده در {gregorianToPersianDateTime(payment.voidedAt)}؛ از حسابِ شخص و گردشِ صندوق/بانک برگشت خورد.</Notice>
        )}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="طرف حساب">
            <Link to={partyRoute(payment)} className="text-primary hover:underline">
              {payment.partyName}
            </Link>
          </Field>
          <Field label="تاریخ">{gregorianToPersian(payment.paidAt)}</Field>
          <Field label="روش">{PAYMENT_TYPE_LABELS[payment.type]}</Field>
          <Field label="مبلغ">{formatRial(payment.amount)}</Field>
          <Field label="تخصیص‌یافته">{formatRial(payment.allocatedAmount)}</Field>
          <Field label="تخصیص‌نیافته">{formatRial(payment.unallocatedAmount)}</Field>
          {payment.bankAccountTitle && <Field label="صندوق / حساب">{payment.bankAccountTitle}</Field>}
          {(payment.checkNumber || payment.transferRef) && (
            <Field label={payment.checkNumber ? "شماره چک" : "شماره پیگیری"}>
              <span dir="ltr">{payment.checkNumber || payment.transferRef}</span>
            </Field>
          )}
          {payment.description && <Field label="شرح">{payment.description}</Field>}
          <Field label="ثبت">
            {[payment.recordedByName, payment.recordedAt && gregorianToPersianDateTime(payment.recordedAt)].filter(Boolean).join(" · ") || "—"}
          </Field>
        </dl>
        {!payment.canAllocate && !voided && (
          <p className="text-xs text-muted-foreground">
            برگرداندنِ بستانکاری است و به فاکتوری تخصیص داده نمی‌شود.
          </p>
        )}
        {(canAllocate || canVoid) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {canAllocate && (
              <Button type="button" size="sm" className="gap-1.5" onClick={() => setAllocateOpen(true)}>
                <Link2 className="size-3.5" />
                تخصیص به فاکتورها
              </Button>
            )}
            {canVoid && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setConfirmVoid(true)}
                disabled={active.length > 0}
                title={active.length > 0 ? "اول تخصیص‌ها را بردارید" : undefined}
              >
                <Ban className="size-3.5" />
                ابطال
              </Button>
            )}
          </div>
        )}
      </SectionCard>

      {payment.canAllocate && (
        <SectionCard title="تخصیص‌ها">
          {payment.allocations.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">هنوز به فاکتوری تخصیص داده نشده؛ مبلغ روی حسابِ شخص است.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {payment.allocations.map((allocation) => {
                const live = isActiveAllocation(allocation);
                return (
                  <li key={allocation.id} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", !live && "text-muted-foreground")}>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <Link to={documentRoute(allocation)} className="font-mono text-xs text-primary hover:underline">
                          {allocation.invoiceNumber || (allocation.saleId ? "فاکتور فروش" : "فاکتور خرید")}
                        </Link>
                        {!live && <StatusBadge tone="neutral" size="sm">برداشته شد</StatusBadge>}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {gregorianToPersian(allocation.allocatedAt)}
                      </p>
                    </div>
                    <span className={cn("font-semibold tabular-nums", !live && "line-through")}>{formatNumber(allocation.amount)}</span>
                    {live && canCreate && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="برداشتنِ تخصیص"
                        title="برداشتنِ تخصیص"
                        onClick={() => setRemoveTarget(allocation)}
                      >
                        <Unlink className="size-3.5" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}

      <AllocateDialog payment={payment} open={allocateOpen} onOpenChange={setAllocateOpen} />
      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="برداشتنِ تخصیص"
        description={`فاکتور دوباره ${formatRial(removeTarget?.amount)} بدهکار می‌شود و همین مبلغ به تخصیص‌نیافته‌ی این پرداخت برمی‌گردد. حسابِ شخص تکان نمی‌خورد؛ فاکتوری که با این تخصیص صادر شده صادرشده می‌ماند.`}
        confirmLabel="برداشتن"
        pendingLabel="در حال انجام..."
        isPending={removeAllocation.isPending}
        onConfirm={() => {
          // نگهبانِ `null` لازم است: React Compiler `removeTarget.id` را برای memo در خودِ رندر می‌خواند.
          if (!removeTarget) return;
          removeAllocation.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
        }}
      />
      <ConfirmDialog
        open={confirmVoid}
        onOpenChange={setConfirmVoid}
        title="ابطالِ دریافت/پرداخت"
        description="ردیفِ برگشت در حسابِ شخص می‌نشیند و پول از گردشِ صندوق/بانک بیرون می‌رود. برگشت‌پذیر نیست؛ اگر اشتباه بود، دوباره درست ثبتش کنید."
        confirmLabel="ابطال"
        pendingLabel="در حال ابطال..."
        isPending={voidPayment.isPending}
        onConfirm={() => voidPayment.mutate(payment.id, { onSuccess: () => setConfirmVoid(false) })}
      />
    </div>
  );
}
