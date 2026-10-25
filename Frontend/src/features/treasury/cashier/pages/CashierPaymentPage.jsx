import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import UnsavedChangesDialog from "@/shared/components/feedback/UnsavedChangesDialog";
import ProformaPaymentSection from "@/features/sales/orders/components/proforma/ProformaPaymentSection";
import ProformaUnavailable from "@/features/sales/orders/components/proforma/ProformaUnavailable";
import ReservationBadge from "@/features/sales/orders/components/proforma/ReservationBadge";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import { useProformaPayment } from "@/features/sales/orders/hooks/useProformaPayment";
import { useReservationCountdown } from "@/features/sales/orders/hooks/useReservationCountdown";
import { useSaleQuery } from "@/features/sales/orders/services/queries";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import Notice from "@/shared/components/feedback/Notice";
import DocumentFormLayout, { OrderSummaryCard } from "@/shared/components/forms/DocumentFormLayout";
import OrderFormSkeleton from "@/shared/components/skeletons/OrderFormSkeleton";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { isSaleProforma } from "@/shared/domain/enums/saleStatus";
import { savedInvoiceTotals } from "@/shared/domain/invoice/lineMath";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { usePaymentDraft } from "@/shared/hooks/usePaymentDraft";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import CashierCustomerCard from "../components/CashierCustomerCard";
import CashierCustomerTabs from "../components/CashierCustomerTabs";

/**
 * دریافتِ یک پیش‌فاکتورِ «آماده‌ی پرداخت» در صندوق. چیدمان: ستونِ پهن شیوه‌ی پرداخت و دریافت (کارِ اصلیِ
 * صندوقدار)؛ ستونِ کناری خلاصه‌ی مشتری و جمع و دکمه‌ی اصلی؛ زیرِ هر دو و تمام‌عرض تب‌های جزئیات. منطقِ
 * دریافت (شیوه، قرارداد، کارتخوان، تحویلِ حضوری) مشترک با صفحه‌ی فروش است (`useProformaPayment`).
 */
function CashierPaymentForm({ sale }) {
  const navigate = useNavigate();
  const payments = usePaymentDraft(sale.paymentDetails || [], SALE_PAYMENT_SIDE.direction);
  const secondsLeft = useReservationCountdown(sale);
  const expired = secondsLeft === 0;
  const [done, setDone] = useState(false);

  const payment = useProformaPayment({ sale, payments, onDone: () => setDone(true), doneLabel: "بازگشت به صندوق" });
  const blocker = useUnsavedChangesGuard(payments.hasChanges && !done, { reason: "دریافتِ صندوق ثبت نشده است" });
  // رفتن پس از commitِ `done`: اگر همان لحظه‌ی ثبت برود، blocker هنوز دریافتِ «ثبت‌نشده» را می‌بیند و جلویش را می‌گیرد.
  useEffect(() => {
    if (done) navigate(ROUTES.TREASURY_CASHIER, { replace: true });
  }, [done, navigate]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!expired) payment.submit();
  };

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        payments={
          expired ? (
            <Notice tone="danger">
              مهلتِ رزرو تمام شده و پرداخت پذیرفته نمی‌شود؛ پیش‌فاکتور باید دوباره رزرو یا از انبار بگذرد.
            </Notice>
          ) : (
            <ProformaPaymentSection sale={sale} payment={payment} payments={payments} />
          )
        }
        aside={
          <>
            <CashierCustomerCard
              customerId={sale.customerId}
              customerName={sale.customerName}
              saleTotal={sale.totalAmount}
            />
            <OrderSummaryCard
              title={`پیش‌فاکتور #${sale.id}`}
              badge={
                <div className="flex items-center gap-1.5">
                  {payment.inPerson && <StatusBadge tone="info">حضوری</StatusBadge>}
                  <ReservationBadge secondsLeft={secondsLeft} />
                </div>
              }
              itemCount={sale.items.length}
              totals={savedInvoiceTotals(sale)}
              canSubmit={!expired}
              submitLabel={payment.submitLabel}
              submitDisabled={!payment.canSubmit}
              isBusy={payment.isPending || payment.posLocked}
              onCancel={() => navigate(ROUTES.TREASURY_CASHIER)}
              cancelLabel="بازگشت به صندوق"
              footer={
                <Button asChild variant="ghost" size="sm" className="w-full gap-1.5">
                  <Link to={routeWithId(ROUTES.SALES_DETAIL, sale.id)}>
                    <ExternalLink className="size-3.5" />
                    صفحه‌ی کاملِ فروش
                  </Link>
                </Button>
              }
            />
          </>
        }
        below={<CashierCustomerTabs sale={sale} />}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}

export default function CashierPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sale, isLoading, isError, error, refetch } = useSaleQuery(id);

  usePageHeader({ title: sale ? `صندوق — ${sale.customerName || ""}` : "صندوق", showBack: true });

  if (isLoading) return <OrderFormSkeleton />;
  if (isError || !sale) {
    return (
      <DetailErrorState
        error={error}
        notFoundMessage="پیش‌فاکتور یافت نشد."
        onRetry={refetch}
        onBack={() => navigate(ROUTES.TREASURY_CASHIER)}
      />
    );
  }
  if (!isSaleProforma(sale.status) || Number(sale.proformaStage) !== SaleProformaStageEnum.WAREHOUSE_CHECKED) {
    return (
      <ProformaUnavailable
        sale={sale}
        purpose="آماده‌ی پرداخت"
        backTo={ROUTES.TREASURY_CASHIER}
        backLabel="بازگشت به صندوق"
      />
    );
  }

  // نسخه‌ی تازه (ویرایشِ هم‌زمانِ فروش) فرم را از نو می‌سازد.
  return <CashierPaymentForm key={`${sale.id}:${sale.revision}`} sale={sale} />;
}
