import { useMemo, useState } from "react";
import { Printer, Download, FileText, Info } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Spinner } from "@/shared/components/ui/spinner";
import FileUploadList from "@/shared/components/files/FileUploadList";
import {
  getSaleInvoicePdf,
  getSaleReturnCreditNotePdf,
} from "@/shared/services/invoice/api-v1";
import {
  attachmentDocuments,
  downloadDocuments,
  printDocuments,
  serverDocument,
} from "@/shared/services/invoice/documentOutput";

/**
 * سند فاکتور/پیش‌فاکتورِ یک سفارش: چاپ و دانلود، و ضمیمه‌کردنِ برگه‌ی
 * واقعی.
 *
 * چاپ و دانلود روی سندهای *واقعی* کار می‌کنند، نه روی یک بازسازیِ محلی:
 *
 * - **خرید:** پیش‌فاکتور و فاکتور را تامین‌کننده می‌فرستد و کاربر دستی
 *   ضمیمه می‌کند؛ پس همان ضمیمه‌ها چاپ و دانلود می‌شوند. بکند
 *   `GetPurchaseInvoicePdf` دارد، ولی آن سندی است که *خودمان* از روی
 *   داده‌ی خودمان می‌سازیم — نه برگه‌ای که تامین‌کننده داده — پس اینجا
 *   استفاده نمی‌شود.
 * - **فروش:** فاکتور را بکند می‌سازد (`GetSaleInvoicePdf`) و کاربر هم
 *   می‌تواند نسخه‌ی دستی ضمیمه کند؛ هر دو چاپ و دانلود می‌شوند.
 * - **مرجوعی فروش:** «برگه‌ی طلبکاری» را بکند می‌سازد.
 *
 * وقتی هیچ سندی وجود ندارد، دکمه‌ها غیرفعال‌اند. قبلاً در آن حالت یک
 * جدولِ HTML از روی داده‌ی فرم ساخته می‌شد؛ آن برگه فاکتور نبود و
 * فرستادنش برای طرفِ مقابل فقط سوءتفاهم می‌ساخت.
 *
 * ضمیمه را *صفحه* نگه می‌دارد نه این کامپوننت، چون فقط صفحه‌ای که دستور
 * را می‌فرستد می‌تواند آن را در بدنه بگذارد و بعد از ذخیره‌ی موفق
 * `commit()` بزند. پس صفحه‌ای که `attachments` بدهد آپلودر می‌بیند و
 * صفحه‌ای که ندهد توضیح — امروز یعنی دو صفحه‌ی مرجوعی، چون
 * `CreatePurchaseReturnCommand`/`CreateSaleReturnCommand` هنوز فیلدِ
 * ضمیمه ندارند. آپلودرِ بی‌مقصد بدترین حالت است: کاربر پیام موفقیت
 * می‌گیرد و هیچ ضمیمه‌ای ذخیره نشده.
 */

/**
 * @param attachments  خروجی `useInvoiceAttachments` از سمتِ صفحه — نبودنش
 *   یعنی این نوع سند هنوز روی سرور جای ضمیمه ندارد.
 * @param documentKind `"sale"` / `"saleReturn"` — سندی که *سرور*
 *   می‌سازد و کنارِ ضمیمه‌ها چاپ/دانلود می‌شود (برای مرجوعی فروش،
 *   «برگه‌ی طلبکاری»). خرید و مرجوعی خرید آن را ندارند: سندشان فقط
 *   همان چیزی است که کاربر ضمیمه کرده.
 * @param documentId   شناسه‌ی همان سندِ ذخیره‌شده.
 */
export default function InvoiceDocumentSection({
  title,
  invoiceNumber,
  attachmentRequired = false,
  attachmentLabel = "فایل فاکتور",
  attachments,
  documentKind,
  documentId,
}) {
  const [isBusy, setIsBusy] = useState(false);

  /**
   * سندی که سرور می‌سازد — فقط برای فروش و مرجوعی فروش، و فقط وقتی
   * سفارش ذخیره شده باشد. خرید عمداً اینجا نیست (بالا توضیح داده شد).
   */
  const serverPdfFetcher = documentId
    ? { sale: getSaleInvoicePdf, saleReturn: getSaleReturnCreditNotePdf }[documentKind]
    : null;

  const documents = useMemo(() => {
    const list = [];

    if (serverPdfFetcher) {
      list.push(
        serverDocument({
          name: invoiceNumber || title || "invoice",
          fetchPdf: () => serverPdfFetcher(documentId),
        })
      );
    }

    list.push(...attachmentDocuments(attachments));
    return list;
  }, [attachments, documentId, invoiceNumber, serverPdfFetcher, title]);

  /** پیامِ یکسان برای هر دو دکمه وقتی بعضی سندها نیامدند. */
  const reportFailures = (failures) => {
    if (!failures.length) return;
    toast.error(`دریافت این فایل‌ها ممکن نشد: ${failures.join("، ")}`);
  };

  const run = async (action) => {
    setIsBusy(true);
    try {
      reportFailures(await action(documents));
    } catch (error) {
      // مثلاً وقتی مرورگر پنجره‌ی چاپ را بلوکه می‌کند — بدون این، خطا
      // بی‌صدا رد می‌شد و دکمه انگار هیچ کاری نمی‌کرد.
      toast.error(error?.message || "انجام این عملیات ممکن نشد.");
    } finally {
      setIsBusy(false);
    }
  };

  // بدون سند، دکمه‌ها کاری ندارند که انجام دهند.
  const hasDocuments = documents.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          سند {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-w-24 flex-1 gap-2"
            onClick={() => run(printDocuments)}
            disabled={isBusy || !hasDocuments}
          >
            {isBusy ? <Spinner /> : <Printer className="h-4 w-4" />}
            چاپ سند
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-w-24 flex-1 gap-2"
            onClick={() => run(downloadDocuments)}
            disabled={isBusy || !hasDocuments}
          >
            {isBusy ? <Spinner /> : <Download className="h-4 w-4" />}
            دانلود سند
          </Button>
        </div>

        {/* بدون این خط، کاربر نمی‌داند دکمه دقیقاً چه چیزی را چاپ
            می‌کند — مخصوصاً در فروش که سندِ ساختِ سرور و ضمیمه‌ی دستی
            هر دو ممکن است باشند. */}
        <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
          <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {hasDocuments ? (
            <span>
              {`چاپ و دانلود روی ${documents.length} سند انجام می‌شود: `}
              {documents.map((document_) => document_.name).join("، ")}
            </span>
          ) : (
            <span>
              هنوز سندی برای این سفارش وجود ندارد؛ تا وقتی فایلی اضافه
              نشود، چاپ و دانلود غیرفعال است.
            </span>
          )}
        </p>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Label className="text-card-foreground text-sm font-medium leading-relaxed">
              {attachmentLabel}
            </Label>
            {attachmentRequired && (
              <Badge variant="destructive" className="text-[10px]">
                ضروری
              </Badge>
            )}
          </div>

          {attachments ? (
            <FileUploadList
              list={attachments}
              withNotes={false}
              emptyLabel="فایل فاکتور را اینجا اضافه کنید (تصویر یا PDF)."
            />
          ) : (
            <p className="flex items-start gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground leading-relaxed">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ضمیمه‌کردن فاکتور برای این سند هنوز روی سرور پشتیبانی نمی‌شود.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
