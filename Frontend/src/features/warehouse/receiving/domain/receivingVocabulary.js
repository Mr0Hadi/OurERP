import {
  PurchaseStatusEnum,
  PURCHASE_STATUS_LABELS,
} from "@/shared/domain/enums/purchaseStatus";
import { QUEUE_FILTER } from "../../shared/queueFilters";

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
 * صف با `statuses` چند وضعیت را با هم می‌خواهد
 * (`Backend-Net/docs/purchase-frontend-sync-requests.fa.md` بند ۱۲).
 */
export const RECEIVING_ELIGIBLE_STATUSES = [
  PurchaseStatusEnum.SHIPPED,
  PurchaseStatusEnum.PARTIALLY_RECEIVED,
  // کامل‌رسیده هم در فیلتر هست: مازادِ دیرتر رسیده یا کالای جایگزینِ
  // مرجوعی روی خریدی ثبت می‌شود که از قبل «دریافت‌شده» است.
  PurchaseStatusEnum.RECEIVED,
];

/**
 * پیش‌فرضِ صف: هر خریدی که هنوز چیزی از آن انتظار می‌رود — «ارسال شده» و
 * «تحویل ناقص» با هم. بدونِ این، خریدی که محموله‌ی اولش رسیده از صفِ
 * پیش‌فرض بیرون می‌افتاد و انباردار باقیمانده‌اش را نمی‌دید.
 */
export const RECEIVING_AWAITING = QUEUE_FILTER.AWAITING;

export const RECEIVING_AWAITING_STATUSES = [
  PurchaseStatusEnum.SHIPPED,
  PurchaseStatusEnum.PARTIALLY_RECEIVED,
];

export const RECEIVING_STATUS_OPTIONS = [
  { value: RECEIVING_AWAITING, label: "در انتظار دریافت (ارسال‌شده و ناقص)" },
  ...RECEIVING_ELIGIBLE_STATUSES.map((status) => ({
    value: status,
    label: PURCHASE_STATUS_LABELS[status],
  })),
  { value: QUEUE_FILTER.RETURNS, label: "مرجوعی: برگشتی از مشتری" },
  { value: QUEUE_FILTER.REPLACEMENTS, label: "مرجوعی: جایگزین از تامین‌کننده" },
];

/** مقدارِ فیلترِ وضعیت → فهرستِ وضعیت‌هایی که صف نشان می‌دهد. */
export function receivingStatusesOf(filterValue) {
  if (filterValue === RECEIVING_AWAITING || filterValue === "" || filterValue == null) {
    return RECEIVING_AWAITING_STATUSES;
  }
  return [Number(filterValue)];
}
