// src/shared/domain/returns/statuses.js

/**
 * وضعیت یک مرجوعی — مشترک بین خرید و فروش.
 *
 * وضعیت دستی انتخاب نمی‌شود و به هیچ مرحله‌ی انباری گره نخورده است؛
 * از روی *اثرها* مشتق می‌شود (deriveReturnStatus در resolutions.js):
 *
 *   OPEN        → ادعا ثبت شده، هنوز هیچ تصمیمی نیست
 *   IN_PROGRESS → تصمیم هست ولی یا کل ادعا تصمیم نخورده یا اثری هنوز
 *                 اعمال نشده (منتظر انبار)
 *   SETTLED     → کل ادعا تصمیم خورده و همه‌ی اثرها اعمال شده‌اند
 *
 * REJECTED و CANCELLED مشتق نمی‌شوند؛ اکشن صریح‌اند و روی رکورد
 * می‌نشینند.
 */
export const RETURN_STATUSES = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  SETTLED: "settled",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const RETURN_STATUS_STYLES = {
  [RETURN_STATUSES.OPEN]:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  [RETURN_STATUSES.IN_PROGRESS]:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  [RETURN_STATUSES.SETTLED]:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400",
  [RETURN_STATUSES.REJECTED]:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400",
  [RETURN_STATUSES.CANCELLED]:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-400",
};

/** وضعیت‌هایی که بعد از آن‌ها هیچ تصمیم تازه‌ای پذیرفته نمی‌شود. */
export const TERMINAL_RETURN_STATUSES = [
  RETURN_STATUSES.REJECTED,
  RETURN_STATUSES.CANCELLED,
];

export function isTerminalStatus(status) {
  return TERMINAL_RETURN_STATUSES.includes(status);
}
