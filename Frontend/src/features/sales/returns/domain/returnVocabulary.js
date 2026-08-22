// src/features/sales/returns/domain/returnVocabulary.js

import { RETURN_SIDES, SIDE_CONFIG } from "@/shared/domain/returns/sides";

/**
 * واژگانِ پایه‌ی مرجوعی فروش.
 *
 * این ماژول فقط *نام‌گذاری* می‌کند — هیچ محاسبه‌ای اینجا نیست. دو محور
 * مستقل از هم:
 *
 *   ۱. مشکل چیست؟   → RETURN_PROBLEMS  (چه اتفاقی افتاده)
 *   ۲. دامنه کجاست؟ → CLAIM_SCOPES     (روی فاکتور یا بیرون از آن)
 *
 * «تصمیم» عمداً اینجا نیست: تصمیم یک واژه نیست، ترکیبی از اثرهاست و
 * جای آن returnEffects.js / returnResolutions.js است.
 */

// ─── محور ۱: مشکل ───────────────────────────────────────────────────────────

/**
 * مشکلِ دقیق — همان چیزی که واحد فروش از مشتری می‌شنود.
 *
 * تفکیک «انبار اشتباه فرستاد» از «فروش اشتباه ثبت کرد» از «مشتری
 * اشتباه سفارش داد» عمدی است: هر سه از بیرون یک شکل دارند (کالای
 * اشتباه دست مشتری است) ولی ریشه‌شان فرق می‌کند و برای گزارش‌گیریِ
 * بعدی باید از هم قابل تشخیص باشند.
 */
export const RETURN_PROBLEMS = {
  // نوع کالا
  WRONG_ITEM_SHIPPED: "wrong_item_shipped",
  WRONG_ITEM_INVOICED: "wrong_item_invoiced",
  WRONG_ITEM_ORDERED: "wrong_item_ordered",
  // تعداد
  SHORT_SHIPPED: "short_shipped",
  OVER_SHIPPED: "over_shipped",
  WRONG_QTY_INVOICED: "wrong_qty_invoiced",
  WRONG_QTY_ORDERED: "wrong_qty_ordered",
  // خرابی
  DEFECTIVE: "defective",
  DAMAGED_IN_TRANSIT: "damaged_in_transit",
  QUALITY_ISSUE: "quality_issue",
  EXPIRED: "expired",
  // بدون نقص
  CHANGED_MIND: "changed_mind",
  // سایر
  OTHER: "other",
};

export const RETURN_PROBLEM_LABELS = {
  [RETURN_PROBLEMS.WRONG_ITEM_SHIPPED]: "انبار کالای اشتباه فرستاد",
  [RETURN_PROBLEMS.WRONG_ITEM_INVOICED]: "کالا در فاکتور اشتباه ثبت شد",
  [RETURN_PROBLEMS.WRONG_ITEM_ORDERED]: "مشتری کالا را اشتباه سفارش داد",
  [RETURN_PROBLEMS.SHORT_SHIPPED]: "کمتر از فاکتور ارسال شد",
  [RETURN_PROBLEMS.OVER_SHIPPED]: "بیشتر از فاکتور ارسال شد",
  [RETURN_PROBLEMS.WRONG_QTY_INVOICED]: "تعداد در فاکتور اشتباه ثبت شد",
  [RETURN_PROBLEMS.WRONG_QTY_ORDERED]: "مشتری تعداد را اشتباه سفارش داد",
  [RETURN_PROBLEMS.DEFECTIVE]: "کالای معیوب / خراب",
  [RETURN_PROBLEMS.DAMAGED_IN_TRANSIT]: "آسیب‌دیده در حمل",
  [RETURN_PROBLEMS.QUALITY_ISSUE]: "مغایرت کیفیت / مشخصات",
  [RETURN_PROBLEMS.EXPIRED]: "تاریخ گذشته",
  [RETURN_PROBLEMS.CHANGED_MIND]: "انصراف / پشیمانی مشتری",
  [RETURN_PROBLEMS.OTHER]: "سایر موارد",
};

