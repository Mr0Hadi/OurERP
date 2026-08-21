// src/features/sales/returns/domain/returnVocabulary.js

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
 * خانواده‌ی مشکل — همان سه محوری که صورت‌مسئله دارد (نوع کالا، تعداد،
 * خرابی) به‌علاوه‌ی حالتی که اصلاً نقصی در کار نیست (پشیمانی مشتری).
 *
 * خانواده برای فیلتر و گزارش است؛ چیزی که کاربر انتخاب می‌کند مشکلِ
 * دقیق (RETURN_PROBLEMS) است، نه خانواده.
 */
export const PROBLEM_FAMILIES = {
  WRONG_PRODUCT: "wrong_product",
  QTY_MISMATCH: "qty_mismatch",
  DAMAGED: "damaged",
  NO_DEFECT: "no_defect",
  OTHER: "other",
};

export const PROBLEM_FAMILY_LABELS = {
  [PROBLEM_FAMILIES.WRONG_PRODUCT]: "نوع کالا",
  [PROBLEM_FAMILIES.QTY_MISMATCH]: "تعداد کالا",
  [PROBLEM_FAMILIES.DAMAGED]: "خرابی کالا",
  [PROBLEM_FAMILIES.NO_DEFECT]: "بدون نقص کالا",
  [PROBLEM_FAMILIES.OTHER]: "سایر",
};

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

const PROBLEM_FAMILY_OF = {
  [RETURN_PROBLEMS.WRONG_ITEM_SHIPPED]: PROBLEM_FAMILIES.WRONG_PRODUCT,
  [RETURN_PROBLEMS.WRONG_ITEM_INVOICED]: PROBLEM_FAMILIES.WRONG_PRODUCT,
  [RETURN_PROBLEMS.WRONG_ITEM_ORDERED]: PROBLEM_FAMILIES.WRONG_PRODUCT,
  [RETURN_PROBLEMS.SHORT_SHIPPED]: PROBLEM_FAMILIES.QTY_MISMATCH,
  [RETURN_PROBLEMS.OVER_SHIPPED]: PROBLEM_FAMILIES.QTY_MISMATCH,
  [RETURN_PROBLEMS.WRONG_QTY_INVOICED]: PROBLEM_FAMILIES.QTY_MISMATCH,
  [RETURN_PROBLEMS.WRONG_QTY_ORDERED]: PROBLEM_FAMILIES.QTY_MISMATCH,
  [RETURN_PROBLEMS.DEFECTIVE]: PROBLEM_FAMILIES.DAMAGED,
  [RETURN_PROBLEMS.DAMAGED_IN_TRANSIT]: PROBLEM_FAMILIES.DAMAGED,
  [RETURN_PROBLEMS.QUALITY_ISSUE]: PROBLEM_FAMILIES.DAMAGED,
  [RETURN_PROBLEMS.EXPIRED]: PROBLEM_FAMILIES.DAMAGED,
  [RETURN_PROBLEMS.CHANGED_MIND]: PROBLEM_FAMILIES.NO_DEFECT,
  [RETURN_PROBLEMS.OTHER]: PROBLEM_FAMILIES.OTHER,
};

export function problemFamilyOf(problem) {
  return PROBLEM_FAMILY_OF[problem] ?? PROBLEM_FAMILIES.OTHER;
}

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

// ─── محور ۳: دامنه‌ی ادعا ───────────────────────────────────────────────────

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
 * وضعیت دیگر دستی انتخاب نمی‌شود و — مهم‌تر — دیگر به بازرسی انبار
 * گره نخورده است. سیستم قبلی تا وقتی کالا فیزیکاً تحویل گرفته نمی‌شد
 * در PENDING_INSPECTION گیر می‌کرد، که یعنی «مرجوعیِ بدون پس‌گرفتن
 * کالا» اصلاً نمی‌توانست جلو برود.
 *
 * حالا وضعیت از روی *اثرها* مشتق می‌شود (returnResolutions.js):
 *   OPEN        → ادعا ثبت شده، هنوز هیچ تصمیمی نیست
 *   IN_PROGRESS → تصمیم هست ولی یا کل ادعا تصمیم نخورده یا اثری
 *                 هنوز اعمال نشده (منتظر انبار / منتظر مالی)
 *   SETTLED     → کل ادعا تصمیم خورده و همه‌ی اثرها اعمال شده‌اند
 *
 * REJECTED و CANCELLED مشتق نمی‌شوند؛ اکشن صریح‌اند و روی رکورد
 * می‌نشینند.
 */
export const SALES_RETURN_STATUSES = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  SETTLED: "settled",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const SALES_RETURN_STATUS_LABELS = {
  [SALES_RETURN_STATUSES.OPEN]: "در انتظار تصمیم",
  [SALES_RETURN_STATUSES.IN_PROGRESS]: "در حال اجرا",
  [SALES_RETURN_STATUSES.SETTLED]: "تسویه شده",
  [SALES_RETURN_STATUSES.REJECTED]: "رد شده",
  [SALES_RETURN_STATUSES.CANCELLED]: "لغو شده",
};

export const SALES_RETURN_STATUS_STYLES = {
  [SALES_RETURN_STATUSES.OPEN]:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  [SALES_RETURN_STATUSES.IN_PROGRESS]:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  [SALES_RETURN_STATUSES.SETTLED]:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400",
  [SALES_RETURN_STATUSES.REJECTED]:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
  [SALES_RETURN_STATUSES.CANCELLED]:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-400",
};

/** وضعیت‌هایی که بعد از آن‌ها هیچ تصمیم تازه‌ای پذیرفته نمی‌شود. */
export const TERMINAL_RETURN_STATUSES = [
  SALES_RETURN_STATUSES.REJECTED,
  SALES_RETURN_STATUSES.CANCELLED,
];

export function isTerminalStatus(status) {
  return TERMINAL_RETURN_STATUSES.includes(status);
}
