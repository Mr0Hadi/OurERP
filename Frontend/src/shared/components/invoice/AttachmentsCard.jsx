import { Paperclip } from "lucide-react";

import SectionCard from "@/shared/components/documents/SectionCard";
import FileUploadList from "@/shared/components/files/FileUploadList";

/**
 * پیوست‌های فاکتورِ صادرشده (تصویر/PDFِ برگه). تغییر تا «ثبت تغییرات»ِ صفحه
 * ذخیره نمی‌شود (`useIssuedDocumentDraft`).
 *
 * @param attachments خروجیِ `useInvoiceAttachments`
 */
export default function AttachmentsCard({ title = "پیوست‌ها", label, attachments, disabled }) {
  return (
    <SectionCard icon={Paperclip} title={title}>
      <FileUploadList
        list={attachments}
        title={label}
        withNotes={false}
        disabled={disabled}
        emptyLabel="تصویر یا PDFِ برگه را اینجا اضافه کنید."
      />
    </SectionCard>
  );
}
