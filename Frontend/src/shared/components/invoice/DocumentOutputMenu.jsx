import { useState } from "react";
import { ChevronDown, Download, FileText, Printer } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  attachmentDocuments,
  downloadDocuments,
  printDocuments,
  serverDocument,
} from "@/shared/services/invoice/documentOutput";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * «چاپ / دانلود»ِ سندهای *واقعیِ* یک فاکتور در یک منو: PDFی که سرور می‌سازد
 * (فاکتورِ فروش) و پیوست‌ها (فاکتورِ تامین‌کننده). قبلاً یک کارتِ جدا با
 * چک‌باکس برای هر سند بود؛ حالا هر سند یک گزینه است.
 *
 * بی هیچ سندی دکمه غیرفعال است — جدولی که فرانت از داده‌ی فرم بسازد فاکتور
 * نیست (`documentOutput.js`).
 *
 * @param serverPdf   `{ name, fetchPdf }` یا `null`
 * @param attachments خروجیِ `useInvoiceAttachments`
 */
export default function DocumentOutputMenu({ serverPdf, attachments }) {
  const [busy, setBusy] = useState(false);

  const documents = [
    ...(serverPdf ? [serverDocument(serverPdf)] : []),
    ...attachmentDocuments(attachments),
  ];
  const labelOf = (document_) => (document_.id === "server-pdf" ? "فاکتورِ سیستم (PDF)" : document_.name);

  const run = async (action, selected) => {
    setBusy(true);
    try {
      const failures = await action(selected);
      if (failures.length) toast.error(`دریافت این فایل‌ها ممکن نشد: ${failures.join("، ")}`);
    } catch (error) {
      // مثلاً وقتی مرورگر پنجره‌ی چاپ را می‌بندد.
      toast.error(getErrorMessage(error, "انجام این عملیات ممکن نشد."));
    } finally {
      setBusy(false);
    }
  };

  if (documents.length === 0) {
    return (
      <Button type="button" variant="outline" disabled title="هنوز سندی نیست؛ تصویرِ فاکتور را پیوست کنید." className="gap-1.5">
        <Printer className="size-4" />
        چاپ
      </Button>
    );
  }

  const section = (title, Icon, action) => (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">{title}</DropdownMenuLabel>
      {documents.map((document_) => (
        <DropdownMenuItem key={document_.id} onSelect={() => run(action, [document_])}>
          <Icon className="size-4" />
          <span className="truncate" dir="auto">
            {labelOf(document_)}
          </span>
        </DropdownMenuItem>
      ))}
      {documents.length > 1 && (
        <DropdownMenuItem onSelect={() => run(action, documents)}>
          <FileText className="size-4" />
          همه ({documents.length.toLocaleString("fa-IR")})
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="gap-1.5" disabled={busy}>
          {busy ? <Spinner /> : <Printer className="size-4" />}
          چاپ و دانلود
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={12} className="w-60">
        {section("چاپ", Printer, printDocuments)}
        <DropdownMenuSeparator />
        {section("دانلود", Download, downloadDocuments)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
