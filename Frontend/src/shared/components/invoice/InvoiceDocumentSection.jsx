import { useState } from "react";
import { Printer, Download, Upload, FileText, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";

/**
 * سند فاکتور یک سفارش — چاپ/دانلود یک نسخه‌ی خیلی ساده از فاکتور و
 * پیوست‌کردن فاکتور واقعی (مثلاً فاکتوری که تامین‌کننده داده).
 *
 * ساخت رسمیِ فاکتور بعداً روی بک‌اند انجام می‌شود؛ اینجا فقط همان
 * ضرورت‌های فرانت است: یک پیش‌نمایشِ قابل چاپ از روی داده‌ی فعلیِ فرم،
 * و یک فایل‌آپلودِ ساده. فایل فقط در حافظه‌ی همین صفحه نگه داشته
 * می‌شود — اتصال به سرور نیاز به یک اندپوینت آپلود دارد که هنوز وجود
 * ندارد.
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
}) {
  const [attachment, setAttachment] = useState(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    setAttachment({ file, url: URL.createObjectURL(file) });
  };

  const handleRemoveAttachment = () => {
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          سند فاکتور
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
            چاپ فاکتور
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            دانلود فاکتور
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

          {attachment ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-card-foreground hover:underline truncate"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{attachment.file.name}</span>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleRemoveAttachment}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground cursor-pointer hover:bg-muted/40">
              <Upload className="h-3.5 w-3.5" />
              انتخاب فایل فاکتور (تصویر یا PDF)
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
