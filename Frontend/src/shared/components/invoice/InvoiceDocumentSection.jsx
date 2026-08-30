import { Printer, Download, Info } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import ImageUploadList from "@/shared/components/files/ImageUploadList";
import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { useImageUploadList } from "@/shared/hooks/useImageUploadList";

/**
 * سند فاکتور یک سفارش — چاپ/دانلود یک نسخه‌ی ساده از فاکتور، و ضمیمه‌کردن
 * فاکتور واقعی (مثلاً برگه‌ای که تامین‌کننده داده).
 *
 * ساخت رسمیِ فاکتور روی بک‌اند انجام می‌شود؛ اینجا فقط پیش‌نمایشِ قابل
 * چاپ از روی داده‌ی فعلیِ فرم است.
 *
 * ضمیمه دیگر «فقط در حافظه‌ی همین صفحه» نیست: از همان مسیرِ مشترکِ
 * آپلود (`useImageUploadList` → `api/File/UploadImage`) رد می‌شود و
 * `objectKey` می‌گیرد.
 */

/**
 * ⚠️ **ضمیمه‌ی فاکتور هنوز سمت سرور جایی برای ذخیره‌شدن ندارد.**
 *
 * آپلود کار می‌کند (کلید گرفته می‌شود)، ولی `CreateSaleCommand`،
 * `CreatePurchaseCommand` و دو دستور مرجوعی هیچ فیلدی برای ضمیمه ندارند
 * و `System.Text.Json` فیلدِ ناشناس را بی‌صدا دور می‌ریزد — یعنی کاربر
 * «ضمیمه‌ی ذخیره‌شده»‌ای می‌بیند که وجود ندارد. تا آن روز این خاموش است.
 *
 * فهرست کارهای بک‌اند:
 * `Backend-Net/docs/invoice-attachment-requirements.fa.md`
 */
const INVOICE_ATTACHMENTS_ENABLED = false;

/**
 * پوشه‌ی باکت. `RECEIVING` استفاده می‌شود چون پوشه فقط یک پیشوندِ
 * مرتب‌سازی است و بک‌اند خودش هم نوشته که مرزِ امنیتی نیست — پس فاکتور
 * ارزشِ افزودنِ یک عضو تازه به enum را ندارد. اگر روزی پوشه‌ی مخصوص
 * ساخته شد، فقط همین یک خط عوض می‌شود.
 */
const INVOICE_ATTACHMENT_FOLDER = ImageFolderEnum.RECEIVING;

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
}) {
  // اگر صفحه‌ای خودش ضمیمه‌ها را نگه می‌دارد (برای گذاشتن در payload)،
  // همان را می‌دهد؛ وگرنه کامپوننت state خودش را می‌سازد.
  const ownList = useImageUploadList({
    folder: INVOICE_ATTACHMENT_FOLDER,
    maxCount: 5,
  });
  const list = attachments ?? ownList;

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

  const handleDownload = () => {
    const blob = new Blob([buildInvoiceHtml(invoiceProps)], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNumber || "invoice"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          سند {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            چاپ
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            دانلود
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-card-foreground text-sm font-medium">
              {attachmentLabel}
            </Label>
            {attachmentRequired && (
              <Badge variant="destructive" className="text-[10px]">
                ضروری
              </Badge>
            )}
          </div>

          {INVOICE_ATTACHMENTS_ENABLED ? (
            <ImageUploadList
              list={list}
              title="فایل‌ها"
              withNotes={false}
              emptyLabel="فایل فاکتور را اینجا اضافه کنید."
            />
          ) : (
            <p className="flex items-start gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground leading-relaxed">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ضمیمه‌کردن فاکتور تا آماده‌شدن سرویس آن روی سرور غیرفعال است.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
