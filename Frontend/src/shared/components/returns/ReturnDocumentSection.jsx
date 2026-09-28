import { useEffect } from "react";

import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import InvoiceAttachmentsSaveButton from "@/shared/components/invoice/InvoiceAttachmentsSaveButton";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";

const attachmentsKeyOf = (list = []) => list.map((item) => item.id ?? item.objectKey).join("|");

/**
 * سندِ چاپیِ یک مرجوعی و پیوست‌هایش (رسیدِ امضاشده، عکسِ کالا) — مشترک بین
 * مرجوعیِ خرید و فروش. پیوست‌ها جدا از بقیه‌ی سند با
 * `Update{Purchase,Sale}ReturnAttachments` ذخیره می‌شوند، در هر وضعیتی:
 * رسیدِ امضاشده معمولاً بعد از رفتنِ کالا می‌رسد.
 *
 * @param mutation  خروجیِ `useUpdate…ReturnAttachmentsMutation`.
 * @param canEdit   دسترسیِ ثبتِ همان نوع مرجوعی؛ بدون آن پیوست‌ها فقط دیده می‌شوند.
 * بقیه‌ی props مستقیم به `InvoiceDocumentSection` می‌رود.
 */
export default function ReturnDocumentSection({ returnDoc, mutation, canEdit, ...documentProps }) {
  const saved = returnDoc.attachments || [];
  const attachments = useInvoiceAttachments(saved);
  const attachmentsReset = attachments.reset;
  const savedKey = attachmentsKeyOf(saved);

  // پاسخِ هر نوشتنِ مرجوعی سندِ کامل است؛ وقتی پیوست‌های سرور عوض شد
  // (ذخیره از همین‌جا یا جای دیگر) فهرستِ محلی از نو پر می‌شود.
  useEffect(() => {
    attachmentsReset(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnDoc.id, savedKey, attachmentsReset]);

  return (
    <div className="space-y-2">
      <InvoiceDocumentSection
        {...documentProps}
        invoiceNumber={returnDoc.returnNumber}
        attachments={attachments}
      />
      {canEdit && (
        <InvoiceAttachmentsSaveButton
          attachments={attachments}
          saved={saved}
          isPending={mutation.isPending}
          onSave={(list) => mutation.mutate(list, { onSuccess: () => attachments.commit() })}
        />
      )}
    </div>
  );
}
