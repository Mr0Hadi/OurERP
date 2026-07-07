export const PURCHASE_STATUSES = {
  PENDING: "pending",
  SHIPPED: "shipped",
  PARTIALLY_RECEIVED: "partially_received",
  RECEIVED: "received",
  CANCELLED: "cancelled",
};

export const PURCHASE_STATUS_LABELS = {
  [PURCHASE_STATUSES.PENDING]: "در انتظار ارسال",
  [PURCHASE_STATUSES.SHIPPED]: "ارسال شده",
  [PURCHASE_STATUSES.PARTIALLY_RECEIVED]: "تحویل ناقص",
  [PURCHASE_STATUSES.RECEIVED]: "تحویل کامل",
  [PURCHASE_STATUSES.CANCELLED]: "لغو شده",
};

export const PAYMENT_TYPES = {
  CASH: "cash",
  CREDIT: "credit",
  CHECK: "check",
  TRANSFER: "transfer",
  MIXED: "mixed",
};

export const PAYMENT_TYPE_LABELS = {
  [PAYMENT_TYPES.CASH]: "نقدی",
  [PAYMENT_TYPES.CREDIT]: "نسیه",
  [PAYMENT_TYPES.CHECK]: "چک",
  [PAYMENT_TYPES.TRANSFER]: "انتقال بانکی",
  [PAYMENT_TYPES.MIXED]: "ترکیبی",
};
