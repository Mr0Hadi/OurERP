/**
 * وضعیت‌های فروشِ اقساطی (بخش ۱۵ و ۱۱ب سند api-guide.fa.md). مقادیر عیناً همان
 * `SaleInstallmentPlanStatusEnum` و `SaleInstallmentStatusEnum`ِ بکند است؛ روی سیم عدد.
 */

/** وضعیتِ قرارداد اقساطی. */
export const SaleInstallmentPlanStatusEnum = Object.freeze({
  ACTIVE: 0,
  SETTLED: 1,
  CANCELLED: 2,
});

export const INSTALLMENT_PLAN_STATUS_LABELS = Object.freeze({
  [SaleInstallmentPlanStatusEnum.ACTIVE]: "جاری",
  [SaleInstallmentPlanStatusEnum.SETTLED]: "تسویه شده",
  [SaleInstallmentPlanStatusEnum.CANCELLED]: "ابطال شده",
});

export const INSTALLMENT_PLAN_STATUS_TONES = Object.freeze({
  [SaleInstallmentPlanStatusEnum.ACTIVE]: "info",
  [SaleInstallmentPlanStatusEnum.SETTLED]: "success",
  [SaleInstallmentPlanStatusEnum.CANCELLED]: "danger",
});

/**
 * وضعیتِ یک سطرِ قسط.
 *
 * ⚠️ `OVERDUE` را هیچ کدی در سرور نمی‌نویسد؛ سند می‌گوید تشخیصِ دیرکرد از روی
 * `dueDate` کارِ فرانت است (`installmentDisplayStatus`). عضو اینجا هست تا اگر روزی
 * سرور آن را نوشت، همین نمایش بی‌تغییر کار کند.
 */
export const SaleInstallmentStatusEnum = Object.freeze({
  PENDING: 0,
  PAID: 1,
  OVERDUE: 2,
  CANCELLED: 3,
});

export const INSTALLMENT_STATUS_LABELS = Object.freeze({
  [SaleInstallmentStatusEnum.PENDING]: "پرداخت‌نشده",
  [SaleInstallmentStatusEnum.PAID]: "پرداخت‌شده",
  [SaleInstallmentStatusEnum.OVERDUE]: "سررسید گذشته",
  [SaleInstallmentStatusEnum.CANCELLED]: "ابطال شده",
});

export const INSTALLMENT_STATUS_TONES = Object.freeze({
  [SaleInstallmentStatusEnum.PENDING]: "warning",
  [SaleInstallmentStatusEnum.PAID]: "success",
  [SaleInstallmentStatusEnum.OVERDUE]: "danger",
  [SaleInstallmentStatusEnum.CANCELLED]: "neutral",
});

/** پرداخت‌نشده از دیدِ سرور: `PENDING`، یا `OVERDUE` اگر روزی نوشته شود. */
export const isInstallmentUnpaid = (status) =>
  Number(status) === SaleInstallmentStatusEnum.PENDING ||
  Number(status) === SaleInstallmentStatusEnum.OVERDUE;

/**
 * وضعیتِ نمایشیِ یک قسط: پرداخت‌نشده‌ای که سررسیدش (پیش از امروز) گذشته
 * «سررسید گذشته» است. قسطی که سررسیدش امروز است هنوز دیرکرد نیست.
 *
 * @param today "YYYY-MM-DD"ِ محلی (`todayIso()`)
 */
export function installmentDisplayStatus(installment, today) {
  const status = Number(installment.status);
  if (!isInstallmentUnpaid(status)) return status;
  const due = String(installment.dueDate ?? "").slice(0, 10);
  return due && due < today ? SaleInstallmentStatusEnum.OVERDUE : SaleInstallmentStatusEnum.PENDING;
}
