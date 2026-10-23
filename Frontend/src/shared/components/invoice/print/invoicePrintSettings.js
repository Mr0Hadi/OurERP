import {
  DEFAULT_PAPER_SETTINGS,
  MARGIN_PRESETS,
  ORIENTATIONS,
  PAPER_KEYS,
} from "@/shared/components/print/paper";
import { TEXT_SCALES } from "@/shared/components/print/typography";

/**
 * تنظیماتِ چاپِ سندِ رسمی (فاکتور/پیش‌فاکتور فروش، برگه‌ی طلبکاری، برگه‌ی مرجوعی خرید) در مرورگر.
 *
 * پیش‌فرض‌ها همان شکلِ قالبِ رسمیِ سرور است (A4 افقی، جدولِ خط‌دار، همه‌ی بخش‌ها)؛ کاربر هر چیزی را عوض کند
 * برای همان نوعِ سند روی همین دستگاه می‌ماند (`printKindOf`). داده و مبالغ همیشه از سرور است؛ این تنظیمات فقط
 * «چه دیده شود و روی چه کاغذی».
 */

/** هر نوعِ سند تنظیمِ جدای خودش را دارد: برگه‌ی طلبکاری لازم نیست کاغذِ فاکتور را عوض کند. */
export const printKindOf = (documentKind) => `invoice-document:${documentKind}`;

export const INVOICE_PAPER_KEYS = Object.freeze([PAPER_KEYS.A4, PAPER_KEYS.A5, PAPER_KEYS.A3, PAPER_KEYS.LETTER]);

/** شکلِ جدولِ اقلام: «رسمی» با خطِ همه‌ی خانه‌ها مثلِ قالبِ دولتی، «ساده» فقط خطِ بینِ سطرها. */
export const TABLE_STYLES = Object.freeze({ OFFICIAL: "official", SIMPLE: "simple" });

export const TABLE_STYLE_LABELS = Object.freeze({
  [TABLE_STYLES.OFFICIAL]: "رسمی (خط‌دار)",
  [TABLE_STYLES.SIMPLE]: "ساده",
});

/** ستون‌های اختیاریِ جدول؛ ردیف، شرح، تعداد، مبلغِ واحد و جمعِ کل همیشه هستند. */
export const INVOICE_COLUMNS = Object.freeze([
  { key: "code", label: "کدِ کالا" },
  { key: "unit", label: "واحد" },
  { key: "gross", label: "مبلغِ کل" },
  { key: "discount", label: "تخفیف" },
  { key: "net", label: "مبلغِ پس از تخفیف" },
  { key: "tax", label: "مالیات و عوارض" },
]);

/** بخش‌های سند که می‌شود خاموش کرد. */
export const INVOICE_SECTIONS = Object.freeze([
  { key: "issuer", label: "مشخصاتِ شرکتِ ما" },
  { key: "counterparty", label: "مشخصاتِ طرفِ حساب" },
  { key: "amountInWords", label: "جمع به حروف" },
  { key: "payment", label: "پرداخت‌شده و مانده" },
  { key: "notes", label: "توضیحات" },
  { key: "signatures", label: "جای مهر و امضا" },
]);

export const INVOICE_PRINT_DEFAULTS = Object.freeze({
  ...DEFAULT_PAPER_SETTINGS,
  orientation: ORIENTATIONS.LANDSCAPE,
  marginPreset: MARGIN_PRESETS.NARROW,
  textScale: TEXT_SCALES.SMALL,
  tableStyle: TABLE_STYLES.OFFICIAL,
  columns: { code: true, unit: true, gross: true, discount: true, net: true, tax: true },
  sections: {
    issuer: true,
    counterparty: true,
    amountInWords: true,
    payment: true,
    notes: true,
    signatures: true,
  },
});

/** زیرِ این عرضِ مفید (میلی‌متر) همه‌ی ستون‌ها خوانا جا نمی‌شوند؛ پنل پیشنهادِ کم‌کردنِ ستون می‌دهد. */
export const WIDE_TABLE_MIN_WIDTH_MM = 180;

/** تعدادِ ستون‌های اختیاریِ روشن — برای هشدارِ کاغذِ تنگ. */
export const enabledColumnCount = (columns) => INVOICE_COLUMNS.filter((column) => columns[column.key]).length;

/** عنوانِ کادرِ شرکت: در فروش «فروشنده»؛ در برگه‌های مرجوعی شرکت صادرکننده‌ی برگه است. */
export const issuerLabelOf = (documentKind) => (documentKind === "sale" ? "فروشنده" : "صادرکننده");
