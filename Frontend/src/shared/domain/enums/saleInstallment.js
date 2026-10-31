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
 * `OVERDUE` را سرویسِ پس‌زمینه‌ی سرور هر ساعت می‌نویسد (از ۲۰۲۶-۱۰-۱۹): قسطِ پرداخت‌نشده‌ای که
 * سررسیدش به‌اضافه‌ی مهلتِ ارفاق (`Installment.OverdueGraceDays`) گذشته. فرانت آن را از روی
 * تاریخ حدس نمی‌زند؛ مهلتِ ارفاق را فقط سرور می‌داند.
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

/** پرداخت‌نشده از دیدِ سرور: `PENDING` یا `OVERDUE`. */
export const isInstallmentUnpaid = (status) =>
  Number(status) === SaleInstallmentStatusEnum.PENDING ||
  Number(status) === SaleInstallmentStatusEnum.OVERDUE;
