import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Undo2 } from "lucide-react";

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
import {
  useChangeSaleStatusMutation,
  useUpdateSaleAttachmentsMutation,
  useUpdateSalePaymentDateMutation,
  useSalePaymentMutations,
} from "@/features/sales/orders/services/mutations";
import SalePaymentsCard from "../components/forms/SalePaymentsCard";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import StatusChangeCard from "@/shared/components/forms/StatusChangeCard";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import InvoiceLinesCard from "@/shared/components/invoice/InvoiceLinesCard";
import InvoiceInfoCard from "@/shared/components/invoice/InvoiceInfoCard";
import IssuedInvoiceNotice from "@/shared/components/invoice/IssuedInvoiceNotice";
import PaymentDueDateCard from "@/shared/components/invoice/PaymentDueDateCard";
import InvoiceAttachmentsSaveButton from "@/shared/components/invoice/InvoiceAttachmentsSaveButton";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { ROUTES } from "@/shared/constants/routes";
import {
  SaleStatusEnum,
  SALE_STATUS_LABELS,
} from "@/shared/domain/enums/saleStatus";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedSalesReturnsQuery } from "@/features/sales/returns/services/queries";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";

// وضعیت‌هایی که ثبت مرجوعی از روی آن‌ها ممکن است — یعنی چیزی از انبار
// بیرون رفته باشد.
const RETURNABLE_STATUSES = [
  SaleStatusEnum.SHIPPED,
  SaleStatusEnum.PARTIALLY_DELIVERED,
  SaleStatusEnum.DELIVERED,
];

/** `ChangeSaleStatus` فقط «تحویل کامل» را از «ارسال شده» می‌پذیرد (لغو دکمه‌ی خودش را دارد). */
const statusTargetsOf = (sale) =>
  sale.status === SaleStatusEnum.SHIPPED ? [SaleStatusEnum.DELIVERED] : [];

/** لغو فقط پیش از هر ارسالی؛ قرارداد اقساطیِ فعال را خودِ سرور می‌سنجد. */
const canCancelSale = (sale) =>
  sale.status !== SaleStatusEnum.CANCELLED &&
  sale.status !== SaleStatusEnum.DELIVERED &&
  (sale.items || []).every((item) => !(Number(item.shippedQuantity) > 0));

/**
 * فروشِ **صادرشده** — فقط‌خواندنی. اقلام، قیمت، مشتری و روش پرداخت دیگر
 * عوض نمی‌شوند؛ فقط پرداخت‌ها، وضعیت، پیوست‌ها و مهلت پرداخت، هر کدام با
 * endpointِ خودش.
 */
