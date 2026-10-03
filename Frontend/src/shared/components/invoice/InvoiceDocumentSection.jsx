import { useMemo, useState } from "react";
import { Printer, Download, FileText, Info } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Spinner } from "@/shared/components/ui/spinner";
import FileUploadList from "@/shared/components/files/FileUploadList";
import {
  getPurchaseReturnPdf,
  getSaleInvoicePdf,
  getSaleReturnCreditNotePdf,
} from "@/shared/services/invoice/api-v1";
import {
  attachmentDocuments,
  downloadDocuments,
  printDocuments,
  serverDocument,
} from "@/shared/services/invoice/documentOutput";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * سند فاکتور/پیش‌فاکتورِ یک سفارش: چاپ و دانلود، و ضمیمه‌کردنِ برگه‌ی
 * واقعی.
 *
 * چاپ و دانلود روی سندهای *واقعی* کار می‌کنند، نه روی یک بازسازیِ محلی:
 *
 * - **خرید:** پیش‌فاکتور و فاکتور را تامین‌کننده می‌فرستد و کاربر دستی
 *   ضمیمه می‌کند؛ پس همان ضمیمه‌ها چاپ و دانلود می‌شوند (بکند PDFِ خرید
 *   ندارد).
 * - **فروش:** فاکتور را بکند می‌سازد (`GetSaleInvoicePdf`) و کاربر هم
 *   می‌تواند نسخه‌ی دستی ضمیمه کند؛ هر دو چاپ و دانلود می‌شوند.
 * - **مرجوعی فروش:** «برگه‌ی طلبکاری» را بکند می‌سازد.
 * - **مرجوعی خرید:** «برگه‌ی مرجوعی به تامین‌کننده» را بکند می‌سازد.
 *
 * کاربر انتخاب می‌کند کدام سندها چاپ/دانلود شوند؛ سندِ تازه پیش‌فرض
 * انتخاب‌شده است (فقط کنارگذاشته‌ها نگه داشته می‌شوند).
 *
 * وقتی هیچ سندی وجود ندارد دکمه‌ها غیرفعال‌اند — و نباید به‌جایش یک
 * جدولِ HTML از روی داده‌ی فرم ساخته شود: آن برگه فاکتور نیست و
 * فرستادنش برای طرفِ مقابل فقط سوءتفاهم می‌سازد.
 *
 * ضمیمه را *صفحه* نگه می‌دارد نه این کامپوننت، چون فقط صفحه‌ای که دستور
 * را می‌فرستد می‌تواند آن را در بدنه بگذارد و بعد از ذخیره‌ی موفق
 * `commit()` بزند. پس صفحه‌ای که `attachments` بدهد آپلودر می‌بیند و
 * صفحه‌ای که ندهد توضیح. آپلودرِ بی‌مقصد بدترین حالت است: کاربر پیام
 * موفقیت می‌گیرد و هیچ ضمیمه‌ای ذخیره نشده.
 */

/**
 * @param attachments  خروجی `useInvoiceAttachments` از سمتِ صفحه — نبودنش
 *   یعنی این نوع سند هنوز روی سرور جای ضمیمه ندارد.
 * @param documentKind `"sale"` / `"saleReturn"` / `"purchaseReturn"` — سندی
 *   که *سرور* می‌سازد و کنارِ ضمیمه‌ها چاپ/دانلود می‌شود. خرید آن را
 *   ندارد: سندش فقط همان چیزی است که کاربر ضمیمه کرده.
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
  // متنِ «هنوز سندی نیست» وقتی دلیلش چیزی جز «فایلی اضافه نشده» است.
  emptyHint,
  // نامِ فایلِ سندی که سرور می‌سازد؛ پیش‌فرض شماره‌ی سند.
  serverDocumentName,
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [excluded, setExcluded] = useState(() => new Set());

  /** سندی که سرور می‌سازد — فقط وقتی سند ذخیره شده باشد. */
  const serverPdfFetcher = documentId
    ? {
        sale: getSaleInvoicePdf,
        saleReturn: getSaleReturnCreditNotePdf,
        purchaseReturn: getPurchaseReturnPdf,
      }[documentKind]
    : null;

  const documents = useMemo(() => {
    const list = [];

    if (serverPdfFetcher) {
      list.push(
        serverDocument({
          name: serverDocumentName || invoiceNumber || title || "invoice",
          fetchPdf: () => serverPdfFetcher(documentId),
        })
      );
    }

    list.push(...attachmentDocuments(attachments));
    return list;
  }, [attachments, documentId, invoiceNumber, serverDocumentName, serverPdfFetcher, title]);

  /** پیامِ یکسان برای هر دو دکمه وقتی بعضی سندها نیامدند. */
  const reportFailures = (failures) => {
    if (!failures.length) return;
    toast.error(`دریافت این فایل‌ها ممکن نشد: ${failures.join("، ")}`);
  };

  const run = async (action) => {
    setIsBusy(true);
    try {
      reportFailures(await action(selected));
    } catch (error) {
      // مثلاً وقتی مرورگر پنجره‌ی چاپ را بلوکه می‌کند — بدون این، خطا
      // بی‌صدا رد می‌شد و دکمه انگار هیچ کاری نمی‌کرد.
      toast.error(getErrorMessage(error, "انجام این عملیات ممکن نشد."));
    } finally {
      setIsBusy(false);
    }
  };

  const selected = documents.filter((document_) => !excluded.has(document_.id));
  const hasDocuments = documents.length > 0;
  // بدون سندِ انتخاب‌شده، دکمه‌ها کاری ندارند که انجام دهند.
  const canRun = !isBusy && selected.length > 0;

  const toggle = (id, include) =>
    setExcluded((previous) => {
      const next = new Set(previous);
      if (include) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          سند {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* کاربر باید بداند و انتخاب کند دقیقاً چه چیزی چاپ می‌شود —
            مخصوصاً در فروش که سندِ ساختِ سرور و ضمیمه‌ی دستی هر دو هستند. */}
        {hasDocuments ? (
          <fieldset className="space-y-1">
            <legend className="mb-1 text-xs text-muted-foreground">
              سندهای چاپ و دانلود:
            </legend>
            {documents.map((document_) => (
              <label
                key={document_.id}
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/5"
              >
                <Checkbox
                  checked={!excluded.has(document_.id)}
                  onCheckedChange={(checked) => toggle(document_.id, checked === true)}
                />
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate" dir="auto" title={document_.name}>
                  {document_.name}
                </span>
                {document_.id === "server-pdf" && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    ساختِ سیستم
                  </Badge>
                )}
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {emptyHint ??
                "هنوز سندی برای این سفارش وجود ندارد؛ تا وقتی فایلی اضافه نشود، چاپ و دانلود غیرفعال است."}
            </span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-w-24 flex-1 gap-2"
            onClick={() => run(printDocuments)}
            disabled={!canRun}
          >
            {isBusy ? <Spinner /> : <Printer className="h-4 w-4" />}
            چاپ{selected.length > 1 && ` (${selected.length.toLocaleString("fa-IR")})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-w-24 flex-1 gap-2"
            onClick={() => run(downloadDocuments)}
            disabled={!canRun}
          >
            {isBusy ? <Spinner /> : <Download className="h-4 w-4" />}
            دانلود{selected.length > 1 && ` (${selected.length.toLocaleString("fa-IR")})`}
          </Button>
        </div>

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
              emptyLabel={`${attachmentLabel} را اینجا اضافه کنید (تصویر یا PDF).`}
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
