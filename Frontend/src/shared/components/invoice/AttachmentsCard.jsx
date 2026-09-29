import { Card, CardContent } from "@/shared/components/ui/card";
import FileUploadList from "@/shared/components/files/FileUploadList";

/**
 * فقط ضمیمه‌ها — برای سندی که هنوز ذخیره نشده. چاپ و دانلودِ
 * `InvoiceDocumentSection` آنجا چیزی برای کار ندارند و فقط کارتِ بزرگِ
 * غیرفعالی به فرم اضافه می‌کردند.
 *
 * @param attachments خروجیِ `useInvoiceAttachments`
 */
export default function AttachmentsCard({ label, attachments }) {
  return (
    <Card>
      <CardContent>
        <FileUploadList
          list={attachments}
          title={label}
          withNotes={false}
          emptyLabel={`${label} را اینجا اضافه کنید (تصویر یا PDF).`}
        />
      </CardContent>
    </Card>
  );
}
