import {
  PURCHASE_CLAIM_PROBLEMS,
  PURCHASE_ON_ORDER_CLAIM_PROBLEMS,
  PURCHASE_OFF_ORDER_CLAIM_PROBLEMS,
  problemLabels,
  problemStyles,
  problemSubset,
} from "@/shared/domain/returns/problems";
import { OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";

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

const labelsFor = (problems) =>
  Object.fromEntries(
    problems.map((problem) => [problem, PURCHASE_RETURN_PROBLEM_LABELS[problem]]),
  );

/** گزینه‌های «نوع مشکل» برای ادعای روی قلمِ سفارش در فرمِ ثبت. */
export const PURCHASE_ON_ORDER_PROBLEM_LABELS = labelsFor(PURCHASE_ON_ORDER_CLAIM_PROBLEMS);

/** گزینه‌های «نوع مشکل» برای ادعای خارج از سفارش در فرمِ ثبت. */
export const PURCHASE_OFF_ORDER_PROBLEM_LABELS = labelsFor(PURCHASE_OFF_ORDER_CLAIM_PROBLEMS);

export const PURCHASE_RETURN_PROBLEM_STYLES = problemStyles(
  PURCHASE_CLAIM_PROBLEMS,
);

// ─── دامنه‌ی ادعا ───────────────────────────────────────────────────────────

export const OFF_SCOPE_KIND_LABELS = {
  [OFF_SCOPE_KINDS.EXCESS]: "بیش از مقدار سفارش",
  [OFF_SCOPE_KINDS.UNLISTED]: "کالای خارج از سفارش",
};


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

// ─── سقف‌های ادعا از `GetPurchaseReceivingInfo` ─────────────────────────────

/**
 * سقف‌های ادعا و خریدِ مازاد روی `PurchaseReceivingInfoDto` — همان عددهایی
 * که سرور هنگامِ ثبت چک می‌کند (ادعاهای بازِ مرجوعی‌های دیگر کم شده‌اند).
 */

/** سقفِ ادعای روی سفارش برای یک قلم: رسیده − تسویه‌شده − ادعاهای باز. */
export const claimableQuantityOf = (item) => Number(item?.claimableQuantity) || 0;

/** مازادِ آزادِ قرنطینه روی یک قلم (منهای رزروِ ادعاهای باز). */
export const freeExcessQuantityOf = (item) => Number(item?.freeExcessQuantity) || 0;

/** کالای سفارش‌ندادهِ آزادِ قرنطینه (منهای رزروِ ادعاهای باز). */
export const freeUnlistedQuantityOf = (item) => Number(item?.freeQuantity) || 0;
