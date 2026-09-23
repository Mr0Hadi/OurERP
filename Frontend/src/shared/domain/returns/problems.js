/**
 * تنها فضای مقدارِ «مشکل» — مشترک بین مرجوعی فروش، مرجوعی خرید و گزارشِ
 * بازرسیِ انبار.
 *
 * هر سمت فقط یک *زیرمجموعه* از این فهرست دارد؛ هیچ‌کدام مقدارِ تازه
 * نمی‌سازد. تفاوت‌های زبانی («کسری تحویل» در خرید، «کمتر از فاکتور
 * ارسال شد» در فروش) با override برچسب در واژگانِ همان سمت حل می‌شود.
 * به همین دلیل داده بین این سه بدون هیچ ترجمه‌ای جابه‌جا می‌شود.
 *
 * عمداً بدون ایمپورت: برگِ درختِ دامنه است تا هر سه مصرف‌کننده بتوانند
 * بدون حلقه‌ی وابستگی از آن بخوانند.
 */

// بدون معادل یک‌به‌یک در بکند: PurchaseIssueTypeEnum (۷ عضو)،
// SalesReturnReasonEnum (۷ عضو) و SalesReturnIssueTypeEnum (۵ عضو) هر
// کدام enum بسته‌ی جدا هستند؛ این فهرست، فضای مقدارِ ترکیبی خودِ فرانت
// است که هر سه را زیرمجموعه می‌کند (SALES_CLAIM_PROBLEMS/
// PURCHASE_CLAIM_PROBLEMS/OBSERVED_PROBLEMS پایین همین فایل).
export const RETURN_PROBLEMS = {
  // نوع کالا
  WRONG_ITEM_SHIPPED: 0,
  WRONG_ITEM_INVOICED: 1,
  WRONG_ITEM_ORDERED: 2,
  // تعداد
  SHORT_SHIPPED: 3,
  OVER_SHIPPED: 4,
  WRONG_QTY_INVOICED: 5,
  WRONG_QTY_ORDERED: 6,
  // خرابی
  DEFECTIVE: 7,
  DAMAGED_IN_TRANSIT: 8,
  QUALITY_ISSUE: 9,
  EXPIRED: 10,
  // بدون نقص
  CHANGED_MIND: 11,
  // خارج از سند
  UNLISTED_ITEM: 12,
  // سایر
  OTHER: 13,
};

/** برچسبِ خنثی — هر سمت می‌تواند برای واژگانِ خودش بازنویسی‌اش کند. */
export const RETURN_PROBLEM_LABELS = {
  [RETURN_PROBLEMS.WRONG_ITEM_SHIPPED]: "ارسال کالای اشتباه",
  [RETURN_PROBLEMS.WRONG_ITEM_INVOICED]: "کالا در فاکتور اشتباه ثبت شد",
  [RETURN_PROBLEMS.WRONG_ITEM_ORDERED]: "کالا اشتباه سفارش داده شد",
  [RETURN_PROBLEMS.SHORT_SHIPPED]: "کسری تحویل",
  [RETURN_PROBLEMS.OVER_SHIPPED]: "بیشتر از سند ارسال شد",
  [RETURN_PROBLEMS.WRONG_QTY_INVOICED]: "تعداد در فاکتور اشتباه ثبت شد",
  [RETURN_PROBLEMS.WRONG_QTY_ORDERED]: "تعداد اشتباه سفارش داده شد",
  [RETURN_PROBLEMS.DEFECTIVE]: "کالای معیوب / خراب",
  [RETURN_PROBLEMS.DAMAGED_IN_TRANSIT]: "آسیب‌دیده در حمل",
  [RETURN_PROBLEMS.QUALITY_ISSUE]: "مغایرت کیفیت / مشخصات",
  [RETURN_PROBLEMS.EXPIRED]: "تاریخ گذشته",
  [RETURN_PROBLEMS.CHANGED_MIND]: "انصراف / پشیمانی",
  [RETURN_PROBLEMS.UNLISTED_ITEM]: "کالای خارج از سند",
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
  [RETURN_PROBLEMS.UNLISTED_ITEM]:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-400",
  [RETURN_PROBLEMS.OTHER]: "bg-muted text-muted-foreground border-border",
};

// ─── زیرمجموعه‌ی هر سمت ─────────────────────────────────────────────────────

/**
 * مشکل‌هایی که واحد فروش از مشتری می‌شنود.
 *
 * تفکیک «انبار اشتباه فرستاد» از «فروش اشتباه ثبت کرد» از «مشتری
 * اشتباه سفارش داد» عمدی است: هر سه از بیرون یک شکل دارند ولی مقصرشان
 * فرق می‌کند و گزارش باید از هم تشخیصشان بدهد.
 */
export const SALES_CLAIM_PROBLEMS = [
  RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
  RETURN_PROBLEMS.WRONG_ITEM_INVOICED,
  RETURN_PROBLEMS.WRONG_ITEM_ORDERED,
  RETURN_PROBLEMS.SHORT_SHIPPED,
  RETURN_PROBLEMS.OVER_SHIPPED,
  RETURN_PROBLEMS.WRONG_QTY_INVOICED,
  RETURN_PROBLEMS.WRONG_QTY_ORDERED,
  RETURN_PROBLEMS.DEFECTIVE,
  RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
  RETURN_PROBLEMS.QUALITY_ISSUE,
  RETURN_PROBLEMS.EXPIRED,
  RETURN_PROBLEMS.CHANGED_MIND,
  RETURN_PROBLEMS.UNLISTED_ITEM,
  RETURN_PROBLEMS.OTHER,
];

