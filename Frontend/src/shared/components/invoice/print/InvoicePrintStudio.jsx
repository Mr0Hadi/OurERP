import { useState } from "react";
import { AlertCircle, Download, Printer, RefreshCw } from "lucide-react";

import FlowSheet from "@/shared/components/print/FlowSheet";
import { flowPageCount, flowPrintOptions, pageGeometryOf } from "@/shared/components/print/paper";
import PrintStudio from "@/shared/components/print/studio/PrintStudio";
import { usePrint } from "@/shared/components/print/usePrint";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toPersianDigits } from "@/shared/lib/persianDigits";
import { useInvoiceDocumentQuery } from "@/shared/services/invoice/queries";
import { usePrintSettings } from "@/shared/store/printSettingsStore";
import InvoiceDocumentSheet from "./InvoiceDocumentSheet";
import InvoicePrintSettingsPanel from "./InvoicePrintSettingsPanel";
import { INVOICE_PRINT_DEFAULTS, printKindOf } from "./invoicePrintSettings";

/**
 * داده‌ی چاپی نرسید. ۴۰۴ یعنی endpoint روی این سرور نیست (بکندِ قدیمی‌تر)، نه اینکه سند نباشد — PDFِ رسمی
 * همان سند را دارد، پس راهِ چاپ همین‌جا می‌ماند و کاربر بی‌دکمه رها نمی‌شود.
 */
function DocumentUnavailable({ error, onRetry, onPrintOfficial, onDownloadOfficial }) {
  const isMissingEndpoint = error?.response?.status === 404;
  const hasOfficial = Boolean(onPrintOfficial || onDownloadOfficial);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-sm leading-6">
        {isMissingEndpoint
          ? "چاپ با کاغذ و چیدمانِ دلخواه هنوز روی این سرور فعال نیست."
          : getErrorMessage(error, "داده‌ی سند دریافت نشد.")}
      </p>
      {hasOfficial && <p className="text-xs leading-5 text-muted-foreground">PDFِ رسمیِ همین سند در دسترس است.</p>}
      <div className="flex w-full flex-col gap-2">
        {onPrintOfficial && (
          <Button type="button" className="h-10 gap-1.5" onClick={onPrintOfficial}>
            <Printer />
            چاپِ PDFِ رسمی
          </Button>
        )}
        {onDownloadOfficial && (
          <Button type="button" variant="outline" className="h-10 gap-1.5" onClick={onDownloadOfficial}>
            <Download />
            دانلودِ PDFِ رسمی
          </Button>
        )}
        {!isMissingEndpoint && (
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onRetry}>
            <RefreshCw />
            تلاش دوباره
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * چاپِ سندِ رسمیِ سرور (فاکتور/پیش‌فاکتور فروش، برگه‌ی طلبکاری، برگه‌ی مرجوعی خرید) در مرورگر، با کاغذ،
 * جهت، حاشیه، ستون‌ها، بخش‌ها و اندازه‌ی متنِ دلخواه — در همان پوسته‌ی مشترکِ چاپ (`PrintStudio`).
 *
 * داده همان `InvoiceDocumentModel`ی است که PDFِ رسمی از آن ساخته می‌شود (`useInvoiceDocumentQuery`)، پس عددها
 * و متن‌ها با PDF یکی است و فقط چیدمان فرق می‌کند. PDFِ رسمی برای بایگانی و فرستادن می‌ماند (`onDownloadOfficial`).
 *
 * @param documentKind       `"sale"` / `"saleReturn"` / `"purchaseReturn"`
 * @param documentId         شناسه‌ی سندِ ذخیره‌شده
 * @param title              عنوانِ پوسته تا داده برسد (مثلاً «پیش‌فاکتور»)
 * @param onDownloadOfficial دانلودِ PDFِ رسمیِ همین سند؛ نبودنش یعنی دکمه نمایش داده نمی‌شود
 * @param onPrintOfficial    چاپِ مستقیمِ PDFِ رسمی، وقتی داده‌ی چاپی نرسید
 */
export default function InvoicePrintStudio({
  documentKind,
  documentId,
  title,
  onDownloadOfficial,
  onPrintOfficial,
  onClose,
}) {
  const print = usePrint();
  const { settings, update, reset } = usePrintSettings(printKindOf(documentKind), INVOICE_PRINT_DEFAULTS);
  const query = useInvoiceDocumentQuery(documentKind, documentId);
  const [contentHeightMm, setContentHeightMm] = useState(0);

  const document_ = query.data;
  const geometry = pageGeometryOf(settings);
  const pageCount = flowPageCount(geometry, contentHeightMm);

  const summary = document_
    ? [
        document_.documentNumber && `شماره‌ی ${toPersianDigits(document_.documentNumber)}`,
        `${formatNumber(document_.lines?.length ?? 0)} قلم`,
        `${formatNumber(pageCount)} صفحه`,
      ]
        .filter(Boolean)
        .join("، ")
    : query.isError
      ? "داده‌ی سند دریافت نشد"
      : "در حالِ دریافتِ سند…";

  const preview = document_ && (
    <FlowSheet geometry={geometry} pageCount={pageCount} onMeasure={setContentHeightMm}>
      <InvoiceDocumentSheet
        document={document_}
        documentKind={documentKind}
        settings={settings}
        contentWidthMm={geometry.contentWidthMm}
      />
    </FlowSheet>
  );

  const previewNotice = document_ ? null : query.isError ? (
    <DocumentUnavailable
      error={query.error}
      onRetry={() => query.refetch()}
      onPrintOfficial={onPrintOfficial}
      onDownloadOfficial={onDownloadOfficial}
    />
  ) : (
    <Spinner className="size-8 text-primary" />
  );

  return (
    <PrintStudio
      title={`چاپِ ${document_?.title ?? title}`}
      summary={summary}
      settings={<InvoicePrintSettingsPanel settings={settings} geometry={geometry} update={update} reset={reset} />}
      previewWidthMm={geometry.widthMm}
      preview={preview}
      previewNotice={previewNotice}
      onPrint={() => print(flowPrintOptions(geometry, contentHeightMm))}
      printDisabled={!document_}
      // بی داده، همین دکمه‌ها داخلِ پیامِ پیش‌نمایش‌اند.
      actions={
        document_ &&
        onDownloadOfficial && (
          <Button type="button" variant="outline" className="h-10 gap-1.5" onClick={onDownloadOfficial}>
            <Download />
            PDFِ رسمی
          </Button>
        )
      }
      onClose={onClose}
    />
  );
}
