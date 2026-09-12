import {
  SaleStatusEnum,
  SALE_STATUS_LABELS,
} from "@/shared/domain/enums/saleStatus";

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
];

export const SHIPPING_STATUS_OPTIONS = SHIPPING_ELIGIBLE_STATUSES.map(
  (status) => ({ value: status, label: SALE_STATUS_LABELS[status] }),
);
