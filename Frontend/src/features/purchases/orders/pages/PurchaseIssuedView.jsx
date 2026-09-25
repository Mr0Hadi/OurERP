import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  useChangePurchaseStatusMutation,
  useUpdatePurchaseAttachmentsMutation,
  useUpdatePurchasePaymentDateMutation,
  usePurchasePaymentMutations,
} from "@/features/purchases/orders/services/mutations";
import PurchaseItemsReceivingSection from "../components/forms/PurchaseItemsReceivingSection";
import PurchasePaymentsCard from "../components/forms/PurchasePaymentsCard";
import { CancelPurchaseDialog } from "./PurchaseDetailForm";
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
  canCancelPurchase,
  getPurchaseLockReason,
  purchaseStatusTargets,
} from "@/features/purchases/orders/domain/purchaseRules";
import {
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "@/features/purchases/orders/services/constants";
import { hasAnythingArrived } from "@/features/purchases/returns/domain/purchaseReturnVocabulary";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedPurchaseReturnsQuery } from "@/features/purchases/returns/services/queries";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";

/**
 * خریدِ **صادرشده** (فاکتورِ تامین‌کننده ثبت شده) — فقط‌خواندنی.
 *
 * فاکتور دیگر ویرایش نمی‌شود؛ فقط پرداخت‌ها، وضعیت، پیوست‌ها و مهلت
 * پرداخت، هر کدام با endpointِ خودش، باز می‌مانند. دریافتِ انبار، بستنِ
 * قلم و پذیرشِ مازاد هم همین‌جا دیده و انجام می‌شوند.
 */
export default function PurchaseIssuedView({ purchase }) {
  const navigate = useNavigate();
  const { can, isError: permissionsUnknown } = usePermission();
  const allow = (permission) => permissionsUnknown || can(permission);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const statusMutation = useChangePurchaseStatusMutation(purchase.id);
  const attachmentsMutation = useUpdatePurchaseAttachmentsMutation(purchase.id);
  const dueDateMutation = useUpdatePurchasePaymentDateMutation(purchase.id);
  const payments = usePurchasePaymentMutations(purchase.id);

  // خلاصه‌ی مرجوعی‌های همین سند، با پیوند به جزئیاتِ هر کدام.
  const { data: relatedReturns } = useRelatedPurchaseReturnsQuery(purchase.id);

  const attachments = useInvoiceAttachments(purchase.attachments || []);
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(purchase.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase.id, purchase.updatedAt, attachmentsReset]);

  const canUpdate = allow("PurchaseUpdate");
  const isCancelled = purchase.status === PURCHASE_STATUSES.CANCELLED;
  const cancellable = canCancelPurchase(purchase);
  const lockReason = getPurchaseLockReason(purchase);
  const canReturn = hasAnythingArrived(purchase);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <InvoiceLinesCard
            title="اقلام خرید"
            items={purchase.items}
            totalAmount={purchase.totalAmount}
          />
          <RelatedReturnsCard
            returns={relatedReturns}
            side={sideConfig(RETURN_SIDES.PURCHASE)}
            detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
            title="مرجوعی‌های ثبت‌شده برای این خرید"
          />
          <PurchaseItemsReceivingSection purchase={purchase} />
          <InvoiceInfoCard
            rows={[
              { label: "تامین‌کننده", value: purchase.supplierName },
              { label: "شماره فاکتور", value: purchase.invoiceNumber },
              {
                label: "تاریخ فاکتور",
                value: gregorianToPersian(purchase.invoiceDate),
              },
              {
                label: "شرایط پرداخت",
                value: PAYMENT_TYPE_LABELS[purchase.paymentType],
              },
            ]}
            description={purchase.description}
          />
          <OrderLogisticsSection
            title="تحویل و حمل"
            drivers={purchase.drivers}
            notes={purchase.receivingNotes}
            notesLabel="یادداشت‌های دریافت"
          />
        </div>

        <div className="space-y-4">
          <IssuedInvoiceNotice movedLabel="دریافت" />

          <PurchasePaymentsCard
            purchase={purchase}
            payments={payments}
            canManage={allow("PurchasePayment")}
            notice={
              Number(purchase.payableAmount) < Number(purchase.totalAmount)
                ? "مبلغ قابل پرداخت، سهمِ مقدارهای بسته‌شده با کسری را از جمع فاکتور کم کرده است."
                : undefined
            }
          />

          <StatusChangeCard
            statusLabel={PURCHASE_STATUS_LABELS[purchase.status]}
            targets={purchaseStatusTargets(purchase)}
            labels={PURCHASE_STATUS_LABELS}
            canEdit={canUpdate}
            isPending={statusMutation.isPending}
            onChange={(status, options) =>
              statusMutation.mutate(status, options)
            }
            hint={
              isCancelled
                ? "لغو نهایی است."
                : "«تحویل ناقص/کامل» را دریافتِ انبار تعیین می‌کند."
            }
          />

          <PaymentDueDateCard
            value={purchase.dueDate}
            canEdit={canUpdate}
            isPending={dueDateMutation.isPending}
            onSave={(date) => dueDateMutation.mutate(date)}
          />

          <InvoiceDocumentSection
            title="فاکتور خرید"
            invoiceNumber={purchase.invoiceNumber}
            attachments={attachments}
            attachmentLabel="فاکتور دریافتی از تامین‌کننده"
          />
          {canUpdate && (
            <InvoiceAttachmentsSaveButton
              attachments={attachments}
              saved={purchase.attachments}
              isPending={attachmentsMutation.isPending}
              onSave={(list) =>
                attachmentsMutation.mutate(list, {
                  onSuccess: () => attachments.commit(),
                })
              }
            />
          )}

          {canReturn && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                navigate(
                  `${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${purchase.id}`,
                )
              }
            >
              <Undo2 className="h-4 w-4" />
              ثبت مرجوعی برای این خرید
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
              لغو خرید
            </Button>
          )}

          {lockReason && (
            <p className="text-xs text-muted-foreground text-center px-2">
              {lockReason}
            </p>
          )}
        </div>
      </div>

      <CancelPurchaseDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        isPending={statusMutation.isPending}
        onConfirm={() =>
          statusMutation.mutate(PURCHASE_STATUSES.CANCELLED, {
            onSuccess: () => setShowCancelDialog(false),
          })
        }
      />
    </div>
  );
}