export const RETURN_PROBLEM_STYLES = {
  [RETURN_PROBLEMS.WRONG_ITEM_SHIPPED]:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  [RETURN_PROBLEMS.WRONG_ITEM_INVOICED]:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  [RETURN_PROBLEMS.WRONG_ITEM_ORDERED]:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  [RETURN_PROBLEMS.SHORT_SHIPPED]:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  [RETURN_PROBLEMS.OVER_SHIPPED]:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
  [RETURN_PROBLEMS.WRONG_QTY_INVOICED]:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  [RETURN_PROBLEMS.WRONG_QTY_ORDERED]:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  [RETURN_PROBLEMS.DEFECTIVE]:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
  [RETURN_PROBLEMS.DAMAGED_IN_TRANSIT]:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400",
  [RETURN_PROBLEMS.QUALITY_ISSUE]:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
  [RETURN_PROBLEMS.EXPIRED]:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400",
  [RETURN_PROBLEMS.CHANGED_MIND]:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-400",
  [RETURN_PROBLEMS.OTHER]: "bg-muted text-muted-foreground border-border",
};

// ─── محور ۲: دامنه‌ی ادعا ───────────────────────────────────────────────────

/**
 * ادعا یا روی یک خط فاکتور می‌نشیند (و سقفش مقداری است که واقعاً به
 * مشتری ارسال شده)، یا اصلاً بیرون از فاکتور است.
 *
 * قرینه‌ی «مازاد» در مرجوعی خرید. بدون این، خطای انباردار در ارسالِ
 * کالای اضافه یا کالایی که در فاکتور نیست، هیچ راه ثبتی ندارد — و
 * دقیقاً یکی از سه مقصرِ صورت‌مسئله همین است.
 *
 * برخلاف خرید، اینجا کالای «ناشناس» نداریم: هرچه دست مشتری است از
 * انبار ما بیرون رفته، پس همیشه یک productId واقعی دارد.
 */
export const CLAIM_SCOPES = {
  ON_INVOICE: "on_invoice",
  OFF_INVOICE: "off_invoice",
};

export const CLAIM_SCOPE_LABELS = {
  [CLAIM_SCOPES.ON_INVOICE]: "روی فاکتور",
  [CLAIM_SCOPES.OFF_INVOICE]: "خارج از فاکتور",
};

/**
 * وقتی ادعا خارج از فاکتور است، دو حالت دارد که رفتار قیمتی‌شان فرق
 * می‌کند: EXCESS قیمت واحدِ همان خط فاکتور را دارد، UNLISTED باید
 * قیمتش از کالا خوانده یا دستی وارد شود (چون خط فاکتوری ندارد).
 */
export const OFF_INVOICE_KINDS = {
  EXCESS: "excess",
  UNLISTED: "unlisted",
};

export const OFF_INVOICE_KIND_LABELS = {
  [OFF_INVOICE_KINDS.EXCESS]: "بیش از مقدار ارسال‌شده",
  [OFF_INVOICE_KINDS.UNLISTED]: "کالای خارج از فاکتور",
};

export const OFF_INVOICE_KIND_STYLES = {
  [OFF_INVOICE_KINDS.EXCESS]:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
  [OFF_INVOICE_KINDS.UNLISTED]:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-400",
};

export function isOffInvoice(claim) {
  return claim?.scope === CLAIM_SCOPES.OFF_INVOICE;
}

// ─── وضعیت مرجوعی ───────────────────────────────────────────────────────────

/**
 * وضعیت‌ها مشترک با مرجوعی خرید هستند و از دامنه‌ی مشترک می‌آیند؛ فقط
 * برچسب‌هایشان سمت‌به‌سمت فرق می‌کند (sides.js).
 */
export {
  RETURN_STATUSES as SALES_RETURN_STATUSES,
  RETURN_STATUS_STYLES as SALES_RETURN_STATUS_STYLES,
  isTerminalStatus,
} from "@/shared/domain/returns/statuses";

export const SALES_RETURN_STATUS_LABELS =
  SIDE_CONFIG[RETURN_SIDES.SALES].statusLabels;
