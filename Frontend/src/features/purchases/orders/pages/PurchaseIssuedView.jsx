import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { usePurchaseChangesSaver } from "@/features/purchases/orders/services/mutations";
import PurchaseItemsCard from "../components/forms/PurchaseItemsCard";
import CancelPurchaseDialog from "../components/forms/CancelPurchaseDialog";
import DocumentFormLayout from "@/shared/components/forms/DocumentFormLayout";
import DocumentHero from "@/shared/components/documents/DocumentHero";
import IssuedStatusMenu from "@/shared/components/documents/IssuedStatusMenu";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import PendingChangesBar from "@/shared/components/forms/PendingChangesBar";
import PaymentsLedgerCard from "@/shared/components/payments/PaymentsLedgerCard";
import AttachmentsCard from "@/shared/components/invoice/AttachmentsCard";
import DocumentOutputMenu from "@/shared/components/invoice/DocumentOutputMenu";
import IssuedInvoiceNotice from "@/shared/components/invoice/IssuedInvoiceNotice";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import PurchaseStatusBadge from "@/shared/components/status/PurchaseStatusBadge";
import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import { useIssuedDocumentDraft } from "@/shared/hooks/useIssuedDocumentDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useRelatedPurchaseReturnsQuery } from "@/features/purchases/returns/services/queries";
import { hasAnythingArrived } from "@/features/purchases/returns/domain/purchaseReturnVocabulary";
import {
  PURCHASE_SHIPPING_CHOICES,
  canCancelPurchase,
  purchaseStatusTargets,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_PAYMENT_SIDE } from "@/features/purchases/orders/domain/purchasePayments";
import {
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "@/features/purchases/orders/services/constants";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { ROUTES, routeWithId } from "@/shared/constants/routes";

/**
 * خریدِ **صادرشده** (فاکتورِ تامین‌کننده ثبت شده). فاکتور دیگر ویرایش
 * نمی‌شود؛ پرداخت‌ها، سررسید، پیوست‌ها و وضعیت عوض می‌شوند — همه با یک
 * «ثبت تغییرات» (`useIssuedDocumentDraft`)، به‌جز لغو که تأیید می‌خواهد و
 * همان لحظه ذخیره می‌شود.
 *
 * بالا: سرِ فاکتور (شماره، تامین‌کننده، وضعیت، وضعیتِ پول، کارها). ستونِ اصلی:
 * اقلام و دریافتِ انبار ← مرجوعی‌ها ← حمل. ستونِ کناری: پرداخت‌ها ← پیوست‌ها.
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
  const payable = purchase.payableAmount ?? purchase.totalAmount;

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

  const transitions = canUpdate
    ? purchaseStatusTargets(purchase)
        .filter((target) => target !== purchase.status && target !== Number(draft.status))
        .map((target) => ({
          value: target,
          label: PURCHASE_STATUS_LABELS[target],
          hint: PURCHASE_SHIPPING_CHOICES.find((choice) => choice.value === target)?.hint,
        }))
    : [];

  return (
    <>
      <DocumentFormLayout
        top={
          <DocumentHero
            kindLabel="فاکتور خرید"
            number={purchase.invoiceNumber}
            statusBadge={<PurchaseStatusBadge status={purchase.status} withIcon />}
            nextStatusBadge={draft.statusDirty && <PurchaseStatusBadge status={Number(draft.status)} />}
            onUndoStatus={() => draft.setStatus(purchase.status)}
            help={!isCancelled && <IssuedInvoiceNotice movedLabel="دریافت" />}
            party={{
              label: "تامین‌کننده",
              name: purchase.supplierName,
              href: purchase.supplierId ? routeWithId(ROUTES.SUPPLIERS_DETAIL, purchase.supplierId) : null,
            }}
            date={purchase.invoiceDate}
            paymentTypeBadge={<PaymentTypeBadge type={purchase.paymentType} />}
            money={{
              total: purchase.totalAmount,
              payable,
              paid: draft.payments.netPaid,
              dueDate: draft.dueDate,
            }}
            description={purchase.description}
            actions={
              <>
                {hasAnythingArrived(purchase) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => navigate(`${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${purchase.id}`)}
                  >
                    <Undo2 className="size-4" />
                    ثبت مرجوعی
                  </Button>
                )}
                <DocumentOutputMenu attachments={draft.attachments} />
                <IssuedStatusMenu
                  transitions={transitions}
                  onTransition={draft.setStatus}
                  onCancel={canUpdate && canCancelPurchase(purchase) ? () => setConfirmCancel(true) : undefined}
                  cancelLabel="لغو خرید"
                />
              </>
            }
          />
        }
        main={
          <>
            <PurchaseItemsCard purchase={purchase} />
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
            <PaymentsLedgerCard
              draft={draft.payments}
              side={PURCHASE_PAYMENT_SIDE}
              payable={payable}
              dueDate={draft.dueDate}
              onDueDateChange={draft.setDueDate}
              canManage={allows("PurchasePayment")}
              refundOnly={isCancelled}
              notice={
                Number(purchase.payableAmount) < Number(purchase.totalAmount)
                  ? "«قابل پرداخت» سهمِ مقدارهای بسته‌شده با کسری را از جمع فاکتور کم کرده است."
                  : undefined
              }
            />
            <AttachmentsCard label="فاکتورِ تامین‌کننده" attachments={draft.attachments} />
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

      <CancelPurchaseDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        isPending={saver.isPending}
        onConfirm={() => save({ status: PURCHASE_STATUSES.CANCELLED })}
      />
    </>
  );
}
