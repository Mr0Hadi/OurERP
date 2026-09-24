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
 * واژگانِ مرجوعی فروش — فقط چیزهایی که واقعاً *مخصوصِ فروش*اند.
 *
 * مقدارها، جهت‌ها، وضعیت‌ها و دامنه‌ها همگی در `shared/domain/returns`
 * تعریف شده‌اند و هر مصرف‌کننده باید مستقیم از همان‌جا بخواند. این
 * ماژول آن‌ها را دوباره صادر نمی‌کند: نامِ تازه دادن به یک مقدارِ
 * یکسان (`RETURN_STATUSES` → `SALES_RETURN_STATUSES`) فقط یک لایه‌ی
 * ترجمه‌ی بی‌خاصیت می‌سازد که خواننده را وادار می‌کند دو فایل را
 * کنار هم بگذارد تا بفهمد دو اسم یک چیزند.
 *
 * آنچه اینجا می‌ماند فقط *واژه* است: کدام زیرمجموعه از مشکل‌ها به کار
 * فروش می‌آید، و هر مفهوم را در زبانِ فروش چه می‌نامیم.
 */

// ─── مشکل ───────────────────────────────────────────────────────────────────

/**
 * مشکلِ دقیق — همان چیزی که واحد فروش از مشتری می‌شنود.
 *
 * زیرمجموعه‌ای از فضای مشترکِ `shared/domain/returns/problems.js`؛
 * مقدارها هرگز اینجا ساخته نمی‌شوند تا گزارش انبار و ادعای خرید و
 * ادعای فروش همه روی یک فضای مقدار بنشینند.
 */
export const SALES_RETURN_PROBLEMS = problemSubset(SALES_CLAIM_PROBLEMS);

export const SALES_RETURN_PROBLEM_LABELS = problemLabels(SALES_CLAIM_PROBLEMS, {
  [SALES_RETURN_PROBLEMS.WRONG_ITEM_SHIPPED]: "انبار کالای اشتباه فرستاد",
  [SALES_RETURN_PROBLEMS.WRONG_ITEM_ORDERED]: "مشتری کالا را اشتباه سفارش داد",
  [SALES_RETURN_PROBLEMS.SHORT_SHIPPED]: "کمتر از فاکتور ارسال شد",
  [SALES_RETURN_PROBLEMS.OVER_SHIPPED]: "بیشتر از فاکتور ارسال شد",
  [SALES_RETURN_PROBLEMS.WRONG_QTY_ORDERED]: "مشتری تعداد را اشتباه سفارش داد",
  [SALES_RETURN_PROBLEMS.CHANGED_MIND]: "انصراف / پشیمانی مشتری",
});

export const SALES_RETURN_PROBLEM_STYLES = problemStyles(SALES_CLAIM_PROBLEMS);

const OFF_ORDER_ONLY = [
  SALES_RETURN_PROBLEMS.OVER_SHIPPED,
  SALES_RETURN_PROBLEMS.UNLISTED_ITEM,
];

/**
 * گزینه‌های «نوع مشکل» برای ادعای روی قلمِ فاکتور — همه جز «بیشتر از
 * فاکتور» و «کالای خارج از فاکتور» که مالِ ادعای خارج از فاکتورند.
 * («کمتر از فاکتور» اینجا می‌ماند: برخلافِ خرید، ادعای مشتری روی دانه‌هایی
 * است که ما ارسال‌شده ثبت کرده‌ایم و او می‌گوید نرسیده.)
 */
export const SALES_ON_ORDER_PROBLEM_LABELS = Object.fromEntries(
  Object.entries(SALES_RETURN_PROBLEM_LABELS).filter(
    ([value]) => !OFF_ORDER_ONLY.includes(Number(value)),
  ),
);

/** گزینه‌های «نوع مشکل» برای ادعای خارج از فاکتور. */
export const SALES_OFF_ORDER_PROBLEM_LABELS = Object.fromEntries(
  Object.entries(SALES_RETURN_PROBLEM_LABELS).filter(
    ([value]) =>
      OFF_ORDER_ONLY.includes(Number(value)) ||
      [
        SALES_RETURN_PROBLEMS.WRONG_ITEM_SHIPPED,
        SALES_RETURN_PROBLEMS.DEFECTIVE,
        SALES_RETURN_PROBLEMS.DAMAGED_IN_TRANSIT,
        SALES_RETURN_PROBLEMS.OTHER,
      ].includes(Number(value)),
  ),
);

// ─── دامنه‌ی ادعا ───────────────────────────────────────────────────────────

/**
 * ادعا یا روی یک خط فاکتور می‌نشیند (و سقفش مقداری است که واقعاً به
 * مشتری ارسال شده)، یا اصلاً بیرون از فاکتور است.
 *
 * قرینه‌ی «مازاد» در مرجوعی خرید. بدون این، خطای انباردار در ارسالِ
 * کالای اضافه یا کالایی که در فاکتور نیست، هیچ راه ثبتی ندارد.
 *
 * برخلاف خرید، اینجا کالای «ناشناس» نداریم: هرچه دست مشتری است از
 * انبار ما بیرون رفته، پس همیشه یک productId واقعی دارد.
 */
export const CLAIM_SCOPE_LABELS = {
  [CLAIM_SCOPES.ON_ORDER]: "روی فاکتور",
  [CLAIM_SCOPES.OFF_ORDER]: "خارج از فاکتور",
};

export const OFF_SCOPE_KIND_LABELS = {
  [OFF_SCOPE_KINDS.EXCESS]: "بیش از مقدار ارسال‌شده",
  [OFF_SCOPE_KINDS.UNLISTED]: "کالای خارج از فاکتور",
};

// ─── وضعیت ──────────────────────────────────────────────────────────────────

/** خودِ وضعیت‌ها مشترک‌اند (`shared/domain/returns/statuses.js`)؛ فقط برچسبشان سمت‌به‌سمت فرق می‌کند. */
export const SALES_RETURN_STATUS_LABELS =
  SIDE_CONFIG[RETURN_SIDES.SALES].statusLabels;
