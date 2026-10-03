import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { usePurchaseChangesSaver } from "@/features/purchases/orders/services/mutations";
import PurchaseItemsCard from "../components/forms/PurchaseItemsCard";
import CancelPurchaseDialog from "../components/forms/CancelPurchaseDialog";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import StatusChangeCard from "@/shared/components/forms/StatusChangeCard";
import PendingChangesBar from "@/shared/components/forms/PendingChangesBar";
import DocumentPaymentsEditor from "@/shared/components/payments/DocumentPaymentsEditor";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import InvoiceInfoCard from "@/shared/components/invoice/InvoiceInfoCard";
import IssuedInvoiceNotice from "@/shared/components/invoice/IssuedInvoiceNotice";
import { useIssuedDocumentDraft } from "@/shared/hooks/useIssuedDocumentDraft";
import { ROUTES } from "@/shared/constants/routes";
import {
  PURCHASE_SHIPPING_CHOICES,
  canCancelPurchase,
  getPurchaseLockReason,
  purchaseStatusTargets,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_PAYMENT_SIDE } from "@/features/purchases/orders/domain/purchasePayments";
import {
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "@/features/purchases/orders/services/constants";
import { hasAnythingArrived } from "@/features/purchases/returns/domain/purchaseReturnVocabulary";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatRial } from "@/shared/lib/numberFormat";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedPurchaseReturnsQuery } from "@/features/purchases/returns/services/queries";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import PurchaseStatusBadge from "@/shared/components/status/PurchaseStatusBadge";

/** گزینه‌های وضعیت: فعلی، مقصدهای مجاز، و لغو اگر ممکن است. */
function statusOptionsOf(purchase, cancellable) {
  const current = purchase.status;
  return [
    { value: current, label: PURCHASE_STATUS_LABELS[current], hint: "بدونِ تغییرِ وضعیت." },
    ...purchaseStatusTargets(purchase)
      .filter((target) => target !== current)
      .map((target) => ({
        value: target,
        label: PURCHASE_STATUS_LABELS[target],
        hint: PURCHASE_SHIPPING_CHOICES.find((choice) => choice.value === target)?.hint,
      })),
    ...(cancellable
      ? [
          {
            value: PURCHASE_STATUSES.CANCELLED,
            label: "لغو",
            hint: "لغو نهایی است؛ پولِ پرداخت‌شده روی خرید می‌ماند و با «پول برگشتی» برمی‌گردد.",
          },
        ]
      : []),
  ];
}

/**
 * خریدِ **صادرشده** (فاکتورِ تامین‌کننده ثبت شده). فاکتور دیگر ویرایش
 * نمی‌شود؛ وضعیت، پرداخت‌ها، سررسید و پیوست‌ها عوض می‌شوند — همه با یک
 * «ثبت تغییرات» (`useIssuedDocumentDraft` + `usePurchaseChangesSaver`).
 * دریافتِ انبار، بستنِ قلم و پذیرشِ مازاد همین‌جا دیده و انجام می‌شوند.
 *
 * ستونِ اصلی: مشخصاتِ فاکتور ← اقلام ← مرجوعی‌ها ← حمل. ستونِ کناری: وضعیت
 * و کارهای سند ← پرداخت‌ها و سررسید ← سند و پیوست.
 */
export default function PurchaseIssuedView({ purchase }) {
  const navigate = useNavigate();
  const { can, isError: permissionsUnknown } = usePermission();
  const allow = (permission) => permissionsUnknown || can(permission);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const draft = useIssuedDocumentDraft(purchase, PURCHASE_PAYMENT_SIDE.direction);
  const saver = usePurchaseChangesSaver(purchase.id);

  // خلاصه‌ی مرجوعی‌های همین سند، با پیوند به جزئیاتِ هر کدام.
  const { data: relatedReturns } = useRelatedPurchaseReturnsQuery(purchase.id);

  const canUpdate = allow("PurchaseUpdate");
  const isCancelled = purchase.status === PURCHASE_STATUSES.CANCELLED;
  const cancellable = canCancelPurchase(purchase);
  const lockReason = getPurchaseLockReason(purchase);
  const canReturn = hasAnythingArrived(purchase);
  const cancelStaged = Number(draft.status) === PURCHASE_STATUSES.CANCELLED;

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
              { label: "تامین‌کننده", value: purchase.supplierName, wide: true },
              { label: "شماره فاکتور", value: purchase.invoiceNumber },
              { label: "تاریخ فاکتور", value: gregorianToPersian(purchase.invoiceDate) },
              { label: "شرایط پرداخت", value: PAYMENT_TYPE_LABELS[purchase.paymentType] },
              { label: "جمع فاکتور", value: formatRial(purchase.totalAmount), emphasis: true },
            ]}
            description={purchase.description}
          />
          <PurchaseItemsCard purchase={purchase} />
          <RelatedReturnsCard
            returns={relatedReturns}
            side={sideConfig(RETURN_SIDES.PURCHASE)}
            detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
            title="مرجوعی‌های ثبت‌شده برای این خرید"
          />
          <OrderLogisticsSection
            title="تحویل و حمل"
            drivers={purchase.drivers}
            notes={purchase.receivingNotes}
            notesLabel="یادداشت‌های دریافت"
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:p-0.5 custom-scroll">
          <StatusChangeCard
            statusBadge={<PurchaseStatusBadge status={purchase.status} withIcon />}
            options={statusOptionsOf(purchase, cancellable)}
            value={Number(draft.status)}
            onChange={draft.setStatus}
            canEdit={canUpdate}
            headerAction={!isCancelled && <IssuedInvoiceNotice movedLabel="دریافت" />}
            hint={
              isCancelled
                ? "لغو نهایی است."
                : lockReason || "«تحویل ناقص/کامل» را دریافتِ انبار تعیین می‌کند."
            }
          >
            {canReturn && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() =>
                  navigate(`${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${purchase.id}`)
                }
              >
                <Undo2 className="h-4 w-4" />
                ثبت مرجوعی برای این خرید
              </Button>
            )}
          </StatusChangeCard>

          <DocumentPaymentsEditor
            draft={draft.payments}
            side={PURCHASE_PAYMENT_SIDE}
            totalAmount={purchase.totalAmount}
            payableAmount={purchase.payableAmount}
            dueDate={draft.dueDate}
            onDueDateChange={draft.setDueDate}
            canManage={allow("PurchasePayment")}
            refundOnly={isCancelled}
            notice={
              Number(purchase.payableAmount) < Number(purchase.totalAmount)
                ? "مبلغِ قابل پرداخت، سهمِ مقدارهای بسته‌شده با کسری را از جمع فاکتور کم کرده است."
                : undefined
            }
          />

          <InvoiceDocumentSection
            title="فاکتور خرید"
            invoiceNumber={purchase.invoiceNumber}
            attachments={draft.attachments}
            attachmentLabel="فاکتور دریافتی از تامین‌کننده"
          />
        </div>
      </div>

      <PendingChangesBar
        count={draft.count}
        isSaving={saver.isPending || draft.attachments.isUploading}
        onDiscard={draft.discard}
        onSave={() => (cancelStaged ? setConfirmCancel(true) : save())}
      />

      <CancelPurchaseDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        isPending={saver.isPending}
        onConfirm={save}
      />
    </div>
  );
}
