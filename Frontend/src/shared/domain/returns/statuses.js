/**
 * وضعیت یک مرجوعی — مشترک بین خرید و فروش.
 *
 * وضعیت دستی انتخاب نمی‌شود و به هیچ مرحله‌ی انباری گره نخورده است؛
 * سرور آن را از روی *اثرها* مشتق می‌کند (`RecomputeReturnStatus`)؛ فرانت فقط می‌خواند:
 *
 *   OPEN        → ادعا ثبت شده، هنوز هیچ تصمیمی نیست
 *   IN_PROGRESS → تصمیم هست ولی یا کل ادعا تصمیم نخورده یا اثری هنوز
 *                 اعمال نشده (منتظر انبار)
 *   SETTLED     → کل ادعا تصمیم خورده و همه‌ی اثرها اعمال شده‌اند
 *
 * REJECTED و CANCELLED مشتق نمی‌شوند؛ اکشن صریح‌اند و روی رکورد
 * می‌نشینند.
 *
 * مقادیر عمداً با شماره‌ی PurchaseReturnStatusEnum/SaleReturnStatusEnum
 * بکند یکی است (بخش ۱۵ سند api-guide.fa.md) — هر دو enum بکند همین
 * ترتیب را دارند (فقط اسم عضوِ اول فرق دارد: PENDING در خرید،
 * PENDING_INSPECTION در فروش)، پس یک enum مشترک اینجا هم برای خرید هم
 * فروش کافی است.
 */
export const RETURN_STATUSES = {
  OPEN: 0,
  IN_PROGRESS: 1,
  SETTLED: 2,
  REJECTED: 3,
  CANCELLED: 4,
};

/** رنگِ معناییِ هر وضعیت برای `ReturnStatusBadge` (معناها در `shared/lib/tone.js`). */
export const RETURN_STATUS_TONES = {
  [RETURN_STATUSES.OPEN]: "warning",
  [RETURN_STATUSES.IN_PROGRESS]: "info",
  [RETURN_STATUSES.SETTLED]: "success",
  [RETURN_STATUSES.REJECTED]: "danger",
  [RETURN_STATUSES.CANCELLED]: "neutral",
};

/** وضعیت‌هایی که بعد از آن‌ها هیچ تصمیم تازه‌ای پذیرفته نمی‌شود. */
const TERMINAL_RETURN_STATUSES = [
  RETURN_STATUSES.REJECTED,
  RETURN_STATUSES.CANCELLED,
];

export function isTerminalStatus(status) {
  return TERMINAL_RETURN_STATUSES.includes(status);
}
