import { SaleStatusEnum as SALE_STATUSES } from "@/shared/domain/enums/saleStatus";

/**
 * واژگانِ ارسال انبار — قرینه‌ی receivingVocabulary.
 *
 * دلیل جدابودنش از services همان است: این‌ها به بکند مهاجرت نمی‌کنند و
 * UI باید بتواند بدون وابستگی به پیاده‌سازیِ API از آن‌ها استفاده کند.
 */

// ─── منبعِ هر خطِ یک حواله ──────────────────────────────────────────────────

/**
 * یک ماشینی که از انبار بیرون می‌رود می‌تواند هم‌زمان کالای خودِ فروش
 * را ببرد و هم کالای جایگزینی که بابت یک مرجوعی به مشتری بدهکاریم.
 * یک ماشین، یک حواله.
 */
// بدون معادل مستند در بکند فعلاً — قرینه‌ی RECEIVING_SOURCES و با همان
// شماره‌گذاری، تا اگر روزی به سرور مهاجرت کرد دو سمت واگرا نشوند.
export const SHIPPING_SOURCES = {
  ORDER: 0,
  RETURN: 1,
};

export const SHIPPING_SOURCE_LABELS = {
  [SHIPPING_SOURCES.ORDER]: "اقلام فروش",
  [SHIPPING_SOURCES.RETURN]: "اقلام مرجوعی",
};

// ─── نوعِ هر ردیفِ صف ارسال ─────────────────────────────────────────────────

/**
 * صف ارسال فقط رو به مشتری نیست: عودت مازاد به سمت تامین‌کننده می‌رود.
 * کالای جایگزینِ مشتری نوعِ خودش را ندارد چون همیشه با حواله‌ی همان
 * فروش می‌رود.
 */
export const OUTGOING_TYPES = {
  SALE: 0,
  RETURN_TO_SUPPLIER: 1,
};

export const OUTGOING_TYPE_LABELS = {
  [OUTGOING_TYPES.SALE]: "ارسال فروش",
  [OUTGOING_TYPES.RETURN_TO_SUPPLIER]: "عودت کالا به تامین‌کننده",
};

// ─── واجد شرایطِ صف ─────────────────────────────────────────────────────────

/**
 * فروش‌هایی که تأیید شده‌اند ولی هنوز به‌طور کامل تحویل مشتری نشده‌اند.
 * «تحویل ناقص» هم می‌ماند چون باقیمانده با محموله‌ی بعدی می‌رود.
 */
export const SHIPPING_ELIGIBLE_STATUSES = [
  SALE_STATUSES.PROCESSING,
  SALE_STATUSES.PARTIALLY_DELIVERED,
];
