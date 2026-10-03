import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { usePurchaseChangesSaver } from "@/features/purchases/orders/services/mutations";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsCard from "../components/forms/PurchaseItemsCard";
import CancelPurchaseDialog from "../components/forms/CancelPurchaseDialog";
import DocumentFormLayout, {
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import OrderInfoCard from "@/shared/components/forms/OrderInfoCard";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import IssuedInvoiceNotice from "@/shared/components/invoice/IssuedInvoiceNotice";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import PurchaseStatusBadge from "@/shared/components/status/PurchaseStatusBadge";
import { useIssuedDocumentDraft } from "@/shared/hooks/useIssuedDocumentDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedPurchaseReturnsQuery } from "@/features/purchases/returns/services/queries";
import { hasAnythingArrived } from "@/features/purchases/returns/domain/purchaseReturnVocabulary";
import {
  canCancelPurchase,
  purchaseStatusTargets,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_PAYMENT_SIDE } from "@/features/purchases/orders/domain/purchasePayments";
import {
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "@/features/purchases/orders/services/constants";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { savedInvoiceTotals } from "@/shared/domain/invoice/lineMath";
import { ROUTES } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";

/** گزینه‌های وضعیت: فعلی، مقصدهای مجاز، و لغو اگر ممکن است. */
function statusOptionsOf(purchase) {
  const current = purchase.status;
  return [
    { value: current, label: PURCHASE_STATUS_LABELS[current] },
    ...purchaseStatusTargets(purchase)
      .filter((target) => target !== current)
      .map((target) => ({ value: target, label: PURCHASE_STATUS_LABELS[target] })),
    ...(canCancelPurchase(purchase)
      ? [{ value: PURCHASE_STATUSES.CANCELLED, label: "لغو خرید" }]
      : []),
  ];
}

/**
 * خریدِ **صادرشده** — همان چیدمانِ فرمِ ثبت (`PurchaseForm`)، با تامین‌کننده و
 * اقلامِ فقط‌خواندنی. پرداخت‌ها، وضعیت، سررسید و پیوست‌ها عوض می‌شوند و همه با
 * یک «ثبت تغییرات» ذخیره می‌شوند (`useIssuedDocumentDraft`)؛ لغو پیش از ذخیره
 * تأیید می‌خواهد.
 */
export default function PurchaseIssuedView({ purchase }) {
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const draft = useIssuedDocumentDraft(purchase, PURCHASE_PAYMENT_SIDE.direction);
  const saver = usePurchaseChangesSaver(purchase.id);
  const { data: relatedReturns } = useRelatedPurchaseReturnsQuery(purchase.id);

  const canUpdate = allows("PurchaseUpdate");
  const isCancelled = purchase.status === PURCHASE_STATUSES.CANCELLED;
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
    if (Number(draft.status) === PURCHASE_STATUSES.CANCELLED) setConfirmCancel(true);
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
            <PurchaseSupplierSection
              selectedId={purchase.supplierId}
              selectedName={purchase.supplierName}
              readOnly
            />
            <PurchaseItemsCard purchase={purchase} />
            <PaymentsCard
              draft={draft.payments}
              side={PURCHASE_PAYMENT_SIDE}
              total={purchase.totalAmount}
              payable={purchase.payableAmount}
              canManage={allows("PurchasePayment")}
              refundOnly={isCancelled}
              notice={
                Number(purchase.payableAmount) < Number(purchase.totalAmount)
                  ? "«قابل پرداخت» سهمِ مقدارهای بسته‌شده با کسری را از جمع فاکتور کم کرده است."
                  : undefined
              }
            />
            <RelatedReturnsCard
              returns={relatedReturns}
              side={sideConfig(RETURN_SIDES.PURCHASE)}
              detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
              title="مرجوعی‌های این خرید"
            />
            <OrderLogisticsSection
              title="تحویل و حمل"
              drivers={purchase.drivers}
              notes={purchase.receivingNotes}
              notesLabel="یادداشت‌های دریافت"
            />
          </>
        }
        aside={
          <>
            <OrderInfoCard
              issued
              formData={{ ...purchase, paymentDate: draft.dueDate }}
              onFormChange={({ paymentDate }) => draft.setDueDate(paymentDate)}
              headerAction={!isCancelled && <IssuedInvoiceNotice movedLabel="دریافت" />}
              status={
                canUpdate
                  ? { value: Number(draft.status), options: statusOptionsOf(purchase), onChange: draft.setStatus }
                  : undefined
              }
            />
            <InvoiceDocumentSection
              title="فاکتور"
              invoiceNumber={purchase.invoiceNumber}
              attachments={draft.attachments}
              attachmentLabel="تصویر یا PDFِ فاکتورِ تامین‌کننده"
            />
            <OrderSummaryCard
              title="فاکتور خرید"
              badge={<PurchaseStatusBadge status={purchase.status} withIcon />}
              itemCount={purchase.items?.length ?? 0}
              totals={savedInvoiceTotals(purchase)}
              submitLabel={submitLabel}
              submitDisabled={!draft.count}
              isBusy={isSaving}
              onCancel={draft.count ? draft.discard : undefined}
              cancelLabel="بازگردانی"
              footer={
                hasAnythingArrived(purchase) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => navigate(`${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${purchase.id}`)}
                  >
                    <Undo2 className="size-3.5" />
                    ثبت مرجوعی برای این خرید
                  </Button>
                )
              }
            />
          </>
        }
      />

      <CancelPurchaseDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        isPending={saver.isPending}
        onConfirm={save}
      />
      
    </>
  );
}
