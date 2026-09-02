// src/shared/components/invoice/useInvoiceAttachments.js

import { useFileUploadList } from "@/shared/hooks/useFileUploadList";
import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";

/**
 * ضمیمه‌های یک سندِ فاکتور/پیش‌فاکتور — یک هوک برای هر چهار صفحه‌ی
 * خرید و فروش (ثبت و ویرایش)، تا سیاستِ ضمیمه (پوشه، سقف تعداد،
 * مجازبودنِ PDF) یک‌جا تعریف شود نه در هر صفحه.
 *
 * خروجی همان خروجی `useFileUploadList` است؛ صفحه سه کار با آن دارد:
 *  1. `attachments={list}` به `InvoiceDocumentSection`،
 *  2. `attachments: list.filesPayload` در بدنه‌ی Create/Update،
 *  3. `list.commit()` بعد از ذخیره‌ی موفق (و `list.discard()` در انصراف).
 *
 * ⚠️ `UpdatePurchase`/`UpdateSale` آرایه را **جایگزین** می‌کنند نه اضافه
 * (بند ۲.۲ سندِ `invoice-attachment-requirements.fa.md`) — پس همیشه
 * فهرستِ نهایی فرستاده می‌شود.
 *
 * پوشه‌ی باکت `RECEIVING` است چون پوشه فقط یک پیشوندِ مرتب‌سازی است و
 * خودِ بکند هم نوشته که مرزِ امنیتی نیست؛ فاکتور ارزشِ افزودنِ یک عضو
 * تازه به enum را ندارد. اگر روزی پوشه‌ی مخصوص ساخته شد، همین یک خط
 * عوض می‌شود.
 */
export const INVOICE_ATTACHMENT_FOLDER = ImageFolderEnum.RECEIVING;
export const INVOICE_ATTACHMENT_MAX_COUNT = 5;

export function useInvoiceAttachments(initialItems = []) {
  return useFileUploadList({
    folder: INVOICE_ATTACHMENT_FOLDER,
    maxCount: INVOICE_ATTACHMENT_MAX_COUNT,
    // فاکتورِ اسکن‌شده اغلب PDF است؛ بکند از ۲۰۲۶-۰۹-۰۱ آن را می‌پذیرد.
    allowDocuments: true,
    initialItems,
  });
}

export default useInvoiceAttachments;
