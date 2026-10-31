import { baseFontPt } from "@/shared/components/print/typography";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { numberToPersianWords } from "@/shared/lib/numberToPersianWords";
import { toPersianDigits } from "@/shared/lib/persianDigits";
import { cn } from "@/shared/lib/utils";
import { TABLE_STYLES, WIDE_TABLE_MIN_WIDTH_MM, issuerLabelOf } from "./invoicePrintSettings";

/** خانه‌ی «برچسب: مقدار» در کادرِ مشخصات؛ مقدارِ خالی جای خالیِ خط‌دار می‌گیرد تا دستی پر شود. */
function Field({ label, value, wide = false, digits = false }) {
  return (
    <div className={cn("flex min-w-0 items-baseline gap-1", wide && "col-span-full")}>
      <span className="shrink-0 text-black/60">{label}:</span>
      <span className="min-w-0 flex-1 border-b border-dotted border-black/30 pb-px font-medium">
        {value ? (digits ? toPersianDigits(value) : value) : " "}
      </span>
    </div>
  );
}

/** کادرِ مشخصاتِ یک طرف — همان خانه‌های قالبِ رسمی، به همان ترتیب. */
function PartyBox({ title, party, compact }) {
  return (
    <section className="break-inside-avoid border border-black/70">
      <h2 className="border-b border-black/70 bg-black/[0.06] px-2 py-0.5 text-center font-bold">مشخصاتِ {title}</h2>
      <div className={cn("grid gap-x-4 gap-y-1 px-2 py-1.5", compact ? "grid-cols-2" : "grid-cols-4")}>
        <Field label="نام" value={party.name} wide={compact} />
        <Field label="کدِ اقتصادی" value={party.economicCode} digits />
        <Field label="شماره‌ی ثبت" value={party.registrationNumber} digits />
        <Field label="شناسه‌ی ملی" value={party.nationalId} digits />
        <Field label="استان" value={party.province} />
        <Field label="شهر" value={party.city} />
        <Field label="کدِ پستی" value={party.postalCode} digits />
        <Field label="تلفن" value={party.phoneNumber} digits />
        <Field label="نشانی" value={party.address} wide />
      </div>
    </section>
  );
}

/** ستون‌های جدول به ترتیبِ قالبِ رسمی؛ `optional` با تنظیماتِ کاربر روشن/خاموش می‌شود. */
const LINE_COLUMNS = [
  { key: "row", title: "ردیف", align: "center", render: (line) => formatNumber(line.rowNumber) },
  {
    key: "code",
    optional: true,
    title: "کدِ کالا",
    align: "center",
    render: (line) => (
      <span dir="ltr" className="font-mono text-[0.9em]">
        {line.productCode}
      </span>
    ),
  },
  { key: "name", title: "شرحِ کالا یا خدمات", align: "start", render: (line) => line.productName },
  { key: "quantity", title: "تعداد", align: "center", render: (line) => formatNumber(line.quantity) },
  { key: "unit", optional: true, title: "واحد", align: "center", render: (line) => line.unit ?? "" },
  { key: "unitPrice", title: "مبلغِ واحد", align: "end", money: true, render: (line) => formatNumber(line.unitPrice) },
  { key: "gross", optional: true, title: "مبلغِ کل", align: "end", money: true, render: (line) => formatNumber(line.grossAmount) },
  {
    key: "discount",
    optional: true,
    title: "تخفیف",
    align: "end",
    money: true,
    render: (line) => (Number(line.discountAmount) ? formatNumber(line.discountAmount) : "—"),
  },
  { key: "net", optional: true, title: "مبلغِ پس از تخفیف", align: "end", money: true, render: (line) => formatNumber(line.netAmount) },
  {
    key: "tax",
    optional: true,
    title: "مالیات و عوارض",
    align: "end",
    money: true,
    render: (line) => (Number(line.taxAmount) ? formatNumber(line.taxAmount) : "—"),
  },
  { key: "total", title: "جمعِ کل", align: "end", money: true, render: (line) => formatNumber(line.lineTotal) },
];

