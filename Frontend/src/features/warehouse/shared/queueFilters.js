/**
 * مقدارهای غیرعددیِ فیلترِ «وضعیت» در صفِ دریافت و ارسالِ انبار.
 *
 * بکند روی لیستِ خرید/فروش فقط یک `status` می‌گیرد و چیزی از مرجوعی نمی‌داند؛
 * این سه گزینه را فرانت می‌سازد:
 *
 *  - `AWAITING`: پیش‌فرض — هر سندی که هنوز چیزی از آن مانده (دو وضعیت با هم،
 *    با `statuses`)، به‌علاوه‌ی کالای مرجوعیِ منتظر.
 *  - `RETURNS`: فقط ردیف‌های مرجوعیِ جدا (برگشتیِ مشتری در دریافت، عودت به
 *    تامین‌کننده در ارسال).
 *  - `REPLACEMENTS`: فقط خرید/فروش‌هایی که کالای جایگزینِ مرجوعی منتظرشان است.
 *
 * هر مقدارِ عددی یعنی یک وضعیتِ واقعیِ سند.
 */
export const QUEUE_FILTER = Object.freeze({
  AWAITING: "awaiting",
  RETURNS: "returns",
  REPLACEMENTS: "replacements",
});

/** مقدارِ کشویی (همیشه رشته) → مقدارِ فیلتر (رشته‌ی حالت، یا عدد). */
export const parseQueueFilter = (value) =>
  Object.values(QUEUE_FILTER).includes(value) ? value : Number(value);

/** فهرستِ سندها از سرور لازم است؟ دو حالتِ مرجوعی از جای دیگری پر می‌شوند. */
export const needsDocumentList = (filter) =>
  filter !== QUEUE_FILTER.RETURNS && filter !== QUEUE_FILTER.REPLACEMENTS;
