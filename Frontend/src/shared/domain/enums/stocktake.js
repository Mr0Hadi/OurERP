/**
 * `StocktakeStatusEnum` — جای یک انبارگردانی در جریانش (`api-guide.fa.md` بخش ۲۶): شمارش ← پایانِ شمارش (مغایرت دیده
 * می‌شود) ← تأیید (اعمالِ مغایرت، نهایی). لغو پیش از تأیید هر وقت ممکن است و اثری ندارد.
 */
export const StocktakeStatusEnum = Object.freeze({
  COUNTING: 1,
  SUBMITTED: 2,
  APPROVED: 3,
  CANCELLED: 4,
});

export const STOCKTAKE_STATUS_LABELS = Object.freeze({
  [StocktakeStatusEnum.COUNTING]: "در حال شمارش",
  [StocktakeStatusEnum.SUBMITTED]: "در انتظار تأیید",
  [StocktakeStatusEnum.APPROVED]: "تأییدشده",
  [StocktakeStatusEnum.CANCELLED]: "لغوشده",
});

export const STOCKTAKE_STATUS_TONES = Object.freeze({
  [StocktakeStatusEnum.COUNTING]: "info",
  [StocktakeStatusEnum.SUBMITTED]: "warning",
  [StocktakeStatusEnum.APPROVED]: "success",
  [StocktakeStatusEnum.CANCELLED]: "neutral",
});

/**
 * `StocktakeCountModeEnum` — هر ردیف چطور شمرده شد. وقتی حتی یک دانه از کالا اسکن شده باشد، اسکن‌ها ملاک‌اند و عددِ
 * دستی نادیده گرفته می‌شود (قاعده‌ی سرور).
 */
export const StocktakeCountModeEnum = Object.freeze({
  NONE: 0,
  SCAN: 1,
  MANUAL: 2,
});

export const STOCKTAKE_COUNT_MODE_LABELS = Object.freeze({
  [StocktakeCountModeEnum.NONE]: "شمرده نشده",
  [StocktakeCountModeEnum.SCAN]: "با اسکن",
  [StocktakeCountModeEnum.MANUAL]: "دستی",
});
