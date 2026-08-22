// src/features/purchases/returns/domain/purchaseReturnVocabulary.js

import { RETURN_SIDES, SIDE_CONFIG } from "@/shared/domain/returns/sides";

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
 * برخلاف نسخه‌ی قبلی، این فهرست دیگر به دو خانواده‌ی «کسری» و «مازاد»
 * تقسیم نشده و هیچ تصمیمی را محدود نمی‌کند. تقسیم‌بندیِ واقعی روی
 * *دامنه‌ی* ادعاست (روی سفارش / خارج از سفارش)، و تصمیم‌ها از آن هم
 * مستقل‌اند — چون هر ترکیبی از کالا و پول برای هر مشکلی ممکن است.
 */
export const PURCHASE_RETURN_PROBLEMS = {
  SHORTAGE: "shortage",
  DEFECTIVE: "defective",
  DAMAGED: "damaged",
  WRONG_ITEM: "wrong_item",
  EXPIRED: "expired",
  QUALITY_ISSUE: "quality_issue",
  OVER_DELIVERED: "over_delivered",
  UNORDERED_ITEM: "unordered_item",
  OTHER: "other",
};

export const PURCHASE_RETURN_PROBLEM_LABELS = {
  [PURCHASE_RETURN_PROBLEMS.SHORTAGE]: "کسری تحویل",
  [PURCHASE_RETURN_PROBLEMS.DEFECTIVE]: "کالای معیوب / خراب",
  [PURCHASE_RETURN_PROBLEMS.DAMAGED]: "آسیب‌دیده در حمل",
  [PURCHASE_RETURN_PROBLEMS.WRONG_ITEM]: "ارسال کالای اشتباه",
  [PURCHASE_RETURN_PROBLEMS.EXPIRED]: "تاریخ گذشته",
  [PURCHASE_RETURN_PROBLEMS.QUALITY_ISSUE]: "مغایرت کیفیت / مشخصات",
  [PURCHASE_RETURN_PROBLEMS.OVER_DELIVERED]: "بیشتر از سفارش ارسال شد",
  [PURCHASE_RETURN_PROBLEMS.UNORDERED_ITEM]: "کالای سفارش‌نداده",
  [PURCHASE_RETURN_PROBLEMS.OTHER]: "سایر موارد",
};

export const PURCHASE_RETURN_PROBLEM_STYLES = {
  [PURCHASE_RETURN_PROBLEMS.SHORTAGE]:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  [PURCHASE_RETURN_PROBLEMS.DEFECTIVE]:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
  [PURCHASE_RETURN_PROBLEMS.DAMAGED]:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400",
  [PURCHASE_RETURN_PROBLEMS.WRONG_ITEM]:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  [PURCHASE_RETURN_PROBLEMS.EXPIRED]:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400",
  [PURCHASE_RETURN_PROBLEMS.QUALITY_ISSUE]:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
  [PURCHASE_RETURN_PROBLEMS.OVER_DELIVERED]:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
  [PURCHASE_RETURN_PROBLEMS.UNORDERED_ITEM]:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-400",
  [PURCHASE_RETURN_PROBLEMS.OTHER]: "bg-muted text-muted-foreground border-border",
};

// ─── محور ۲: دامنه‌ی ادعا ───────────────────────────────────────────────────

/**
 * ادعا یا روی یک خط سفارش می‌نشیند (سقفش مقدار سفارش‌شده)، یا بیرون
 * از سفارش است — کالایی که تامین‌کننده فرستاده ولی سفارش توجیهش
 * نمی‌کند. همان تقسیم‌بندیِ «مازاد» قبلی، با این تفاوت که دیگر
 * تصمیم‌های مجاز را محدود نمی‌کند.
 */
export const CLAIM_SCOPES = {
  ON_ORDER: "on_order",
  OFF_ORDER: "off_order",
};

export const CLAIM_SCOPE_LABELS = {
  [CLAIM_SCOPES.ON_ORDER]: "روی سفارش",
  [CLAIM_SCOPES.OFF_ORDER]: "خارج از سفارش",
};

export const OFF_ORDER_KINDS = {
  EXCESS: "excess",
  UNLISTED: "unlisted",
};

export const OFF_ORDER_KIND_LABELS = {
  [OFF_ORDER_KINDS.EXCESS]: "بیش از مقدار سفارش",
  [OFF_ORDER_KINDS.UNLISTED]: "کالای خارج از سفارش",
};

export function isOffOrder(claim) {
  return claim?.scope === CLAIM_SCOPES.OFF_ORDER;
}

// ─── وضعیت ──────────────────────────────────────────────────────────────────

export {
  RETURN_STATUSES as PURCHASE_RETURN_STATUSES,
  RETURN_STATUS_STYLES as PURCHASE_RETURN_STATUS_STYLES,
  isTerminalStatus,
} from "@/shared/domain/returns/statuses";

export const PURCHASE_RETURN_STATUS_LABELS =
  SIDE_CONFIG[RETURN_SIDES.PURCHASE].statusLabels;
