import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";

/**
 * واژگانِ دریافت انبار — نام‌گذاری، بدون هیچ محاسبه‌ای.
 *
 * این‌ها قبلاً داخل فایل‌های api-mock بودند و کامپوننت‌های جدول
 * مستقیم از آن‌ها import می‌کردند. یعنی UI به *پیاده‌سازی mock* وابسته
 * بود و روز مهاجرت به بکند، با رفتنِ آن فایل‌ها می‌شکست. واژگان به
 * سرور مهاجرت نمی‌کند؛ پس جایش اینجاست و دست‌نخورده می‌ماند.
 */

// ─── منبعِ هر خطِ یک رسید ───────────────────────────────────────────────────

/**
 * یک محموله‌ی فیزیکی می‌تواند هم‌زمان چند چیز بیاورد: بخشی از خودِ
 * سفارش، و کالای جایگزینی که طرف حساب بابت یک مرجوعی بدهکار است.
 * تامین‌کننده‌ای که خرید را دو سری می‌فرستد ممکن است جایگزین‌های
 * مرجوعیِ سری اول را با ماشین دوم بفرستد — یک ماشین، یک رسید.
 */
export const RECEIVING_SOURCES = {
  ORDER: "order",
  RETURN: "return",
};

export const RECEIVING_SOURCE_LABELS = {
  [RECEIVING_SOURCES.ORDER]: "اقلام سفارش",
  [RECEIVING_SOURCES.RETURN]: "اقلام مرجوعی",
};

// ─── نوعِ هر ردیفِ صف دریافت ────────────────────────────────────────────────

export const INCOMING_TYPES = {
  PURCHASE: "purchase",
  SALES_RETURN: "sales_return",
};

export const INCOMING_TYPE_LABELS = {
  [INCOMING_TYPES.PURCHASE]: "خرید",
  [INCOMING_TYPES.SALES_RETURN]: "مرجوعی فروش",
};

// ─── واجد شرایطِ صف ─────────────────────────────────────────────────────────

/**
 * فقط خریدهای «ارسال شده» به‌خودیِ‌خود در صف انباردار دیده می‌شوند.
 *
 * تنها تعریفِ این فهرست. پیش‌تر سه نسخه‌ی جدا داشت (constants.js،
 * incomingQueueApi.js، api-mockData.js) که تصادفاً هم‌مقدار بودند.
 */
export const RECEIVING_ELIGIBLE_STATUSES = [PURCHASE_STATUSES.SHIPPED];
