import { RETURN_SIDES, SIDE_CONFIG } from "@/shared/domain/returns/sides";
import {
  PURCHASE_CLAIM_PROBLEMS,
  problemLabels,
  problemStyles,
  problemSubset,
} from "@/shared/domain/returns/problems";
import {
  CLAIM_SCOPES,
  OFF_SCOPE_KINDS,
} from "@/shared/domain/returns/scopes";

/**
 * واژگانِ مرجوعی خرید — قرینه‌ی `salesReturnVocabulary`.
 *
 * مثل سمت فروش، مقدارها/وضعیت‌ها/دامنه‌ها از `shared/domain/returns`
 * می‌آیند و اینجا دوباره صادر نمی‌شوند؛ فقط *واژه*ی خرید می‌ماند.
 */

// ─── مشکل ───────────────────────────────────────────────────────────────────

/**
 * مشکلِ دقیقی که واحد خرید ثبت می‌کند.
 *
 * مقادیر از فضای مشترکِ `shared/domain/returns/problems.js` می‌آیند —
 * همان فضایی که ادعای فروش و گزارش بازرسیِ انبار هم روی آن می‌نشینند.
 * پیش از این، خرید فهرست مقدارهای خودش را داشت (`shortage`, `damaged`,
 * `wrong_item`, ...) که با معادل‌های سمت فروش هم‌معنا ولی نامساوی
 * بودند؛ نتیجه‌اش ترجمه‌ی دستی در هر مرزِ داده بود.
 *
 * این فهرست به دو خانواده‌ی «کسری» و «مازاد» تقسیم نشده و هیچ تصمیمی
 * را محدود نمی‌کند. تقسیم‌بندیِ واقعی روی *دامنه‌ی* ادعاست (روی سفارش /
 * خارج از سفارش)، و تصمیم‌ها از آن هم مستقل‌اند.
 */
export const PURCHASE_RETURN_PROBLEMS = problemSubset(PURCHASE_CLAIM_PROBLEMS);

export const PURCHASE_RETURN_PROBLEM_LABELS = problemLabels(
  PURCHASE_CLAIM_PROBLEMS,
  {
    [PURCHASE_RETURN_PROBLEMS.OVER_SHIPPED]: "بیشتر از سفارش ارسال شد",
    [PURCHASE_RETURN_PROBLEMS.UNLISTED_ITEM]: "کالای سفارش‌نداده",
  },
);

export const PURCHASE_RETURN_PROBLEM_STYLES = problemStyles(
  PURCHASE_CLAIM_PROBLEMS,
);

// ─── دامنه‌ی ادعا ───────────────────────────────────────────────────────────

/**
 * ادعا یا روی یک خط سفارش می‌نشیند (سقفش مقدار سفارش‌شده)، یا بیرون
 * از سفارش است — کالایی که تامین‌کننده فرستاده ولی سفارش توجیهش
 * نمی‌کند.
 */
export const CLAIM_SCOPE_LABELS = {
  [CLAIM_SCOPES.ON_ORDER]: "روی سفارش",
  [CLAIM_SCOPES.OFF_ORDER]: "خارج از سفارش",
};

export const OFF_SCOPE_KIND_LABELS = {
  [OFF_SCOPE_KINDS.EXCESS]: "بیش از مقدار سفارش",
  [OFF_SCOPE_KINDS.UNLISTED]: "کالای خارج از سفارش",
};

// ─── وضعیت ──────────────────────────────────────────────────────────────────

/** خودِ وضعیت‌ها مشترک‌اند (`shared/domain/returns/statuses.js`)؛ فقط برچسبشان سمت‌به‌سمت فرق می‌کند. */
export const PURCHASE_RETURN_STATUS_LABELS =
  SIDE_CONFIG[RETURN_SIDES.PURCHASE].statusLabels;

// ─── واجد شرایط بودنِ یک خرید برای ادعا ─────────────────────────────────────

/**
 * آیا چیزی از این خرید واقعاً رسیده؟
 *
 * معیار، *کالای رسیده* است نه وضعیت خرید. خریدی که نیمی از آن با ماشین
 * اول رسیده هنوز وضعیتش «ارسال‌شده» است، ولی همان نیمه ممکن است معیوب
 * باشد و باید بشود همان‌جا مرجوعی زد — منتظر ماشین دوم ماندن یعنی ادعا
 * را عقب انداختن.
 *
 * در لایه‌ی دامنه است نه در سرویس، چون صفحه‌ی جزئیات خرید هم برای
 * فعال‌کردنِ دکمه‌ی مرجوعی به همین قاعده نیاز دارد.
 */
export function hasAnythingArrived(purchase) {
  return (purchase.items || []).some((item) => (item.receivedQuantity || 0) > 0);
}
