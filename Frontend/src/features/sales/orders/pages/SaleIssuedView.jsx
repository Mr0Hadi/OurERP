import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { useSaleChangesSaver } from "@/features/sales/orders/services/mutations";
import DocumentFormLayout from "@/shared/components/forms/DocumentFormLayout";
import DocumentHero from "@/shared/components/documents/DocumentHero";
import IssuedStatusMenu from "@/shared/components/documents/IssuedStatusMenu";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import PendingChangesBar from "@/shared/components/forms/PendingChangesBar";
import PaymentsLedgerCard from "@/shared/components/payments/PaymentsLedgerCard";
import AttachmentsCard from "@/shared/components/invoice/AttachmentsCard";
import DocumentOutputMenu from "@/shared/components/invoice/DocumentOutputMenu";
import IssuedInvoiceNotice from "@/shared/components/invoice/IssuedInvoiceNotice";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import SaleStatusBadge from "@/shared/components/status/SaleStatusBadge";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
import { useIssuedDocumentDraft } from "@/shared/hooks/useIssuedDocumentDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedSalesReturnsQuery } from "@/features/sales/returns/services/queries";
import { getSaleInvoicePdf } from "@/shared/services/invoice/api-v1";
import { RETURNABLE_SALE_STATUSES, hasAnythingShipped } from "../domain/saleRules";
import { SALE_PAYMENT_SIDE } from "../domain/salePayments";
import { SaleStatusEnum, SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";

/** لغو فقط پیش از هر ارسالی؛ قرارداد اقساطیِ فعال را خودِ سرور می‌سنجد. */
const canCancelSale = (sale) =>
  sale.status !== SaleStatusEnum.CANCELLED &&
  sale.status !== SaleStatusEnum.DELIVERED &&
  !hasAnythingShipped(sale);

/**
 * فروشِ **صادرشده** — اقلام، قیمت و مشتری دیگر عوض نمی‌شوند؛ پرداخت‌ها،
 * سررسید، پیوست‌ها و وضعیت با یک «ثبت تغییرات» (`useIssuedDocumentDraft`)،
 * به‌جز لغو که تأیید می‌خواهد و همان لحظه ذخیره می‌شود.
 *
 * `ChangeSaleStatus` دستی فقط «ارسال شده → تحویل کامل» را می‌پذیرد؛ «ارسال
 * ناقص/ارسال شده» را ارسالِ انبار می‌گذارد.
 *
 * بالا: سرِ فاکتور. ستونِ اصلی: اقلام ← مرجوعی‌ها ← حمل. کنار: دریافت‌ها ← پیوست‌ها.
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
  const payable = sale.payableAmount ?? sale.totalAmount;

  const save = (overrides = {}) => {
    if (draft.attachments.isUploading) return;
    saver.mutate(
      { ...draft.changes(), ...overrides },
      {
        onSuccess: () => {
          draft.attachments.commit();
          setConfirmCancel(false);
        },
      },
    );
  };

  const transitions =
    canUpdate && sale.status === SaleStatusEnum.SHIPPED && Number(draft.status) !== SaleStatusEnum.DELIVERED
      ? [
          {
            value: SaleStatusEnum.DELIVERED,
            label: SALE_STATUS_LABELS[SaleStatusEnum.DELIVERED],
            hint: "مشتری همه‌ی کالا را تحویل گرفت.",
          },
        ]
      : [];

  return (
    <>
      <DocumentFormLayout
        top={
          <DocumentHero
            kindLabel="فاکتور فروش"
            number={sale.invoiceNumber}
            statusBadge={<SaleStatusBadge status={sale.status} withIcon />}
            nextStatusBadge={draft.statusDirty && <SaleStatusBadge status={Number(draft.status)} />}
            onUndoStatus={() => draft.setStatus(sale.status)}
            help={!isCancelled && <IssuedInvoiceNotice movedLabel="ارسال" />}
            party={{
              label: "مشتری",
              name: sale.customerName,
              href: sale.customerId ? routeWithId(ROUTES.CUSTOMERS_DETAIL, sale.customerId) : null,
            }}
            date={sale.invoiceDate}
            paymentTypeBadge={<PaymentTypeBadge type={sale.paymentType} />}
            money={{
              total: sale.totalAmount,
              payable,
              paid: draft.payments.netPaid,
              dueDate: draft.dueDate,
            }}
            description={sale.description}
            actions={
              <>
                {RETURNABLE_SALE_STATUSES.includes(Number(sale.status)) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => navigate(`${ROUTES.SALES_RETURNS_NEW}?saleId=${sale.id}`)}
                  >
                    <Undo2 className="size-4" />
                    ثبت مرجوعی
                  </Button>
                )}
                <DocumentOutputMenu
                  serverPdf={{
                    name: sale.invoiceNumber || `sale-${sale.id}`,
                    fetchPdf: () => getSaleInvoicePdf(sale.id),
                  }}
                  attachments={draft.attachments}
                />
                <IssuedStatusMenu
                  transitions={transitions}
                  onTransition={draft.setStatus}
                  onCancel={canUpdate && canCancelSale(sale) ? () => setConfirmCancel(true) : undefined}
                  cancelLabel="لغو فروش"
                />
              </>
            }
          />
        }
        main={
          <>
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
            <PaymentsLedgerCard
              draft={draft.payments}
              side={SALE_PAYMENT_SIDE}
              payable={payable}
              dueDate={draft.dueDate}
              onDueDateChange={draft.setDueDate}
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
            <AttachmentsCard label="نسخه‌ی امضاشده‌ی فاکتور" attachments={draft.attachments} />
          </>
        }
        footer={
          <PendingChangesBar
            count={draft.count}
            isSaving={saver.isPending || draft.attachments.isUploading}
            onDiscard={draft.discard}
            onSave={() => save()}
          />
        }
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="لغو فروش"
        description="لغو نهایی است و قابل بازگشت نیست. پرداخت‌های مشتری روی فروش می‌مانند تا با «پول برگشتی» برگردانده شوند. تغییرهای ثبت‌نشده‌ی دیگرِ این صفحه هم همراهش ذخیره می‌شوند."
        confirmLabel="لغو فروش"
        pendingLabel="در حال لغو..."
        isPending={saver.isPending}
        onConfirm={() => save({ status: SaleStatusEnum.CANCELLED })}
      />
    </>
  );
}