export default function SaleIssuedView({ sale }) {
  const navigate = useNavigate();
  const { can, isError: permissionsUnknown } = usePermission();
  const allow = (permission) => permissionsUnknown || can(permission);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const statusMutation = useChangeSaleStatusMutation(sale.id);
  const attachmentsMutation = useUpdateSaleAttachmentsMutation(sale.id);
  const dueDateMutation = useUpdateSalePaymentDateMutation(sale.id);
  const payments = useSalePaymentMutations(sale.id);

  // خلاصه‌ی مرجوعی‌های همین سند، با پیوند به جزئیاتِ هر کدام.
  const { data: relatedReturns } = useRelatedSalesReturnsQuery(sale.id);

  const attachments = useInvoiceAttachments(sale.attachments || []);
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(sale.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.id, sale.updatedAt, attachmentsReset]);

  const canUpdate = allow("SaleUpdate");
  const isCancelled = sale.status === SaleStatusEnum.CANCELLED;
  const cancellable = canCancelSale(sale);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <InvoiceLinesCard
            title="اقلام فروش"
            items={sale.items}
            totalAmount={sale.totalAmount}
          />
          <RelatedReturnsCard
            returns={relatedReturns}
            side={sideConfig(RETURN_SIDES.SALES)}
            detailRoute={ROUTES.SALES_RETURNS_DETAIL}
            title="مرجوعی‌های ثبت‌شده برای این فروش"
          />
          <InvoiceInfoCard
            rows={[
              { label: "مشتری", value: sale.customerName },
              { label: "شماره فاکتور", value: sale.invoiceNumber },
              {
                label: "تاریخ فاکتور",
                value: gregorianToPersian(sale.invoiceDate),
              },
              {
                label: "روش پرداخت",
                value: PAYMENT_TYPE_LABELS[sale.paymentType],
              },
            ]}
            description={sale.description}
          />
          <OrderLogisticsSection
            title="ارسال و حمل"
            drivers={sale.drivers}
            notes={sale.shippingNotes}
            notesLabel="یادداشت‌های ارسال"
          />
        </div>

        <div className="space-y-4">
          <IssuedInvoiceNotice movedLabel="ارسال" />

          <SalePaymentsCard
            sale={sale}
            payments={payments}
            canManage={allow("SalePayment")}
            notice={
              isCancelled
                ? "فروش لغو شده است؛ پولی را که از مشتری گرفته شده با «پول برگشتی» برگردانید."
                : undefined
            }
          />

          <StatusChangeCard
            statusLabel={SALE_STATUS_LABELS[sale.status] ?? "—"}
            targets={statusTargetsOf(sale)}
            labels={SALE_STATUS_LABELS}
            canEdit={canUpdate}
            isPending={statusMutation.isPending}
            onChange={(status, options) =>
              statusMutation.mutate(status, options)
            }
            hint={
              isCancelled
                ? "لغو نهایی است."
                : "«ارسال ناقص» و «ارسال شده» را صفحه‌ی ارسالِ انبار تعیین می‌کند؛ «تحویل کامل» بعد از ارسالِ همه‌ی اقلام ثبت می‌شود."
            }
          />

          <PaymentDueDateCard
            value={sale.dueDate}
            canEdit={canUpdate}
            isPending={dueDateMutation.isPending}
            onSave={(date) => dueDateMutation.mutate(date)}
          />

          <InvoiceDocumentSection
            title="فاکتور فروش"
            invoiceNumber={sale.invoiceNumber}
            attachments={attachments}
            documentKind="sale"
            documentId={sale.id}
            attachmentLabel="فاکتور صادرشده برای مشتری"
          />
          {canUpdate && (
            <InvoiceAttachmentsSaveButton
              attachments={attachments}
              saved={sale.attachments}
              isPending={attachmentsMutation.isPending}
              onSave={(list) =>
                attachmentsMutation.mutate(list, {
                  onSuccess: () => attachments.commit(),
                })
              }
            />
          )}

          {RETURNABLE_STATUSES.includes(sale.status) && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                navigate(`${ROUTES.SALES_RETURNS_NEW}?saleId=${sale.id}`)
              }
            >
              <Undo2 className="h-4 w-4" />
              ثبت مرجوعی از این فروش
            </Button>
          )}

          {cancellable && canUpdate && (
            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowCancelDialog(true)}
              disabled={statusMutation.isPending}
            >
              <Ban className="h-4 w-4" />
              لغو فروش
            </Button>
          )}
        </div>
      </div>

      <AlertDialog
        open={showCancelDialog}
        onOpenChange={(open) =>
          !statusMutation.isPending && setShowCancelDialog(open)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو فروش</AlertDialogTitle>
            <AlertDialogDescription>
              لغو نهایی است و قابل بازگشت نیست. پرداخت‌های مشتری روی فروش
              می‌مانند و مانده‌ی حسابش منفی می‌شود تا وقتی پولش را با «پول
              برگشتی» برگردانید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={statusMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                statusMutation.mutate(SaleStatusEnum.CANCELLED, {
                  onSuccess: () => setShowCancelDialog(false),
                });
              }}
            >
              {statusMutation.isPending ? "در حال لغو..." : "لغو فروش"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
