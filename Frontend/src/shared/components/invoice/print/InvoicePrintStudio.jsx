import { useState } from "react";
import { Download } from "lucide-react";

import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FlowSheet from "@/shared/components/print/FlowSheet";
import { flowPageCount, flowPrintOptions, pageGeometryOf } from "@/shared/components/print/paper";
import PrintStudio from "@/shared/components/print/studio/PrintStudio";
import { usePrint } from "@/shared/components/print/usePrint";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toPersianDigits } from "@/shared/lib/persianDigits";
import { useInvoiceDocumentQuery } from "@/shared/services/invoice/queries";
import { usePrintSettings } from "@/shared/store/printSettingsStore";
import InvoiceDocumentSheet from "./InvoiceDocumentSheet";
import InvoicePrintSettingsPanel from "./InvoicePrintSettingsPanel";
import { INVOICE_PRINT_DEFAULTS, printKindOf } from "./invoicePrintSettings";

/** جای پیش‌نمایش تا داده برسد یا وقتی نرسید — به عرضِ کاغذ تا پوسته جابه‌جا نشود. */
function PreviewPlaceholder({ widthMm, children }) {
  return (
    <div className="flex min-h-60 items-center justify-center bg-white p-6 text-black shadow-sm" style={{ width: `${widthMm}mm` }}>
      {children}
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
 */
export default function InvoicePrintStudio({ documentKind, documentId, title, onDownloadOfficial, onClose }) {
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

  const preview = document_ ? (
    <FlowSheet geometry={geometry} pageCount={pageCount} onMeasure={setContentHeightMm}>
      <InvoiceDocumentSheet
        document={document_}
        documentKind={documentKind}
        settings={settings}
        contentWidthMm={geometry.contentWidthMm}
      />
    </FlowSheet>
  ) : (
    <PreviewPlaceholder widthMm={geometry.widthMm}>
      {query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <Spinner className="size-8 text-primary" />
      )}
    </PreviewPlaceholder>
  );

  return (
    <PrintStudio
      title={`چاپِ ${document_?.title ?? title}`}
      summary={summary}
      settings={<InvoicePrintSettingsPanel settings={settings} geometry={geometry} update={update} reset={reset} />}
      previewWidthMm={geometry.widthMm}
      preview={preview}
      onPrint={() => print(flowPrintOptions(geometry, contentHeightMm))}
      printDisabled={!document_}
      actions={
        onDownloadOfficial && (
          <Button type="button" variant="outline" className="h-10 gap-1.5" onClick={onDownloadOfficial}>
            <Download />
            <span className="hidden sm:inline">PDFِ رسمی</span>
          </Button>
        )
      }
      onClose={onClose}
    />
  );
}
