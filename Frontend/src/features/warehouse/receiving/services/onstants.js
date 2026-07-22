// src/features/warehouse/receiving/services/constants.js
import { PURCHASE_STATUSES } from "@/features/purchases/services/constants";

export { PURCHASE_STATUSES };

export const RECEIVING_ELIGIBLE_STATUSES = [
  PURCHASE_STATUSES.SHIPPED,
  PURCHASE_STATUSES.PARTIALLY_RECEIVED,
];

export const RECEIVING_STATUS_LABELS = {
  [PURCHASE_STATUSES.SHIPPED]: "ارسال شده",
  [PURCHASE_STATUSES.PARTIALLY_RECEIVED]: "تحویل ناقص",
};
