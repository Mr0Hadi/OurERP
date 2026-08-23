// src/features/purchases/returns/domain/purchaseReturnVocabulary.js

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
 * واژگانِ مخصوصِ مرجوعی خرید.
 *
 * قرینه‌ی returnVocabulary در مرجوعی فروش: فقط *نام‌گذاری* می‌کند و
 * دو محور دارد —
 *
 *   ۱. مشکل چیست؟   → PURCHASE_RETURN_PROBLEMS
 *   ۲. دامنه کجاست؟ → CLAIM_SCOPES (روی سفارش یا بیرون از آن)
 *
 * تصمیم اینجا نیست؛ تصمیم ترکیبی از اثرهاست و جای آن دامنه‌ی مشترک
 * است (shared/domain/returns).
 */

// ─── محور ۱: مشکل ───────────────────────────────────────────────────────────

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

// ─── محور ۲: دامنه‌ی ادعا ───────────────────────────────────────────────────

/**
 * ادعا یا روی یک خط سفارش می‌نشیند (سقفش مقدار سفارش‌شده)، یا بیرون
 * از سفارش است — کالایی که تامین‌کننده فرستاده ولی سفارش توجیهش
 * نمی‌کند.
 *
 * مقدارها از دامنه‌ی مشترک می‌آیند (scopes.js)؛ فقط برچسب‌ها به زبان
 * خرید نوشته شده‌اند.
 */
export {
  CLAIM_SCOPES,
  OFF_SCOPE_KINDS as OFF_ORDER_KINDS,
  OFF_SCOPE_KIND_STYLES as OFF_ORDER_KIND_STYLES,
  isOffScope as isOffOrder,
} from "@/shared/domain/returns/scopes";

export const CLAIM_SCOPE_LABELS = {
  [CLAIM_SCOPES.ON_ORDER]: "روی سفارش",
  [CLAIM_SCOPES.OFF_ORDER]: "خارج از سفارش",
};

export const OFF_ORDER_KIND_LABELS = {
  [OFF_SCOPE_KINDS.EXCESS]: "بیش از مقدار سفارش",
  [OFF_SCOPE_KINDS.UNLISTED]: "کالای خارج از سفارش",
};

// ─── وضعیت ──────────────────────────────────────────────────────────────────

export {
  RETURN_STATUSES as PURCHASE_RETURN_STATUSES,
  RETURN_STATUS_STYLES as PURCHASE_RETURN_STATUS_STYLES,
  isTerminalStatus,
} from "@/shared/domain/returns/statuses";

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
 * اینجاست نه در api-mockData، چون صفحه‌ی جزئیات خرید هم برای فعال‌کردن
 * دکمه‌ی مرجوعی به آن نیاز دارد و نباید به پیاده‌سازیِ mock وصل باشد.
 */
export function hasAnythingArrived(purchase) {
  return (purchase.items || []).some((item) => (item.receivedQty || 0) > 0);
}