/**
 * جمعِ ستون در سطرِ پایانی — فقط جمع‌هایی که سرور خودش فرستاده. «پس از تخفیف» جمعِ جدایی در پاسخ ندارد و
 * خالی می‌ماند؛ ساختنش از دو جمعِ دیگر یعنی محاسبه‌ی مبلغ در فرانت.
 */
const COLUMN_TOTALS = {
  gross: (document_) => document_.subTotal,
  discount: (document_) => document_.totalDiscount,
  tax: (document_) => document_.totalTax,
  total: (document_) => document_.grandTotal,
};

const ALIGN_CLASS = { start: "text-right", center: "text-center", end: "text-left" };

function LinesTable({ document_, columns, tableStyle, currency }) {
  const visible = LINE_COLUMNS.filter((column) => !column.optional || columns[column.key]);
  const official = tableStyle === TABLE_STYLES.OFFICIAL;
  const cell = official ? "border border-black/60 px-1.5 py-1" : "border-b border-black/20 px-1.5 py-1";
  const firstTotalIndex = visible.findIndex((column) => COLUMN_TOTALS[column.key]);

  return (
    <section>
      <h2 className={cn("px-2 py-0.5 text-center font-bold", official ? "border border-b-0 border-black/70 bg-black/[0.06]" : "border-b border-black/60")}>
        مشخصاتِ کالا یا خدماتِ مورد معامله
        <span className="ms-2 font-normal text-black/60">(مبالغ به {currency})</span>
      </h2>
      <table className="w-full border-collapse">
        <thead className={official ? "bg-black/[0.06]" : undefined}>
          <tr>
            {visible.map((column) => (
              <th key={column.key} className={cn(cell, "font-semibold", ALIGN_CLASS.center)}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {document_.lines.map((line) => (
            <tr key={line.rowNumber} className="break-inside-avoid align-top">
              {visible.map((column) => (
                <td key={column.key} className={cn(cell, ALIGN_CLASS[column.align], column.money && "tabular-nums")}>
                  {column.render(line)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="break-inside-avoid font-bold">
          <tr className={official ? "bg-black/[0.04]" : undefined}>
            <td colSpan={Math.max(1, firstTotalIndex)} className={cn(cell, "text-left")}>
              جمع
            </td>
            {visible.slice(Math.max(1, firstTotalIndex)).map((column) => (
              <td key={column.key} className={cn(cell, "text-left tabular-nums")}>
                {COLUMN_TOTALS[column.key] ? formatNumber(COLUMN_TOTALS[column.key](document_)) : ""}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={cn("flex justify-between gap-4 px-2 py-0.5", strong && "font-bold")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Summary({ document_, sections, currency }) {
  const hasPlan = document_.payableAmount != null;
  const payable = hasPlan ? document_.payableAmount : document_.grandTotal;
  const balance = Number(document_.balance);

  return (
    <section className="flex break-inside-avoid items-stretch border border-black/70">
      {sections.amountInWords && (
        <p className="flex flex-1 items-center border-e border-black/70 px-2 py-1">
          <span className="text-black/60">جمعِ قابلِ پرداخت به حروف:&nbsp;</span>
          <span className="font-medium">{numberToPersianWords(payable, { suffix: currency })}</span>
        </p>
      )}
      <dl className={cn("py-1", sections.amountInWords ? "w-[40%]" : "flex-1")}>
        <SummaryRow label="جمعِ فاکتور" value={`${formatNumber(document_.grandTotal)} ${currency}`} strong={!hasPlan} />
        {hasPlan && (
          <>
            <SummaryRow label="سودِ اقساط" value={`${formatNumber(document_.installmentChargeAmount)} ${currency}`} />
            <SummaryRow label="جمعِ قابلِ پرداخت" value={`${formatNumber(payable)} ${currency}`} strong />
          </>
        )}
        {sections.payment && (
          <>
            <SummaryRow label="پرداخت‌شده" value={`${formatNumber(document_.paidAmount)} ${currency}`} />
            <SummaryRow
              label={balance < 0 ? "اضافه‌پرداخت" : "مانده"}
              value={`${formatNumber(Math.abs(balance))} ${currency}`}
            />
          </>
        )}
      </dl>
    </section>
  );
}

function Notes({ document_ }) {
  const lines = [...(document_.notes ?? []), document_.description].filter((line) => line?.trim());
  if (!lines.length) return null;
  return (
    <section className="break-inside-avoid border border-black/70 px-2 py-1">
      <span className="font-semibold">توضیحات: </span>
      {lines.map((line, index) => (
        <span key={index} className="whitespace-pre-line">
          {index > 0 && " — "}
          {line}
        </span>
      ))}
    </section>
  );
}

function Signatures({ issuerLabel, counterpartyLabel }) {
  return (
    <section className="grid break-inside-avoid grid-cols-2 border border-black/70">
      {[issuerLabel, counterpartyLabel].map((label, index) => (
        <div key={label} className={cn("h-[22mm] px-2 py-1 text-center", index === 0 && "border-e border-black/70")}>
          مهر و امضای {label}
        </div>
      ))}
    </section>
  );
}

/**
 * متنِ سندِ رسمی از داده‌ی سرور (`getInvoiceDocument`) — هم‌شکلِ قالبِ رسمیِ PDF: سربرگ با شماره و تاریخ،
 * کادرِ شرکت و طرفِ حساب، جدولِ اقلام با سطرِ جمع، جمعِ فاکتور (و سود و جمعِ قابلِ پرداختِ اقساط)، توضیحات و
 * جای امضا. فقط نمایش است و هیچ مبلغی را حساب نمی‌کند؛ هر عدد همان است که سرور فرستاده.
 *
 * برخلافِ قالبِ Excel (هفت قلم در هر صفحه) جدول جاری است و مرورگر بینِ صفحه‌ها می‌شکند؛ سرِ جدول در هر
 * صفحه تکرار می‌شود (`thead`) و هیچ سطری نصفه نمی‌ماند.
 *
 * @param documentKind `"sale"` / `"saleReturn"` / `"purchaseReturn"` — فقط برای عنوانِ کادرِ شرکت
 * @param settings     `INVOICE_PRINT_DEFAULTS` + تغییراتِ کاربر
 * @param contentWidthMm عرضِ مفیدِ کاغذ؛ زیرِ `WIDE_TABLE_MIN_WIDTH_MM` کادرهای مشخصات دوستونی می‌شوند
 */
export default function InvoiceDocumentSheet({ document: document_, documentKind, settings, contentWidthMm }) {
  const { sections, columns } = settings;
  const compact = contentWidthMm < WIDE_TABLE_MIN_WIDTH_MM;
  const currency = document_.company?.currency || "ریال";
  const issuerLabel = issuerLabelOf(documentKind);

  return (
    <div dir="rtl" className="space-y-[2mm] leading-[1.5]" style={{ fontSize: `${baseFontPt(settings.textScale)}pt` }}>
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border border-black/70 px-2 py-1.5">
        <div />
        <h1 className="text-center text-[1.6em] font-bold">{document_.title}</h1>
        <dl className="justify-self-end space-y-0.5">
          <div className="flex gap-1">
            <dt className="text-black/60">شماره:</dt>
            <dd dir="ltr" className="font-medium">
              {document_.documentNumber ? toPersianDigits(document_.documentNumber) : "—"}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-black/60">تاریخ:</dt>
            <dd className="font-medium">{gregorianToPersian(document_.documentDate)}</dd>
          </div>
          {document_.paymentDueDate && (
            <div className="flex gap-1">
              <dt className="text-black/60">مهلتِ پرداخت:</dt>
              <dd className="font-medium">{gregorianToPersian(document_.paymentDueDate)}</dd>
            </div>
          )}
        </dl>
      </header>

      {sections.issuer && <PartyBox title={issuerLabel} party={document_.company ?? {}} compact={compact} />}
      {sections.counterparty && (
        <PartyBox title={document_.counterpartyLabel} party={document_.counterparty ?? {}} compact={compact} />
      )}

      <LinesTable document_={document_} columns={columns} tableStyle={settings.tableStyle} currency={currency} />

      <Summary document_={document_} sections={sections} currency={currency} />

      {sections.notes && <Notes document_={document_} />}
      {sections.signatures && (
        <Signatures issuerLabel={issuerLabel} counterpartyLabel={document_.counterpartyLabel} />
      )}
    </div>
  );
}
