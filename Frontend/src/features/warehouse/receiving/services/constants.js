// src/features/warehouse/receiving/services/constants.js
import { PURCHASE_STATUSES } from "@/features/purchases/services/constants";

export { PURCHASE_STATUSES };

// فقط خریدهای «ارسال شده» در لیست انباردار قابل مشاهده‌اند؛ به‌محض
// ثبت کسری، خرید از این لیست خارج می‌شود تا زمانی که واحد خرید
// هماهنگی ارسال مجدد را با تامین‌کننده انجام دهد.
export const RECEIVING_ELIGIBLE_STATUSES = [PURCHASE_STATUSES.SHIPPED];

export const RECEIVING_STATUS_LABELS = {
  [PURCHASE_STATUSES.SHIPPED]: "ارسال شده",
};