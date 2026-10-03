import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { useSaleChangesSaver } from "@/features/sales/orders/services/mutations";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import StatusChangeCard from "@/shared/components/forms/StatusChangeCard";
import PendingChangesBar from "@/shared/components/forms/PendingChangesBar";
import DocumentPaymentsEditor from "@/shared/components/payments/DocumentPaymentsEditor";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
import {
  RETURNABLE_SALE_STATUSES,
  hasAnythingShipped,
} from "../domain/saleRules";
import { SALE_PAYMENT_SIDE } from "../domain/salePayments";
import InvoiceInfoCard from "@/shared/components/invoice/InvoiceInfoCard";
import IssuedInvoiceNotice from "@/shared/components/invoice/IssuedInvoiceNotice";
import { useIssuedDocumentDraft } from "@/shared/hooks/useIssuedDocumentDraft";
import { ROUTES } from "@/shared/constants/routes";
import {
  SaleStatusEnum,
  SALE_STATUS_LABELS,
} from "@/shared/domain/enums/saleStatus";
import { PAYMENT_TYPE_LABELS, PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatRial } from "@/shared/lib/numberFormat";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedSalesReturnsQuery } from "@/features/sales/returns/services/queries";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import SaleStatusBadge from "@/shared/components/status/SaleStatusBadge";

/** لغو فقط پیش از هر ارسالی؛ قرارداد اقساطیِ فعال را خودِ سرور می‌سنجد. */
const canCancelSale = (sale) =>
  sale.status !== SaleStatusEnum.CANCELLED &&
  sale.status !== SaleStatusEnum.DELIVERED &&
  !hasAnythingShipped(sale);

/**
 * گزینه‌های وضعیت. `ChangeSaleStatus` فقط «تحویل کامل» را از «ارسال شده»
 * می‌پذیرد؛ «ارسال ناقص/ارسال شده» را صفحه‌ی ارسالِ انبار می‌گذارد.
 */
function statusOptionsOf(sale) {
  const current = sale.status;
  return [
    { value: current, label: SALE_STATUS_LABELS[current], hint: "بدونِ تغییرِ وضعیت." },
    ...(current === SaleStatusEnum.SHIPPED
      ? [
          {
            value: SaleStatusEnum.DELIVERED,
            label: SALE_STATUS_LABELS[SaleStatusEnum.DELIVERED],
            hint: "مشتری همه‌ی کالا را تحویل گرفت.",
          },
        ]
      : []),
    ...(canCancelSale(sale)
      ? [
          {
            value: SaleStatusEnum.CANCELLED,
            label: "لغو",
            hint: "لغو نهایی است؛ پولِ مشتری روی فروش می‌ماند و با «پول برگشتی» برمی‌گردد.",
          },
        ]
      : []),
  ];
}

/**
 * فروشِ **صادرشده** — اقلام، قیمت و مشتری دیگر عوض نمی‌شوند؛ وضعیت،
 * پرداخت‌ها، سررسید و پیوست‌ها با یک «ثبت تغییرات» (`useIssuedDocumentDraft`
 * + `useSaleChangesSaver`).
 *
 * ستونِ اصلی: مشخصاتِ فاکتور ← اقلام ← مرجوعی‌ها ← حمل. ستونِ کناری: وضعیت
 * و کارهای سند ← پرداخت‌ها و سررسید ← سند و پیوست.
 */
