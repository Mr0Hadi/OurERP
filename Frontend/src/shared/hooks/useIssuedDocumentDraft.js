import { useEffect, useState } from "react";

import { usePaymentDraft } from "@/shared/components/payments/usePaymentDraft";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";

const keysOf = (list = []) =>
  list
    .map((item) => item?.objectKey)
    .filter(Boolean)
    .join("|");
const notesOf = (list = []) => list.map((item) => item?.note || "").join("|");

/**
 * همه‌ی تغییرهای در انتظارِ یک سندِ صادرشده (خرید یا فروش): پرداخت‌ها،
 * سررسید، وضعیت و پیوست‌ها. هیچ‌کدام تا «ثبت تغییرات» ذخیره نمی‌شود؛
 * `changes()` همان ورودیِ `runDocumentChanges` است.
 *
 * با رسیدنِ نسخه‌ی تازه‌ی سند از سرور (`updatedAt`)، سررسید و وضعیت و پیوست‌ها
 * به مقدارِ سرور برمی‌گردند؛ پیش‌نویسِ پرداخت هر عملیاتِ ثبت‌شده را خودش
 * برمی‌دارد.
 *
 * @param doc       سندِ خرید/فروش (`paymentDetails`، `paymentDate`، `status`، `attachments`)
 * @param direction جهتِ عادیِ پرداخت روی این سند
 */
export function useIssuedDocumentDraft(doc, direction) {
  const payments = usePaymentDraft(doc.paymentDetails, direction);
  const [dueDate, setDueDate] = useState(doc.paymentDate || null);
  const [status, setStatus] = useState(doc.status);
  const attachments = useInvoiceAttachments(doc.attachments || []);

  // ریست در همان رندر — الگوی «ریستِ state با تغییرِ prop».
  const [version, setVersion] = useState(doc.updatedAt);
  if (version !== doc.updatedAt) {
    setVersion(doc.updatedAt);
    setDueDate(doc.paymentDate || null);
    setStatus(doc.status);
  }
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(doc.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, doc.updatedAt, attachmentsReset]);

  const dueDirty = (dueDate || null) !== (doc.paymentDate || null);
  const statusDirty = Number(status) !== Number(doc.status);
  const current = attachments.filesPayload;
  const saved = doc.attachments || [];
  const attachmentsDirty =
    keysOf(current) !== keysOf(saved) || notesOf(current) !== notesOf(saved);

  const count =
    payments.count + Number(dueDirty) + Number(statusDirty) + Number(attachmentsDirty);

  const changes = () => ({
    paymentDraft: payments,
    paymentDate: dueDirty ? dueDate : undefined,
    attachments: attachmentsDirty ? current : undefined,
    status: statusDirty ? Number(status) : null,
  });

  const discard = () => {
    payments.reset();
    setDueDate(doc.paymentDate || null);
    setStatus(doc.status);
    attachments.discard();
    attachments.reset(doc.attachments || []);
  };

  return {
    payments,
    dueDate,
    setDueDate,
    status,
    setStatus,
    statusDirty,
    attachments,
    count,
    changes,
    discard,
  };
}
