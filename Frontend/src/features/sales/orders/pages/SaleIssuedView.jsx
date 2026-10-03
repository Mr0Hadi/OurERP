import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { useSaleChangesSaver } from "@/features/sales/orders/services/mutations";
import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import DocumentFormLayout, {
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import OrderInfoCard from "@/shared/components/forms/OrderInfoCard";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import IssuedInvoiceNotice from "@/shared/components/invoice/IssuedInvoiceNotice";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import SaleStatusBadge from "@/shared/components/status/SaleStatusBadge";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
import { useIssuedDocumentDraft } from "@/shared/hooks/useIssuedDocumentDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedSalesReturnsQuery } from "@/features/sales/returns/services/queries";
import { RETURNABLE_SALE_STATUSES, hasAnythingShipped } from "../domain/saleRules";
import { SALE_PAYMENT_SIDE } from "../domain/salePayments";
import { SaleStatusEnum, SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { savedInvoiceTotals } from "@/shared/domain/invoice/lineMath";
import { ROUTES } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";

/** لغو فقط پیش از هر ارسالی؛ قرارداد اقساطیِ فعال را خودِ سرور می‌سنجد. */
const canCancelSale = (sale) =>
  sale.status !== SaleStatusEnum.CANCELLED &&
  sale.status !== SaleStatusEnum.DELIVERED &&
  !hasAnythingShipped(sale);

/**
 * گزینه‌های وضعیت. `ChangeSaleStatus` دستی فقط «ارسال شده → تحویل کامل» را
 * می‌پذیرد؛ «ارسال ناقص/ارسال شده» را ارسالِ انبار می‌گذارد.
 */
function statusOptionsOf(sale) {
  const current = sale.status;
  return [
    { value: current, label: SALE_STATUS_LABELS[current] },
    ...(current === SaleStatusEnum.SHIPPED
      ? [{ value: SaleStatusEnum.DELIVERED, label: SALE_STATUS_LABELS[SaleStatusEnum.DELIVERED] }]
      : []),
    ...(canCancelSale(sale) ? [{ value: SaleStatusEnum.CANCELLED, label: "لغو فروش" }] : []),
  ];
}

/**
 * فروشِ **صادرشده** — همان چیدمانِ فرمِ ثبت (`SaleForm`)، با مشتری و اقلامِ
 * فقط‌خواندنی. دریافت‌ها، وضعیت، سررسید و پیوست‌ها با یک «ثبت تغییرات» ذخیره
 * می‌شوند (`useIssuedDocumentDraft`)؛ لغو پیش از ذخیره تأیید می‌خواهد.
 */
export default function SaleIssuedView({ sale }) {
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const draft = useIssuedDocumentDraft(sale, SALE_PAYMENT_SIDE.direction);
  const saver = useSaleChangesSaver(sale.id);
  const { data: relatedReturns } = useRelatedSalesReturnsQuery(sale.id);

  const canUpdate = allows("SaleUpdate");
  const isCancelled = sale.status === SaleStatusEnum.CANCELLED;
  const isInstallment = sale.paymentType === PaymentTypeEnum.INSTALLMENT;
  const isSaving = saver.isPending || draft.attachments.isUploading;

  const save = () => {
    if (draft.attachments.isUploading) return;
    saver.mutate(draft.changes(), {
      onSuccess: () => {
        draft.attachments.commit();
        setConfirmCancel(false);
      },
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!draft.count) return;
    if (Number(draft.status) === SaleStatusEnum.CANCELLED) setConfirmCancel(true);
    else save();
  };

  const submitLabel = draft.count
    ? `ثبت تغییرات (${formatNumber(draft.count)})`
    : "ثبت تغییرات";

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        main={
          <>
            <SaleCustomerSection
              selectedId={sale.customerId}
              selectedName={sale.customerName}
              readOnly
            />
            <OrderItemsReadOnly
              title="اقلام فروش"
              items={sale.items}
              totalAmount={sale.totalAmount}
              headerAction={
                hasAnythingShipped(sale) && (
                  <UnitsPageLink params={{ saleId: sale.id }} label="دانه‌های ارسال‌شده" />
                )
              }
              columns={[
                {
                  key: "shipped",
                  label: "ارسال‌شده",
                  render: (item) => formatNumber(Number(item.shippedQuantity) || 0),
                },
              ]}
            />
            <PaymentsCard
              title="دریافت‌ها"
              draft={draft.payments}
              side={SALE_PAYMENT_SIDE}
              total={sale.totalAmount}
              payable={sale.payableAmount}
              canManage={allows("SalePayment") && !isInstallment}
              refundOnly={isCancelled}
              notice={
                isInstallment
                  ? "پرداخت‌های فروشِ اقساطی از قرارداد اقساط ثبت می‌شوند."
                  : isCancelled
                    ? "فروش لغو شده است؛ پولِ مشتری را با «پول برگشتی» برگردانید."
                    : undefined
              }
            />
            <RelatedReturnsCard
              returns={relatedReturns}
              side={sideConfig(RETURN_SIDES.SALES)}
              detailRoute={ROUTES.SALES_RETURNS_DETAIL}
              title="مرجوعی‌های این فروش"
            />
            <OrderLogisticsSection
              title="ارسال و حمل"
              drivers={sale.drivers}
              notes={sale.shippingNotes}
              notesLabel="یادداشت‌های ارسال"
            />
          </>
        }
        aside={
          <>

            <OrderInfoCard
              issued
              formData={{ ...sale, paymentDate: draft.dueDate }}
              onFormChange={({ paymentDate }) => draft.setDueDate(paymentDate)}
              headerAction={!isCancelled && <IssuedInvoiceNotice movedLabel="ارسال" />}
              status={
                canUpdate
                  ? { value: Number(draft.status), options: statusOptionsOf(sale), onChange: draft.setStatus }
                  : undefined
              }
            />
            <InvoiceDocumentSection
              title="فاکتور"
              invoiceNumber={sale.invoiceNumber}
              attachments={draft.attachments}
              documentKind="sale"
              documentId={sale.id}
              attachmentLabel="نسخه‌ی امضاشده‌ی فاکتور"
            />
            <OrderSummaryCard
              title="فاکتور فروش"
              badge={<SaleStatusBadge status={sale.status} withIcon />}
              itemCount={sale.items?.length ?? 0}
              totals={savedInvoiceTotals(sale)}
              submitLabel={submitLabel}
              submitDisabled={!draft.count}
              isBusy={isSaving}
              onCancel={draft.count ? draft.discard : undefined}
              cancelLabel="بازگردانی"
              footer={
                RETURNABLE_SALE_STATUSES.includes(Number(sale.status)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => navigate(`${ROUTES.SALES_RETURNS_NEW}?saleId=${sale.id}`)}
                  >
                    <Undo2 className="size-3.5" />
                    ثبت مرجوعی از این فروش
                  </Button>
                )
              }
            />
          </>
        }
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="لغو فروش"
        description="لغو نهایی است و قابل بازگشت نیست. پرداخت‌های مشتری روی فروش می‌مانند تا با «پول برگشتی» برگردانده شوند."
        confirmLabel="لغو فروش و ذخیره"
        pendingLabel="در حال ذخیره..."
        isPending={saver.isPending}
        onConfirm={save}
      />
    </>
  );
}