export default function SaleIssuedView({ sale }) {
  const navigate = useNavigate();
  const { can, isError: permissionsUnknown } = usePermission();
  const allow = (permission) => permissionsUnknown || can(permission);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const draft = useIssuedDocumentDraft(sale, SALE_PAYMENT_SIDE.direction);
  const saver = useSaleChangesSaver(sale.id);

  // خلاصه‌ی مرجوعی‌های همین سند، با پیوند به جزئیاتِ هر کدام.
  const { data: relatedReturns } = useRelatedSalesReturnsQuery(sale.id);

  const canUpdate = allow("SaleUpdate");
  const isCancelled = sale.status === SaleStatusEnum.CANCELLED;
  const isInstallment = sale.paymentType === PaymentTypeEnum.INSTALLMENT;
  const returnable = RETURNABLE_SALE_STATUSES.includes(Number(sale.status));
  const cancelStaged = Number(draft.status) === SaleStatusEnum.CANCELLED;

  const save = () => {
    if (draft.attachments.isUploading) return;
    saver.mutate(draft.changes(), {
      onSuccess: () => {
        draft.attachments.commit();
        setConfirmCancel(false);
      },
    });
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <InvoiceInfoCard
            rows={[
              { label: "مشتری", value: sale.customerName, wide: true },
              { label: "شماره فاکتور", value: sale.invoiceNumber },
              { label: "تاریخ فاکتور", value: gregorianToPersian(sale.invoiceDate) },
              { label: "روش پرداخت", value: PAYMENT_TYPE_LABELS[sale.paymentType] },
              { label: "جمع فاکتور", value: formatRial(sale.totalAmount), emphasis: true },
            ]}
            description={sale.description}
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
                render: (item) => (Number(item.shippedQuantity) || 0).toLocaleString("fa-IR"),
              },
            ]}
          />
          <RelatedReturnsCard
            returns={relatedReturns}
            side={sideConfig(RETURN_SIDES.SALES)}
            detailRoute={ROUTES.SALES_RETURNS_DETAIL}
            title="مرجوعی‌های ثبت‌شده برای این فروش"
          />
          <OrderLogisticsSection
            title="ارسال و حمل"
            drivers={sale.drivers}
            notes={sale.shippingNotes}
            notesLabel="یادداشت‌های ارسال"
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:p-0.5 custom-scroll">
          <StatusChangeCard
            statusBadge={<SaleStatusBadge status={sale.status} withIcon />}
            options={statusOptionsOf(sale)}
            value={Number(draft.status)}
            onChange={draft.setStatus}
            canEdit={canUpdate}
            headerAction={!isCancelled && <IssuedInvoiceNotice movedLabel="ارسال" />}
            hint={
              isCancelled
                ? "لغو نهایی است."
                : "«ارسال ناقص» و «ارسال شده» را صفحه‌ی ارسالِ انبار تعیین می‌کند."
            }
          >
            {returnable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => navigate(`${ROUTES.SALES_RETURNS_NEW}?saleId=${sale.id}`)}
              >
                <Undo2 className="h-4 w-4" />
                ثبت مرجوعی از این فروش
              </Button>
            )}
          </StatusChangeCard>

          <DocumentPaymentsEditor
            draft={draft.payments}
            side={SALE_PAYMENT_SIDE}
            totalAmount={sale.totalAmount}
            payableAmount={sale.payableAmount}
            dueDate={draft.dueDate}
            onDueDateChange={draft.setDueDate}
            canManage={allow("SalePayment") && !isInstallment}
            refundOnly={isCancelled}
            notice={
              isInstallment
                ? "پرداخت‌های فروشِ اقساطی از قرارداد اقساط ثبت می‌شوند."
                : isCancelled
                  ? "فروش لغو شده است؛ پولِ مشتری را با «پول برگشتی» برگردانید."
                  : undefined
            }
          />

          <InvoiceDocumentSection
            title="فاکتور فروش"
            invoiceNumber={sale.invoiceNumber}
            attachments={draft.attachments}
            documentKind="sale"
            documentId={sale.id}
            attachmentLabel="فاکتور صادرشده برای مشتری"
          />
        </div>
      </div>

      <PendingChangesBar
        count={draft.count}
        isSaving={saver.isPending || draft.attachments.isUploading}
        onDiscard={draft.discard}
        onSave={() => (cancelStaged ? setConfirmCancel(true) : save())}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="لغو فروش"
        description="لغو نهایی است و قابل بازگشت نیست. پرداخت‌های مشتری روی فروش می‌مانند و مانده‌ی حسابش منفی می‌شود تا وقتی پولش را با «پول برگشتی» برگردانید."
        confirmLabel="لغو فروش و ذخیره"
        pendingLabel="در حال ذخیره..."
        isPending={saver.isPending}
        onConfirm={save}
      />
    </div>
  );
}
