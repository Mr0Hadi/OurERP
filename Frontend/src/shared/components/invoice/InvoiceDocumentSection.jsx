import { useState } from "react";
import { Printer, Download, Info } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Spinner } from "@/shared/components/ui/spinner";
import FileUploadList from "@/shared/components/files/FileUploadList";
import {
  SERVER_INVOICE_PDF_ENABLED,
  getPurchaseInvoicePdf,
  getSaleInvoicePdf,
  getSaleReturnCreditNotePdf,
  saveBlobAs,
} from "@/shared/services/invoice/api-v1";

/**
 * سند فاکتور/پیش‌فاکتورِ یک سفارش: چاپ و دانلود، و ضمیمه‌کردنِ برگه‌ی
 * واقعی (مثلاً فاکتوری که تامین‌کننده داده).
 *
 * - **چاپ** همیشه یک پیش‌نمایشِ HTML از روی داده‌ی *همین فرم* است، تا
 *   قبل از ذخیره هم کار کند.
 * - **دانلود** اگر سند روی سرور باشد (`documentKind` + `documentId`)
 *   فاکتورِ رسمیِ PDF را از `api/Invoice` می‌گیرد (بخش ۱۳ سند)، وگرنه
 *   همان پیش‌نمایشِ HTML را ذخیره می‌کند.
 * - **ضمیمه** از مسیرِ مشترکِ آپلود (`useInvoiceAttachments` →
 *   `api/File/UploadImage`) رد می‌شود و `objectKey` می‌گیرد؛ همان کلید
 *   بعداً در `attachments`ِ دستور Create/Update می‌نشیند.
 *
 * ضمیمه را *صفحه* نگه می‌دارد نه این کامپوننت، چون فقط صفحه‌ای که دستور
 * را می‌فرستد می‌تواند آن را در بدنه بگذارد و بعد از ذخیره‌ی موفق
 * `commit()` بزند. پس صفحه‌ای که `attachments` بدهد آپلودر می‌بیند و
 * صفحه‌ای که ندهد توضیح — امروز یعنی دو صفحه‌ی مرجوعی، چون
 * `CreatePurchaseReturnCommand`/`CreateSaleReturnCommand` هنوز فیلدِ
 * ضمیمه ندارند. آپلودرِ بی‌مقصد بدترین حالت است: کاربر پیام موفقیت
 * می‌گیرد و هیچ ضمیمه‌ای ذخیره نشده.
 */

function buildInvoiceHtml({
  title,
  invoiceNumber,
  invoiceDate,
  partyLabel,
  partyName,
  items,
  totalAmount,
}) {
  const rows = (items || [])
    .map((item) => {
      const lineTotal =
        (item.qty || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100);
      return `<tr>
        <td>${item.productName || ""}</td>
        <td>${(item.qty || 0).toLocaleString("fa-IR")} ${item.unit || ""}</td>
        <td>${(item.unitPrice || 0).toLocaleString("fa-IR")}</td>
        <td>${(item.discount || 0).toLocaleString("fa-IR")}%</td>
        <td>${lineTotal.toLocaleString("fa-IR")}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { margin-bottom: 16px; color: #444; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; font-size: 13px; }
  th { background: #f3f3f3; }
  .total { margin-top: 12px; font-weight: bold; text-align: left; font-size: 14px; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    شماره فاکتور: ${invoiceNumber || "—"} | تاریخ: ${invoiceDate || "—"} | ${partyLabel}: ${partyName || "—"}
  </div>
  <table>
    <thead>
      <tr><th>کالا</th><th>تعداد</th><th>قیمت واحد (ریال)</th><th>تخفیف</th><th>جمع (ریال)</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">جمع کل: ${(totalAmount || 0).toLocaleString("fa-IR")} ریال</div>
</body>
</html>`;
}

/**
 * @param attachments  خروجی `useInvoiceAttachments` از سمتِ صفحه — نبودنش
 *   یعنی این نوع سند هنوز روی سرور جای ضمیمه ندارد.
 * @param documentKind `"purchase"` / `"sale"` / `"saleReturn"` — برای
 *   دانلودِ سندِ رسمیِ PDF از `api/Invoice` (برای مرجوعی فروش، «برگه‌ی
 *   طلبکاری»). نبودنش یعنی فقط پیش‌نمایشِ HTML. مرجوعی خرید سندِ
 *   رسمیِ PDF ندارد.
 * @param documentId   شناسه‌ی همان سندِ ذخیره‌شده.
 */
export default function InvoiceDocumentSection({
  title,
  invoiceNumber,
  invoiceDate,
  partyLabel,
  partyName,
  items,
  totalAmount,
  attachmentRequired = false,
  attachmentLabel = "فایل فاکتور",
  attachments,
  documentKind,
  documentId,
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * فاکتورِ رسمی را سرور می‌سازد (بخش ۱۳ سند). تا وقتی فیچرهای
   * خرید/فروش روی داده‌ی mock اند، شناسه‌ها شناسه‌ی سرور نیستند و این
   * مسیر خاموش می‌ماند — دکمه همان پیش‌نمایشِ HTML را می‌دهد.
   */
  const serverPdf =
    SERVER_INVOICE_PDF_ENABLED && documentId
      ? {
          purchase: getPurchaseInvoicePdf,
          sale: getSaleInvoicePdf,
          saleReturn: getSaleReturnCreditNotePdf,
        }[documentKind]
      : null;

  const invoiceProps = {
    title,
    invoiceNumber,
    invoiceDate,
    partyLabel,
    partyName,
    items,
    totalAmount,
  };

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=800,height=1000");
    if (!win) return;
    win.document.write(buildInvoiceHtml(invoiceProps));
    win.document.close();
    win.focus();
    win.print();
  };

  const downloadHtmlPreview = () => {
    saveBlobAs(
      new Blob([buildInvoiceHtml(invoiceProps)], { type: "text/html;charset=utf-8" }),
      `${invoiceNumber || "invoice"}.html`,
    );
  };

  const handleDownload = async () => {
    if (!serverPdf) {
      downloadHtmlPreview();
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await serverPdf(documentId);
      saveBlobAs(blob, `${invoiceNumber || title || "invoice"}.pdf`);
    } catch (error) {
      // پیامِ فارسیِ سرور از بلاب بیرون کشیده شده (`api-v1`) — ولی اگر
      // سند اصلاً روی سرور نباشد، پیش‌نمایشِ محلی بهتر از هیچ است.
      toast.error(error?.message || "دریافت فاکتور از سرور ممکن نشد.");
      downloadHtmlPreview();
    } finally {
      setIsDownloading(false);
    }
  };

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
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            چاپ
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-w-24 flex-1 gap-2"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? <Spinner /> : <Download className="h-4 w-4" />}
            {serverPdf ? "دانلود PDF" : "دانلود"}
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