/**
 * مشکل‌هایی که واحد خرید روی تامین‌کننده ثبت می‌کند — برای *نمایش*
 * (برچسبِ ادعاهای موجود، فیلترِ لیست).
 *
 * «کسری تحویل» و «تعداد در فاکتور اشتباه» اینجا برای ادعاهای قدیمی
 * مانده‌اند ولی دیگر قابل انتخاب نیستند — `PURCHASE_ON_ORDER_CLAIM_PROBLEMS`
 * و `PURCHASE_OFF_ORDER_CLAIM_PROBLEMS` را ببینید.
 */
export const PURCHASE_CLAIM_PROBLEMS = [
  RETURN_PROBLEMS.SHORT_SHIPPED,
  RETURN_PROBLEMS.DEFECTIVE,
  RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
  RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
  RETURN_PROBLEMS.WRONG_QTY_INVOICED,
  RETURN_PROBLEMS.EXPIRED,
  RETURN_PROBLEMS.QUALITY_ISSUE,
  RETURN_PROBLEMS.OVER_SHIPPED,
  RETURN_PROBLEMS.UNLISTED_ITEM,
  RETURN_PROBLEMS.OTHER,
];

/**
 * مشکل‌های قابل انتخاب برای ادعای *روی قلمِ سفارش* — یعنی روی کالایی که
 * رسیده و سهمِ همان سفارش است. پس فقط چیزی که روی خودِ کالا دیده می‌شود:
 *
 *  - «کسری» و «تعداد در فاکتور اشتباه» اینجا نیستند: مشکلِ مقدار است نه
 *    کالا، و ادعا روی دانه‌های سالمِ رسیده می‌نشست. کسری یا با محموله‌ی
 *    بعد می‌رسد یا قلمش در صفحه‌ی خرید بسته می‌شود؛ فاکتورِ اشتباه با
 *    ویرایشِ اقلامِ خرید اصلاح می‌شود.
 *  - «بیش از سفارش» و «کالای سفارش‌نداده» مالِ ادعای خارج از سفارش‌اند.
 */
export const PURCHASE_ON_ORDER_CLAIM_PROBLEMS = [
  RETURN_PROBLEMS.DEFECTIVE,
  RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
  RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
  RETURN_PROBLEMS.EXPIRED,
  RETURN_PROBLEMS.QUALITY_ISSUE,
  RETURN_PROBLEMS.OTHER,
];

/**
 * مشکل‌های قابل انتخاب برای ادعای *خارج از سفارش* (مازاد / سفارش‌نداده).
 * پیش‌فرضشان «بیش از سفارش» / «سفارش‌نداده» است، ولی کالای اضافه هم
 * ممکن است خراب رسیده باشد.
 */
export const PURCHASE_OFF_ORDER_CLAIM_PROBLEMS = [
  RETURN_PROBLEMS.OVER_SHIPPED,
  RETURN_PROBLEMS.UNLISTED_ITEM,
  RETURN_PROBLEMS.DEFECTIVE,
  RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
  RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
  RETURN_PROBLEMS.EXPIRED,
  RETURN_PROBLEMS.QUALITY_ISSUE,
  RETURN_PROBLEMS.OTHER,
];

/**
 * چیزی که انباردار *هنگام تحویل‌گرفتن* روی کالای رسیده می‌بیند — مستقل
 * از آنچه طرف حساب ادعا کرده. مشکل‌هایی مثل «انصراف مشتری» یا «تعداد در
 * فاکتور اشتباه ثبت شد» اینجا نیستند چون با نگاه‌کردن به کالا قابل
 * مشاهده نیستند.
 *
 * «کسری» هم عمداً نیست: هر مشاهده بخشی از مقدارِ *رسیده* است و سرور آن
 * را دانه‌ی رسیده‌ی مشکل‌دار حساب می‌کند (قرنطینه، دریافت‌شده و پرداخت‌شده).
 * کالایی که نرسیده با واردکردنِ مقدارِ رسیده‌ی کمتر ثبت می‌شود.
 */
export const OBSERVED_PROBLEMS = [
  RETURN_PROBLEMS.DEFECTIVE,
  RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
  RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
  RETURN_PROBLEMS.EXPIRED,
  RETURN_PROBLEMS.QUALITY_ISSUE,
  RETURN_PROBLEMS.OTHER,
];

// ─── ابزار ──────────────────────────────────────────────────────────────────

/** یک شیءِ enum-مانند از زیرمجموعه می‌سازد تا `X.DEFECTIVE` کار کند. */
export function problemSubset(values) {
  const byValue = Object.fromEntries(
    Object.entries(RETURN_PROBLEMS).map(([key, value]) => [value, key]),
  );
  return Object.fromEntries(values.map((value) => [byValue[value], value]));
}

/** نقشه‌ی برچسب برای یک زیرمجموعه، با امکان بازنویسیِ واژگانِ هر سمت. */
export function problemLabels(values, overrides = {}) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      overrides[value] ?? RETURN_PROBLEM_LABELS[value] ?? value,
    ]),
  );
}

/** نقشه‌ی استایل برای یک زیرمجموعه. */
export function problemStyles(values, overrides = {}) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      overrides[value] ?? RETURN_PROBLEM_STYLES[value] ?? "",
    ]),
  );
}
