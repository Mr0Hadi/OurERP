import {
  SaleStatusEnum,
  SALE_STATUS_LABELS,
} from "@/shared/domain/enums/saleStatus";
import { QUEUE_FILTER } from "../../shared/queueFilters";

/**
 * واژگانِ ارسال انبار — قرینه‌ی `receivingVocabulary`.
 *
 * فروشی که تأیید شده ولی هنوز کامل تحویل مشتری نشده. «ارسال ناقص» هم
 * می‌ماند چون باقیمانده با محموله‌ی بعدی می‌رود و `ShipSale` چند دور
 * پشتِ‌سرِهم را می‌پذیرد.
 *
 * `GetSaleListQuery` فقط یک `status` می‌گیرد، پس صف همیشه روی یکی از
 * این دو وضعیت است و کاربر با فیلترِ وضعیت بینشان جابه‌جا می‌شود.
 */
export const SHIPPING_ELIGIBLE_STATUSES = [
  SaleStatusEnum.PROCESSING,
  SaleStatusEnum.PARTIALLY_DELIVERED,
  // کامل‌ارسال‌شده هم در فیلتر هست: مازادِ دیرتر کشف‌شده یا کالای
  // جایگزینِ مرجوعی روی فروشی ثبت می‌شود که از قبل ارسال/تحویل شده.
  SaleStatusEnum.SHIPPED,
  SaleStatusEnum.DELIVERED,
];

/**
 * ثبتِ «مازادِ ارسال‌شده» فقط وقتی معنا دارد که دست‌کم یک محموله رفته باشد:
 * خطا بعد از ارسال کشف می‌شود. فروشی که هنوز در آماده‌سازی است، مازاد ندارد.
 */
export const EXCESS_ALLOWED_STATUSES = [
  SaleStatusEnum.PARTIALLY_DELIVERED,
  SaleStatusEnum.SHIPPED,
  SaleStatusEnum.DELIVERED,
];

export const isExcessAllowedFor = (status) =>
  EXCESS_ALLOWED_STATUSES.includes(Number(status));

/**
 * پیش‌فرضِ صف: هر فروشی که هنوز چیزی از آن باید ارسال شود — «آماده‌سازی
 * انبار» و «ارسال ناقص» با هم. بدونِ این، فروشی که محموله‌ی اولش رفته از صفِ
 * پیش‌فرض بیرون می‌افتاد (قرینه‌ی `RECEIVING_AWAITING` در دریافت).
 */
export const SHIPPING_AWAITING = QUEUE_FILTER.AWAITING;

export const SHIPPING_AWAITING_STATUSES = [
  SaleStatusEnum.PROCESSING,
  SaleStatusEnum.PARTIALLY_DELIVERED,
];

export const SHIPPING_STATUS_OPTIONS = [
  { value: SHIPPING_AWAITING, label: "در انتظار ارسال (آماده‌سازی و ناقص)" },
  ...SHIPPING_ELIGIBLE_STATUSES.map((status) => ({
    value: status,
    label: SALE_STATUS_LABELS[status],
  })),
  { value: QUEUE_FILTER.RETURNS, label: "مرجوعی: عودت به تامین‌کننده" },
  { value: QUEUE_FILTER.REPLACEMENTS, label: "مرجوعی: جایگزین برای مشتری" },
];

/** مقدارِ فیلترِ وضعیت → فهرستِ وضعیت‌هایی که صف نشان می‌دهد. */
export function shippingStatusesOf(filterValue) {
  if (filterValue === SHIPPING_AWAITING || filterValue === "" || filterValue == null) {
    return SHIPPING_AWAITING_STATUSES;
  }
  return [Number(filterValue)];
}
