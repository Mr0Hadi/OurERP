/**
 * `StockTransferStatusEnum` — حواله‌ی بین انبار (`api-guide.fa.md` بخش ۲۵): با ساخت دانه‌ها از قفسه‌ی مبدأ بیرون می‌روند
 * («در راه»، خارج از موجودی)؛ تحویل آن‌ها را روی قفسه‌ی مقصد می‌گذارد و لغو به مبدأ برمی‌گرداند.
 */
export const StockTransferStatusEnum = Object.freeze({
  IN_TRANSIT: 1,
  RECEIVED: 2,
  CANCELLED: 3,
});

export const STOCK_TRANSFER_STATUS_LABELS = Object.freeze({
  [StockTransferStatusEnum.IN_TRANSIT]: "در راه",
  [StockTransferStatusEnum.RECEIVED]: "تحویل‌شده",
  [StockTransferStatusEnum.CANCELLED]: "لغوشده",
});

export const STOCK_TRANSFER_STATUS_TONES = Object.freeze({
  [StockTransferStatusEnum.IN_TRANSIT]: "warning",
  [StockTransferStatusEnum.RECEIVED]: "success",
  [StockTransferStatusEnum.CANCELLED]: "neutral",
});
