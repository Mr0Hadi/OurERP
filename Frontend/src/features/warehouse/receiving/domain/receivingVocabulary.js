import {
  PurchaseStatusEnum,
  PURCHASE_STATUS_LABELS,
} from "@/shared/domain/enums/purchaseStatus";

/**
 * واژگانِ دریافت انبار — نام‌گذاری، بدون هیچ محاسبه‌ای.
 *
 * جدا از لایه‌ی سرویس نگه داشته می‌شود چون کامپوننت‌های جدول باید بتوانند
 * بدونِ وابستگی به پیاده‌سازیِ API از آن بخوانند.
 *
 * «نوعِ مشکل» اینجا نیست: `ReceivePurchaseCommand` هیچ فیلدی برای آن
 * ندارد و مشاهده‌ی انباردار فقط روی دورِ کالای مرجوعی معنا دارد —
 * `shared/domain/returns/observations.js`.
 */

/**
 * خریدی که کالایش هنوز کامل به انبار نرسیده. «تحویل ناقص» هم می‌ماند
 * چون باقیمانده با محموله‌ی بعدی می‌آید و `ReceivePurchase` چند دور
 * پشتِ‌سرِهم را می‌پذیرد.
 *
 * `GetPurchaseListQuery` فقط یک `status` می‌گیرد (نه چند مقدار)، پس صف
 * همیشه روی یکی از این دو وضعیت است و کاربر با فیلترِ وضعیت بینشان
 * جابه‌جا می‌شود.
 */
export const RECEIVING_ELIGIBLE_STATUSES = [
  PurchaseStatusEnum.SHIPPED,
  PurchaseStatusEnum.PARTIALLY_RECEIVED,
  // کامل‌رسیده هم در فیلتر هست: مازادِ دیرتر رسیده یا کالای جایگزینِ
  // مرجوعی روی خریدی ثبت می‌شود که از قبل «دریافت‌شده» است.
  PurchaseStatusEnum.RECEIVED,
];

export const RECEIVING_STATUS_OPTIONS = RECEIVING_ELIGIBLE_STATUSES.map(
  (status) => ({ value: status, label: PURCHASE_STATUS_LABELS[status] }),
);
