import {
  UNIT_STATUS_LABELS,
  UNIT_CUSTODY_REASON_LABELS,
} from "@/shared/domain/enums/unitStatus";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { whereaboutsOf } from "./unitVocabulary";

/**
 * خروجیِ CSV از دانه‌ها — برای اکسل، حسابرسی یا تحویل به بیمه/تامین‌کننده.
 *
 * BOM و `\r\n` برای این‌اند که اکسلِ ویندوز فارسی را درست بخواند و هر
 * ردیف را ردیفِ جدا ببیند؛ بارکد با پیشوندِ `=""` می‌رود تا اکسل آن را
 * عدد نکند و رقم‌های آخرش را صفر نکند.
 */
const date = (value) => (value ? gregorianToPersian(String(value).slice(0, 10)) : "");

const COLUMNS = [
  ["بارکد", (u) => `="${u.barcode}"`],
  ["سریال", (u) => u.serialNumber],
  ["کالا", (u) => u.productName ?? ""],
  ["کد کالا", (u) => u.productCode ?? ""],
  ["وضعیت", (u) => UNIT_STATUS_LABELS[u.status] ?? u.status],
  ["علت نگهداری", (u) => UNIT_CUSTODY_REASON_LABELS[u.custodyReason] ?? ""],
  ["کجاست", (u) => {
    const where = whereaboutsOf(u);
    return [where.place, where.detail].filter(Boolean).join(" — ");
  }],
  ["خرید", (u) => u.purchaseInvoiceNumber ?? ""],
  ["تامین‌کننده", (u) => u.supplierName ?? ""],
  ["فروش", (u) => u.saleInvoiceNumber ?? ""],
  ["مشتری", (u) => u.customerName ?? ""],
  ["تاریخ ورود", (u) => date(u.createdAt)],
  ["در قرنطینه از", (u) => date(u.quarantinedAt)],
  ["دفعات چاپ برچسب", (u) => u.printCount],
  ["آخرین چاپ", (u) => date(u.lastPrintedAt)],
];

const escape = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) && !text.startsWith('="')
    ? `"${text.replace(/"/g, '""')}"`
    : text;
};

export function unitsToCsv(units) {
  const header = COLUMNS.map(([title]) => title).join(",");
  const rows = units.map((unit) => COLUMNS.map(([, get]) => escape(get(unit))).join(","));
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function downloadUnitsCsv(units, fileName = "product-units") {
  const blob = new Blob([unitsToCsv(units)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
