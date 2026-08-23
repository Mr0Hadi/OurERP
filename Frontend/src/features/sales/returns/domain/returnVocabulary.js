// src/features/sales/returns/domain/returnVocabulary.js

import { RETURN_SIDES, SIDE_CONFIG } from "@/shared/domain/returns/sides";
import {
  SALES_CLAIM_PROBLEMS,
  problemLabels,
  problemStyles,
  problemSubset,
} from "@/shared/domain/returns/problems";
import {
  CLAIM_SCOPES,
  OFF_SCOPE_KINDS,
} from "@/shared/domain/returns/scopes";

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
 * مقادیر از فضای مشترکِ `shared/domain/returns/problems.js` می‌آیند؛
 * اینجا فقط *زیرمجموعه‌ی* سمت فروش انتخاب و در جاهایی که واژه‌ی
 * فروش با واژه‌ی خنثی فرق دارد، برچسب بازنویسی می‌شود. مقدارها هرگز
 * اینجا ساخته نمی‌شوند تا گزارش انبار و ادعای خرید و ادعای فروش همه
 * روی یک فضای مقدار بنشینند.
 */
export const RETURN_PROBLEMS = problemSubset(SALES_CLAIM_PROBLEMS);

export const RETURN_PROBLEM_LABELS = problemLabels(SALES_CLAIM_PROBLEMS, {
  [RETURN_PROBLEMS.WRONG_ITEM_SHIPPED]: "انبار کالای اشتباه فرستاد",
  [RETURN_PROBLEMS.WRONG_ITEM_ORDERED]: "مشتری کالا را اشتباه سفارش داد",
  [RETURN_PROBLEMS.SHORT_SHIPPED]: "کمتر از فاکتور ارسال شد",
  [RETURN_PROBLEMS.OVER_SHIPPED]: "بیشتر از فاکتور ارسال شد",
  [RETURN_PROBLEMS.WRONG_QTY_ORDERED]: "مشتری تعداد را اشتباه سفارش داد",
  [RETURN_PROBLEMS.CHANGED_MIND]: "انصراف / پشیمانی مشتری",
});

export const RETURN_PROBLEM_STYLES = problemStyles(SALES_CLAIM_PROBLEMS);

// ─── محور ۲: دامنه‌ی ادعا ───────────────────────────────────────────────────

/**
 * ادعا یا روی یک خط فاکتور می‌نشیند (و سقفش مقداری است که واقعاً به
 * مشتری ارسال شده)، یا اصلاً بیرون از فاکتور است.
 *
 * قرینه‌ی «مازاد» در مرجوعی خرید. بدون این، خطای انباردار در ارسالِ
 * کالای اضافه یا کالایی که در فاکتور نیست، هیچ راه ثبتی ندارد.
 *
 * مقدارها از دامنه‌ی مشترک می‌آیند (scopes.js) و فقط برچسب‌ها اینجا
 * به زبان فروش نوشته شده‌اند. برخلاف خرید، اینجا کالای «ناشناس»
 * نداریم: هرچه دست مشتری است از انبار ما بیرون رفته، پس همیشه یک
 * productId واقعی دارد.
 */
export {
  CLAIM_SCOPES,
  OFF_SCOPE_KINDS as OFF_INVOICE_KINDS,
  OFF_SCOPE_KIND_STYLES as OFF_INVOICE_KIND_STYLES,
  isOffScope as isOffInvoice,
} from "@/shared/domain/returns/scopes";

export const CLAIM_SCOPE_LABELS = {
  [CLAIM_SCOPES.ON_ORDER]: "روی فاکتور",
  [CLAIM_SCOPES.OFF_ORDER]: "خارج از فاکتور",
};

export const OFF_INVOICE_KIND_LABELS = {
  [OFF_SCOPE_KINDS.EXCESS]: "بیش از مقدار ارسال‌شده",
  [OFF_SCOPE_KINDS.UNLISTED]: "کالای خارج از فاکتور",
};

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
